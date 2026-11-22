// Shared builders of the Informatics 10 chapter 2 "Data representation" module (3 lessons + Check yourself).
// Built on the DSL of the Informatics 8 module (../sheetsLab/dsl): every text is a [kk, ru, en] triple.
import { info, tag, type LabPlan, type Read, type SlideKind, type T } from '../sheetsLab/dsl';
import { shortTask } from '../sheetsLab7/lib';

export const SUBTITLE: T = ['Информатика 10-сынып · 2-тарау «Деректерді көрсету»', 'Информатика 10 класс · глава 2 «Представление данных»', 'Informatics Grade 10 · Chapter 2 “Data representation”'];

/** A slide with an interactive piece (src/components/LabWidgets.tsx) under its text; `helper` adds the helper-sheet tab on the student's screen. */
export const lab = (kind: SlideKind, t: T, bullets: T[], widget: object, o: { notes?: T; helper?: boolean; code?: string } & Read = {}) =>
  ({ ...info(kind, t, bullets, { notes: o.notes, code: o.code, read: o.read, figs: o.figs }), widget, ...(o.helper ? { helper: true } : {}) });

/** A short-answer practice (server-checked), optionally with a widget (for example a circuit with its output hidden) and the helper sheet. */
export const task = (t: T, prompt: T, accept: string[], points = 2, o: { notes?: T; widget?: object; helper?: boolean } = {}) =>
  ({ ...shortTask(t, prompt, accept, points, o.notes), ...(o.widget ? { widget: o.widget } : {}), ...(o.helper ? { helper: true } : {}) });

export interface Var { q: T; o: T[]; a: number; why: T }
/** A test with variants: every student gets one (A, B, C, …), neighbours get different ones (cf_qvariant, migration 069).
 *  `qvariants` (with answers) stays on the server; `qtext` (questions and options only) gives the student the variant in their language. */
export const vquiz = (t: T, prompt: T, vars: Var[], points = 1) => {
  for (const v of vars) if (v.o.length !== 4 || new Set(v.o.map(x => x[0])).size !== 4 || v.a < 0 || v.a > 3) throw new Error(`${t[0]}: a variant needs 4 different options`);
  const text = (i: 0 | 1 | 2) => vars.map(v => ({ prompt: v.q[i], options: v.o.map(x => x[i]) }));
  return {
    type: 'quiz', pageType: 'interactive', templateId: 'single-choice', kind: 'check', title: t[0], prompt: prompt[0], points,
    qvariants: vars.map(v => ({ prompt: v.q[0], options: v.o.map(x => x[0]), answer: v.a, explanation: v.why[0] })), qtext: text(0),
    explanation: vars[0].why[0],
    ru: { title: t[1], prompt: prompt[1], qtext: text(1) }, en: { title: t[2], prompt: prompt[2], qtext: text(2) },
  };
};
/** The same text in the three languages (numbers, codes, formulas). */
export const same = (s: string): T => [s, s, s];
/** Four options from a correct value and three wrong ones, the correct one put at `at`. */
export const opts = (right: string, wrong: string[], at: number): { o: T[]; a: number } => {
  const xs = wrong.filter((x, i) => x !== right && wrong.indexOf(x) === i).slice(0, 3); // candidates in order of preference, duplicates skipped
  if (xs.length < 3) throw new Error(`not enough wrong options for ${right}`);
  xs.splice(at, 0, right);
  return { o: xs.map(same), a: at };
};

export const plan10 = (prior: T, d: T[], stages: [string, number][] = [['warmup', 5], ['together', 10], ['example', 8], ['practice', 15], ['check', 7]]): LabPlan => ({
  prior,
  env: ['ClassFlow: интерактивті слайдтар (сандар жүйесі, схемалар, кодтар) және «Көмекші кесте» (DEC2BIN, BIN2DEC, DEC2HEX, HEX2DEC функциялары). Әр оқушыға құрылғы мен интернет.',
    'ClassFlow: интерактивные слайды (системы счисления, схемы, коды) и «Таблица-помощник» (функции DEC2BIN, BIN2DEC, DEC2HEX, HEX2DEC). Каждому ученику устройство и интернет.',
    'ClassFlow: interactive slides (number systems, circuits, codes) and the “Helper sheet” (DEC2BIN, BIN2DEC, DEC2HEX, HEX2DEC). A device and the internet per student.'],
  source: ['Информатика 10-сынып оқулығы, 2-тарау «Деректерді көрсету» (беттерін мұғалім нақтылайды). Барлық жауап бағдарламамен есептеліп тексерілген.',
    'Учебник информатики 10 класса, глава 2 «Представление данных» (страницы уточняет учитель). Все ответы вычислены и проверены программой.',
    'Informatics Grade 10 textbook, chapter 2 “Data representation” (the teacher adds the pages). Every answer was computed and checked by a program.'],
  stages: stages.map(([k, min], i) => ({ k, min, do: d[i] })),
});

export { info, tag };

export interface Lv { title: T; prompt: T; accept: string[]; points?: number; why?: T }
/** Several similar questions on one slide as L1–L3: each student goes at their own pace, L2 opens after L1 is right (LevelsPanel). */
export const levels = (t: T, intro: T, lv: Lv[], o: { notes?: T; widget?: object; helper?: boolean } = {}) => {
  const L = (i: 0 | 1 | 2) => lv.map((x, k) => ({ lv: k + 1, title: x.title[i], points: x.points ?? k + 1,
    variants: [{ v: 'A', prompt: x.prompt[i], ...(i === 0 ? { accept: x.accept, ...(x.why ? { explanation: x.why[0] } : {}) } : {}) }] }));
  return {
    type: 'task', pageType: 'interactive', templateId: 'levels', kind: 'practice', title: t[0], prompt: intro[0], levels: L(0),
    points: lv.reduce((n, x, k) => n + (x.points ?? k + 1), 0),
    ...(o.notes ? { notes: o.notes[0] } : {}), ...(o.widget ? { widget: o.widget } : {}), ...(o.helper ? { helper: true } : {}),
    ru: { title: t[1], prompt: intro[1], levels: L(1), ...(o.notes ? { notes: o.notes[1] } : {}) },
    en: { title: t[2], prompt: intro[2], levels: L(2), ...(o.notes ? { notes: o.notes[2] } : {}) },
  };
};
