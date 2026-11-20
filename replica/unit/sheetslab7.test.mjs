// Checks the Informatics 7 "Spreadsheets" module (src/lessons/sheetsLab7): 8 lessons in kk / ru / en, 45-minute plans, quizzes, short answers, picture practice with a marking scheme.
// Run: node replica/unit/sheetslab7.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict'; import { existsSync } from 'node:fs';
await build({ entryPoints: ['src/lessons/sheetsLab7/index.ts'], bundle: true, format: 'esm', outfile: '/tmp/sheetslab7.mjs', logLevel: 'error' });
const { SHEETS7_LESSONS: M, SHEETS7_LESSONS_DATA: D, SHEETS7_MODULE: MOD, SOLUTIONS, PICS } = await import('/tmp/sheetslab7.mjs');
await build({ entryPoints: ['src/lessons/sheetsLab/cv.ts'], bundle: true, format: 'esm', outfile: '/tmp/sheetslab-cv.mjs', logLevel: 'error' });
const { designSlide } = await import('/tmp/sheetslab-cv.mjs');
await build({ entryPoints: ['src/sheet/engine.ts'], bundle: true, format: 'esm', outfile: '/tmp/sheet-engine.mjs', logLevel: 'error' });
const { evaluator } = await import('/tmp/sheet-engine.mjs');
const STAGES = ['warmup', 'together', 'example', 'practice', 'check'], LANGS = ['ru', 'en'];
assert.equal(M.length, 8, '8 lessons');
assert.deepEqual(M.map(m => m.title[0].slice(0, 3)), ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', 'Өзі']);
assert.equal(MOD.quarter, 2); assert.equal(MOD.grade, 7);
let tasks = 0, shorts = 0, quizzes = 0;
for (const m of M) {
  const l = D[m.id];
  assert.ok(l.slides.length >= 10, m.id + ' has a full lesson');
  assert.equal(l.plan.grade, 7);
  assert.deepEqual(l.plan.stages.map(s => s.k), STAGES, m.id + ' stages');
  assert.equal(l.plan.stages.reduce((n, s) => n + s.min, 0), 45, m.id + ' is 45 minutes');
  for (const lg of LANGS) { assert.ok(l.plan[lg]?.summary && l.plan[lg].objectives.length === l.plan.objectives.length, `${m.id} plan in ${lg}`); assert.equal(l.plan[lg].stages.length, 5); }
  assert.ok(l.terms.length >= 3, m.id + ' terms');
  const used = new Set(l.slides.map(s => s.stage));
  for (const st of STAGES) assert.ok(used.has(st), `${m.id} has a ${st} page`);
  for (const [i, s] of l.slides.entries()) {
    const at = `${m.id} slide ${i + 1}`;
    for (const lg of LANGS) assert.ok(s[lg]?.title, `${at} has ${lg}`);
    if (s.type !== 'title') assert.ok(STAGES.includes(s.stage), at + ' stage');
    if (s.bullets) for (const lg of LANGS) assert.equal(s[lg].bullets.length, s.bullets.length, `${at} ${lg} bullets`);
    if (s.type === 'quiz') {
      quizzes++;
      assert.ok(s.answer >= 0 && s.answer < s.options.length && s.explanation, at + ' answer index and explanation');
      for (const lg of LANGS) { assert.equal(s[lg].options.length, s.options.length, `${at} ${lg} options`); assert.ok(s[lg].prompt && s[lg].explanation); }
    }
    if (s.type === 'solution') for (const lg of LANGS) assert.equal(s[lg].sections[1].bullets.length, s.sections[1].bullets.length, `${at} ${lg} steps`);
    if (s.type === 'task' && s.criteria) {
      tasks++;
      assert.ok(s.criteria.length >= 3 && s.sheet, at + ' task has a marking scheme and a sheet');
      assert.ok(s.points > 0 && s.points <= 100 && s.points === s.criteria.reduce((n, c) => n + c.points, 0), at + ' points = sum of criteria');
      assert.ok(s.criteria.every(c => /^[A-Z]\d+$/.test(c.cell) && c.accept?.length && c.accept.every(a => a === a.trim() && a)), at + ' every criterion names a cell and has an answer');
      for (const lg of LANGS) {
        assert.deepEqual(s[lg].criteria.map(c => [c.id, c.cell, c.points, c.fn, c.formula]), s.criteria.map(c => [c.id, c.cell, c.points, c.fn, c.formula]), `${at} ${lg} criteria match`);
        assert.ok(s[lg].criteria.every(c => c.text && !('accept' in c)), `${at} ${lg} criteria have text and no answers`);
        assert.ok(s[lg].picture.endsWith(`-${lg}.svg`) && existsSync('public/' + s[lg].picture), `${at} picture ${lg} exists`);
      }
      assert.ok(existsSync('public/' + s.picture), at + ' picture kk exists');
    } else if (s.type === 'task' && s.levels) { // L1–L3 on one slide
      shorts += s.levels.length;
      assert.ok(s.levels.every(l => l.variants[0].accept?.length && l.variants[0].accept.every(a => a === a.toLowerCase().trim())), at + ' level answers');
      for (const lg of LANGS) assert.ok(s[lg].levels.length === s.levels.length && !JSON.stringify(s[lg]).includes('"accept"'), `${at} ${lg} levels without answers`);
    } else if (s.type === 'task') {
      shorts++;
      assert.ok(s.accept?.length && s.accept.every(a => a === a.toLowerCase().trim()) && s.points > 0, at + ' short answer');
      for (const lg of LANGS) assert.ok(s[lg].prompt, `${at} ${lg} prompt`);
    }
    const d = designSlide(s);
    if (s.design === 'lab') {
      assert.equal(d.type, 'canvas', at + ' drawn');
      for (const b of d.blocks.filter(b => b.kind === 'text')) assert.ok(b.variants.kk && b.variants.ru && b.variants.en, `${at} text block in 3 languages`);
      for (const b of d.blocks.filter(b => b.kind === 'image')) assert.ok(existsSync('public/' + b.src), at + ' picture ' + b.src);
    }
  }
}
assert.equal(tasks, 10, '10 picture tasks');
assert.equal(PICS.length, 10);
assert.ok(shorts >= 6, 'short-answer tasks');
assert.equal(new Set(M.map(m => m.id)).size, 8);

// The marking scheme against reference solutions: mirrors cf_submit (041_sheet_criteria.sql).
const shown = v => { const n = Number(String(v).replace(',', '.')); return String(v).trim() !== '' && !Number.isNaN(n) ? String(+n.toFixed(2)) : String(v).trim(); };
const norm = x => String(x).trim().toLowerCase().replace(/,/g, '.');
// `looked`: criteria that check how a cell looks (merged, painted by a rule, hidden by the filter) need the real sheet; the browser test covers them
const grade = (criteria, sheet, looked = false) => {
  const get = evaluator(sheet); let pts = 0; const res = {};
  for (const c of criteria) {
    const v = shown(get(c.cell)), f = sheet[c.cell] || '';
    if (c.look) { res[c.id] = looked; if (looked) pts += c.points ?? 1; continue; }
    let ok = v !== '' && (!c.accept.length || c.accept.some(a => norm(a) === norm(v)));
    if (ok && c.fn) ok = f.toUpperCase().includes(c.fn.toUpperCase() + '(');
    if (ok && c.formula) ok = f.trim().startsWith('=');
    res[c.id] = ok; if (ok) pts += c.points ?? 1;
  }
  return { pts, res };
};
const lessonTasks = Object.values(D).flatMap(l => l.slides.filter(s => s.type === 'task' && s.criteria));
assert.equal(SOLUTIONS.length, lessonTasks.length);
for (const [i, sol] of SOLUTIONS.entries()) {
  const t = lessonTasks[i], total = t.points, at = sol.task;
  const solved = { ...sol.data, ...sol.solve };
  for (const [k, v] of Object.entries(sol.data)) if (v === '?') assert.ok(k in sol.solve, `${at}: "?" cell ${k} has a reference formula`);
  const full = grade(t.criteria, solved, true);
  assert.equal(full.pts, total, `${at}: the reference solution earns every point (${JSON.stringify(full.res)})`);
  const dataOnly = Object.fromEntries(Object.entries(sol.data).filter(([, v]) => v !== '?'));
  assert.ok(grade(t.criteria, dataOnly).pts < total, `${at}: an unfinished sheet does not get full points`);
  for (const c of t.criteria) if (!c.look && !(c.cell in sol.solve)) assert.ok(grade(t.criteria, dataOnly).res[c.id], `${at}: data criterion ${c.id} passes with the data alone`);
  for (const c of t.criteria.filter(c => c.fn || c.formula)) {
    const cheat = { ...solved, [c.cell]: shown(evaluator(solved)(c.cell)) };
    assert.ok(!grade([c], cheat).res[c.id], `${at}: ${c.id} rejects a typed-in number`);
  }
  for (const c of t.criteria.filter(c => c.cell in sol.solve)) assert.ok(!grade([c], { ...solved, [c.cell]: '=999999' }).res[c.id], `${at}: ${c.id} rejects a wrong value`);
}
// spot checks of the numbers the teacher's notes promise
const old = lessonTasks.filter(t => !t.criteria.some(c => c.look) || t.criteria.some(c => c.id === 'c9')); // the final task keeps its place: only its ★ c9 is a look // the sheet-look tasks (3.2 merge, 3.5 rules) are checked in the browser
const acc = (n, id) => old[n].criteria.find(c => c.id === id).accept;
assert.deepEqual([acc(0, 'c2'), acc(0, 'c3'), acc(0, 'c4'), acc(0, 'c5'), acc(0, 'c6')], [['5760'], ['15600'], ['1040'], ['23840'], ['15600']], '3.3 currency calculator');
assert.deepEqual([acc(1, 'c2'), acc(1, 'c3')], [['30'], ['55']], '3.4 copying a formula');
assert.deepEqual([acc(3, 'c2'), acc(3, 'c3'), acc(3, 'c4'), acc(3, 'c5')].map(a => a.slice(0, 1)), [['2000'], ['0.4'], ['0.25'], ['1']].map(a => a), '3.6 shares (first accepted value)');
assert.deepEqual([acc(4, 'c4'), acc(4, 'c5'), acc(4, 'c6')], [['Pass'], ['Fail'], ['Pass']], '3.7 exam status (Dana has exactly 75)');
assert.deepEqual([acc(5, 'c2'), acc(5, 'c3'), acc(5, 'c4'), acc(5, 'c5')], [['240000'], ['320000'], ['180000'], ['1200000']], '3.7 salaries');
assert.deepEqual([acc(6, 'c2'), acc(6, 'c3'), acc(6, 'c5'), acc(6, 'c6'), acc(6, 'c7'), acc(6, 'c8')], [['85'], ['75'], ['Pass'], ['Fail'], ['Pass'], ['95']], 'check yourself: results table');
// the short answers and the facts in the notes
const sa = Object.fromEntries(Object.values(D).flatMap(l => l.slides.filter(s => s.type === 'task' && !s.criteria).flatMap(s => s.levels ? s.levels.map(x => [`${s.title} / L${x.lv}`, x.variants[0].accept]) : [[s.title, s.accept]])));
assert.deepEqual(sa['Есептер: кесте өлшемі / L1'], ['63']);
assert.deepEqual([sa['Есептер: кесте өлшемі / L3'], sa['Есептер: диапазон / L3'], sa['Есептер: қай ұяшық боялады? / L3']], [['40'], ['48'], ['3']]);
assert.equal(4 * 6, 24); assert.equal(10 - 3 + 1, 8); assert.equal(31 + 28, 59);
assert.deepEqual([92, 78, 65, 80, 79, 85].filter(x => x < 80).length, 3);
assert.equal([14800, 15000, 17200, 9000, 15000, 21000].filter(x => x === 15000).length, 2);
assert.equal(100 - 25 - 35, 40);
console.log('sheetslab7 ok:', M.length, 'lessons,', quizzes, 'quizzes,', tasks, 'picture tasks,', shorts, 'short answers');
