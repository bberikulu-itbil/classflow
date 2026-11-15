-- NOT APPLIED YET: waiting for the Supabase confirmation. Remove this line once applied.
-- Кабинеттер: кабинет, оның жабдығы, жабдықты/кабинетті алдын ала брондау (сұрау).
-- Reuses: profiles, schools(tz), my_school(), is_staff(), is_deputy(), notify() (as in 052).
--   cf_rooms / cf_room_items   : a room (STEM, informatics ...) and what is in it. kind 'laptop' = a laptop students may take.
--   cf_room_requests           : a teacher's or student's request for a room + items on a date and time. pending -> approved | rejected;
--                                approved -> returned (items are back); the requester may cancel. Nobody writes it directly: RPC only.
--   cf_room_request_items      : the pick list of a request (item, quantity). Approving is refused when approved requests that overlap
--                                in time already hold too many of an item.
-- Managers of a room: its responsible person, or a deputy/admin. A manager's own request is approved at once.
-- shortcut: laptops are counted, not tracked one by one (no serial numbers, no "who has laptop #7"); add cf_room_units when the school asks.

create table if not exists cf_rooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  description text check (description is null or length(description) <= 500),
  responsible_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists cf_rooms_school_idx on cf_rooms (school_id);

create table if not exists cf_room_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references cf_rooms(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  qty int not null default 1 check (qty between 0 and 1000),
  kind text not null default 'equipment' check (kind in ('equipment', 'laptop')),
  note text check (note is null or length(note) <= 200)
);
create index if not exists cf_room_items_room_idx on cf_room_items (room_id);

create table if not exists cf_room_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references cf_rooms(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  on_date date not null,
  start_time time not null,
  end_time time not null,
  purpose text not null default '' check (length(purpose) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'returned', 'cancelled')),
  decided_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists cf_room_requests_room_idx on cf_room_requests (room_id, on_date);
create index if not exists cf_room_requests_user_idx on cf_room_requests (requester_id);

create table if not exists cf_room_request_items (
  request_id uuid not null references cf_room_requests(id) on delete cascade,
  item_id uuid not null references cf_room_items(id) on delete cascade,
  qty int not null check (qty between 1 and 1000),
  primary key (request_id, item_id)
);
create index if not exists cf_room_request_items_item_idx on cf_room_request_items (item_id);

create or replace function cf_room_manages(r uuid) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from cf_rooms x where x.id = r and x.school_id = my_school() and is_staff()
   and (x.responsible_id = (select auth.uid()) or is_deputy())) $$;

alter table cf_rooms enable row level security;
alter table cf_room_items enable row level security;
alter table cf_room_requests enable row level security;
alter table cf_room_request_items enable row level security;
drop policy if exists rm_read on cf_rooms;
drop policy if exists rm_ins on cf_rooms;
drop policy if exists rm_upd on cf_rooms;
drop policy if exists rm_del on cf_rooms;
drop policy if exists rmi_read on cf_room_items;
drop policy if exists rmi_all on cf_room_items;
drop policy if exists rmr_read on cf_room_requests;
drop policy if exists rmri_read on cf_room_request_items;

create policy rm_read on cf_rooms for select using (school_id = my_school());
create policy rm_ins on cf_rooms for insert with check (school_id = my_school() and is_staff() and (is_deputy() or responsible_id = (select auth.uid())));
create policy rm_upd on cf_rooms for update using (cf_room_manages(id)) with check (school_id = my_school() and (is_deputy() or responsible_id = (select auth.uid())));
create policy rm_del on cf_rooms for delete using (cf_room_manages(id) and not exists (select 1 from cf_room_requests q where q.room_id = cf_rooms.id));
create policy rmi_read on cf_room_items for select using (exists (select 1 from cf_rooms x where x.id = room_id and x.school_id = my_school()));
create policy rmi_all on cf_room_items for all using (cf_room_manages(room_id)) with check (cf_room_manages(room_id));
create policy rmr_read on cf_room_requests for select using (requester_id = (select auth.uid()) or cf_room_manages(room_id));
create policy rmri_read on cf_room_request_items for select using (exists (select 1 from cf_room_requests q where q.id = request_id));

create or replace function cf_room_set(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare r cf_room_requests; rm cf_rooms; me uuid := auth.uid(); i record; busy int;
begin
  select * into r from cf_room_requests where id = p_id;
  if not found then raise exception 'Сұрау табылмады'; end if;
  select * into rm from cf_rooms where id = r.room_id and school_id = my_school();
  if not found then raise exception 'Рұқсат жоқ'; end if;
  if p_status = 'cancelled' then
    if r.requester_id <> me or r.status not in ('pending', 'approved') then raise exception 'Бас тартуға болмайды'; end if;
  elsif p_status in ('approved', 'rejected') then
    if not cf_room_manages(r.room_id) or r.status <> 'pending' then raise exception 'Рұқсат жоқ'; end if;
  elsif p_status = 'returned' then
    if not cf_room_manages(r.room_id) or r.status <> 'approved' then raise exception 'Рұқсат жоқ'; end if;
  else raise exception 'Қате күй'; end if;
  if p_status = 'approved' then
    for i in select it.id, it.name, it.qty total, ri.qty want from cf_room_request_items ri join cf_room_items it on it.id = ri.item_id where ri.request_id = p_id loop
      select coalesce(sum(o.qty), 0) into busy from cf_room_request_items o join cf_room_requests q on q.id = o.request_id
        where o.item_id = i.id and q.id <> p_id and q.status = 'approved' and q.on_date = r.on_date and q.start_time < r.end_time and q.end_time > r.start_time;
      if i.want > i.total - busy then raise exception 'Жабдық жеткіліксіз: % (бос %)', i.name, greatest(i.total - busy, 0); end if;
    end loop;
  end if;
  update cf_room_requests set status = p_status, decided_by = case when p_status = 'cancelled' then decided_by else me end where id = p_id;
  if p_status <> 'cancelled' and r.requester_id <> me then
    perform notify(r.requester_id, case p_status when 'approved' then 'Бронь расталды' when 'rejected' then 'Бронь қабылданбады' else 'Жабдық қайтарылды' end,
      rm.name || ', ' || to_char(r.on_date, 'DD.MM') || ' ' || to_char(r.start_time, 'HH24:MI'), 'rooms');
  end if;
end $$;

create or replace function cf_room_request(p_room uuid, p_date date, p_start time, p_end time, p_purpose text, p_items jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare rm cf_rooms; me uuid := auth.uid(); rid uuid; e jsonb; it cf_room_items; q int; today date;
begin
  if me is null then raise exception 'Кіру керек'; end if;
  select * into rm from cf_rooms where id = p_room and school_id = my_school();
  if not found then raise exception 'Кабинет табылмады'; end if;
  select (now() at time zone coalesce((select tz from schools where id = rm.school_id), 'Asia/Almaty'))::date into today;
  if p_date is null or p_date < today then raise exception 'Өткен күнге бронь жасалмайды'; end if;
  if p_start is null or p_end is null or p_end <= p_start then raise exception 'Уақыт қате'; end if;
  insert into cf_room_requests(room_id, requester_id, on_date, start_time, end_time, purpose)
    values (p_room, me, p_date, p_start, p_end, left(coalesce(p_purpose, ''), 300)) returning id into rid;
  for e in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    q := (e ->> 'qty')::int;
    select * into it from cf_room_items where id = (e ->> 'item_id')::uuid and room_id = p_room;
    if not found then raise exception 'Жабдық бұл кабинетке жатпайды'; end if;
    if q is null or q < 1 or q > it.qty then raise exception 'Саны қате: %', it.name; end if;
    insert into cf_room_request_items(request_id, item_id, qty) values (rid, it.id, q);
  end loop;
  if cf_room_manages(p_room) then perform cf_room_set(rid, 'approved');
  elsif rm.responsible_id is not null then
    perform notify(rm.responsible_id, 'Кабинетке жаңа сұрау', rm.name || ': ' || (select full_name from profiles where id = me), 'rooms');
  end if;
  return rid;
end $$;

revoke all on function cf_room_manages(uuid), cf_room_set(uuid, text), cf_room_request(uuid, date, time, time, text, jsonb) from public, anon;
grant execute on function cf_room_manages(uuid), cf_room_set(uuid, text), cf_room_request(uuid, date, time, time, text, jsonb) to authenticated;
