-- 086: every student of a class gets their own combination of exam variants.
-- 074 picked each task's variant by a hash of (student, slide): two students could get the same combination.
-- Now the first three variant tasks take the digits of the student's place in the class roster (mixed radix over those
-- tasks' variant counts), so up to n1·n2·n3 students (64 with 4 variants each) all differ; later tasks keep the hash.
-- A per-lesson offset rotates which variant comes first. Students without a class keep the hash for every task.
create or replace function public.cf_exam_pick(u uuid, p_lesson uuid, slide int, n int)
returns int language plpgsql stable security definer set search_path to 'public' as $$
declare sl jsonb; x jsonb; i int := 0; t int := 0; base bigint := 1; m int; cls uuid; k int;
begin
  if n <= 1 then return 0; end if;
  select slides into sl from cf_lessons where id = p_lesson;
  for x in select v from jsonb_array_elements(coalesce(sl, '[]'::jsonb)) v loop
    exit when i >= slide;
    m := greatest(case when jsonb_typeof(x->'qvariants') = 'array' then jsonb_array_length(x->'qvariants') else 0 end,
                  case when jsonb_typeof(x->'xtext') = 'array' then jsonb_array_length(x->'xtext') else 0 end);
    if m > 1 then t := t + 1; if t <= 3 then base := base * m; end if; end if;
    i := i + 1;
  end loop;
  if t < 3 then
    select class_id into cls from profiles where id = u;
    if cls is not null then
      select z.r - 1 into k from (select p.id, row_number() over (order by p.id) r from profiles p where p.class_id = cls and p.role = 'student') z where z.id = u;
      if k is not null then
        return (((k / base) % n) + (('x' || substr(md5(p_lesson::text || ':' || t), 1, 8))::bit(32)::bigint % n)::int) % n;
      end if;
    end if;
  end if;
  return ascii(cf_exam_variant(u, slide, n)) - 65;
end $$;
revoke all on function public.cf_exam_pick(uuid, uuid, int, int) from public, anon;

-- cf_exam_get / cf_exam_submit: same bodies as 074, with cf_exam_pick in place of the hash; the result also keeps
-- the variant letter of every task (detail[].v) so the teacher sees which variant a student had.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.cf_exam_get(uuid)'::regprocedure);
  d := replace(d, 'ascii(cf_exam_variant(auth.uid(), i, n)) - 65', 'cf_exam_pick(auth.uid(), p_lesson, i, n)');
  if d like '%cf_exam_variant%' then raise exception 'cf_exam_get: replace failed'; end if;
  execute d;
  d := pg_get_functiondef('public.cf_exam_submit(uuid, jsonb)'::regprocedure);
  d := replace(d, 'acc jsonb; part int; hit int; j int;', 'acc jsonb; part int; hit int; j int; vl text;');
  d := replace(d, 'key := null; ok := null; part := null;', 'key := null; ok := null; part := null; vl := null;');
  d := replace(d, 'key := s->''qvariants''->(ascii(cf_exam_variant(auth.uid(), i, n)) - 65)->>''answer'';',
                  'vl := chr(65 + cf_exam_pick(auth.uid(), p_lesson, i, n)); key := s->''qvariants''->(ascii(vl) - 65)->>''answer'';');
  d := replace(d, 'acc := s->''xvariants''->(ascii(cf_exam_variant(auth.uid(), i, n)) - 65)->''accept'';',
                  'vl := chr(65 + cf_exam_pick(auth.uid(), p_lesson, i, n)); acc := s->''xvariants''->(ascii(vl) - 65)->''accept'';');
  d := replace(d, 'jsonb_build_object(''i'', i, ''ok'', ok, ''pts'', part, ''max'', pts)', 'jsonb_strip_nulls(jsonb_build_object(''i'', i, ''ok'', ok, ''pts'', part, ''max'', pts, ''v'', vl))');
  if d like '%cf_exam_variant%' or d not like '%''v'', vl%' then raise exception 'cf_exam_submit: replace failed'; end if;
  execute d;
end $$;
