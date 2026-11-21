-- The weekly timetable grows up: an entry may span several bells, carries a short label (ИНФ, Ф GD, Сс, Ж),
-- a room (cf_rooms) and a course (cf_curr_courses: the next lecture of that course for the class is offered at the bell).
-- Class-less entries (meetings) are allowed, and two entries may share a bell (alternate weeks, groups).
-- cf_bells: the school's bell schedule (column n → label and time); every teacher of the school sees the same columns.
alter table cf_timetable alter column class_id drop not null;
alter table cf_timetable add column if not exists span int not null default 1;
alter table cf_timetable add column if not exists label text;
alter table cf_timetable add column if not exists room_id uuid references cf_rooms(id) on delete set null;
alter table cf_timetable add column if not exists course_id uuid references cf_curr_courses(id) on delete set null;
alter table cf_timetable drop constraint if exists cf_timetable_owner_id_weekday_period_key;
alter table cf_timetable drop constraint if exists cf_timetable_span_check;
alter table cf_timetable add constraint cf_timetable_span_check check (span between 1 and 4 and period + span - 1 <= 12);
alter table cf_timetable drop constraint if exists cf_timetable_label_check;
alter table cf_timetable add constraint cf_timetable_label_check check (label is null or length(label) <= 12);
create index if not exists cf_timetable_room_idx on cf_timetable (room_id, weekday);

drop policy if exists tt_all on cf_timetable;
drop policy if exists tt_read on cf_timetable;
create policy tt_all on cf_timetable for all
  using (owner_id = (select auth.uid()) and is_staff())
  with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school()
    and (class_id is null or exists (select 1 from classes c where c.id = class_id and c.school_id = my_school()))
    and (room_id is null or exists (select 1 from cf_rooms r where r.id = room_id and r.school_id = my_school()))
    and (course_id is null or exists (select 1 from cf_curr_courses k where k.id = course_id and k.school_id = my_school())));
-- colleagues see each other's timetable (a room's week shows who teaches there)
create policy tt_read on cf_timetable for select using (is_staff() and school_id = my_school());

create table if not exists cf_bells (
  school_id uuid not null references schools(id) on delete cascade,
  n int not null check (n between 1 and 12),
  label text not null check (length(label) between 1 and 12),
  starts time not null,
  ends time not null check (ends > starts),
  primary key (school_id, n)
);
alter table cf_bells enable row level security;
drop policy if exists bells_read on cf_bells;
drop policy if exists bells_write on cf_bells;
create policy bells_read on cf_bells for select using (school_id = my_school());
create policy bells_write on cf_bells for all using (is_staff() and school_id = my_school()) with check (is_staff() and school_id = my_school());
revoke all on cf_bells from public, anon;
grant select, insert, update, delete on cf_bells to authenticated;
