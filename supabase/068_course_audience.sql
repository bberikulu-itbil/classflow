-- Who sees a shared course: everyone, its grade (the old behaviour, still the default), chosen classes or chosen students.
alter table cf_curr_courses add column if not exists audience text not null default 'grade' check (audience in ('all', 'grade', 'classes', 'students'));
alter table cf_curr_courses add column if not exists audience_ids uuid[] not null default '{}';

create or replace function cf_course_open(c cf_curr_courses) returns boolean
language sql stable security definer set search_path = public as $$
  select c.shared and c.school_id = my_school() and (is_staff() or case c.audience
    when 'all' then true
    when 'classes' then (select p.class_id from profiles p where p.id = auth.uid()) = any(c.audience_ids)
    when 'students' then auth.uid() = any(c.audience_ids)
    else c.grade is null or c.grade = (select cl.grade from profiles p join classes cl on cl.id = p.class_id where p.id = auth.uid())
  end) $$;
revoke all on function cf_course_open(cf_curr_courses) from public, anon, authenticated;
