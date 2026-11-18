-- Exams in a course and lessons that open after the class had them.
-- 1. A lesson of a course shared with classes or a grade opens for a student only after their class (or the student) had it in a lesson
--    (a non-demo session on that lesson). Courses shared with everyone or with chosen students stay fully open (self-study).
-- 2. A lesson placed in a module can be marked as an exam (cf_curr_lessons.exam). Students see it in the course but can take it only
--    while the teacher has it open for their class (cf_exams window). One attempt per opening; the server marks quizzes (with test
--    variants: the student's own variant, cf_qvariant) and short answers, and keeps the result (cf_exam_results).

alter table cf_curr_lessons add column if not exists exam boolean not null default false;

create table if not exists cf_exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  lesson_id uuid not null references cf_lessons(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,          -- null: everyone who sees the course
  opened_by uuid references profiles(id) on delete set null,
  opens_at timestamptz not null default now(),
  closes_at timestamptz
);
create index if not exists cf_exams_lesson_idx on cf_exams(lesson_id);
alter table cf_exams enable row level security;
drop policy if exists cf_exams_read on cf_exams;
create policy cf_exams_read on cf_exams for select using (is_staff() and school_id = my_school());

create table if not exists cf_exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references cf_exams(id) on delete cascade,
  school_id uuid not null references schools(id),
  lesson_id uuid not null references cf_lessons(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  answers jsonb not null default '{}',
  detail jsonb not null default '[]',
  points int not null default 0,
  max_points int not null default 0,
  submitted_at timestamptz not null default now(),
  unique (exam_id, student_id)
);
alter table cf_exam_results enable row level security;
drop policy if exists cf_exam_results_read on cf_exam_results;
create policy cf_exam_results_read on cf_exam_results for select using (student_id = (select auth.uid()) or (is_staff() and school_id = my_school()));

/* Has my class (or have I) had this lesson in a real (non-demo) session? */
create or replace function cf_taught_me(p_lesson uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cf_sessions s where s.mode <> 'demo'
      and s.class_id is not null and s.class_id = (select p.class_id from profiles p where p.id = auth.uid())
      and (s.lesson_id = p_lesson or exists (select 1 from cf_tasks t where t.session_id = s.id and t.lesson_id = p_lesson)))
    or exists (select 1 from cf_participants pa join cf_sessions s on s.id = pa.session_id
      where pa.student_id = auth.uid() and s.mode <> 'demo' and s.lesson_id = p_lesson) $$;

/* The exam window open now for me, if any. */
create or replace function cf_exam_now(p_lesson uuid) returns cf_exams
language sql stable security definer set search_path = public as $$
  select e.* from cf_exams e where e.lesson_id = p_lesson and e.opens_at <= now() and (e.closes_at is null or e.closes_at > now())
    and (e.class_id is null or e.class_id = (select p.class_id from profiles p where p.id = auth.uid()))
  order by e.opens_at desc limit 1 $$;

create or replace function cf_student_courses() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'subject', c.subject, 'grade', c.grade, 'description', c.description, 'cover_url', c.cover_url, 'instructor', c.instructor, 'level', c.level,
    'modules', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'kind', m.kind, 'quarter', m.quarter,
        'lessons', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title,
            'n', case when jsonb_typeof(l.slides) = 'array' then jsonb_array_length(l.slides) else 0 end,
            'exam', cl.exam,
            'open', case when cl.exam then (cf_exam_now(l.id)).id is not null else c.audience in ('all', 'students') or cf_taught_me(l.id) end,
            'closes_at', case when cl.exam then (cf_exam_now(l.id)).closes_at end,
            'result', case when cl.exam then (select jsonb_build_object('points', r.points, 'max', r.max_points, 'at', r.submitted_at)
                from cf_exam_results r where r.lesson_id = l.id and r.student_id = auth.uid() order by r.submitted_at desc limit 1) end,
            'done', cl.exam and exists (select 1 from cf_exam_results r where r.exam_id = (cf_exam_now(l.id)).id and r.student_id = auth.uid())
          ) order by cl.position), '[]'::jsonb)
          from cf_curr_lessons cl join cf_lessons l on l.id = cl.lesson_id where cl.module_id = m.id)) order by m.position), '[]'::jsonb)
      from cf_curr_modules m where m.course_id = c.id)) order by c.created_at), '[]'::jsonb)
  from cf_curr_courses c where cf_course_open(c) $$;

create or replace function cf_course_lesson(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare l cf_lessons; c cf_curr_courses; ex boolean;
begin
  select x.* into l from cf_lessons x where x.id = p_lesson;
  select cl.exam into ex from cf_curr_lessons cl where cl.lesson_id = p_lesson;
  select cc.* into c from cf_curr_lessons cl join cf_curr_modules m on m.id = cl.module_id join cf_curr_courses cc on cc.id = m.course_id
    where cl.lesson_id = p_lesson and cf_course_open(cc);
  if c.id is null or l.id is null then raise exception 'Құқығыңыз жоқ'; end if;
  if not is_staff() then
    if ex then raise exception 'Бұл — емтихан: мұғалім ашқанда «Тапсыру» батырмасы шығады'; end if;
    if c.audience not in ('all', 'students') and not cf_taught_me(p_lesson) then raise exception 'Бұл дәріс сыныпта өтілгеннен кейін ашылады'; end if;
  end if;
  return jsonb_build_object('title', l.title, 'slides', case when jsonb_typeof(l.slides) = 'array'
    then (select coalesce(jsonb_agg(cf_strip_slide(s, true) order by o), '[]'::jsonb) from jsonb_array_elements(l.slides) with ordinality t(s, o)) else '[]'::jsonb end);
end $$;

/* The exam's pages for me: answers stripped, a test with variants shows only my variant. */
create or replace function cf_exam_get(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare l cf_lessons; e cf_exams; c cf_curr_courses; s jsonb; res jsonb := '[]'; i int := 0; n int; vi int; q jsonb; lng text;
begin
  select cc.* into c from cf_curr_lessons cl join cf_curr_modules m on m.id = cl.module_id join cf_curr_courses cc on cc.id = m.course_id
    where cl.lesson_id = p_lesson and cl.exam and cf_course_open(cc);
  if c.id is null then raise exception 'Емтихан табылмады'; end if;
  e := cf_exam_now(p_lesson);
  if e.id is null then raise exception 'Емтихан әзірге жабық'; end if;
  if exists (select 1 from cf_exam_results r where r.exam_id = e.id and r.student_id = auth.uid()) then raise exception 'Емтихан тапсырылған'; end if;
  select * into l from cf_lessons where id = p_lesson;
  for s in select x from jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) x loop
    q := cf_strip_slide(s, true);
    if jsonb_typeof(s->'qvariants') = 'array' and jsonb_array_length(s->'qvariants') > 0 then
      n := jsonb_array_length(s->'qvariants'); vi := ascii(cf_qvariant(auth.uid(), i, n)) - 65;
      q := q || jsonb_build_object('prompt', s->'qvariants'->vi->'prompt', 'options', s->'qvariants'->vi->'options', 'variant', chr(65 + vi));
      foreach lng in array array['ru','en'] loop
        if jsonb_typeof(s->lng->'qtext') = 'array' then
          q := jsonb_set(q, array[lng], coalesce(q->lng, '{}') || jsonb_build_object('prompt', s->lng->'qtext'->vi->'prompt', 'options', s->lng->'qtext'->vi->'options'));
        end if;
      end loop;
    end if;
    res := res || jsonb_build_array(q - 'qtext');
    i := i + 1;
  end loop;
  return jsonb_build_object('exam_id', e.id, 'title', l.title, 'closes_at', e.closes_at, 'slides', res);
end $$;

/* Marks and stores my answers ({"<slide index>": "<answer>"}); quizzes by option index, short answers by the accepted list. */
create or replace function cf_exam_submit(p_lesson uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l cf_lessons; e cf_exams; s jsonb; i int := 0; n int; key text; a text; pts int; got int := 0; mx int := 0; ok boolean; det jsonb := '[]';
begin
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Жауап пішімі қате'; end if;
  select * into e from cf_exams x where x.lesson_id = p_lesson and x.opens_at <= now() and (x.closes_at is null or x.closes_at > now() - interval '30 seconds')
    and (x.class_id is null or x.class_id = (select p.class_id from profiles p where p.id = auth.uid()))
    and exists (select 1 from cf_curr_lessons cl join cf_curr_modules m on m.id = cl.module_id join cf_curr_courses cc on cc.id = m.course_id
                where cl.lesson_id = p_lesson and cl.exam and cf_course_open(cc))
  order by x.opens_at desc limit 1;
  if e.id is null then raise exception 'Емтихан жабық'; end if;
  if exists (select 1 from cf_exam_results r where r.exam_id = e.id and r.student_id = auth.uid()) then raise exception 'Емтихан тапсырылған'; end if;
  select * into l from cf_lessons where id = p_lesson;
  for s in select x from jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) x loop
    pts := coalesce((s->>'points')::int, 1); a := left(trim(coalesce(p_answers->>i::text, '')), 2000); key := null; ok := null;
    if s->>'type' = 'quiz' then
      if jsonb_typeof(s->'qvariants') = 'array' and jsonb_array_length(s->'qvariants') > 0 then
        n := jsonb_array_length(s->'qvariants'); key := s->'qvariants'->(ascii(cf_qvariant(auth.uid(), i, n)) - 65)->>'answer';
      else key := s->>'answer'; end if;
      if key is not null then ok := (a = key); end if;
    elsif s->>'type' = 'task' and jsonb_array_length(coalesce(s->'accept', '[]'::jsonb)) > 0 then
      ok := exists (select 1 from jsonb_array_elements_text(s->'accept') x where lower(trim(x)) = lower(a));
    end if;
    if ok is not null then
      mx := mx + pts; if ok then got := got + pts; end if;
      det := det || jsonb_build_array(jsonb_build_object('i', i, 'ok', ok, 'pts', case when ok then pts else 0 end, 'max', pts));
    end if;
    i := i + 1;
  end loop;
  insert into cf_exam_results(exam_id, school_id, lesson_id, student_id, answers, detail, points, max_points)
    values (e.id, e.school_id, p_lesson, auth.uid(), p_answers, det, got, mx);
  return jsonb_build_object('points', got, 'max', mx);
end $$;

create or replace function cf_exam_open(p_lesson uuid, p_class uuid, p_minutes int default 45) returns cf_exams
language plpgsql security definer set search_path = public as $$
declare e cf_exams;
begin
  if not is_staff() then raise exception 'Құқығыңыз жоқ'; end if;
  if not exists (select 1 from cf_curr_lessons cl join cf_lessons l on l.id = cl.lesson_id where cl.lesson_id = p_lesson and cl.exam and l.school_id = my_school()) then
    raise exception 'Алдымен дәрісті емтихан деп белгілеңіз'; end if;
  insert into cf_exams(school_id, lesson_id, class_id, opened_by, closes_at)
    values (my_school(), p_lesson, p_class, auth.uid(), case when coalesce(p_minutes, 0) > 0 then now() + make_interval(mins => least(p_minutes, 1440)) end)
    returning * into e;
  return e;
end $$;

create or replace function cf_exam_close(p_exam uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Құқығыңыз жоқ'; end if;
  update cf_exams set closes_at = now() where id = p_exam and school_id = my_school() and (closes_at is null or closes_at > now());
end $$;

revoke all on function cf_taught_me(uuid), cf_exam_now(uuid) from public, anon, authenticated;
revoke all on function cf_exam_get(uuid), cf_exam_submit(uuid, jsonb), cf_exam_open(uuid, uuid, int), cf_exam_close(uuid) from public, anon;
grant execute on function cf_exam_get(uuid), cf_exam_submit(uuid, jsonb), cf_exam_open(uuid, uuid, int), cf_exam_close(uuid) to authenticated;
