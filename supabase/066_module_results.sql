-- Module results: every task a class did in a lesson stays attached to that lesson after the session ends (also when the teacher
-- switched lessons inside one session), the course analytics reads them per module, and the teacher may delete a past session.

-- 1. A task remembers its lesson (cf_switch_lesson changes cf_sessions.lesson_id, so the session alone cannot tell).
alter table cf_tasks add column if not exists lesson_id uuid references cf_lessons(id) on delete set null;
update cf_tasks t set lesson_id = s.lesson_id from cf_sessions s where s.id = t.session_id and t.lesson_id is null;
create index if not exists cf_tasks_lesson_idx on cf_tasks(lesson_id);

create or replace function cf_task_lesson() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.lesson_id is null then select lesson_id into new.lesson_id from cf_sessions where id = new.session_id; end if;
  return new;
end $$;
drop trigger if exists cf_task_lesson_trg on cf_tasks;
create trigger cf_task_lesson_trg before insert on cf_tasks for each row execute function cf_task_lesson();

-- 2. Results of one module for the calling teacher's ended sessions: one row per (session, lesson, student who joined).
--    points = scores for that lesson's tasks (plus hand-given points of a session that is on that lesson), max_points = sum of task points.
create or replace function cf_module_results(p_module uuid)
returns table(session_id uuid, lesson_id uuid, class_id uuid, class_name text, started_at timestamptz,
              student_id uuid, full_name text, points int, max_points int, done int, tasks int)
language sql stable security definer set search_path = public as $$
  with les as (select cl.lesson_id from cf_curr_lessons cl where cl.module_id = p_module),
  mine as (select s.* from cf_sessions s where s.teacher_id = auth.uid() and s.status <> 'live'),
  sl as (
    select m.id sid, m.lesson_id lid from mine m where m.lesson_id in (select lesson_id from les)
    union
    select t.session_id, t.lesson_id from cf_tasks t join mine m on m.id = t.session_id where t.lesson_id in (select lesson_id from les)
  ),
  tk as (select t.session_id sid, t.lesson_id lid, count(*)::int n, coalesce(sum(t.points), 0)::int mx from cf_tasks t group by 1, 2)
  select sl.sid, sl.lid, s.class_id, c.name, s.started_at, p.student_id, p.full_name,
    coalesce((select sum(sc.points) from cf_scores sc left join cf_tasks t on t.id = sc.task_id
              where sc.session_id = sl.sid and sc.student_id = p.student_id
                and (t.lesson_id = sl.lid or (sc.task_id is null and s.lesson_id = sl.lid))), 0)::int,
    coalesce(tk.mx, 0),
    (select count(distinct sb.task_id) from cf_submissions sb join cf_tasks t on t.id = sb.task_id
      where sb.session_id = sl.sid and sb.student_id = p.student_id and t.lesson_id = sl.lid)::int,
    coalesce(tk.n, 0)
  from sl join cf_sessions s on s.id = sl.sid
  left join classes c on c.id = s.class_id
  join cf_participants p on p.session_id = sl.sid
  left join tk on tk.sid = sl.sid and tk.lid = sl.lid
  order by s.started_at, p.full_name;
$$;
revoke all on function cf_module_results(uuid) from public, anon;
grant execute on function cf_module_results(uuid) to authenticated;

-- 3. Delete a past session with everything in it (tasks, answers, points); a journal slot linked to it keeps its marks and loses the link.
create or replace function cf_delete_session(p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
declare s cf_sessions;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or s.teacher_id <> auth.uid() then raise exception 'Құқығыңыз жоқ'; end if;
  if s.status = 'live' then raise exception 'Алдымен сабақты аяқтаңыз'; end if;
  update cf_slots set session_id = null where session_id = p_session;
  delete from cf_sessions where id = p_session;
end $$;
revoke all on function cf_delete_session(uuid) from public, anon;
grant execute on function cf_delete_session(uuid) to authenticated;
