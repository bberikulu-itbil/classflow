-- Exam tasks with variants (БЖБ): a task slide may carry `xvariants` [{accept, explanation}] (server only) and `xtext`
-- [{prompt, widget?, match?}] per language (what the student sees). The student's variant is cf_qvariant(uid, slide, n), as for tests.
-- `partial: true` (matching) gives a share of the points per right letter.

create or replace function cf_strip_one(x jsonb, st boolean) returns jsonb
language plpgsql immutable set search_path = public as $$
begin
  x := x - 'answer' - 'notes' - 'explanation' - 'accept' - 'qvariants' - 'xvariants';
  if st then x := x - 'tests'; end if;
  if jsonb_typeof(x->'levels') = 'array' then
    x := jsonb_set(x, '{levels}', coalesce((
      select jsonb_agg(l || jsonb_build_object('variants', coalesce((
        select jsonb_agg(v - 'accept' - 'explanation') from jsonb_array_elements(coalesce(l->'variants', '[]'::jsonb)) v), '[]'::jsonb)))
      from jsonb_array_elements(x->'levels') l), '[]'::jsonb));
  end if;
  if jsonb_typeof(x->'criteria') = 'array' then
    x := jsonb_set(x, '{criteria}', coalesce((select jsonb_agg(c - 'accept') from jsonb_array_elements(x->'criteria') c), '[]'::jsonb));
  end if;
  return x;
end $$;

create or replace function cf_exam_get(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare l cf_lessons; e cf_exams; c cf_curr_courses; s jsonb; res jsonb := '[]'; i int := 0; n int; vi int; q jsonb; lng text;
begin
  select cc.* into c from cf_curr_lessons cl join cf_curr_modules m on m.id = cl.module_id join cf_curr_courses cc on cc.id = m.course_id
    where cl.lesson_id = p_lesson and cl.exam and cf_course_open(cc);
  if c.id is null then raise exception 'Емтихан табылмады'; end if;
  e := cf_exam_now(p_lesson);
  if e.id is null then raise exception 'Емтихан әзірге жабық'; end if;
  if exists (select 1 from cf_exam_results r where r.exam_id = e.id and r.student_id = auth.uid()) then raise exception 'Емтихан тапсырылған'; end if;
  select * into l from cf_lessons where id = p_lesson;
  for s in select x from jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) x loop
    q := cf_strip_slide(s, true);
    if jsonb_typeof(s->'qvariants') = 'array' and jsonb_array_length(s->'qvariants') > 0 then
      n := jsonb_array_length(s->'qvariants'); vi := ascii(cf_qvariant(auth.uid(), i, n)) - 65;
      q := q || jsonb_build_object('prompt', s->'qvariants'->vi->'prompt', 'options', s->'qvariants'->vi->'options', 'variant', chr(65 + vi));
      foreach lng in array array['ru','en'] loop
        if jsonb_typeof(s->lng->'qtext') = 'array' then
          q := jsonb_set(q, array[lng], coalesce(q->lng, '{}') || jsonb_build_object('prompt', s->lng->'qtext'->vi->'prompt', 'options', s->lng->'qtext'->vi->'options'));
        end if;
      end loop;
    end if;
    if jsonb_typeof(s->'xtext') = 'array' and jsonb_array_length(s->'xtext') > 0 then
      n := jsonb_array_length(s->'xtext'); vi := ascii(cf_qvariant(auth.uid(), i, n)) - 65;
      q := q || (s->'xtext'->vi) || jsonb_build_object('variant', chr(65 + vi));
      foreach lng in array array['ru','en'] loop
        if jsonb_typeof(s->lng->'xtext') = 'array' then q := jsonb_set(q, array[lng], (coalesce(q->lng, '{}') - 'xtext') || (s->lng->'xtext'->vi)); end if;
      end loop;
    end if;
    res := res || jsonb_build_array(q - 'qtext' - 'xtext');
    i := i + 1;
  end loop;
  return jsonb_build_object('exam_id', e.id, 'title', l.title, 'closes_at', e.closes_at, 'slides', res);
end $$;

create or replace function cf_exam_submit(p_lesson uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare l cf_lessons; e cf_exams; s jsonb; i int := 0; n int; key text; a text; pts int; got int := 0; mx int := 0; ok boolean; det jsonb := '[]';
  acc jsonb; part int; hit int; j int;
begin
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Жауап пішімі қате'; end if;
  select * into e from cf_exams x where x.lesson_id = p_lesson and x.opens_at <= now() and (x.closes_at is null or x.closes_at > now() - interval '30 seconds')
    and (x.class_id is null or x.class_id = (select p.class_id from profiles p where p.id = auth.uid()))
    and exists (select 1 from cf_curr_lessons cl join cf_curr_modules m on m.id = cl.module_id join cf_curr_courses cc on cc.id = m.course_id
                where cl.lesson_id = p_lesson and cl.exam and cf_course_open(cc))
  order by x.opens_at desc limit 1;
  if e.id is null then raise exception 'Емтихан жабық'; end if;
  if exists (select 1 from cf_exam_results r where r.exam_id = e.id and r.student_id = auth.uid()) then raise exception 'Емтихан тапсырылған'; end if;
  select * into l from cf_lessons where id = p_lesson;
  for s in select x from jsonb_array_elements(coalesce(l.slides, '[]'::jsonb)) x loop
    pts := coalesce((s->>'points')::int, 1); a := left(trim(coalesce(p_answers->>i::text, '')), 2000); key := null; ok := null; part := null;
    if s->>'type' = 'quiz' then
      if jsonb_typeof(s->'qvariants') = 'array' and jsonb_array_length(s->'qvariants') > 0 then
        n := jsonb_array_length(s->'qvariants'); key := s->'qvariants'->(ascii(cf_qvariant(auth.uid(), i, n)) - 65)->>'answer';
      else key := s->>'answer'; end if;
      if key is not null then ok := (a = key); end if;
    elsif s->>'type' = 'task' and jsonb_typeof(s->'xvariants') = 'array' and jsonb_array_length(s->'xvariants') > 0 then
      n := jsonb_array_length(s->'xvariants'); acc := s->'xvariants'->(ascii(cf_qvariant(auth.uid(), i, n)) - 65)->'accept';
      ok := exists (select 1 from jsonb_array_elements_text(acc) x where replace(lower(trim(x)), ' ', '') = replace(lower(a), ' ', ''));
      if coalesce((s->>'partial')::boolean, false) and not ok then -- matching: a point share per right letter
        key := upper(acc->>0); hit := 0;
        for j in 1 .. length(key) loop if upper(substr(replace(a, ' ', ''), j, 1)) = substr(key, j, 1) then hit := hit + 1; end if; end loop;
        part := (pts * hit) / greatest(length(key), 1);
      end if;
    elsif s->>'type' = 'task' and jsonb_array_length(coalesce(s->'accept', '[]'::jsonb)) > 0 then
      ok := exists (select 1 from jsonb_array_elements_text(s->'accept') x where lower(trim(x)) = lower(a));
    end if;
    if ok is not null then
      mx := mx + pts; part := case when ok then pts else coalesce(part, 0) end; got := got + part;
      det := det || jsonb_build_array(jsonb_build_object('i', i, 'ok', ok, 'pts', part, 'max', pts));
    end if;
    i := i + 1;
  end loop;
  insert into cf_exam_results(exam_id, school_id, lesson_id, student_id, answers, detail, points, max_points)
    values (e.id, e.school_id, p_lesson, auth.uid(), p_answers, det, got, mx);
  return jsonb_build_object('points', got, 'max', mx);
end $$;

