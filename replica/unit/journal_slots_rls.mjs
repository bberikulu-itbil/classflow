// RLS check of supabase/007_gradebook.sql in PGlite. Run from a folder that has @electric-sql/pglite: node gb.mjs <path to 007_gradebook.sql>
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
await db.exec(`
 create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
 create role anon; create role authenticated;
 create table schools(id uuid primary key default gen_random_uuid());
 create table cf_lessons(id uuid primary key default gen_random_uuid(), owner_id uuid, title text);
 create table cf_sessions(id uuid primary key default gen_random_uuid(), teacher_id uuid);
 create table classes(id uuid primary key default gen_random_uuid(), school_id uuid references schools(id), name text);
 create table profiles(id uuid primary key, school_id uuid references schools(id), role text);
 create function my_school() returns uuid language sql stable security definer as $$ select school_id from profiles where id = auth.uid() $$;
 create function is_staff() returns boolean language sql stable security definer as $$ select exists(select 1 from profiles where id = auth.uid() and role in ('teacher','admin')) $$;
 grant usage on schema public to authenticated, anon; grant usage on schema auth to authenticated, anon;
 grant select on cf_sessions, cf_lessons, profiles, schools, classes to authenticated; grant execute on all functions in schema public to authenticated;
 insert into schools values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000a2');
 insert into classes values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','7A'),('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a2','7Z');
 insert into profiles values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','teacher'),
   ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','teacher'),
   ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','student'),
   ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a2','teacher'),
   ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000a2','student');`);



const dir = process.argv[2];
for (const f of ['007_gradebook.sql','009_schedule.sql','010_journal_slots.sql']) { await db.exec(fs.readFileSync(dir + '/' + f, 'utf8')); }
await db.exec(fs.readFileSync(dir + '/010_journal_slots.sql', 'utf8')); console.log('007+009+010 run, 010 twice: ok');
const as = async (u, q, p=[]) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${u}',false); set role authenticated;`); try { return (await db.query(q,p)).rows; } catch(e){ return 'ERR: '+e.message.split('\n')[0]; } finally { await db.exec('reset role'); } };
const T1='00000000-0000-0000-0000-000000000001',T2='00000000-0000-0000-0000-000000000002';
const A1='00000000-0000-0000-0000-0000000000a1',C1='00000000-0000-0000-0000-0000000000c1';
let bad = 0; const expect = (n, v, ok) => { const pass = ok(v); if (!pass) bad++; console.log((pass ? 'PASS ' : 'FAIL ') + n.padEnd(54), JSON.stringify(v)); };
const isErr = v => typeof v === 'string' && v.startsWith('ERR'), rows = n => v => Array.isArray(v) && v.length === n;
const slot = await as(T1, `insert into cf_slots(school_id,owner_id,class_id,school_year,quarter,held_on,period) values ($1,$2,$3,2026,1,'2026-09-01',2) returning id`, [A1,T1,C1]);
const col = (slotId, title='ҚБ 1') => as(T1, `insert into cf_assessments(school_id,owner_id,class_id,school_year,quarter,kind,title,max_points,slot_id) values ($1,$2,$3,2026,1,'kb',$4,10,$5) returning id`, [A1,T1,C1,title,slotId]);
expect('column made from a slot', await col(slot[0].id), rows(1));
expect('a second column for the same slot denied', await col(slot[0].id,'ҚБ 2'), isErr);
expect('columns without a slot are unlimited', (await col(null,'a')).length + (await col(null,'b')).length, v => v === 2);
expect('deleting the slot keeps the column, clears the link', await (async()=>{ await db.exec(`delete from cf_slots where id='${slot[0].id}'`); return (await db.query('select count(*)::int n, count(slot_id)::int s from cf_assessments')).rows })(), v => v[0].n===3 && v[0].s===0);
console.log(bad ? bad + ' FAILED' : 'all pass'); process.exit(bad ? 1 : 0);
