import { sb } from '../config';

/** Creates a live lesson and returns its id. Throws with the server's message on failure. */
export async function createSession(lessonId: string, classId: string, groups: number): Promise<string> {
  const { data, error } = await sb.rpc('cf_start_session', { p_lesson: lessonId, p_class: classId || null, p_groups: groups });
  if (error) throw new Error(error.message);
  return data.id;
}
/** Starts a live lesson and opens the teacher's remote. */
export async function startSession(lessonId: string, classId: string, groups: number) {
  window.location.hash = 'remote/' + (await createSession(lessonId, classId, groups));
}

export const byName = (a: string, b: string) => a.localeCompare(b, 'kk', { numeric: true });
