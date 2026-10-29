-- Жасыл ACMP интерфейсіндегі скриншоттарға тәуелділікті алып тастайды.
-- Негізгі PNG файлдары сол атаулармен таза оқу диаграммаларына ауыстырылды.
-- ACMP есептер картасы үшін бөлек, скриншотсыз карта қолданылады.

do $acmp_replace_string_visual_refs$
declare
  v_owner uuid;
  v_lesson record;
  v_slides jsonb;
begin
  select c.owner_id into v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  if v_owner is null then
    raise exception 'ACMP курсы табылмады';
  end if;

  for v_lesson in
    select l.id, l.title
    from public.cf_lessons l
    where l.owner_id = v_owner
      and l.title in ('Жол түрі (string)', 'Строковый тип (string)')
  loop
    select coalesce(
      jsonb_agg(
        case
          when slide->>'img' = 'lec/string-methods-example.png'
            and (
              lower(coalesce(slide->>'title', '')) like '%acmp%'
              or lower(coalesce(slide->>'title', '')) like '%есеп%'
              or lower(coalesce(slide->>'title', '')) like '%задач%'
            )
          then jsonb_set(
            jsonb_set(
              slide,
              '{img}',
              to_jsonb('lec/string-acmp-map.png'::text),
              true
            ),
            '{alt}',
            to_jsonb('ACMP string есептерінің таза визуалды картасы'::text),
            true
          )
          else slide
        end
        order by ord
      ),
      '[]'::jsonb
    )
    into v_slides
    from jsonb_array_elements(
      case
        when jsonb_typeof((select slides from public.cf_lessons where id = v_lesson.id)) = 'array'
          then (select slides from public.cf_lessons where id = v_lesson.id)
        else '[]'::jsonb
      end
    ) with ordinality as rows(slide, ord);

    update public.cf_lessons
    set slides = v_slides,
        updated_at = now()
    where id = v_lesson.id;
  end loop;
end;
$acmp_replace_string_visual_refs$;
