-- NOT APPLIED YET. Paste into Supabase > SQL editor and run once (safe to run twice).
-- Vocabulary (Сөздігім), teacher side:
--   cf_vocab         : the teacher's term base, one row per term in up to three languages (kk is required) + a definition.
--   cf_vocab_lessons : which terms belong to which lesson (many to many). The app also copies them into cf_lessons.terms so the existing
--                      student lesson screen shows them without changes.
--   cf_vocab_sets    : a set of terms handed to one class. The terms are COPIED into the set (jsonb), so editing the base later never
--                      changes what students already got. Students read the sets of their own class; only the teacher writes.
-- House rules as in 003/006: timestamptz, teacher-owned rows RESTRICT.

create table if not exists cf_vocab (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  kk text not null check (length(kk) between 1 and 80),
  ru text check (ru is null or length(ru) <= 80),
  en text check (en is null or length(en) <= 80),
  definition text check (definition is null or length(definition) <= 300),
  subject text check (subject is null or length(subject) <= 60),
  created_at timestamptz not null default now()
);
create unique index if not exists cf_vocab_owner_kk_uq on cf_vocab (owner_id, lower(kk));

create table if not exists cf_vocab_lessons (
  term_id uuid not null references cf_vocab(id) on delete cascade,
  lesson_id uuid not null references cf_lessons(id) on delete cascade,
  primary key (term_id, lesson_id)
);
create index if not exists cf_vocab_lessons_lesson_idx on cf_vocab_lessons (lesson_id);

create table if not exists cf_vocab_sets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete restrict,
  class_id uuid not null references classes(id) on delete cascade,
  title text not null check (length(title) between 1 and 80),
  -- [{ "kk": "...", "ru": "...", "en": "...", "definition": "..." }] x 1..100
  terms jsonb not null check (jsonb_typeof(terms) = 'array' and jsonb_array_length(terms) between 1 and 100 and pg_column_size(terms) < 60000),
  created_at timestamptz not null default now()
);
create index if not exists cf_vocab_sets_class_idx on cf_vocab_sets (class_id, created_at desc);

alter table cf_vocab enable row level security;
alter table cf_vocab_lessons enable row level security;
alter table cf_vocab_sets enable row level security;
drop policy if exists vocab_read on cf_vocab;
drop policy if exists vocab_ins on cf_vocab;
drop policy if exists vocab_upd on cf_vocab;
drop policy if exists vocab_del on cf_vocab;
drop policy if exists vlink_all on cf_vocab_lessons;
drop policy if exists vset_read on cf_vocab_sets;
drop policy if exists vset_ins on cf_vocab_sets;
drop policy if exists vset_del on cf_vocab_sets;

create policy vocab_read on cf_vocab for select using (owner_id = (select auth.uid()) and is_staff());
create policy vocab_ins on cf_vocab for insert with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school());
create policy vocab_upd on cf_vocab for update using (owner_id = (select auth.uid()) and is_staff()) with check (owner_id = (select auth.uid()) and school_id = my_school());
create policy vocab_del on cf_vocab for delete using (owner_id = (select auth.uid()) and is_staff());

-- a link is mine when the term and the lesson are both mine
create policy vlink_all on cf_vocab_lessons for all
  using (is_staff() and exists (select 1 from cf_vocab v where v.id = term_id and v.owner_id = (select auth.uid())))
  with check (is_staff()
    and exists (select 1 from cf_vocab v where v.id = term_id and v.owner_id = (select auth.uid()))
    and exists (select 1 from cf_lessons l where l.id = lesson_id and l.owner_id = (select auth.uid())));

-- the teacher sees own sets; a student sees the sets of the class they belong to
create policy vset_read on cf_vocab_sets for select using (
  (owner_id = (select auth.uid()) and is_staff())
  or class_id = (select p.class_id from profiles p where p.id = (select auth.uid())));
create policy vset_ins on cf_vocab_sets for insert with check (owner_id = (select auth.uid()) and is_staff() and school_id = my_school()
  and exists (select 1 from classes c where c.id = class_id and c.school_id = my_school()));
create policy vset_del on cf_vocab_sets for delete using (owner_id = (select auth.uid()) and is_staff());

revoke all on cf_vocab, cf_vocab_lessons, cf_vocab_sets from public, anon;
grant select, insert, update, delete on cf_vocab, cf_vocab_lessons to authenticated;
grant select, insert, delete on cf_vocab_sets to authenticated;
