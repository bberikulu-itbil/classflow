import { sb, DEMO } from '../config';
import { loadLessonData } from '../lessons/data';
import { currentQuarter } from '../lessons/model';

export interface Course { id: string; title: string; subject: string | null; grade: number | null }
export type Kind = 'lesson' | 'course';
/** kind 'lesson' = school-lesson module (may belong to one quarter); 'course' = course module (no quarter). grade empty = the course's grade. */
export interface Mod { id: string; course_id: string; title: string; position: number; kind: Kind; quarter: number | null; grade: number | null }
export interface Place { lesson_id: string; module_id: string; position: number }
export interface Les { id: string; title: string; title_kk?: string; title_ru?: string; subject: string | null }
export interface Curr { courses: Course[]; modules: Mod[]; places: Place[]; lessons: Les[]; local: boolean; kindCol?: boolean }
export interface Me { id: string; school_id: string }

// Rows live in cf_curr_* (supabase/008_curriculum.sql). Without the tables (and in the demo) the structure stays in this browser.
// shortcut: structure made in the browser before the tables existed is not moved up; add a "move" card if a teacher has real data there.
let noTable = !!DEMO;
let noKindCol = false; // 012_module_kind.sql not run yet
const missing = (e: { code?: string }) => e.code === 'PGRST205' || e.code === '42P01';
const key = (me: Me) => 'cf_curriculum_' + me.id;
type Store = Pick<Curr, 'courses' | 'modules' | 'places'>;
const demoSeed = (): Store => ({
  courses: [
    { id: 'k1', title: 'Информатика 7', subject: 'Информатика', grade: 7 },
    { id: 'k2', title: 'Робототехника', subject: 'Робототехника', grade: null },
  ],
  modules: [
    { id: 'm1', course_id: 'k1', title: 'Алгоритмдер', position: 0, kind: 'lesson', quarter: currentQuarter(), grade: 7 },
    { id: 'm2', course_id: 'k1', title: 'Бағдарламалау негіздері', position: 1, kind: 'lesson', quarter: null, grade: 7 },
    { id: 'm3', course_id: 'k2', title: 'Робототехника', position: 0, kind: 'course', quarter: null, grade: null },
  ],
  places: [
    { lesson_id: 'l1', module_id: 'm1', position: 0 },
    { lesson_id: 'l2', module_id: 'm1', position: 1 },
    ...['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'].map((lesson_id, position) => ({ lesson_id, module_id: 'm3', position })),
  ],
});
function readLocal(me: Me): Store {
  try {
    const v = JSON.parse(localStorage.getItem(key(me)) || 'null');
    if (v && Array.isArray(v.courses) && Array.isArray(v.modules) && Array.isArray(v.places)) return { ...v, modules: v.modules.map((m: Partial<Mod> & { id: string }) => ({ kind: 'lesson', quarter: null, grade: null, ...m })) };
  } catch { /* unreadable: start empty */ }
  return DEMO ? demoSeed() : { courses: [], modules: [], places: [] };
}
const save = (me: Me, v: Store) => { try { localStorage.setItem(key(me), JSON.stringify(v)); } catch { throw new Error('Браузер сақтауға рұқсат бермеді (құпия режимде болуы мүмкін)'); } };
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
const order = <T extends { position: number }>(a: T[]) => [...a].sort((x, y) => x.position - y.position);

export async function loadLessons(meId: string): Promise<Les[]> {
  if (DEMO) {
    const base = (await loadLessonData(meId)).lessons.map(l => ({ id: l.id, title: l.title, title_kk: l.title, title_ru: l.title, subject: l.subject }));
    try {
      const extra = JSON.parse(localStorage.getItem('cf_demo_created_lessons') || '[]') as Array<{ id: string; title: string; subject?: string | null }>;
      return [...base, ...extra.filter(x => !base.some(l => l.id === x.id)).map(x => ({ id: x.id, title: x.title, title_kk: x.title, title_ru: x.title, subject: x.subject || null }))];
    } catch { return base; }
  }
  // The curriculum screen only needs lecture labels. Do not fetch the full
  // `slides` JSON here: imported PowerPoint/PDF lectures can contain dozens
  // of rendered pages, and loading that payload used to hide/slow the whole
  // course tree before it could be displayed.
  const { data, error } = await sb.from('cf_lessons').select('id,title,subject').order('updated_at', { ascending: false });
  fail(error);
  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    title_kk: row.title,
    title_ru: row.title,
    subject: row.subject,
  }));
}

export async function loadCurr(me: Me): Promise<Curr> {
  const lessons = await loadLessons(me.id);
  if (!noTable) {
    const readMods = () => sb.from('cf_curr_modules').select('id,course_id,title,position' + (noKindCol ? '' : ',kind,quarter,grade'));
    const [c, m0, p] = await Promise.all([
      sb.from('cf_curr_courses').select('id,title,subject,grade').order('created_at'),
      readMods(),
      sb.from('cf_curr_lessons').select('lesson_id,module_id,position'),
    ]);
    let m = m0;
    if (m.error?.code === '42703' && !noKindCol) { noKindCol = true; m = await readMods(); } // 012 not run yet: every module is a quarter-less lesson module
    if (!c.error) {
      fail(m.error); fail(p.error);
      const mods = (m.data as unknown as Partial<Mod>[]).map(x => ({ kind: 'lesson', quarter: null, grade: null, ...x })) as Mod[];
      return { courses: c.data as Course[], modules: order(mods), places: order(p.data as Place[]), lessons, local: false, kindCol: !noKindCol };
    }
    if (!missing(c.error)) fail(c.error);
    noTable = true;
  }
  const l = readLocal(me);
  return { ...l, modules: order(l.modules), places: order(l.places), lessons, local: true, kindCol: true };
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
export interface ModMeta { kind: Kind; quarter: number | null; grade: number | null }
const metaOk = (x: ModMeta) => {
  if (x.kind === 'course' && x.quarter != null) throw new Error('Курс модулінің тоқсаны болмайды');
  if (x.quarter != null && !(x.quarter >= 1 && x.quarter <= 4)) throw new Error('Тоқсан 1–4 аралығында болуы керек');
  if (x.grade != null && !(Number.isInteger(x.grade) && x.grade >= 1 && x.grade <= 11)) throw new Error('Параллель 1–11 аралығында болуы керек');
};
const NEED012 = 'Түрі, тоқсан және параллель үшін 012_module_kind.sql іске қосылуы керек';
const plain = (x: ModMeta) => x.kind === 'lesson' && x.quarter == null && x.grade == null;
export const addModule = (me: Me, courseId: string, title: string, position: number, meta: ModMeta = { kind: 'lesson', quarter: null, grade: null }) => {
  metaOk(meta);
  if (noKindCol && !plain(meta)) throw new Error(NEED012);
  const id = crypto.randomUUID();
  return run(me, () => sb.from('cf_curr_modules').insert({ id, course_id: courseId, title, position, ...(noKindCol ? {} : meta) }), s => ({ ...s, modules: [...s.modules, { id, course_id: courseId, title, position, ...meta }] }));
};
/** Changes the type, quarter and parallel of a module. A course module has no quarter. */
export const setModuleMeta = (me: Me, id: string, meta: ModMeta) => {
  const x = { ...meta, quarter: meta.kind === 'course' ? null : meta.quarter };
  metaOk(x);
  if (noKindCol) throw new Error(NEED012);
  return run(me, () => sb.from('cf_curr_modules').update(x).eq('id', id), s => ({ ...s, modules: s.modules.map(y => (y.id === id ? { ...y, ...x } : y)) }));
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

const SELC = 'cf_curriculum_class';
/** The class a lesson would be started for from the modules screen ('' = none chosen). */
export const selectedClass = (): string => { try { return sessionStorage.getItem(SELC) || ''; } catch { return ''; } };
export const selectClass = (id: string) => { try { sessionStorage.setItem(SELC, id); } catch { /* not remembered */ } };

const NEWMOD = 'cf_new_module';
/** Set by the "+ Модуль жасау" item of another screen: the modules screen opens its form once. */
export const wantNewModule = () => { try { sessionStorage.setItem(NEWMOD, '1'); } catch { /* the form just stays closed */ } };
export const takeNewModule = (): boolean => { try { const v = sessionStorage.getItem(NEWMOD) === '1'; sessionStorage.removeItem(NEWMOD); return v; } catch { return false; } };
