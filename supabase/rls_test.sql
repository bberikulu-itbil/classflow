-- Access test for the homework layer. Run in the SQL editor on a database that has real teachers and students in two classes.
-- Everything is rolled back by the final exception; read the RESULT line. Any "FAIL" or "ALLOWED" is a bug.
-- Picks its own users, so no ids live in the repo.
do $$
declare
  t1 uuid; t2 uuid; s9 uuid; s8 uuid; c9 uuid;
  r text := ''; n int; crs uuid; un uuid; act uuid; asg uuid; wk cf_work; j jsonb; a2 text;
begin
  select id into t1 from profiles where role = 'teacher' and removed_at is null order by id limit 1;
  select id into t2 from profiles where role = 'teacher' and removed_at is null and id <> t1 order by id limit 1;
  select id, class_id into s9, c9 from profiles where role = 'student' and removed_at is null and class_id is not null order by id limit 1;
  select id into s8 from profiles where role = 'student' and removed_at is null and class_id is not null and class_id <> c9 order by id limit 1;
  if t1 is null or t2 is null or s9 is null or s8 is null then raise exception 'need 2 teachers and students in 2 classes'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', t1, 'role', 'authenticated')::text, true); set local role authenticated;
  insert into cf_courses(school_id, owner_id, title) values (my_school(), t1, 'TEST course') returning id into crs;
  insert into cf_units(course_id, title) values (crs, 'U1') returning id into un;
  act := cf_save_activity(null, un, 'code', 'TEST act', '{"prompt":"x"}',
    '[{"input":"","out":"hello","label":"a"},{"input":"","out":"secret","hidden":true,"label":"b"}]', null, 'SOLUTION', 10);
  perform cf_assign(act, array[c9]);
  select id into asg from cf_assignments where activity_id = act;

  reset role; perform set_config('request.jwt.claims', json_build_object('sub', s9, 'role', 'authenticated')::text, true); set local role authenticated;
  j := cf_activity(asg);
  r := r || format('S9 hiddenOutNull=%s noSolution=%s; ', (j->'checks'->1->'out') = 'null'::jsonb, position('SOLUTION' in j::text) = 0);
  select count(*) into n from cf_activity_keys; r := r || format('S9 keys=%s(0); ', n);
  select count(*) into n from cf_courses; r := r || format('S9 courses=%s(0); ', n);
  perform cf_hw_save(asg, 'print(1)', 0, 8);
  perform cf_hw_save(asg, 'print("hello from pasted text goes on and on and on and on and on and on and on and on and on")', 120, 0);
  wk := cf_hw_submit(asg, 'print("hello from pasted text goes on and on and on and on and on and on and on and on and on")', 1, 2);
  r := r || format('S9 status=%s points=%s(5); ', wk.status, wk.points);
  begin insert into cf_work(assignment_id, student_id, answer) values (asg, s9, 'x'); r := r || 'FAIL S9 direct insert; ';
  exception when others then r := r || 'ok direct insert denied; '; end;
  begin perform cf_hw_grade(wk.id, 10, 'finalized'); r := r || 'FAIL S9 grade; '; exception when others then r := r || 'ok S9 grade denied; '; end;

  reset role; perform set_config('request.jwt.claims', json_build_object('sub', s8, 'role', 'authenticated')::text, true); set local role authenticated;
  select count(*) into n from cf_work; r := r || format('S8 work=%s(0); ', n);
  select count(*) into n from cf_assignments; r := r || format('S8 assignments=%s(0); ', n);
  begin perform cf_activity(asg); r := r || 'FAIL S8 activity; '; exception when others then r := r || 'ok S8 activity denied; '; end;
  begin perform cf_hw_submit(asg, 'cheat', 1, 1); r := r || 'FAIL S8 submit; '; exception when others then r := r || 'ok S8 submit denied; '; end;

  reset role; perform set_config('request.jwt.claims', json_build_object('sub', t2, 'role', 'authenticated')::text, true); set local role authenticated;
  select count(*) into n from cf_work; r := r || format('T2 work=%s(0 unless deputy); ', n);
  select count(*) into n from cf_activity_keys; r := r || format('T2 keys=%s(0 unless deputy); ', n);
  begin perform cf_hw_review(asg); r := r || 'T2 review ALLOWED; '; exception when others then r := r || 'ok T2 review denied; '; end;
  begin perform cf_save_activity(act, un, 'code', 'hijack', '{}', '[]', null, null, 1); r := r || 'T2 edit ALLOWED; '; exception when others then r := r || 'ok T2 edit denied; '; end;

  reset role; perform set_config('request.jwt.claims', json_build_object('sub', t1, 'role', 'authenticated')::text, true); set local role authenticated;
  select count(*) into n from cf_integrity_flags; r := r || format('T1 flags=%s(1); ', n);
  perform cf_hw_grade(wk.id, 7, 'finalized', 'ok');

  reset role; perform set_config('request.jwt.claims', json_build_object('sub', s9, 'role', 'authenticated')::text, true); set local role authenticated;
  perform cf_hw_save(asg, 'changed after grading');
  select answer into a2 from cf_work where id = wk.id; r := r || format('S9 answerKeptAfterFinal=%s; ', a2 like 'print("hello%');
  begin perform cf_hw_submit(asg, 'again', 2, 2); r := r || 'FAIL resubmit after final; '; exception when others then r := r || 'ok resubmit denied; '; end;

  reset role; set local role anon;
  begin perform count(*) from cf_courses; r := r || 'FAIL anon table; '; exception when others then r := r || 'ok anon table denied; '; end;
  begin perform cf_activity(asg); r := r || 'FAIL anon rpc; '; exception when others then r := r || 'ok anon rpc denied; '; end;
  reset role;
  raise exception 'RESULT: %', r;
end $$;
