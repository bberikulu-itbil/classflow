-- ClassFlow "homework layer" (CodeHS-style courses + due dates + gradebook + integrity).
-- APPLIED 2026-10-22 as migration cf_homework_layer (see supabase/003 and replica/backend.md).
-- Reuses: profiles, classes (a class IS the section), schools, my_school(), is_staff(), is_deputy(), cf_norm().
-- Rules of the house: times are timestamptz (UTC), student-owned rows cascade with the profile,
-- teacher-owned rows RESTRICT (reassign before deleting a teacher), all writes by students go through RPC.

create extension if not exists pg_trgm with schema extensions;

create or replace function cf_touch() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;

-- ---------- tables ----------
create table cf_courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  title text not null check (length(title) between 2 and 120),
  subject text,
  grade int check (grade between 1 and 11),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on cf_courses (school_id, archived);
create index on cf_courses (owner_id);

create table cf_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references cf_courses(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on cf_units (course_id, position);

create table cf_activities (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references cf_courses(id) on delete cascade,
  unit_id uuid not null references cf_units(id) on delete cascade,
  position int not null default 0,
  kind text not null check (kind in ('code','quiz','task','reading')),
  title text not null check (length(title) between 1 and 160),
  -- public part only: prompt, starter, hints, options, notes. Answers and tests live in cf_activity_keys.
  content jsonb not null default '{}' check (pg_column_size(content) < 200000),
  points int not null default 5 check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on cf_activities (unit_id, position);
create index on cf_activities (course_id);

create table cf_activity_keys (
  activity_id uuid primary key references cf_activities(id) on delete cascade,
  tests jsonb not null default '[]',      -- [{input,out,label,hidden}]
  answer jsonb,                            -- quiz: option index; task: accepted answers
  solution text,                           -- reference solution, teacher eyes only
  salt text not null default gen_random_uuid()::text  -- salts the output hashes sent to students
);

create table cf_categories (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  name text not null check (length(name) between 1 and 60),
  weight numeric(5,2) not null default 0 check (weight between 0 and 100),
  created_at timestamptz not null default now()
);
create index on cf_categories (class_id);

create table cf_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  activity_id uuid not null references cf_activities(id) on delete cascade,
  assigned_by uuid not null references profiles(id) on delete restrict,
  category_id uuid references cf_categories(id) on delete set null,
  opens_at timestamptz,
  due_at timestamptz,
  allow_late boolean not null default true,
  locked boolean not null default false,
  require_pass boolean not null default false,   -- Submit only when every test passes (CodeHS behaviour)
  points int check (points >= 0),                -- null = use the activity's points
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint due_after_open check (due_at is null or opens_at is null or due_at > opens_at),
  unique (class_id, activity_id)
);
create index on cf_assignments (class_id, due_at);
create index on cf_assignments (activity_id);
create index on cf_assignments (assigned_by);
create index on cf_assignments (category_id);

create table cf_work (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references cf_assignments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  answer text not null default '' check (length(answer) <= 20000),  -- code or text answer
  status text not null default 'draft' check (status in ('draft','submitted','needs_work','finalized')),
  tests_passed int,
  tests_total int,
  points int check (points >= 0),     -- null = not graded; provisional from tests until finalized
  late boolean not null default false,
  feedback text check (length(feedback) <= 4000),
  submitted_at timestamptz,
  graded_by uuid references profiles(id) on delete set null,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tests_sane check (tests_total is null or (tests_passed between 0 and tests_total)),
  unique (assignment_id, student_id)
);
create index on cf_work (student_id);
create index on cf_work (assignment_id, status);
create index on cf_work (graded_by);

create table cf_work_snapshots (
  id bigint generated always as identity primary key,
  work_id uuid not null references cf_work(id) on delete cascade,
  answer text not null,
  reason text not null default 'autosave' check (reason in ('autosave','run','check','submit')),
  pasted_chars int not null default 0 check (pasted_chars >= 0),  -- delta since previous save
  typed_chars int not null default 0 check (typed_chars >= 0),
  saved_at timestamptz not null default now()
);
create index on cf_work_snapshots (work_id, id desc);
create index on cf_work_snapshots (saved_at);

create table cf_integrity_flags (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references cf_work(id) on delete cascade,
  kind text not null check (kind in ('paste','low_history','similarity','too_fast','tool')),
  score numeric,
  state text not null default 'needs_review' check (state in ('needs_review','concern','cleared')),
  note text check (length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (work_id, kind)
);

create table cf_messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  from_id uuid not null references profiles(id) on delete cascade,
  to_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  assignment_id uuid references cf_assignments(id) on delete set null,
  body text not null check (length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint has_target check (to_id is not null or class_id is not null)
);
create index on cf_messages (to_id, created_at desc);
create index on cf_messages (class_id, created_at desc);
create index on cf_messages (from_id);
create index on cf_messages (assignment_id);
create index on cf_messages (school_id);

do $$ declare t text; begin
  foreach t in array array['cf_courses','cf_units','cf_activities','cf_assignments','cf_work'] loop
    execute format('create trigger %I before update on %I for each row execute function cf_touch()', t || '_touch', t);
  end loop;
end $$;

-- ---------- access helpers ----------
create or replace function cf_in_class(c uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and class_id = c and removed_at is null) $$;

create or replace function cf_owns_course(c uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from cf_courses x where x.id = c and x.school_id = my_school() and (x.owner_id = auth.uid() or is_deputy())) $$;

create or replace function cf_owns_assignment(a uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from cf_assignments x join classes c on c.id = x.class_id
   where x.id = a and c.school_id = my_school() and is_staff() and (x.assigned_by = auth.uid() or is_deputy())) $$;

create or replace function cf_owns_work(w uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from cf_work k where k.id = w and cf_owns_assignment(k.assignment_id)) $$;

-- ---------- row level security ----------
alter table cf_courses enable row level security;
alter table cf_units enable row level security;
alter table cf_activities enable row level security;
alter table cf_activity_keys enable row level security;
alter table cf_categories enable row level security;
alter table cf_assignments enable row level security;
alter table cf_work enable row level security;
alter table cf_work_snapshots enable row level security;
alter table cf_integrity_flags enable row level security;
alter table cf_messages enable row level security;

-- teachers: courses, units, activities (students never read these tables directly; they use cf_activity)
create policy courses_read on cf_courses for select using (school_id = my_school() and is_staff());
create policy courses_ins on cf_courses for insert with check (school_id = my_school() and is_staff() and owner_id = (select auth.uid()));
create policy courses_upd on cf_courses for update using (cf_owns_course(id)) with check (school_id = my_school());
create policy courses_del on cf_courses for delete using (cf_owns_course(id));

create policy units_read on cf_units for select using (is_staff() and exists (select 1 from cf_courses c where c.id = course_id and c.school_id = my_school()));
create policy units_ins on cf_units for insert with check (cf_owns_course(course_id));
create policy units_upd on cf_units for update using (cf_owns_course(course_id)) with check (cf_owns_course(course_id));
create policy units_del on cf_units for delete using (cf_owns_course(course_id));

create policy acts_read on cf_activities for select using (is_staff() and exists (select 1 from cf_courses c where c.id = course_id and c.school_id = my_school()));
create policy acts_del on cf_activities for delete using (cf_owns_course(course_id));
-- inserts/updates of activities and keys go through cf_save_activity (keeps tests and content consistent)

create policy keys_read on cf_activity_keys for select using (exists (select 1 from cf_activities a where a.id = activity_id and cf_owns_course(a.course_id)));

create policy cats_all on cf_categories for all
  using (is_staff() and (owner_id = (select auth.uid()) or is_deputy()) and exists (select 1 from classes c where c.id = class_id and c.school_id = my_school()))
  with check (is_staff() and owner_id = (select auth.uid()) and exists (select 1 from classes c where c.id = class_id and c.school_id = my_school()));

create policy assign_read on cf_assignments for select using (cf_owns_assignment(id) or cf_in_class(class_id));
create policy assign_ins on cf_assignments for insert with check (is_staff() and assigned_by = (select auth.uid())
  and exists (select 1 from classes c where c.id = class_id and c.school_id = my_school()));
create policy assign_upd on cf_assignments for update using (cf_owns_assignment(id)) with check (cf_owns_assignment(id));
create policy assign_del on cf_assignments for delete using (cf_owns_assignment(id));

create policy work_read on cf_work for select using (student_id = (select auth.uid()) or cf_owns_assignment(assignment_id));
create policy snaps_read on cf_work_snapshots for select using (exists (select 1 from cf_work w where w.id = work_id));
create policy flags_read on cf_integrity_flags for select using (cf_owns_work(work_id));
create policy flags_upd on cf_integrity_flags for update using (cf_owns_work(work_id)) with check (cf_owns_work(work_id));
create policy msgs_read on cf_messages for select using (from_id = (select auth.uid()) or to_id = (select auth.uid()) or (class_id is not null and cf_in_class(class_id)));

-- tables: read-only for clients unless a policy above says otherwise; no anon access at all
revoke all on cf_courses, cf_units, cf_activities, cf_activity_keys, cf_categories, cf_assignments, cf_work,
  cf_work_snapshots, cf_integrity_flags, cf_messages from anon, authenticated;
grant select on cf_courses, cf_units, cf_activities, cf_activity_keys, cf_assignments, cf_work, cf_work_snapshots, cf_integrity_flags, cf_messages to authenticated;
grant insert, update, delete on cf_courses, cf_units, cf_categories, cf_assignments to authenticated;
grant select on cf_categories to authenticated;
grant delete on cf_activities to authenticated;
grant update (state, note) on cf_integrity_flags to authenticated;

-- ---------- RPC (SECURITY DEFINER, explicit checks, pinned search_path) ----------
-- teacher: create or edit an activity; tests/answers are split off into cf_activity_keys atomically
create or replace function cf_save_activity(p_id uuid, p_unit uuid, p_kind text, p_title text, p_content jsonb,
  p_tests jsonb default '[]', p_answer jsonb default null, p_solution text default null, p_points int default 5)
returns uuid language plpgsql security definer set search_path = public as $$
declare u cf_units; v uuid;
begin
  select * into u from cf_units where id = p_unit;
  if u.id is null or not cf_owns_course(u.course_id) then raise exception 'Құқығыңыз жоқ'; end if;
  if jsonb_typeof(coalesce(p_tests, '[]')) <> 'array' then raise exception 'tests массив болуы керек'; end if;
  if p_id is null then
    insert into cf_activities(course_id, unit_id, kind, title, content, points, position)
      values (u.course_id, u.id, p_kind, p_title, coalesce(p_content, '{}'), p_points,
              coalesce((select max(position) + 1 from cf_activities where unit_id = u.id), 0))
      returning id into v;
  else
    update cf_activities set unit_id = u.id, kind = p_kind, title = p_title, content = coalesce(p_content, '{}'), points = p_points
      where id = p_id and course_id = u.course_id returning id into v;
    if v is null then raise exception 'Белсенділік табылмады'; end if;
  end if;
  insert into cf_activity_keys(activity_id, tests, answer, solution) values (v, coalesce(p_tests, '[]'), p_answer, p_solution)
    on conflict (activity_id) do update set tests = excluded.tests, answer = excluded.answer, solution = excluded.solution;
  return v;
end $$;

-- teacher: give an activity to one or more classes (idempotent per class+activity)
create or replace function cf_assign(p_activity uuid, p_classes uuid[], p_opens timestamptz default null, p_due timestamptz default null,
  p_allow_late boolean default true, p_require_pass boolean default false, p_category uuid default null)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; c uuid;
begin
  if not is_staff() then raise exception 'Құқығыңыз жоқ'; end if;
  if not exists (select 1 from cf_activities a where a.id = p_activity and cf_owns_course(a.course_id)) then raise exception 'Белсенділік табылмады'; end if;
  foreach c in array coalesce(p_classes, '{}') loop
    if not exists (select 1 from classes x where x.id = c and x.school_id = my_school()) then raise exception 'Сынып табылмады'; end if;
    insert into cf_assignments(class_id, activity_id, assigned_by, opens_at, due_at, allow_late, require_pass, category_id)
      values (c, p_activity, auth.uid(), p_opens, p_due, p_allow_late, p_require_pass, p_category)
      on conflict (class_id, activity_id) do update set opens_at = excluded.opens_at, due_at = excluded.due_at,
        allow_late = excluded.allow_late, require_pass = excluded.require_pass, category_id = excluded.category_id
      where cf_assignments.assigned_by = auth.uid() or is_deputy();
    n := n + 1;
  end loop;
  return n;
end $$;

-- student: my homework list for my class (only opened assignments)
create or replace function cf_my_assignments()
returns table (assignment_id uuid, title text, kind text, unit_title text, course_title text, opens_at timestamptz, due_at timestamptz,
  locked boolean, max_points int, status text, tests_passed int, tests_total int, points int, feedback text, late boolean)
language sql stable security definer set search_path = public as $$
  select a.id, act.title, act.kind, u.title, c.title, a.opens_at, a.due_at, a.locked, coalesce(a.points, act.points),
         coalesce(w.status, 'not_started'), w.tests_passed, w.tests_total, w.points, w.feedback, coalesce(w.late, false)
  from cf_assignments a
  join cf_activities act on act.id = a.activity_id
  join cf_units u on u.id = act.unit_id
  join cf_courses c on c.id = act.course_id
  left join cf_work w on w.assignment_id = a.id and w.student_id = auth.uid()
  where cf_in_class(a.class_id) and (a.opens_at is null or a.opens_at <= now())
  order by a.due_at nulls last, u.position, act.position
$$;

-- student/teacher: one activity for the IDE. Tests come as salted hashes; hidden tests carry no expected text.
create or replace function cf_activity(p_assignment uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a cf_assignments; act cf_activities; k cf_activity_keys;
begin
  select * into a from cf_assignments where id = p_assignment;
  if a.id is null then raise exception 'Табылмады'; end if;
  if not (cf_owns_assignment(p_assignment) or (cf_in_class(a.class_id) and (a.opens_at is null or a.opens_at <= now()))) then
    raise exception 'Құқығыңыз жоқ';
  end if;
  select * into act from cf_activities where id = a.activity_id;
  select * into k from cf_activity_keys where activity_id = act.id;
  return jsonb_build_object('id', a.id, 'kind', act.kind, 'title', act.title, 'points', coalesce(a.points, act.points),
    'content', act.content, 'due_at', a.due_at, 'locked', a.locked, 'require_pass', a.require_pass,
    'checks', coalesce((select jsonb_agg(jsonb_build_object(
        'input', t->>'input', 'label', t->>'label', 'hidden', coalesce((t->>'hidden')::boolean, false),
        'out', case when coalesce((t->>'hidden')::boolean, false) then null else t->>'out' end,
        's', k.salt, 'h', encode(sha256(convert_to(k.salt || cf_norm(t->>'out'), 'UTF8')), 'hex')))
      from jsonb_array_elements(coalesce(k.tests, '[]')) t), '[]'::jsonb));
end $$;

-- student: autosave. Snapshot only when the text changed. p_pasted/p_typed are deltas since the previous save.
create or replace function cf_hw_save(p_assignment uuid, p_answer text, p_pasted int default 0, p_typed int default 0, p_reason text default 'autosave')
returns void language plpgsql security definer set search_path = public as $$
declare a cf_assignments; w cf_work; ans text := left(coalesce(p_answer, ''), 20000);
begin
  select * into a from cf_assignments where id = p_assignment;
  if a.id is null or not cf_in_class(a.class_id) or (a.opens_at is not null and a.opens_at > now()) then raise exception 'Құқығыңыз жоқ'; end if;
  if a.locked then raise exception 'Тапсырма жабық'; end if;
  insert into cf_work(assignment_id, student_id, answer) values (p_assignment, auth.uid(), ans)
    on conflict (assignment_id, student_id) do update set answer = case when cf_work.status = 'finalized' then cf_work.answer else excluded.answer end
    returning * into w;
  if w.status = 'finalized' then return; end if;
  if ans is distinct from (select s.answer from cf_work_snapshots s where s.work_id = w.id order by s.id desc limit 1) then
    insert into cf_work_snapshots(work_id, answer, reason, pasted_chars, typed_chars)
      values (w.id, ans, case when p_reason in ('autosave','run','check','submit') then p_reason else 'autosave' end,
              greatest(0, least(coalesce(p_pasted, 0), 20000)), greatest(0, least(coalesce(p_typed, 0), 20000)));
  end if;
end $$;

-- student: submit. Server decides lateness with its own clock. Test counts are client-reported (see architecture.md).
create or replace function cf_hw_submit(p_assignment uuid, p_answer text, p_passed int default null, p_total int default null)
returns cf_work language plpgsql security definer set search_path = public as $$
declare a cf_assignments; act cf_activities; w cf_work; pts int; is_late boolean; pc numeric; tc numeric;
begin
  select * into a from cf_assignments where id = p_assignment for update;
  if a.id is null or not cf_in_class(a.class_id) or (a.opens_at is not null and a.opens_at > now()) then raise exception 'Құқығыңыз жоқ'; end if;
  if a.locked then raise exception 'Тапсырма жабық'; end if;
  is_late := a.due_at is not null and now() > a.due_at;
  if is_late and not a.allow_late then raise exception 'Мерзімі өтіп кетті'; end if;
  if p_total is not null and (p_total < 0 or p_passed is null or p_passed < 0 or p_passed > p_total) then raise exception 'Тест нәтижесі қате'; end if;
  if a.require_pass and (p_total is null or p_total = 0 or p_passed < p_total) then raise exception 'Барлық тест өтуі керек'; end if;
  select * into act from cf_activities where id = a.activity_id;
  pts := case when coalesce(p_total, 0) > 0 then round(coalesce(a.points, act.points) * p_passed::numeric / p_total) end;
  insert into cf_work(assignment_id, student_id, answer, status, tests_passed, tests_total, points, late, submitted_at)
    values (p_assignment, auth.uid(), left(coalesce(p_answer, ''), 20000), 'submitted', p_passed, p_total, pts, is_late, now())
    on conflict (assignment_id, student_id) do update set
      answer = excluded.answer, status = 'submitted', tests_passed = excluded.tests_passed, tests_total = excluded.tests_total,
      points = excluded.points, late = excluded.late, submitted_at = now()
      where cf_work.status <> 'finalized'
    returning * into w;
  if w.id is null then raise exception 'Бағаланған жұмысты қайта жіберуге болмайды'; end if;
  insert into cf_work_snapshots(work_id, answer, reason) select w.id, w.answer, 'submit'
    where w.answer is distinct from (select s.answer from cf_work_snapshots s where s.work_id = w.id order by s.id desc limit 1);
  select coalesce(sum(pasted_chars), 0), coalesce(sum(typed_chars), 0) into pc, tc from cf_work_snapshots where work_id = w.id;
  if pc + tc >= 80 and pc / (pc + tc) > 0.5 then
    insert into cf_integrity_flags(work_id, kind, score) values (w.id, 'paste', round(pc * 100 / (pc + tc)))
      on conflict (work_id, kind) do update set score = excluded.score;
  end if;
  return w;
end $$;

-- teacher: one row per student of the class, including those who have not started
create or replace function cf_hw_review(p_assignment uuid)
returns table (work_id uuid, student_id uuid, full_name text, status text, tests_passed int, tests_total int, points int, late boolean, submitted_at timestamptz, open_flags int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not cf_owns_assignment(p_assignment) then raise exception 'Құқығыңыз жоқ'; end if;
  return query
    select w.id, p.id, p.full_name, coalesce(w.status, 'not_started'), w.tests_passed, w.tests_total, w.points, coalesce(w.late, false), w.submitted_at,
           (select count(*)::int from cf_integrity_flags f where f.work_id = w.id and f.state <> 'cleared')
    from cf_assignments a
    join profiles p on p.class_id = a.class_id and p.removed_at is null and p.role = 'student'
    left join cf_work w on w.assignment_id = a.id and w.student_id = p.id
    where a.id = p_assignment order by p.full_name;
end $$;

-- teacher: grade or send back
create or replace function cf_hw_grade(p_work uuid, p_points int, p_status text, p_feedback text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not cf_owns_work(p_work) then raise exception 'Құқығыңыз жоқ'; end if;
  if p_status not in ('finalized','needs_work') then raise exception 'Күй қате'; end if;
  update cf_work set status = p_status, points = greatest(0, coalesce(p_points, 0)), feedback = left(p_feedback, 4000),
    graded_by = auth.uid(), graded_at = now() where id = p_work;
end $$;

-- teacher: gradebook rows (client pivots them; weights applied client-side from weight)
create or replace function cf_gradebook(p_class uuid)
returns table (student_id uuid, full_name text, assignment_id uuid, title text, max_points int, category_id uuid, weight numeric, points int, status text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (is_staff() and exists (select 1 from classes c where c.id = p_class and c.school_id = my_school())) then raise exception 'Құқығыңыз жоқ'; end if;
  return query
    select p.id, p.full_name, a.id, act.title, coalesce(a.points, act.points), a.category_id, cat.weight, w.points, coalesce(w.status, 'not_started')
    from cf_assignments a
    join cf_activities act on act.id = a.activity_id
    join profiles p on p.class_id = a.class_id and p.removed_at is null and p.role = 'student'
    left join cf_categories cat on cat.id = a.category_id
    left join cf_work w on w.assignment_id = a.id and w.student_id = p.id
    where a.class_id = p_class and (a.assigned_by = auth.uid() or is_deputy())
    order by p.full_name, a.due_at nulls last;
end $$;

-- teacher: pairwise text similarity (trigram). Cheap and naive: renamed variables lower the score.
create or replace function cf_similarity(p_assignment uuid, p_min int default 60)
returns table (name_a text, name_b text, score int)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not cf_owns_assignment(p_assignment) then raise exception 'Құқығыңыз жоқ'; end if;
  return query
    select pa.full_name, pb.full_name,
           round(100 * similarity(regexp_replace(lower(a.answer), '\s+', ' ', 'g'), regexp_replace(lower(b.answer), '\s+', ' ', 'g')))::int s
    from cf_work a join cf_work b on b.assignment_id = a.assignment_id and a.id < b.id
    join profiles pa on pa.id = a.student_id join profiles pb on pb.id = b.student_id
    where a.assignment_id = p_assignment and a.status <> 'draft' and b.status <> 'draft' and length(a.answer) > 30 and length(b.answer) > 30
      and round(100 * similarity(regexp_replace(lower(a.answer), '\s+', ' ', 'g'), regexp_replace(lower(b.answer), '\s+', ' ', 'g'))) >= p_min
    order by s desc;
end $$;

-- messages: staff to a student or class; student only to the owner of an assignment, about that assignment
create or replace function cf_send_message(p_body text, p_to uuid default null, p_class uuid default null, p_assignment uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare a cf_assignments; v uuid;
begin
  if is_staff() then
    if p_to is not null and not exists (select 1 from profiles where id = p_to and school_id = my_school()) then raise exception 'Алушы табылмады'; end if;
    if p_class is not null and not exists (select 1 from classes where id = p_class and school_id = my_school()) then raise exception 'Сынып табылмады'; end if;
  else
    select * into a from cf_assignments where id = p_assignment;
    if a.id is null or not cf_in_class(a.class_id) then raise exception 'Құқығыңыз жоқ'; end if;
    p_to := a.assigned_by; p_class := null;
  end if;
  if p_to is null and p_class is null then raise exception 'Алушы жоқ'; end if;
  insert into cf_messages(school_id, from_id, to_id, class_id, assignment_id, body) values (my_school(), auth.uid(), p_to, p_class, p_assignment, p_body)
    returning id into v;
  return v;
end $$;

-- housekeeping: keep the 300 newest snapshots per work, nothing older than 180 days.
-- Schedule once (needs pg_cron): select cron.schedule('cf-purge-snapshots', '30 21 * * *', 'select public.cf_purge_snapshots()');
create or replace function cf_purge_snapshots() returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from cf_work_snapshots s using (select id, row_number() over (partition by work_id order by id desc) rn from cf_work_snapshots) x
   where s.id = x.id and (x.rn > 300 or s.saved_at < now() - interval '180 days');
  get diagnostics n = row_count; return n;
end $$;

revoke execute on function cf_save_activity, cf_assign, cf_my_assignments, cf_activity, cf_hw_save, cf_hw_submit, cf_hw_review, cf_hw_grade,
  cf_gradebook, cf_similarity, cf_send_message, cf_purge_snapshots, cf_in_class, cf_owns_course, cf_owns_assignment, cf_owns_work from public, anon;
revoke execute on function cf_purge_snapshots from authenticated;
grant execute on function cf_save_activity, cf_assign, cf_my_assignments, cf_activity, cf_hw_save, cf_hw_submit, cf_hw_review, cf_hw_grade,
  cf_gradebook, cf_similarity, cf_send_message,
  cf_in_class, cf_owns_course, cf_owns_assignment, cf_owns_work to authenticated;  -- helpers: RLS policies run as the caller
