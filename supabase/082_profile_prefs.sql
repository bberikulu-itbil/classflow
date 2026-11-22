-- Profile page: settings kept on the account (every device the same), staff edit their own name and subjects,
-- and whether Telegram is linked.
alter table profiles add column if not exists prefs jsonb not null default '{}'::jsonb;
alter table profiles drop constraint if exists profiles_prefs_size;
alter table profiles add constraint profiles_prefs_size check (octet_length(prefs::text) < 20000);

create or replace function cf_save_my_prefs(p_prefs jsonb) returns void
language sql security definer set search_path = public as $$
  update profiles set prefs = coalesce(p_prefs, '{}'::jsonb) where id = (select auth.uid()) and jsonb_typeof(p_prefs) = 'object';
$$;

create or replace function cf_save_my_profile(p_full_name text, p_subject text) returns void
language plpgsql security definer set search_path = public as $$
declare n text := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
begin
  if (select role from profiles where id = (select auth.uid())) = 'student' then raise exception 'Аты-жөніңді сынып жетекшің өзгертеді'; end if;
  if length(n) < 3 or length(n) > 120 then raise exception 'Аты-жөні 3–120 таңба болуы керек'; end if;
  update profiles set full_name = n, subject = nullif(left(trim(coalesce(p_subject, '')), 200), '') where id = (select auth.uid());
end $$;

create or replace function cf_my_telegram() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from telegram_links where user_id = (select auth.uid()) and tg_id is not null);
$$;

revoke all on function cf_save_my_prefs(jsonb), cf_save_my_profile(text, text), cf_my_telegram() from public, anon;
grant execute on function cf_save_my_prefs(jsonb), cf_save_my_profile(text, text), cf_my_telegram() to authenticated;
