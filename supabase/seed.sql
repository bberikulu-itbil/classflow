-- Demo content for ONE teacher: a course with three activities (code with a hidden test, quiz, short task). No student data:
-- students are real KeyToLife accounts; use the app with ?demo=teacher for fake students.
-- Usage: replace the e-mail, run in the SQL editor. Safe to run once; it does not assign anything.
do $$
declare t uuid; crs uuid; un uuid;
begin
  select p.id into t from profiles p join auth.users u on u.id = p.id where u.email = 'teacher@example.com' and p.role in ('teacher','admin');
  if t is null then raise exception 'Set the teacher e-mail first'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', t, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into cf_courses(school_id, owner_id, title, subject, grade) values (my_school(), t, 'Python негіздері (демо)', 'informatics', 8) returning id into crs;
  insert into cf_units(course_id, title) values (crs, '1-тарау. Енгізу және шығару') returning id into un;
  perform cf_save_activity(null, un, 'code', 'Сәлем, әлем', '{"prompt":"Экранға Сәлем, әлем! деп шығарыңыз.","starter":"# мұнда жазыңыз\n"}',
    '[{"input":"","out":"Сәлем, әлем!","label":"шығару"},{"input":"","out":"Сәлем, әлем!","label":"жасырын","hidden":true}]', null, 'print("Сәлем, әлем!")', 5);
  perform cf_save_activity(null, un, 'quiz', 'print() не істейді?', '{"prompt":"print() не істейді?","options":["Басып шығарады","Сақтайды","Өшіреді"]}', '[]', '0', null, 2);
  perform cf_save_activity(null, un, 'task', 'Айнымалы дегеніміз не?', '{"prompt":"Өз сөзіңмен түсіндір."}', '[]', null, null, 3);
  reset role;
end $$;
