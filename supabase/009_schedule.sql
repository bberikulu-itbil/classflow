-- NOT APPLIED YET. Paste into Supabase > SQL editor and run once (safe to run twice).
-- Schedule (КТП). Two small tables, private to the teacher:
--   cf_timetable : the current weekly timetable (class, weekday, lesson number); changing it does not touch slots already generated. A teacher cannot teach two classes in the same period.
--   cf_slots     : one dated lesson slot of a class (generated from the timetable). A lecture (cf_lessons row) can be put into it; the lesson
--                  instance (cf_sessions) is created later, when the teacher starts the slot.
-- Content (courses/modules/lectures, 008) knows nothing about dates; this file knows nothing about content except the optional lesson_id.

create table if not exists cf_timetable (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  class_id uuid not null references classes(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7), -- 1 = Monday
  period int not null check (period between 1 and 12),
  unique (owner_id, weekday, period)
);

create table if not exists cf_slots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  class_id uuid not null references classes(id) on delete cascade,
  school_year int not null check (school_year between 2000 and 2100), -- the year the school year started (September)
  quarter int not null check (quarter between 1 and 4),
  held_on date not null,
  period int not null check (period between 1 and 12),
  lesson_id uuid references cf_lessons(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (owner_id, held_on, period)
);
create index if not exists cf_slots_class_idx on cf_slots (owner_id, class_id, school_year, quarter, held_on, period);

alter table cf_timetable enable row level security;
alter table cf_slots enable row level security;
drop policy if exists tt_all on cf_timetable;
drop policy if exists slot_all on cf_slots;
create policy tt_all on cf_timetable for all
  using (owner_id = (select auth.uid()) and is_staff())
  with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school()
    and exists (select 1 from classes c where c.id = class_id and c.school_id = my_school()));
create policy slot_all on cf_slots for all
  using (owner_id = (select auth.uid()) and is_staff())
  with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school()
    and exists (select 1 from classes c where c.id = class_id and c.school_id = my_school())
    and (lesson_id is null or exists (select 1 from cf_lessons l where l.id = lesson_id and l.owner_id = (select auth.uid()))));

revoke all on cf_timetable, cf_slots from public, anon;
grant select, insert, update, delete on cf_timetable, cf_slots to authenticated;
