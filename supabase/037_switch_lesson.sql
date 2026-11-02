-- Migration 037: cf_switch_lesson
-- Allows the teacher of an active live session to switch the lesson or module seamlessly
-- without disconnecting or kicking out students and devices.

create or replace function public.cf_switch_lesson(p_session uuid, p_lesson uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  s cf_sessions;
  l cf_lessons;
  sl_count int;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or not cf_teaches(p_session) then
    raise exception 'Құқығыңыз жоқ';
  end if;

  select * into l from cf_lessons where id = p_lesson;
  if l.id is null then
    raise exception 'Дәріс табылмады';
  end if;

  sl_count := coalesce(jsonb_array_length(l.slides), 0);
  if sl_count = 0 then
    raise exception 'Бұл дәрісте слайдтар жоқ';
  end if;

  -- Close any active task from the previous lesson
  if s.active_task_id is not null then
    update cf_tasks set status = 'closed' where id = s.active_task_id;
  end if;

  -- Update cf_session_private with the new slides
  update cf_session_private
  set slides = coalesce(l.slides, '[]'::jsonb)
  where session_id = p_session;

  if not found then
    insert into cf_session_private (session_id, slides)
    values (p_session, coalesce(l.slides, '[]'::jsonb));
  end if;

  -- Update cf_sessions: resets current slide to 0 and updates lesson info
  update cf_sessions
  set lesson_id = p_lesson,
      title = l.title,
      slide_count = sl_count,
      current_slide = 0,
      active_task_id = null
  where id = p_session;

  return jsonb_build_object('success', true, 'lesson_id', p_lesson, 'title', l.title, 'slide_count', sl_count);
end;
$$;

revoke all on function public.cf_switch_lesson(uuid, uuid) from public, anon;
grant execute on function public.cf_switch_lesson(uuid, uuid) to authenticated;
