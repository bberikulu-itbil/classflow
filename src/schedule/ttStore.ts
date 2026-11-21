// The weekly timetable (cf_timetable, 009 + 076) with the school's bells (cf_bells): who teaches what, when and in which room.
// An entry with a course offers that course's next lecture for its class (nextLecture), so the bell becomes "▶ Start 3.6 with 7A".
import { sb } from '../config';
import type { Curr } from '../curriculum/store';

export interface TT { id: string; owner_id: string; class_id: string | null; weekday: number; period: number; span: number; label: string | null; room_id: string | null; course_id: string | null }
export interface Bell { n: number; label: string; starts: string; ends: string }
export interface Me { id: string; school_id: string }

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
const COLS = 'id,owner_id,class_id,weekday,period,span,label,room_id,course_id';

export async function loadTT(filter: { owner?: string; room?: string }): Promise<TT[]> {
  let q = sb.from('cf_timetable').select(COLS);
  if (filter.owner) q = q.eq('owner_id', filter.owner);
  if (filter.room) q = q.eq('room_id', filter.room);
  const { data, error } = await q.order('weekday').order('period');
  fail(error);
  return (data || []) as TT[];
}

export async function saveTT(me: Me, e: Omit<TT, 'id' | 'owner_id'> & { id?: string }): Promise<void> {
  const row = { class_id: e.class_id, weekday: e.weekday, period: e.period, span: e.span, label: e.label?.trim() || null, room_id: e.room_id, course_id: e.course_id };
  fail(e.id ? (await sb.from('cf_timetable').update(row).eq('id', e.id)).error
    : (await sb.from('cf_timetable').insert({ ...row, school_id: me.school_id, owner_id: me.id })).error);
}
export const delTT = async (id: string) => fail((await sb.from('cf_timetable').delete().eq('id', id)).error);

/** The bells of the school; a school without its own gets this lyceum's schedule as a starting point. */
export const DEFAULT_BELLS: Bell[] = [
  ['1', '08:30', '09:15'], ['2', '09:20', '10:05'], ['3', '10:35', '11:20'], ['4', '11:25', '12:10'], ['5', '12:15', '13:00'],
  ['5·2', '13:00', '13:45'], ['6', '13:50', '14:35'], ['7', '14:40', '15:25'], ['8', '15:30', '16:15'], ['9', '16:20', '17:05'],
].map(([label, starts, ends], i) => ({ n: i + 1, label, starts, ends }));

export async function loadBells(): Promise<{ bells: Bell[]; saved: boolean }> {
  const { data, error } = await sb.from('cf_bells').select('n,label,starts,ends').order('n');
  fail(error);
  const b = (data || []).map((x: any) => ({ ...x, starts: String(x.starts).slice(0, 5), ends: String(x.ends).slice(0, 5) })) as Bell[];
  return b.length ? { bells: b, saved: true } : { bells: DEFAULT_BELLS, saved: false };
}

export async function saveBells(me: Me, bells: Bell[]): Promise<void> {
  for (const b of bells) if (!/^\d\d:\d\d$/.test(b.starts) || !/^\d\d:\d\d$/.test(b.ends) || b.ends <= b.starts) throw new Error(`${b.label}: уақыт қате`);
  fail((await sb.from('cf_bells').delete().eq('school_id', me.school_id)).error);
  fail((await sb.from('cf_bells').insert(bells.map((b, i) => ({ school_id: me.school_id, n: i + 1, label: b.label.trim() || String(i + 1), starts: b.starts, ends: b.ends })))).error);
}

/** Lessons a class has had (live lessons of this teacher; a demo is not a lesson). */
export async function taughtByClass(me: Me): Promise<Map<string, Set<string>>> {
  const { data, error } = await sb.from('cf_sessions').select('class_id,lesson_id').eq('teacher_id', me.id).neq('mode', 'demo');
  fail(error);
  const m = new Map<string, Set<string>>();
  for (const s of (data || []) as { class_id: string | null; lesson_id: string | null }[]) if (s.class_id && s.lesson_id) m.set(s.class_id, (m.get(s.class_id) || new Set()).add(s.lesson_id));
  return m;
}

/** The first lecture of the course (modules and lectures in order, exams skipped) that the class has not had yet. */
export function nextLecture(curr: Curr, courseId: string | null, taught: Set<string> | undefined): { id: string; title: string } | null {
  if (!courseId) return null;
  const mods = curr.modules.filter(m => m.course_id === courseId).sort((a, b) => (a as any).position - (b as any).position);
  for (const m of mods) {
    for (const p of curr.places.filter(x => x.module_id === m.id && !x.exam).sort((a, b) => a.position - b.position)) {
      if (taught?.has(p.lesson_id)) continue;
      const l = curr.lessons.find(x => x.id === p.lesson_id);
      if (l) return { id: l.id, title: l.title };
    }
  }
  return null;
}

/** A soft colour per class (or label), the same everywhere. */
export function tint(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 70% 82%)`;
}

/** Today's weekday 1..7 (Monday = 1) and the bell running now, if any. */
export function nowIn(bells: Bell[], d = new Date()): { weekday: number; bell: number | null; hhmm: string } {
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { weekday: ((d.getDay() + 6) % 7) + 1, bell: bells.find(b => b.starts <= hhmm && hhmm < b.ends)?.n ?? null, hhmm };
}
