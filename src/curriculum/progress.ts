// What each class has covered in a course: classes come from the timetable (cf_timetable.course_id, 076),
// covered lectures from this teacher's live lessons of one school year, ready ҚМЖ from cf_kmj (077), КТП from cf_slots (009).
import { sb, DEMO } from '../config';
import type { Curr, Mod } from './store';

export interface Ctx {
  classesOf: Map<string, string[]>; // course → class ids (timetable order)
  className: Map<string, string>;
  taught: Map<string, Set<string>>; // class → lectures held this year
  kmj: Map<string, boolean>; // lecture → ready?
  ktp: Set<string>; // lectures put into a КТП slot this year
}
export const EMPTY: Ctx = { classesOf: new Map(), className: new Map(), taught: new Map(), kmj: new Map(), ktp: new Set() };

const yearRange = (y: number) => [`${y}-09-01`, `${y + 1}-09-01`];

export async function loadCtx(me: { id: string }, year: number): Promise<Ctx> {
  if (DEMO) return EMPTY;
  const [from, to] = yearRange(year);
  const ok = <T,>(r: { data: T[] | null; error: unknown }) => (r.error ? [] : r.data || []); // a missing table only hides its part
  const [tt, cls, ses, kmj, slots] = await Promise.all([
    sb.from('cf_timetable').select('class_id,course_id,weekday,period').eq('owner_id', me.id).order('weekday').order('period'),
    sb.from('classes').select('id,name'),
    sb.from('cf_sessions').select('class_id,lesson_id').eq('teacher_id', me.id).neq('mode', 'demo').gte('started_at', from).lt('started_at', to),
    sb.from('cf_kmj').select('lesson_id,ready'),
    sb.from('cf_slots').select('lesson_id').eq('school_year', year).not('lesson_id', 'is', null),
  ]);
  const c: Ctx = { classesOf: new Map(), className: new Map(), taught: new Map(), kmj: new Map(), ktp: new Set() };
  for (const x of ok<any>(cls)) c.className.set(x.id, x.name);
  for (const x of ok<any>(tt)) if (x.course_id && x.class_id) {
    const a = c.classesOf.get(x.course_id) || [];
    if (!a.includes(x.class_id)) c.classesOf.set(x.course_id, [...a, x.class_id]);
  }
  for (const [k, a] of c.classesOf) c.classesOf.set(k, a.sort((p, q) => (c.className.get(p) || '').localeCompare(c.className.get(q) || '', 'kk')));
  for (const x of ok<any>(ses)) if (x.class_id && x.lesson_id) c.taught.set(x.class_id, (c.taught.get(x.class_id) || new Set()).add(x.lesson_id));
  for (const x of ok<any>(kmj)) c.kmj.set(x.lesson_id, !!x.ready);
  for (const x of ok<any>(slots)) c.ktp.add(x.lesson_id);
  return c;
}

/** "2.1 Сандар жүйелері" → ["2.1", "Сандар жүйелері"]; a title without its own number → ["", title]. */
export const splitNum = (t: string): [string, string] => { const m = t.match(/^\s*(\d+(?:\.\d+)+)\.?\s+(.*)$/s); return m ? [m[1], m[2]] : ['', t]; };

export interface Item { id: string; module: Mod; label: string; exam: boolean }
/** The course's lectures in order, numbered "module.lecture" (3.6); exams keep their place but are not numbered. */
export function items(curr: Curr, courseId: string): Item[] {
  const mods = curr.modules.filter(m => m.course_id === courseId).sort((a, b) => a.position - b.position);
  const title = new Map(curr.lessons.map(l => [l.id, l.title_kk || l.title]));
  return mods.flatMap((m, mi) => {
    let n = 0;
    return curr.places.filter(p => p.module_id === m.id && title.has(p.lesson_id)).sort((a, b) => a.position - b.position)
      .map(p => ({ id: p.lesson_id, module: m, exam: !!p.exam, label: p.exam ? 'БЖБ' : splitNum(title.get(p.lesson_id) || '')[0] || `${mi + 1}.${++n}` }));
  });
}

/** The module a card shows: the first of the quarter (if one is picked) that a class has not finished, else the first unfinished. */
export function currentModule(its: Item[], classes: string[], c: Ctx, quarter: number | null): Mod | null {
  const mods = [...new Map(its.map(i => [i.module.id, i.module])).values()];
  const pool = quarter ? mods.filter(m => m.quarter === quarter) : mods;
  const open = (m: Mod) => its.some(i => i.module.id === m.id && !i.exam && classes.some(k => !c.taught.get(k)?.has(i.id)));
  return pool.find(open) || pool[0] || null;
}

export const progressIn = (its: Item[], mod: Mod, cls: string, c: Ctx) => {
  const ls = its.filter(i => i.module.id === mod.id && !i.exam);
  return { done: ls.filter(i => c.taught.get(cls)?.has(i.id)).length, total: ls.length };
};

export const nextFor = (its: Item[], cls: string, c: Ctx) => its.find(i => !i.exam && !c.taught.get(cls)?.has(i.id)) || null;
