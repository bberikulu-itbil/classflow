-- NOT APPLIED YET. Paste into Supabase > SQL editor and run once (safe to run twice).
-- Content library (ОМЖ): Course -> Module -> Lecture. A lecture is an existing cf_lessons row; this file only says which module it sits in.
-- Content knows nothing about classes, dates or years: that is the schedule (КТП) and the lesson instance (cf_sessions), added later.
-- A lesson sits in at most one module (primary key = lesson_id). Rows are private to the teacher. Deleting a course/module never deletes lessons.

create table if not exists cf_curr_courses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  title text not null check (length(title) between 1 and 80),
  subject text check (subject is null or length(subject) <= 60),
  grade int check (grade is null or grade between 1 and 11),
  created_at timestamptz not null default now()
);
create index if not exists cf_curr_courses_owner_idx on cf_curr_courses (owner_id, created_at);

create table if not exists cf_curr_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references cf_curr_courses(id) on delete cascade,
  title text not null check (length(title) between 1 and 80),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cf_curr_modules_course_idx on cf_curr_modules (course_id, position);

create table if not exists cf_curr_lessons (
  lesson_id uuid primary key references cf_lessons(id) on delete cascade,
  module_id uuid not null references cf_curr_modules(id) on delete cascade,
  position int not null default 0
);
create index if not exists cf_curr_lessons_module_idx on cf_curr_lessons (module_id, position);

alter table cf_curr_courses enable row level security;
alter table cf_curr_modules enable row level security;
alter table cf_curr_lessons enable row level security;
drop policy if exists ccourse_read on cf_curr_courses;
drop policy if exists ccourse_ins on cf_curr_courses;
drop policy if exists ccourse_upd on cf_curr_courses;
drop policy if exists ccourse_del on cf_curr_courses;
drop policy if exists cmod_all on cf_curr_modules;
drop policy if exists cles_all on cf_curr_lessons;

create policy ccourse_read on cf_curr_courses for select using (owner_id = (select auth.uid()) and is_staff());
create policy ccourse_ins on cf_curr_courses for insert with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school());
create policy ccourse_upd on cf_curr_courses for update using (owner_id = (select auth.uid()) and is_staff()) with check (owner_id = (select auth.uid()) and school_id = my_school());
create policy ccourse_del on cf_curr_courses for delete using (owner_id = (select auth.uid()) and is_staff());

-- a module is mine when its course is mine
create policy cmod_all on cf_curr_modules for all
  using (is_staff() and exists (select 1 from cf_curr_courses c where c.id = course_id and c.owner_id = (select auth.uid())))
  with check (is_staff() and exists (select 1 from cf_curr_courses c where c.id = course_id and c.owner_id = (select auth.uid())));
-- a placement is mine when both the module and the lesson are mine
create policy cles_all on cf_curr_lessons for all
  using (is_staff() and exists (select 1 from cf_curr_modules m join cf_curr_courses c on c.id = m.course_id where m.id = module_id and c.owner_id = (select auth.uid())))
  with check (is_staff()
    and exists (select 1 from cf_curr_modules m join cf_curr_courses c on c.id = m.course_id where m.id = module_id and c.owner_id = (select auth.uid()))
    and exists (select 1 from cf_lessons l where l.id = lesson_id and l.owner_id = (select auth.uid())));

revoke all on cf_curr_courses, cf_curr_modules, cf_curr_lessons from public, anon;
grant select, insert, update, delete on cf_curr_courses, cf_curr_modules, cf_curr_lessons to authenticated;
