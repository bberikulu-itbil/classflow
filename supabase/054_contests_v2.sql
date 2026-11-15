-- Сайыстар v2: көбірек өріс, санаттар (әр санатта өз ережесі), кезеңге өз деңгейі мен орны. Safe to run twice. Needs 052.
--   cf_contests          : level may be empty (a contest with stages has the level on each stage). New: location, map_url (2GIS), is_online,
--                          age_min/age_max, team_size, fee_text, travel_text, toolset, cover_url, icon, reg_from, cat_rev.
--   cf_contest_stages    : + level, location.
--   cf_contest_categories: a contest may have categories (FLL, Drone Soccer ...), each with its own rules text/link and grades.
--                          Written only by cf_contest_set_categories (ids kept, so an application keeps its category).
--   cf_contest_apps      : + category_id. cf_contest_apply(+p_category): a contest with categories needs one.
-- Rules lock: a changed category rule on a locked contest raises cat_rev, the guard trigger then opens a new rules version and tells the applicants.
-- shortcut: cover is a link (https), not an upload; an upload needs a Storage bucket, add when the school asks.

alter table cf_contests alter column level drop not null;
alter table cf_contests add column if not exists location text check (location is null or length(location) <= 200);
alter table cf_contests add column if not exists map_url text check (map_url is null or (map_url ~* '^https://' and length(map_url) <= 300));
alter table cf_contests add column if not exists is_online boolean not null default false;
alter table cf_contests add column if not exists age_min int check (age_min is null or age_min between 3 and 99);
alter table cf_contests add column if not exists age_max int check (age_max is null or age_max between 3 and 99);
alter table cf_contests add column if not exists team_size text check (team_size is null or length(team_size) <= 40);
alter table cf_contests add column if not exists fee_text text check (fee_text is null or length(fee_text) <= 600);
alter table cf_contests add column if not exists travel_text text check (travel_text is null or length(travel_text) <= 800);
alter table cf_contests add column if not exists toolset text check (toolset is null or length(toolset) <= 600);
alter table cf_contests add column if not exists cover_url text check (cover_url is null or (cover_url ~* '^https://' and length(cover_url) <= 500));
alter table cf_contests add column if not exists icon text check (icon is null or length(icon) <= 16);
alter table cf_contests add column if not exists reg_from date;
alter table cf_contests add column if not exists cat_rev int not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cf_contests_age_order') then
    alter table cf_contests add constraint cf_contests_age_order check (age_min is null or age_max is null or age_max >= age_min);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cf_contests_reg_order') then
    alter table cf_contests add constraint cf_contests_reg_order check (reg_from is null or reg_deadline is null or reg_deadline >= reg_from);
  end if;
end $$;

alter table cf_contest_stages add column if not exists level text check (level is null or level in ('school', 'city', 'region', 'republic', 'international'));
alter table cf_contest_stages add column if not exists location text check (location is null or length(location) <= 200);

create table if not exists cf_contest_categories (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references cf_contests(id) on delete cascade,
  pos int not null default 0,
  name text not null check (length(name) between 1 and 120),
  rules_url text check (rules_url is null or (rules_url ~* '^https?://' and length(rules_url) <= 300)),
  rules_text text not null default '' check (length(rules_text) <= 20000),
  grades int[] not null default '{}'
);
create index if not exists cf_contest_categories_idx on cf_contest_categories (contest_id, pos);

alter table cf_contest_apps add column if not exists category_id uuid references cf_contest_categories(id) on delete set null;

alter table cf_contest_categories enable row level security;
drop policy if exists ccat_read on cf_contest_categories;
create policy ccat_read on cf_contest_categories for select using (cf_c_visible(contest_id));
-- no write policy: cf_contest_set_categories only

-- guard: a changed category rule (cat_rev) counts like a changed rules text
create or replace function cf_contest_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.status := 'draft'; new.rules_locked := false; new.rules_version := 0;
    return new;
  end if;
  if old.rules_locked then
    new.rules_locked := true;
    if new.rules_text is distinct from old.rules_text or new.cat_rev is distinct from old.cat_rev then
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

-- replaces the category list of a contest in one go; keeps the ids that come back, so applications keep their category
create or replace function cf_contest_set_categories(p_contest uuid, p_rows jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare c cf_contests; r jsonb; ex cf_contest_categories; rid uuid; i int := 0; ids uuid[] := '{}'; changed boolean := false; gone boolean;
begin
  select * into c from cf_contests where id = p_contest;
  if not found or not cf_c_owns(p_contest) then raise exception 'Рұқсат жоқ'; end if;
  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array' then raise exception 'Қате деректер'; end if;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    rid := nullif(r->>'id', '')::uuid;
    select * into ex from cf_contest_categories where id = rid and contest_id = p_contest;
    if found then
      if ex.rules_text is distinct from coalesce(r->>'rules_text', '') or ex.rules_url is distinct from nullif(r->>'rules_url', '') then changed := true; end if;
      update cf_contest_categories set pos = i, name = left(coalesce(r->>'name', ''), 120), rules_url = nullif(r->>'rules_url', ''),
        rules_text = coalesce(r->>'rules_text', ''), grades = coalesce(array(select jsonb_array_elements_text(r->'grades')::int), '{}')
        where id = rid;
    else
      insert into cf_contest_categories(contest_id, pos, name, rules_url, rules_text, grades)
        values (p_contest, i, left(coalesce(r->>'name', ''), 120), nullif(r->>'rules_url', ''), coalesce(r->>'rules_text', ''),
                coalesce(array(select jsonb_array_elements_text(r->'grades')::int), '{}'))
        returning id into rid;
      changed := true;
    end if;
    ids := ids || rid; i := i + 1;
  end loop;
  with d as (delete from cf_contest_categories where contest_id = p_contest and not (id = any(ids)) returning 1) select count(*) > 0 into gone from d;
  if (changed or gone) and c.rules_locked then update cf_contests set cat_rev = cat_rev + 1 where id = p_contest; end if;
end $$;

-- application: a contest with categories needs one (the student picks it)
drop function if exists cf_contest_apply(uuid, uuid, text);
create or replace function cf_contest_apply(p_contest uuid, p_teacher uuid, p_message text, p_category uuid default null) returns cf_contest_apps
language plpgsql security definer set search_path = public as $$
declare c cf_contests; a cf_contest_apps; me uuid := auth.uid();
begin
  if me is null or is_staff() then raise exception 'Өтінімді оқушы жібереді'; end if;
  select * into c from cf_contests where id = p_contest and school_id = my_school() and status = 'published' and not teacher_only;
  if not found then raise exception 'Сайыс табылмады'; end if;
  if not c.reg_open or (c.reg_deadline is not null and c.reg_deadline < current_date) then raise exception 'Тіркеу жабық'; end if;
  if c.reg_from is not null and c.reg_from > current_date then raise exception 'Тіркеу әлі ашылмаған'; end if;
  if not exists (select 1 from cf_contest_teachers where contest_id = p_contest and teacher_id = p_teacher) then raise exception 'Бұл мұғалім жауапты емес'; end if;
  if exists (select 1 from cf_contest_categories where contest_id = p_contest) then
    if p_category is null or not exists (select 1 from cf_contest_categories where id = p_category and contest_id = p_contest) then raise exception 'Санатты таңдаңыз'; end if;
  else p_category := null; end if;
  select * into a from cf_contest_apps where contest_id = p_contest and student_id = me;
  if found and a.status <> 'rejected' then raise exception 'Өтінім бұрын жіберілген'; end if;
  if found then
    update cf_contest_apps set teacher_id = p_teacher, message = left(coalesce(p_message, ''), 500), rules_version = c.rules_version, category_id = p_category,
      status = case when c.needs_approval then 'pending' else 'approved' end, created_at = now(), decided_at = null
      where id = a.id returning * into a;
  else
    insert into cf_contest_apps(contest_id, student_id, teacher_id, message, rules_version, category_id, status)
      values (p_contest, me, p_teacher, left(coalesce(p_message, ''), 500), c.rules_version, p_category, case when c.needs_approval then 'pending' else 'approved' end)
      returning * into a;
  end if;
  perform notify(p_teacher, 'Сайысқа жаңа өтінім', (select full_name from profiles where id = me) || ': ' || c.title, 'contests');
  return a;
end $$;

revoke all on function cf_contest_apply(uuid, uuid, text, uuid), cf_contest_set_categories(uuid, jsonb) from public, anon;
grant execute on function cf_contest_apply(uuid, uuid, text, uuid), cf_contest_set_categories(uuid, jsonb) to authenticated;
revoke all on function cf_contest_guard() from public, anon, authenticated;
