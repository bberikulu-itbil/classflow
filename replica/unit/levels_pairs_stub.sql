-- Stub of the tables and helper functions that supabase/038 touches, for a throwaway local Postgres (psql -d t -f this; then 038; then levels_pairs.sql).
create role authenticated; create role anon;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(coalesce(current_setting('request.jwt.claim.sub', true), (nullif(current_setting('request.jwt.claims', true),'')::jsonb)->>'sub'), '')::uuid $$;
create publication supabase_realtime;
create type user_role as enum ('student','teacher','admin','deputy');
create table schools(id uuid primary key default gen_random_uuid());
create table classes(id uuid primary key default gen_random_uuid(), name text);
create table profiles(id uuid primary key default gen_random_uuid(), school_id uuid, full_name text, role user_role, class_id uuid, removed_at timestamptz);
create table cf_sessions(id uuid primary key default gen_random_uuid(), school_id uuid, lesson_id uuid, teacher_id uuid, class_id uuid, title text, join_code text, status text, current_slide int, slide_count int, locked boolean default false, active_task_id uuid, terms jsonb, groups_count int default 1, started_at timestamptz default now(), ended_at timestamptz);
create table cf_session_private(session_id uuid primary key references cf_sessions(id) on delete cascade, slides jsonb, plan jsonb);
create table cf_participants(session_id uuid references cf_sessions(id) on delete cascade, student_id uuid references profiles(id), full_name text, class_name text, group_no int, att text, presence text default 'online', joined_at timestamptz default now(), last_seen_at timestamptz, away_count int default 0, away_seconds int default 0, locked boolean default false, hand boolean default false, primary key(session_id, student_id));
create table cf_tasks(id uuid primary key default gen_random_uuid(), session_id uuid references cf_sessions(id) on delete cascade, slide_index int, kind text check (kind in ('quiz','short','text','code')), prompt text, options jsonb, points int, status text not null default 'open' check (status in ('open','closed')), reveal jsonb, opened_at timestamptz not null default now(), closed_at timestamptz, time_limit int, speed boolean not null default false);
create table cf_task_keys(task_id uuid primary key references cf_tasks(id) on delete cascade, answer jsonb, explanation text);
create table cf_submissions(id uuid primary key default gen_random_uuid(), task_id uuid references cf_tasks(id) on delete cascade, session_id uuid references cf_sessions(id) on delete cascade, student_id uuid references profiles(id), answer text, meta jsonb, is_correct boolean, points int, feedback text, created_at timestamptz default now(), updated_at timestamptz default now(), unique(task_id, student_id));
create table cf_scores(id bigserial primary key, session_id uuid references cf_sessions(id) on delete cascade, student_id uuid references profiles(id), group_no int, points int, reason text, task_id uuid references cf_tasks(id) on delete set null, submission_id uuid references cf_submissions(id) on delete cascade, created_by uuid, created_at timestamptz default now(), check ((student_id is not null) <> (group_no is not null)));
create function my_school() returns uuid language sql stable as $$ select school_id from profiles where id = auth.uid() $$;
create function is_deputy() returns boolean language sql stable as $$ select coalesce((select role in ('deputy','admin') from profiles where id = auth.uid()), false) $$;
create function cf_teaches(p uuid) returns boolean language sql stable as $$ select exists (select 1 from cf_sessions s where s.id = p and s.school_id = my_school() and (s.teacher_id = auth.uid() or is_deputy())) $$;
create function cf_in(p uuid) returns boolean language sql stable as $$ select exists (select 1 from cf_participants x where x.session_id = p and x.student_id = auth.uid()) $$;
create function cf_norm(t text) returns text language sql immutable as $$ select lower(trim(coalesce(t,''))) $$;
-- seed
insert into schools(id) values ('00000000-0000-0000-0000-000000000001');
insert into classes(id,name) values ('00000000-0000-0000-0000-0000000000c1','8A');
insert into profiles(school_id, full_name, role) values ('00000000-0000-0000-0000-000000000001','Teacher','teacher');
insert into profiles(school_id, full_name, role, class_id) select '00000000-0000-0000-0000-000000000001','S'||g,'student','00000000-0000-0000-0000-0000000000c1' from generate_series(1,6) g;
