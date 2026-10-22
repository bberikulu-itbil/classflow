// RLS check of supabase/007_gradebook.sql in PGlite. Run from a folder that has @electric-sql/pglite: node gb.mjs <path to 007_gradebook.sql>
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
await db.exec(`
 create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
 create role anon; create role authenticated;
 create table schools(id uuid primary key default gen_random_uuid());
 create table classes(id uuid primary key default gen_random_uuid(), school_id uuid references schools(id), name text);
 create table profiles(id uuid primary key, school_id uuid references schools(id), role text);
 create function my_school() returns uuid language sql stable security definer as $$ select school_id from profiles where id = auth.uid() $$;
 create function is_staff() returns boolean language sql stable security definer as $$ select exists(select 1 from profiles where id = auth.uid() and role in ('teacher','admin')) $$;
 grant usage on schema public to authenticated, anon; grant usage on schema auth to authenticated, anon;
 grant select on profiles, schools, classes to authenticated; grant execute on all functions in schema public to authenticated;
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
const T1='00000000-0000-0000-0000-000000000001',T2='00000000-0000-0000-0000-000000000002',S='00000000-0000-0000-0000-000000000003',T4='00000000-0000-0000-0000-000000000004',S5='00000000-0000-0000-0000-000000000005';
const A1='00000000-0000-0000-0000-0000000000a1',C1='00000000-0000-0000-0000-0000000000c1',C2='00000000-0000-0000-0000-0000000000c2';
let bad = 0; const expect = (n, v, ok) => { const pass = ok(v); if (!pass) bad++; console.log((pass ? 'PASS ' : 'FAIL ') + n.padEnd(54), JSON.stringify(v)); };
const isErr = v => typeof v === 'string' && v.startsWith('ERR'), rows = n => v => Array.isArray(v) && v.length === n;
const ins = (u, owner, school, cls, kind = 'bzb', max = 15, title = 'БЖБ 1') => as(u, `insert into cf_assessments(school_id,owner_id,class_id,school_year,quarter,kind,title,max_points) values ($1,$2,$3,2026,1,$4,$5,$6) returning id`, [school, owner, cls, kind, title, max]);
const a = await ins(T1, T1, A1, C1); expect('teacher adds a БЖБ column', a, rows(1)); const id = a[0].id;
expect('colleague sees 0 columns', await as(T2, 'select id from cf_assessments'), rows(0));
expect('student sees 0 columns', await as(S, 'select id from cf_assessments'), rows(0));
expect('student cannot add a column', await ins(S, S, A1, C1), isErr);
expect('column as someone else denied', await ins(T2, T1, A1, C1), isErr);
expect('class of another school denied', await ins(T1, T1, A1, C2), isErr);
expect('БЖБ with 6 points denied', await ins(T1, T1, A1, C1, 'bzb', 6), isErr);
expect('БЖБ with 21 points denied', await ins(T1, T1, A1, C1, 'bzb', 21), isErr);
expect('ТЖБ with 28 points denied', await ins(T1, T1, A1, C1, 'tzb', 28), isErr);
expect('ТЖБ with 30 points ok', await ins(T1, T1, A1, C1, 'tzb', 30, 'ТЖБ'), rows(1));
expect('ҚБ with 10 points ok', await ins(T1, T1, A1, C1, 'kb', 10, 'ҚБ'), rows(1));
expect('unknown kind denied', await ins(T1, T1, A1, C1, 'xyz', 10), isErr);
const mk = (u, aid, st, pts) => as(u, `insert into cf_marks(assessment_id,student_id,points) values ($1,$2,$3) returning points`, [aid, st, pts]);
expect('teacher gives a mark', await mk(T1, id, S, 12), rows(1));
expect('mark above the maximum denied', await as(T1, `update cf_marks set points=16 where assessment_id=$1 returning points`, [id]), isErr);
expect('negative mark denied', await mk(T1, id, S, -1), isErr);
expect('half points allowed', await as(T1, `update cf_marks set points=12.5 where assessment_id=$1 returning points`, [id]), rows(1));
expect('student of another school denied', await mk(T1, id, S5, 5), isErr);
expect('colleague cannot mark my column', await mk(T2, id, S, 5), isErr);
expect('colleague reads 0 marks', await as(T2, 'select * from cf_marks'), rows(0));
expect('student reads 0 marks', await as(S, 'select * from cf_marks'), rows(0));
expect('colleague update touches 0', await as(T2, `update cf_marks set points=1 where assessment_id=$1 returning points`, [id]), rows(0));
expect('colleague delete column touches 0', await as(T2, `delete from cf_assessments where id=$1 returning id`, [id]), rows(0));
expect('owner reads own mark', await as(T1, 'select points::float from cf_marks'), v => rows(1)(v) && v[0].points === 12.5);
expect('anon has no access', await (async () => { await db.exec('reset role; set role anon;'); try { return (await db.query('select 1 from cf_assessments')).rows } catch (e) { return 'ERR: ' + e.message.split('\n')[0] } finally { await db.exec('reset role') } })(), isErr);
expect('owner deletes column, marks go with it', await as(T1, `delete from cf_assessments where id=$1 returning id`, [id]), rows(1));
expect('no marks left', (await db.query('select count(*)::int n from cf_marks')).rows, v => v[0].n === 0);
console.log(bad ? bad + ' FAILED' : 'all pass'); process.exit(bad ? 1 : 0);
