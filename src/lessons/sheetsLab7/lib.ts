// Shared bits of the Informatics 7 "Spreadsheets" module (textbook chapter 3): short-answer practice, the common wrap-up page and the lesson plan card.
import { info, tag, type LabPlan, type T } from '../sheetsLab/dsl';

export const CHAPTER: T = ['Электрондық кестелермен есеп шығару', 'Решение задач с помощью электронных таблиц', 'Problem solving using spreadsheets'];
export const SUBTITLE = (pages: string): T => [`Информатика 7-сынып · 3-тарау · оқулық ${pages}-б.`, `Информатика 7 класс · глава 3 · учебник, с. ${pages}`, `Informatics Grade 7 · Chapter 3 · textbook pp. ${pages}`];

/** A practice with a short typed answer (checked on the server against `accept`, case and spaces ignored). */
export const shortTask = (t: T, prompt: T, accept: string[], points = 2, notes?: T) => ({
  type: 'task', pageType: 'interactive', templateId: 'short-answer', kind: 'practice', title: t[0], prompt: prompt[0], accept, points,
  ...(notes ? { notes: notes[0] } : {}),
  ru: { title: t[1], prompt: prompt[1], ...(notes ? { notes: notes[1] } : {}) }, en: { title: t[2], prompt: prompt[2], ...(notes ? { notes: notes[2] } : {}) },
});

/** The last page of every lesson: three sentences to finish. */
export const reflect = () => tag(info('check', ['Қорытынды: бүгін не үйрендім?', 'Итог: что я узнал сегодня?', 'Wrap-up: what did I learn today?'], [
  ['Бүгін мен … үйрендім (өз сөзіңмен жалғастыр).', 'Сегодня я научился … (продолжи своими словами).', 'Today I learned … (finish in your own words).'],
  ['Ең қызықты бөлігі: …', 'Самое интересное: …', 'The most interesting part: …'],
  ['Маған әлі түсініксіз: …', 'Мне пока непонятно: …', 'I still do not understand: …'],
]), 'check', [
  'Оқушылар үш сөйлемді дәптерге жазады, 2–3 оқушы дауыстап оқиды. «Түсініксіз» жауаптарын келесі сабақтың басында қайталаңыз.',
  'Ученики дописывают три предложения в тетрадь, 2–3 ученика читают вслух. Ответы «непонятно» разберите в начале следующего урока.',
  'Students finish three sentences in a notebook; 2–3 read aloud. Revisit the “do not understand” answers at the start of the next lesson.',
]);

const BOOK = 'A. Zhunussov, Ye. Shaniyev, I. Gesen. Informatics, Grade 7, 1st ed., Almaty, 2021';
/** The 45-minute plan: 5 + 8 + 10 + 15 + 7. `d` lists what the student does in the five stages; `pages` is the textbook page range. */
export const plan = (prior: T, pages: string, d: [T, T, T, T, T], env?: T): LabPlan => ({
  prior,
  env: env || ['Кесте: ClassFlow кестесі немесе Google Sheets. Google Docs/Sheets үшін оқушыда Google аккаунты және интернет болуы керек (аккаунт мектеп ережесіне сай ашылады). Әр оқушыға бір құрылғы.', 'Таблица: ClassFlow или Google Sheets. Для Google Docs/Sheets нужны аккаунт Google и интернет (аккаунт — по правилам школы). Каждому ученику по устройству.', 'Spreadsheet: the ClassFlow sheet or Google Sheets. Google Docs/Sheets need a Google account and the internet (the account follows the school rules). One device per student.'],
  source: [`${BOOK}, ${pages} беттер. Сабақтағы формулалар мен жауаптар кестеде орындалып тексерілген, деректер ойдан шығарылған.`, `${BOOK}, с. ${pages}. Формулы и ответы урока проверены выполнением в таблице, данные вымышленные.`, `${BOOK}, pp. ${pages}. The formulas and answers of the lesson were run in a sheet; the data are made up.`],
  stages: [{ k: 'warmup', min: 5, do: d[0] }, { k: 'together', min: 8, do: d[1] }, { k: 'example', min: 10, do: d[2] }, { k: 'practice', min: 15, do: d[3] }, { k: 'check', min: 7, do: d[4] }],
});
