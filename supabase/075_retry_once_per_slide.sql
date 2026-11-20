-- A task sent twice (or resubmitted) on one slide: the retry earns at most 80% and the slide counts once (the best try).

create or replace function cf_submit(p_task uuid, p_answer text, p_meta jsonb default null) returns cf_submissions
language plpgsql security definer set search_path = public as $$
declare t cf_tasks; k cf_task_keys; sub cf_submissions; mine cf_submissions; pr cf_pairs;
  ok boolean := null; pts int := 0; a text := left(coalesce(p_answer, ''), 20000); el numeric; u uuid; uids uuid[];
  cr jsonb; got jsonb; tot int := 0; pt int; val text; frm text; okc boolean; fb text := ''; retry boolean := false;
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

  -- A second answer to the same slide (the same task sent again, or the task reopened) is allowed but earns at most 80%;
  -- L1–L3 levels are exempt: there a student retries until right by design.
  if t.level is null then
    retry := exists (select 1 from cf_submissions x join cf_tasks tt on tt.id = x.task_id
      where x.student_id = auth.uid() and tt.session_id = t.session_id and tt.slide_index = t.slide_index and tt.level is null);
    if retry then pts := least(pts, floor(t.points * 0.8)::int); end if;
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
    if retry then update cf_submissions set meta = coalesce(meta, '{}'::jsonb) || '{"retry": true}' where id = mine.id returning * into mine; end if;
    -- one slide counts once: keep only the best score of this student on it
    if t.level is null then
      delete from cf_scores sc using cf_submissions x, cf_tasks tt
      where sc.submission_id = x.id and x.task_id = tt.id and x.student_id = u and tt.session_id = t.session_id and tt.slide_index = t.slide_index and tt.level is null
        and sc.id <> (select sc2.id from cf_scores sc2 join cf_submissions x2 on x2.id = sc2.submission_id join cf_tasks t2 on t2.id = x2.task_id
                      where x2.student_id = u and t2.session_id = t.session_id and t2.slide_index = t.slide_index and t2.level is null
                      order by sc2.points desc, (sc2.submission_id = mine.id) desc limit 1);
    end if;
    if u = auth.uid() then sub := mine; end if;
  end loop;
  return sub;
end $$;

-- Analytics: a slide sent twice counts once (its top points once, done once).
create or replace function cf_module_results(p_module uuid)
 returns table(session_id uuid, lesson_id uuid, class_id uuid, class_name text, started_at timestamptz, student_id uuid, full_name text, points integer, max_points integer, done integer, tasks integer)
 language sql stable security definer set search_path to 'public' as $function$
  with les as (select cl.lesson_id from cf_curr_lessons cl where cl.module_id = p_module),
  mine as (select s.* from cf_sessions s where s.teacher_id = auth.uid() and s.status <> 'live' and s.mode <> 'demo'),
  sl as (
    select m.id sid, m.lesson_id lid from mine m where m.lesson_id in (select lesson_id from les)
    union
    select t.session_id, t.lesson_id from cf_tasks t join mine m on m.id = t.session_id where t.lesson_id in (select lesson_id from les)
  ),
  tk as (select x.sid, x.lid, count(*)::int n, coalesce(sum(x.mx), 0)::int mx
         from (select t.session_id sid, t.lesson_id lid, t.slide_index, t.level, max(t.points) mx from cf_tasks t group by 1, 2, 3, 4) x group by 1, 2)
  select sl.sid, sl.lid, s.class_id, coalesce(c.name, case when s.mode = 'guest' then 'Қонақ' end), s.started_at, p.student_id, p.full_name,
    coalesce((select sum(sc.points) from cf_scores sc left join cf_tasks t on t.id = sc.task_id
              where sc.session_id = sl.sid and sc.student_id = p.student_id
                and (t.lesson_id = sl.lid or (sc.task_id is null and s.lesson_id = sl.lid))), 0)::int,
    coalesce(tk.mx, 0),
    (select count(distinct (t.slide_index, t.level)) from cf_submissions sb join cf_tasks t on t.id = sb.task_id
      where sb.session_id = sl.sid and sb.student_id = p.student_id and t.lesson_id = sl.lid)::int,
    coalesce(tk.n, 0)
  from sl join cf_sessions s on s.id = sl.sid
  left join classes c on c.id = s.class_id
  join cf_participants p on p.session_id = sl.sid
  left join tk on tk.sid = sl.sid and tk.lid = sl.lid
  order by s.started_at, p.full_name;
$function$;

-- Old double counts: keep each student's best score per slide (sessions before this rule).
delete from cf_scores sc using (
  select sc.id, row_number() over (partition by x.student_id, t.session_id, t.slide_index order by sc.points desc, sc.created_at desc) rn
  from cf_scores sc join cf_submissions x on x.id = sc.submission_id join cf_tasks t on t.id = x.task_id where t.level is null
) d where d.id = sc.id and d.rn > 1;
