// Pure logic of the Lessons gallery: school-year quarters, filters, grouping. Nothing here touches the network.
export interface Lesson { id: string; title: string; subject: string | null; class_id: string | null }
export interface Cls { id: string; name: string }
export interface Sess {
  id: string; title: string; class_id: string | null; status: string;
  lesson_id?: string | null; started_at?: string | null; ended_at?: string | null; created_at?: string | null;
}
export interface Filters { cls: string; q: number } // cls '' = every class; q 0 = the whole time, 1-4 = quarter of the current school year

// shortcut: fixed month/day boundaries (Kazakhstan school year, autumn/winter/spring breaks fall into the quarter that just ended);
// replace with the school's real calendar in the database when the dates start to matter to the day.
export const quarterOf = (d: Date): number => {
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  return md >= 901 && md < 1101 ? 1 : md >= 1101 ? 2 : md < 329 ? 3 : md < 901 ? 4 : 1;
};
/** Year in which the school year started (September). Summer holidays count to the year that just ended. */
export const schoolYear = (d: Date) => (d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1);
export const currentQuarter = (now = new Date()) => quarterOf(now);
export const inQuarter = (iso: string | null | undefined, q: number, now = new Date()) => {
  if (q === 0) return true;
  if (!iso) return false;
  const d = new Date(iso);
  return schoolYear(d) === schoolYear(now) && quarterOf(d) === q;
};

export const sessDate = (s: Sess) => s.started_at || s.created_at || s.ended_at || null;
/** A session belongs to a lesson by lesson_id when the column is there, otherwise by the title it was started with. */
export function sessionsByLesson(lessons: Lesson[], sessions: Sess[]): Map<string, Sess[]> {
  const byTitle = new Map(lessons.map(l => [l.title, l.id]));
  const ids = new Set(lessons.map(l => l.id));
  const out = new Map<string, Sess[]>(lessons.map(l => [l.id, []]));
  for (const s of sessions) {
    const id = s.lesson_id && ids.has(s.lesson_id) ? s.lesson_id : byTitle.get(s.title);
    if (id) out.get(id)!.push(s);
  }
  return out;
}
export const matches = (s: Sess, f: Filters, now = new Date()) => (!f.cls || s.class_id === f.cls) && inQuarter(sessDate(s), f.q, now);

export interface Card { lesson: Lesson; taught: Sess[]; byClass: { id: string; n: number }[]; last: string | null; everTaught: boolean }
/** Lessons shown for the filters: taught in that period/class, plus lessons not taught yet (drafts must not vanish with the quarter). */
export function cards(lessons: Lesson[], sessions: Sess[], f: Filters, now = new Date()): Card[] {
  const by = sessionsByLesson(lessons, sessions);
  const out: Card[] = [];
  for (const lesson of lessons) {
    const all = by.get(lesson.id)!;
    const taught = all.filter(s => matches(s, f, now));
    const fresh = all.length === 0 && (!f.cls || !lesson.class_id || lesson.class_id === f.cls);
    if (!taught.length && !fresh) continue;
    const n = new Map<string, number>();
    for (const s of taught) n.set(s.class_id || '', (n.get(s.class_id || '') || 0) + 1);
    const last = taught.map(sessDate).filter((x): x is string => !!x).sort().pop() || null;
    out.push({ lesson, taught, byClass: [...n].map(([id, k]) => ({ id, n: k })), last, everTaught: all.length > 0 });
  }
  return out;
}
export const NO_SUBJECT = 'Пәнсіз';
export const subjectOf = (l: Lesson) => (l.subject || '').trim() || NO_SUBJECT;
/** Subjects alphabetically (kk), "no subject" last; inside a subject the most recently taught first, untaught after. */
export function bySubject(list: Card[]): { subject: string; cards: Card[] }[] {
  const m = new Map<string, Card[]>();
  for (const c of list) m.set(subjectOf(c.lesson), [...(m.get(subjectOf(c.lesson)) || []), c]);
  return [...m].map(([subject, cs]) => ({ subject, cards: cs.sort((a, b) => (b.last || '').localeCompare(a.last || '') || a.lesson.title.localeCompare(b.lesson.title, 'kk')) }))
    .sort((a, b) => (a.subject === NO_SUBJECT ? 1 : b.subject === NO_SUBJECT ? -1 : a.subject.localeCompare(b.subject, 'kk')));
}

export interface Part { session_id: string; student_id: string; full_name: string }
export interface Score { session_id: string; student_id: string; points: number }
export interface Row { student_id: string; name: string; came: number; points: number }
/** One class, several sessions: per student how many of these sessions they joined and what they scored in them. */
export function classTable(sessions: Sess[], parts: Part[], scores: Score[]): Row[] {
  const ids = new Set(sessions.map(s => s.id));
  const m = new Map<string, Row>();
  for (const p of parts) if (ids.has(p.session_id)) { const r = m.get(p.student_id) || { student_id: p.student_id, name: p.full_name, came: 0, points: 0 }; r.came++; m.set(p.student_id, r); }
  for (const x of scores) if (ids.has(x.session_id)) { const r = m.get(x.student_id); if (r) r.points += x.points || 0; }
  return [...m.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'kk'));
}
