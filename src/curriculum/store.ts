import { sb, DEMO } from '../config';
import { loadLessonData } from '../lessons/data';

export interface Course { id: string; title: string; subject: string | null; grade: number | null }
export interface Mod { id: string; course_id: string; title: string; position: number }
export interface Place { lesson_id: string; module_id: string; position: number }
export interface Les { id: string; title: string; subject: string | null }
export interface Curr { courses: Course[]; modules: Mod[]; places: Place[]; lessons: Les[]; local: boolean }
export interface Me { id: string; school_id: string }

// Rows live in cf_curr_* (supabase/008_curriculum.sql). Without the tables (and in the demo) the structure stays in this browser.
// shortcut: structure made in the browser before the tables existed is not moved up; add a "move" card if a teacher has real data there.
let noTable = !!DEMO;
const missing = (e: { code?: string }) => e.code === 'PGRST205' || e.code === '42P01';
const key = (me: Me) => 'cf_curriculum_' + me.id;
type Store = Pick<Curr, 'courses' | 'modules' | 'places'>;
const demoSeed = (): Store => ({
  courses: [{ id: 'k1', title: 'Информатика 7', subject: 'Информатика', grade: 7 }],
  modules: [{ id: 'm1', course_id: 'k1', title: 'Алгоритмдер', position: 0 }, { id: 'm2', course_id: 'k1', title: 'Бағдарламалау негіздері', position: 1 }],
  places: [{ lesson_id: 'l1', module_id: 'm1', position: 0 }, { lesson_id: 'l2', module_id: 'm1', position: 1 }],
});
function readLocal(me: Me): Store {
  try {
    const v = JSON.parse(localStorage.getItem(key(me)) || 'null');
    if (v && Array.isArray(v.courses) && Array.isArray(v.modules) && Array.isArray(v.places)) return v;
  } catch { /* unreadable: start empty */ }
  return DEMO ? demoSeed() : { courses: [], modules: [], places: [] };
}
const save = (me: Me, v: Store) => { try { localStorage.setItem(key(me), JSON.stringify(v)); } catch { throw new Error('Браузер сақтауға рұқсат бермеді (құпия режимде болуы мүмкін)'); } };
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
const order = <T extends { position: number }>(a: T[]) => [...a].sort((x, y) => x.position - y.position);

async function loadLessons(meId: string): Promise<Les[]> {
  if (DEMO) return (await loadLessonData(meId)).lessons.map(l => ({ id: l.id, title: l.title, subject: l.subject }));
  const { data, error } = await sb.from('cf_lessons').select('id,title,subject').order('updated_at', { ascending: false });
  fail(error); return (data || []) as Les[];
}

export async function loadCurr(me: Me): Promise<Curr> {
  const lessons = await loadLessons(me.id);
  if (!noTable) {
    const [c, m, p] = await Promise.all([
      sb.from('cf_curr_courses').select('id,title,subject,grade').order('created_at'),
      sb.from('cf_curr_modules').select('id,course_id,title,position'),
      sb.from('cf_curr_lessons').select('lesson_id,module_id,position'),
    ]);
    if (!c.error) { fail(m.error); fail(p.error); return { courses: c.data as Course[], modules: order(m.data as Mod[]), places: order(p.data as Place[]), lessons, local: false }; }
    if (!missing(c.error)) fail(c.error);
    noTable = true;
  }
  const l = readLocal(me);
  return { ...l, modules: order(l.modules), places: order(l.places), lessons, local: true };
}

/** Runs `cloud` against the database, or `local` on the browser copy when there are no tables yet. */
async function run(me: Me, cloud: () => PromiseLike<{ error: { message: string; code?: string } | null }>, local: (s: Store) => Store) {
  if (!noTable) {
    const { error } = await cloud();
    if (!error) return;
    if (!missing(error)) fail(error);
    noTable = true;
  }
  save(me, local(readLocal(me)));
}
const next = (xs: { position: number }[]) => xs.reduce((m, x) => Math.max(m, x.position + 1), 0);

export const addCourse = (me: Me, c: Omit<Course, 'id'>) => {
  const id = crypto.randomUUID();
  return run(me, () => sb.from('cf_curr_courses').insert({ id, ...c, school_id: me.school_id, owner_id: me.id }), s => ({ ...s, courses: [...s.courses, { id, ...c }] }));
};
export const delCourse = (me: Me, id: string) =>
  run(me, () => sb.from('cf_curr_courses').delete().eq('id', id), s => {
    const mods = new Set(s.modules.filter(m => m.course_id === id).map(m => m.id));
    return { courses: s.courses.filter(c => c.id !== id), modules: s.modules.filter(m => m.course_id !== id), places: s.places.filter(p => !mods.has(p.module_id)) };
  });
export const addModule = (me: Me, courseId: string, title: string, position: number) => {
  const id = crypto.randomUUID();
  return run(me, () => sb.from('cf_curr_modules').insert({ id, course_id: courseId, title, position }), s => ({ ...s, modules: [...s.modules, { id, course_id: courseId, title, position }] }));
};
export const renameModule = (me: Me, id: string, title: string) =>
  run(me, () => sb.from('cf_curr_modules').update({ title }).eq('id', id), s => ({ ...s, modules: s.modules.map(m => (m.id === id ? { ...m, title } : m)) }));
export const delModule = (me: Me, id: string) =>
  run(me, () => sb.from('cf_curr_modules').delete().eq('id', id), s => ({ ...s, modules: s.modules.filter(m => m.id !== id), places: s.places.filter(p => p.module_id !== id) }));
/** Swaps the positions of two modules. */
export const swapModules = (me: Me, a: Mod, b: Mod) =>
  run(me, async () => {
    const r = await sb.from('cf_curr_modules').update({ position: b.position }).eq('id', a.id);
    return r.error ? r : sb.from('cf_curr_modules').update({ position: a.position }).eq('id', b.id);
  }, s => ({ ...s, modules: s.modules.map(m => (m.id === a.id ? { ...m, position: b.position } : m.id === b.id ? { ...m, position: a.position } : m)) }));
export const placeLesson = (me: Me, lessonId: string, moduleId: string, position: number) =>
  run(me, () => sb.from('cf_curr_lessons').upsert({ lesson_id: lessonId, module_id: moduleId, position }, { onConflict: 'lesson_id' }),
    s => ({ ...s, places: [...s.places.filter(p => p.lesson_id !== lessonId), { lesson_id: lessonId, module_id: moduleId, position }] }));
export const unplaceLesson = (me: Me, lessonId: string) =>
  run(me, () => sb.from('cf_curr_lessons').delete().eq('lesson_id', lessonId), s => ({ ...s, places: s.places.filter(p => p.lesson_id !== lessonId) }));
export const swapLessons = (me: Me, a: Place, b: Place) =>
  run(me, async () => {
    const r = await sb.from('cf_curr_lessons').update({ position: b.position }).eq('lesson_id', a.lesson_id);
    return r.error ? r : sb.from('cf_curr_lessons').update({ position: a.position }).eq('lesson_id', b.lesson_id);
  }, s => ({ ...s, places: s.places.map(p => (p.lesson_id === a.lesson_id ? { ...p, position: b.position } : p.lesson_id === b.lesson_id ? { ...p, position: a.position } : p)) }));
export { next as nextPosition };

const SEL = 'cf_curriculum_course';
export const selectedCourse = (): string => { try { return sessionStorage.getItem(SEL) || ''; } catch { return ''; } };
export const selectCourse = (id: string) => { try { sessionStorage.setItem(SEL, id); } catch { /* not remembered */ } };
