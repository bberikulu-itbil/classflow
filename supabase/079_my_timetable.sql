-- A student's week: the timetable rows of their class (cf_timetable is staff-only), with the room and teacher names.
create or replace function cf_my_timetable()
returns table(weekday int, period int, span int, label text, room text, teacher text)
language sql stable security definer set search_path = public as $$
  select t.weekday, t.period, t.span, t.label, r.name, p.full_name
  from cf_timetable t
  join profiles me on me.id = (select auth.uid()) and me.class_id is not null and t.class_id = me.class_id
  left join cf_rooms r on r.id = t.room_id left join profiles p on p.id = t.owner_id
  order by t.weekday, t.period
$$;
revoke all on function cf_my_timetable() from public, anon;
grant execute on function cf_my_timetable() to authenticated;
