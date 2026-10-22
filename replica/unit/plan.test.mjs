// Checks src/schedule/plan.ts. Run: node replica/unit/plan.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/schedule/plan.ts'], bundle: true, format: 'esm', outfile: '/tmp/plan.mjs', logLevel: 'error' });
const p = await import('/tmp/plan.mjs');
assert.equal(p.weekdayOf('2026-09-01'), 2); assert.equal(p.weekdayOf('2026-09-06'), 7); assert.equal(p.weekdayOf('2026-09-07'), 1);
assert.equal(p.mondayOf('2026-09-06'), '2026-08-31'); assert.equal(p.mondayOf('2026-09-07'), '2026-09-07');
const g = p.generate('2026-09-01', '2026-09-14', [{ weekday: 2, period: 2 }, { weekday: 5, period: 4 }, { weekday: 2, period: 1 }]);
assert.deepEqual(g.map(x => x.held_on + '/' + x.period), ['2026-09-01/1', '2026-09-01/2', '2026-09-04/4', '2026-09-08/1', '2026-09-08/2', '2026-09-11/4']);
assert.deepEqual(p.generate('2026-09-01', '2026-09-01', []), []);
assert.equal(p.generate('2026-09-02', '2026-09-01', [{ weekday: 2, period: 1 }]).length, 0);
// crosses a month and a year end, and the daylight-saving change of March
assert.equal(p.generate('2026-12-28', '2027-01-12', [{ weekday: 1, period: 1 }]).map(x => x.held_on).join(), '2026-12-28,2027-01-04,2027-01-11');
assert.equal(p.generate('2027-03-20', '2027-04-05', [{ weekday: 1, period: 1 }]).map(x => x.held_on).join(), '2027-03-22,2027-03-29,2027-04-05');
assert.deepEqual(p.defaultRange(2026, 3), ['2027-01-12', '2027-03-20']);
assert.equal(p.rangeError('2026-09-01', '2026-10-25'), ''); assert.ok(p.rangeError('2026-10-25', '2026-09-01')); assert.ok(p.rangeError('2026-01-01', '2026-12-31')); assert.ok(p.rangeError('', '2026-12-31'));
console.log('plan: all checks pass');
