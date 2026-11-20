// Informatics 10 chapter 2 (src/lessons/info10): every accepted answer recomputed, variants well-formed. Run: node replica/unit/info10.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/lessons/info10/index.ts'], bundle: true, format: 'esm', outfile: 'replica/unit/.info10.mjs', logLevel: 'error' });
await build({ entryPoints: ['src/components/LabWidgets.tsx'], bundle: true, format: 'esm', outfile: 'replica/unit/.labw.mjs', logLevel: 'error', jsx: 'automatic', external: ['react', 'react/jsx-runtime'] });
const { INFO10_LESSONS: L } = await import('./.info10.mjs');
const { truthColumn, evalCircuit } = await import('./.labw.mjs');
// practice is grouped as L1–L3 level slides: key = "<slide en title> / L<n>"
const lvs = Object.fromEntries(L.flatMap(l => l.slides.filter(s => s.levels).flatMap(s => s.levels.map(x => [`${s.en.title} / L${x.lv}`, { ...x.variants[0], widget: s.widget }]))));
const acc = k => { assert.ok(lvs[k], `missing ${k}`); return lvs[k].accept[0]; };
const tc = n => ((n + 256) % 256).toString(2).padStart(8, '0');
const signed = b => { const u = parseInt(b, 2); return u >= 128 ? u - 256 : u; };
const gate = (f, n) => Array.from({ length: 1 << n }, (_, r) => f(...[...r.toString(2).padStart(n, '0')].map(Number))).join('');
// 2.1
assert.equal(acc('Converting: L1–L3 / L1'), (173).toString(2));
assert.equal(acc('Converting: L1–L3 / L2'), parseInt('10101101', 2).toString(16).toUpperCase());
assert.equal(acc('Converting: L1–L3 / L3'), String(parseInt('375', 8)));
assert.equal(acc('Arithmetic: L1–L3 / L1'), (0b101101 + 0b11011).toString(2));
assert.equal(acc('Arithmetic: L1–L3 / L2'), (0b1000000 - 0b101).toString(2));
assert.equal(acc('Arithmetic: L1–L3 / L3'), (0xff + 1).toString(16));
// 2.2: the circuit on the slide
const one = 'One circuit — three questions / L';
const c = lvs[one + 1].widget.circuit;
assert.equal(acc(one + 1), String(evalCircuit(c, { A: 1, B: 0, C: 0 }).Q));
assert.equal(acc(one + 3), truthColumn(c));
assert.equal(acc(one + 2), String([...truthColumn(c)].filter(x => x === '1').length));
assert.equal(acc('Build the circuit yourself: L1–L3 / L1'), gate((a, b) => a & (1 - b), 2));
assert.equal(acc('Build the circuit yourself: L1–L3 / L2'), gate((a, b, c) => a | (b & c), 3));
assert.equal(acc('Build the circuit yourself: L1–L3 / L3'), gate((a, b, c) => +(a + b + c >= 2), 3));
// 2.3
assert.equal(acc('Coding numbers: L1–L3 / L1'), tc(-20));
assert.equal(+acc('Coding numbers: L1–L3 / L2'), signed('11111110'));
assert.equal(+acc('Coding numbers: L1–L3 / L3'), signed(tc(150)));
assert.equal(acc('Coding text: L1–L3 / L1'), String('C'.charCodeAt(0)));
assert.equal(acc('Coding text: L1–L3 / L2'), String(new TextEncoder().encode('Сәлем').length));
assert.equal(acc('Coding text: L1–L3 / L3'), String.fromCharCode(0b01001000, 0b01101001));
// 2.4
assert.equal(acc('Problems: L1–L3 / L1'), (0x1a + 0x0f).toString(16));
assert.equal(acc('Problems: L1–L3 / L2'), gate((a, b) => 1 - (a ^ b), 2));
assert.equal(acc('Problems: L1–L3 / L3'), String(Math.ceil(Math.log2(35))));
// ru/en levels carry no answers
for (const l of L) for (const s of l.slides.filter(s => s.levels)) for (const g of ['ru', 'en']) { assert.equal(s[g].levels.length, s.levels.length); assert.ok(!JSON.stringify(s[g]).includes('"accept"')); }
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
// 2.5 exam: every variant's answer recomputed
const X = L[4].slides;
assert.equal(L[4].exam, true);
assert.equal(X.slice(1).reduce((n, s) => n + s.points, 0), 20, 'the exam is 20 points');
const key = (s, v) => s.xvariants[v].accept[0], num = (str, re) => str.match(re).slice(1);
for (let v = 0; v < 3; v++) {
  const q = s => s.xtext[v].prompt;
  { const [a, b] = num(q(X[3]), /x \+ ([01]+)₂ = ([01]+)₂/); assert.equal(key(X[3], v), (parseInt(b, 2) - parseInt(a, 2)).toString(2)); }
  { const [h, o, b] = num(q(X[4]), /= ([0-9A-F]+)₁₆ \+ ([0-7]+)₈ − ([01]+)₂/); assert.equal(+key(X[4], v), parseInt(h, 16) + parseInt(o, 8) - parseInt(b, 2)); }
  { const m = X[5].xtext[v].match; const col = { AND: '0001', OR: '0111', XOR: '0110', NAND: '1110', NOR: '1000' };
    const gf = { AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b) };
    assert.equal(key(X[5], v), m.left.map(l => { const g = l.split('(')[0]; const c = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([a, b]) => gf[g](a, b)).join(''); assert.equal(c, col[g]); return String.fromCharCode(65 + m.right.indexOf(c)); }).join(''));
    assert.equal(new Set(m.right).size, 4); }
  assert.equal(key(X[6], v), truthColumn(X[6].xtext[v].widget.circuit));
  { const [n] = num(q(X[7]), /^(-\d+)/); assert.equal(key(X[7], v), tc(+n)); }
  for (const s of X.slice(1)) for (const g of ['ru', 'en']) assert.ok(!JSON.stringify(s[g]).includes('accept'));
}
assert.ok(new Set([0, 1, 2].map(v => key(X[4], v))).size === 3, 'task 4 variants differ');
console.log('info10 ok');
