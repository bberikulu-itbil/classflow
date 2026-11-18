// Writes supabase/070_informatics10_ch2.sql from src/lessons/info10. Run: node scripts/gen-info10-sql.mjs
// The teacher's course "informatics 10th" and its module "2-тарау. Деректерді көрсету" must exist; the module then holds exactly
// these four lessons (found again by plan.gen); the lessons it held before leave the module but stay in the library.
import { build } from 'esbuild'; import { writeFileSync } from 'node:fs'; import { tmpdir } from 'node:os';
const out = `${tmpdir()}/info10-gen.mjs`;
await build({ entryPoints: ['src/lessons/info10/index.ts'], bundle: true, format: 'esm', outfile: out, logLevel: 'error' });
const { INFO10_LESSONS_DATA: D, INFO10_COURSE: C, INFO10_MODULE: M } = await import(out);
const q = s => { if (s.includes('$i10$')) throw new Error('dollar tag clash'); return `$i10$${s}$i10$`; };
const rows = D.map((l, i) => `    (${q(l.id)}, ${q(l.title)}, ${q(l.subject)}, ${i}, ${q(JSON.stringify(l.plan))}::jsonb, ${q(JSON.stringify(l.terms))}::jsonb, ${q(JSON.stringify(l.slides))}::jsonb, ${l.exam})`);
writeFileSync('supabase/070_informatics10_ch2.sql', `-- Migration 070 (data): Informatics 10, chapter 2 "Data representation" — 3 lessons + Check yourself. Needs 069 (test variants), 071 (exam flag), 073 (exam task variants).
-- Idempotent: lessons are found by plan->>'gen'. The module keeps only these lessons; former ones leave the module, their rows stay.

do $info10$
declare v_course uuid; v_owner uuid; v_school uuid; v_module uuid; v_lesson uuid; v_spec record; v_ids uuid[] := '{}';
begin
  select c.id, c.owner_id, c.school_id into v_course, v_owner, v_school from public.cf_curr_courses c where c.title = ${q(C.title)} and c.grade = ${C.grade} order by c.created_at limit 1;
  if v_course is null then raise exception 'Курс табылмады: ${C.title}'; end if;
  select m.id into v_module from public.cf_curr_modules m where m.course_id = v_course and m.title = ${q(M.title)} limit 1;
  if v_module is null then raise exception 'Модуль табылмады: ${M.title}'; end if;

  for v_spec in select * from (values
${rows.join(',\n')}
  ) as t(gen, title, subject, position, plan, terms, slides, exam)
  loop
    select l.id into v_lesson from public.cf_lessons l where l.school_id = v_school and l.plan->>'gen' = v_spec.gen limit 1;
    if v_lesson is null then
      insert into public.cf_lessons (school_id, owner_id, title, subject, plan, slides, terms)
      values (v_school, v_owner, v_spec.title, v_spec.subject, v_spec.plan, v_spec.slides, v_spec.terms) returning id into v_lesson;
    else
      update public.cf_lessons set title = v_spec.title, subject = v_spec.subject, plan = v_spec.plan, slides = v_spec.slides, terms = v_spec.terms, updated_at = now() where id = v_lesson;
    end if;
    v_ids := v_ids || v_lesson;
    insert into public.cf_curr_lessons (lesson_id, module_id, position, exam) values (v_lesson, v_module, 100 + v_spec.position, v_spec.exam)
    on conflict (lesson_id) do update set module_id = excluded.module_id, position = excluded.position, exam = excluded.exam;
    v_lesson := null;
  end loop;
  delete from public.cf_curr_lessons where module_id = v_module and not (lesson_id = any(v_ids));
  update public.cf_curr_lessons set position = position - 100 where module_id = v_module and position >= 100;
end;
$info10$;
`);
console.log('written');
