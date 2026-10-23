// Checks src/prefs.ts (quarter calendar) and its use in plan.ts / model.ts. Run: node replica/unit/prefs.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
const ls = new Map(); globalThis.localStorage = { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, v), removeItem: k => ls.delete(k) };
await build({ stdin: { contents: "export * from './src/prefs.ts'; export * as plan from './src/schedule/plan.ts'; export * as model from './src/lessons/model.ts';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', outfile: '/tmp/prefs.mjs', logLevel: 'error' });
const m = await import('/tmp/prefs.mjs');
const d = m.DEFAULT_PREFS.quarters;
assert.equal(m.quartersError(d), '');
for (const [md, q] of [['09-01',1],['10-30',1],['11-03',2],['11-01',1],['12-31',2],['01-05',2],['01-12',3],['03-29',3],['03-30',4],['06-15',4],['08-20',4]]) assert.equal(m.quarterAt(md, d), q, md);
// end before start, overlap, and a quarter starting in August are refused
assert.ok(m.quartersError([{ ...d[0], to: '08-31' }, ...d.slice(1)]));
assert.ok(m.quartersError([d[0], { from: '10-01', to: '12-27' }, ...d.slice(2)]));
assert.ok(m.quartersError([{ from: '08-25', to: '10-25' }, ...d.slice(1)]));
assert.ok(m.quartersError([{ from: '09-31x', to: '10-25' }, ...d.slice(1)]));
assert.ok(m.quartersError(d.slice(0, 3)));
// a changed calendar is used by the date logic
const custom = [{ from: '09-02', to: '10-20' }, { from: '11-05', to: '12-25' }, { from: '01-10', to: '03-18' }, { from: '04-01', to: '05-25' }];
m.setPrefs({ quarters: custom, groups: 5, kbMax: 20 });
assert.deepEqual(m.plan.defaultRange(2026, 1), ['2026-09-02', '2026-10-20']); assert.deepEqual(m.plan.defaultRange(2026, 3), ['2027-01-10', '2027-03-18']); assert.deepEqual(m.plan.defaultRange(2026, 4), ['2027-04-01', '2027-05-25']);
assert.equal(m.model.quarterOf(new Date(2026, 10, 4)), 1); assert.equal(m.model.quarterOf(new Date(2026, 10, 5)), 2);
assert.equal(m.getPrefs().groups, 5); assert.equal(m.getPrefs().kbMax, 20);
// bad stored data falls back to the defaults, per field
ls.set('cf_prefs', JSON.stringify({ quarters: [1, 2], groups: 99, kbMax: 'x' })); 
m.resetPrefs(); ls.set('cf_prefs', JSON.stringify({ quarters: [1, 2], groups: 99, kbMax: 'x' }));
const bad = m.clean(JSON.parse(ls.get('cf_prefs')));
assert.deepEqual(bad.quarters, d); assert.equal(bad.groups, 3); assert.equal(bad.kbMax, 10);
console.log('prefs: all checks pass');
