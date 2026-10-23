import type { Course, Mod } from './store';

/** What the modules screen shows: modules of this quarter, all lesson modules, or the course modules. */
export type Show = 'now' | 'lessons' | 'courses';
export const SHOWS: { v: Show; label: string }[] = [{ v: 'now', label: 'Осы тоқсан' }, { v: 'lessons', label: 'Барлық сабақтар' }, { v: 'courses', label: 'Курстар' }];

/** The parallel of a module: its own, else its course's. */
export const gradeOf = (m: Mod, courses: Course[]): number | null => m.grade ?? courses.find(c => c.id === m.course_id)?.grade ?? null;

/** A lesson module without a quarter belongs to every quarter, so a module made before quarters existed never disappears. */
export function visible(m: Mod, courses: Course[], f: { show: Show; grade: number; quarter: number; course: string }): boolean {
  if (f.course && m.course_id !== f.course) return false;
  if (f.grade && gradeOf(m, courses) !== f.grade) return false;
  if (f.show === 'courses') return m.kind === 'course';
  return m.kind === 'lesson' && (f.show === 'lessons' || m.quarter == null || m.quarter === f.quarter);
}

/** The parallels that exist among the modules (for the filter chips), ascending. */
export const gradesIn = (mods: Mod[], courses: Course[]): number[] =>
  [...new Set(mods.map(m => gradeOf(m, courses)).filter((g): g is number => g != null))].sort((a, b) => a - b);
