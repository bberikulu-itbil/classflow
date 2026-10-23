// Teacher settings kept on this device (Профиль және баптаулар): the quarter calendar and two defaults.
// shortcut: stored in this browser only (not per account, not synced); move to a profiles column when a teacher uses two devices.
export interface Span { from: string; to: string } // 'MM-DD', the year is not stored: the same dates repeat every school year
export interface Prefs { quarters: Span[]; groups: number; kbMax: number }
export const DEFAULT_PREFS: Prefs = {
  quarters: [{ from: '09-01', to: '10-25' }, { from: '11-03', to: '12-27' }, { from: '01-12', to: '03-20' }, { from: '03-30', to: '05-31' }],
  groups: 3, kbMax: 10,
};
const KEY = 'cf_prefs';
const md = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** Position inside the school year: September..December first, then January..August (August belongs to the school year that just ended, as in schoolYear()). */
export const yearKey = (s: string) => (+s.slice(0, 2) >= 9 ? '0' : '1') + s;

/** '' when the four quarters are valid: each starts before it ends, and they follow one another through the school year. */
export function quartersError(q: Span[]): string {
  if (q.length !== 4 || q.some(x => !md.test(x.from) || !md.test(x.to))) return 'Барлық күндерді толтырыңыз';
  if (q.some(x => x.from.startsWith('08-') || x.to.startsWith('08-'))) return 'Тамыз айы тоқсанға кірмейді: күндерді қыркүйектен шілдеге дейін көрсетіңіз';
  const keys = q.flatMap(x => [yearKey(x.from), yearKey(x.to)]);
  for (let i = 1; i < keys.length; i++) {
    if (keys[i] < keys[i - 1]) return i % 2 ? `${Math.ceil(i / 2)}-тоқсанның аяқталу күні басталу күнінен ерте` : `${i / 2 + 1}-тоқсан ${i / 2}-тоқсаннан бұрын басталады`;
  }
  return '';
}
const clampInt = (v: unknown, lo: number, hi: number, d: number) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : d);
export function clean(v: any): Prefs {
  const q = Array.isArray(v?.quarters) ? v.quarters.map((x: any) => ({ from: String(x?.from), to: String(x?.to) })) : [];
  return { quarters: quartersError(q) ? DEFAULT_PREFS.quarters : q, groups: clampInt(v?.groups, 1, 8, DEFAULT_PREFS.groups), kbMax: clampInt(v?.kbMax, 1, 100, DEFAULT_PREFS.kbMax) };
}
let cache: Prefs | null = null;
export function getPrefs(): Prefs {
  if (!cache) { try { cache = clean(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { cache = DEFAULT_PREFS; } }
  return cache;
}
export function setPrefs(p: Prefs): void {
  cache = clean(p);
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { throw new Error('Браузер сақтауға рұқсат бермеді (құпия режимде болуы мүмкін)'); }
}
export function resetPrefs(): void { cache = DEFAULT_PREFS; try { localStorage.removeItem(KEY); } catch { /* nothing stored */ } }

/** Quarter of a date: the last quarter that has started; before the first one (late August) it is still the 4th. A holiday between quarters belongs to the one that just ended. */
export function quarterAt(dateMd: string, q: Span[] = getPrefs().quarters): number {
  const k = yearKey(dateMd);
  let r = 4;
  q.forEach((x, i) => { if (yearKey(x.from) <= k) r = i + 1; });
  return r;
}
