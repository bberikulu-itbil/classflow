import { sb, DEMO } from '../config';
import { CLASSES, STUDENTS } from '../hw/fakeApi';
import { byName } from '../views/session';
import { schoolYear } from './model';
import type { Cls, Lesson, Part, Score, Sess } from './model';

export interface LessonData { lessons: Lesson[]; sessions: Sess[]; classes: Cls[] }

// Demo: dates are built from today so the "this quarter" default always has something to show.
function demo(): LessonData & { parts: Part[]; scores: Score[] } {
  const y = schoolYear(new Date());
  const d = (yr: number, m: number, day: number) => new Date(yr, m, day, 9, 0).toISOString();
  const lessons: Lesson[] = [
    { id: 'l1', title: 'Циклдер', subject: 'Информатика', class_id: 'c7b' },
    { id: 'l2', title: 'Айнымалылар', subject: 'Информатика', class_id: null },
    { id: 'l3', title: 'Шартты оператор', subject: 'Информатика', class_id: null },
    { id: 'l4', title: 'Жай бөлшектер', subject: 'Математика', class_id: 'c7a' },
    { id: 'r1', title: 'USTEM Foundation', subject: 'Робототехника', class_id: null },
    { id: 'r2', title: 'FIRST және алдыңғы маусымдар', subject: 'Робототехника', class_id: null },
    { id: 'r3', title: 'Canopy маусымы', subject: 'Робототехника', class_id: null },
    { id: 'r4', title: 'FLL', subject: 'Робототехника', class_id: null },
    { id: 'r5', title: 'FLL future edition', subject: 'Робототехника', class_id: null },
    { id: 'r6', title: 'FTC', subject: 'Робототехника', class_id: null },
    { id: 'r7', title: 'Social Media Challenge & Stemshop', subject: 'Робототехника', class_id: null },
  ];
  const mk = (id: string, l: Lesson, cls: string, at: string, status = 'ended'): Sess => ({ id, title: l.title, lesson_id: l.id, class_id: cls, status, started_at: at, ended_at: at, created_at: at });
  const sessions = [
    mk('s1', lessons[0], 'c7b', d(y, 8, 15)), mk('s2', lessons[0], 'c7b', d(y, 9, 6)), mk('s3', lessons[0], 'c7a', d(y, 9, 8)),
    mk('s4', lessons[1], 'c7b', d(y, 8, 22)), mk('s5', lessons[3], 'c7a', d(y, 9, 1)), mk('s6', lessons[1], 'c7b', d(y, 4, 12)),
  ];
  const pts: Record<string, number[]> = { s1: [300, 200, 100], s2: [150, 250, 300], s3: [100, 100, 0], s4: [200, 100, 100], s5: [50, 0, 0], s6: [10, 10, 10] };
  const parts: Part[] = [], scores: Score[] = [];
  for (const s of sessions) STUDENTS.forEach((st, i) => {
    parts.push({ session_id: s.id, student_id: st.id, full_name: st.full_name });
    scores.push({ session_id: s.id, student_id: st.id, points: pts[s.id][i] });
  });
  return { lessons, sessions, classes: CLASSES, parts, scores };
}

export async function loadLessonData(meId: string): Promise<LessonData> {
  if (DEMO) { const { lessons, sessions, classes } = demo(); return { lessons, sessions, classes }; }
  const [l, s, c] = await Promise.all([
    sb.from('cf_lessons').select('id,title,subject,class_id').order('updated_at', { ascending: false }),
    sb.from('cf_sessions').select('*').eq('teacher_id', meId),
    sb.from('classes').select('id,name'),
  ]);
  if (l.error) throw new Error(l.error.message);
  if (s.error) throw new Error(s.error.message);
  return {
    lessons: (l.data || []) as Lesson[], sessions: (s.data || []) as Sess[],
    classes: ((c.data || []) as Cls[]).sort((a, b) => byName(a.name, b.name)),
  };
}

// shortcut: only the 100 most recent sessions of a lesson are summed (the query string would get too long); page it if a lesson passes that.
export async function loadResults(ids: string[]): Promise<{ parts: Part[]; scores: Score[] }> {
  const recent = ids.slice(0, 100);
  if (!recent.length) return { parts: [], scores: [] };
  if (DEMO) { const { parts, scores } = demo(); return { parts: parts.filter(p => recent.includes(p.session_id)), scores: scores.filter(p => recent.includes(p.session_id)) }; }
  const [p, s] = await Promise.all([
    sb.from('cf_participants').select('session_id,student_id,full_name').in('session_id', recent),
    sb.from('cf_scores').select('session_id,student_id,points').in('session_id', recent),
  ]);
  if (p.error) throw new Error(p.error.message);
  if (s.error) throw new Error(s.error.message);
  return { parts: (p.data || []) as Part[], scores: (s.data || []) as Score[] };
}
