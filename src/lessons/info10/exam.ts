// 2.5 БЖБ (summative test) of chapter 2: 7 tasks, 20 points. Every task has 3 variants; a student gets one per task
// (cf_qvariant over the student id and the slide index, so neighbours differ). Quizzes use `qvariants` (069); the other tasks
// use `xvariants` (answers, server only) + `xtext` (what the student sees), marked by cf_exam_submit (migration 073).
import { titleSlide, type LabLesson, type T } from '../sheetsLab/dsl';
import { SUBTITLE, opts, same, vquiz, type Var } from './lib';
import { truth } from './c';

const bin = (n: number) => n.toString(2), hex = (n: number) => n.toString(16).toUpperCase(), oct = (n: number) => n.toString(8);
const tc = (n: number) => ((n + 256) % 256).toString(2).padStart(8, '0');
const AT = [1, 3, 0];

export interface XVar { q: T; accept: string[]; why: T; widget?: object; match?: { left: T[]; right: T[] } }
/** An exam task with variants: short answer, or matching (`match`: the answer is the letters of the right column, one per left row). */
export const xtask = (t: T, points: number, vars: XVar[], o: { partial?: boolean } = {}) => {
  const text = (i: 0 | 1 | 2) => vars.map(v => ({ prompt: v.q[i], ...(v.widget ? { widget: v.widget } : {}),
    ...(v.match ? { match: { left: v.match.left.map(x => x[i]), right: v.match.right.map(x => x[i]) } } : {}) }));
  return {
    type: 'task', pageType: 'interactive', templateId: vars[0].match ? 'matching' : 'short', kind: 'check', title: t[0], prompt: '', points,
    ...(o.partial ? { partial: true } : {}),
    xvariants: vars.map(v => ({ accept: v.accept, explanation: v.why[0] })), xtext: text(0),
    ru: { title: t[1], xtext: text(1) }, en: { title: t[2], xtext: text(2) },
  };
};

/* 1. Test: 10 → 2 */
const t1: Var[] = [57, 92, 150].map((n, i) => ({ q: [`${n} санын екілік жүйеге аудар.`, `Переведи ${n} в двоичную систему.`, `Convert ${n} to binary.`],
  ...opts(bin(n), [bin(n + 1), bin(n).split('').reverse().join(''), bin(n - 2), bin(n + 4)], AT[i]), why: same(`${n} = ${bin(n)}₂`) }));
/* 2. Test: 16 → 2 */
const t2: Var[] = [0x3c, 0xa7, 0x5e].map((n, i) => ({ q: [`${hex(n)}₁₆ санын екілік жүйеге аудар.`, `Переведи ${hex(n)}₁₆ в двоичную систему.`, `Convert ${hex(n)}₁₆ to binary.`],
  ...opts(bin(n), [bin(n ^ 0xf0), bin(n + 1), bin((n & 15) * 16 + (n >> 4))], AT[(i + 1) % 3]),
  why: same(`${hex(n)[0]} = ${bin(parseInt(hex(n)[0], 16)).padStart(4, '0')}, ${hex(n)[1]} = ${bin(parseInt(hex(n)[1], 16)).padStart(4, '0')}`) }));
/* 3. Equation in binary: x + a = b */
const e1: XVar[] = [[0b1011, 0b100110], [0b1101, 0b101010], [0b10111, 0b110001]].map(([a, b]) => ({
  q: [`Теңдеуді шеш: x + ${bin(a)}₂ = ${bin(b)}₂. x-ті екілік жүйеде жаз.`, `Реши уравнение: x + ${bin(a)}₂ = ${bin(b)}₂. Запиши x в двоичной системе.`, `Solve: x + ${bin(a)}₂ = ${bin(b)}₂. Write x in binary.`],
  accept: [bin(b - a), bin(b - a).padStart(8, '0')], why: same(`x = ${bin(b)}₂ − ${bin(a)}₂ = ${b} − ${a} = ${b - a} = ${bin(b - a)}₂`) }));
/* 4. Mixed bases: x = h₁₆ + o₈ − b₂ */
const e2: XVar[] = [[0x2a, 0o17, 0b1011], [0x1d, 0o25, 0b110], [0x3b, 0o12, 0b1101]].map(([h, o, b]) => ({
  q: [`x₁₀ = ${hex(h)}₁₆ + ${oct(o)}₈ − ${bin(b)}₂. x-ті ондық жүйеде тап.`, `x₁₀ = ${hex(h)}₁₆ + ${oct(o)}₈ − ${bin(b)}₂. Найди x в десятичной.`, `x₁₀ = ${hex(h)}₁₆ + ${oct(o)}₈ − ${bin(b)}₂. Find x in decimal.`],
  accept: [String(h + o - b)], why: same(`${h} + ${o} − ${b} = ${h + o - b}`) }));
/* 5. Matching: gate → truth column (00, 01, 10, 11); 1 point per pair */
const COL: Record<string, string> = { AND: '0001', OR: '0111', XOR: '0110', NAND: '1110', NOR: '1000' };
const PERM = [[2, 0, 3, 1], [1, 3, 0, 2], [3, 2, 1, 0]];
const m1: XVar[] = ([['AND', 'OR', 'XOR', 'NAND'], ['NOR', 'AND', 'XOR', 'OR'], ['NAND', 'NOR', 'OR', 'XOR']] as const).map((gs, i) => {
  const right = PERM[i].map(k => COL[gs[k]]); // the right column in a different order per variant
  const key = gs.map(g => String.fromCharCode(65 + right.indexOf(COL[g]))).join('');
  return { q: ['Вентильді оның ақиқат кестесінің Q бағанымен сәйкестендір (кірістер AB = 00, 01, 10, 11).', 'Сопоставь вентиль со столбцом Q его таблицы истинности (входы AB = 00, 01, 10, 11).', 'Match each gate with the Q column of its truth table (inputs AB = 00, 01, 10, 11).'],
    match: { left: gs.map(g => same(`${g}(A, B)`)), right: right.map(same) }, accept: [key], why: same(gs.map(g => `${g} → ${COL[g]}`).join('; ')) };
});
/* 6. Circuit: the Q column */
const CIRC = [
  { inputs: ['A', 'B', 'C'], gates: [{ id: 'P', type: 'OR', in: ['A', 'B'] }, { id: 'N', type: 'NOT', in: ['C'] }, { id: 'Q', type: 'AND', in: ['P', 'N'] }], out: 'Q' },
  { inputs: ['A', 'B', 'C'], gates: [{ id: 'P', type: 'NAND', in: ['A', 'B'] }, { id: 'Q', type: 'XOR', in: ['P', 'C'] }], out: 'Q' },
  { inputs: ['A', 'B', 'C'], gates: [{ id: 'P', type: 'AND', in: ['A', 'C'] }, { id: 'R', type: 'NOR', in: ['B', 'C'] }, { id: 'Q', type: 'OR', in: ['P', 'R'] }], out: 'Q' },
];
export const EXAM_CIRCUITS = CIRC;
const c1: XVar[] = CIRC.map(c => ({
  q: ['Схеманың ақиқат кестесін құр. Q бағанын ABC = 000-ден 111-ге дейін 8 цифрмен жаз.', 'Построй таблицу истинности схемы. Запиши столбец Q (ABC = 000 … 111) восемью цифрами.', 'Build the circuit’s truth table. Write the Q column (ABC = 000 … 111) as 8 digits.'],
  widget: { kind: 'circuit', circuit: c, hideOut: true, hideMid: true }, accept: [truth(c)],
  why: same(`${c.gates.map(g => `${g.id} = ${g.type}(${g.in.join(', ')})`).join('; ')} → ${truth(c)}`) }));
/* 7. Two's complement */
const k1: XVar[] = [-37, -54, -90].map(n => ({
  q: [`${n} санын 8 биттік қосымша кодпен жаз.`, `Запиши ${n} в 8-битном дополнительном коде.`, `Write ${n} as an 8-bit two’s complement code.`],
  accept: [tc(n)], why: same(`${-n} = ${tc(-n)} → инверсия ${tc(-n).split('').map(b => (b === '1' ? '0' : '1')).join('')} → +1 = ${tc(n)}`) }));

const VP: T = ['Өз нұсқаңдағы сұраққа жауап бер.', 'Ответь на вопрос своего варианта.', 'Answer the question of your variant.'];

export const L5: LabLesson = {
  id: 'inf10-5', exam: true,
  title: ['2.5 БЖБ: Деректерді көрсету', '2.5 СОР: Представление данных', '2.5 Summative test: Data representation'],
  summary: ['2-тарау бойынша жиынтық бағалау: 7 тапсырма, 20 балл. Әр тапсырманың 3 нұсқасы бар, оқушыларға әртүрлі нұсқа түседі.',
    'Суммативное оценивание по главе 2: 7 заданий, 20 баллов. У каждого задания 3 варианта, ученикам попадают разные варианты.',
    'Summative assessment of chapter 2: 7 tasks, 20 points. Each task has 3 variants; students get different ones.'],
  objectives: [['Сандар жүйелері, логикалық схемалар және кодтау бойынша білімін бағалау', 'Оценить знания по системам счисления, логическим схемам и кодированию', 'Assess number systems, logic circuits and coding']],
  terms: [
    ['БЖБ', 'Бөлім бойынша жиынтық бағалау', 'Суммативное оценивание за раздел', 'Summative assessment of a unit'],
    ['two’s complement', 'Қосымша код — теріс санның екілік жазылуы', 'Дополнительный код — запись отрицательного числа', 'Two’s complement — how a negative number is stored'],
    ['truth table', 'Ақиқат кестесі', 'Таблица истинности', 'Truth table'],
  ],
  slides: [
    titleSlide(['2.5 БЖБ: Деректерді көрсету', '2.5 СОР: Представление данных', '2.5 Summative test: Data representation'], SUBTITLE),
    vquiz(['1. Тест · 10 → 2 (2 балл)', '1. Тест · 10 → 2 (2 балла)', '1. Test · 10 → 2 (2 points)'], VP, t1, 2),
    vquiz(['2. Тест · 16 → 2 (2 балл)', '2. Тест · 16 → 2 (2 балла)', '2. Test · 16 → 2 (2 points)'], VP, t2, 2),
    xtask(['3. Теңдеу · екілік жүйе (3 балл)', '3. Уравнение · двоичная система (3 балла)', '3. Equation · binary (3 points)'], 3, e1),
    xtask(['4. Есеп · аралас жүйелер (3 балл)', '4. Задача · разные системы (3 балла)', '4. Problem · mixed bases (3 points)'], 3, e2),
    xtask(['5. Сәйкестендіру · вентильдер (4 балл)', '5. Сопоставление · вентили (4 балла)', '5. Matching · gates (4 points)'], 4, m1, { partial: true }),
    xtask(['6. Схема · ақиқат кестесі (3 балл)', '6. Схема · таблица истинности (3 балла)', '6. Circuit · truth table (3 points)'], 3, c1),
    xtask(['7. Қосымша код (3 балл)', '7. Дополнительный код (3 балла)', '7. Two’s complement (3 points)'], 3, k1),
  ],
};
