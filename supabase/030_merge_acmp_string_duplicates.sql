-- ACMP курсіндегі String сабағының қайталанған орысша жазбасын алып,
-- толық қазақша/орысша мазмұны бар «Жол түрі (string)» сабағын қалдырады.
-- Бұл операция тек дәл осы курс пен дәл осы екі атауға әсер етеді.

do $acmp_merge_string_duplicates$
declare
  v_owner uuid;
  v_keep uuid;
  v_duplicate uuid;
begin
  select c.owner_id into v_owner
  from public.cf_curr_courses c
  where c.id = 'dbe60970-1fa6-4a8a-a65e-051d20cfd278'
    and c.title = 'ACMP: Язык программирования C++';

  if v_owner is null then
    raise exception 'ACMP курсы табылмады';
  end if;

  select l.id into v_keep
  from public.cf_lessons l
  where l.owner_id = v_owner
    and l.title = 'Жол түрі (string)'
  order by l.updated_at desc nulls last
  limit 1;

  if v_keep is null then
    raise exception 'Негізгі «Жол түрі (string)» сабағы табылмады';
  end if;

  for v_duplicate in
    select l.id
    from public.cf_lessons l
    where l.owner_id = v_owner
      and l.title = 'Строковый тип (string)'
      and l.id <> v_keep
  loop
    -- Дубликат курс картасында тұрса, алдымен оның байланысын өшіреміз.
    delete from public.cf_curr_lessons
    where lesson_id = v_duplicate;

    -- Негізгі сабақ cf_lessons ішінде сақталады; дубликаттың өзі өшіріледі.
    delete from public.cf_lessons
    where id = v_duplicate;
  end loop;
end;
$acmp_merge_string_duplicates$;
