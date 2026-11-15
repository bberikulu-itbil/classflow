-- Кезеңге "кім қатыса алады" өрісі (мысалы FIRST: дайындық — кез келген, республикалық — квота алғандар). Safe to run twice. Needs 054.
alter table cf_contest_stages add column if not exists who text check (who is null or length(who) <= 300);
