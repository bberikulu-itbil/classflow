-- Scenario for supabase/038 on the stub schema: pair + L1-L3 + A/B + regression of plain tasks. Ends with RAISE TESTRESULT so nothing persists. Read the result line: every *(BAD) marker would be a failure.
do $t$
declare
  cls uuid; sch uuid; teacher uuid; sid uuid := gen_random_uuid();
  studs uuid[]; host uuid; partner uuid; solo uuid; solo2 uuid;
  t1 cf_tasks; tk cf_tasks; sub cf_submissions; out text := ''; n int; v text; r jsonb;
  slides jsonb := '[
   {"type":"task","title":"P","prompt":"intro","kind":"practice","levels":[
     {"lv":1,"points":2,"variants":[{"v":"A","prompt":"a1","accept":["10"]},{"v":"B","prompt":"b1","accept":["20"]}]},
     {"lv":2,"points":3,"variants":[{"v":"A","prompt":"a2","accept":["x"]},{"v":"B","prompt":"b2","accept":["y"]}]}]},
   {"type":"task","title":"Plain","prompt":"q","accept":["42"],"points":5}]';
  function_ok boolean;
begin
  select class_id, school_id into cls, sch from profiles where role::text='student' and removed_at is null and class_id is not null
    group by class_id, school_id having count(*) >= 4 limit 1;
  select id into teacher from profiles where school_id = sch and role::text in ('teacher','admin','deputy') order by role::text limit 1;
  select array_agg(id) into studs from (select id from profiles where class_id = cls and role::text='student' and removed_at is null order by id limit 4) x;
  host := studs[1]; partner := studs[2]; solo := studs[3]; solo2 := studs[4];
  insert into cf_sessions(id, school_id, teacher_id, class_id, title, join_code, status, current_slide, slide_count)
    values (sid, sch, teacher, cls, 'TEST', 'ZZ'||floor(random()*9000+1000)::text, 'live', 0, 2);
  insert into cf_session_private(session_id, slides) values (sid, slides);
  insert into cf_participants(session_id, student_id, full_name, att, presence) select sid, p.id, p.full_name, 'present','online' from profiles p where p.id in (host, solo, solo2);

  perform set_config('request.jwt.claims', json_build_object('sub', teacher, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', teacher::text, true);
  perform cf_pair_set(sid, host, partner);
  select count(*) into n from cf_pairs where session_id = sid; out := out || 'pairs=' || n || '; ';
  select count(*) into n from cf_participants where session_id = sid and student_id = partner; out := out || 'partner_part=' || n || '; ';
  t1 := cf_open_task(sid, 0);
  select count(*) into n from cf_tasks where session_id = sid and level is not null; out := out || 'level_tasks=' || n || '; ';

  -- slide leak check as student
  perform set_config('request.jwt.claims', json_build_object('sub', solo, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', solo::text, true);
  r := cf_slide(sid);
  out := out || 'leak=' || (r::text like '%accept%') || '; ';

  -- HOST
  perform set_config('request.jwt.claims', json_build_object('sub', host, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', host::text, true);
  begin perform cf_submit((select id from cf_tasks where session_id=sid and level=2 and variant='A'), 'x'); out := out || 'HOST_L2_BEFORE=ALLOWED(BAD); ';
  exception when others then out := out || 'host_L2_blocked=' || sqlerrm || '; '; end;
  sub := cf_submit((select id from cf_tasks where session_id=sid and level=1 and variant='A'), 'nope'); out := out || 'L1A_wrong_ok=' || coalesce(sub.is_correct::text,'null') || '; ';
  sub := cf_submit((select id from cf_tasks where session_id=sid and level=1 and variant='A'), '10'); out := out || 'L1A_right=' || sub.is_correct || '/' || sub.points || '; ';
  begin perform cf_submit((select id from cf_tasks where session_id=sid and level=2 and variant='A'), 'x'); out := out || 'HOST_L2_AFTER_A_ONLY=ALLOWED(BAD); ';
  exception when others then out := out || 'host_needs_both=' || sqlerrm || '; '; end;
  sub := cf_submit((select id from cf_tasks where session_id=sid and level=1 and variant='B'), '20');
  sub := cf_submit((select id from cf_tasks where session_id=sid and level=2 and variant='A'), 'x'); out := out || 'L2A_after_both=' || sub.is_correct || '; ';
  select count(*) into n from cf_submissions where session_id = sid and student_id = partner; out := out || 'partner_subs=' || n || '; ';
  select coalesce(sum(points),0) into n from cf_scores where session_id=sid and student_id=partner; out := out || 'partner_pts=' || n || '; ';
  select coalesce(sum(points),0) into n from cf_scores where session_id=sid and student_id=host; out := out || 'host_pts=' || n || '; ';
  begin perform cf_submit((select id from cf_tasks where session_id=sid and level=2 and variant='A'), 'x'); out := out || 'resubmit_correct=ALLOWED(BAD); ';
  exception when others then out := out || 'resubmit=' || sqlerrm || '; '; end;

  -- PARTNER cannot send
  perform set_config('request.jwt.claims', json_build_object('sub', partner, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', partner::text, true);
  begin perform cf_submit((select id from cf_tasks where session_id=sid and level=1 and variant='A'), '10'); out := out || 'PARTNER_SENT(BAD); ';
  exception when others then out := out || 'partner_blocked=' || sqlerrm || '; '; end;

  -- SOLO
  perform set_config('request.jwt.claims', json_build_object('sub', solo, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', solo::text, true);
  v := cf_my_variant(sid, 0, 1, t1.opened_at, solo); out := out || 'solo_variant=' || v || '; ';
  begin perform cf_submit((select id from cf_tasks where session_id=sid and level=1 and variant = case when v='A' then 'B' else 'A' end), '10'); out := out || 'SOLO_OTHER_VARIANT_ALLOWED(BAD); ';
  exception when others then out := out || 'solo_other_blocked=' || sqlerrm || '; '; end;
  begin perform cf_submit((select id from cf_tasks where session_id=sid and level=2 and variant=v), 'x'); out := out || 'SOLO_L2_EARLY(BAD); ';
  exception when others then out := out || 'solo_L2_blocked; '; end;
  sub := cf_submit((select id from cf_tasks where session_id=sid and level=1 and variant=v), case when v='A' then '10' else '20' end); out := out || 'solo_L1=' || sub.is_correct || '; ';
  sub := cf_submit((select id from cf_tasks where session_id=sid and level=2 and variant=v), case when v='A' then 'x' else 'y' end); out := out || 'solo_L2=' || sub.is_correct || '; ';

  -- TEACHER manual grade unlock path, close batch
  perform set_config('request.jwt.claims', json_build_object('sub', teacher, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', teacher::text, true);
  perform cf_close_task(t1.id);
  select count(*) into n from cf_tasks where session_id=sid and level is not null and status='closed'; out := out || 'closed_batch=' || n || '; ';

  -- regression: plain task
  t1 := cf_open_task(sid, 1);
  perform set_config('request.jwt.claims', json_build_object('sub', solo2, 'role','authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', solo2::text, true);
  sub := cf_submit(t1.id, '42'); out := out || 'plain=' || sub.is_correct || '/' || sub.points || '; ';
  begin perform cf_submit(t1.id, '42'); out := out || 'PLAIN_RESUBMIT_ALLOWED(BAD); ';
  exception when others then out := out || 'plain_resubmit=' || sqlerrm || '; '; end;

  raise exception 'TESTRESULT: %', out;
end $t$;
