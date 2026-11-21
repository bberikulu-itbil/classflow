-- Who has booked a room and when, for every staff member of the school (the room's week on its page, the clash check when booking).
-- The purpose is shown only to the requester and the room's managers.
create or replace function cf_room_busy(p_room uuid, p_from date, p_to date)
returns table(id uuid, on_date date, start_time time, end_time time, status text, who text, purpose text)
language sql stable security definer set search_path = public as $$
  select q.id, q.on_date, q.start_time, q.end_time, q.status, p.full_name,
         case when q.requester_id = (select auth.uid()) or cf_room_manages(q.room_id) then q.purpose end
  from cf_room_requests q join cf_rooms r on r.id = q.room_id left join profiles p on p.id = q.requester_id
  where q.room_id = p_room and r.school_id = my_school() and is_staff()
    and q.on_date between p_from and least(p_to, p_from + 62) and q.status in ('pending', 'approved')
  order by q.on_date, q.start_time
$$;
revoke all on function cf_room_busy(uuid, date, date) from public, anon;
grant execute on function cf_room_busy(uuid, date, date) to authenticated;
