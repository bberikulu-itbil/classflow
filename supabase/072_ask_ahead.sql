-- "Ask to go ahead" rule: a student who has finished asks to move to the next slide; the teacher allows it and the student does that
-- slide's task before the class. cf_sessions.allow_ahead switches the rule on; cf_participants.ahead_req is the asked slide,
-- ahead_ok the slide the student may reach. Allowing opens the slide's tasks (cf_make_tasks) without touching the board's task;
-- when the board reaches that slide, cf_open_task reuses those open tasks instead of making new ones.

alter table cf_sessions add column if not exists allow_ahead boolean not null default false;
alter table cf_participants add column if not exists ahead_req int;
alter table cf_participants add column if not exists ahead_ok int;

create or replace function cf_set_rule(p_session uuid, p_rule text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  if p_rule = 'ask' then update cf_sessions set allow_ask = p_on where id = p_session;
  elsif p_rule = 'hand' then
    update cf_sessions set allow_hand = p_on where id = p_session;
    if not p_on then update cf_participants set hand = false where session_id = p_session and hand; end if;
  elsif p_rule = 'auto' then update cf_sessions set auto_task = p_on where id = p_session;
  elsif p_rule = 'ahead' then
    update cf_sessions set allow_ahead = p_on where id = p_session;
    if not p_on then update cf_participants set ahead_req = null where session_id = p_session and ahead_req is not null; end if;
  else raise exception 'Белгісіз ереже'; end if;
end $$;

/* Creates the task(s) of one slide (levels, test variants, sheet criteria or a single task) and returns the first. */
create or replace function cf_make_tasks(p_session uuid, idx int) returns cf_tasks
language plpgsql security definer set search_path = public as $$
declare sl jsonb; t cf_tasks; first_t cf_tasks; typ text; k text; ans jsonb; lv jsonb; v jsonb; n int := 0;
begin
  select slides -> idx into sl from cf_session_private where session_id = p_session;
  if sl is null then raise exception 'Слайд табылмады'; end if;
  typ := sl->>'type';
  if typ not in ('quiz','task','code') then raise exception 'Бұл слайдта тапсырма жоқ'; end if;

  if jsonb_typeof(sl->'levels') = 'array' and jsonb_array_length(sl->'levels') > 0 then
    for lv in select x from jsonb_array_elements(sl->'levels') x loop
      n := n + 1;
      for v in select x from jsonb_array_elements(coalesce(lv->'variants', '[]'::jsonb)) x loop
        k := case when jsonb_array_length(coalesce(v->'accept', '[]'::jsonb)) > 0 then 'short' else 'text' end;
        insert into cf_tasks(session_id, slide_index, kind, prompt, points, level, variant)
          values (p_session, idx, k, coalesce(v->>'prompt', sl->>'title'), coalesce((lv->>'points')::int, 1),
                  least(3, coalesce((lv->>'lv')::int, n)), case when v->>'v' = 'B' then 'B' else 'A' end)
          returning * into t;
        if first_t.id is null then first_t := t; end if;
        if k = 'short' or (v->'explanation') is not null then
          insert into cf_task_keys(task_id, answer, explanation)
            values (t.id, case when k = 'short' then jsonb_build_object('accept', v->'accept') end, v->>'explanation');
        end if;
      end loop;
    end loop;
    if first_t.id is null then raise exception 'Деңгейлерде тапсырма жоқ'; end if;
    return first_t;
  end if;

  if typ = 'quiz' and jsonb_typeof(sl->'qvariants') = 'array' and jsonb_array_length(sl->'qvariants') > 0 then
    for v in select x from jsonb_array_elements(sl->'qvariants') x loop
      insert into cf_tasks(session_id, slide_index, kind, prompt, options, points, time_limit, speed, variant)
        values (p_session, idx, 'quiz', coalesce(v->>'prompt', sl->>'prompt'), v->'options', coalesce((sl->>'points')::int, 1),
                nullif((sl->>'time')::int, 0), coalesce((sl->>'speed')::boolean, false), chr(65 + n))
        returning * into t;
      insert into cf_task_keys(task_id, answer, explanation) values (t.id, jsonb_build_object('index', (v->>'answer')::int), v->>'explanation');
      if first_t.id is null then first_t := t; end if;
      n := n + 1;
    end loop;
    return first_t;
  end if;

  if jsonb_typeof(sl->'criteria') = 'array' and jsonb_array_length(sl->'criteria') > 0 then
    insert into cf_tasks(session_id, slide_index, kind, prompt, points)
      values (p_session, idx, 'sheet', coalesce(sl->>'prompt', sl->>'title'),
              least(100, (select sum(coalesce((c->>'points')::int, 1)) from jsonb_array_elements(sl->'criteria') c)))
      returning * into t;
    insert into cf_task_keys(task_id, answer) values (t.id, jsonb_build_object('criteria', sl->'criteria'));
    return t;
  end if;

  k := case typ when 'quiz' then 'quiz' when 'code' then 'code'
       else case when jsonb_array_length(coalesce(sl->'accept', '[]'::jsonb)) > 0 then 'short' else 'text' end end;
  insert into cf_tasks(session_id, slide_index, kind, prompt, options, points, time_limit, speed)
    values (p_session, idx, k, coalesce(sl->>'prompt', sl->>'title'), sl->'options', coalesce((sl->>'points')::int, 1),
            nullif((sl->>'time')::int, 0), coalesce((sl->>'speed')::boolean, false))
    returning * into t;
  ans := case k
    when 'quiz' then case when (sl->'answer') is not null then jsonb_build_object('index', (sl->>'answer')::int) end
    when 'short' then jsonb_build_object('accept', sl->'accept')
    else null end;
  if ans is not null or (sl->'explanation') is not null then
    insert into cf_task_keys(task_id, answer, explanation) values (t.id, ans, sl->>'explanation');
  end if;
  return t;
end $$;
revoke all on function cf_make_tasks(uuid, int) from public, anon, authenticated;

create or replace function cf_open_task(p_session uuid, p_index integer default null) returns cf_tasks
language plpgsql security definer set search_path = public as $$
declare s cf_sessions; t cf_tasks; idx int; old uuid;
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  select * into s from cf_sessions where id = p_session for update;
  if s.status <> 'live' then raise exception 'Сабақ аяқталған'; end if;
  idx := coalesce(p_index, s.current_slide);
  -- tasks whose extra seconds ran out are closed now
  for old in select x.id from cf_tasks x where x.session_id = p_session and x.status = 'open' and x.closes_at is not null and x.closes_at <= now() loop
    perform cf_close_task(old);
  end loop;
  -- tasks of this slide already opened ahead for a student: the class joins them
  select * into t from cf_tasks x where x.session_id = p_session and x.slide_index = idx and x.status = 'open' order by x.level nulls first, x.variant limit 1;
  if s.active_task_id is not null and not exists (select 1 from cf_tasks x where x.id = s.active_task_id and (x.closes_at > now() or x.slide_index = idx)) then
    perform cf_close_task(s.active_task_id);
  end if;
  if t.id is null then t := cf_make_tasks(p_session, idx); end if;
  update cf_sessions set active_task_id = t.id where id = p_session;
  return t;
end $$;

create or replace function cf_ask_ahead(p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s cf_sessions; p cf_participants;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or s.status <> 'live' or not s.allow_ahead then raise exception 'Мұғалім алға өтуге рұқсат сұрауды қоспаған'; end if;
  select * into p from cf_participants where session_id = p_session and student_id = auth.uid();
  if p.student_id is null then raise exception 'Сабаққа кіріңіз'; end if;
  if greatest(s.current_slide, coalesce(p.ahead_ok, -1)) + 1 >= s.slide_count then raise exception 'Бұл соңғы слайд'; end if;
  update cf_participants set ahead_req = greatest(s.current_slide, coalesce(ahead_ok, -1)) + 1 where session_id = p_session and student_id = auth.uid();
end $$;

create or replace function cf_grant_ahead(p_session uuid, p_student uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare p cf_participants; typ text;
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  select * into p from cf_participants where session_id = p_session and student_id = p_student for update;
  if p.ahead_req is null then return; end if;
  if p_on then
    update cf_participants set ahead_ok = greatest(coalesce(ahead_ok, -1), ahead_req), ahead_req = null where session_id = p_session and student_id = p_student;
    select slides -> p.ahead_req ->> 'type' into typ from cf_session_private where session_id = p_session;
    if typ in ('quiz', 'task', 'code') and not exists (select 1 from cf_tasks where session_id = p_session and slide_index = p.ahead_req and status = 'open') then
      perform cf_make_tasks(p_session, p.ahead_req);
    end if;
  else
    update cf_participants set ahead_req = null where session_id = p_session and student_id = p_student;
  end if;
end $$;

create or replace function cf_slide_at(p_session uuid, p_index integer) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s cf_sessions; sl jsonb; chk jsonb; ok int;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or not (cf_teaches(p_session) or cf_in(p_session)) then raise exception 'Құқығыңыз жоқ'; end if;
  if not cf_teaches(p_session) then
    select ahead_ok into ok from cf_participants where session_id = p_session and student_id = auth.uid();
    if not (p_index >= 0 and ((s.student_nav and p_index <= s.current_slide) or p_index <= coalesce(ok, -1))) then raise exception 'Мұғалім рұқсат бермеген'; end if;
  end if;
  select slides -> p_index into sl from cf_session_private where session_id = p_session;
  if sl is null then return null; end if;
  sl := cf_strip_slide(sl, false);
  if jsonb_typeof(sl->'tests') = 'array' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'input', coalesce(t->>'input',''),
      'label', coalesce(t->>'label',''),
      'hidden', coalesce((t->>'hidden')::boolean, false),
      'out', case when coalesce((t->>'hidden')::boolean, false) then null else t->>'out' end,
      'h', encode(sha256(convert_to(cf_norm(t->>'out'), 'UTF8')), 'hex'))), '[]'::jsonb)
    into chk from jsonb_array_elements(sl->'tests') t;
    sl := (sl - 'tests') || jsonb_build_object('checks', chk);
  end if;
  return jsonb_build_object('index', p_index, 'slide', sl);
end $$;

/* cf_submit refuses a task of a slide beyond the board unless the student was allowed ahead to it. */
create or replace function cf_ahead_ok(p_task uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select t.slide_index <= s.current_slide or cf_teaches(t.session_id)
      or coalesce((select p.ahead_ok from cf_participants p where p.session_id = t.session_id and p.student_id = auth.uid()), -1) >= t.slide_index
  from cf_tasks t join cf_sessions s on s.id = t.session_id where t.id = p_task $$;

create or replace function cf_submit(p_task uuid, p_answer text, p_meta jsonb default null) returns cf_submissions
language plpgsql security definer set search_path = public as $$
declare t cf_tasks; k cf_task_keys; sub cf_submissions; mine cf_submissions; pr cf_pairs;
  ok boolean := null; pts int := 0; a text := left(coalesce(p_answer, ''), 20000); el numeric; u uuid; uids uuid[];
  cr jsonb; got jsonb; tot int := 0; pt int; val text; frm text; okc boolean; fb text := '';
begin
  select * into t from cf_tasks where id = p_task;
  if t.id is null or not cf_in(t.session_id) then raise exception 'Тапсырма табылмады'; end if;
  if t.status <> 'open' then raise exception 'Тапсырма жабылған'; end if;
  if not cf_ahead_ok(p_task) then raise exception 'Бұл слайдқа әлі рұқсат жоқ'; end if;
  if t.closes_at is not null and now() > t.closes_at + interval '2 seconds' then raise exception 'Уақыт бітті'; end if;
  el := extract(epoch from now() - t.opened_at);
  if t.time_limit is not null and el > t.time_limit + 3 then raise exception 'Уақыт бітті'; end if;
  if length(trim(a)) = 0 then raise exception 'Жауап бос'; end if;
  if t.level is null and t.kind in ('quiz','short') and exists (select 1 from cf_submissions where task_id = p_task and student_id = auth.uid()) then
    raise exception 'Жауап жіберілген'; end if;

  if exists (select 1 from cf_pairs where session_id = t.session_id and partner_id = auth.uid()) then
    raise exception 'Жұбыңның экранында орында'; end if;
  select * into pr from cf_pairs where session_id = t.session_id and host_id = auth.uid();
  uids := case when pr.host_id is null then array[auth.uid()] else array[auth.uid(), pr.partner_id] end;

  if t.level is null and t.variant is not null and t.variant is distinct from cf_qvariant(auth.uid(), t.slide_index,
      (select count(*)::int from cf_tasks x where x.session_id = t.session_id and x.slide_index = t.slide_index and x.opened_at = t.opened_at)) then
    raise exception 'Бұл нұсқа саған берілмеген';
  end if;

  if t.level is not null then
    if pr.host_id is null and t.variant is distinct from cf_my_variant(t.session_id, t.slide_index, t.level, t.opened_at, auth.uid()) then
      raise exception 'Бұл нұсқа саған берілмеген'; end if;
    if exists (select 1 from cf_submissions where task_id = p_task and student_id = auth.uid() and is_correct is true) then
      raise exception 'Бұл тапсырма орындалған'; end if;
    if t.level > 1 and exists (
        select 1 from cf_tasks p
        where p.session_id = t.session_id and p.slide_index = t.slide_index and p.opened_at = t.opened_at and p.level = t.level - 1
          and (pr.host_id is not null or p.variant = cf_my_variant(t.session_id, t.slide_index, p.level, t.opened_at, auth.uid()))
          and not exists (select 1 from cf_submissions x where x.task_id = p.id and x.student_id = auth.uid() and x.is_correct is true)) then
      raise exception 'Алдымен L% деңгейін дұрыс орында', t.level - 1;
    end if;
  end if;

  select * into k from cf_task_keys where task_id = p_task;
  if t.kind = 'sheet' then
    begin got := a::jsonb; exception when others then raise exception 'Жауап пішімі қате'; end;
    if jsonb_typeof(got) <> 'object' then raise exception 'Жауап пішімі қате'; end if;
    for cr in select x from jsonb_array_elements(coalesce(k.answer->'criteria', '[]'::jsonb)) x loop
      pt := coalesce((cr->>'points')::int, 1); tot := tot + pt;
      val := coalesce(got->(cr->>'id')->>'v', ''); frm := coalesce(got->(cr->>'id')->>'f', '');
      okc := trim(val) <> '' and (jsonb_array_length(coalesce(cr->'accept', '[]'::jsonb)) = 0 or exists (
        select 1 from jsonb_array_elements_text(cr->'accept') z where replace(lower(trim(z)), ',', '.') = replace(lower(trim(val)), ',', '.')));
      if okc and coalesce(cr->>'fn', '') <> '' then okc := upper(frm) like '%' || upper(cr->>'fn') || '(%'; end if;
      if okc and coalesce((cr->>'formula')::boolean, false) then okc := left(trim(frm), 1) = '='; end if;
      if okc then pts := pts + pt; end if;
      fb := fb || case when fb = '' then '' else ',' end || (cr->>'id') || ':' || case when okc then '1' else '0' end;
    end loop;
    ok := (pts = tot);
  elsif k.answer is not null then
    if (k.answer->>'index') is not null then
      ok := (trim(a) = k.answer->>'index');
    elsif jsonb_typeof(k.answer->'accept') = 'array' then
      ok := exists (select 1 from jsonb_array_elements_text(k.answer->'accept') x where lower(trim(x)) = lower(trim(a)));
    end if;
  end if;
  if t.kind <> 'sheet' then
    pts := case when ok then t.points else 0 end;
    if ok and t.speed then
      pts := round(t.points * (1 - 0.5 * least(1, el / greatest(coalesce(t.time_limit, 20), 1))));
    end if;
  end if;

  foreach u in array uids loop
    insert into cf_submissions(task_id, session_id, student_id, answer, meta, is_correct, points)
      values (p_task, t.session_id, u, a,
              case when u = auth.uid() then p_meta else coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('pairOf', auth.uid()) end,
              ok, pts)
      on conflict (task_id, student_id) do update
        set answer = excluded.answer, meta = excluded.meta, is_correct = excluded.is_correct,
            points = excluded.points, feedback = null, updated_at = now()
      returning * into mine;
    if t.kind = 'sheet' then update cf_submissions set feedback = fb where id = mine.id returning * into mine; end if;
    if pts > 0 and exists (select 1 from cf_scores where submission_id = mine.id) then
      update cf_scores set points = pts where submission_id = mine.id and points <> pts;
    elsif pts > 0 then
      insert into cf_scores(session_id, student_id, points, reason, task_id, submission_id, created_by)
        values (t.session_id, u, pts, 'Тапсырма', p_task, mine.id, auth.uid());
    else
      delete from cf_scores where submission_id = mine.id;
    end if;
    if u = auth.uid() then sub := mine; end if;
  end loop;
  return sub;
end $$;

revoke all on function cf_ahead_ok(uuid) from public, anon;
revoke all on function cf_ask_ahead(uuid), cf_grant_ahead(uuid, uuid, boolean) from public, anon;
grant execute on function cf_ask_ahead(uuid), cf_grant_ahead(uuid, uuid, boolean), cf_ahead_ok(uuid) to authenticated;
