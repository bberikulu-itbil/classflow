-- «Барлығын қаралды деп белгілеу» on the home page: marks the given lessons as looked at now (as a demo run would).
create or replace function cf_mark_seen(p_lessons uuid[]) returns void
language sql security definer set search_path = public as $$
  insert into cf_lesson_seen(teacher_id, lesson_id, seen_at)
  select (select auth.uid()), x, now() from unnest(p_lessons[1:500]) x where (select auth.uid()) is not null
  on conflict (teacher_id, lesson_id) do update set seen_at = excluded.seen_at;
$$;
revoke all on function cf_mark_seen(uuid[]) from public, anon;
grant execute on function cf_mark_seen(uuid[]) to authenticated;
