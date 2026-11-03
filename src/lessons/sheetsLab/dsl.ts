// Tiny builders for the Informatics 8 "Spreadsheets" module (textbook chapter 3). Every text is a [kk, ru, en] triple,
// so a slide cannot miss a language. The sheet engine computes the accepted answers of practice tasks from a reference solution.
import { evaluator } from '../../sheet/engine';

export type T = [string, string, string];
export type SlideKind = 'explain' | 'example' | 'exampletask' | 'practice' | 'video' | 'check';

const at = (xs: T[], i: 0 | 1 | 2) => xs.map(x => x[i]);
/** The `ru` and `en` blocks of a slide: whatever `f` returns for language i. */
const langs = (f: (i: 0 | 1 | 2) => object) => ({ ru: f(1), en: f(2) });

export const titleSlide = (t: T, sub: T) => ({
  type: 'title', pageType: 'slide', templateId: 'title', title: t[0], subtitle: sub[0],
  ...langs(i => ({ title: t[i], subtitle: sub[i] })),
});

/** Text slide: kind explain | example | video. `code` shows a formula or a small table in a code block; `art` names a picture; `video` is a YouTube id. */
export const info = (kind: SlideKind, t: T, bullets: T[], o: { code?: string; notes?: T; art?: string; video?: string } = {}) => ({
  type: 'content', pageType: 'slide', templateId: 'explanation', kind, title: t[0], bullets: at(bullets, 0),
  ...(o.code ? { code: o.code, lang: 'text' } : {}), ...(o.notes ? { notes: o.notes[0] } : {}), ...(o.art ? { art: o.art } : {}), ...(o.video ? { video: o.video } : {}),
  ...langs(i => ({ title: t[i], bullets: at(bullets, i), ...(o.notes ? { notes: o.notes[i] } : {}) })),
});

/** Worked example: statement, steps, and the result the teacher reveals with a click. */
export const walk = (t: T, task: T, steps: T[], result: T, o: { art?: string; notes?: T } = {}) => {
  const head: [T, T, T] = [['Шарты', 'Условие', 'Task'], ['Алгоритм (қадамдар)', 'Алгоритм (шаги)', 'Steps'], ['Шешімі', 'Решение', 'Solution']];
  const secs = (i: 0 | 1 | 2) => [{ h: head[0][i], text: task[i] }, { h: head[1][i], bullets: at(steps, i) }, { h: head[2][i], text: result[i], hide: true }];
  return {
    type: 'solution', pageType: 'slide', templateId: 'worked-example', kind: 'exampletask', title: t[0], sections: secs(0), ...(o.art ? { art: o.art } : {}), ...(o.notes ? { notes: o.notes[0] } : {}),
    ...langs(i => ({ title: t[i], sections: secs(i), ...(o.notes ? { notes: o.notes[i] } : {}) })),
  };
};

/** Teacher's demo sheet: ready-made texts and numbers, the teacher types the formulas on the board while the class watches (editable on the board, read-only elsewhere).
 *  `cells` maps a cell to a plain string or to a [kk, ru, en] word; `fmt` is shared by the three languages. */
export const demoSheet = (t: T, steps: T[], sheet: { rows: number; cols: number; cells: Record<string, string | T>; fmt?: Record<string, object> }, notes?: T) => {
  const cells = (i: 0 | 1 | 2) => Object.fromEntries(Object.entries(sheet.cells).map(([k, v]) => [k, typeof v === 'string' ? v : v[i]]));
  const cfg = (i: 0 | 1 | 2) => ({ rows: sheet.rows, cols: sheet.cols, cells: cells(i), fmt: sheet.fmt || {} });
  return {
    type: 'content', pageType: 'slide', templateId: 'explanation', kind: 'example', title: t[0], bullets: at(steps, 0), demoSheet: cfg(0), ...(notes ? { notes: notes[0] } : {}),
    ...langs(i => ({ title: t[i], bullets: at(steps, i), demoSheet: cfg(i), ...(notes ? { notes: notes[i] } : {}) })),
  };
};

/** Auto-checked test question (one correct option). The options show on the student's phone even before the teacher opens it. */
export const quiz = (t: T, prompt: T, options: T[], answer: number, why: T, points = 1) => ({
  type: 'quiz', pageType: 'interactive', templateId: 'single-choice', kind: 'check', title: t[0], prompt: prompt[0], options: at(options, 0), answer, explanation: why[0], points,
  ...langs(i => ({ title: t[i], prompt: prompt[i], options: at(options, i), explanation: why[i] })),
});

/** A table of the picture: cell -> text. A [kk, ru, en] triple is a word that changes with the language (headers), a plain string is a number or a formula. */
export type Cell = string | T;
export interface Pic { name: string; title: T; data: Record<string, Cell>; ask: string[]; cols: number; rows: number; widths?: number[]; note?: T }
/** Every picture of a practice task; scripts/gen-sheetslab-art.mjs draws them into public/lec/inf8-<name>-<kk|ru|en>.svg. */
export const PICS: Pic[] = [];
/** The reference solutions, for the unit test only (never stored in a lesson). */
export const SOLUTIONS: { task: string; data: Record<string, string>; solve: Record<string, string>; criteria: Crit[] }[] = [];

/** One line of the marking scheme. `ref` is the formula (or value) a correct sheet has in `cell`; the engine turns it into the accepted value.
 *  `fn` demands that the cell uses that function, `formula` that it is a formula at all (a typed-in number does not count). */
export interface Crit { id: string; text: T; cell: string; points?: number; fn?: string; formula?: boolean; accept?: string[] }

const shown = (v: string) => { const n = Number(v.replace(',', '.')); return v.trim() !== '' && !Number.isNaN(n) ? String(+n.toFixed(2)) : v.trim(); };
export const r2 = (x: number) => Math.round(x * 100) / 100;

/** Practice with a picture: the student copies the table from the picture into the sheet, then the server marks every criterion and gives the points.
 *  `solve` lists the cells a correct sheet has besides the picture's data (formulas); accepted values are computed from them. */
export const labTask = (t: T, intro: T, o: { pic: Pic; alt: T; solve: Record<string, string>; criteria: Crit[]; sheet?: { rows?: number; cols?: number }; steps?: T[]; notes?: T }) => {
  PICS.push(o.pic);
  const cells: Record<string, string> = {};
  for (const [k, v] of Object.entries(o.pic.data)) cells[k] = typeof v === 'string' ? v : v[0];
  SOLUTIONS.push({ task: t[0], data: cells, solve: o.solve, criteria: o.criteria });
  const get = evaluator({ ...cells, ...o.solve });
  const total = o.criteria.reduce((n, c) => n + (c.points ?? 1), 0);
  const crit = (i: 0 | 1 | 2) => o.criteria.map(c => ({
    id: c.id, text: c.text[i], cell: c.cell, points: c.points ?? 1, ...(c.fn ? { fn: c.fn } : {}), ...(c.formula ? { formula: true } : {}),
    ...(i === 0 ? { accept: c.accept || [shown(get(c.cell))] } : {}),
  }));
  const pic = (l: string) => `lec/inf8-${o.pic.name}-${l}.svg`;
  return {
    type: 'task', pageType: 'interactive', templateId: 'short-answer', kind: 'practice', title: t[0], prompt: intro[0], points: total,
    picture: pic('kk'), pictureAlt: o.alt[0], sheet: { rows: o.sheet?.rows ?? 14, cols: o.sheet?.cols ?? 8 }, criteria: crit(0),
    ...(o.steps ? { steps: at(o.steps, 0) } : {}), ...(o.notes ? { notes: o.notes[0] } : {}),
    ...langs(i => ({ title: t[i], prompt: intro[i], picture: pic(['kk', 'ru', 'en'][i]), pictureAlt: o.alt[i], criteria: crit(i), ...(o.steps ? { steps: at(o.steps, i) } : {}), ...(o.notes ? { notes: o.notes[i] } : {}) })),
  };
};

export interface LabLesson { id: string; title: T; summary: T; objectives: T[]; terms: [string, string, string, string][]; slides: any[] }
