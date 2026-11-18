// 2.3 Coding numbers and text (the former 2.6 "ASCII and Unicode" plus how whole numbers are stored), and 2.4 Check yourself (the former 2.7).
import { quiz, titleSlide, walk, type LabLesson } from '../sheetsLab/dsl';
import { reflect } from '../sheetsLab7/lib';
import { CIRCUITS } from './b';
import { SUBTITLE, info, lab, levels, opts, plan10, same, tag, vquiz, type Var } from './lib';

export const L3: LabLesson = {
  id: 'inf10-3',
  title: ['2.3 Деректерді кодтау: сандар мен мәтін', '2.3 Кодирование данных: числа и текст', '2.3 Coding data: numbers and text'],
  summary: ['Бүтін сандар 8 битте: таңба биті, қосымша код, азайтуды қосуға айналдыру, толып кету. Таңбалар: ASCII, Unicode, UTF-8.',
    'Целые числа в 8 битах: знаковый бит, дополнительный код, вычитание через сложение, переполнение. Символы: ASCII, Unicode, UTF-8.',
    'Whole numbers in 8 bits: the sign bit, two’s complement, subtraction by addition, overflow. Characters: ASCII, Unicode, UTF-8.'],
  objectives: [
    ['Теріс бүтін санның 8 биттік қосымша кодын жазу және оқу', 'Записывать и читать 8-битный дополнительный код отрицательного числа', 'Write and read the 8-bit two’s complement of a negative number'],
    ['Таңбаның ASCII/Unicode кодын табу, мәтіннің UTF-8 көлемін есептеу', 'Находить код символа в ASCII/Unicode, считать объём текста в UTF-8', 'Find a character’s ASCII/Unicode code and the UTF-8 size of a text'],
  ],
  terms: [
    ['sign bit', 'Таңба биті — ең сол жақтағы бит: 0 — оң, 1 — теріс сан', 'Знаковый бит — крайний левый: 0 — положительное, 1 — отрицательное', 'Sign bit — the leftmost bit: 0 positive, 1 negative'],
    ['two’s complement', 'Қосымша код — |n|-ді инверсиялап, 1 қосамыз; азайту қосуға айналады', 'Дополнительный код — инвертируем |n| и прибавляем 1; вычитание становится сложением', 'Two’s complement — invert |n| and add 1; subtraction becomes addition'],
    ['overflow', 'Толып кету — нәтиже разряд торына сыймай, бұрмаланады', 'Переполнение — результат не помещается в разрядную сетку и искажается', 'Overflow — the result does not fit the bits and comes out wrong'],
    ['Unicode', 'Unicode — әлемдегі барлық таңбаның бірыңғай кестесі (U+0000 …); UTF-8 бір таңбаға 1–4 байт', 'Unicode — единая таблица всех символов (U+0000 …); UTF-8 тратит 1–4 байта на символ', 'Unicode — one table of every character (U+0000 …); UTF-8 uses 1–4 bytes per character'],
  ],
  plan: plan10(['Екілік жүйе, екілік қосу (2.1).', 'Двоичная система, двоичное сложение (2.1).', 'Binary numbers and binary addition (2.1).'], [
    ['Екі сұрақ: 8 биттің мүмкіндігі, 13-тің екілік жазбасы', 'Два вопроса: возможности 8 бит, 13 в двоичной', 'Two questions: what 8 bits hold, 13 in binary'],
    ['Таңба биті, қосымша код және ASCII/Unicode кестелерін құралда көреді', 'Смотрит знаковый бит, доп. код и таблицы ASCII/Unicode в инструменте', 'Sees the sign bit, two’s complement and ASCII/Unicode in the tools'],
    ['Хабарды екілік кодтан оқиды; 9 − 5-ті қосумен есептейді', 'Читает сообщение из двоичного кода; считает 9 − 5 сложением', 'Reads a message from binary; computes 9 − 5 by addition'],
    ['4 есеп; үлгерген оқушы ★ (толып кету)', '4 задачи; кто успел — ★ (переполнение)', '4 problems; fast students take ★ (overflow)'],
    ['Екі тест сұрағы және қорытынды', 'Два тестовых вопроса и итог', 'Two test questions and the wrap-up'],
  ]),
  slides: [
    titleSlide(['2.3 Деректерді кодтау: сандар мен мәтін', '2.3 Кодирование данных: числа и текст', '2.3 Coding data: numbers and text'], SUBTITLE),
    tag(quiz(['Қайталау: 8 бит', 'Повторение: 8 бит', 'Review: 8 bits'], ['8 битпен неше түрлі мән жазуға болады?', 'Сколько разных значений можно записать 8 битами?', 'How many different values can 8 bits hold?'],
      [['8', '8', '8'], ['16', '16', '16'], ['256', '256', '256'], ['255', '255', '255']], 2,
      ['2⁸ = 256: 0-ден 255-ке дейін (255 — ең үлкені, бірақ мәндер саны 256).', '2⁸ = 256: от 0 до 255 (255 — наибольшее, но значений 256).', '2⁸ = 256: from 0 to 255 (255 is the largest, but there are 256 values).']), 'warmup',
      ['5 минут. 255 пен 256 айырмасын (ең үлкен мән және мәндер саны) бірден талқылаңыз.', '5 минут. Сразу обсудите разницу 255 и 256 (наибольшее значение и число значений).', '5 minutes. Discuss 255 vs 256 (the largest value vs the number of values) right away.']),
    tag(quiz(['Қайталау: екілік', 'Повторение: двоичная', 'Review: binary'], ['13 санының екілік жазбасы қандай?', 'Как записать 13 в двоичной системе?', 'What is 13 in binary?'],
      [['1101', '1101', '1101'], ['1011', '1011', '1011'], ['1110', '1110', '1110'], ['10011', '10011', '10011']], 0,
      ['13 = 8 + 4 + 1 = 1101₂.', '13 = 8 + 4 + 1 = 1101₂.', '13 = 8 + 4 + 1 = 1101₂.']), 'warmup'),

    tag(lab('explain', ['Бүтін сан 8 битте', 'Целое число в 8 битах', 'A whole number in 8 bits'], [
      ['Таңбасыз: 0 … 255. Таңбалы: ең сол жақ бит — таңба (0 оң, 1 теріс), диапазоны −128 … 127.', 'Без знака: 0 … 255. Со знаком: левый бит — знак (0 плюс, 1 минус), диапазон −128 … 127.', 'Unsigned: 0 … 255. Signed: the leftmost bit is the sign (0 plus, 1 minus), range −128 … 127.'],
      ['Биттерді басып көр: бір ғана 8 бит екі түрлі оқылады — таңбасыз және таңбалы.', 'Нажимай на биты: одни и те же 8 бит читаются двумя способами — без знака и со знаком.', 'Click the bits: the same 8 bits read two ways — unsigned and signed.'],
    ], { kind: 'code', mode: 'int', value: 13 }, {
      notes: ['10 минут. 13 → 127 → 128 мысалдарын көрсетіңіз: 10000000 таңбасыз 128, таңбалы −128. Сосын −13-ке өтіңіз.', '10 минут. Покажите 13 → 127 → 128: 10000000 без знака 128, со знаком −128. Затем перейдите к −13.', '10 minutes. Show 13 → 127 → 128: 10000000 is 128 unsigned, −128 signed. Then go to −13.'],
    }), 'together'),
    tag(lab('explain', ['Қосымша код: инверсия + 1', 'Дополнительный код: инверсия + 1', 'Two’s complement: invert + 1'], [
      ['−n кодын табу: |n|-ді 8 битпен жазамыз → барлық битті ауыстырамыз → 1 қосамыз.', 'Код −n: пишем |n| в 8 битах → инвертируем все биты → прибавляем 1.', 'Code of −n: write |n| in 8 bits → invert every bit → add 1.'],
      ['Неге осылай? n + (−n) = 1 00000000: 9-шы бит сыймай тасталады да, 0 қалады. Сондықтан процессор азайтуды қосумен орындайды.', 'Зачем так? n + (−n) = 1 00000000: 9-й бит не помещается и отбрасывается, остаётся 0. Поэтому процессор вычитает сложением.', 'Why? n + (−n) = 1 00000000: the 9th bit is dropped and 0 remains, so the processor subtracts by adding.'],
    ], { kind: 'code', mode: 'int', value: -13 }), 'together'),
    tag(lab('explain', ['Таңбалар: ASCII және Unicode', 'Символы: ASCII и Unicode', 'Characters: ASCII and Unicode'], [
      ['ASCII: 128 таңба, 7 бит. A = 65, a = 97, 0 = 48 — әріптер ретімен келеді.', 'ASCII: 128 символов, 7 бит. A = 65, a = 97, 0 = 48 — буквы идут по порядку.', 'ASCII: 128 characters, 7 bits. A = 65, a = 97, 0 = 48 — letters come in order.'],
      ['Unicode: барлық әліпби (Ә = U+04D8, Қ = U+049A). UTF-8: латын 1 байт, кирилл және қазақ әріптері 2 байт, эмодзи 4 байт.', 'Unicode: все алфавиты (Ә = U+04D8, Қ = U+049A). UTF-8: латиница 1 байт, кириллица и казахские буквы 2 байта, эмодзи 4.', 'Unicode: every alphabet (Ә = U+04D8, Қ = U+049A). UTF-8: Latin 1 byte, Cyrillic and Kazakh 2 bytes, emoji 4.'],
    ], { kind: 'code', mode: 'text', value: 'Hi Қ!' }), 'together'),

    tag(walk(['Хабарды оқы', 'Прочитай сообщение', 'Read the message'], ['01001011 01111010 — ASCII кодымен жазылған екі таңба. Хабар қандай?', '01001011 01111010 — два символа в ASCII. Что за сообщение?', '01001011 01111010 — two ASCII characters. What is the message?'],
      [['Әр байтты ондыққа аударамыз: 01001011 = 64 + 8 + 2 + 1 = 75; 01111010 = 64 + 32 + 16 + 8 + 2 = 122.', 'Каждый байт переводим: 01001011 = 64 + 8 + 2 + 1 = 75; 01111010 = 64 + 32 + 16 + 8 + 2 = 122.', 'Convert each byte: 01001011 = 64 + 8 + 2 + 1 = 75; 01111010 = 64 + 32 + 16 + 8 + 2 = 122.'],
       ['ASCII: 65 = A, сондықтан 75 = K (A-дан кейінгі 10-шы). 97 = a, сондықтан 122 = z.', 'ASCII: 65 = A, значит 75 = K (10-я после A). 97 = a, значит 122 = z.', 'ASCII: 65 = A, so 75 = K (10 after A). 97 = a, so 122 = z.']],
      ['«Kz»', '«Kz»', '“Kz”'], { notes: ['8 минут (мысал). Шешімді ашпас бұрын оқушылар «Мәтін» құралына Kz деп жазып тексерсін. Екінші мысал — азайтуды қосумен есептеу.', '8 минут (пример). Перед открытием решения пусть ученики проверят, набрав Kz в инструменте. Второй пример — вычитание сложением.', '8 minutes (example). Before revealing, let students type Kz in the text tool to check. The second example subtracts by adding.'] }), 'example'),
    tag(walk(['9 − 5 = 9 + (−5)', '9 − 5 = 9 + (−5)', '9 − 5 = 9 + (−5)'], ['8 биттік қосымша кодпен 9 − 5 есепте.', 'Вычисли 9 − 5 в 8-битном дополнительном коде.', 'Compute 9 − 5 in 8-bit two’s complement.'],
      [['9 = 00001001. 5 = 00000101 → инверсия 11111010 → +1 = 11111011 (бұл −5).', '9 = 00001001. 5 = 00000101 → инверсия 11111010 → +1 = 11111011 (это −5).', '9 = 00001001. 5 = 00000101 → invert 11111010 → +1 = 11111011 (that is −5).'],
       ['00001001 + 11111011 = 1 00000100. 9-шы бит тасталады.', '00001001 + 11111011 = 1 00000100. 9-й бит отбрасываем.', '00001001 + 11111011 = 1 00000100. Drop the 9th bit.']],
      ['00000100 = 4 ✓', '00000100 = 4 ✓', '00000100 = 4 ✓']), 'example'),

    tag(levels(['Сандарды кодтау: L1–L3', 'Кодирование чисел: L1–L3', 'Coding numbers: L1–L3'], ['Есептерді ретімен шығар: L1 дұрыс болса, L2 ашылады. Дәптерде шығарып, жауапты жаз.', 'Решай по порядку: после верного L1 откроется L2. Решай в тетради, ответ вводи здесь.', 'Solve in order: L2 opens after L1 is right. Work on paper, type the answer here.'], [
      { title: ['Қосымша код', 'Доп. код', 'Two’s complement'], prompt: ['−20 санының 8 биттік қосымша кодын жаз.', 'Запиши 8-битный дополнительный код числа −20.', 'Write the 8-bit two’s complement of −20.'], accept: ['11101100'] },
      { title: ['Кодты оқу', 'Чтение кода', 'Reading a code'], prompt: ['11111110 — 8 биттік таңбалы сан. Ол ондықта неге тең?', '11111110 — 8-битное число со знаком. Чему оно равно?', '11111110 is a signed 8-bit number. What is it in decimal?'], accept: ['-2', '−2'] },
      { title: ['★ Толып кету', '★ Переполнение', '★ Overflow'], prompt: ['8 биттік таңбалы сандар: 100 + 50 қандай сан болып шығады (ондықта)?', '8-битные числа со знаком: что получится при 100 + 50 (в десятичной)?', 'Signed 8-bit numbers: what does 100 + 50 give (in decimal)?'], accept: ['-106', '−106'],
        why: ['150 = 10010110: таңба биті 1 болды, 150 − 256 = −106.', '150 = 10010110: знаковый бит стал 1, 150 − 256 = −106.', '150 = 10010110: the sign bit became 1, 150 − 256 = −106.'] },
    ], { helper: true, notes: ['15 минут, екі слайд. Жауаптар: 11101100, −2, −106; 67, 10, Hi.', '15 минут, два слайда. Ответы: 11101100, −2, −106; 67, 10, Hi.', '15 minutes, two slides. Answers: 11101100, −2, −106; 67, 10, Hi.'] }), 'practice'),
    tag(levels(['Мәтінді кодтау: L1–L3', 'Кодирование текста: L1–L3', 'Coding text: L1–L3'], ['Есептерді ретімен шығар: L1 дұрыс болса, L2 ашылады. Дәптерде шығарып, жауапты жаз.', 'Решай по порядку: после верного L1 откроется L2. Решай в тетради, ответ вводи здесь.', 'Solve in order: L2 opens after L1 is right. Work on paper, type the answer here.'], [
      { title: ['ASCII', 'ASCII', 'ASCII'], prompt: ['A әрпінің ASCII коды — 65. C әрпінің коды қандай?', 'Код A в ASCII — 65. Каков код C?', 'The ASCII code of A is 65. What is the code of C?'], accept: ['67'] },
      { title: ['UTF-8 көлемі', 'Объём UTF-8', 'UTF-8 size'], prompt: ['«Сәлем» сөзі UTF-8-те неше байт алады?', 'Сколько байт занимает «Сәлем» в UTF-8?', 'How many bytes does «Сәлем» take in UTF-8?'], accept: ['10'] },
      { title: ['★ Хабар', '★ Сообщение', '★ Message'], prompt: ['01001000 01101001 — ASCII-дағы екі таңба. Хабарды жаз.', '01001000 01101001 — два символа ASCII. Запиши сообщение.', '01001000 01101001 — two ASCII characters. Write the message.'], accept: ['Hi'],
        why: ['72 = H, 105 = i.', '72 = H, 105 = i.', '72 = H, 105 = i.'] },
    ], { widget: { kind: 'code', mode: 'text', value: 'Hello' } }), 'practice'),

    tag(quiz(['Тест: ASCII', 'Тест: ASCII', 'Test: ASCII'], ['Стандарт ASCII кестесінде неше таңба бар?', 'Сколько символов в стандартной таблице ASCII?', 'How many characters does standard ASCII have?'],
      [['256', '256', '256'], ['65 536', '65 536', '65 536'], ['128', '128', '128'], ['100', '100', '100']], 2,
      ['ASCII — 7 бит: 2⁷ = 128 таңба. 256 — кеңейтілген 8 биттік кестелер.', 'ASCII — 7 бит: 2⁷ = 128 символов. 256 — расширенные 8-битные таблицы.', 'ASCII is 7 bits: 2⁷ = 128 characters. 256 are the extended 8-bit tables.']), 'check',
      ['7 минут: екі тест және қорытынды.', '7 минут: два теста и итог.', '7 minutes: two tests and the wrap-up.']),
    tag(quiz(['Тест: таңба', 'Тест: знак', 'Test: sign'], ['Таңбалы 8 биттік санның теріс екенін қай бит көрсетеді?', 'Какой бит показывает, что 8-битное число со знаком отрицательное?', 'Which bit shows that a signed 8-bit number is negative?'],
      [['Ең оң жақ', 'Крайний правый', 'The rightmost'], ['Ең сол жақ', 'Крайний левый', 'The leftmost'], ['Ортаңғы', 'Средний', 'The middle one'], ['Бәрі 1 болуы керек', 'Все должны быть 1', 'All must be 1']], 1,
      ['Ең сол жақ (жоғары) бит — таңба биті: 1 болса, сан теріс.', 'Крайний левый (старший) бит — знаковый: если 1, число отрицательное.', 'The leftmost (highest) bit is the sign bit: 1 means negative.']), 'check'),
    reflect(),
  ],
};

/* ───────────── 2.4 Check yourself: tests with 4 variants each ───────────── */
const bin = (n: number) => n.toString(2), hex = (n: number) => n.toString(16).toUpperCase();
const tc = (n: number) => ((n + 256) % 256).toString(2).padStart(8, '0');
const AT = [0, 2, 1, 3]; // the correct option moves between variants

const decToBin: Var[] = [45, 83, 108, 201].map((n, i) => ({ q: [`${n} санын екілік жүйеге аудар.`, `Переведи ${n} в двоичную систему.`, `Convert ${n} to binary.`],
  ...opts(bin(n), [bin(n + 1), bin(n).split('').reverse().join(''), bin(n - 2), bin(n + 2), bin(n * 2)], AT[i]), why: same(`${n} = ${bin(n)}₂ (2-ге бөліп, қалдықтарды төменнен оқимыз / делим на 2 / divide by 2)`) }));
const hexToDec: Var[] = [0x2f, 0x9c, 0xb4, 0x7e].map((n, i) => ({ q: [`${hex(n)}₁₆ ондық жүйеде неге тең?`, `Чему равно ${hex(n)}₁₆ в десятичной?`, `What is ${hex(n)}₁₆ in decimal?`],
  ...opts(String(n), [String(n - 6), String(n + 16), String(parseInt(hex(n)[0], 16) + parseInt(hex(n)[1], 16)), String(n + 10)], AT[(i + 1) % 4]),
  why: same(`${hex(n)[0]} · 16 + ${hex(n)[1]} = ${parseInt(hex(n)[0], 16) * 16} + ${parseInt(hex(n)[1], 16)} = ${n}`) }));
const addBin: Var[] = [[0b1011, 0b111], [0b1101, 0b1011], [0b10110, 0b1101], [0b1111, 0b101]].map(([a, b], i) => ({
  q: [`${bin(a)}₂ + ${bin(b)}₂ = ?`, `${bin(a)}₂ + ${bin(b)}₂ = ?`, `${bin(a)}₂ + ${bin(b)}₂ = ?`],
  ...opts(bin(a + b), [bin(a | b), bin(a + b - 2), bin(a + b + 1), bin(a + b + 2)], AT[(i + 2) % 4]), why: same(`${a} + ${b} = ${a + b} = ${bin(a + b)}₂`) }));
const gates: Var[] = ([['AND', 1, 0, 0], ['OR', 0, 1, 1], ['NAND', 1, 1, 0], ['XOR', 1, 1, 0]] as const).map(([g, a, b, r], i) => ({
  q: [`A = ${a}, B = ${b}. ${g} вентилінің шығысы?`, `A = ${a}, B = ${b}. Выход вентиля ${g}?`, `A = ${a}, B = ${b}. The output of ${g}?`],
  ...opts(String(r), [String(1 - r), `${a}${b}`, '2', '11', '10'], AT[(i + 3) % 4]),
  why: [`${g}(${a}, ${b}) = ${r}`, `${g}(${a}, ${b}) = ${r}`, `${g}(${a}, ${b}) = ${r}`] as [string, string, string] }));
const rows1: Var[] = (['mixed', 't2', 't3', 'alarm'] as const).map((k, i) => {
  const c: any = CIRCUITS[k], f = c.gates.map((g: any) => `${g.id} = ${g.type}(${g.in.join(', ')})`).join('; ');
  const ones = countOnes(c);
  return { q: [`Схема: ${f}. Ақиқат кестесінің неше жолында ${c.out} = 1?`, `Схема: ${f}. В скольких строках таблицы ${c.out} = 1?`, `Circuit: ${f}. In how many rows is ${c.out} = 1?`],
    ...opts(String(ones), [String(ones + 1), String(8 - ones), String(ones - 1), '0', '8'], AT[i]),
    why: same(`${c.out}: ${truth(c)} → ${ones}`) };
});
const negCode: Var[] = [-1, -8, -3, -16].map((n, i) => ({ q: [`${n} санының 8 биттік қосымша коды?`, `8-битный дополнительный код числа ${n}?`, `The 8-bit two’s complement of ${n}?`],
  ...opts(tc(n), ['1' + tc(-n).slice(1), tc(-n).split('').map(b => (b === '1' ? '0' : '1')).join(''), tc(-n), tc(n - 1)], AT[(i + 1) % 4]),
  why: same(`|${n}| = ${tc(-n)} → ${tc(-n).split('').map(b => (b === '1' ? '0' : '1')).join('')} → +1 = ${tc(n)}`) }));
const ascii: Var[] = [['B', 66], ['F', 70], ['b', 98], ['d', 100]].map(([ch, n], i) => ({ q: [`A = 65, a = 97. «${ch}» таңбасының ASCII коды?`, `A = 65, a = 97. Код ASCII символа «${ch}»?`, `A = 65, a = 97. The ASCII code of “${ch}”?`],
  ...opts(String(n), [String(+n + 1), String(+n - 1), String(+n + 32 > 127 ? +n - 32 : +n + 32)], AT[(i + 2) % 4]), why: same(`«${ch}» = ${n}`) }));

/** Truth column of a circuit (same rule as LabWidgets.truthColumn, kept here so the lesson data does not import UI code). */
function truth(c: any): string {
  const fn = (t: string, xs: number[]) => { const v = t === 'AND' || t === 'NAND' ? +xs.every(Boolean) : t === 'OR' || t === 'NOR' ? +xs.some(Boolean) : t === 'XOR' ? xs.reduce((a, b) => a ^ b, 0) : xs[0] ? 0 : 1; return t === 'NAND' || t === 'NOR' ? 1 - v : v; };
  return Array.from({ length: 2 ** c.inputs.length }, (_, r) => {
    const v: Record<string, number> = Object.fromEntries(c.inputs.map((n: string, i: number) => [n, (r >> (c.inputs.length - 1 - i)) & 1]));
    const get = (id: string): number => (id in v ? v[id] : (v[id] = fn(c.gates.find((g: any) => g.id === id).type, c.gates.find((g: any) => g.id === id).in.map(get))));
    return get(c.out);
  }).join('');
}
function countOnes(c: any) { return truth(c).split('').filter(x => x === '1').length; }

const TESTS: [[string, string, string], Var[]][] = [
  [['Тест 1 · Аудару 10 → 2', 'Тест 1 · Перевод 10 → 2', 'Test 1 · Convert 10 → 2'], decToBin],
  [['Тест 2 · Аудару 16 → 10', 'Тест 2 · Перевод 16 → 10', 'Test 2 · Convert 16 → 10'], hexToDec],
  [['Тест 3 · Екілік қосу', 'Тест 3 · Двоичное сложение', 'Test 3 · Binary addition'], addBin],
  [['Тест 4 · Вентиль', 'Тест 4 · Вентиль', 'Test 4 · Gate'], gates],
  [['Тест 5 · Схема', 'Тест 5 · Схема', 'Test 5 · Circuit'], rows1],
  [['Тест 6 · Қосымша код', 'Тест 6 · Дополнительный код', 'Test 6 · Two’s complement'], negCode],
  [['Тест 7 · ASCII', 'Тест 7 · ASCII', 'Test 7 · ASCII'], ascii],
];
const VP: [string, string, string] = ['Әр оқушыда өз нұсқасы (A–D). Сұрақ пен жауаптар телефоныңда.', 'У каждого свой вариант (A–D). Вопрос и ответы — на твоём телефоне.', 'Everyone has their own variant (A–D). The question and options are on your phone.'];

export const L4: LabLesson = {
  id: 'inf10-4',
  title: ['2.4 Өзіңді тексер: деректерді көрсету', '2.4 Проверь себя: представление данных', '2.4 Check yourself: data representation'],
  summary: ['Тарау бойынша жұмыс: 3 практикалық есеп және 7 тест, әр тестте 4 нұсқа — көршілерде әртүрлі нұсқа.',
    'Работа по главе: 3 практические задачи и 7 тестов, в каждом 4 варианта — у соседей разные варианты.',
    'Chapter work: 3 practical problems and 7 tests with 4 variants each — neighbours get different variants.'],
  objectives: [['2-тарау бойынша білімін тексеру', 'Проверить знания по главе 2', 'Check what you know of chapter 2']],
  terms: [
    ['variant', 'Нұсқа — бір тест сұрағының әртүрлі сандармен жазылған түрі', 'Вариант — тот же вопрос с другими числами', 'Variant — the same question with other numbers'],
    ['base', 'Жүйенің негізі — цифрлар саны', 'Основание системы — число цифр', 'Base — the number of digits'],
    ['truth table', 'Ақиқат кестесі — кірістердің барлық комбинациясы мен шығысы', 'Таблица истинности — все комбинации входов и выход', 'Truth table — every input combination and the output'],
  ],
  plan: plan10(['2.1–2.3 сабақтары.', 'Уроки 2.1–2.3.', 'Lessons 2.1–2.3.'], [
    ['Ереже және бір жылы кіріс сұрағы', 'Правила и один вопрос-разминка', 'The rules and one warm-up question'],
    ['3 есеп (көмекші кестемен тексеруге болады); үлгерген оқушы ★', '3 задачи (можно проверять в таблице-помощнике); кто успел — ★', '3 problems (the helper sheet may check); fast students take ★'],
    ['7 тест, әр оқушыда өз нұсқасы', '7 тестов, у каждого свой вариант', '7 tests, each student has a variant'],
  ], [['warmup', 5], ['practice', 15], ['check', 25]]),
  slides: [
    titleSlide(['2.4 Өзіңді тексер', '2.4 Проверь себя', '2.4 Check yourself'], SUBTITLE),
    tag(info('check', ['Жұмыс ережесі', 'Правила работы', 'The rules'], [
      ['3 есеп + 7 тест. Әр тесттің 4 нұсқасы бар: көршіңнің сұрағы басқа, көшіру көмектеспейді.', '3 задачи + 7 тестов. У каждого теста 4 варианта: у соседа другой вопрос, списывание не поможет.', '3 problems + 7 tests. Each test has 4 variants: your neighbour’s question differs, copying will not help.'],
      ['Тест бір-ақ рет жіберіледі. Мұғалім келесі слайдқа өткенде 5 секунд қалады — асықпа, бірақ кешікпе.', 'Тест отправляется один раз. Когда учитель переходит дальше, остаётся 5 секунд.', 'A test is sent once. When the teacher moves on, you have 5 more seconds.'],
    ]), 'warmup', ['5 минут. Ережелер панелінде «Тапсырманы автоматты жіберу» ережесін қосыңыз: әр тест слайдқа өткенде өзі ашылады.', '5 минут. Включите в правилах «Автоматическая отправка заданий»: каждый тест откроется сам при переходе на слайд.', '5 minutes. Turn on “Send tasks automatically” in the rules: each test opens by itself when you reach its slide.']),
    tag(quiz(['Жылы кіріс', 'Разминка', 'Warm-up'], ['Қай жүйеде 9 цифры жоқ?', 'В какой системе нет цифры 9?', 'Which system has no digit 9?'],
      [['Ондық', 'Десятичной', 'Decimal'], ['16-лық', '16-ричной', 'Hexadecimal'], ['Сегіздік', 'Восьмеричной', 'Octal'], ['Ешқайсысында', 'Ни в какой', 'None']], 2,
      ['Сегіздікте цифрлар 0–7 ғана.', 'В восьмеричной только цифры 0–7.', 'Octal uses only 0–7.']), 'warmup'),
    tag(levels(['Есептер: L1–L3', 'Задачи: L1–L3', 'Problems: L1–L3'], ['Есептерді ретімен шығар: L1 дұрыс болса, L2 ашылады. Дәптерде шығарып, жауапты жаз.', 'Решай по порядку: после верного L1 откроется L2. Решай в тетради, ответ вводи здесь.', 'Solve in order: L2 opens after L1 is right. Work on paper, type the answer here.'], [
      { title: ['16-лық қосу', 'Сложение в 16-ричной', 'Hex addition'], prompt: ['1A₁₆ + 0F₁₆ = ?₁₆', '1A₁₆ + 0F₁₆ = ?₁₆', '1A₁₆ + 0F₁₆ = ?₁₆'], accept: ['29'] },
      { title: ['Ақиқат кестесі', 'Таблица истинности', 'Truth table'], prompt: ['Q = NOT (A XOR B). Q бағанын (00, 01, 10, 11) 4 цифрмен жаз.', 'Q = NOT (A XOR B). Запиши столбец Q (00, 01, 10, 11) четырьмя цифрами.', 'Q = NOT (A XOR B). Write the Q column (00, 01, 10, 11) as 4 digits.'], accept: ['1001'] },
      { title: ['★ Биттер саны', '★ Число битов', '★ Number of bits'], prompt: ['Сыныпта 35 оқушы. Әрқайсына бөлек екілік нөмір беру үшін ең аз неше бит керек?', 'В классе 35 учеников. Сколько бит минимум нужно для разных двоичных номеров?', 'A class has 35 students. What is the fewest bits that give each a different binary number?'], accept: ['6'],
        why: ['2⁵ = 32 < 35 ≤ 64 = 2⁶.', '2⁵ = 32 < 35 ≤ 64 = 2⁶.', '2⁵ = 32 < 35 ≤ 64 = 2⁶.'] },
    ], { helper: true, notes: ['15 минут. Жауаптар: 29, 1001, 6.', '15 минут. Ответы: 29, 1001, 6.', '15 minutes. Answers: 29, 1001, 6.'] }), 'practice'),
    ...TESTS.map(([t, vars], i) => tag(vquiz(t, VP, vars), 'check', i === 0 ? ['25 минут: 7 тест. Автоматты ереже қосулы болса, әр тестке ~3 минут беріп, келесі слайдқа өтіңіз. «Жауаптар» бөлімінде әр жауаптың алдында нұсқа әрпі тұрады.', '25 минут: 7 тестов. С правилом автоотправки давайте ~3 минуты на тест и переходите дальше. В «Ответах» перед ответом стоит буква варианта.', '25 minutes: 7 tests. With the auto rule on, allow ~3 minutes per test, then move on. In “Answers” each answer shows its variant letter.'] : undefined)),
    reflect(),
  ],
};
