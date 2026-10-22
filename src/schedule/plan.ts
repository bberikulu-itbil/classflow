// Pure date logic of the schedule (КТП). Dates are plain "YYYY-MM-DD" strings in the school's local calendar: no time zones involved.
export const DAY = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жс'];
const p2 = (n: number) => String(n).padStart(2, '0');
export const toIso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const fromIso = (s: string) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
/** 1 = Monday ... 7 = Sunday. */
export const weekdayOf = (iso: string) => ((fromIso(iso).getDay() + 6) % 7) + 1;
export const mondayOf = (iso: string) => { const d = fromIso(iso); d.setDate(d.getDate() - (weekdayOf(iso) - 1)); return toIso(d); };
export const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

// shortcut: approximate quarter dates of the Kazakhstan school year (breaks between quarters); the teacher edits the range in the form.
// Replace with the school's real calendar when it is stored in the database.
export function defaultRange(year: number, q: number): [string, string] {
  return [[`${year}-09-01`, `${year}-10-25`], [`${year}-11-03`, `${year}-12-27`], [`${year + 1}-01-12`, `${year + 1}-03-20`], [`${year + 1}-03-30`, `${year + 1}-05-31`]][q - 1] as [string, string];
}
export const MAX_DAYS = 140;
export interface Cell { weekday: number; period: number }
/** Every (date, period) from `from` to `to` (inclusive) that the weekly timetable puts a lesson on, in date order. */
export function generate(from: string, to: string, entries: Cell[]): { held_on: string; period: number }[] {
  const out: { held_on: string; period: number }[] = [];
  const end = fromIso(to);
  for (let d = fromIso(from); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toIso(d), wd = weekdayOf(iso);
    for (const e of entries.filter(x => x.weekday === wd).sort((a, b) => a.period - b.period)) out.push({ held_on: iso, period: e.period });
  }
  return out;
}
export const rangeError = (from: string, to: string): string => {
  if (!from || !to) return 'Бастау және аяқтау күндерін көрсетіңіз';
  if (from > to) return 'Бастау күні аяқтау күнінен кеш болмауы керек';
  if ((fromIso(to).getTime() - fromIso(from).getTime()) / 864e5 > MAX_DAYS) return `Аралық ${MAX_DAYS} күннен аспауы керек (бір тоқсан)`;
  return '';
};
