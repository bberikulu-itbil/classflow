// Module kind/quarter/grade (supabase/012_module_kind.sql) on top of 008 in PGlite. Run from a folder that has @electric-sql/pglite: node module_kind_rls.mjs <008 path> <012 path>
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

const s008 = fs.readFileSync(process.argv[2], 'utf8'), s012 = fs.readFileSync(process.argv[3], 'utf8');
await db.exec(s008);
const T1='00000000-0000-0000-0000-000000000001',T2='00000000-0000-0000-0000-000000000002',A1='00000000-0000-0000-0000-0000000000a1';
const as = async (u, q, p=[]) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${u}',false); set role authenticated;`); try { return (await db.query(q,p)).rows; } catch(e){ return 'ERR: '+e.message.split('\n')[0]; } finally { await db.exec('reset role'); } };
// a module that exists before 012 must survive it
const c0 = (await as(T1, `insert into cf_curr_courses(school_id,owner_id,title,grade) values ($1,$2,'Информатика 7',7) returning id`, [A1,T1]))[0].id;
const old = (await as(T1, `insert into cf_curr_modules(course_id,title) values ($1,'Ескі модуль') returning id`, [c0]))[0].id;
await db.exec(s012); await db.exec(s012); console.log('012 runs twice on top of 008: ok');
let bad = 0; const expect = (n, v, ok) => { const pass = ok(v); if (!pass) bad++; console.log((pass ? 'PASS ' : 'FAIL ') + n.padEnd(58), JSON.stringify(v)); };
const isErr = v => typeof v === 'string' && v.startsWith('ERR'), rows = n => v => Array.isArray(v) && v.length === n;
expect('old module became a quarter-less lesson module', await as(T1, `select kind,quarter,grade from cf_curr_modules where id=$1`, [old]), v => v[0].kind==='lesson' && v[0].quarter===null && v[0].grade===null);
const ins = (kind, q, g) => as(T1, `insert into cf_curr_modules(course_id,title,kind,quarter,grade) values ($1,'m',$2,$3,$4) returning id`, [c0,kind,q,g]);
expect('lesson module with quarter and grade', await ins('lesson',2,8), rows(1));
expect('course module without quarter', await ins('course',null,8), rows(1));
expect('course module WITH a quarter denied', await ins('course',2,null), isErr);
expect('quarter 5 denied', await ins('lesson',5,null), isErr);
expect('quarter 0 denied', await ins('lesson',0,null), isErr);
expect('grade 12 denied', await ins('lesson',null,12), isErr);
expect('unknown kind denied', await ins('club',null,null), isErr);
expect('colleague cannot change the kind of my module', await as(T2, `update cf_curr_modules set kind='course' where id=$1 returning id`, [old]), rows(0));
expect('owner turns a quarter module into a course: quarter must go', await as(T1, `update cf_curr_modules set kind='course' where kind='lesson' and quarter=2 returning id`), isErr);
expect('owner changes kind and clears quarter together', await as(T1, `update cf_curr_modules set kind='course', quarter=null where kind='lesson' and quarter=2 returning id`), rows(1));
console.log(bad ? bad + ' FAILED' : 'all pass'); process.exit(bad ? 1 : 0);
