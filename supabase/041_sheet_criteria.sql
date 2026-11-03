-- 041: practice with criteria (picture -> sheet -> auto-check with points) and the English version of a slide (`en` block next to `ru`).
-- A slide with `criteria: [{id, text, cell, accept[], points, fn?, formula?}]` opens as ONE task of kind 'sheet'. The student sends
-- {"<id>": {"v": "<value of the cell>", "f": "<its formula>"}}; every criterion that matches earns its points. Resubmitting is allowed until the task closes.

alter table cf_tasks drop constraint if exists cf_tasks_kind_check;
alter table cf_tasks add constraint cf_tasks_kind_check check (kind in ('quiz','short','text','code','sheet'));

-- Strips what a student must not see from one language block of a slide.
create or replace function cf_strip_one(x jsonb, st boolean) returns jsonb
language plpgsql immutable set search_path = public as $$
begin
  x := x - 'answer' - 'notes' - 'explanation' - 'accept';
  if st then x := x - 'tests'; end if;
  if jsonb_typeof(x->'levels') = 'array' then
    x := jsonb_set(x, '{levels}', coalesce((
      select jsonb_agg(l || jsonb_build_object('variants', coalesce((
        select jsonb_agg(v - 'accept' - 'explanation') from jsonb_array_elements(coalesce(l->'variants', '[]'::jsonb)) v), '[]'::jsonb)))
      from jsonb_array_elements(x->'levels') l), '[]'::jsonb));
  end if;
  if jsonb_typeof(x->'criteria') = 'array' then
    x := jsonb_set(x, '{criteria}', coalesce((select jsonb_agg(c - 'accept') from jsonb_array_elements(x->'criteria') c), '[]'::jsonb));
  end if;
  return x;
end $$;

-- The whole slide: the Kazakh root and the ru / en blocks.
create or replace function cf_strip_slide(sl jsonb, st boolean) returns jsonb
language plpgsql immutable set search_path = public as $$
declare lng text;
begin
  sl := cf_strip_one(sl, st);
  foreach lng in array array['ru','en'] loop
    if jsonb_typeof(sl->lng) = 'object' then sl := jsonb_set(sl, array[lng], cf_strip_one(sl->lng, true)); end if;
  end loop;
  return sl;
end $$;
revoke all on function cf_strip_one(jsonb, boolean), cf_strip_slide(jsonb, boolean) from public, anon, authenticated;

create or replace function cf_slide(p_session uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s cf_sessions; sl jsonb; chk jsonb;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or not (cf_teaches(p_session) or cf_in(p_session)) then raise exception 'Құқығыңыз жоқ'; end if;
  select slides -> s.current_slide into sl from cf_session_private where session_id = p_session;
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
  return jsonb_build_object('index', s.current_slide, 'slide', sl);
end $$;

create or replace function cf_board_public(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s cf_sessions; sl jsonb; t cf_tasks; lb jsonb; subs int := 0; parts int := 0;
begin
  if p_token is null or length(p_token) < 8 then return null; end if;
  select * into s from cf_sessions where board_token = p_token;
  if s.id is null then return null; end if;
  if s.status = 'ended' then return jsonb_build_object('ended', true, 'title', s.title); end if;

  select slides -> s.current_slide into sl from cf_session_private where session_id = s.id;
  if sl is not null then sl := cf_strip_slide(sl, true); end if;

  select coalesce(jsonb_agg(jsonb_build_object('full_name', x.full_name, 'group_no', x.group_no, 'points', x.pts) order by x.pts desc, x.full_name), '[]'::jsonb)
    into lb
    from (select p.full_name, p.group_no,
                 coalesce((select sum(c.points) from cf_scores c where c.session_id = s.id and c.student_id = p.student_id), 0)::int pts
            from cf_participants p where p.session_id = s.id) x;

  select count(*) into parts from cf_participants where session_id = s.id;
  if s.active_task_id is not null then
    select * into t from cf_tasks where id = s.active_task_id;
    select count(*) into subs from cf_submissions where task_id = s.active_task_id;
  end if;

  return jsonb_build_object(
    'ended', false, 'title', s.title, 'index', s.current_slide, 'slide_count', s.slide_count,
    'slide', sl, 'leaderboard', lb, 'subs', subs, 'parts', parts,
    'task', case when t.id is null then null else jsonb_build_object(
      'id', t.id, 'status', t.status, 'points', t.points, 'time_limit', t.time_limit,
      'opened_at', t.opened_at, 'closed_at', t.closed_at, 'speed', t.speed, 'kind', t.kind) end);
end $$;

create or replace function cf_open_task(p_session uuid, p_index integer default null) returns cf_tasks
language plpgsql security definer set search_path = public as $$
declare s cf_sessions; sl jsonb; t cf_tasks; first_t cf_tasks; typ text; k text; ans jsonb; idx int; lv jsonb; v jsonb; n int := 0;
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  select * into s from cf_sessions where id = p_session for update;
  if s.status <> 'live' then raise exception 'Сабақ аяқталған'; end if;
  idx := coalesce(p_index, s.current_slide);
  select slides -> idx into sl from cf_session_private where session_id = p_session;
  if sl is null then raise exception 'Слайд табылмады'; end if;
  typ := sl->>'type';
  if typ not in ('quiz','task','code') then raise exception 'Бұл слайдта тапсырма жоқ'; end if;
  if s.active_task_id is not null then perform cf_close_task(s.active_task_id); end if;

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
    update cf_sessions set active_task_id = first_t.id where id = p_session;
    return first_t;
  end if;

  if jsonb_typeof(sl->'criteria') = 'array' and jsonb_array_length(sl->'criteria') > 0 then
    insert into cf_tasks(session_id, slide_index, kind, prompt, points)
      values (p_session, idx, 'sheet', coalesce(sl->>'prompt', sl->>'title'),
              least(100, (select sum(coalesce((c->>'points')::int, 1)) from jsonb_array_elements(sl->'criteria') c)))
      returning * into t;
    insert into cf_task_keys(task_id, answer) values (t.id, jsonb_build_object('criteria', sl->'criteria'));
    update cf_sessions set active_task_id = t.id where id = p_session;
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
  update cf_sessions set active_task_id = t.id where id = p_session;
  return t;
end $$;

create or replace function cf_submit(p_task uuid, p_answer text, p_meta jsonb default null) returns cf_submissions
language plpgsql security definer set search_path = public as $$
declare t cf_tasks; k cf_task_keys; sub cf_submissions; mine cf_submissions; pr cf_pairs;
  ok boolean := null; pts int := 0; a text := left(coalesce(p_answer, ''), 20000); el numeric; u uuid; uids uuid[];
  cr jsonb; got jsonb; tot int := 0; pt int; val text; frm text; okc boolean; fb text := '';
begin
  select * into t from cf_tasks where id = p_task;
  if t.id is null or not cf_in(t.session_id) then raise exception 'Тапсырма табылмады'; end if;
  if t.status <> 'open' then raise exception 'Тапсырма жабылған'; end if;
  el := extract(epoch from now() - t.opened_at);
  if t.time_limit is not null and el > t.time_limit + 3 then raise exception 'Уақыт бітті'; end if;
  if length(trim(a)) = 0 then raise exception 'Жауап бос'; end if;
  if t.level is null and t.kind in ('quiz','short') and exists (select 1 from cf_submissions where task_id = p_task and student_id = auth.uid()) then
    raise exception 'Жауап жіберілген'; end if;

  -- pair: only the host's screen sends; the partner gets a copy
  if exists (select 1 from cf_pairs where session_id = t.session_id and partner_id = auth.uid()) then
    raise exception 'Жұбыңның экранында орында'; end if;
  select * into pr from cf_pairs where session_id = t.session_id and host_id = auth.uid();
  uids := case when pr.host_id is null then array[auth.uid()] else array[auth.uid(), pr.partner_id] end;

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
    delete from cf_scores where submission_id = mine.id;
    if pts > 0 then
      insert into cf_scores(session_id, student_id, points, reason, task_id, submission_id, created_by)
        values (t.session_id, u, pts, 'Тапсырма', p_task, mine.id, auth.uid());
    end if;
    if u = auth.uid() then sub := mine; end if;
  end loop;
  return sub;
end $$;
