-- 087: proctoring for exams taken from the course page (БЖБ). The exam page runs in full screen; leaving it
-- (another tab, another window, leaving full screen) and pasting are logged here, and the teacher sees them next to the result.
create table if not exists public.cf_exam_focus (
  id bigserial primary key,
  exam_id uuid not null references public.cf_exams(id) on delete cascade,
  school_id uuid not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('start', 'hidden', 'blur', 'fullscreen_exit', 'paste')),
  ms int,            -- how long the student was away (sent when they come back)
  at timestamptz not null default now()
);
create index if not exists cf_exam_focus_exam on public.cf_exam_focus (exam_id, student_id);
alter table public.cf_exam_focus enable row level security;
drop policy if exists cf_exam_focus_read on public.cf_exam_focus;
create policy cf_exam_focus_read on public.cf_exam_focus for select using (is_staff() and school_id = my_school());

-- The student's open exam of this lesson (the same lookup as cf_exam_submit); nothing is logged when none is open.
create or replace function public.cf_exam_focus(p_lesson uuid, p_kind text, p_ms int default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare e cf_exams;
begin
  if p_kind not in ('start', 'hidden', 'blur', 'fullscreen_exit', 'paste') then raise exception 'Белгісіз оқиға'; end if;
  select * into e from cf_exams x where x.lesson_id = p_lesson and x.opens_at <= now() and (x.closes_at is null or x.closes_at > now() - interval '30 seconds')
    and (x.class_id is null or x.class_id = (select p.class_id from profiles p where p.id = auth.uid()))
  order by x.opens_at desc limit 1;
  if e.id is null or auth.uid() is null then return; end if;
  if exists (select 1 from cf_exam_results r where r.exam_id = e.id and r.student_id = auth.uid()) then return; end if;
  if (select count(*) from cf_exam_focus f where f.exam_id = e.id and f.student_id = auth.uid()) >= 300 then return; end if; -- a runaway client stops here
  insert into cf_exam_focus(exam_id, school_id, student_id, kind, ms)
    values (e.id, e.school_id, auth.uid(), p_kind, case when p_ms between 0 and 86400000 then p_ms end);
end $$;
revoke all on function public.cf_exam_focus(uuid, text, int) from public, anon;
grant execute on function public.cf_exam_focus(uuid, text, int) to authenticated;
