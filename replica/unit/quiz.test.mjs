// Checks src/vocab/quiz.ts. Run: node replica/unit/quiz.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/vocab/quiz.ts'], bundle: true, format: 'esm', outfile: '/tmp/quiz.mjs', logLevel: 'error' });
const { makeQuiz } = await import('/tmp/quiz.mjs');
const seed = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const T = [
  { kk: 'алгоритм', ru: 'алгоритм', en: 'algorithm', definition: 'Есепті шешу қадамдарының тізбегі' },
  { kk: 'айнымалы', ru: 'переменная', en: 'variable', definition: 'Мәнді сақтайтын атау' },
  { kk: 'цикл', ru: 'цикл', en: 'loop', definition: 'Қайталанатын әрекет' },
  { kk: 'шарт', ru: 'условие', en: 'condition', definition: 'Таңдау жасау ережесі' },
  { kk: 'массив', ru: 'массив', en: 'array', definition: null },
];
for (let s = 1; s <= 40; s++) {
  const q = makeQuiz(T, { count: 8, kinds: ['def', 'ru', 'en'] }, seed(s));
  assert.equal(q.length, 8);
  for (const x of q) {
    assert.equal(new Set(x.options.map(o => o.toLowerCase())).size, x.options.length, 'options are distinct');
    assert.ok(x.options.length >= 2 && x.options.length <= 4);
    const t = T.find(t => t.kk === x.term);
    const right = x.kind === 'def' ? t.kk : t[x.kind];
    assert.equal(x.options[x.answer], right, 'answer index points at the right value');
    if (x.kind === 'def') assert.ok(t.definition, 'definition question only for terms with a definition');
  }
  // one question per term first: 5 terms, 8 questions -> every term appears at least once
  assert.equal(new Set(q.map(x => x.term)).size, 5);
}
// no repeats when there are enough terms
const q4 = makeQuiz(T, { count: 4, kinds: ['ru'] }, seed(3)); assert.equal(new Set(q4.map(x => x.term)).size, 4);
// a field filled for one term only cannot make a question (needs two different answers)
assert.equal(makeQuiz([{ kk: 'а', en: 'a' }, { kk: 'б' }, { kk: 'в' }], { count: 5, kinds: ['en'] }).length, 0);
// two terms with the same translation: the other one is never offered as a wrong answer
const same = makeQuiz([{ kk: 'а', ru: 'Дом' }, { kk: 'б', ru: 'дом' }, { kk: 'в', ru: 'сад' }], { count: 3, kinds: ['ru'] }, seed(5));
for (const x of same) assert.equal(new Set(x.options.map(o => o.toLowerCase())).size, x.options.length);
// fewer terms than asked, empty list, no kinds
assert.equal(makeQuiz(T.slice(0, 2), { count: 20, kinds: ['ru'] }).length, 2);
assert.equal(makeQuiz([], { count: 5, kinds: ['ru'] }).length, 0); assert.equal(makeQuiz(T, { count: 5, kinds: [] }).length, 0);
console.log('quiz: all checks pass');
