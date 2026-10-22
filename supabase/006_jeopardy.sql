-- NOT APPLIED YET. Paste into Supabase > SQL editor and run once (safe to run twice).
-- Jeopardy: games of a teacher (cf_jeopardy) and the results of played games (cf_jeopardy_runs). Rows are private to the owner. Sharing between devices = same login;
-- sharing with colleagues = the "🔗 Сілтеме" link in the app (the game is packed into the URL, no row needed).
-- House rules as in 003: timestamptz, teacher-owned rows RESTRICT (reassign before deleting a teacher).

create table if not exists cf_jeopardy (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  title text not null check (length(title) between 1 and 120),
  -- [{ "name": "...", "qs": [{ "q": "...", "a": "..." } x5] }] x 1..6, same shape the app uses
  data jsonb not null check (jsonb_typeof(data) = 'array' and jsonb_array_length(data) between 1 and 6 and pg_column_size(data) < 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cf_jeopardy_owner_idx on cf_jeopardy (owner_id, updated_at desc);

drop trigger if exists cf_jeopardy_touch on cf_jeopardy;
create trigger cf_jeopardy_touch before update on cf_jeopardy for each row execute function cf_touch();

alter table cf_jeopardy enable row level security;
drop policy if exists jeopardy_read on cf_jeopardy;
drop policy if exists jeopardy_ins on cf_jeopardy;
drop policy if exists jeopardy_upd on cf_jeopardy;
drop policy if exists jeopardy_del on cf_jeopardy;
create policy jeopardy_read on cf_jeopardy for select using (owner_id = (select auth.uid()) and is_staff());
create policy jeopardy_ins on cf_jeopardy for insert with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school());
create policy jeopardy_upd on cf_jeopardy for update using (owner_id = (select auth.uid()) and is_staff())
  with check (owner_id = (select auth.uid()) and school_id = my_school());
create policy jeopardy_del on cf_jeopardy for delete using (owner_id = (select auth.uid()) and is_staff());

revoke all on cf_jeopardy from public, anon;
grant select, insert, update, delete on cf_jeopardy to authenticated;

-- Results of played games (the "Тарих" tab): one row per finished game, never edited, only added or deleted.
create table if not exists cf_jeopardy_runs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  game_title text not null check (length(game_title) between 1 and 120),
  played_at timestamptz not null default now(),
  -- [{ "name": "...", "members": ["..."], "score": 300 }] x 1..8, and the rules used: { "penaltyPct": 50, "allowNegative": true, "note": "" }
  teams jsonb not null check (jsonb_typeof(teams) = 'array' and jsonb_array_length(teams) between 1 and 8 and pg_column_size(teams) < 50000),
  rules jsonb not null default '{}'::jsonb check (jsonb_typeof(rules) = 'object' and pg_column_size(rules) < 5000),
  created_at timestamptz not null default now()
);
create index if not exists cf_jeopardy_runs_owner_idx on cf_jeopardy_runs (owner_id, played_at desc);

alter table cf_jeopardy_runs enable row level security;
drop policy if exists jruns_read on cf_jeopardy_runs;
drop policy if exists jruns_ins on cf_jeopardy_runs;
drop policy if exists jruns_del on cf_jeopardy_runs;
create policy jruns_read on cf_jeopardy_runs for select using (owner_id = (select auth.uid()) and is_staff());
create policy jruns_ins on cf_jeopardy_runs for insert with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school());
create policy jruns_del on cf_jeopardy_runs for delete using (owner_id = (select auth.uid()) and is_staff());

revoke all on cf_jeopardy_runs from public, anon;
grant select, insert, delete on cf_jeopardy_runs to authenticated;
