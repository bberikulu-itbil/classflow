-- NOT APPLIED YET. Paste into Supabase > SQL editor and run once (safe to run twice). Needs 008_curriculum.sql first.
-- A module is either a school-lesson module ('lesson', may belong to one quarter) or a course module ('course', no quarter).
-- grade = the parallel (1-11) the module is for; empty = use the grade of its course. Old modules become 'lesson' without quarter.
alter table cf_curr_modules add column if not exists kind text not null default 'lesson';
alter table cf_curr_modules add column if not exists quarter int;
alter table cf_curr_modules add column if not exists grade int;

alter table cf_curr_modules drop constraint if exists cf_curr_modules_kind_chk;
alter table cf_curr_modules add constraint cf_curr_modules_kind_chk check (kind in ('lesson', 'course'));
alter table cf_curr_modules drop constraint if exists cf_curr_modules_quarter_chk;
alter table cf_curr_modules add constraint cf_curr_modules_quarter_chk check (quarter is null or (kind = 'lesson' and quarter between 1 and 4));
alter table cf_curr_modules drop constraint if exists cf_curr_modules_grade_chk;
alter table cf_curr_modules add constraint cf_curr_modules_grade_chk check (grade is null or grade between 1 and 11);
-- policies of 008 cover the new columns (row-level), nothing to add
