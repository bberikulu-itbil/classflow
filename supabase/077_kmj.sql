-- ҚМЖ (short-term lesson plan): one per teacher and lecture, filled from the КТП and the lecture's slides, edited, downloaded as Word.
create table if not exists cf_kmj (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id text not null,
  data jsonb not null default '{}'::jsonb,
  ready boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (owner_id, lesson_id),
  check (octet_length(data::text) < 200000)
);
alter table cf_kmj enable row level security;
drop policy if exists kmj_own on cf_kmj;
create policy kmj_own on cf_kmj for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
