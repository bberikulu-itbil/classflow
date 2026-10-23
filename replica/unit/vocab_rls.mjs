// RLS check of supabase/011_vocab.sql in PGlite. Run: node vocab.mjs <path to 011_vocab.sql>
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
await db.exec(`
 create schema auth; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
 create role anon; create role authenticated;
 create table schools(id uuid primary key default gen_random_uuid());
 create table classes(id uuid primary key default gen_random_uuid(), school_id uuid references schools(id), name text);
 create table profiles(id uuid primary key, school_id uuid references schools(id), role text, class_id uuid);
 create table cf_lessons(id uuid primary key default gen_random_uuid(), owner_id uuid, title text);
 create function my_school() returns uuid language sql stable security definer as $$ select school_id from profiles where id = auth.uid() $$;
 create function is_staff() returns boolean language sql stable security definer as $$ select exists(select 1 from profiles where id = auth.uid() and role in ('teacher','admin')) $$;
 grant usage on schema public to authenticated, anon; grant usage on schema auth to authenticated, anon;
 grant select on profiles, schools, classes, cf_lessons to authenticated; grant execute on all functions in schema public to authenticated;
 insert into schools values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000a2');
 insert into classes values ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','7B'),('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a1','7A'),('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000a2','7Z');
 insert into profiles(id,school_id,role,class_id) values
   ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','teacher',null),
   ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a1','teacher',null),
   ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000a1','student','00000000-0000-0000-0000-0000000000c1'),
   ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-0000000000a1','student','00000000-0000-0000-0000-0000000000c2'),
   ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000a2','teacher',null);
 insert into cf_lessons(id,owner_id,title) values ('00000000-0000-0000-0000-00000000001a','00000000-0000-0000-0000-000000000001','mine'),('00000000-0000-0000-0000-00000000002a','00000000-0000-0000-0000-000000000002','theirs');`);
const sql = fs.readFileSync(process.argv[2], 'utf8');
await db.exec(sql); await db.exec(sql); console.log('migration runs twice: ok');
const as = async (u, q, p=[]) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${u}',false); set role authenticated;`); try { return (await db.query(q,p)).rows; } catch(e){ return 'ERR: '+e.message.split('\n')[0]; } finally { await db.exec('reset role'); } };
const T1='00000000-0000-0000-0000-000000000001',T2='00000000-0000-0000-0000-000000000002',S='00000000-0000-0000-0000-000000000003',S6='00000000-0000-0000-0000-000000000006',T4='00000000-0000-0000-0000-000000000004';
const A1='00000000-0000-0000-0000-0000000000a1',C1='00000000-0000-0000-0000-0000000000c1',C2='00000000-0000-0000-0000-0000000000c2',C3='00000000-0000-0000-0000-0000000000c3';
const L1='00000000-0000-0000-0000-00000000001a',L2='00000000-0000-0000-0000-00000000002a';
let bad = 0; const expect = (n, v, ok) => { const pass = ok(v); if (!pass) bad++; console.log((pass ? 'PASS ' : 'FAIL ') + n.padEnd(56), JSON.stringify(v)); };
const isErr = v => typeof v === 'string' && v.startsWith('ERR'), rows = n => v => Array.isArray(v) && v.length === n;
const term = (u, owner, school, kk='алгоритм', ru='алгоритм', en='algorithm') => as(u, `insert into cf_vocab(school_id,owner_id,kk,ru,en,definition) values ($1,$2,$3,$4,$5,'x') returning id`, [school, owner, kk, ru, en]);
const t = await term(T1,T1,A1); expect('teacher adds a term (3 languages)', t, rows(1)); const tid = t[0].id;
expect('same term again (any case) denied', await term(T1,T1,A1,'Алгоритм'), isErr);
expect('colleague may have the same term in own base', await term(T2,T2,A1), rows(1));
expect('term with only kk ok', await as(T1, `insert into cf_vocab(school_id,owner_id,kk) values ($1,$2,'айнымалы') returning id`, [A1,T1]), rows(1));
expect('empty kk denied', await term(T1,T1,A1,''), isErr);
expect('student cannot add a term', await term(S,S,A1,'x'), isErr);
expect('term as someone else denied', await term(T2,T1,A1,'y'), isErr);
expect('term in another school denied', await term(T4,T4,A1,'z'), isErr);
expect('colleague sees only own terms', await as(T2,'select id from cf_vocab'), rows(1));
expect('student sees 0 terms', await as(S,'select id from cf_vocab'), rows(0));
expect('owner edits a term', await as(T1, `update cf_vocab set definition='new' where id=$1 returning id`, [tid]), rows(1));
expect('colleague edit touches 0', await as(T2, `update cf_vocab set definition='hack' where id=$1 returning id`, [tid]), rows(0));
expect('link own term to own lesson', await as(T1, `insert into cf_vocab_lessons(term_id,lesson_id) values ($1,$2) returning term_id`, [tid,L1]), rows(1));
expect('same link twice denied', await as(T1, `insert into cf_vocab_lessons(term_id,lesson_id) values ($1,$2) returning term_id`, [tid,L1]), isErr);
expect('link to a colleague lesson denied', await as(T1, `insert into cf_vocab_lessons(term_id,lesson_id) values ($1,$2) returning term_id`, [tid,L2]), isErr);
expect('colleague cannot link my term', await as(T2, `insert into cf_vocab_lessons(term_id,lesson_id) values ($1,$2) returning term_id`, [tid,L2]), isErr);
expect('colleague sees 0 links', await as(T2,'select * from cf_vocab_lessons'), rows(0));
expect('student sees 0 links', await as(S,'select * from cf_vocab_lessons'), rows(0));
const set = (u, owner, school, cls, n=1, title='Жинақ') => as(u, `insert into cf_vocab_sets(school_id,owner_id,class_id,title,terms) values ($1,$2,$3,$4,$5::jsonb) returning id`, [school, owner, cls, title, JSON.stringify(Array(n).fill({kk:'а',ru:'б',en:'c',definition:'d'}))]);
const s1 = await set(T1,T1,A1,C1); expect('teacher gives a set to a class', s1, rows(1));
expect('student of that class reads it', await as(S,'select id, jsonb_array_length(terms) n from cf_vocab_sets'), v => rows(1)(v) && v[0].n === 1);
expect('student of ANOTHER class sees 0', await as(S6,'select id from cf_vocab_sets'), rows(0));
expect('owner reads own sets', await as(T1,'select id from cf_vocab_sets'), rows(1));
expect('colleague sees 0 sets', await as(T2,'select id from cf_vocab_sets'), rows(0));
expect('student cannot create a set', await set(S,S,A1,C1), isErr);
expect('set for a class of another school denied', await set(T1,T1,A1,C3), isErr);
expect('set as someone else denied', await set(T2,T1,A1,C1), isErr);
expect('empty set denied', await set(T1,T1,A1,C1,0), isErr);
expect('101 terms denied', await set(T1,T1,A1,C1,101), isErr);
expect('empty title denied', await set(T1,T1,A1,C1,1,''), isErr);
expect('sets cannot be edited (no update grant)', await as(T1, `update cf_vocab_sets set title='x' where id=$1 returning id`, [s1[0].id]), isErr);
expect('student cannot delete a set', await as(S, `delete from cf_vocab_sets where id=$1 returning id`, [s1[0].id]), rows(0));
expect('colleague cannot delete a set', await as(T2, `delete from cf_vocab_sets where id=$1 returning id`, [s1[0].id]), rows(0));
expect('anon has no access', await (async () => { await db.exec('reset role; set role anon;'); try { return (await db.query('select 1 from cf_vocab_sets')).rows } catch (e) { return 'ERR: ' + e.message.split('\n')[0] } finally { await db.exec('reset role') } })(), isErr);
expect('deleting a term removes its links', await (async () => { await as(T1, `delete from cf_vocab where id=$1`, [tid]); return (await db.query('select count(*)::int n from cf_vocab_lessons')).rows })(), v => v[0].n === 0);
expect('owner deletes a set', await as(T1, `delete from cf_vocab_sets where id=$1 returning id`, [s1[0].id]), rows(1));
console.log(bad ? bad + ' FAILED' : 'all pass'); process.exit(bad ? 1 : 0);
