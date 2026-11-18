// 2.2 Logic gates, truth tables and circuits (merges the former 2.3 "Basic logic elements", 2.4 "Truth tables" and 2.5 "Logic gates").
import { quiz, titleSlide, type LabLesson } from '../sheetsLab/dsl';
import { reflect } from '../sheetsLab7/lib';
import { SUBTITLE, info, lab, levels, plan10, tag } from './lib';

/** Circuits of this lesson (also used by the unit test, which recomputes every accepted answer). */
export const CIRCUITS = {
  mixed: { inputs: ['A', 'B', 'C'], gates: [{ id: 'P', type: 'AND', in: ['A', 'B'] }, { id: 'N', type: 'NOT', in: ['C'] }, { id: 'Q', type: 'OR', in: ['P', 'N'] }], out: 'Q' },
  alarm: { inputs: ['D', 'W', 'S'], gates: [{ id: 'P', type: 'OR', in: ['D', 'W'] }, { id: 'Q', type: 'AND', in: ['P', 'S'] }], out: 'Q' },
  xor: { inputs: ['A', 'B'], gates: [{ id: 'P', type: 'OR', in: ['A', 'B'] }, { id: 'N', type: 'AND', in: ['A', 'B'] }, { id: 'M', type: 'NOT', in: ['N'] }, { id: 'Q', type: 'AND', in: ['P', 'M'] }], out: 'Q' },
  t1: { inputs: ['A', 'B', 'C'], gates: [{ id: 'P', type: 'AND', in: ['A', 'B'] }, { id: 'N', type: 'NOT', in: ['P'] }, { id: 'Q', type: 'OR', in: ['N', 'C'] }], out: 'Q' },
  t2: { inputs: ['A', 'B', 'C'], gates: [{ id: 'X', type: 'XOR', in: ['A', 'B'] }, { id: 'Q', type: 'AND', in: ['X', 'C'] }], out: 'Q' },
  t3: { inputs: ['A', 'B', 'C'], gates: [{ id: 'N', type: 'NOT', in: ['B'] }, { id: 'P', type: 'AND', in: ['A', 'N'] }, { id: 'R', type: 'AND', in: ['B', 'C'] }, { id: 'Q', type: 'OR', in: ['P', 'R'] }], out: 'Q' },
} as const;

export const L2: LabLesson = {
  id: 'inf10-2',
  title: ['2.2 Логикалық элементтер мен схемалар', '2.2 Логические элементы и схемы', '2.2 Logic gates and circuits'],
  summary: ['AND, OR, NOT, XOR, NAND, NOR вентильдері; ақиқат кестесін құру; бірнеше вентильден тұратын схеманың шығысын табу.',
    'Вентили AND, OR, NOT, XOR, NAND, NOR; построение таблицы истинности; выход схемы из нескольких вентилей.',
    'AND, OR, NOT, XOR, NAND, NOR gates; building a truth table; finding the output of a circuit of several gates.'],
  objectives: [
    ['Негізгі вентильдердің жұмысын ақиқат кестесімен сипаттау', 'Описывать работу основных вентилей таблицей истинности', 'Describe the basic gates with truth tables'],
    ['Схеманың шығысын кез келген кіріс үшін анықтау', 'Определять выход схемы для любых входов', 'Find a circuit’s output for any inputs'],
  ],
  terms: [
    ['logic gate', 'Логикалық вентиль — 0/1 кірістерден 0/1 шығыс жасайтын электрондық элемент', 'Логический вентиль — элемент, превращающий входы 0/1 в выход 0/1', 'Logic gate — an element that turns 0/1 inputs into a 0/1 output'],
    ['truth table', 'Ақиқат кестесі — кірістердің барлық 2ⁿ комбинациясы мен шығысы', 'Таблица истинности — все 2ⁿ комбинации входов и выход', 'Truth table — every 2ⁿ input combination and its output'],
    ['XOR', 'XOR (бөлек НЕМЕСЕ) — кірістер әртүрлі болса ғана 1', 'XOR (исключающее ИЛИ) — 1, только если входы различны', 'XOR (exclusive OR) — 1 only when the inputs differ'],
    ['NAND', 'NAND (ЖӘНЕ-ЕМЕС) — әмбебап вентиль: кез келген схеманы тек NAND-пен құруға болады', 'NAND (И-НЕ) — универсальный: любую схему можно собрать только из NAND', 'NAND — a universal gate: any circuit can be built from NAND alone'],
  ],
  plan: plan10(['Ақиқат/жалған ұғымы, екілік сандар (2.1); Python-да and, or, not таныс.', 'Понятия истина/ложь, двоичные числа (2.1); знакомы and, or, not в Python.', 'True/false, binary numbers (2.1); and, or, not in Python.'], [
    ['Екі сұрақ: тұжырым, кесте жолдары', 'Два вопроса: высказывание, строки таблицы', 'Two questions: a statement, table rows'],
    ['Вентильдерді құралда сынап, ақиқат кестесін құрады', 'Испытывает вентили в инструменте, строит таблицу истинности', 'Tries the gates in the tool and builds a truth table'],
    ['Күзет дабылы мен XOR схемасын бірге талдайды', 'Вместе разбирает сигнализацию и схему XOR', 'Works through an alarm circuit and an XOR circuit'],
    ['Схемалармен 3 есеп; үлгерген оқушы ★ (дауыс беру схемасы)', '3 задачи со схемами; кто успел — ★ (схема голосования)', '3 circuit problems; fast students take ★ (the majority circuit)'],
    ['Екі тест сұрағы және қорытынды', 'Два тестовых вопроса и итог', 'Two test questions and the wrap-up'],
  ]),
  slides: [
    titleSlide(['2.2 Логикалық элементтер мен схемалар', '2.2 Логические элементы и схемы', '2.2 Logic gates and circuits'], SUBTITLE),
    tag(quiz(['Қайталау: тұжырым', 'Повторение: высказывание', 'Review: statement'], ['«7 > 3 ЖӘНЕ 2 > 5» тұжырымының мәні қандай?', 'Каково значение высказывания «7 > 3 И 2 > 5»?', 'What is the value of “7 > 3 AND 2 > 5”?'],
      [['Ақиқат (1)', 'Истина (1)', 'True (1)'], ['Жалған (0)', 'Ложь (0)', 'False (0)'], ['7', '7', '7'], ['Анықталмаған', 'Не определено', 'Undefined']], 1,
      ['ЖӘНЕ екі бөлік те ақиқат болғанда ғана ақиқат; 2 > 5 жалған, сондықтан бәрі жалған.', 'И истинно, только если обе части истинны; 2 > 5 ложно, значит всё ложно.', 'AND is true only when both parts are; 2 > 5 is false, so the whole is false.']), 'warmup',
      ['5 минут. «Ақиқат = 1, жалған = 0» байланысын тақтаға жазып қойыңыз — сабақ бойы керек.', '5 минут. Запишите на доске «истина = 1, ложь = 0» — понадобится весь урок.', '5 minutes. Write “true = 1, false = 0” on the board — you need it all lesson.']),
    tag(quiz(['Қайталау: жолдар саны', 'Повторение: число строк', 'Review: number of rows'], ['Үш кірісті (A, B, C) схеманың ақиқат кестесінде неше жол болады?', 'Сколько строк в таблице истинности схемы с тремя входами (A, B, C)?', 'How many rows does the truth table of a 3-input circuit have?'],
      [['3', '3', '3'], ['6', '6', '6'], ['9', '9', '9'], ['8', '8', '8']], 3,
      ['Әр кіріс 0 немесе 1: 2 · 2 · 2 = 2³ = 8 комбинация.', 'Каждый вход 0 или 1: 2 · 2 · 2 = 2³ = 8 комбинаций.', 'Each input is 0 or 1: 2 · 2 · 2 = 2³ = 8 combinations.']), 'warmup'),

    tag(lab('explain', ['Негізгі вентильдер', 'Основные вентили', 'The basic gates'], [
      ['AND (ЖӘНЕ): екі кіріс те 1 болса ғана 1. OR (НЕМЕСЕ): кемінде біреуі 1 болса 1. NOT (ЕМЕС): кірісті керісінше етеді.', 'AND (И): 1, только если оба входа 1. OR (ИЛИ): 1, если хотя бы один 1. NOT (НЕ): инвертирует вход.', 'AND: 1 only if both inputs are 1. OR: 1 if at least one is 1. NOT: inverts the input.'],
      ['XOR: кірістер әртүрлі болса 1. NAND мен NOR — AND мен OR-дың шығысына NOT қосылған (сызбадағы кішкене дөңгелек).', 'XOR: 1, если входы различны. NAND и NOR — это AND и OR с NOT на выходе (кружок на схеме).', 'XOR: 1 when the inputs differ. NAND and NOR are AND and OR followed by NOT (the small circle).'],
      ['Вентильді таңда, A мен B-ны бас: сары сым — 1 сигнал, кестеде қазіргі жол жарықтанады.', 'Выбери вентиль, нажимай A и B: жёлтый провод — сигнал 1, в таблице подсвечена текущая строка.', 'Pick a gate and click A and B: a yellow wire carries 1; the current row lights up in the table.'],
    ], { kind: 'circuit', pick: true, gate: 'AND' }, {
      notes: ['10 минут. Әр вентильді тақтада сынап, сыныптан шығысты алдын ала болжауды сұраңыз. NAND-та «AND + NOT» екенін көрсетіңіз.', '10 минут. Испытайте каждый вентиль на доске, просите класс заранее угадать выход. В NAND покажите «AND + NOT».', '10 minutes. Try every gate on the board and let the class predict the output first. Show that NAND is “AND + NOT”.'],
    }), 'together'),
    tag(lab('explain', ['Ақиқат кестесін құру', 'Построение таблицы истинности', 'Building a truth table'], [
      ['1) 2ⁿ жол: кірістерді екілік санау ретімен жазамыз (000, 001, …, 111).', '1) 2ⁿ строк: входы пишем в порядке двоичного счёта (000, 001, …, 111).', '1) 2ⁿ rows: write the inputs in binary counting order (000, 001, …, 111).'],
      ['2) Әр аралық вентильге бөлек баған (P = A AND B, N = NOT C). 3) Соңғы баған — шығыс Q.', '2) Для каждого промежуточного вентиля свой столбец (P = A AND B, N = NOT C). 3) Последний — выход Q.', '2) One column per inner gate (P = A AND B, N = NOT C). 3) The last column is the output Q.'],
    ], { kind: 'circuit', circuit: CIRCUITS.mixed }, { code: 'Q = (A AND B) OR NOT C' }), 'together'),

    tag(lab('example', ['Мысал: күзет дабылы', 'Пример: охранная сигнализация', 'Example: a burglar alarm'], [
      ['Дабыл (Q) күзет қосулы (S = 1) және есік (D) НЕМЕСЕ терезе (W) ашық болғанда шырылдайды.', 'Сигнализация (Q) звенит, если охрана включена (S = 1) и открыта дверь (D) ИЛИ окно (W).', 'The alarm (Q) rings when it is armed (S = 1) and the door (D) OR the window (W) is open.'],
      ['Q = (D OR W) AND S. Кестеден: 8 жолдың тек 3-інде Q = 1.', 'Q = (D OR W) AND S. По таблице: только в 3 строках из 8 Q = 1.', 'Q = (D OR W) AND S. The table shows Q = 1 in only 3 of the 8 rows.'],
    ], { kind: 'circuit', circuit: CIRCUITS.alarm }, {
      notes: ['8 минут (мысал). Алдымен сыныптан ауызша формуланы құрастыруды сұраңыз, сосын схемада тексеріңіз. Екінші мысалда XOR-ды AND/OR/NOT-пен жинаймыз.', '8 минут (пример). Сначала пусть класс сам составит формулу словами, затем проверьте на схеме. Во втором примере собираем XOR из AND/OR/NOT.', '8 minutes (example). Let the class build the formula in words first, then check it on the circuit. The second example builds XOR from AND/OR/NOT.'],
    }), 'example'),
    tag(lab('example', ['XOR-ды AND, OR, NOT-пен жинаймыз', 'Собираем XOR из AND, OR, NOT', 'Building XOR from AND, OR, NOT'], [
      ['«Біреуі 1, бірақ екеуі бірге емес»: Q = (A OR B) AND NOT (A AND B).', '«Один из них 1, но не оба»: Q = (A OR B) AND NOT (A AND B).', '“One of them is 1, but not both”: Q = (A OR B) AND NOT (A AND B).'],
      ['Кестедегі Q бағанын XOR кестесімен салыстыр: 0110 — бірдей.', 'Сравни столбец Q с таблицей XOR: 0110 — совпадает.', 'Compare the Q column with the XOR table: 0110 — the same.'],
    ], { kind: 'circuit', circuit: CIRCUITS.xor }), 'example'),

    tag(levels(['Бір схема — үш сұрақ', 'Одна схема — три вопроса', 'One circuit — three questions'], ['Есептерді ретімен шығар: L1 дұрыс болса, L2 ашылады. Дәптерде шығарып, жауапты жаз.', 'Решай по порядку: после верного L1 откроется L2. Решай в тетради, ответ вводи здесь.', 'Solve in order: L2 opens after L1 is right. Work on paper, type the answer here.'], [
      { title: ['Бір жол', 'Одна строка', 'One row'], prompt: ['A = 1, B = 0, C = 0 болғанда Q неге тең? (0 немесе 1)', 'Чему равен Q при A = 1, B = 0, C = 0? (0 или 1)', 'What is Q for A = 1, B = 0, C = 0? (0 or 1)'], accept: ['1'] },
      { title: ['Неше жол?', 'Сколько строк?', 'How many rows?'], prompt: ['Ақиқат кестесінің неше жолында Q = 1?', 'В скольких строках таблицы Q = 1?', 'In how many rows is Q = 1?'], accept: ['4'] },
      { title: ['Бүкіл баған', 'Весь столбец', 'The whole column'], prompt: ['Q бағанын 000-ден 111-ге дейін 8 цифрмен жаз.', 'Запиши столбец Q от 000 до 111 восемью цифрами.', 'Write the Q column from 000 to 111 as 8 digits.'], accept: ['00011101'] },
    ], { widget: { kind: 'circuit', circuit: CIRCUITS.t3, hideOut: true, hideMid: true },
      notes: ['15 минут, екі слайд. Схемада шығыс жасырулы, оқушы кірістерді ауыстырып аралық сымдарды көреді. Жауаптар: 1, 4, 00011101; 0010, 00010100, 00010111.', '15 минут, два слайда. Выход схемы скрыт, промежуточные провода видны. Ответы: 1, 4, 00011101; 0010, 00010100, 00010111.', '15 minutes, two slides. The output is hidden; inner wires show. Answers: 1, 4, 00011101; 0010, 00010100, 00010111.'] }), 'practice'),
    tag(levels(['Ақиқат кестесі: L1–L3', 'Таблица истинности: L1–L3', 'Truth tables: L1–L3'], ['Есептерді ретімен шығар: L1 дұрыс болса, L2 ашылады. Дәптерде шығарып, жауапты жаз.', 'Решай по порядку: после верного L1 откроется L2. Решай в тетради, ответ вводи здесь.', 'Solve in order: L2 opens after L1 is right. Work on paper, type the answer here.'], [
      { title: ['Екі кіріс', 'Два входа', 'Two inputs'], prompt: ['Q = A AND NOT B. Q бағанын 00, 01, 10, 11 ретімен 4 цифрмен жаз.', 'Q = A AND NOT B. Запиши столбец Q (00, 01, 10, 11) четырьмя цифрами.', 'Q = A AND NOT B. Write the Q column (00, 01, 10, 11) as 4 digits.'], accept: ['0010'] },
      { title: ['Үш кіріс', 'Три входа', 'Three inputs'], prompt: ['Q = (A XOR B) AND C. Q бағанын 000-ден 111-ге дейін 8 цифрмен жаз.', 'Q = (A XOR B) AND C. Запиши столбец Q (000 … 111) восемью цифрами.', 'Q = (A XOR B) AND C. Write the Q column (000 … 111) as 8 digits.'], accept: ['00010100'] },
      { title: ['★ Дауыс беру', '★ Голосование', '★ Majority vote'], prompt: ['Үш төрешінің кемінде екеуі «иә» (1) десе, шам жанады. Q бағанын 000-ден 111-ге дейін жаз.', 'Лампа горит, если хотя бы двое из трёх судей сказали «да» (1). Запиши столбец Q (000 … 111).', 'The lamp lights when at least two of three judges say “yes” (1). Write the Q column (000 … 111).'], accept: ['00010111'],
        why: ['Q = (A AND B) OR (A AND C) OR (B AND C).', 'Q = (A AND B) OR (A AND C) OR (B AND C).', 'Q = (A AND B) OR (A AND C) OR (B AND C).'] },
    ]), 'practice'),

    tag(quiz(['Тест: NOR', 'Тест: NOR', 'Test: NOR'], ['A = 0, B = 0. NOT (A OR B) неге тең?', 'A = 0, B = 0. Чему равно NOT (A OR B)?', 'A = 0, B = 0. What is NOT (A OR B)?'],
      [['0', '0', '0'], ['1', '1', '1'], ['00', '00', '00'], ['Анықталмайды', 'Не определено', 'Undefined']], 1,
      ['A OR B = 0, ал NOT 0 = 1. Бұл — NOR вентилі.', 'A OR B = 0, а NOT 0 = 1. Это вентиль NOR.', 'A OR B = 0 and NOT 0 = 1. That is the NOR gate.']), 'check',
      ['7 минут: екі тест және қорытынды. Қате көп болса, құралда NOR-ды қайта көрсетіңіз.', '7 минут: два теста и итог. Если ошибок много, снова покажите NOR в инструменте.', '7 minutes: two tests and the wrap-up. If many are wrong, show NOR in the tool again.']),
    tag(quiz(['Тест: вентиль', 'Тест: вентиль', 'Test: gate'], ['Қай вентиль кірістер әртүрлі болғанда ғана 1 береді?', 'Какой вентиль даёт 1, только если входы различны?', 'Which gate gives 1 only when the inputs differ?'],
      [['AND', 'AND', 'AND'], ['OR', 'OR', 'OR'], ['NAND', 'NAND', 'NAND'], ['XOR', 'XOR', 'XOR']], 3,
      ['XOR кестесі: 0, 1, 1, 0. OR-дан айырмасы: 1 және 1 болғанда 0.', 'Таблица XOR: 0, 1, 1, 0. Отличие от OR: при 1 и 1 даёт 0.', 'XOR: 0, 1, 1, 0. Unlike OR it gives 0 for 1 and 1.']), 'check'),
    reflect(),
  ],
};

export { info };
