// Checks the in-lesson spreadsheet engine (src/sheet/engine.ts). Run: node replica/unit/sheet.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/sheet/engine.ts'], bundle: true, format: 'esm', outfile: '/tmp/sheet-engine.mjs', logLevel: 'error' });
const { evaluator, shiftFormula, fill, parseAddr, colName, addr } = await import('/tmp/sheet-engine.mjs');
const ev = c => evaluator(c);
// textbook formulas (lesson 4): parentheses and copy to the next column
let g = ev({ A1: '3', A2: '3', A3: '7', A4: '=A1*(A2+A3)', B1: '5', B2: '8', B3: '3', B4: shiftFormula('=A1*(A2+A3)', 0, 1) });
assert.equal(g('A4'), '30'); assert.equal(g('B4'), '55'); assert.equal(shiftFormula('=A1*(A2+A3)', 0, 1), '=B1*(B2+B3)');
// absolute references (lesson 5): $B$1 stays when filled down
assert.equal(shiftFormula('=A2*$B$1*$B$1', 3, 1), '=B5*$B$1*$B$1');
assert.equal(shiftFormula('=A$1+$A1', 2, 2), '=C$1+$A3');
g = ev({ B1: '1024', A2: '15', B2: '=A2*$B$1*$B$1*$B$1' }); assert.equal(g('B2'), '16106127360');
// functions (lesson 6)
g = ev({ A1: '4', A2: '6', A3: '8', A4: '=SUM(A1:A3)', A5: '=AVERAGE(A1:A3)', A6: '=MAX(A1:A3)', A7: '=MIN(A1:A3)', A8: '=COUNT(A1:A3)', A9: '=SUM(A1;A3)', A10: '=ROUND(A5/7;2)' });
assert.deepEqual(['A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'].map(g), ['18', '6', '8', '4', '3', '12', '0.86']);
g = ev({ A1: '5', A2: 'a', A3: '7', B1: '1', B2: '2', B3: '3', C1: '=SUMIF(A1:A3;">5")', C2: '=COUNTIF(A1:A3;"a")', C3: '=SUMPRODUCT(A1:A3;B1:B3)', C4: '=SUMIF(B1:B3;">1";A1:A3)' });
assert.deepEqual(['C1', 'C2', 'C3', 'C4'].map(g), ['7', '1', '26', '7']);
// IF / comparisons / text
g = ev({ A1: '60', B1: '=IF(A1>=50;"сынды";"сынбады")', B2: '=IF(AND(A1>10;A1<100);1;0)', B3: '="a"&"b"&A1', B4: '=A1=60', B5: '=50%', B6: '=-A1^2' });
// like Excel, unary minus binds tighter than ^
assert.deepEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map(g), ['сынды', '1', 'ab60', 'TRUE', '0.5', '3600']);
// comma decimals, ceiling for flats (lesson 8)
g = ev({ A1: '2,5', A2: '=A1*2', A3: '=CEILING(7/3;1)', A4: '=INT(7/2)', A5: '=MOD(17;5)', A6: '=SQRT(16)+POWER(2;3)', A7: '=0.1+0.2' });
assert.deepEqual(['A2', 'A3', 'A4', 'A5', 'A6', 'A7'].map(g), ['5', '3', '3', '2', '12', '0.3']);
// errors
g = ev({ A1: '1', A2: '0', B1: '=A1/A2', B2: '=FOO(1)', B3: '=A3+', B4: '=B4', B5: '=A1+"x"', B6: '=Z999', C1: '=B1+1' });
assert.deepEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'C1'].map(g), ['#DIV/0!', '#NAME?', '#ERROR!', '#CIRC!', '#VALUE!', '#DIV/0!']);
assert.equal(g('B6'), '0'); assert.equal(g('Q1'), '');
// addresses
assert.deepEqual(parseAddr('B3'), [2, 1]); assert.equal(colName(27), 'AB'); assert.equal(addr(0, 0), 'A1');
// fill: series from two numbers (lesson 2), copy of one, formula shifting
let f = fill({ A1: '1', A2: '2' }, 0, 0, 1, 0, 9, 0); assert.equal(f.A10, '10'); assert.equal(f.A5, '5');
f = fill({ A1: '100', A2: '90' }, 0, 0, 1, 0, 11, 0); assert.equal(f.A12, '-10');
f = fill({ A1: '5', A2: '10' }, 0, 0, 1, 0, 9, 0); assert.equal(f.A10, '50');
f = fill({ A1: '7' }, 0, 0, 0, 0, 3, 0); assert.equal(f.A4, '7');
f = fill({ A1: '2', B1: '=A1*2' }, 0, 1, 0, 1, 3, 1); assert.deepEqual([f.B2, f.B4], ['=A2*2', '=A4*2']);
f = fill({ A1: '1', B1: '2', C1: '=A1+B1' }, 0, 2, 0, 2, 0, 4); assert.deepEqual([f.D1, f.E1], ['=B1+C1', '=C1+D1']);
// lesson answers: control values the accept lists expect
g = ev({ A1: '3', A2: '3', A3: '7', B1: '5', B2: '8', B3: '3', A4: '=A1*(A2+A3)', B4: '=B1*(B2+B3)' }); assert.equal(g('B4'), '55');
console.log('sheet engine ok');
