-- Кабинет схемасы және сатып алу тізімінің көріну аясы. Safe to run twice. Needs 053, 057.
--   cf_rooms.layout : схема (JSON: {w, h, els:[{id,t,x,y,w,h,label,item_id}]}), торда сызылады. Жазады: кабинет жауаптысы / директор орынбасары (бар rm_upd).
--   cf_room_wishlist: көреді тек автор, директор орынбасары/әкімші және сол кабинеттің жауаптысы; басқа мұғалімдер көрмейді.
--                     өзгертеді/өшіреді: автор, орынбасар/әкімші, кабинет жауаптысы.
alter table cf_rooms add column if not exists layout jsonb check (layout is null or (jsonb_typeof(layout) = 'object' and length(layout::text) <= 60000));

drop policy if exists rmw_read on cf_room_wishlist;
drop policy if exists rmw_upd on cf_room_wishlist;
drop policy if exists rmw_del on cf_room_wishlist;
create policy rmw_read on cf_room_wishlist for select using (school_id = my_school() and is_staff()
  and (created_by = (select auth.uid()) or is_deputy() or (room_id is not null and cf_room_manages(room_id))));
create policy rmw_upd on cf_room_wishlist for update using (school_id = my_school() and is_staff()
  and (created_by = (select auth.uid()) or is_deputy() or (room_id is not null and cf_room_manages(room_id)))) with check (school_id = my_school());
create policy rmw_del on cf_room_wishlist for delete using (school_id = my_school() and is_staff()
  and (created_by = (select auth.uid()) or is_deputy() or (room_id is not null and cf_room_manages(room_id))));
