// Teacher settings (Профиль → Сабақ баптаулары): the quarter calendar, start values and the rules a new lesson starts with.
// Kept on the account (profiles.prefs, 082) and cached in this browser, so reading them stays synchronous.
export interface Span { from: string; to: string } // 'MM-DD', the year is not stored: the same dates repeat every school year
export type Rules = { ask: boolean; hand: boolean; ahead: boolean; nav: boolean; auto: boolean };
export interface Prefs { quarters: Span[]; groups: number; kbMax: number; examMin: number; room: string; rules: Rules }
export const DEFAULT_PREFS: Prefs = {
  quarters: [{ from: '09-01', to: '10-25' }, { from: '11-03', to: '12-27' }, { from: '01-12', to: '03-20' }, { from: '03-30', to: '05-31' }],
  groups: 3, kbMax: 10, examMin: 40, room: '',
  rules: { ask: true, hand: true, ahead: true, nav: false, auto: true },
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
  const r = (k: keyof Rules) => (typeof v?.rules?.[k] === 'boolean' ? v.rules[k] : DEFAULT_PREFS.rules[k]);
  return {
    quarters: quartersError(q) ? DEFAULT_PREFS.quarters : q, groups: clampInt(v?.groups, 1, 8, DEFAULT_PREFS.groups), kbMax: clampInt(v?.kbMax, 1, 100, DEFAULT_PREFS.kbMax),
    examMin: clampInt(v?.examMin, 5, 240, DEFAULT_PREFS.examMin), room: typeof v?.room === 'string' ? v.room.slice(0, 64) : '',
    rules: { ask: r('ask'), hand: r('hand'), ahead: r('ahead'), nav: r('nav'), auto: r('auto') },
  };
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
/** The account's copy wins over this browser's (called once the profile is loaded). */
export function adoptAccountPrefs(v: unknown): void {
  if (!v || typeof v !== 'object' || !Object.keys(v as object).length) return;
  cache = clean(v);
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* the account copy is still used this visit */ }
}
export function resetPrefs(): void { cache = DEFAULT_PREFS; try { localStorage.removeItem(KEY); } catch { /* nothing stored */ } }

/** Quarter of a date: the last quarter that has started; before the first one (late August) it is still the 4th. A holiday between quarters belongs to the one that just ended. */
export function quarterAt(dateMd: string, q: Span[] = getPrefs().quarters): number {
  const k = yearKey(dateMd);
  let r = 4;
  q.forEach((x, i) => { if (yearKey(x.from) <= k) r = i + 1; });
  return r;
}
