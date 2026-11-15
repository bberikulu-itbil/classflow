-- 063: lesson rules (questions on/off, hand raising on/off) and a slide log for the teacher's stage clock.

alter table public.cf_sessions add column if not exists allow_ask boolean not null default true;
alter table public.cf_sessions add column if not exists allow_hand boolean not null default true;
-- [{i: slide index, t: unix seconds}] appended whenever the board moves; reset when the lesson is switched
alter table public.cf_sessions add column if not exists slide_log jsonb not null default '[]'::jsonb;

create or replace function public.cf_slide_log() returns trigger language plpgsql as $$
begin
  if new.lesson_id is distinct from old.lesson_id then
    new.slide_log := jsonb_build_array(jsonb_build_object('i', new.current_slide, 't', extract(epoch from now())::bigint));
  elsif new.current_slide is distinct from old.current_slide and jsonb_array_length(old.slide_log) < 500 then
    new.slide_log := old.slide_log || jsonb_build_object('i', new.current_slide, 't', extract(epoch from now())::bigint);
  end if;
  return new;
end $$;
drop trigger if exists cf_slide_log_trg on public.cf_sessions;
create trigger cf_slide_log_trg before update on public.cf_sessions for each row execute function public.cf_slide_log();

create or replace function public.cf_set_rule(p_session uuid, p_rule text, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  if p_rule = 'ask' then update cf_sessions set allow_ask = p_on where id = p_session;
  elsif p_rule = 'hand' then
    update cf_sessions set allow_hand = p_on where id = p_session;
    if not p_on then update cf_participants set hand = false where session_id = p_session and hand; end if;
  else raise exception 'Белгісіз ереже'; end if;
end $$;

create or replace function public.cf_ask(p_session uuid, p_slide int, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare s cf_sessions; b text := btrim(coalesce(p_body, ''));
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or s.status = 'ended' or not cf_in(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  if not s.allow_ask then raise exception 'Мұғалім сұрақ қабылдауды өшірген'; end if;
  if char_length(b) < 1 or char_length(b) > 500 then raise exception 'Сұрақ 1-500 таңба болуы керек'; end if;
  if p_slide < 0 or p_slide > s.current_slide then raise exception 'Бұл слайд әлі ашылмаған'; end if;
  if (select count(*) from cf_questions where session_id = p_session and student_id = auth.uid()) >= 30 then
    raise exception 'Сұрақ саны шектен асты';
  end if;
  insert into cf_questions(session_id, student_id, slide_index, body) values (p_session, auth.uid(), p_slide, b);
end $$;

revoke all on function public.cf_set_rule(uuid, text, boolean) from public, anon;
grant execute on function public.cf_set_rule(uuid, text, boolean) to authenticated;
