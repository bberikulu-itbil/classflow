import { sb } from '../config';

export interface LessonTarget {
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
}

export interface SessionNavigation {
  courseTitle?: string;
  moduleId: string;
  moduleTitle: string;
  lessonPosition: number;
  lessonCount: number;
  previousLesson: LessonTarget | null;
  nextLesson: LessonTarget | null;
  previousModule: LessonTarget | null;
  nextModule: LessonTarget | null;
  allModules?: {
    id: string;
    title: string;
    lessons: LessonTarget[];
  }[];
}

/** Builds navigation from the teacher's course tree without changing the live session snapshot. */
export async function loadSessionNavigation(lessonId: string): Promise<SessionNavigation | null> {
  if (!lessonId) return null;
  try {
    const placement = await sb.from('cf_curr_lessons')
      .select('lesson_id,module_id,position')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (placement.error || !placement.data) return null;

    const currentModule = await sb.from('cf_curr_modules')
      .select('id,title,course_id,position')
      .eq('id', placement.data.module_id)
      .maybeSingle();
    if (currentModule.error || !currentModule.data) return null;
    const moduleRow = currentModule.data;

    const [modulesRes, placesRes, courseRes] = await Promise.all([
      sb.from('cf_curr_modules').select('id,title,position').eq('course_id', moduleRow.course_id).order('position'),
      sb.from('cf_curr_lessons').select('lesson_id,module_id,position'),
      sb.from('cf_curr_courses').select('id,title').eq('id', moduleRow.course_id).maybeSingle(),
    ]);

    const modules = [...(modulesRes.data || [])].sort((a: any, b: any) => a.position - b.position);
    const moduleIds = new Set(modules.map((m: any) => m.id));
    const places = (placesRes.data || []).filter((p: any) => moduleIds.has(p.module_id));
    const lessonIds = [...new Set(places.map((p: any) => p.lesson_id))];
    if (!lessonIds.length) return null;

    const lessonsRes = await sb.from('cf_lessons').select('id,title').in('id', lessonIds);
    const lessonById = new Map((lessonsRes.data || []).map((l: any) => [l.id, l.title]));

    const moduleLessons = (moduleId: string): LessonTarget[] => places
      .filter((p: any) => p.module_id === moduleId && lessonById.has(p.lesson_id))
      .sort((a: any, b: any) => a.position - b.position)
      .map((p: any) => ({
        id: p.lesson_id,
        title: lessonById.get(p.lesson_id) || 'Дәріс',
        moduleId,
        moduleTitle: modules.find((m: any) => m.id === moduleId)?.title || 'Модуль',
      }));

    const moduleIndex = modules.findIndex((m: any) => m.id === moduleRow.id);
    const currentLessons = moduleLessons(moduleRow.id);
    const currentIndex = currentLessons.findIndex(x => x.id === lessonId);
    if (moduleIndex < 0 || currentIndex < 0) return null;

    const targetModuleFirstLesson = (idx: number): LessonTarget | null => {
      const m = modules[idx];
      return m ? moduleLessons(m.id)[0] || null : null;
    };

    const allModules = modules.map((m: any) => ({
      id: m.id,
      title: m.title,
      lessons: moduleLessons(m.id),
    }));

    return {
      courseTitle: courseRes.data?.title,
      moduleId: moduleRow.id,
      moduleTitle: moduleRow.title,
      lessonPosition: currentIndex + 1,
      lessonCount: currentLessons.length,
      previousLesson: currentLessons[currentIndex - 1] || null,
      nextLesson: currentLessons[currentIndex + 1] || null,
      previousModule: targetModuleFirstLesson(moduleIndex - 1),
      nextModule: targetModuleFirstLesson(moduleIndex + 1),
      allModules,
    };
  } catch (e) {
    console.warn('loadSessionNavigation failed', e);
    return null;
  }
}

/**
 * Switches the active live session to a new lesson seamlessly.
 * Other connected devices (Board, Remote, Student tablets/phones) stay connected,
 * their join code and session remain active, and they switch immediately.
 */
export async function switchSessionLesson(sessionId: string, newLessonId: string): Promise<{ success: boolean; title?: string }> {
  // 1. Try server RPC cf_switch_lesson
  try {
    const rpcRes = await sb.rpc('cf_switch_lesson', { p_session: sessionId, p_lesson: newLessonId });
    if (!rpcRes.error && rpcRes.data?.success) {
      return { success: true, title: rpcRes.data.title };
    }
  } catch {
    // fallback to direct table update if RPC is missing
  }

  // 2. Client fallback
  const lessonRes = await sb.from('cf_lessons').select('id,title,slides').eq('id', newLessonId).single();
  if (lessonRes.error || !lessonRes.data) {
    throw new Error(lessonRes.error?.message || 'Дәріс табылмады');
  }

  const slides = Array.isArray(lessonRes.data.slides) ? lessonRes.data.slides : [];
  if (slides.length === 0) {
    throw new Error('Бұл дәрісте слайдтар жоқ');
  }

  // Close any active task
  try {
    const sRes = await sb.from('cf_sessions').select('active_task_id').eq('id', sessionId).maybeSingle();
    if (sRes.data?.active_task_id) {
      await sb.from('cf_tasks').update({ status: 'closed' }).eq('id', sRes.data.active_task_id);
    }
  } catch {
    // ignore
  }

  // Update cf_session_private
  await sb.from('cf_session_private')
    .update({ slides })
    .eq('session_id', sessionId);

  // Update cf_sessions
  const updateRes = await sb.from('cf_sessions')
    .update({
      lesson_id: newLessonId,
      title: lessonRes.data.title,
      slide_count: slides.length,
      current_slide: 0,
      active_task_id: null,
    })
    .eq('id', sessionId);

  if (updateRes.error) {
    throw new Error(updateRes.error.message);
  }

  return { success: true, title: lessonRes.data.title };
}
