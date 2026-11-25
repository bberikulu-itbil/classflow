-- 088: scratch paper (шимай қағаз) in exams. A student draws on small sheets; nothing can be erased, only a new sheet
-- started; every sheet is kept with the exam and the teacher sees it next to the answers. Strokes are stored as point lists.
create table if not exists public.cf_exam_scratch (
  exam_id uuid not null references public.cf_exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null,
  sheet smallint not null check (sheet between 0 and 9),
  strokes jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  primary key (exam_id, student_id, sheet)
);
alter table public.cf_exam_scratch enable row level security;
drop policy if exists cf_exam_scratch_read on public.cf_exam_scratch;
create policy cf_exam_scratch_read on public.cf_exam_scratch for select using (is_staff() and school_id = my_school());

-- the student's open, not yet sent exam of this lesson (as in cf_exam_submit)
create or replace function public.cf_exam_mine(p_lesson uuid) returns public.cf_exams
language sql stable security definer set search_path to 'public' as $$
  select x.* from cf_exams x where x.lesson_id = p_lesson and x.opens_at <= now() and (x.closes_at is null or x.closes_at > now() - interval '30 seconds')
    and (x.class_id is null or x.class_id = (select p.class_id from profiles p where p.id = auth.uid()))
    and not exists (select 1 from cf_exam_results r where r.exam_id = x.id and r.student_id = auth.uid())
  order by x.opens_at desc limit 1 $$;
revoke all on function public.cf_exam_mine(uuid) from public, anon;

create or replace function public.cf_exam_scratch_save(p_lesson uuid, p_sheet int, p_strokes jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
declare e cf_exams := cf_exam_mine(p_lesson); old jsonb;
begin
  if e.id is null or auth.uid() is null then raise exception 'Емтихан жабық'; end if;
  if p_sheet not between 0 and 9 then raise exception 'Парақ көп'; end if;
  if jsonb_typeof(p_strokes) <> 'array' or pg_column_size(p_strokes) > 200000 then raise exception 'Парақ толды — жаңасын аш'; end if;
  -- nothing is erased: a sheet only grows
  select strokes into old from cf_exam_scratch where exam_id = e.id and student_id = auth.uid() and sheet = p_sheet;
  if old is not null and jsonb_array_length(p_strokes) < jsonb_array_length(old) then raise exception 'Шимай өшірілмейді'; end if;
  insert into cf_exam_scratch(exam_id, student_id, school_id, sheet, strokes) values (e.id, auth.uid(), e.school_id, p_sheet, p_strokes)
  on conflict (exam_id, student_id, sheet) do update set strokes = excluded.strokes, updated_at = now();
end $$;

create or replace function public.cf_exam_scratch_get(p_lesson uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(s.strokes order by s.sheet), '[]') from cf_exam_scratch s
  where s.exam_id = (cf_exam_mine(p_lesson)).id and s.student_id = auth.uid() $$;

revoke all on function public.cf_exam_scratch_save(uuid, int, jsonb), public.cf_exam_scratch_get(uuid) from public, anon;
grant execute on function public.cf_exam_scratch_save(uuid, int, jsonb), public.cf_exam_scratch_get(uuid) to authenticated;
