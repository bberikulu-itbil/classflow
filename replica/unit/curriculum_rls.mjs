// RLS check of supabase/007_gradebook.sql in PGlite. Run from a folder that has @electric-sql/pglite: node gb.mjs <path to 007_gradebook.sql>
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
await db.exec(`
 create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
 create role anon; create role authenticated;
 create table schools(id uuid primary key default gen_random_uuid());
 create table cf_lessons(id uuid primary key default gen_random_uuid(), owner_id uuid, title text);
 create table classes(id uuid primary key default gen_random_uuid(), school_id uuid references schools(id), name text);
 create table profiles(id uuid primary key, school_id uuid references schools(id), role text);
 create function my_school() returns uuid language sql stable security definer as $$ select school_id from profiles where id = auth.uid() $$;
 create function is_staff() returns boolean language sql stable security definer as $$ select exists(select 1 from profiles where id = auth.uid() and role in ('teacher','admin')) $$;
 grant usage on schema public to authenticated, anon; grant usage on schema auth to authenticated, anon;
 grant select on cf_lessons, profiles, schools, classes to authenticated; grant execute on all functions in schema public to authenticated;
 insert into schools values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000a2');
 insert into classes values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','7A'),('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a2','7Z');
 insert into profiles values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','teacher'),
   ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','teacher'),
   ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','student'),
   ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a2','teacher'),
   ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000a2','student');`);

const sql = fs.readFileSync(process.argv[2], 'utf8');
await db.exec(sql); await db.exec(sql); console.log('migration runs twice: ok');
const as = async (u, q, p=[]) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${u}',false); set role authenticated;`); try { return (await db.query(q,p)).rows; } catch(e){ return 'ERR: '+e.message.split('\n')[0]; } finally { await db.exec('reset role'); } };
const T1='00000000-0000-0000-0000-000000000001',T2='00000000-0000-0000-0000-000000000002',S='00000000-0000-0000-0000-000000000003',T4='00000000-0000-0000-0000-000000000004';
const A1='00000000-0000-0000-0000-0000000000a1',A2='00000000-0000-0000-0000-0000000000a2';
await db.exec(`insert into cf_lessons(id,owner_id,title) values ('00000000-0000-0000-0000-00000000001a','${T1}','mine'),('00000000-0000-0000-0000-00000000002a','${T2}','theirs')`);
const L1='00000000-0000-0000-0000-00000000001a',L2='00000000-0000-0000-0000-00000000002a';
let bad = 0; const expect = (n, v, ok) => { const pass = ok(v); if (!pass) bad++; console.log((pass ? 'PASS ' : 'FAIL ') + n.padEnd(54), JSON.stringify(v)); };
const isErr = v => typeof v === 'string' && v.startsWith('ERR'), rows = n => v => Array.isArray(v) && v.length === n;
const course = (u, owner, school, title='Информатика 7', grade=7) => as(u, `insert into cf_curr_courses(school_id,owner_id,title,grade) values ($1,$2,$3,$4) returning id`, [school, owner, title, grade]);
const c = await course(T1, T1, A1); expect('teacher adds a course', c, rows(1)); const cid = c[0].id;
expect('colleague sees 0 courses', await as(T2,'select id from cf_curr_courses'), rows(0));
expect('student sees 0 courses', await as(S,'select id from cf_curr_courses'), rows(0));
expect('student cannot add a course', await course(S,S,A1), isErr);
expect('course as someone else denied', await course(T2,T1,A1), isErr);
expect('course in another school denied', await course(T4,T4,A1), isErr);
expect('empty title denied', await course(T1,T1,A1,''), isErr);
expect('grade 12 denied', await course(T1,T1,A1,'x',12), isErr);
const m = await as(T1, `insert into cf_curr_modules(course_id,title,position) values ($1,'Алгоритмдер',1) returning id`, [cid]); expect('teacher adds a module', m, rows(1)); const mid = m[0].id;
expect('colleague cannot add a module to my course', await as(T2, `insert into cf_curr_modules(course_id,title) values ($1,'x') returning id`, [cid]), isErr);
expect('colleague sees 0 modules', await as(T2,'select id from cf_curr_modules'), rows(0));
expect('teacher places own lesson', await as(T1, `insert into cf_curr_lessons(lesson_id,module_id,position) values ($1,$2,1) returning lesson_id`, [L1,mid]), rows(1));
expect('a lesson sits in one module only', await as(T1, `insert into cf_curr_lessons(lesson_id,module_id) values ($1,$2) returning lesson_id`, [L1,mid]), isErr);
expect('cannot place a colleague\'s lesson', await as(T1, `insert into cf_curr_lessons(lesson_id,module_id) values ($1,$2) returning lesson_id`, [L2,mid]), isErr);
expect('colleague cannot place into my module', await as(T2, `insert into cf_curr_lessons(lesson_id,module_id) values ($1,$2) returning lesson_id`, [L2,mid]), isErr);
expect('colleague sees 0 placements', await as(T2,'select * from cf_curr_lessons'), rows(0));
expect('owner moves a lesson (position update)', await as(T1, `update cf_curr_lessons set position=5 where lesson_id=$1 returning position`, [L1]), rows(1));
expect('colleague update touches 0', await as(T2, `update cf_curr_courses set title='hacked' where id=$1 returning id`, [cid]), rows(0));
expect('colleague delete touches 0', await as(T2, `delete from cf_curr_courses where id=$1 returning id`, [cid]), rows(0));
expect('owner cannot hand course to a colleague', await as(T1, `update cf_curr_courses set owner_id=$2 where id=$1 returning id`, [cid,T2]), isErr);
expect('anon has no access', await (async () => { await db.exec('reset role; set role anon;'); try { return (await db.query('select 1 from cf_curr_courses')).rows } catch (e) { return 'ERR: ' + e.message.split('\n')[0] } finally { await db.exec('reset role') } })(), isErr);
expect('deleting a module keeps the lesson row', await (async()=>{ await as(T1, `delete from cf_curr_modules where id=$1`, [mid]); return (await db.query('select (select count(*)::int from cf_lessons) l, (select count(*)::int from cf_curr_lessons) p')).rows })(), v => v[0].l===2 && v[0].p===0);
expect('owner deletes the course', await as(T1, `delete from cf_curr_courses where id=$1 returning id`, [cid]), rows(1));
console.log(bad ? bad + ' FAILED' : 'all pass'); process.exit(bad ? 1 : 0);
