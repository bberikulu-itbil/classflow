// Checks the Informatics 8 "Spreadsheets lab" module (src/lessons/sheetsLab). Run: node replica/unit/sheetslab.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict'; import { existsSync } from 'node:fs';
await build({ entryPoints: ['src/lessons/sheetsLab/index.ts'], bundle: true, format: 'esm', outfile: '/tmp/sheetslab.mjs', logLevel: 'error' });
const { SHEETSLAB_LESSONS_DATA: D, SHEETSLAB_LESSONS_META: M } = await import('/tmp/sheetslab.mjs');
await build({ entryPoints: ['src/lessons/sheetsLab/cv.ts'], bundle: true, format: 'esm', outfile: '/tmp/sheetslab-cv.mjs', logLevel: 'error' });
const { designSlide } = await import('/tmp/sheetslab-cv.mjs');
const KINDS = ['explain', 'example', 'exampletask', 'practice', 'video', 'check'];
assert.equal(M.length, 8, '8 lessons');
let practice = 0, free = 0, cells = 0;
for (const m of M) {
  const l = D[m.id];
  assert.ok(l.slides.length >= 8, m.id + ' has a full lesson');
  assert.ok(l.slides.some(s => s.kind === 'practice'), m.id + ' has a practice slide');
  for (const [i, s] of l.slides.entries()) {
    const at = `${m.id} slide ${i + 1}`;
    assert.ok(s.ru && s.ru.title, at + ' has Russian');
    if (s.kind) assert.ok(KINDS.includes(s.kind), at + ' kind');
    if (s.type === 'quiz') {
      assert.ok(s.answer >= 0 && s.answer < s.options.length, at + ' answer index');
      assert.equal(s.ru.options.length, s.options.length, at + ' ru options');
    }
    if (s.kind === 'practice' && s.free) { // open practical work, graded by the teacher
      free++;
      assert.ok(s.sheet && !s.levels && !s.accept && s.points > 0, at + ' free task: sheet, no levels, no key');
      assert.ok(s.prompt.length > 80 && s.ru.prompt.length > 80 && /1\)/.test(s.prompt) && /1\)/.test(s.ru.prompt), at + ' free task has steps in both languages');
    } else if (s.kind === 'practice') {
      practice++;
      assert.deepEqual(s.levels.map(x => x.lv), [1, 2, 3], at + ' levels L1-L3');
      assert.equal(s.ru.levels.length, 3, at + ' ru levels');
      for (const [k, lv] of s.levels.entries()) {
        assert.ok(lv.points > 0, at + ' points');
        assert.deepEqual(lv.variants.map(v => v.v), ['A', 'B'], at + ` L${lv.lv} has variants A and B`);
        assert.deepEqual(s.ru.levels[k].variants.map(v => v.v), ['A', 'B'], at + ' ru variants');
        for (const [j, v] of lv.variants.entries()) {
          assert.equal(s.ru.levels[k].variants[j].cell, v.cell, at + ' ru cell equals kk cell');
          if (v.cell) { cells++; assert.ok(s.sheet, at + ' cell check needs a sheet'); for (const c of v.cell.split(',')) { const [, col, row] = /^([A-Z])(\d+)$/.exec(c) || assert.fail(at + ' bad cell ' + c); assert.ok(col.charCodeAt(0) - 64 <= s.sheet.cols && +row <= s.sheet.rows, at + ` cell ${c} outside the sheet`); } }
        }
        for (const v of lv.variants) { assert.ok(v.accept.length && v.accept.every(a => a.trim() && a === a.trim()), at + ' accept'); assert.ok(v.prompt.length > 10); }
        for (const v of s.ru.levels[k].variants) { assert.ok(v.prompt.length > 10); assert.ok(!('accept' in v), at + ' ru has no answers'); }
        assert.notDeepEqual(lv.variants[0].accept, lv.variants[1].accept, at + ` L${lv.lv} A and B differ`);
      }
    }
  }
}
assert.equal(practice, 8, 'one levelled practice slide per lesson');
// spot checks of computed answers: textbook examples
const acc = (id, lvl, v) => D[id].slides.find(s => s.kind === 'practice').levels[lvl - 1].variants.find(x => x.v === v).accept;
assert.ok(acc('inf8lab-4', 3, 'A').includes('55'), 'copied formula 5*(8+3)');
assert.ok(acc('inf8lab-5', 3, 'A').includes('16106127360'), '15 TB in KB');
assert.ok(acc('inf8lab-3', 3, 'A').includes('42630'), '17.09.2016 as a number');
assert.ok(acc('inf8lab-8', 3, 'A').includes('3,5'), 'flat 43 -> entrance 3, floor 5');
console.log('sheetslab ok:', M.length, 'lessons,', practice, 'practice slides');
// every levelled practice has a sheet; 40 variants are answered by reading a cell, the rest are text answers (address, count, chart type)
const levelled = M.flatMap(m => D[m.id].slides.filter(s => s.kind === 'practice' && s.levels));
assert.ok(levelled.every(s => s.sheet), 'every practice has a sheet');
assert.equal(cells, 40, 'variants answered from a cell');
assert.equal(free, 6, 'free practical tasks');
assert.equal(M.flatMap(m => D[m.id].slides.filter(s => s.sheet && s.kind === 'example')).length, 3, 'example sheets');
// design: title / content / worked example slides stay plain, editable text marked design:'lab' and are drawn as canvas pages with a picture that exists, in both languages
let canvas = 0, pics = 0;
for (const m of M) for (const [i, s0] of D[m.id].slides.entries()) {
  if (['title', 'content', 'solution'].includes(s0.type)) assert.equal(s0.design, 'lab', `${m.id} slide ${i + 1} is marked for the designed look`); else assert.ok(!s0.design);
  if (s0.art) assert.ok(existsSync(`public/lec/inf8-${s0.art}.svg`), s0.art + ' exists');
  const s = designSlide(s0);
  if (s.type !== 'canvas') continue;
  canvas++;
  assert.ok(s.blocks.length >= 4 && s.ru.title && s.kind === s0.kind, 'canvas has blocks');
  for (const b of s.blocks) {
    if (b.kind === 'text') { assert.ok(b.variants.kk && b.variants.ru, `${m.id} slide ${i + 1} text has kk and ru`); assert.ok(b.size >= 12, 'readable size'); }
    if (b.kind === 'image') { pics++; assert.ok(existsSync('public/' + b.src), b.src + ' exists'); }
    if (b.kind !== 'shape') assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 960.5 && b.y + b.h <= 540.5, `${m.id} slide ${i + 1} block inside the page`);
  }
  if (s.kind === 'exampletask') assert.equal(s.blocks.filter(b => b.hide).length, 1, 'worked example hides its solution');
  // a slide that arrives with only its Russian text merged in (no `ru` block) still draws
  const merged = designSlide({ ...s0, ...(s0.ru || {}), ru: undefined }); assert.equal(merged.type, 'canvas');
}
assert.equal(canvas, 49, '49 designed slides'); assert.ok(pics >= 30, 'pictures on slides: ' + pics);
console.log('sheetslab ok:', canvas, 'canvas slides,', pics, 'pictures,', cells, 'cell checks,', free, 'free tasks');
