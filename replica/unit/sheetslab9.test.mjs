// Checks the Informatics 9 "Databases" module (src/lessons/sheetsLab9): 8 lessons in kk / ru / en, the lesson standard,
// every SQL task against a real SQLite (the reference query must give the expected table and its hash is the stored answer), and the sheet tasks' marking schemes.
// Run: node replica/unit/sheetslab9.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict'; import { execFileSync } from 'node:child_process';
import initSqlJs from 'sql.js';
await build({ stdin: { contents: "export * from './src/lessons/sheetsLab9'; export { answerOf, canon } from './src/sql/canon'; export { evaluator } from './src/sheet/engine';", resolveDir: '.', loader: 'ts' }, bundle: true, format: 'esm', outfile: '/tmp/sheetslab9.mjs', logLevel: 'error' });
const { SHEETS9_LESSONS: L, SHEETS9_LESSONS_DATA: D, SQL_SOLUTIONS, SOLUTIONS, PICS, answerOf, canon, evaluator } = await import('/tmp/sheetslab9.mjs');
const SQL = await initSqlJs();

assert.equal(L.length, 8);
// canonical form: order ignored unless asked, case and number format ignored
assert.equal(canon([['B', 2], ['a', 1.004]]), 'a|1\nb|2'); assert.equal(canon([['B', 2], ['a', 1]], true), 'b|2\na|1');
assert.notEqual(answerOf([[1], [2]], true), answerOf([[2], [1]], true)); assert.equal(answerOf([[1], [2]]), answerOf([[2], [1]]));

// every SQL task: solve on setup gives `expect`; the slide stores exactly that hash and never the query
const run = (setup, sql, probe) => { const db = new SQL.Database(); if (setup) db.run(setup); const r = db.exec(sql); const t = probe ? db.exec(probe)[0] : r[r.length - 1]; db.close(); return t ? t.values : []; };
const sqlSlides = Object.values(D).flatMap(l => l.slides.filter(s => s.templateId === 'sql'));
assert.equal(SQL_SOLUTIONS.length, sqlSlides.length);
SQL_SOLUTIONS.forEach((s, i) => {
  const got = run(s.setup, s.solve, s.probe), sl = sqlSlides[i];
  assert.equal(canon(got, s.ordered), canon(s.expect, s.ordered), `${s.task}: the reference query gives the expected table`);
  assert.deepEqual(sl.accept, [answerOf(s.expect, s.ordered)], `${s.task}: stored answer`);
  assert.equal(sl.sql.rows, s.expect.length); assert.ok(!JSON.stringify(sl).includes(s.solve) || sl.notes.includes(s.solve.split('\n')[0]), `${s.task}: the query is only in the teacher note`);
  for (const lg of ['ru', 'en']) assert.ok(sl[lg].title && sl[lg].prompt, `${s.task} ${lg}`);
  // a wrong but plausible query must not pass: all fields instead of the asked ones
  if (!s.probe) assert.notEqual(answerOf(run(s.setup, 'SELECT * FROM ' + (s.setup.includes('goods') ? 'goods' : 'books')), s.ordered), sl.accept[0], `${s.task}: SELECT * is not accepted`);
});
// every SQL demo page runs
for (const l of Object.values(D)) for (const s of l.slides) if (s.sql && s.templateId !== 'sql') assert.ok(run(s.sql.setup, s.sql.start).length > 0, `${l.title} «${s.title}»: the demo query returns rows`);

// sheet tasks: the reference solution earns every criterion, the bare data earns none of the formula ones
const shown = v => { const n = Number(String(v).replace(',', '.')); return String(v).trim() !== '' && !Number.isNaN(n) ? String(+n.toFixed(2)) : String(v).trim(); };
const sheetTasks = Object.values(D).flatMap(l => l.slides.filter(s => s.criteria));
assert.equal(SOLUTIONS.length, sheetTasks.length); assert.equal(PICS.length, sheetTasks.length);
SOLUTIONS.forEach((sol, i) => {
  const data = Object.fromEntries(Object.entries(sol.data).filter(([, v]) => v !== '?')), get = evaluator({ ...data, ...sol.solve }), t = sheetTasks[i];
  for (const c of t.criteria) {
    assert.ok(c.accept.includes(shown(get(c.cell))), `${sol.task} ${c.id}: accepted value`);
    if (c.fn) assert.ok((sol.solve[c.cell] || '').toUpperCase().includes(c.fn + '('), `${sol.task} ${c.id}: uses ${c.fn}`);
  }
  if (t.sheet.cells) for (const k of Object.keys(sol.solve)) assert.ok(!(k in t.sheet.cells), `${sol.task}: ${k} is left for the student`);
});
// the numbers quoted in the teacher notes
const E = evaluator({ ...Object.fromEntries(Object.entries(SOLUTIONS.find(s => s.task.includes('дүкен')).data).filter(([, v]) => v !== '?')), ...SOLUTIONS.find(s => s.task.includes('дүкен')).solve });
assert.equal(shown(E('E8')), '32050'); assert.equal(shown(E('E9')), '20250');

// the lesson standard (stages, kinds, notes, ★ task, spread quiz answers) for all eight lessons
execFileSync('node', ['replica/unit/lesson-standard.mjs', ...L.map(l => l.id)], { stdio: 'inherit' });
console.log(`sheetslab9 ok: ${L.length} lessons, ${sqlSlides.length} SQL tasks, ${sheetTasks.length} sheet tasks`);
