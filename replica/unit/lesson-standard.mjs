// Lesson standard audit (docs: the «ЖИ көмегімен сабақ жасау» guide). Run: node replica/unit/lesson-standard.mjs [ids...]
// Exits 1 when a listed lesson breaks the standard. Without ids it reports every lesson and never fails.
import { build } from 'esbuild';
await build({ stdin: { contents: "export { SHEETSLAB_LESSONS } from './src/lessons/sheetsLab'; export { SHEETS7_LESSONS } from './src/lessons/sheetsLab7'; export { SHEETS9_LESSONS } from './src/lessons/sheetsLab9'; export { INFO10_LESSONS } from './src/lessons/info10';", resolveDir: '.', loader: 'ts' }, bundle: true, format: 'esm', outfile: '/tmp/lessons-std.mjs', logLevel: 'error' });
const m = await import('/tmp/lessons-std.mjs');
const all = [...m.SHEETS7_LESSONS, ...m.SHEETSLAB_LESSONS, ...m.SHEETS9_LESSONS, ...m.INFO10_LESSONS], want = process.argv.slice(2);
const ORDER = ['warmup', 'explain', 'together', 'example', 'practice', 'check', 'reflect'];
const KIND = { warmup: ['check'], explain: ['explain', 'video'], together: ['explain', 'video', 'example', 'exampletask'], example: ['example', 'exampletask', 'video'], practice: ['practice'], check: ['check'] };
let bad = 0;
for (const l of all) {
  if (want.length && !want.includes(l.id)) continue;
  const e = [], st = l.plan?.stages || [], sl = l.slides;
  if (st.reduce((n, x) => n + x.min, 0) !== 45) e.push('plan is not 45 minutes');
  let last = -1;
  sl.forEach((s, i) => {
    const n = `#${i + 1} «${s.title}»`;
    if (!s.ru?.title || !s.en?.title) e.push(`${n}: no ru/en title`);
    if (i === 0) return;
    if (!s.stage) return e.push(`${n}: no stage`);
    const o = ORDER.indexOf(s.stage);
    if (o < last) e.push(`${n}: stage ${s.stage} comes after a later stage`);
    last = Math.max(last, o);
    if (KIND[s.stage] && !KIND[s.stage].includes(s.kind)) e.push(`${n}: kind ${s.kind} in stage ${s.stage}`);
    if (s.type === 'quiz' && !s.qvariants && (!s.explanation || s.options.length !== 4)) e.push(`${n}: quiz needs 4 options and an explanation`);
    if (s.qvariants && (s.qvariants.length < 2 || s.qvariants.some(v => v.options.length !== 4 || !v.explanation) || s.ru?.qtext?.length !== s.qvariants.length)) e.push(`${n}: test variants need 4 options, an explanation and ru/en text`);
  });
  for (const x of st) {
    const mine = sl.filter(s => s.stage === x.k);
    if (!mine.length) e.push(`stage ${x.k}: no slide`);
    else if (!mine.some(s => s.notes)) e.push(`stage ${x.k}: no teacher note`);
  }
  const quiz = sl.filter(s => s.type === 'quiz' && !s.qvariants);
  if (quiz.length > 2 && new Set(quiz.map(q => q.answer)).size === 1) e.push(`all ${quiz.length} quizzes have the correct answer in position ${quiz[0].answer + 1}`);
  const prac = sl.filter(s => s.stage === 'practice' && s.type === 'task');
  if (!prac.length) e.push('practice: no auto-checked task');
  if (!prac.some(s => s.levels || /★/.test(JSON.stringify(s.criteria || '') + s.title))) e.push('practice: no harder (★ / L2-L3) task for fast students');
  if (l.terms.length < 3) e.push('fewer than 3 terms');
  console.log(`${l.id} ${l.title[0]}: ${e.length ? '\n  - ' + e.join('\n  - ') : 'ok'}`);
  if (e.length) bad++;
}
if (want.length && bad) process.exit(1);
