// Assessment rules of the Kazakhstan school (Order No. 125, Appendix 1, paras 28 and 30), grades 5-11. Pure functions, nothing here touches the network.
export type Kind = 'kb' | 'bzb' | 'tzb';
export const KINDS: { k: Kind; short: string; full: string; weight: number }[] = [
  { k: 'kb', short: 'ҚБ', full: 'Қалыптастырушы бағалау', weight: 25 },
  { k: 'bzb', short: 'БЖБ', full: 'Бөлімдік жиынтық бағалау', weight: 25 },
  { k: 'tzb', short: 'ТЖБ', full: 'Тоқсандық жиынтық бағалау', weight: 50 },
];
export const kindOf = (k: Kind) => KINDS.find(x => x.k === k)!;

/** Allowed maximum points: БЖБ 7-20, ТЖБ 25 or 30, ҚБ any 1-100 (the rules fix none). */
export const maxOk = (k: Kind, max: number) =>
  Number.isInteger(max) && (k === 'bzb' ? max >= 7 && max <= 20 : k === 'tzb' ? max === 25 || max === 30 : max >= 1 && max <= 100);

export type Grade = 2 | 3 | 4 | 5;
/** 0-39% -> 2, 40-64% -> 3, 65-84% -> 4, 85-100% -> 5. Integer maths, so 85% of 20 = 17 exactly. */
export const gradeOfPoints = (pts: number, max: number): Grade =>
  pts * 100 >= 85 * max ? 5 : pts * 100 >= 65 * max ? 4 : pts * 100 >= 40 * max ? 3 : 2;
export const gradeOfPct = (pct: number): Grade => (pct >= 85 ? 5 : pct >= 65 ? 4 : pct >= 40 ? 3 : 2);
/** Lowest points that give 3, 4 and 5 for a maximum (the printed table of the Order, never rounded up beyond the percent). */
export const thresholds = (max: number): [number, number, number] => [40, 65, 85].map(p => Math.ceil((p * max) / 100)) as [number, number, number];

export interface Entry { kind: Kind; max: number; points: number | null }
/** Percent per kind: earned / maximum over the columns that have a mark for this student (an empty cell is "was not assessed", 0 is a real zero). */
export function percents(entries: Entry[]): Record<Kind, number | null> {
  const out = {} as Record<Kind, number | null>;
  for (const { k } of KINDS) {
    const e = entries.filter(x => x.kind === k && x.points !== null);
    const max = e.reduce((s, x) => s + x.max, 0);
    out[k] = max ? (e.reduce((s, x) => s + (x.points as number), 0) / max) * 100 : null;
  }
  return out;
}
/** Quarter result 25/25/50. While a part is missing (no ТЖБ yet) the weights of the others are rescaled and the result is marked provisional. */
export function quarter(p: Record<Kind, number | null>): { pct: number; grade: Grade; provisional: boolean } | null {
  const have = KINDS.filter(x => p[x.k] !== null);
  if (!have.length) return null;
  const w = have.reduce((s, x) => s + x.weight, 0);
  const pct = have.reduce((s, x) => s + (p[x.k] as number) * x.weight, 0) / w;
  return { pct, grade: gradeOfPct(pct), provisional: have.length < KINDS.length };
}
/** Annual grade: mean of the quarter grades, rounded half up. */
export const annual = (g: number[]): Grade | null => (g.length ? (Math.floor(g.reduce((s, x) => s + x, 0) / g.length + 0.5) as Grade) : null);
