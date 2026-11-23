-- A demo lesson that real students joined is a real lesson: keep it (attendance, answers, points) instead of deleting it.
-- 2026-11-23: a 9th-grade 2.3 lesson was started as a demo from «Жаңа сабақтар» on the home page, students joined,
-- and ending it deleted every answer. Now such a session turns into a class session; its class is the class most of
-- its students belong to (none → the journal asks the teacher to pick one).
create or replace function public.cf_drop_demo(p_session uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare t uuid; cls uuid;
begin
  select teacher_id into t from cf_sessions where id = p_session and mode = 'demo';
  if t is null then return; end if;
  if exists (select 1 from cf_participants where session_id = p_session and student_id <> t) then
    select p.class_id into cls from cf_participants x join profiles p on p.id = x.student_id
      where x.session_id = p_session and p.class_id is not null group by p.class_id order by count(*) desc limit 1;
    update cf_sessions set mode = 'class', class_id = coalesce(class_id, cls),
      status = 'ended', ended_at = coalesce(ended_at, now()), locked = false where id = p_session;
    return;
  end if;
  update cf_slots set session_id = null where session_id = p_session;
  delete from cf_sessions where id = p_session and mode = 'demo';
end $$;
