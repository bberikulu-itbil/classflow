// Informatics 10 chapter 2 (src/lessons/info10): every accepted answer recomputed, variants well-formed. Run: node replica/unit/info10.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/lessons/info10/index.ts'], bundle: true, format: 'esm', outfile: 'replica/unit/.info10.mjs', logLevel: 'error' });
await build({ entryPoints: ['src/components/LabWidgets.tsx'], bundle: true, format: 'esm', outfile: 'replica/unit/.labw.mjs', logLevel: 'error', jsx: 'automatic', external: ['react', 'react/jsx-runtime'] });
const { INFO10_LESSONS: L } = await import('./.info10.mjs');
const { truthColumn, evalCircuit } = await import('./.labw.mjs');
const tasks = Object.fromEntries(L.flatMap(l => l.slides.filter(s => s.type === 'task').map(s => [s.en.title, s])));
const acc = t => tasks[t].accept[0];
const tc = n => ((n + 256) % 256).toString(2).padStart(8, '0');
const signed = b => { const u = parseInt(b, 2); return u >= 128 ? u - 256 : u; };
// 2.1
assert.equal(acc('Convert: 10 → 2'), (173).toString(2));
assert.equal(acc('Convert: 2 → 16'), parseInt('10101101', 2).toString(16).toUpperCase());
assert.equal(acc('Binary addition'), (0b101101 + 0b11011).toString(2));
assert.equal(acc('Binary subtraction'), (0b1000000 - 0b101).toString(2));
assert.equal(acc('Convert: 8 → 10'), String(parseInt('375', 8)));
assert.equal(acc('★ Hard problem: hex addition'), (0xff + 1).toString(16));
// 2.2: the circuits on the task slides
const w = t => tasks[t].widget.circuit;
assert.equal(acc('Circuit: find the output'), String(evalCircuit(w('Circuit: find the output'), { A: 1, B: 1, C: 0 }).Q));
assert.equal(acc('Truth table: the Q column'), truthColumn(w('Truth table: the Q column')));
assert.equal(acc('Circuit: how many rows give 1?'), String([...truthColumn(w('Circuit: how many rows give 1?'))].filter(x => x === '1').length));
const maj = { inputs: ['A', 'B', 'C'], gates: [{ id: 'P', type: 'AND', in: ['A', 'B'] }, { id: 'R', type: 'AND', in: ['A', 'C'] }, { id: 'S', type: 'AND', in: ['B', 'C'] }, { id: 'T', type: 'OR', in: ['P', 'R'] }, { id: 'Q', type: 'OR', in: ['T', 'S'] }], out: 'Q' };
assert.equal(acc('★ Hard problem: majority vote'), truthColumn(maj));
// 2.3
assert.equal(acc('Two’s complement'), tc(-20));
assert.equal(+acc('Reading a code'), signed('11111110'));
assert.equal(acc('Reading a code'.replace('Reading a code', 'ASCII')), String('C'.charCodeAt(0)));
assert.equal(acc('Size in UTF-8'), String(new TextEncoder().encode('Сәлем').length));
assert.equal(+acc('★ Hard problem: overflow'), signed(tc(150)));
// 2.4
assert.equal(acc('Problem 1: hex addition'), (0x1a + 0x0f).toString(16));
assert.equal(acc('Problem 2: truth table'), [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => 1 - (a ^ b)).join(''));
assert.equal(acc('Problem 3: two’s complement'), tc(-10));
assert.equal(acc('★ Problem 4: number of bits'), String(Math.ceil(Math.log2(35))));
// tests with variants: 4 variants, 4 different options, the explanation's result is the marked option, the correct option moves
for (const s of L[3].slides.filter(s => s.qvariants)) {
  assert.equal(s.qvariants.length, 4, s.title);
  for (const v of s.qvariants) {
    assert.equal(new Set(v.options).size, 4, v.prompt);
    assert.ok(v.explanation.includes(v.options[v.answer]) || v.explanation.endsWith(v.options[v.answer]), `${v.prompt}: ${v.explanation} vs ${v.options[v.answer]}`);
  }
  assert.ok(new Set(s.qvariants.map(v => v.answer)).size > 1, `${s.title}: the correct option should move`);
  for (const lng of ['ru', 'en']) assert.equal(s[lng].qtext.length, 4);
  assert.ok(!JSON.stringify(s.qtext).includes('"answer"'), 'qtext carries no answers');
}
console.log('info10 ok');
