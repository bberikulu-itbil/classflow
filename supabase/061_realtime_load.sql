-- Migration 061: lighter live lessons (23+ devices in one session).
-- 1) cf_heartbeat wrote last_seen_at every 15 s per student; cf_participants is in the realtime publication, so every beat was an event for the teacher's devices
--    (nothing reads last_seen_at). Now it writes only when the value is 2 minutes old.
-- 2) cf_submit deleted and re-inserted the student's cf_scores row on every (re)submit: a DELETE + INSERT event for every student in the class.
--    Now the row is inserted once, updated only when the points change, deleted only when the points drop to 0.
-- 3) index for the cf_scores lookups by submission_id.

create index if not exists cf_scores_submission_id_idx on public.cf_scores (submission_id);

create or replace function public.cf_heartbeat(p_session uuid)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare st text;
begin
  update cf_participants set last_seen_at = now()
    where session_id = p_session and student_id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '2 minutes');
  select status into st from cf_sessions where id = p_session;
  return st;
end $function$;

create or replace function public.cf_submit(p_task uuid, p_answer text, p_meta jsonb default null::jsonb)
returns cf_submissions language plpgsql security definer set search_path to 'public' as $function$
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
end $function$;
