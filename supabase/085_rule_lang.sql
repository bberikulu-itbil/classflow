-- 085: a session rule that lets students switch the lesson language (on by default).
alter table public.cf_sessions add column if not exists allow_lang boolean not null default true;
create or replace function public.cf_set_rule(p_session uuid, p_rule text, p_on boolean)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  if p_rule = 'ask' then update cf_sessions set allow_ask = p_on where id = p_session;
  elsif p_rule = 'hand' then
    update cf_sessions set allow_hand = p_on where id = p_session;
    if not p_on then update cf_participants set hand = false where session_id = p_session and hand; end if;
  elsif p_rule = 'auto' then update cf_sessions set auto_task = p_on where id = p_session;
  elsif p_rule = 'ahead' then
    update cf_sessions set allow_ahead = p_on where id = p_session;
    if not p_on then update cf_participants set ahead_req = null where session_id = p_session and ahead_req is not null; end if;
  elsif p_rule = 'lang' then update cf_sessions set allow_lang = p_on where id = p_session;
  else raise exception 'Белгісіз ереже'; end if;
end $function$;
