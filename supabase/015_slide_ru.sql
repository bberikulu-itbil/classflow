-- Bilingual slides: a slide may carry a `ru` block (fields shown instead of the Kazakh ones).
-- Students must not receive answers through it either, so cf_slide strips the secret keys inside `ru` too.
create or replace function public.cf_slide(p_session uuid)
 returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare s cf_sessions; sl jsonb; chk jsonb;
begin
  select * into s from cf_sessions where id = p_session;
  if s.id is null or not (cf_teaches(p_session) or cf_in(p_session)) then raise exception 'Құқығыңыз жоқ'; end if;
  select slides -> s.current_slide into sl from cf_session_private where session_id = p_session;
  if sl is null then return null; end if;
  sl := sl - 'answer' - 'notes' - 'explanation' - 'accept';
  if jsonb_typeof(sl->'ru') = 'object' then
    sl := jsonb_set(sl, '{ru}', (sl->'ru') - 'answer' - 'notes' - 'explanation' - 'accept');
  end if;
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
  return jsonb_build_object('index', s.current_slide, 'slide', sl);
end $function$;
