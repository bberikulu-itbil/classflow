// Checks src/journal/grades.ts against the printed table of the Order. Run: node replica/unit/grades.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/journal/grades.ts'], bundle: true, format: 'esm', outfile: '/tmp/grades.mjs', logLevel: 'error' });
const g = await import('/tmp/grades.mjs');
const table = { 7:[3,5,6],8:[4,6,7],9:[4,6,8],10:[4,7,9],11:[5,8,10],12:[5,8,11],13:[6,9,12],14:[6,10,12],15:[6,10,13],16:[7,11,14],17:[7,12,15],18:[8,12,16],19:[8,13,17],20:[8,13,17],25:[10,17,22],30:[12,20,26] };
for (const [m, t] of Object.entries(table)) {
  assert.deepEqual(g.thresholds(+m), t, 'thresholds ' + m);
  const [a, b, c] = t;
  assert.equal(g.gradeOfPoints(a, +m), 3); assert.equal(g.gradeOfPoints(a - 1, +m), 2);
  assert.equal(g.gradeOfPoints(b, +m), 4); assert.equal(g.gradeOfPoints(b - 1, +m), 3);
  assert.equal(g.gradeOfPoints(c, +m), 5); assert.equal(g.gradeOfPoints(c - 1, +m), 4);
}
// the worked example of the article: ҚБ 90%, БЖБ 35/45, ТЖБ 20/25 -> 81.9% -> 4; ТЖБ 22/25 -> 5
const ex = t => g.quarter(g.percents([{kind:'kb',max:10,points:9},{kind:'bzb',max:15,points:10},{kind:'bzb',max:15,points:12},{kind:'bzb',max:15,points:13},{kind:'tzb',max:25,points:t}]));
assert.equal(ex(20).grade, 4); assert.ok(Math.abs(ex(20).pct - 81.9) < 0.1); assert.equal(ex(22).grade, 5); assert.equal(ex(20).provisional, false);
// missing ТЖБ -> provisional, weights rescaled; empty cell is not a zero
const p = g.quarter(g.percents([{kind:'kb',max:10,points:10},{kind:'bzb',max:10,points:null}]));
assert.equal(p.provisional, true); assert.equal(p.grade, 5);
assert.equal(g.quarter(g.percents([])), null);
assert.equal(g.annual([4,4,5,5]), 5); assert.equal(g.annual([3,4]), 4); assert.equal(g.annual([4,4,4,5]), 4);
assert.ok(g.maxOk('bzb',7) && !g.maxOk('bzb',6) && !g.maxOk('bzb',21) && g.maxOk('tzb',25) && g.maxOk('tzb',30) && !g.maxOk('tzb',28) && g.maxOk('kb',5) && !g.maxOk('kb',0) && !g.maxOk('kb',2.5));
console.log('grades: all checks pass');
