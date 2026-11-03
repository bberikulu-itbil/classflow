-- Migration 040: share the board by link, no account needed.
-- A live session gets a random board_token. Anyone with the link sees a read-only board
-- (slide, leaderboard, task clock) through cf_board_public; answers/notes never leave the server.
-- The link stops working when the session ends. The teacher can issue a new one (p_reset).

alter table public.cf_sessions add column if not exists board_token text;
create unique index if not exists cf_sessions_board_token_key on public.cf_sessions (board_token) where board_token is not null;

create or replace function public.cf_board_link(p_session uuid, p_reset boolean default false)
returns text language plpgsql security definer set search_path to 'public' as $$
declare t text;
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  select board_token into t from cf_sessions where id = p_session;
  if t is null or p_reset then
    t := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    update cf_sessions set board_token = t where id = p_session;
  end if;
  return t;
end $$;

create or replace function public.cf_board_public(p_token text)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare s cf_sessions; sl jsonb; t cf_tasks; lb jsonb; subs int := 0; parts int := 0;
begin
  if p_token is null or length(p_token) < 8 then return null; end if;
  select * into s from cf_sessions where board_token = p_token;
  if s.id is null then return null; end if;
  if s.status = 'ended' then return jsonb_build_object('ended', true, 'title', s.title); end if;

  select slides -> s.current_slide into sl from cf_session_private where session_id = s.id;
  if sl is not null then
    sl := sl - 'answer' - 'notes' - 'explanation' - 'accept' - 'tests';
    if jsonb_typeof(sl->'ru') = 'object' then
      sl := jsonb_set(sl, '{ru}', (sl->'ru') - 'answer' - 'notes' - 'explanation' - 'accept' - 'tests');
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
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('full_name', x.full_name, 'group_no', x.group_no, 'points', x.pts) order by x.pts desc, x.full_name), '[]'::jsonb)
    into lb
    from (select p.full_name, p.group_no,
                 coalesce((select sum(c.points) from cf_scores c where c.session_id = s.id and c.student_id = p.student_id), 0)::int pts
            from cf_participants p where p.session_id = s.id) x;

  select count(*) into parts from cf_participants where session_id = s.id;
  if s.active_task_id is not null then
    select * into t from cf_tasks where id = s.active_task_id;
    select count(*) into subs from cf_submissions where task_id = s.active_task_id;
  end if;

  return jsonb_build_object(
    'ended', false, 'title', s.title, 'index', s.current_slide, 'slide_count', s.slide_count,
    'slide', sl, 'leaderboard', lb, 'subs', subs, 'parts', parts,
    'task', case when t.id is null then null else jsonb_build_object(
      'id', t.id, 'status', t.status, 'points', t.points, 'time_limit', t.time_limit,
      'opened_at', t.opened_at, 'closed_at', t.closed_at, 'speed', t.speed, 'kind', t.kind) end);
end $$;

revoke all on function public.cf_board_link(uuid, boolean) from public, anon;
grant execute on function public.cf_board_link(uuid, boolean) to authenticated;
revoke all on function public.cf_board_public(text) from public;
grant execute on function public.cf_board_public(text) to anon, authenticated;
