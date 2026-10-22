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
const A1='00000000-0000-0000-0000-0000000000a1',C1='00000000-0000-0000-0000-0000000000c1',C2='00000000-0000-0000-0000-0000000000c2';
await db.exec(`insert into cf_lessons(id,owner_id,title) values ('00000000-0000-0000-0000-00000000001a','${T1}','mine'),('00000000-0000-0000-0000-00000000002a','${T2}','theirs')`);
const L1='00000000-0000-0000-0000-00000000001a',L2='00000000-0000-0000-0000-00000000002a';
let bad = 0; const expect = (n, v, ok) => { const pass = ok(v); if (!pass) bad++; console.log((pass ? 'PASS ' : 'FAIL ') + n.padEnd(54), JSON.stringify(v)); };
const isErr = v => typeof v === 'string' && v.startsWith('ERR'), rows = n => v => Array.isArray(v) && v.length === n;
const tt = (u, owner, school, cls, wd=2, pr=2) => as(u, `insert into cf_timetable(school_id,owner_id,class_id,weekday,period) values ($1,$2,$3,$4,$5) returning id`, [school, owner, cls, wd, pr]);
expect('teacher adds a timetable entry', await tt(T1,T1,A1,C1), rows(1));
expect('same period twice denied (one teacher, one room)', await tt(T1,T1,A1,C1), isErr);
expect('another period ok', await tt(T1,T1,A1,C1,2,3), rows(1));
expect('weekday 8 denied', await tt(T1,T1,A1,C1,8,1), isErr);
expect('period 13 denied', await tt(T1,T1,A1,C1,1,13), isErr);
expect('class of another school denied', await tt(T1,T1,A1,C2,3,1), isErr);
expect('as someone else denied', await tt(T2,T1,A1,C1,3,2), isErr);
expect('student cannot add', await tt(S,S,A1,C1,4,1), isErr);
expect('colleague may use the same weekday+period (own timetable)', await tt(T2,T2,A1,C1,2,2), rows(1));
expect('colleague sees only own entries', await as(T2,'select id from cf_timetable'), rows(1));
const slot = (u, owner, school, cls, day='2026-09-01', pr=2, les=null) => as(u, `insert into cf_slots(school_id,owner_id,class_id,school_year,quarter,held_on,period,lesson_id) values ($1,$2,$3,2026,1,$4,$5,$6) returning id`, [school, owner, cls, day, pr, les]);
const s1 = await slot(T1,T1,A1,C1); expect('teacher adds an empty slot', s1, rows(1));
expect('same date+period twice denied', await slot(T1,T1,A1,C1), isErr);
expect('slot with own lesson ok', await slot(T1,T1,A1,C1,'2026-09-08',2,L1), rows(1));
expect('slot with colleague lesson denied', await slot(T1,T1,A1,C1,'2026-09-15',2,L2), isErr);
expect('slot of another school class denied', await slot(T1,T1,A1,C2,'2026-09-22',2), isErr);
expect('colleague sees 0 slots', await as(T2,'select id from cf_slots'), rows(0));
expect('student sees 0 slots', await as(S,'select id from cf_slots'), rows(0));
expect('colleague update touches 0', await as(T2, `update cf_slots set lesson_id=null where id=$1 returning id`, [s1[0].id]), rows(0));
expect('owner puts a lecture into the slot', await as(T1, `update cf_slots set lesson_id=$2 where id=$1 returning id`, [s1[0].id, L1]), rows(1));
expect('deleting the lesson empties the slot, keeps it', await (async()=>{ await db.exec(`delete from cf_lessons where id='${L1}'`); return (await db.query('select count(*)::int n, count(lesson_id)::int l from cf_slots')).rows })(), v => v[0].n===2 && v[0].l===0);
expect('anon has no access', await (async () => { await db.exec('reset role; set role anon;'); try { return (await db.query('select 1 from cf_slots')).rows } catch (e) { return 'ERR: ' + e.message.split('\n')[0] } finally { await db.exec('reset role') } })(), isErr);
expect('owner deletes a slot', await as(T1, `delete from cf_slots where id=$1 returning id`, [s1[0].id]), rows(1));
console.log(bad ? bad + ' FAILED' : 'all pass'); process.exit(bad ? 1 : 0);
