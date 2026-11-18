// Pure parts of the 10th-grade widgets (src/components/LabWidgets.tsx). Run: node replica/unit/labwidgets.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/components/LabWidgets.tsx'], bundle: true, format: 'esm', outfile: 'replica/unit/.labw.mjs', logLevel: 'error', jsx: 'automatic', external: ['react', 'react/jsx-runtime'] });
const { columnOp, evalCircuit, truthColumn, gateFn } = await import('./.labw.mjs');
const strip = s => s.replace(/^0+(?=.)/, '');
// column arithmetic agrees with plain numbers in bases 2, 8, 16
for (const [a, b, base] of [['11010', '1100', 2], ['11101', '10111', 2], ['777', '1', 8], ['FF', '1A', 16], ['1000', '1', 2]]) {
  const x = parseInt(a, base), y = parseInt(b, base);
  assert.equal(strip(columnOp(a, b, base, '+').res), (x + y).toString(base).toUpperCase(), `${a}+${b} (${base})`);
  if (x >= y) assert.equal(strip(columnOp(a, b, base, '-').res), (x - y).toString(base).toUpperCase(), `${a}-${b} (${base})`);
}
// 1 + 1 carries; 10 - 1 borrows
assert.deepEqual(columnOp('1', '1', 2, '+').mark, [1, 0]);
assert.equal(columnOp('10', '1', 2, '-').mark[0], 1);
// gates and a circuit: Q = (A AND B) OR NOT C
assert.deepEqual(['AND', 'OR', 'XOR', 'NAND', 'NOR'].map(g => [[0, 0], [0, 1], [1, 0], [1, 1]].map(x => gateFn(g, x)).join('')), ['0001', '0111', '0110', '1110', '1000']);
const c = { inputs: ['A', 'B', 'C'], gates: [{ id: 'P', type: 'AND', in: ['A', 'B'] }, { id: 'N', type: 'NOT', in: ['C'] }, { id: 'Q', type: 'OR', in: ['P', 'N'] }], out: 'Q' };
assert.equal(truthColumn(c), '10101011');
assert.equal(evalCircuit(c, { A: 1, B: 1, C: 1 }).Q, 1);
console.log('lab widgets ok');
