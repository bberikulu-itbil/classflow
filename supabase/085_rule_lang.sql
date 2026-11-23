-- 085: a session rule that lets students switch the lesson language (on by default)
alter table public.cf_sessions add column if not exists allow_lang boolean not null default true;
-- cf_set_rule gains: elsif p_rule = 'lang' then update cf_sessions set allow_lang = p_on where id = p_session; (applied via MCP)
