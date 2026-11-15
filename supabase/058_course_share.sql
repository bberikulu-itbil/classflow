-- Курсты оқушыларға көрсету. Safe to run twice. Needs 008, 012, 036(өзі қосылады), 041 (cf_strip_slide).
--   cf_curr_courses.shared : мұғалім курсты оқушыларға ашады (әдепкі: жабық). Курстың параллелі (grade) бар болса, тек сол параллельдің оқушылары көреді;
--                            параллелі жоқ курс (мысалы олимпиада, робототехника) мектептің барлық оқушысына көрінеді.
--   cf_student_courses()   : оқушыға ашық курстар -> модульдер -> дәрістер (тек атаулары).
--   cf_course_lesson(id)   : ашық курстағы дәрістің беттері; жауап, мұғалім ескертпесі, тест жауаптары алынып тасталады (cf_strip_slide).
-- Оқушы cf_curr_* / cf_lessons кестелерін тікелей оқи алмайды (RLS: тек қызметкер), тек осы екі функция арқылы.
-- shortcut: оқушының тапсырма жауабын осы көріністе тексермейміз (оқуға ғана); үлгерім/прогресс жоқ.

alter table cf_curr_courses add column if not exists description text;
alter table cf_curr_courses add column if not exists cover_url text;
alter table cf_curr_courses add column if not exists instructor text;
alter table cf_curr_courses add column if not exists level text;
alter table cf_curr_courses add column if not exists shared boolean not null default false;

create or replace function cf_course_open(c cf_curr_courses) returns boolean
language sql stable security definer set search_path = public as $$
  select c.shared and c.school_id = my_school() and (is_staff() or c.grade is null
    or c.grade = (select cl.grade from profiles p join classes cl on cl.id = p.class_id where p.id = auth.uid())) $$;

create or replace function cf_student_courses() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'title', c.title, 'subject', c.subject, 'grade', c.grade, 'description', c.description, 'cover_url', c.cover_url, 'instructor', c.instructor, 'level', c.level,
    'modules', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'title', m.title, 'kind', m.kind, 'quarter', m.quarter,
        'lessons', (select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title,
            'n', case when jsonb_typeof(l.slides) = 'array' then jsonb_array_length(l.slides) else 0 end) order by cl.position), '[]'::jsonb)
          from cf_curr_lessons cl join cf_lessons l on l.id = cl.lesson_id where cl.module_id = m.id)) order by m.position), '[]'::jsonb)
      from cf_curr_modules m where m.course_id = c.id)) order by c.created_at), '[]'::jsonb)
  from cf_curr_courses c where cf_course_open(c) $$;

create or replace function cf_course_lesson(p_lesson uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare l cf_lessons;
begin
  select x.* into l from cf_lessons x join cf_curr_lessons cl on cl.lesson_id = x.id join cf_curr_modules m on m.id = cl.module_id
    join cf_curr_courses c on c.id = m.course_id where x.id = p_lesson and cf_course_open(c);
  if not found then raise exception 'Құқығыңыз жоқ'; end if;
  return jsonb_build_object('title', l.title, 'slides', case when jsonb_typeof(l.slides) = 'array'
    then (select coalesce(jsonb_agg(cf_strip_slide(s, true) order by o), '[]'::jsonb) from jsonb_array_elements(l.slides) with ordinality t(s, o)) else '[]'::jsonb end);
end $$;

revoke all on function cf_course_open(cf_curr_courses), cf_student_courses(), cf_course_lesson(uuid) from public, anon, authenticated;
grant execute on function cf_student_courses(), cf_course_lesson(uuid) to authenticated;
