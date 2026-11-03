-- 043: the teacher may let students look back at the slides already shown (first page .. the slide on the board). Off by default.
-- A student sees a slide with the same stripping as cf_slide (no answers, no notes), never one beyond the board.

alter table cf_sessions add column if not exists student_nav boolean not null default false;

create or replace function cf_set_nav(p_session uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not cf_teaches(p_session) then raise exception 'Құқығыңыз жоқ'; end if;
  update cf_sessions set student_nav = p_on where id = p_session;
end $$;

create or replace function cf_slide_at(p_session uuid, p_index int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s cf_sessions; sl jsonb; chk jsonb;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or not (cf_teaches(p_session) or cf_in(p_session)) then raise exception 'Құқығыңыз жоқ'; end if;
  if not cf_teaches(p_session) and not (s.student_nav and p_index >= 0 and p_index <= s.current_slide) then raise exception 'Мұғалім қайта қарауға рұқсат бермеген'; end if;
  select slides -> p_index into sl from cf_session_private where session_id = p_session;
  if sl is null then return null; end if;
  sl := cf_strip_slide(sl, false);
  if jsonb_typeof(sl->'tests') = 'array' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'input', coalesce(t->>'input',''),
      'label', coalesce(t->>'label',''),
      'hidden', coalesce((t->>'hidden')::boolean, false),
      'out', case when coalesce((t->>'hidden')::boolean, false) then null else t->>'out' end,
      'h', encode(sha256(convert_to(cf_norm(t->>'out'), 'UTF8')), 'hex'))), '[]'::jsonb)
    into chk from jsonb_array_elements(sl->'tests') t;
    sl := (sl - 'tests') || jsonb_build_object('checks', chk);
  end if;
  return jsonb_build_object('index', p_index, 'slide', sl);
end $$;

revoke all on function cf_set_nav(uuid, boolean), cf_slide_at(uuid, int) from public, anon;
grant execute on function cf_set_nav(uuid, boolean), cf_slide_at(uuid, int) to authenticated;
