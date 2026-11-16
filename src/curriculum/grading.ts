// Turning lesson points into a formative mark (1-10): by a percent scale, by the place in the class (percentile) or the better of both.
export type Method = 'scale' | 'percentile' | 'mixed' | 'points';
export const METHODS: { k: Method; name: string; hint: string }[] = [
  { k: 'scale', name: 'Шкала', hint: 'Пайыз → балл: 95% → 10, 84% → 8' },
  { k: 'percentile', name: 'Персентиль', hint: 'Сыныптағы орны: сыныптың 90%-ынан жоғары → 10' },
  { k: 'mixed', name: 'Аралас', hint: 'Шкала мен персентильдің жоғарысы' },
  { k: 'points', name: 'Тек ұпай', hint: 'Балл қойылмайды' },
];
const clamp = (x: number) => Math.min(10, Math.max(1, x));
export const pctOf = (points: number, max: number) => (max > 0 ? Math.min(100, (points / max) * 100) : 0);
/** Percentile rank of every value in its group: (how many are below + half of the equal ones, itself included) / group size × 100. */
export const percentiles = (vals: number[]) => vals.map(v => {
  const below = vals.filter(x => x < v).length, eq = vals.filter(x => x === v).length;
  return ((below + 0.5 * eq) / vals.length) * 100;
});
export const markOf = (m: Method, pct: number, pr: number): number | null =>
  m === 'points' ? null : m === 'scale' ? clamp(Math.round(pct / 10)) : m === 'percentile' ? clamp(Math.ceil(pr / 10)) : Math.max(clamp(Math.round(pct / 10)), clamp(Math.ceil(pr / 10)));
