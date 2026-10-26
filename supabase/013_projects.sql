-- Apply once in Supabase SQL Editor. Projects are private to their teacher.
create table if not exists cf_projects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null default '' check (length(description) <= 5000),
  deadline date,
  status text not null default 'planned' check (status in ('planned', 'active', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cf_projects_owner_idx on cf_projects (owner_id, updated_at desc);
drop trigger if exists cf_projects_touch on cf_projects;
create trigger cf_projects_touch before update on cf_projects for each row execute function cf_touch();
alter table cf_projects enable row level security;
drop policy if exists projects_read on cf_projects;
drop policy if exists projects_ins on cf_projects;
drop policy if exists projects_upd on cf_projects;
drop policy if exists projects_del on cf_projects;
create policy projects_read on cf_projects for select using (owner_id = (select auth.uid()) and is_staff());
create policy projects_ins on cf_projects for insert with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school());
create policy projects_upd on cf_projects for update using (owner_id = (select auth.uid()) and is_staff()) with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school());
create policy projects_del on cf_projects for delete using (owner_id = (select auth.uid()) and is_staff());
revoke all on cf_projects from public, anon;
grant select, insert, update, delete on cf_projects to authenticated;
