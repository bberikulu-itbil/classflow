// Formative marks from lesson points (src/curriculum/grading.ts). Run: node replica/unit/grading.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/curriculum/grading.ts'], bundle: true, format: 'esm', outfile: '/tmp/grading.mjs', logLevel: 'error' });
const { pctOf, percentiles, markOf } = await import('/tmp/grading.mjs');
assert.equal(pctOf(9, 10), 90); assert.equal(pctOf(3, 0), 0); assert.equal(pctOf(12, 10), 100);
// equal scores share one rank; the best of 4 is at 87.5, the worst at 12.5
assert.deepEqual(percentiles([10, 7, 7, 2]), [87.5, 50, 50, 12.5]);
assert.deepEqual([95, 84, 4, 0].map(p => markOf('scale', p, 0)), [10, 8, 1, 1]);
assert.deepEqual([97.5, 50, 2.5].map(r => markOf('percentile', 0, r)), [10, 5, 1]);
// a hard task: everyone low on the scale, the best still get a high mark
assert.equal(markOf('mixed', 45, 95), 10); assert.equal(markOf('mixed', 92, 10), 9); assert.equal(markOf('points', 90, 90), null);
console.log('grading ok');
