import type { Cells } from './engine';
export type NF = 'num' | 'pct' | 'cur' | 'sci' | 'date' | 'txt';
export interface Fmt { b?: 1; i?: 1; c?: string; bg?: string; al?: 'l' | 'c' | 'r'; nf?: NF; bd?: 1; /** wrap text */ w?: 1 }
export const NF_LABEL: Record<NF | 'gen', string> = { gen: 'Автоматты', num: 'Number (сан)', pct: 'Percent (%)', cur: 'Currency ($)', sci: 'Scientific', date: 'Date (күн)', txt: 'Plain text' };
export const looksDate = (raw: string) => /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(raw.trim());

/** What a cell shows for its number format (the value itself never changes, only how it looks). */
export function formatValue(shown: string, nf?: NF): string {
  if (!nf || shown === '' || shown.startsWith('#')) return shown;
  const n = Number(shown); if (Number.isNaN(n) || nf === 'txt') return shown;
  switch (nf) {
    case 'num': return String(+n.toFixed(2));
    case 'pct': return (n * 100).toFixed(2) + '%';
    case 'cur': return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'sci': return n.toExponential(2).toUpperCase().replace(/E([+-])(\d)$/, 'E$10$2');
    case 'date': { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 864e5); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`; }
  }
}
export interface ChartCfg { id: string; type: 'bar' | 'line' | 'pie'; range: string }
/** Conditional formatting: cells of `range` whose value passes `op v` get the colour; 'scale' shades every number from red (smallest) to green (largest). */
export type CondOp = '<' | '>' | '<=' | '>=' | '=' | '<>' | 'scale';
export interface CondRule { id: string; range: string; op: CondOp; v: string; bg: string }
/** A filter: rows of `range` below its first (header) row stay visible only when column `col` passes `op v`. */
export interface FilterCfg { range: string; col: string; op: Exclude<CondOp, 'scale'>; v: string }
export interface Doc { cells: Cells; fmt: Record<string, Fmt>; charts: ChartCfg[]; rows: number; cols: number; rules?: CondRule[]; merges?: string[]; filter?: FilterCfg | null }

/** Red → yellow → green for t in 0..1 (Google Sheets' default colour scale). */
export const scaleColor = (t: number) => {
  const mix = (a: number[], b: number[], k: number) => a.map((x, i) => Math.round(x + (b[i] - x) * k));
  const [r, g, b] = t < 0.5 ? mix([0xf8, 0x69, 0x6b], [0xff, 0xeb, 0x84], t * 2) : mix([0xff, 0xeb, 0x84], [0x63, 0xbe, 0x7b], (t - 0.5) * 2);
  return `rgb(${r},${g},${b})`;
};
