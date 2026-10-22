-- APPLIED 2026-10-22 (migration cf_hardening_search_path_anon). Advisor findings: mutable search_path, anon could call cf_push_code.
alter function public.cf_touch() set search_path = public;
alter function public.cf_norm(text) set search_path = '';
revoke execute on function public.cf_push_code(uuid, text, jsonb) from public, anon;
grant execute on function public.cf_push_code(uuid, text, jsonb) to authenticated;
