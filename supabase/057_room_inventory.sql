-- Кабинет: жабдық картасы (ИН-нөмір, алынған жыл, баға, сурет, ақау), беру журналы, сатып алу тізімі. Safe to run twice. Needs 053.
--   cf_room_items +  inv_no, acquired_year, price+currency (1 дана), photo_url, broken (ақау саны) + defect (сипаттамасы). Брондау бос қорды (саны - ақау) санайды.
--   cf_room_loans    : жабдықты адамға беру (қолданушы тізімі). Тек RPC: cf_loan_give / cf_loan_return. Оқу: кабинет жауапты адамы немесе алушының өзі.
--   cf_room_wishlist : сатып алу керек тізімі (мектеп бойынша): баға, валюта, доставка, санат (1-4), сілтеме, сурет, күй. Оқу: қызметкерлер.
-- Сурет: бар cf-media bucket (мектеп папкасы, қызметкер жүктейді). shortcut: валюталар бір-біріне айналдырылмайды (қосынды валюта бойынша).

alter table cf_room_items
  add column if not exists inv_no text check (inv_no is null or length(inv_no) <= 60),
  add column if not exists acquired_year int check (acquired_year is null or acquired_year between 1990 and 2100),
  add column if not exists price numeric(14, 2) check (price is null or price >= 0),
  add column if not exists currency text not null default 'KZT' check (currency in ('KZT', 'USD', 'EUR', 'RUB', 'CNY')),
  add column if not exists photo_url text check (photo_url is null or length(photo_url) <= 500),
  add column if not exists broken int not null default 0 check (broken >= 0),
  add column if not exists defect text check (defect is null or length(defect) <= 300);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cf_room_items_broken_le_qty') then
    alter table cf_room_items add constraint cf_room_items_broken_le_qty check (broken <= qty);
  end if;
end $$;

create table if not exists cf_room_loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references cf_room_items(id) on delete cascade,
  qty int not null check (qty between 1 and 1000),
  borrower_id uuid references profiles(id) on delete set null,
  borrower_name text check (borrower_name is null or length(borrower_name) <= 80),
  purpose text not null default '' check (length(purpose) <= 200),
  given_on date not null,
  due_on date,
  returned_on date,
  given_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (borrower_id is not null or length(coalesce(borrower_name, '')) > 0)
);
create index if not exists cf_room_loans_item_idx on cf_room_loans (item_id, given_on desc);
create index if not exists cf_room_loans_user_idx on cf_room_loans (borrower_id);
alter table cf_room_loans enable row level security;
drop policy if exists rml_read on cf_room_loans;
create policy rml_read on cf_room_loans for select using (borrower_id = (select auth.uid())
  or exists (select 1 from cf_room_items i where i.id = item_id and cf_room_manages(i.room_id)));

create table if not exists cf_room_wishlist (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  room_id uuid references cf_rooms(id) on delete set null,
  name text not null check (length(name) between 1 and 120),
  description text check (description is null or length(description) <= 300),
  price numeric(14, 2) not null default 0 check (price >= 0),
  currency text not null default 'KZT' check (currency in ('KZT', 'USD', 'EUR', 'RUB', 'CNY')),
  qty int not null default 1 check (qty between 1 and 1000),
  delivery numeric(14, 2) not null default 0 check (delivery >= 0),
  priority int not null default 2 check (priority between 1 and 4),
  link text check (link is null or (length(link) <= 500 and link ~* '^https?://')),
  photo_url text check (photo_url is null or length(photo_url) <= 500),
  note text check (note is null or length(note) <= 300),
  status text not null default 'planned' check (status in ('planned', 'ordered', 'received', 'rejected')),
  created_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists cf_room_wishlist_school_idx on cf_room_wishlist (school_id, priority);
alter table cf_room_wishlist enable row level security;
drop policy if exists rmw_read on cf_room_wishlist;
drop policy if exists rmw_ins on cf_room_wishlist;
drop policy if exists rmw_upd on cf_room_wishlist;
drop policy if exists rmw_del on cf_room_wishlist;
create policy rmw_read on cf_room_wishlist for select using (school_id = my_school() and is_staff());
create policy rmw_ins on cf_room_wishlist for insert with check (school_id = my_school() and is_staff() and created_by = (select auth.uid()));
create policy rmw_upd on cf_room_wishlist for update using (school_id = my_school() and is_staff() and (created_by = (select auth.uid()) or is_deputy()))
  with check (school_id = my_school());
create policy rmw_del on cf_room_wishlist for delete using (school_id = my_school() and is_staff() and (created_by = (select auth.uid()) or is_deputy()));

create or replace function cf_loan_give(p_item uuid, p_qty int, p_borrower uuid, p_name text, p_purpose text, p_due date) returns uuid
language plpgsql security definer set search_path = public as $$
declare it cf_room_items; rm cf_rooms; me uuid := auth.uid(); out int; rid uuid; today date;
begin
  select * into it from cf_room_items where id = p_item;
  if not found then raise exception 'Жабдық табылмады'; end if;
  select * into rm from cf_rooms where id = it.room_id and school_id = my_school();
  if not found or not cf_room_manages(it.room_id) then raise exception 'Рұқсат жоқ'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'Саны қате'; end if;
  if p_borrower is null and length(btrim(coalesce(p_name, ''))) = 0 then raise exception 'Кімге беріліп жатқанын көрсетіңіз'; end if;
  if p_borrower is not null and not exists (select 1 from profiles where id = p_borrower and school_id = my_school()) then raise exception 'Қолданушы табылмады'; end if;
  select coalesce(sum(qty), 0) into out from cf_room_loans where item_id = p_item and returned_on is null;
  if p_qty > it.qty - it.broken - out then raise exception 'Бос жабдық жеткіліксіз: % (бос %)', it.name, greatest(it.qty - it.broken - out, 0); end if;
  select (now() at time zone coalesce((select tz from schools where id = rm.school_id), 'Asia/Almaty'))::date into today;
  insert into cf_room_loans(item_id, qty, borrower_id, borrower_name, purpose, given_on, due_on, given_by)
    values (p_item, p_qty, p_borrower, nullif(left(btrim(coalesce(p_name, '')), 80), ''), left(coalesce(p_purpose, ''), 200), today, p_due, me) returning id into rid;
  if p_borrower is not null and p_borrower <> me then
    perform notify(p_borrower, 'Жабдық берілді', it.name || ' × ' || p_qty || ' (' || rm.name || ')', 'rooms');
  end if;
  return rid;
end $$;

create or replace function cf_loan_return(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l cf_room_loans; it cf_room_items; today date;
begin
  select * into l from cf_room_loans where id = p_id;
  if not found then raise exception 'Жазба табылмады'; end if;
  select * into it from cf_room_items where id = l.item_id;
  if not cf_room_manages(it.room_id) then raise exception 'Рұқсат жоқ'; end if;
  if l.returned_on is not null then raise exception 'Қайтарылған'; end if;
  select (now() at time zone coalesce((select s.tz from schools s join cf_rooms r on r.school_id = s.id where r.id = it.room_id), 'Asia/Almaty'))::date into today;
  update cf_room_loans set returned_on = today where id = p_id;
end $$;

-- Брондау бос қорды ақауды шегеріп санайды (053 функциялары қайта жазылды).
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
    for i in select it.id, it.name, (it.qty - it.broken) total, ri.qty want from cf_room_request_items ri join cf_room_items it on it.id = ri.item_id where ri.request_id = p_id loop
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
    if q is null or q < 1 or q > it.qty - it.broken then raise exception 'Саны қате: %', it.name; end if;
    insert into cf_room_request_items(request_id, item_id, qty) values (rid, it.id, q);
  end loop;
  if cf_room_manages(p_room) then perform cf_room_set(rid, 'approved');
  elsif rm.responsible_id is not null then
    perform notify(rm.responsible_id, 'Кабинетке жаңа сұрау', rm.name || ': ' || (select full_name from profiles where id = me), 'rooms');
  end if;
  return rid;
end $$;

revoke all on function cf_loan_give(uuid, int, uuid, text, text, date), cf_loan_return(uuid) from public, anon;
grant execute on function cf_loan_give(uuid, int, uuid, text, text, date), cf_loan_return(uuid) to authenticated;
