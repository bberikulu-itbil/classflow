-- Бір бет есептеріне шешім бөлімінің жасырын белгісін қосу.
-- Идемпотентті: белгі бұрын бар болса, қайта қоспайды.

update public.cf_lessons l
set slides = q.slides,
    updated_at = now()
from (
  select l2.id,
         jsonb_agg(
           case
             when coalesce(x.item->>'problemPage','false') = 'true'
               and coalesce(x.item->>'prompt','') not like '%Есептің шешімі (жасырын)%'
             then jsonb_set(
                    jsonb_set(
                      x.item,
                      '{prompt}',
                      to_jsonb((x.item->>'prompt') || chr(10) || chr(10) || 'Есептің шешімі (жасырын)'),
                      true
                    ),
                    '{solutionLabel}',
                    to_jsonb('Есептің шешімі (жасырын)'::text),
                    true
                  )
             when coalesce(x.item->>'problemPage','false') = 'true'
               and x.item->'solutionLabel' is null
             then jsonb_set(x.item, '{solutionLabel}', to_jsonb('Есептің шешімі (жасырын)'::text), true)
             else x.item
           end
           order by x.ord
         ) as slides
  from public.cf_lessons l2,
       jsonb_array_elements(coalesce(l2.slides, '[]'::jsonb)) with ordinality as x(item, ord)
  where l2.title in (
    'Алгебра и геометрия',
    'Цикл с постусловием (do ... while)',
    'Символьный тип (char)',
    'Бинарный поиск'
  )
  group by l2.id
) q
where l.id = q.id;

