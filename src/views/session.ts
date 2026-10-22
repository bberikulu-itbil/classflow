import { sb } from '../config';

/** Starts a live lesson and opens the teacher's remote. Throws with the server's message on failure. */
export async function startSession(lessonId: string, classId: string, groups: number) {
  const { data, error } = await sb.rpc('cf_start_session', { p_lesson: lessonId, p_class: classId || null, p_groups: groups });
  if (error) throw new Error(error.message);
  window.location.hash = 'remote/' + data.id;
}

export const byName = (a: string, b: string) => a.localeCompare(b, 'kk', { numeric: true });
