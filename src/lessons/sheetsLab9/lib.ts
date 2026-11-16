// Shared bits of the Informatics 9 "Databases" module (textbook chapter 2): the library database, SQL pages and tasks, the lesson plan card.
// The module leaves the textbook on purpose: every idea is done twice, in the ClassFlow sheet and in SQL (the textbook uses Google Forms and Sheets only).
import { tag, type LabPlan, type T } from '../sheetsLab/dsl';
export { prefill } from '../sheetsLab/dsl';
import { answerOf, type Row } from '../../sql/canon';
export { reflect, shortTask } from '../sheetsLab7/lib';

export const SUBTITLE = (pages: string): T => [`Информатика 9-сынып · 2-тарау «Деректер қоры» · оқулық ${pages}-б.`, `Информатика 9 класс · глава 2 «Базы данных» · учебник, с. ${pages}`, `Informatics Grade 9 · Chapter 2 “Databases” · textbook pp. ${pages}`];

/** The library of the whole module: 8 books. Genres are kept in English (as in the textbook) so a query gives the same table in every language. */
export const BOOK_ROWS: [number, string, string, string, number, number, number][] = [
  [1, 'Абай жолы', 'Мұхтар Әуезов', 'Classical', 1942, 10, 5],
  [2, 'Қан мен тер', 'Әбдіжәміл Нұрпейісов', 'Classical', 1970, 4, 4],
  [3, 'Көшпенділер', 'Ілияс Есенберлин', 'History', 1976, 6, 5],
  [4, 'Менің атым Қожа', 'Бердібек Соқпақбаев', 'Adventure', 1957, 8, 5],
  [5, 'Шерлок Холмс', 'Артур Конан Дойл', 'Detective', 1892, 5, 5],
  [6, 'Соғыс және бейбітшілік', 'Лев Толстой', 'Classical', 1869, 3, 4],
  [7, 'Алиса ғажайыптар елінде', 'Льюис Кэрролл', 'Adventure', 1865, 7, 4],
  [8, 'Алхимик', 'Пауло Коэльо', 'Adventure', 1988, 9, 3],
];
const lit = (v: string | number) => typeof v === 'number' ? String(v) : `'${v.replace(/'/g, "''")}'`;
const insert = (table: string, rows: (string | number)[][]) => `INSERT INTO ${table} VALUES\n${rows.map(r => `  (${r.map(lit).join(', ')})`).join(',\n')};`;
export const BOOKS_DDL = 'CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author TEXT, genre TEXT, year INTEGER, qty INTEGER, rating INTEGER);';
/** books(id, title, author, genre, year, qty, rating): qty = copies in the library, rating = 1..5. */
export const BOOKS = `${BOOKS_DDL}\n${insert('books', BOOK_ROWS)}`;

/** The shop of the mini project: 6 goods. value = qty * price. */
export const GOODS_ROWS: [number, string, string, number, number][] = [
  [1, 'Нан', 'Food', 20, 150], [2, 'Сүт', 'Drinks', 15, 420], [3, 'Шай', 'Drinks', 10, 900],
  [4, 'Сабын', 'Household', 12, 300], [5, 'Күріш', 'Food', 8, 650], [6, 'Шырын', 'Drinks', 9, 550],
];
export const GOODS = `CREATE TABLE goods (id INTEGER PRIMARY KEY, name TEXT, category TEXT, qty INTEGER, price INTEGER);\n${insert('goods', GOODS_ROWS)}`;

/** The reference queries, for the unit test only (never stored in a lesson): running `solve` on `setup` must give `expect`. */
export const SQL_SOLUTIONS: { task: string; setup: string; solve: string; probe?: string; expect: Row[]; ordered: boolean }[] = [];

/** An SQL page for the «example» stage: the editor opens with a ready query, the teacher runs it on the board and students on their devices. */
export const sqlDemo = (t: T, steps: T[], o: { setup: string; query: string; notes?: T }) => ({
  type: 'content', pageType: 'slide', templateId: 'explanation', kind: 'example', title: t[0], bullets: steps.map(s => s[0]), code: o.query, lang: 'sql',
  sql: { setup: o.setup, start: o.query }, ...(o.notes ? { notes: o.notes[0] } : {}),
  ru: { title: t[1], bullets: steps.map(s => s[1]), ...(o.notes ? { notes: o.notes[1] } : {}) }, en: { title: t[2], bullets: steps.map(s => s[2]), ...(o.notes ? { notes: o.notes[2] } : {}) },
});

/** An SQL task marked by the table the query returns (see src/sql/canon.ts). `expect` is that table, written by hand and checked by the unit test.
 *  `probe`: for INSERT / CREATE tasks, the query whose result is compared after the student's statements. `ordered`: the row order counts (ORDER BY tasks). */
export const sqlTask = (t: T, prompt: T, o: { setup: string; solve: string; expect: Row[]; ordered?: boolean; probe?: string; start?: string; points?: number; steps?: T[]; notes?: T }) => {
  SQL_SOLUTIONS.push({ task: t[0], setup: o.setup, solve: o.solve, probe: o.probe, expect: o.expect, ordered: !!o.ordered });
  const lang = (i: 0 | 1 | 2) => ({ title: t[i], prompt: prompt[i], ...(o.steps ? { steps: o.steps.map(s => s[i]) } : {}), ...(o.notes ? { notes: o.notes[i] } : {}) });
  return {
    type: 'task', pageType: 'interactive', templateId: 'sql', kind: 'practice', points: o.points ?? 2, accept: [answerOf(o.expect, o.ordered)],
    sql: { setup: o.setup, start: o.start ?? '', ...(o.probe ? { probe: o.probe } : {}), ...(o.ordered ? { ordered: true } : {}), rows: o.expect.length },
    ...lang(0), ru: lang(1), en: lang(2),
  };
};

export { tag };

/** The 45-minute plan: 5 + 8 + 10 + 15 + 7. `d` lists what the student does in the five stages; `pages` is the textbook page range. */
export const plan = (prior: T, pages: string, d: [T, T, T, T, T]): LabPlan => ({
  prior,
  env: ['ClassFlow кестесі және ClassFlow SQL редакторы (браузерде, орнату керек емес). Әр оқушыға бір құрылғы және интернет қажет. Google аккаунты керек емес.', 'Таблица ClassFlow и SQL-редактор ClassFlow (в браузере, устанавливать ничего не нужно). Каждому ученику нужны устройство и интернет. Аккаунт Google не нужен.', 'The ClassFlow sheet and the ClassFlow SQL editor (in the browser, nothing to install). One device per student and the internet. No Google account is needed.'],
  source: [`Информатика, 9-сынып оқулығы, 2-тарау, ${pages} беттер. Сабақ оқулықтан әдейі ауытқиды: Google Forms орнына әр тақырып кестеде және SQL-де қатар орындалады. Барлық сұраныстар мен жауаптар орындалып тексерілген, деректер оқу үшін құрастырылған.`, `Информатика, учебник 9 класса, глава 2, с. ${pages}. Урок намеренно отходит от учебника: вместо Google Forms каждая тема выполняется параллельно в таблице и в SQL. Все запросы и ответы проверены выполнением, данные учебные.`, `Informatics, Grade 9 textbook, chapter 2, pp. ${pages}. The lesson leaves the textbook on purpose: instead of Google Forms every topic is done side by side in a sheet and in SQL. Every query and answer was run; the data are made for the classroom.`],
  stages: [{ k: 'warmup', min: 5, do: d[0] }, { k: 'together', min: 8, do: d[1] }, { k: 'example', min: 10, do: d[2] }, { k: 'practice', min: 15, do: d[3] }, { k: 'check', min: 7, do: d[4] }],
});

type Cell = string | T;
const HEAD: Record<string, T> = { title: ['Атауы', 'Название', 'Title'], author: ['Авторы', 'Автор', 'Author'], genre: ['Жанры', 'Жанр', 'Genre'], year: ['Жылы', 'Год', 'Year'], qty: ['Саны', 'Кол-во', 'Qty'], rating: ['Рейтингі', 'Рейтинг', 'Rating'] };
/** The library as sheet cells: A title, B genre, C year, D qty, E rating; row 1 = headers, rows 2.. = the books with the given ids (all eight by default). */
export const booksCells = (ids: number[] = BOOK_ROWS.map(r => r[0])): Record<string, Cell> => {
  const c: Record<string, Cell> = { A1: HEAD.title, B1: HEAD.genre, C1: HEAD.year, D1: HEAD.qty, E1: HEAD.rating };
  BOOK_ROWS.filter(r => ids.includes(r[0])).forEach((r, i) => { const n = i + 2; c['A' + n] = r[1]; c['B' + n] = r[3]; c['C' + n] = String(r[4]); c['D' + n] = String(r[5]); c['E' + n] = String(r[6]); });
  return c;
};
/** The shop as sheet cells: A name, B category, C qty, D price, E value (to be calculated). */
export const goodsCells = (): Record<string, Cell> => {
  const c: Record<string, Cell> = { A1: ['Тауар', 'Товар', 'Item'], B1: ['Санаты', 'Категория', 'Category'], C1: HEAD.qty, D1: ['Бағасы', 'Цена', 'Price'], E1: ['Құны', 'Стоимость', 'Value'] };
  GOODS_ROWS.forEach((r, i) => { const n = i + 2; c['A' + n] = r[1]; c['B' + n] = r[2]; c['C' + n] = String(r[3]); c['D' + n] = String(r[4]); });
  return c;
};
/** Adds ready charts to a demo sheet page. */
export const withCharts = (s: any, charts: { id: string; type: 'bar' | 'line' | 'pie'; range: string }[]) => ({
  ...s, demoSheet: { ...s.demoSheet, charts }, ru: { ...s.ru, demoSheet: { ...s.ru.demoSheet, charts } }, en: { ...s.en, demoSheet: { ...s.en.demoSheet, charts } },
});
