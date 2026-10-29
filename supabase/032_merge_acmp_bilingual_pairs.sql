-- Merge the Russian/Kazakh copies of the two ACMP lessons into one bilingual lesson.
-- Keep the Kazakh lesson because its slides already contain the `ru` translation blocks.
do $$
declare
  v_drop_string uuid;
  v_drop_systems uuid;
begin
  -- The exact ids make this migration deterministic for the seeded ACMP course.
  select id into v_drop_string from public.cf_lessons where id = '5970d78f-6418-4d27-871b-d971a1ea2858'::uuid;
  select id into v_drop_systems from public.cf_lessons where id = '311c7a4d-3aaa-41a3-afb2-c62abe2d8059'::uuid;

  if v_drop_string is not null then
    delete from public.cf_curr_lessons where lesson_id = v_drop_string;
    delete from public.cf_lessons where id = v_drop_string;
  end if;
  if v_drop_systems is not null then
    delete from public.cf_curr_lessons where lesson_id = v_drop_systems;
    delete from public.cf_lessons where id = v_drop_systems;
  end if;
end $$;
