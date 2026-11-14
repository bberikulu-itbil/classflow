-- NOT APPLIED YET: the Supabase apply step was not confirmed. Remove this line once applied.
-- Сайыстар каталогы (Сынақтар мен сайыстар > Сайыстар каталогы, оқушыға: Сайыстар).
-- Reuses: profiles, schools, my_school(), is_staff(), is_deputy(), notify() (as in 003/011). Safe to run twice.
--   cf_contests          : one row per contest. kind 'own' (runs inside ClassFlow) or 'external' (an olympiad somewhere else).
--                          Rules live on the row (rules_text) and lock with rules_locked; a later edit of a locked text opens a new
--                          version (trigger) and notifies the students who applied. teacher_only rows are never visible to students.
--   cf_contest_stages    : the stage row (KBO1 -> KBO2 -> ...), ordered by pos.
--   cf_contest_teachers  : responsible teachers a student may pick when applying.
--   cf_contest_saves     : a user's "Сақтау" bookmarks.
--   cf_contest_apps      : a student's application. A student never writes it directly: cf_contest_apply / cf_contest_decide.
-- shortcut: no PDF rules, no teams, no history of old rule texts (only the version number). Add when the school asks.

create table if not exists cf_contests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete restrict,
  title text not null check (length(title) between 1 and 120),
  kind text not null default 'external' check (kind in ('own', 'external')),
  format text check (format in ('quiz', 'coding', 'tournament')),
  field text not null default 'general' check (field in ('general', 'robotics', 'informatics', 'teachers')),
  level text not null default 'school' check (level in ('school', 'city', 'region', 'republic', 'international')),
  organizer text check (organizer is null or length(organizer) <= 120),
  url text check (url is null or (url ~* '^https?://' and length(url) <= 300)),
  description text check (description is null or length(description) <= 1000),
  starts_on date,
  ends_on date,
  grades int[] not null default '{}',
  teacher_only boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'rules_locked', 'published')),
  rules_text text not null default '' check (length(rules_text) <= 20000),
  rules_version int not null default 0,
  rules_locked boolean not null default false,
  reg_open boolean not null default true,
  reg_deadline date,
  needs_approval boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index if not exists cf_contests_school_idx on cf_contests (school_id, starts_on);
create index if not exists cf_contests_author_idx on cf_contests (author_id);

create table if not exists cf_contest_stages (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references cf_contests(id) on delete cascade,
  pos int not null default 0,
  name text not null check (length(name) between 1 and 80),
  on_date date,
  format text check (format is null or length(format) <= 120),
  advance text check (advance is null or length(advance) <= 200)
);
create index if not exists cf_contest_stages_idx on cf_contest_stages (contest_id, pos);

create table if not exists cf_contest_teachers (
  contest_id uuid not null references cf_contests(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  primary key (contest_id, teacher_id)
);
create index if not exists cf_contest_teachers_teacher_idx on cf_contest_teachers (teacher_id);

create table if not exists cf_contest_saves (
  contest_id uuid not null references cf_contests(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (contest_id, user_id)
);
create index if not exists cf_contest_saves_user_idx on cf_contest_saves (user_id);

create table if not exists cf_contest_apps (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references cf_contests(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete restrict,
  message text not null default '' check (length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rules_version int not null default 0,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (contest_id, student_id)
);
create index if not exists cf_contest_apps_teacher_idx on cf_contest_apps (teacher_id, status);
create index if not exists cf_contest_apps_student_idx on cf_contest_apps (student_id);

-- helpers (security definer, so the policies do not loop through each other)
create or replace function cf_c_owns(c uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from cf_contests x where x.id = c and x.school_id = my_school() and is_staff()
   and (x.author_id = (select auth.uid()) or is_deputy())) $$;
create or replace function cf_c_visible(c uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from cf_contests x where x.id = c and x.school_id = my_school()
   and ((x.status = 'published' and (not x.teacher_only or is_staff())) or cf_c_owns(c))) $$;

-- a locked rule stays locked; editing a locked text opens a new version and tells the applicants; publishing an own contest needs locked rules
create or replace function cf_contest_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.status := 'draft'; new.rules_locked := false; new.rules_version := 0;
    return new;
  end if;
  if old.rules_locked then
    new.rules_locked := true;
    if new.rules_text is distinct from old.rules_text then
      new.rules_version := old.rules_version + 1;
      insert into notifications(user_id, title, body, link)
        select a.student_id, 'Сайыс ережесі өзгерді', new.title || ': ережелердің жаңа нұсқасы (' || new.rules_version || ')', 'contests'
        from cf_contest_apps a where a.contest_id = new.id and a.status in ('pending', 'approved');
    else new.rules_version := old.rules_version; end if;
  elsif new.rules_locked then
    new.rules_version := 1;
  else new.rules_version := old.rules_version; end if;
  if new.rules_locked and new.status = 'draft' then new.status := 'rules_locked'; end if;
  if new.status = 'rules_locked' and not new.rules_locked then new.status := 'draft'; end if;
  if new.status = 'published' and new.kind = 'own' and not new.rules_locked then
    raise exception 'Алдымен ережені бекітіңіз';
  end if;
  return new;
end $$;
drop trigger if exists cf_contest_guard_t on cf_contests;
create trigger cf_contest_guard_t before insert or update on cf_contests for each row execute function cf_contest_guard();

alter table cf_contests enable row level security;
alter table cf_contest_stages enable row level security;
alter table cf_contest_teachers enable row level security;
alter table cf_contest_saves enable row level security;
alter table cf_contest_apps enable row level security;
drop policy if exists ct_read on cf_contests;
drop policy if exists ct_ins on cf_contests;
drop policy if exists ct_upd on cf_contests;
drop policy if exists ct_del on cf_contests;
drop policy if exists cts_read on cf_contest_stages;
drop policy if exists cts_all on cf_contest_stages;
drop policy if exists ctt_read on cf_contest_teachers;
drop policy if exists ctt_all on cf_contest_teachers;
drop policy if exists ctv_all on cf_contest_saves;
drop policy if exists cta_read on cf_contest_apps;

create policy ct_read on cf_contests for select using (cf_c_visible(id));
create policy ct_ins on cf_contests for insert with check (is_staff() and author_id = (select auth.uid()) and school_id = my_school());
create policy ct_upd on cf_contests for update using (cf_c_owns(id)) with check (school_id = my_school());
create policy ct_del on cf_contests for delete using (cf_c_owns(id) and not exists (select 1 from cf_contest_apps a where a.contest_id = cf_contests.id));

create policy cts_read on cf_contest_stages for select using (cf_c_visible(contest_id));
create policy cts_all on cf_contest_stages for all using (cf_c_owns(contest_id)) with check (cf_c_owns(contest_id));
create policy ctt_read on cf_contest_teachers for select using (cf_c_visible(contest_id));
create policy ctt_all on cf_contest_teachers for all using (cf_c_owns(contest_id))
  with check (cf_c_owns(contest_id) and exists (select 1 from profiles p where p.id = teacher_id and p.school_id = my_school() and p.role <> 'student'));
create policy ctv_all on cf_contest_saves for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and cf_c_visible(contest_id));
-- own applications; staff: those addressed to them, or any for the contest's author / a deputy. No write policy: RPC only.
create policy cta_read on cf_contest_apps for select using (
  student_id = (select auth.uid())
  or (is_staff() and (teacher_id = (select auth.uid()) or cf_c_owns(contest_id))));

create or replace function cf_contest_apply(p_contest uuid, p_teacher uuid, p_message text) returns cf_contest_apps
language plpgsql security definer set search_path = public as $$
declare c cf_contests; a cf_contest_apps; me uuid := auth.uid();
begin
  if me is null or is_staff() then raise exception 'Өтінімді оқушы жібереді'; end if;
  select * into c from cf_contests where id = p_contest and school_id = my_school() and status = 'published' and not teacher_only;
  if not found then raise exception 'Сайыс табылмады'; end if;
  if not c.reg_open or (c.reg_deadline is not null and c.reg_deadline < current_date) then raise exception 'Тіркеу жабық'; end if;
  if not exists (select 1 from cf_contest_teachers where contest_id = p_contest and teacher_id = p_teacher) then raise exception 'Бұл мұғалім жауапты емес'; end if;
  select * into a from cf_contest_apps where contest_id = p_contest and student_id = me;
  if found and a.status <> 'rejected' then raise exception 'Өтінім бұрын жіберілген'; end if;
  if found then
    update cf_contest_apps set teacher_id = p_teacher, message = left(coalesce(p_message, ''), 500), rules_version = c.rules_version,
      status = case when c.needs_approval then 'pending' else 'approved' end, created_at = now(), decided_at = null
      where id = a.id returning * into a;
  else
    insert into cf_contest_apps(contest_id, student_id, teacher_id, message, rules_version, status)
      values (p_contest, me, p_teacher, left(coalesce(p_message, ''), 500), c.rules_version, case when c.needs_approval then 'pending' else 'approved' end)
      returning * into a;
  end if;
  perform notify(p_teacher, 'Сайысқа жаңа өтінім', (select full_name from profiles where id = me) || ': ' || c.title, 'contests');
  return a;
end $$;

create or replace function cf_contest_decide(p_app uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare a cf_contest_apps; c cf_contests;
begin
  if p_status not in ('approved', 'rejected') then raise exception 'Қате күй'; end if;
  select * into a from cf_contest_apps where id = p_app;
  if not found then raise exception 'Өтінім табылмады'; end if;
  select * into c from cf_contests where id = a.contest_id and school_id = my_school();
  if not found or not is_staff() or not (a.teacher_id = auth.uid() or c.author_id = auth.uid() or is_deputy()) then raise exception 'Рұқсат жоқ'; end if;
  update cf_contest_apps set status = p_status, decided_at = now() where id = p_app;
  perform notify(a.student_id, case when p_status = 'approved' then 'Өтінім расталды' else 'Өтінімнен бас тартылды' end, c.title, 'contests');
end $$;

revoke all on function cf_contest_apply(uuid, uuid, text), cf_contest_decide(uuid, text) from public, anon;
grant execute on function cf_contest_apply(uuid, uuid, text), cf_contest_decide(uuid, text) to authenticated;
