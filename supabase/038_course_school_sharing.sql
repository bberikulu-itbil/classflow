-- Migration 038: Allow staff in the same school to view curriculum courses & modules
-- Also assign 'Informatics 8th grade' ownership to active teachers.

-- 1. Update RLS: allow teachers/admins in the same school to view school curriculum
drop policy if exists ccourse_read on public.cf_curr_courses;
create policy ccourse_read on public.cf_curr_courses for select
  using (is_staff() and (owner_id = (select auth.uid()) or school_id = my_school()));

drop policy if exists cmod_read on public.cf_curr_modules;
create policy cmod_read on public.cf_curr_modules for select
  using (is_staff() and exists (
    select 1 from public.cf_curr_courses c
    where c.id = course_id and (c.owner_id = (select auth.uid()) or c.school_id = my_school())
  ));

drop policy if exists cles_read on public.cf_curr_lessons;
create policy cles_read on public.cf_curr_lessons for select
  using (is_staff() and exists (
    select 1 from public.cf_curr_modules m
    join public.cf_curr_courses c on c.id = m.course_id
    where m.id = module_id and (c.owner_id = (select auth.uid()) or c.school_id = my_school())
  ));

-- 2. Update owner_id of Informatics 8th grade course and lessons to Bagdaulet (or active teacher)
do $$
declare
  v_teacher uuid;
begin
  select id into v_teacher
  from public.profiles
  where role in ('teacher', 'admin')
  order by (case when full_name ilike '%Bagdaulet%' or full_name ilike '%Бағдәулет%' or full_name ilike '%Багдаулет%' then 0 else 1 end),
        created_at desc
  limit 1;

  if v_teacher is not null then
    update public.cf_curr_courses
    set owner_id = v_teacher
    where title in ('Informatics 8th grade', 'Информатика 8-сынып');

    update public.cf_lessons
    set owner_id = v_teacher
    where id in ('inf8-2-1', 'inf8-2-2', 'inf8-2-3', 'inf8-2-4', 'inf8-2-5', 'inf8-2-6', 'inf8-2-7', 'inf8-2-8')
       or title like '2.%';
  end if;
end $$;
