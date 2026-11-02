// Tiny builders for the Informatics 8 "Spreadsheets lab" module. Every text is a [kk, ru] pair so a slide cannot miss its Russian half.
export type T = [string, string];
export type SlideKind = 'explain' | 'example' | 'exampletask' | 'practice' | 'video' | 'check';

const kk = (xs: T[]) => xs.map(x => x[0]);
const ru = (xs: T[]) => xs.map(x => x[1]);

export const titleSlide = (t: T, sub: T) => ({
  type: 'title', pageType: 'slide', templateId: 'title', title: t[0], subtitle: sub[0], ru: { title: t[1], subtitle: sub[1] },
});

/** Text slide: kind explain | example | video. `code` shows a formula or a small table in a code block. */
export const info = (kind: SlideKind, t: T, bullets: T[], o: { code?: string; notes?: T; sheet?: object } = {}) => ({
  type: 'content', pageType: 'slide', templateId: 'explanation', kind, title: t[0], bullets: kk(bullets),
  ...(o.code ? { code: o.code, lang: 'text' } : {}), ...(o.notes ? { notes: o.notes[0] } : {}), ...(o.sheet ? { sheet: o.sheet } : {}),
  ru: { title: t[1], bullets: ru(bullets), ...(o.notes ? { notes: o.notes[1] } : {}) },
});

/** Worked example: statement, steps, and the result the teacher reveals with a click. */
export const walk = (t: T, task: T, steps: T[], result: T) => ({
  type: 'solution', pageType: 'slide', templateId: 'worked-example', kind: 'exampletask', title: t[0],
  sections: [{ h: 'Шарты', text: task[0] }, { h: 'Алгоритм (қадамдар)', bullets: kk(steps) }, { h: 'Шешімі', text: result[0], hide: true }],
  ru: { title: t[1], sections: [{ h: 'Условие', text: task[1] }, { h: 'Алгоритм (шаги)', bullets: ru(steps) }, { h: 'Решение', text: result[1], hide: true }] },
});

/** Auto-checked test question (one correct option). */
export const quiz = (t: T, prompt: T, options: T[], answer: number, why: T, points = 1) => ({
  type: 'quiz', pageType: 'interactive', templateId: 'single-choice', kind: 'check', title: t[0], prompt: prompt[0], options: kk(options), answer, explanation: why[0], points,
  ru: { title: t[1], prompt: prompt[1], options: ru(options), explanation: why[1] },
});

/** One variant of a level: its text in both languages and the accepted answers (the control value read off the student's sheet). */
export interface V { p: T; accept: string[]; cell?: string | false }
/** The sheet cell a prompt asks about ("A8-де қандай сан?" -> A8): the last single address of the closing question. `cell: false` on a variant opts out. */
export const cellOf = (p: string): string | undefined => {
  const q = p.split(/[.!]\s+/).pop() || '';
  if (!/(қандай сан|не көрінеді|нәтиже)/i.test(q)) return undefined;
  return [...q.matchAll(/(?<![\w:$])([A-Z]{1,2}\d{1,3})(?![\w:(])/g)].pop()?.[1];
};
export const lv = (n: 1 | 2 | 3, points: number, title: T, A: V, B?: V) => ({ n, points, title, A, B });
type Lv = ReturnType<typeof lv>;

/** Practice slide with levels L1-L3. The student works in the sheet; a variant with a `cell` is checked by reading that cell (or "C2,D2": several, joined by a comma).
 *  `cells` maps "1A", "2B"... (level + variant) to the cell(s); a prompt that closes with "... A8-де қандай сан?" is detected by cellOf. */
export const practice = (t: T, intro: T, levels: Lv[], o: { pair?: boolean; notes?: T; sheet?: object; cells?: Record<string, string> } = {}) => {
  const cellFor = (l: Lv, v: 'A' | 'B') => { const x = v === 'A' ? l.A : l.B!, c = x.cell === false ? undefined : x.cell || o.cells?.[`${l.n}${v}`] || cellOf(x.p[0]); return c ? { cell: c } : {}; };
  const vs = (l: Lv, i: 0 | 1) => [l.A, ...(l.B ? [l.B] : [])].map((x, k) => { const v = k ? 'B' : 'A'; return { v, prompt: x.p[i], ...cellFor(l, v) }; });
  return {
    type: 'task', pageType: 'interactive', templateId: 'short-answer', kind: 'practice', ...(o.pair ? { pair: true } : {}), ...(o.sheet ? { sheet: o.sheet } : {}), title: t[0], prompt: intro[0],
    levels: levels.map(l => ({ lv: l.n, points: l.points, title: l.title[0], variants: [l.A, ...(l.B ? [l.B] : [])].map((x, k) => { const v = k ? 'B' : 'A'; return { v, prompt: x.p[0], accept: x.accept, ...cellFor(l, v) }; }) })),
    ...(o.notes ? { notes: o.notes[0] } : {}),
    ru: { title: t[1], prompt: intro[1], levels: levels.map(l => ({ lv: l.n, points: l.points, title: l.title[1], variants: vs(l, 1) })), ...(o.notes ? { notes: o.notes[1] } : {}) },
  };
};

/** Open practical work without a right answer: the student builds something in the sheet and hands in a copy of it; the teacher grades it. */
export const freeTask = (t: T, intro: T, steps: T[], sheet: object, points = 5) => ({
  type: 'task', pageType: 'interactive', templateId: 'short-answer', kind: 'practice', free: true, sheet, points, title: t[0], prompt: intro[0] + '\n\n' + steps.map((x, i) => `${i + 1}) ${x[0]}`).join('\n'),
  ru: { title: t[1], prompt: intro[1] + '\n\n' + steps.map((x, i) => `${i + 1}) ${x[1]}`).join('\n') },
});

/** Accepted spellings of a number: dot or comma as the decimal sign. */
export const num = (x: number | string) => { const s = String(x); return s.includes('.') ? [s, s.replace('.', ',')] : [s]; };
/** Round to 2 decimals the way a sheet shows it. */
export const r2 = (x: number) => Math.round(x * 100) / 100;

export interface LabLesson { id: string; title: T; summary: T; objectives: T[]; terms: [string, string, string][]; slides: any[] }
