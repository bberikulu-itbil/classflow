-- NOT APPLIED YET. Paste into Supabase > SQL editor and run once (safe to run twice).
-- Class gradebook: one row per assessed column (ҚБ / БЖБ / ТЖБ) of a class in a quarter, and one row per student mark.
-- Rows are private to the teacher who made them. House rules as in 003/006: timestamptz, teacher-owned rows RESTRICT.
-- Grades are NOT stored: they are computed in the app from the points (25% ҚБ + 25% БЖБ + 50% ТЖБ), so a change of the rules never leaves stale grades.

create table if not exists cf_assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  class_id uuid not null references classes(id) on delete cascade,
  school_year int not null check (school_year between 2000 and 2100), -- the year the school year started (September)
  quarter int not null check (quarter between 1 and 4),
  kind text not null check (kind in ('kb', 'bzb', 'tzb')),
  title text not null check (length(title) between 1 and 80),
  held_on date not null default current_date,
  max_points int not null,
  created_at timestamptz not null default now(),
  -- БЖБ 7-20 points, ТЖБ 25 or 30 (Order No. 125); ҚБ is free within 1-100
  constraint cf_assessments_max check (
    (kind = 'bzb' and max_points between 7 and 20) or (kind = 'tzb' and max_points in (25, 30)) or (kind = 'kb' and max_points between 1 and 100))
);
create index if not exists cf_assessments_class_idx on cf_assessments (owner_id, class_id, school_year, quarter, held_on);

create table if not exists cf_marks (
  assessment_id uuid not null references cf_assessments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  points numeric(6, 2) not null check (points >= 0),
  updated_at timestamptz not null default now(),
  primary key (assessment_id, student_id)
);

-- a mark may not exceed the column's maximum
create or replace function cf_marks_check() returns trigger language plpgsql as $$
begin
  if new.points > (select max_points from cf_assessments where id = new.assessment_id) then
    raise exception 'Ұпай максимумнан артық';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists cf_marks_chk on cf_marks;
create trigger cf_marks_chk before insert or update on cf_marks for each row execute function cf_marks_check();

alter table cf_assessments enable row level security;
alter table cf_marks enable row level security;
drop policy if exists assess_read on cf_assessments;
drop policy if exists assess_ins on cf_assessments;
drop policy if exists assess_upd on cf_assessments;
drop policy if exists assess_del on cf_assessments;
drop policy if exists marks_read on cf_marks;
drop policy if exists marks_ins on cf_marks;
drop policy if exists marks_upd on cf_marks;
drop policy if exists marks_del on cf_marks;

create policy assess_read on cf_assessments for select using (owner_id = (select auth.uid()) and is_staff());
create policy assess_ins on cf_assessments for insert with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school()
  and exists (select 1 from classes c where c.id = class_id and c.school_id = my_school()));
create policy assess_upd on cf_assessments for update using (owner_id = (select auth.uid()) and is_staff())
  with check (owner_id = (select auth.uid()) and school_id = my_school()
  and exists (select 1 from classes c where c.id = class_id and c.school_id = my_school()));
create policy assess_del on cf_assessments for delete using (owner_id = (select auth.uid()) and is_staff());

-- marks: only for own columns, only for students of the same school
create policy marks_read on cf_marks for select using (exists (select 1 from cf_assessments a where a.id = assessment_id and a.owner_id = (select auth.uid()) and is_staff()));
create policy marks_ins on cf_marks for insert with check (
  exists (select 1 from cf_assessments a where a.id = assessment_id and a.owner_id = (select auth.uid()) and is_staff() and a.school_id = my_school())
  and exists (select 1 from profiles p where p.id = student_id and p.role = 'student' and p.school_id = my_school()));
create policy marks_upd on cf_marks for update using (exists (select 1 from cf_assessments a where a.id = assessment_id and a.owner_id = (select auth.uid()) and is_staff()))
  with check (exists (select 1 from cf_assessments a where a.id = assessment_id and a.owner_id = (select auth.uid()) and is_staff()));
create policy marks_del on cf_marks for delete using (exists (select 1 from cf_assessments a where a.id = assessment_id and a.owner_id = (select auth.uid()) and is_staff()));

revoke all on cf_assessments, cf_marks from public, anon;
grant select, insert, update, delete on cf_assessments, cf_marks to authenticated;
