-- Student duties and session modes.
-- 1. A teacher can give a student a duty: 'author' (makes own courses, modules and lessons; sees only their own) or 'room'
--    (helps the person responsible for one room: the same rights as that teacher in that room).
-- 2. A lesson starts with a class, as a demo (deleted when it ends, never in the analytics) or for guests (any student joins, kept).
--    Old sessions without a class can get their class later.

create table if not exists cf_duties (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  student_id uuid not null references profiles(id) on delete cascade,
  duty text not null check (duty in ('author', 'room')),
  room_id uuid references cf_rooms(id) on delete cascade,
  granted_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((duty = 'room') = (room_id is not null))
);
create unique index if not exists cf_duties_uq on cf_duties(student_id, duty, coalesce(room_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table cf_duties enable row level security;
drop policy if exists cf_duties_read on cf_duties;
create policy cf_duties_read on cf_duties for select using (student_id = (select auth.uid()) or (is_staff() and school_id = my_school()));
-- no write policies: changes go through cf_set_duty

create or replace function is_author() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from cf_duties where student_id = auth.uid() and duty = 'author') $$;
create or replace function cf_room_helper(r uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from cf_duties where student_id = auth.uid() and duty = 'room' and room_id = r) $$;

create or replace function cf_set_duty(p_student uuid, p_duty text, p_room uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare s profiles;
begin
  if not is_staff() then raise exception 'Тек мұғалім тағайындай алады'; end if;
  select * into s from profiles where id = p_student;
  if s.id is null or s.school_id <> my_school() or s.role <> 'student' then raise exception 'Оқушы табылмады'; end if;
  if p_duty not in ('author', 'room') then raise exception 'Белгісіз міндет'; end if;
  if p_duty = 'room' and not exists (select 1 from cf_rooms where id = p_room and school_id = my_school()) then raise exception 'Кабинет табылмады'; end if;
  if p_on then
    insert into cf_duties(school_id, student_id, duty, room_id, granted_by)
      values (s.school_id, p_student, p_duty, case when p_duty = 'room' then p_room end, auth.uid())
      on conflict do nothing;
  else
    delete from cf_duties where student_id = p_student and duty = p_duty and (p_duty <> 'room' or room_id = p_room);
  end if;
end $$;

-- room helper: same as the responsible teacher in that room (rooms, items, bookings, loans all go through cf_room_manages)
create or replace function cf_room_manages(r uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from cf_rooms x where x.id = r and x.school_id = my_school()
    and ((is_staff() and (x.responsible_id = (select auth.uid()) or is_deputy())) or cf_room_helper(r))) $$;
drop policy if exists rm_helper_upd on cf_rooms;
-- a helper edits the room but cannot hand it to someone else (the subquery sees the row before the update)
create policy rm_helper_upd on cf_rooms for update using (cf_room_helper(id))
  with check (school_id = my_school() and responsible_id is not distinct from (select x.responsible_id from cf_rooms x where x.id = cf_rooms.id));
drop policy if exists rmw_helper_read on cf_room_wishlist;
drop policy if exists rmw_helper_ins on cf_room_wishlist;
drop policy if exists rmw_helper_upd on cf_room_wishlist;
drop policy if exists rmw_helper_del on cf_room_wishlist;
create policy rmw_helper_read on cf_room_wishlist for select using (school_id = my_school() and room_id is not null and cf_room_helper(room_id));
create policy rmw_helper_ins on cf_room_wishlist for insert with check (school_id = my_school() and room_id is not null and cf_room_helper(room_id) and created_by = (select auth.uid()));
create policy rmw_helper_upd on cf_room_wishlist for update using (school_id = my_school() and room_id is not null and cf_room_helper(room_id)) with check (school_id = my_school());
create policy rmw_helper_del on cf_room_wishlist for delete using (school_id = my_school() and room_id is not null and cf_room_helper(room_id));

-- course author: only their own courses, modules and lessons (never other teachers' lessons with answer keys)
drop policy if exists ccourse_author on cf_curr_courses;
create policy ccourse_author on cf_curr_courses for all using (owner_id = (select auth.uid()) and is_author())
  with check (owner_id = (select auth.uid()) and is_author() and school_id = my_school());
drop policy if exists cmod_author on cf_curr_modules;
create policy cmod_author on cf_curr_modules for all
  using (is_author() and exists (select 1 from cf_curr_courses c where c.id = cf_curr_modules.course_id and c.owner_id = (select auth.uid())))
  with check (is_author() and exists (select 1 from cf_curr_courses c where c.id = cf_curr_modules.course_id and c.owner_id = (select auth.uid())));
drop policy if exists cles_author on cf_curr_lessons;
create policy cles_author on cf_curr_lessons for all
  using (is_author() and exists (select 1 from cf_curr_modules m join cf_curr_courses c on c.id = m.course_id where m.id = cf_curr_lessons.module_id and c.owner_id = (select auth.uid())))
  with check (is_author() and exists (select 1 from cf_curr_modules m join cf_curr_courses c on c.id = m.course_id where m.id = cf_curr_lessons.module_id and c.owner_id = (select auth.uid()))
    and exists (select 1 from cf_lessons l where l.id = cf_curr_lessons.lesson_id and l.owner_id = (select auth.uid())));
drop policy if exists cf_lessons_author_read on cf_lessons;
create policy cf_lessons_author_read on cf_lessons for select using (owner_id = (select auth.uid()) and is_author());
drop policy if exists cf_lessons_author_ins on cf_lessons;
create policy cf_lessons_author_ins on cf_lessons for insert with check (school_id = my_school() and owner_id = (select auth.uid()) and is_author());

-- session modes
alter table cf_sessions add column if not exists mode text not null default 'class' check (mode in ('class', 'demo', 'guest'));

/** Deletes a demo session with everything in it; a journal slot linked to it loses the link. */
create or replace function cf_drop_demo(p_session uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update cf_slots set session_id = null where session_id = p_session;
  delete from cf_sessions where id = p_session and mode = 'demo';
end $$;
revoke all on function cf_drop_demo(uuid) from public, anon, authenticated;

drop function if exists cf_start_session(uuid, uuid, integer);
create or replace function cf_start_session(p_lesson uuid, p_class uuid default null, p_groups integer default 3, p_mode text default 'class')
returns cf_sessions language plpgsql security definer set search_path = public as $$
declare u profiles := me(); l cf_lessons; s cf_sessions; code text; i int; cls uuid; d uuid;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if u.id is null or u.role = 'student' then raise exception 'Сабақты тек мұғалім бастай алады'; end if;
  if p_mode not in ('class', 'demo', 'guest') then raise exception 'Белгісіз сабақ түрі'; end if;
  select * into l from cf_lessons where id = p_lesson and school_id = u.school_id;
  if l.id is null then raise exception 'Сабақ жоспары табылмады'; end if;
  cls := case when p_mode = 'class' then coalesce(p_class, l.class_id) end;
  if p_mode = 'class' and cls is null then raise exception 'Сыныпты таңдаңыз (немесе «Демо сынып» / «Қонақ»)'; end if;
  if cls is not null and not exists (select 1 from classes where id = cls) then raise exception 'Сынып табылмады'; end if;
  for d in select id from cf_sessions where teacher_id = u.id and status = 'live' and mode = 'demo' loop perform cf_drop_demo(d); end loop;
  update cf_sessions set status = 'ended', ended_at = now() where teacher_id = u.id and status = 'live';
  loop
    code := '';
    for i in 1..6 loop code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from cf_sessions where join_code = code);
  end loop;
  insert into cf_sessions(school_id, lesson_id, teacher_id, class_id, title, join_code, slide_count, terms, groups_count, mode)
    values (u.school_id, l.id, u.id, cls, l.title, code, jsonb_array_length(l.slides), l.terms, greatest(1, least(coalesce(p_groups, 3), 8)), p_mode)
    returning * into s;
  insert into cf_session_private(session_id, slides, plan) values (s.id, l.slides, l.plan);
  return s;
end $$;
revoke all on function cf_start_session(uuid, uuid, integer, text) from public, anon;
grant execute on function cf_start_session(uuid, uuid, integer, text) to authenticated;

create or replace function cf_end_session(p_session uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  if exists (select 1 from cf_sessions where id = p_session and mode = 'demo') then perform cf_drop_demo(p_session); return; end if;
  update cf_sessions set status = 'ended', ended_at = now(), locked = false where id = p_session;
end $$;

/** Gives a past session its class (or marks it as a guest lesson). */
create or replace function cf_set_session_class(p_session uuid, p_class uuid, p_mode text default 'class') returns void
language plpgsql security definer set search_path = public as $$
declare s cf_sessions;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or s.teacher_id <> auth.uid() then raise exception 'Құқығыңыз жоқ'; end if;
  if p_mode not in ('class', 'guest') then raise exception 'Белгісіз сабақ түрі'; end if;
  if p_mode = 'class' and not exists (select 1 from classes where id = p_class) then raise exception 'Сынып табылмады'; end if;
  update cf_sessions set class_id = case when p_mode = 'class' then p_class end, mode = p_mode where id = p_session;
  update cf_participants p set class_name = c.name from classes c
    where p.session_id = p_session and p_mode = 'class' and c.id = p_class and p.class_name is null;
end $$;

-- the analytics never show demo sessions and name the guest ones
create or replace function cf_module_results(p_module uuid)
returns table(session_id uuid, lesson_id uuid, class_id uuid, class_name text, started_at timestamptz,
              student_id uuid, full_name text, points int, max_points int, done int, tasks int)
language sql stable security definer set search_path = public as $$
  with les as (select cl.lesson_id from cf_curr_lessons cl where cl.module_id = p_module),
  mine as (select s.* from cf_sessions s where s.teacher_id = auth.uid() and s.status <> 'live' and s.mode <> 'demo'),
  sl as (
    select m.id sid, m.lesson_id lid from mine m where m.lesson_id in (select lesson_id from les)
    union
    select t.session_id, t.lesson_id from cf_tasks t join mine m on m.id = t.session_id where t.lesson_id in (select lesson_id from les)
  ),
  tk as (select t.session_id sid, t.lesson_id lid, count(*)::int n, coalesce(sum(t.points), 0)::int mx from cf_tasks t group by 1, 2)
  select sl.sid, sl.lid, s.class_id, coalesce(c.name, case when s.mode = 'guest' then 'Қонақ' end), s.started_at, p.student_id, p.full_name,
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

create or replace function cf_module_task_stats(p_module uuid)
returns table(task_id uuid, session_id uuid, lesson_id uuid, class_id uuid, kind text, prompt text, options jsonb, points int,
              subs int, correct int, wrong_answer text, wrong_count int)
language sql stable security definer set search_path = public as $$
  select t.id, t.session_id, t.lesson_id, s.class_id, t.kind, t.prompt, t.options, t.points,
    (select count(*) from cf_submissions b where b.task_id = t.id)::int,
    (select count(*) from cf_submissions b where b.task_id = t.id and b.is_correct)::int,
    w.answer, w.n
  from cf_tasks t join cf_sessions s on s.id = t.session_id
  left join lateral (
    select b.answer, count(*)::int n from cf_submissions b
    where b.task_id = t.id and not coalesce(b.is_correct, false) and t.kind not in ('sheet', 'code') and coalesce(b.meta->>'sql', '') = ''
    group by b.answer order by n desc limit 1
  ) w on true
  where s.teacher_id = auth.uid() and s.status <> 'live' and s.mode <> 'demo'
    and t.lesson_id in (select cl.lesson_id from cf_curr_lessons cl where cl.module_id = p_module);
$$;

revoke all on function is_author() from public, anon;
revoke all on function cf_room_helper(uuid) from public, anon;
revoke all on function cf_set_duty(uuid, text, uuid, boolean) from public, anon;
revoke all on function cf_set_session_class(uuid, uuid, text) from public, anon;
grant execute on function is_author(), cf_room_helper(uuid), cf_set_duty(uuid, text, uuid, boolean), cf_set_session_class(uuid, uuid, text) to authenticated;
