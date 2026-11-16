// Informatics 8, textbook chapter 3 "Spreadsheets": 8 lessons (3.1-3.7 and "Check yourself") in Kazakh, Russian and English.
// They use the lesson features of migrations 038 and 041: slide kinds, practice with a picture and a marking scheme, and pair mode.
import { L1 } from './lesson1';
import { L2, L3, L4 } from './lessons1to4';
import { L5, L6, L7, L8 } from './lessons5to8';
import type { LabLesson, T } from './dsl';
import { standard } from './standard';
import { markLesson } from './cv';

export { PICS, SOLUTIONS } from './dsl';
const o4 = (...x: string[]): T[] => x.map(v => [v, v, v] as T);
// Lessons written before the lesson standard (3.2 and 3.3 already follow it): the plan, warm-up questions and the ★ problem are added here.
const UP: Record<string, Parameters<typeof standard>[1]> = {
  'inf8lab-1': {
    prior: ['Ұяшық адресі, диапазон, қарапайым формула (7-сынып).', 'Адрес ячейки, диапазон, простая формула (7 класс).', 'Cell address, range, a simple formula (Grade 7).'],
    warm: [
      { t: ['Қайталау: формула', 'Повторение: формула', 'Review: formula'], q: ['Формула қай таңбадан басталады?', 'С какого знака начинается формула?', 'Which sign starts a formula?'], options: o4('=', '+', '#', ':'), answer: 0,
        why: ['Кесте «=» таңбасынан кейінгі жазуды есептейді.', 'Таблица вычисляет запись, которая идёт после знака «=».', 'The sheet calculates what follows the “=” sign.'] },
      { t: ['Қайталау: диапазон', 'Повторение: диапазон', 'Review: range'], q: ['B2:B6 диапазонында неше ұяшық бар?', 'Сколько ячеек в диапазоне B2:B6?', 'How many cells are in the range B2:B6?'], options: o4('4', '6', '5', '2'), answer: 2,
        why: ['B2, B3, B4, B5, B6 — бес ұяшық.', 'B2, B3, B4, B5, B6 — пять ячеек.', 'B2, B3, B4, B5, B6 make five cells.'] },
    ],
    star: { t: ['★ Күрделі есеп: абсолютті сілтеме', '★ Сложная задача: абсолютная ссылка', '★ Hard problem: absolute reference'],
      q: ['B1 = 12 (пайыз), A3 = 2500, A4 = 4000. A3 жанына =A3*$B$1/100 жазылып, бір жол төмен көшірілді. Көшірілген формула қандай сан көрсетеді?', 'B1 = 12 (процент), A3 = 2500, A4 = 4000. Рядом с A3 записали =A3*$B$1/100 и скопировали на строку ниже. Какое число покажет скопированная формула?', 'B1 = 12 (percent), A3 = 2500, A4 = 4000. Next to A3 we wrote =A3*$B$1/100 and copied it one row down. What number does the copied formula show?'],
      accept: ['480'], why: ['Шешуі: көшіргенде A3 → A4 болады, $B$1 өзгермейді: 4000 × 12 / 100 = 480.', 'Решение: при копировании A3 → A4, а $B$1 не меняется: 4000 × 12 / 100 = 480.', 'Solution: copying turns A3 into A4 while $B$1 stays: 4000 × 12 / 100 = 480.'] },
  },
  'inf8lab-4': {
    prior: ['SUM, AVERAGE, MIN, MAX, COUNT функциялары және IF (3.2–3.3).', 'Функции SUM, AVERAGE, MIN, MAX, COUNT и IF (3.2–3.3).', 'SUM, AVERAGE, MIN, MAX, COUNT and IF (3.2–3.3).'],
    warm: [
      { t: ['Қайталау: AVERAGE', 'Повторение: AVERAGE', 'Review: AVERAGE'], q: ['=AVERAGE(4;6;8) нәтижесі қандай?', 'Чему равно =AVERAGE(4;6;8)?', 'What does =AVERAGE(4;6;8) give?'], options: o4('18', '6', '8', '3'), answer: 1,
        why: ['(4 + 6 + 8) / 3 = 6.', '(4 + 6 + 8) / 3 = 6.', '(4 + 6 + 8) / 3 = 6.'] },
      { t: ['Қайталау: IF', 'Повторение: IF', 'Review: IF'], q: ['A1 = 45. =IF(A1>=50;"Өтті";"Өтпеді") не көрсетеді?', 'A1 = 45. Что покажет =IF(A1>=50;"Сдал";"Не сдал")?', 'A1 = 45. What does =IF(A1>=50;"Pass";"Fail") show?'],
        options: [['Өтті', 'Сдал', 'Pass'], ['45', '45', '45'], ['Қате', 'Ошибка', 'Error'], ['Өтпеді', 'Не сдал', 'Fail']], answer: 3,
        why: ['45 ≥ 50 шарты жалған, сондықтан үшінші аргумент шығады.', 'Условие 45 ≥ 50 ложно, поэтому выводится третий аргумент.', 'The condition 45 ≥ 50 is false, so the third argument is shown.'] },
    ],
    star: { t: ['★ Күрделі есеп: COUNTIF', '★ Сложная задача: COUNTIF', '★ Hard problem: COUNTIF'],
      q: ['A1:A8 ұяшықтарында бағалар: 5, 4, 3, 5, 4, 5, 2, 4. =COUNTIF(A1:A8;">=4") нәтижесі қандай?', 'В ячейках A1:A8 оценки: 5, 4, 3, 5, 4, 5, 2, 4. Чему равно =COUNTIF(A1:A8;">=4")?', 'Cells A1:A8 hold the marks 5, 4, 3, 5, 4, 5, 2, 4. What does =COUNTIF(A1:A8;">=4") give?'],
      accept: ['6'], why: ['Шешуі: 4 және одан жоғары бағалар — 5, 4, 5, 4, 5, 4, барлығы 6.', 'Решение: оценки 4 и выше — 5, 4, 5, 4, 5, 4, всего 6.', 'Solution: the marks of 4 and above are 5, 4, 5, 4, 5, 4, six in all.'] },
  },
  'inf8lab-5': {
    prior: ['COUNTIF, SUMIF, AVERAGE, MAX, MIN және диаграмма түрлері (3.4).', 'COUNTIF, SUMIF, AVERAGE, MAX, MIN и виды диаграмм (3.4).', 'COUNTIF, SUMIF, AVERAGE, MAX, MIN and chart types (3.4).'],
    stages: [['warmup', 5], ['together', 5], ['practice', 28], ['check', 7]],
    warm: [
      { t: ['Қайталау: шартты санау', 'Повторение: счёт по условию', 'Review: counting by a condition'], q: ['Шартқа сай ұяшықтарды қай функция санайды?', 'Какая функция считает ячейки, подходящие под условие?', 'Which function counts the cells that meet a condition?'], options: o4('SUM', 'MAX', 'COUNTIF', 'AVERAGE'), answer: 2,
        why: ['COUNTIF(диапазон; шарт) шартқа сай ұяшықтар санын береді.', 'COUNTIF(диапазон; условие) даёт число ячеек, подходящих под условие.', 'COUNTIF(range; condition) gives the number of matching cells.'] },
      { t: ['Қайталау: ең үлкен мән', 'Повторение: наибольшее значение', 'Review: the largest value'], q: ['=MAX(12;7;19;3) нәтижесі қандай?', 'Чему равно =MAX(12;7;19;3)?', 'What does =MAX(12;7;19;3) give?'], options: o4('19', '3', '41', '12'), answer: 0,
        why: ['MAX ең үлкен санды қайтарады: 19.', 'MAX возвращает наибольшее число: 19.', 'MAX returns the largest number: 19.'] },
    ],
    star: { t: ['★ Күрделі есеп: өзгеріс ауқымы', '★ Сложная задача: размах', '★ Hard problem: the spread'],
      q: ['Бес күннің температурасы: 12, 15, 9, 18, 16. =MAX(A1:A5)-MIN(A1:A5) нәтижесі қандай?', 'Температура за пять дней: 12, 15, 9, 18, 16. Чему равно =MAX(A1:A5)-MIN(A1:A5)?', 'Five days of temperature: 12, 15, 9, 18, 16. What does =MAX(A1:A5)-MIN(A1:A5) give?'],
      accept: ['9'], why: ['Шешуі: MAX = 18, MIN = 9, айырмасы 9.', 'Решение: MAX = 18, MIN = 9, разность 9.', 'Solution: MAX = 18, MIN = 9, the difference is 9.'] },
    terms: [['conclusion', 'Қорытынды — есептелген сандарға сүйеніп айтылған тұжырым', 'Вывод — утверждение, опирающееся на вычисленные числа', 'Conclusion — a statement based on the calculated numbers'],
      ['range (spread)', 'Өзгеріс ауқымы — ең үлкен және ең кіші мәннің айырмасы', 'Размах — разность наибольшего и наименьшего значений', 'Spread — the largest value minus the smallest']],
  },
  'inf8lab-6': {
    prior: ['Формула, абсолютті сілтеме, пайыз есептеу (3.1, 3.5).', 'Формула, абсолютная ссылка, вычисление процента (3.1, 3.5).', 'Formulas, absolute references, percentages (3.1, 3.5).'],
    warm: [
      { t: ['Қайталау: пайыз', 'Повторение: процент', 'Review: percentage'], q: ['200 теңгенің 10%-ы қанша?', 'Сколько составляют 10% от 200 тенге?', 'What is 10% of 200 tenge?'], options: o4('10', '20', '2', '210'), answer: 1,
        why: ['200 × 10 / 100 = 20.', '200 × 10 / 100 = 20.', '200 × 10 / 100 = 20.'] },
      { t: ['Қайталау: бекітілген ұяшық', 'Повторение: закреплённая ячейка', 'Review: a fixed cell'], q: ['Көшіргенде өзгермейтін сілтеме қайсы?', 'Какая ссылка не меняется при копировании?', 'Which reference does not change when copied?'], options: o4('B1', 'B$1', '$B1', '$B$1'), answer: 3,
        why: ['$B$1 — баған да, жол да бекітілген.', '$B$1 — закреплены и столбец, и строка.', '$B$1 fixes both the column and the row.'] },
    ],
    star: { t: ['★ Күрделі есеп: бір оқушының шығыны', '★ Сложная задача: расходы на ученика', '★ Hard problem: cost per student'],
      q: ['Саяхат: автобус 36000 теңге (бүкіл сыныпқа), билет бір оқушыға 1500 теңге. Сыныпта 24 оқушы. Бір оқушы қанша теңге төлейді?', 'Поездка: автобус 36000 тенге (на весь класс), билет 1500 тенге на ученика. В классе 24 ученика. Сколько тенге платит один ученик?', 'A trip: the bus costs 36000 tenge (for the whole class), a ticket is 1500 tenge per student. There are 24 students. How much does one student pay?'],
      accept: ['3000'], why: ['Шешуі: 36000 / 24 = 1500 (автобус үлесі), 1500 + 1500 = 3000. Формуласы: =B1/B3+B2.', 'Решение: 36000 / 24 = 1500 (доля автобуса), 1500 + 1500 = 3000. Формула: =B1/B3+B2.', 'Solution: 36000 / 24 = 1500 (the bus share), 1500 + 1500 = 3000. Formula: =B1/B3+B2.'] },
    terms: [['budget', 'Бюджет — кіріс пен шығыс жоспары', 'Бюджет — план доходов и расходов', 'Budget — a plan of income and spending'],
      ['constant', 'Тұрақты шама — есепте өзгермейтін мән, бөлек ұяшықта сақталады', 'Постоянная — значение, которое не меняется в задаче и хранится в отдельной ячейке', 'Constant — a value that does not change and is kept in its own cell']],
  },
  'inf8lab-7': {
    prior: ['IF функциясы, абсолютті сілтеме, модель құру (3.3, 3.6).', 'Функция IF, абсолютная ссылка, построение модели (3.3, 3.6).', 'The IF function, absolute references, building a model (3.3, 3.6).'],
    warm: [
      { t: ['Қайталау: IF аргументтері', 'Повторение: аргументы IF', 'Review: IF arguments'], q: ['IF функциясында неше аргумент бар?', 'Сколько аргументов у функции IF?', 'How many arguments does IF take?'], options: o4('1', '2', '3', '4'), answer: 2,
        why: ['Шарт, шарт ақиқат болғандағы мән, жалған болғандағы мән.', 'Условие, значение при истине и значение при лжи.', 'The condition, the value if true and the value if false.'] },
      { t: ['Қайталау: модель', 'Повторение: модель', 'Review: model'], q: ['Кестедегі модельдің басты артықшылығы қандай?', 'В чём главное преимущество модели в таблице?', 'What is the main advantage of a model in a sheet?'],
        options: [['Бастапқы деректі өзгертсек, нәтиже өзі қайта есептеледі', 'При изменении исходных данных результат пересчитывается сам', 'Change the input and the result recalculates itself'], ['Кесте әдемі көрінеді', 'Таблица красиво выглядит', 'The sheet looks nice'], ['Формула қажет емес', 'Формулы не нужны', 'No formulas are needed'], ['Интернет қажет емес', 'Интернет не нужен', 'No internet is needed']], answer: 0,
        why: ['Модельдің мәні — «не болады, егер…» сұрағына тез жауап алу.', 'Смысл модели — быстро отвечать на вопрос «что будет, если…».', 'A model exists to answer “what if…” quickly.'] },
    ],
    star: { t: ['★ Күрделі есеп: ішкі IF', '★ Сложная задача: вложенный IF', '★ Hard problem: nested IF'],
      q: ['B2 = 64. =IF(B2>=85;5;IF(B2>=65;4;IF(B2>=40;3;2))) қандай сан көрсетеді?', 'B2 = 64. Какое число покажет =IF(B2>=85;5;IF(B2>=65;4;IF(B2>=40;3;2)))?', 'B2 = 64. What number does =IF(B2>=85;5;IF(B2>=65;4;IF(B2>=40;3;2))) show?'],
      accept: ['3'], why: ['Шешуі: 64 ≥ 85 жалған, 64 ≥ 65 жалған, 64 ≥ 40 ақиқат → 3. Шекаралық мәнге назар аударыңыз: 65 болса 4 шығар еді.', 'Решение: 64 ≥ 85 ложно, 64 ≥ 65 ложно, 64 ≥ 40 истинно → 3. Обратите внимание на границу: при 65 было бы 4.', 'Solution: 64 ≥ 85 is false, 64 ≥ 65 is false, 64 ≥ 40 is true → 3. Mind the boundary: 65 would give 4.'] },
    terms: [['condition', 'Шарт — ақиқат немесе жалған болатын салыстыру, мысалы B2>=65', 'Условие — сравнение, которое истинно или ложно, например B2>=65', 'Condition — a comparison that is true or false, e.g. B2>=65'],
      ['salary', 'Еңбекақы — жұмыс үшін төленетін ақы', 'Заработная плата — оплата за работу', 'Salary — the pay for work']],
  },
  'inf8lab-8': {
    prior: ['3-тараудың барлық тақырыптары (3.1–3.7).', 'Все темы главы 3 (3.1–3.7).', 'Every topic of chapter 3 (3.1–3.7).'],
    stages: [['warmup', 7], ['practice', 26], ['check', 12]], warmOwn: 3, wrapUp: false,
    star: { t: ['★ Күрделі есеп: SUMIF', '★ Сложная задача: SUMIF', '★ Hard problem: SUMIF'],
      q: ['A1:A4 — сыныптар: 8A, 8B, 8A, 8B. B1:B4 — ұпайлар: 10, 20, 30, 40. =SUMIF(A1:A4;"8A";B1:B4) нәтижесі қандай?', 'A1:A4 — классы: 8A, 8B, 8A, 8B. B1:B4 — баллы: 10, 20, 30, 40. Чему равно =SUMIF(A1:A4;"8A";B1:B4)?', 'A1:A4 hold the classes 8A, 8B, 8A, 8B. B1:B4 hold the points 10, 20, 30, 40. What does =SUMIF(A1:A4;"8A";B1:B4) give?'],
      accept: ['40'], why: ['Шешуі: 8A жолдары — бірінші және үшінші: 10 + 30 = 40.', 'Решение: строки 8A — первая и третья: 10 + 30 = 40.', 'Solution: the 8A rows are the first and the third: 10 + 30 = 40.'] },
    terms: [['absolute reference', 'Абсолютті сілтеме — көшіргенде өзгермейтін адрес, мысалы $B$1', 'Абсолютная ссылка — адрес, который не меняется при копировании, например $B$1', 'Absolute reference — an address that stays when copied, e.g. $B$1'],
      ['COUNTIF', 'COUNTIF — шартқа сай ұяшықтарды санайды', 'COUNTIF — считает ячейки, подходящие под условие', 'COUNTIF — counts the cells that meet a condition'],
      ['chart', 'Диаграмма — деректердің графиктік көрінісі', 'Диаграмма — графическое представление данных', 'Chart — a picture of the data']],
  },
};
export const SHEETSLAB_LESSONS: LabLesson[] = [L1, L2, L3, L4, L5, L6, L7, L8].map(l => (UP[l.id] ? standard(l, UP[l.id]) : l)).map(markLesson);

/** Same course as the textbook-copy module (crs-inf8); this is a second module next to it. */
export const SHEETSLAB_MODULE = {
  id: 'mod-sheets-lab', course_id: 'crs-inf8', title: 'Электрондық кестелер (3-тарау)', title_kk: 'Электрондық кестелер (3-тарау)', title_ru: 'Электронные таблицы (глава 3)',
  position: 1, kind: 'lesson', quarter: 2, grade: 8,
};

export const SHEETSLAB_LESSONS_META = SHEETSLAB_LESSONS.map(l => ({
  id: l.id, title: l.title[0], title_kk: l.title[0], title_ru: l.title[1], subject: 'Информатика',
}));

export const SHEETSLAB_LESSONS_DATA: Record<string, { id: string; title: string; subject: string; plan: any; terms: any[]; slides: any[] }> = Object.fromEntries(
  SHEETSLAB_LESSONS.map(l => [l.id, {
    id: l.id, title: l.title[0], subject: 'Информатика',
    plan: {
      summary: l.summary[0], objectives: l.objectives.map(o => o[0]), grade: 8, duration: '45 минут',
      ...(l.plan ? { prior: l.plan.prior[0], env: l.plan.env[0], source: l.plan.source[0], stages: l.plan.stages.map(x => ({ k: x.k, min: x.min, do: x.do[0] })) } : {}),
      ru: { summary: l.summary[1], objectives: l.objectives.map(o => o[1]), ...(l.plan ? { prior: l.plan.prior[1], env: l.plan.env[1], source: l.plan.source[1], stages: l.plan.stages.map(x => x.do[1]) } : {}) },
      en: { summary: l.summary[2], objectives: l.objectives.map(o => o[2]), ...(l.plan ? { prior: l.plan.prior[2], env: l.plan.env[2], source: l.plan.source[2], stages: l.plan.stages.map(x => x.do[2]) } : {}) },
    },
    terms: l.terms.map(([term, kk, ru, en]) => ({ term, definition: `${kk} · ${ru} · ${en}` })),
    slides: l.slides,
  }]),
);
