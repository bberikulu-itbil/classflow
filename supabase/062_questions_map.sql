-- 062: "Түсінбедім" questions (a student writes a question about a slide, the teacher sees it with the slide number)
-- and the lesson map (kind of every slide of the lesson, without its content, so the student sees what is coming).

create table if not exists public.cf_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cf_sessions(id) on delete cascade,
  student_id uuid not null,
  slide_index int not null check (slide_index >= 0),
  body text not null check (char_length(body) between 1 and 500),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists cf_questions_session_idx on public.cf_questions(session_id, created_at);

alter table public.cf_questions enable row level security;
drop policy if exists cf_questions_read on public.cf_questions;
create policy cf_questions_read on public.cf_questions for select to authenticated
  using (student_id = auth.uid() or cf_teaches(session_id));
-- no insert/update policy: writes go through cf_ask / cf_resolve_question only

do $$ begin
  alter publication supabase_realtime add table public.cf_questions;
exception when duplicate_object then null; end $$;

create or replace function public.cf_ask(p_session uuid, p_slide int, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare s cf_sessions; b text := btrim(coalesce(p_body, ''));
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or s.status = 'ended' or not cf_in(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  if char_length(b) < 1 or char_length(b) > 500 then raise exception 'Сұрақ 1-500 таңба болуы керек'; end if;
  if p_slide < 0 or p_slide > s.current_slide then raise exception 'Бұл слайд әлі ашылмаған'; end if;
  if (select count(*) from cf_questions where session_id = p_session and student_id = auth.uid()) >= 30 then
    raise exception 'Сұрақ саны шектен асты';
  end if;
  insert into cf_questions(session_id, student_id, slide_index, body) values (p_session, auth.uid(), p_slide, b);
end $$;

create or replace function public.cf_resolve_question(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare q cf_questions;
begin
  select * into q from cf_questions where id = p_id;
  if q.id is null or not cf_teaches(q.session_id) then raise exception 'Құқығыңыз жоқ'; end if;
  update cf_questions set resolved = p_on where id = p_id;
end $$;

create or replace function public.cf_slide_kinds(p_session uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not (cf_teaches(p_session) or cf_in(p_session)) then raise exception 'Құқығыңыз жоқ'; end if;
  return coalesce((
    select jsonb_agg(case
      when t.s->>'kind' in ('example', 'exampletask') then 'example'
      when t.s->>'kind' = 'practice' then 'practice'
      when t.s->>'kind' = 'check' then 'check'
      when t.s->>'kind' in ('explain', 'video') then 'info'
      when t.s->>'type' = 'quiz' then 'check'
      when t.s->>'type' in ('task', 'code') then 'practice'
      when t.s->>'type' = 'solution' then 'example'
      else 'info' end order by t.ord)
    from cf_session_private p, jsonb_array_elements(p.slides) with ordinality as t(s, ord)
    where p.session_id = p_session), '[]'::jsonb);
end $$;

revoke all on function public.cf_ask(uuid, int, text), public.cf_resolve_question(uuid, boolean), public.cf_slide_kinds(uuid) from public, anon;
grant execute on function public.cf_ask(uuid, int, text), public.cf_resolve_question(uuid, boolean), public.cf_slide_kinds(uuid) to authenticated;
