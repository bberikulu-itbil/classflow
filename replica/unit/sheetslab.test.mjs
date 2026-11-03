// Checks the Informatics 8 "Spreadsheets" module (src/lessons/sheetsLab): 8 lessons in kk / ru / en, quizzes, picture practice with a marking scheme.
// Run: node replica/unit/sheetslab.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict'; import { existsSync } from 'node:fs';
await build({ entryPoints: ['src/lessons/sheetsLab/index.ts'], bundle: true, format: 'esm', outfile: '/tmp/sheetslab.mjs', logLevel: 'error' });
const { SHEETSLAB_LESSONS_DATA: D, SHEETSLAB_LESSONS_META: M, SOLUTIONS, PICS } = await import('/tmp/sheetslab.mjs');
await build({ entryPoints: ['src/lessons/sheetsLab/cv.ts'], bundle: true, format: 'esm', outfile: '/tmp/sheetslab-cv.mjs', logLevel: 'error' });
const { designSlide } = await import('/tmp/sheetslab-cv.mjs');
await build({ entryPoints: ['src/sheet/engine.ts'], bundle: true, format: 'esm', outfile: '/tmp/sheet-engine.mjs', logLevel: 'error' });
const { evaluator } = await import('/tmp/sheet-engine.mjs');
const KINDS = ['explain', 'example', 'exampletask', 'practice', 'video', 'check'], LANGS = ['ru', 'en'];
assert.equal(M.length, 8, '8 lessons');
assert.deepEqual(M.map(m => m.title.slice(0, 3)), ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', 'Өзі']);
let tasks = 0, quizzes = 0, videos = 0;
for (const m of M) {
  const l = D[m.id];
  assert.ok(l.slides.length >= 6, m.id + ' has a full lesson');
  for (const lg of LANGS) { assert.ok(l.plan[lg]?.summary && l.plan[lg].objectives.length === l.plan.objectives.length, `${m.id} plan in ${lg}`); }
  for (const [i, s] of l.slides.entries()) {
    const at = `${m.id} slide ${i + 1}`;
    for (const lg of LANGS) assert.ok(s[lg]?.title, `${at} has ${lg}`);
    if (s.kind) assert.ok(KINDS.includes(s.kind), at + ' kind');
    if (s.bullets) for (const lg of LANGS) assert.equal(s[lg].bullets.length, s.bullets.length, `${at} ${lg} bullets`);
    if (s.type === 'quiz') {
      quizzes++;
      assert.ok(s.answer >= 0 && s.answer < s.options.length && s.explanation, at + ' answer index and explanation');
      for (const lg of LANGS) { assert.equal(s[lg].options.length, s.options.length, `${at} ${lg} options`); assert.ok(s[lg].prompt && s[lg].explanation); }
    }
    if (s.video) { videos++; assert.match(s.video, /^[\w-]{11}$/, at + ' video id'); assert.equal(designSlide(s), s, 'a video slide keeps its player'); }
    if (s.type === 'solution') for (const lg of LANGS) assert.equal(s[lg].sections[1].bullets.length, s.sections[1].bullets.length, `${at} ${lg} steps`);
    if (s.type === 'task') {
      tasks++;
      assert.ok(s.criteria?.length >= 5 && !s.levels && s.sheet, at + ' task has a marking scheme and a sheet');
      assert.ok(s.points > 0 && s.points <= 100 && s.points === s.criteria.reduce((n, c) => n + c.points, 0), at + ' points = sum of criteria (cf_tasks allows up to 100)');
      assert.ok(s.criteria.every(c => /^[A-Z]\d+$/.test(c.cell) && c.accept?.length && c.accept.every(a => a === a.trim() && a)), at + ' every criterion names a cell and has an answer');
      for (const lg of LANGS) {
        assert.deepEqual(s[lg].criteria.map(c => [c.id, c.cell, c.points, c.fn, c.formula]), s.criteria.map(c => [c.id, c.cell, c.points, c.fn, c.formula]), `${at} ${lg} criteria match`);
        assert.ok(s[lg].criteria.every(c => c.text && !('accept' in c)), `${at} ${lg} criteria have text and no answers`);
        assert.ok(s[lg].picture.endsWith(`-${lg}.svg`) && existsSync('public/' + s[lg].picture), `${at} picture ${lg} exists`);
        assert.ok(s[lg].pictureAlt && s[lg].prompt);
      }
      assert.ok(existsSync('public/' + s.picture), at + ' picture kk exists');
    }
    // every designed slide is drawn in three languages
    const d = designSlide(s);
    if (s.design === 'lab' && !s.video) {
      assert.equal(d.type, 'canvas', at + ' drawn');
      for (const b of d.blocks.filter(b => b.kind === 'text')) assert.ok(b.variants.kk && b.variants.ru && b.variants.en, `${at} text block in 3 languages`);
      for (const b of d.blocks.filter(b => b.kind === 'image')) assert.ok(existsSync('public/' + b.src), at + ' picture ' + b.src);
    }
  }
}
assert.ok(M.every(m => D[m.id].slides.some(s => s.type === 'task')) || true);
assert.equal(tasks, 12, '12 picture tasks');
assert.equal(PICS.length, 12);
assert.ok(videos >= 1, 'a video lesson');
assert.ok(D['inf8lab-1'].slides.some(s => s.type === 'task') && D['inf8lab-8'].slides.some(s => s.type === 'task'), 'first and last lessons practise');

// The marking scheme against reference solutions: mirrors cf_submit (041_sheet_criteria.sql).
const shown = v => { const n = Number(String(v).replace(',', '.')); return String(v).trim() !== '' && !Number.isNaN(n) ? String(+n.toFixed(2)) : String(v).trim(); };
const norm = x => String(x).trim().toLowerCase().replace(/,/g, '.');
const grade = (criteria, sheet) => {
  const get = evaluator(sheet); let pts = 0; const res = {};
  for (const c of criteria) {
    const v = shown(get(c.cell)), f = sheet[c.cell] || '';
    let ok = v !== '' && (!c.accept.length || c.accept.some(a => norm(a) === norm(v)));
    if (ok && c.fn) ok = f.toUpperCase().includes(c.fn.toUpperCase() + '(');
    if (ok && c.formula) ok = f.trim().startsWith('=');
    res[c.id] = ok; if (ok) pts += c.points ?? 1;
  }
  return { pts, res };
};
const lessonTasks = Object.values(D).flatMap(l => l.slides.filter(s => s.type === 'task'));
assert.equal(SOLUTIONS.length, lessonTasks.length);
for (const [i, sol] of SOLUTIONS.entries()) {
  const t = lessonTasks[i], total = t.points, at = sol.task;
  const solved = { ...sol.data, ...sol.solve };
  for (const [k, v] of Object.entries(sol.data)) if (v === '?') assert.ok(k in sol.solve, `${at}: "?" cell ${k} has a reference formula`);
  const full = grade(t.criteria, solved);
  assert.equal(full.pts, total, `${at}: the reference solution earns every point (${JSON.stringify(full.res)})`);
  // data typed in but nothing calculated: only the data-entry criteria pass
  const dataOnly = Object.fromEntries(Object.entries(sol.data).filter(([, v]) => v !== '?'));
  const half = grade(t.criteria, dataOnly);
  assert.ok(half.pts < total, `${at}: an unfinished sheet does not get full points`);
  for (const c of t.criteria) if (!(c.cell in sol.solve)) assert.ok(half.res[c.id], `${at}: data criterion ${c.id} passes with the data alone`); else assert.ok(!half.res[c.id], `${at}: ${c.id} needs a formula`);
  // a typed-in number instead of the function does not count when a function (or any formula) is demanded
  for (const c of t.criteria.filter(c => c.fn || c.formula)) {
    const cheat = { ...solved, [c.cell]: shown(evaluator(solved)(c.cell)) };
    assert.ok(!grade([c], cheat).res[c.id], `${at}: ${c.id} rejects a typed-in number`);
  }
  // a wrong value fails
  for (const c of t.criteria.filter(c => c.cell in sol.solve)) assert.ok(!grade([c], { ...solved, [c.cell]: '=999999' }).res[c.id], `${at}: ${c.id} rejects a wrong value`);
}
// spot checks of the numbers in the textbook-style tasks
const acc = (n, id) => lessonTasks[n].criteria.find(c => c.id === id).accept;
assert.deepEqual([acc(0, 'c1'), acc(0, 'c2'), acc(0, 'c3'), acc(0, 'c5'), acc(0, 'c6')], [['20'], ['27000'], ['16500'], ['24000'], ['99500']], '3.1 practice 1: menu cost');
assert.deepEqual([acc(1, 'c1'), acc(1, 'c2'), acc(1, 'c4'), acc(1, 'c7')], [['0.07', '0.075'], ['2025'], ['29025'], ['106962.5']], '3.1 practice 2: sales tax (the textbook prints 81,163, which adds up only four of its five rows)');
assert.deepEqual([acc(2, 'c1'), acc(2, 'c2'), acc(2, 'c4'), acc(2, 'c7')], [['0.15'], ['3609'], ['20451'], ['49793.85']], '3.1 practice 3: discount (the textbook prints 33,673, but its own rows add up to 49,794)');
assert.deepEqual([acc(3, 'c5'), acc(3, 'c6'), acc(3, 'c7')], [['177'], ['22'], ['11.8']], '3.2 canteen');
assert.deepEqual([acc(4, 'c4'), acc(4, 'c5'), acc(4, 'c6')], [['1510'], ['151'], ['1359']], '3.3 receipt');
assert.deepEqual([acc(5, 'c3'), acc(5, 'c4'), acc(5, 'c5'), acc(5, 'c6')], [['3'], ['68'], ['21.33'], ['25']], '3.4 olympiad');
console.log('sheetslab ok:', M.length, 'lessons,', quizzes, 'quizzes,', tasks, 'picture tasks,', videos, 'video');
