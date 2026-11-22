-- When a teacher last looked through a lesson in demo mode (demo sessions are deleted afterwards, so it is kept here).
-- The home page lists lessons changed after that as «Жаңа» / «Жаңартылған».
create table if not exists cf_lesson_seen (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null,
  seen_at timestamptz not null default now(),
  primary key (teacher_id, lesson_id)
);
alter table cf_lesson_seen enable row level security;
drop policy if exists seen_own on cf_lesson_seen;
create policy seen_own on cf_lesson_seen for select using (teacher_id = (select auth.uid()));

create or replace function cf_note_demo() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.mode = 'demo' and new.lesson_id is not null then
    insert into cf_lesson_seen(teacher_id, lesson_id, seen_at) values (new.teacher_id, new.lesson_id, now())
      on conflict (teacher_id, lesson_id) do update set seen_at = excluded.seen_at;
  end if;
  return new;
end $$;
revoke all on function cf_note_demo() from public, anon, authenticated;
drop trigger if exists cf_note_demo on cf_sessions;
create trigger cf_note_demo after insert on cf_sessions for each row execute function cf_note_demo();
