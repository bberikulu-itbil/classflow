-- Migration 038: practice levels (L1-L3) with variants (A/B) and pair mode.
-- Additive and idempotent: old tasks (level IS NULL) behave exactly as before.
--
-- A slide that carries `levels: [{lv, points, variants: [{v:'A', prompt, accept, explanation}]}]` opens as ONE batch of
-- cf_tasks rows (one per level x variant, all with the same opened_at). A student works level by level:
--   * Level N+1 is accepted by cf_submit only after the level N task(s) the student owes are correct
--     (auto-checked via `accept`, or graded > 0 by the teacher through cf_grade).
--   * A student on their own owes one variant per level (A or B, stable per student id); the host of a pair owes both.
--   * A pair = host (logged in) + partner (sits next to them). The host's screen shows both variants; every answer the
--     host sends is copied to the partner (own submission row + own points), so both are graded the same and the
--     teacher can still adjust each row with cf_grade.

alter table public.cf_tasks
  add column if not exists level int check (level is null or level between 1 and 3),
  add column if not exists variant text check (variant is null or variant in ('A','B'));

create table if not exists public.cf_pairs (
  session_id uuid not null references public.cf_sessions(id) on delete cascade,
  host_id uuid not null references public.profiles(id),
  partner_id uuid not null references public.profiles(id),
  host_name text, partner_name text,
  created_at timestamptz not null default now(),
  primary key (session_id, host_id),
  unique (session_id, partner_id),
  check (host_id <> partner_id)
);
alter table public.cf_pairs enable row level security;
drop policy if exists cf_pairs_read on public.cf_pairs;
create policy cf_pairs_read on public.cf_pairs for select to authenticated
  using (cf_teaches(session_id) or host_id = auth.uid() or partner_id = auth.uid());
do $$ begin
  alter publication supabase_realtime add table public.cf_pairs;
exception when duplicate_object then null; end $$;

-- Teacher: put p_partner next to p_host (both from the class). p_partner = null removes the host's pair.
create or replace function public.cf_pair_set(p_session uuid, p_host uuid, p_partner uuid default null)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare s cf_sessions; h profiles; q profiles;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  delete from cf_pairs where session_id = p_session
    and (host_id in (p_host, p_partner) or partner_id in (p_host, p_partner));
  if p_partner is null then return; end if;
  if p_host = p_partner then raise exception 'Оқушы өзімен жұп бола алмайды'; end if;
  select * into h from profiles where id = p_host and role = 'student' and school_id = s.school_id;
  select * into q from profiles where id = p_partner and role = 'student' and school_id = s.school_id;
  if h.id is null or q.id is null then raise exception 'Оқушы табылмады'; end if;
  if s.class_id is not null and (h.class_id is distinct from s.class_id or q.class_id is distinct from s.class_id) then
    raise exception 'Оқушы басқа сыныптан'; end if;
  -- the partner may have no device: give them a participant row so points and attendance work
  insert into cf_participants(session_id, student_id, full_name, class_name, group_no, att, presence)
    select p_session, q.id, q.full_name, (select name from classes where id = q.class_id),
           (select group_no from cf_participants where session_id = p_session and student_id = p_host), 'present', 'away'
    on conflict (session_id, student_id) do nothing;
  insert into cf_pairs(session_id, host_id, partner_id, host_name, partner_name)
    values (p_session, h.id, q.id, h.full_name, q.full_name);
end $function$;
revoke all on function public.cf_pair_set(uuid, uuid, uuid) from public, anon;
grant execute on function public.cf_pair_set(uuid, uuid, uuid) to authenticated;

-- Which variant of a level a lone student owes: A or B by their id; A when the level has no B.
create or replace function public.cf_my_variant(p_session uuid, p_slide int, p_level int, p_opened timestamptz, p_uid uuid)
returns text language sql stable security definer set search_path to 'public' as $function$
  select case when get_byte(decode(replace(p_uid::text, '-', ''), 'hex'), 0) % 2 = 1
              and exists (select 1 from cf_tasks x where x.session_id = p_session and x.slide_index = p_slide
                          and x.level = p_level and x.opened_at = p_opened and x.variant = 'B')
         then 'B' else 'A' end
$function$;
revoke all on function public.cf_my_variant(uuid, int, int, timestamptz, uuid) from public, anon;
grant execute on function public.cf_my_variant(uuid, int, int, timestamptz, uuid) to authenticated;

create or replace function public.cf_open_task(p_session uuid, p_index integer default null)
returns cf_tasks language plpgsql security definer set search_path to 'public' as $function$
declare s cf_sessions; sl jsonb; t cf_tasks; first_t cf_tasks; typ text; k text; ans jsonb; idx int; lv jsonb; v jsonb; n int := 0;
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

  if jsonb_typeof(sl->'levels') = 'array' and jsonb_array_length(sl->'levels') > 0 then
    for lv in select x from jsonb_array_elements(sl->'levels') x loop
      n := n + 1;
      for v in select x from jsonb_array_elements(coalesce(lv->'variants', '[]'::jsonb)) x loop
        k := case when jsonb_array_length(coalesce(v->'accept', '[]'::jsonb)) > 0 then 'short' else 'text' end;
        insert into cf_tasks(session_id, slide_index, kind, prompt, points, level, variant)
          values (p_session, idx, k, coalesce(v->>'prompt', sl->>'title'), coalesce((lv->>'points')::int, 1),
                  least(3, coalesce((lv->>'lv')::int, n)), case when v->>'v' = 'B' then 'B' else 'A' end)
          returning * into t;
        if first_t.id is null then first_t := t; end if;
        if k = 'short' or (v->'explanation') is not null then
          insert into cf_task_keys(task_id, answer, explanation)
            values (t.id, case when k = 'short' then jsonb_build_object('accept', v->'accept') end, v->>'explanation');
        end if;
      end loop;
    end loop;
    if first_t.id is null then raise exception 'Деңгейлерде тапсырма жоқ'; end if;
    update cf_sessions set active_task_id = first_t.id where id = p_session;
    return first_t;
  end if;

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

-- Closing one task of a level batch closes the whole batch.
create or replace function public.cf_close_task(p_task uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare t cf_tasks; k cf_task_keys;
begin
  select * into t from cf_tasks where id = p_task;
  if t.id is null or not cf_teaches(t.session_id) then raise exception 'Құқығыңыз жоқ'; end if;
  if t.status = 'closed' then return; end if;
  if t.level is not null then
    update cf_tasks x set status = 'closed', closed_at = now(),
      reveal = (select jsonb_strip_nulls(jsonb_build_object('answer', y.answer, 'explanation', y.explanation))
                from cf_task_keys y where y.task_id = x.id)
      where x.session_id = t.session_id and x.slide_index = t.slide_index and x.opened_at = t.opened_at and x.status = 'open';
    return;
  end if;
  select * into k from cf_task_keys where task_id = p_task;
  update cf_tasks set status = 'closed', closed_at = now(),
    reveal = jsonb_strip_nulls(jsonb_build_object('answer', k.answer, 'explanation', k.explanation))
    where id = p_task;
end $function$;

create or replace function public.cf_submit(p_task uuid, p_answer text, p_meta jsonb default null)
returns cf_submissions language plpgsql security definer set search_path to 'public' as $function$
declare t cf_tasks; k cf_task_keys; sub cf_submissions; mine cf_submissions; pr cf_pairs;
  ok boolean := null; pts int := 0; a text := left(coalesce(p_answer, ''), 20000); el numeric; u uuid; uids uuid[];
begin
  select * into t from cf_tasks where id = p_task;
  if t.id is null or not cf_in(t.session_id) then raise exception 'Тапсырма табылмады'; end if;
  if t.status <> 'open' then raise exception 'Тапсырма жабылған'; end if;
  el := extract(epoch from now() - t.opened_at);
  if t.time_limit is not null and el > t.time_limit + 3 then raise exception 'Уақыт бітті'; end if;
  if length(trim(a)) = 0 then raise exception 'Жауап бос'; end if;
  if t.level is null and t.kind in ('quiz','short') and exists (select 1 from cf_submissions where task_id = p_task and student_id = auth.uid()) then
    raise exception 'Жауап жіберілген'; end if;

  -- pair: only the host's screen sends; the partner gets a copy
  if exists (select 1 from cf_pairs where session_id = t.session_id and partner_id = auth.uid()) then
    raise exception 'Жұбыңның экранында орында'; end if;
  select * into pr from cf_pairs where session_id = t.session_id and host_id = auth.uid();
  uids := case when pr.host_id is null then array[auth.uid()] else array[auth.uid(), pr.partner_id] end;

  if t.level is not null then
    if pr.host_id is null and t.variant is distinct from cf_my_variant(t.session_id, t.slide_index, t.level, t.opened_at, auth.uid()) then
      raise exception 'Бұл нұсқа саған берілмеген'; end if;
    if exists (select 1 from cf_submissions where task_id = p_task and student_id = auth.uid() and is_correct is true) then
      raise exception 'Бұл тапсырма орындалған'; end if;
    if t.level > 1 and exists (
        select 1 from cf_tasks p
        where p.session_id = t.session_id and p.slide_index = t.slide_index and p.opened_at = t.opened_at and p.level = t.level - 1
          and (pr.host_id is not null or p.variant = cf_my_variant(t.session_id, t.slide_index, p.level, t.opened_at, auth.uid()))
          and not exists (select 1 from cf_submissions x where x.task_id = p.id and x.student_id = auth.uid() and x.is_correct is true)) then
      raise exception 'Алдымен L% деңгейін дұрыс орында', t.level - 1;
    end if;
  end if;

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

  foreach u in array uids loop
    insert into cf_submissions(task_id, session_id, student_id, answer, meta, is_correct, points)
      values (p_task, t.session_id, u, a,
              case when u = auth.uid() then p_meta else coalesce(p_meta, '{}'::jsonb) || jsonb_build_object('pairOf', auth.uid()) end,
              ok, pts)
      on conflict (task_id, student_id) do update
        set answer = excluded.answer, meta = excluded.meta, is_correct = excluded.is_correct,
            points = excluded.points, feedback = null, updated_at = now()
      returning * into mine;
    delete from cf_scores where submission_id = mine.id;
    if pts > 0 then
      insert into cf_scores(session_id, student_id, points, reason, task_id, submission_id, created_by)
        values (t.session_id, u, pts, 'Тапсырма', p_task, mine.id, auth.uid());
    end if;
    if u = auth.uid() then sub := mine; end if;
  end loop;
  return sub;
end $function$;

-- Students must not read the answers hidden inside levels either.
create or replace function public.cf_slide(p_session uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare s cf_sessions; sl jsonb; chk jsonb;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or not (cf_teaches(p_session) or cf_in(p_session)) then raise exception 'Құқығыңыз жоқ'; end if;
  select slides -> s.current_slide into sl from cf_session_private where session_id = p_session;
  if sl is null then return null; end if;
  sl := sl - 'answer' - 'notes' - 'explanation' - 'accept';
  if jsonb_typeof(sl->'ru') = 'object' then
    sl := jsonb_set(sl, '{ru}', (sl->'ru') - 'answer' - 'notes' - 'explanation' - 'accept');
  end if;
  if jsonb_typeof(sl->'levels') = 'array' then
    sl := jsonb_set(sl, '{levels}', coalesce((
      select jsonb_agg(l || jsonb_build_object('variants', coalesce((
        select jsonb_agg(v - 'accept' - 'explanation') from jsonb_array_elements(coalesce(l->'variants', '[]'::jsonb)) v), '[]'::jsonb)))
      from jsonb_array_elements(sl->'levels') l), '[]'::jsonb));
  end if;
  if jsonb_typeof(sl->'ru') = 'object' and jsonb_typeof(sl->'ru'->'levels') = 'array' then
    sl := jsonb_set(sl, '{ru,levels}', coalesce((
      select jsonb_agg(l || jsonb_build_object('variants', coalesce((
        select jsonb_agg(v - 'accept' - 'explanation') from jsonb_array_elements(coalesce(l->'variants', '[]'::jsonb)) v), '[]'::jsonb)))
      from jsonb_array_elements(sl->'ru'->'levels') l), '[]'::jsonb));
  end if;
  if jsonb_typeof(sl->'tests') = 'array' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'input', coalesce(t->>'input',''),
      'label', coalesce(t->>'label',''),
      'hidden', coalesce((t->>'hidden')::boolean, false),
      'out', case when coalesce((t->>'hidden')::boolean, false) then null else t->>'out' end,
      'h', encode(sha256(convert_to(cf_norm(t->>'out'), 'UTF8')), 'hex'))), '[]'::jsonb)
    into chk from jsonb_array_elements(sl->'tests') t;
    sl := (sl - 'tests') || jsonb_build_object('checks', chk);
  end if;
  return jsonb_build_object('index', s.current_slide, 'slide', sl);
end $function$;
