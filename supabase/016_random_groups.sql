-- Teacher splits the people in a live session into p_count groups at random (0 = remove the groups).
-- Group points (cf_group_scores) then count the members' own points as well, as before.
create or replace function public.cf_random_groups(p_session uuid, p_count integer, p_only_online boolean default false)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  if p_count is null or p_count < 0 or p_count > 10 then raise exception 'Топ саны 0–10 аралығында болсын'; end if;
  update cf_participants set group_no = null where session_id = p_session;
  if p_count = 0 then return; end if;
  with r as (
    select student_id, row_number() over (order by random()) rn
    from cf_participants where session_id = p_session and (not p_only_online or presence = 'online'))
  update cf_participants p set group_no = ((r.rn - 1) % p_count)::int + 1
  from r where p.session_id = p_session and p.student_id = r.student_id;
  update cf_sessions set groups_count = p_count where id = p_session;
end $function$;
revoke all on function public.cf_random_groups(uuid, integer, boolean) from public, anon;
grant execute on function public.cf_random_groups(uuid, integer, boolean) to authenticated;
