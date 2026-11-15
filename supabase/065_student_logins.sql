-- 065: the school-issued login and password of a student, kept so a teacher can show or print them for a class (journal page).
-- Readable only through cf_class_logins by staff of the same school; no direct access (RLS on, no policies).
-- The rows themselves are loaded by hand (they hold passwords and are not kept in the repository).
create table if not exists public.cf_student_logins (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  login text not null,
  password text not null,
  updated_at timestamptz not null default now()
);
alter table public.cf_student_logins enable row level security;
revoke all on public.cf_student_logins from anon, authenticated;

create or replace function public.cf_class_logins(p_class uuid)
returns table (student_id uuid, full_name text, login text, password text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() or not exists (select 1 from classes c where c.id = p_class and c.school_id = my_school()) then raise exception 'Құқығыңыз жоқ'; end if;
  return query
    select p.id, p.full_name, l.login, l.password
    from profiles p left join cf_student_logins l on l.student_id = p.id
    where p.class_id = p_class and p.role = 'student' and p.removed_at is null
    order by l.login nulls last, p.full_name;
end $$;
revoke all on function public.cf_class_logins(uuid) from public, anon;
grant execute on function public.cf_class_logins(uuid) to authenticated;
