import { sb } from '../config';
import { DEFAULT_PREFS, getPrefs } from '../prefs';

/** Creates a live lesson and returns its id. Throws with the server's message on failure. */
/** Besides a real class a lesson can start as a demo (deleted when it ends) or for guests (any student joins, kept). Their ids sit in the class pickers. */
export const MODES = [{ id: 'demo', name: 'Демо сынып (сақталмайды)' }, { id: 'guest', name: 'Қонақ' }];
/** `classId` is a class id, 'demo' or 'guest'; an empty one is refused by the server (a lesson needs a class). */
export async function createSession(lessonId: string, classId: string, groups: number): Promise<string> {
  const mode = classId === 'demo' || classId === 'guest' ? classId : 'class';
  const { data, error } = await sb.rpc('cf_start_session', { p_lesson: lessonId, p_class: mode === 'class' ? classId || null : null, p_groups: groups, p_mode: mode });
  if (error) throw new Error(error.message);
  // the teacher's own starting rules (Профиль → Сабақ баптаулары) where they differ from the server's defaults
  const r = getPrefs().rules, base = DEFAULT_PREFS.rules;
  await Promise.all([
    ...(['ask', 'hand', 'ahead', 'auto', 'lang'] as const).filter(k => r[k] !== base[k]).map(k => sb.rpc('cf_set_rule', { p_session: data.id, p_rule: k, p_on: r[k] })),
    ...(r.nav !== base.nav ? [sb.rpc('cf_set_nav', { p_session: data.id, p_on: r.nav })] : []),
  ]).catch(() => { /* the lesson runs with the server defaults; the teacher can still switch them in the remote */ });
  return data.id;
}
/** Starts a live lesson and opens the teacher's remote. */
export async function startSession(lessonId: string, classId: string, groups: number) {
  window.location.hash = 'remote/' + (await createSession(lessonId, classId, groups));
}

export const byName = (a: string, b: string) => a.localeCompare(b, 'kk', { numeric: true });
