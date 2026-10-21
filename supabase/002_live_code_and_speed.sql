-- ClassFlow: сабақ таймері + жылдамдық ұпайы + Live код кестесі.
-- Supabase → SQL Editor-ге толық көшіріп, Run бас. Қайта іске қосса да қауіпсіз (if not exists / create or replace).
alter table public.cf_tasks
  add column if not exists time_limit int check (time_limit is null or time_limit between 5 and 600),
  add column if not exists speed boolean not null default false;

create table if not exists public.cf_live_code (
  session_id uuid not null references public.cf_sessions(id) on delete cascade,
  student_id uuid not null,
  code text not null default '',
  meta jsonb,
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
alter table public.cf_live_code enable row level security;
drop policy if exists cf_live_code_read on public.cf_live_code;
create policy cf_live_code_read on public.cf_live_code for select to authenticated
  using (student_id = auth.uid() or cf_teaches(session_id));
do $$ begin
  alter publication supabase_realtime add table public.cf_live_code;
exception when duplicate_object then null; end $$;

create or replace function public.cf_push_code(p_session uuid, p_code text, p_meta jsonb default null)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not cf_in(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  insert into cf_live_code(session_id, student_id, code, meta, updated_at)
    values (p_session, auth.uid(), left(coalesce(p_code,''), 20000), p_meta, now())
  on conflict (session_id, student_id) do update
    set code = excluded.code, meta = coalesce(excluded.meta, cf_live_code.meta), updated_at = now();
end $$;
grant execute on function public.cf_push_code(uuid, text, jsonb) to authenticated;

create or replace function public.cf_open_task(p_session uuid, p_index integer default null)
returns cf_tasks language plpgsql security definer set search_path to 'public' as $function$
declare s cf_sessions; sl jsonb; t cf_tasks; typ text; k text; ans jsonb; idx int;
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  select * into s from cf_sessions where id = p_session for update;
  if s.status <> 'live' then raise exception 'Сабақ аяқталған'; end if;
  idx := coalesce(p_index, s.current_slide);
  select slides -> idx into sl from cf_session_private where session_id = p_session;
  if sl is null then raise exception 'Слайд табылмады'; end if;
  typ := sl->>'type';
  if typ not in ('quiz','task','code') then raise exception 'Бұл слайдта тапсырма жоқ'; end if;
  if s.active_task_id is not null then perform cf_close_task(s.active_task_id); end if;
  k := case typ when 'quiz' then 'quiz' when 'code' then 'code'
       else case when jsonb_array_length(coalesce(sl->'accept', '[]'::jsonb)) > 0 then 'short' else 'text' end end;
  insert into cf_tasks(session_id, slide_index, kind, prompt, options, points, time_limit, speed)
    values (p_session, idx, k, coalesce(sl->>'prompt', sl->>'title'), sl->'options', coalesce((sl->>'points')::int, 1),
            nullif((sl->>'time')::int, 0), coalesce((sl->>'speed')::boolean, false))
    returning * into t;
  ans := case k
    when 'quiz' then case when (sl->'answer') is not null then jsonb_build_object('index', (sl->>'answer')::int) end
    when 'short' then jsonb_build_object('accept', sl->'accept')
    else null end;
  if ans is not null or (sl->'explanation') is not null then
    insert into cf_task_keys(task_id, answer, explanation) values (t.id, ans, sl->>'explanation');
  end if;
  update cf_sessions set active_task_id = t.id where id = p_session;
  return t;
end $function$;

create or replace function public.cf_submit(p_task uuid, p_answer text, p_meta jsonb default null)
returns cf_submissions language plpgsql security definer set search_path to 'public' as $function$
declare t cf_tasks; k cf_task_keys; sub cf_submissions; ok boolean := null; pts int := 0; a text := left(coalesce(p_answer, ''), 20000); el numeric;
begin
  select * into t from cf_tasks where id = p_task;
  if t.id is null or not cf_in(t.session_id) then raise exception 'Тапсырма табылмады'; end if;
  if t.status <> 'open' then raise exception 'Тапсырма жабылған'; end if;
  el := extract(epoch from now() - t.opened_at);
  if t.time_limit is not null and el > t.time_limit + 3 then raise exception 'Уақыт бітті'; end if;
  if length(trim(a)) = 0 then raise exception 'Жауап бос'; end if;
  if t.kind in ('quiz','short') and exists (select 1 from cf_submissions where task_id = p_task and student_id = auth.uid()) then
    raise exception 'Жауап жіберілген'; end if;
  select * into k from cf_task_keys where task_id = p_task;
  if k.answer is not null then
    if (k.answer->>'index') is not null then
      ok := (trim(a) = k.answer->>'index');
    elsif jsonb_typeof(k.answer->'accept') = 'array' then
      ok := exists (select 1 from jsonb_array_elements_text(k.answer->'accept') x where lower(trim(x)) = lower(trim(a)));
    end if;
  end if;
  pts := case when ok then t.points else 0 end;
  if ok and t.speed then
    pts := round(t.points * (1 - 0.5 * least(1, el / greatest(coalesce(t.time_limit, 20), 1))));
  end if;
  insert into cf_submissions(task_id, session_id, student_id, answer, meta, is_correct, points)
    values (p_task, t.session_id, auth.uid(), a, p_meta, ok, pts)
    on conflict (task_id, student_id) do update
      set answer = excluded.answer, meta = excluded.meta, is_correct = excluded.is_correct,
          points = excluded.points, feedback = null, updated_at = now()
    returning * into sub;
  delete from cf_scores where submission_id = sub.id;
  if pts > 0 then
    insert into cf_scores(session_id, student_id, points, reason, task_id, submission_id, created_by)
      values (t.session_id, auth.uid(), pts, 'Тапсырма', p_task, sub.id, auth.uid());
  end if;
  return sub;
end $function$;
grant execute on function public.cf_open_task(uuid, integer) to authenticated;
grant execute on function public.cf_submit(uuid, text, jsonb) to authenticated;
