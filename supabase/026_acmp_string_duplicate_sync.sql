-- ACMP String дәрісінің бұрынғы орысша атаумен жасалған дубль жазбасын
-- толық жаңартылған мазмұнмен синхрондау.

do $acmp_string_duplicate_sync$
declare
  v_owner uuid;
  v_source uuid;
begin
  select c.owner_id into v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  select l.id into v_source
  from public.cf_lessons l
  where l.owner_id = v_owner and l.title = 'Жол түрі (string)'
  limit 1;

  update public.cf_lessons target
  set slides = source.slides,
      plan = source.plan,
      terms = source.terms,
      updated_at = now()
  from public.cf_lessons source
  where source.id = v_source
    and target.owner_id = v_owner
    and target.title = 'Строковый тип (string)';
end;
$acmp_string_duplicate_sync$;
