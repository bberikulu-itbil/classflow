import type { Cells } from './engine';
export type NF = 'num' | 'pct' | 'cur' | 'sci' | 'date' | 'txt';
export interface Fmt { b?: 1; i?: 1; c?: string; bg?: string; al?: 'l' | 'c' | 'r'; nf?: NF; bd?: 1 }
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
export interface Doc { cells: Cells; fmt: Record<string, Fmt>; charts: ChartCfg[]; rows: number; cols: number }
