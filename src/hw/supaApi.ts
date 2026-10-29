import { sb } from '../config';
import type { HwApi, Me, PendingItem } from './types';

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
const COURSE = 'Үй тапсырмалары';
const UNIT = 'Үй жұмысы';

export function makeSupaApi(me: Me): HwApi {
  // one course and one unit per teacher, created on first use (the course tree UI comes later)
  const unitId = async (): Promise<string> => {
    let { data: c, error } = await sb.from('cf_courses').select('id').eq('owner_id', me.id).eq('title', COURSE).limit(1).maybeSingle();
    fail(error);
    if (!c) {
      const r = await sb.from('cf_courses').insert({ school_id: me.school_id, owner_id: me.id, title: COURSE }).select('id').single();
      fail(r.error); c = r.data;
    }
    let { data: u, error: e2 } = await sb.from('cf_units').select('id').eq('course_id', c!.id).eq('title', UNIT).limit(1).maybeSingle();
    fail(e2);
    if (!u) {
      const r = await sb.from('cf_units').insert({ course_id: c!.id, title: UNIT }).select('id').single();
      fail(r.error); u = r.data;
    }
    return u!.id;
  };

  return {
    async listMyAssignments() { const { data, error } = await sb.rpc('cf_my_assignments'); fail(error); return data || []; },
    async getActivity(id) { const { data, error } = await sb.rpc('cf_activity', { p_assignment: id }); fail(error); return data; },
    async getMyWork(id) {
      const { data, error } = await sb.from('cf_work').select('answer,status,points,feedback,tests_passed,tests_total,late').eq('assignment_id', id).eq('student_id', me.id).maybeSingle();
      fail(error); return data as any;
    },
    async save(id, answer, pasted, typed, reason) {
      const { error } = await sb.rpc('cf_hw_save', { p_assignment: id, p_answer: answer, p_pasted: pasted, p_typed: typed, p_reason: reason }); fail(error);
    },
    async submit(id, answer, passed, total) {
      const { error } = await sb.rpc('cf_hw_submit', { p_assignment: id, p_answer: answer, p_passed: passed, p_total: total }); fail(error);
    },
    async listCodeSlides() {
      const { data, error } = await sb.from('cf_lessons').select('id,title,slides').order('updated_at', { ascending: false });
      fail(error);
      return (data || []).flatMap((l: any) => (Array.isArray(l.slides) ? l.slides : [])
        .map((slide: any, index: number) => ({ lessonId: l.id, lessonTitle: l.title, index, slide }))
        .filter((x: any) => x.slide && x.slide.type === 'code' && (!x.slide.pageType || x.slide.pageType === 'interactive')));
    },
    async listClasses() { const { data, error } = await sb.from('classes').select('id,name').order('name'); fail(error); return data || []; },
    async assign(i) {
      const unit = await unitId();
      const content = { prompt: i.lesson.slide.prompt || '', starter: i.lesson.slide.starter || '', hints: i.lesson.slide.hints || [] };
      const tests = (i.lesson.slide.tests || []).map(t => ({ input: t.input || '', out: t.out || '', label: t.label || null, hidden: !!t.hidden }));
      const a = await sb.rpc('cf_save_activity', { p_id: null, p_unit: unit, p_kind: 'code', p_title: i.title, p_content: content, p_tests: tests, p_answer: null, p_solution: null, p_points: i.points });
      fail(a.error);
      const r = await sb.rpc('cf_assign', { p_activity: a.data, p_classes: i.classIds, p_opens: i.opensAt, p_due: i.dueAt, p_allow_late: i.allowLate, p_require_pass: i.requirePass, p_category: null });
      fail(r.error); return r.data as number;
    },
    async listAssigned() {
      const { data, error } = await sb.from('cf_assignments').select('id,due_at,classes(name),cf_activities(title)').eq('assigned_by', me.id).order('created_at', { ascending: false });
      fail(error);
      return (data || []).map((r: any) => ({ id: r.id, title: r.cf_activities?.title || '', class_name: r.classes?.name || '', due_at: r.due_at }));
    },
    async review(id) { const { data, error } = await sb.rpc('cf_hw_review', { p_assignment: id }); fail(error); return data || []; },
    async getWork(workId) {
      const w = await sb.from('cf_work').select('answer,status,points,feedback').eq('id', workId).single(); fail(w.error);
      const s = await sb.from('cf_work_snapshots').select('id', { count: 'exact', head: true }).eq('work_id', workId); fail(s.error);
      return { ...(w.data as any), snapshots: s.count || 0 };
    },
    async grade(workId, points, status, feedback) {
      const { error } = await sb.rpc('cf_hw_grade', { p_work: workId, p_points: points, p_status: status, p_feedback: feedback }); fail(error);
    },
    async teacherSummary() {
      // RLS (work_read) already limits this to the teacher's own assignments
      const w = await sb.from('cf_work').select('assignment_id,cf_assignments(classes(name),cf_activities(title))').eq('status', 'submitted'); fail(w.error);
      const by = new Map<string, PendingItem>();
      for (const r of (w.data || []) as any[]) {
        const it = by.get(r.assignment_id) || { assignment_id: r.assignment_id, title: r.cf_assignments?.cf_activities?.title || '', class_name: r.cf_assignments?.classes?.name || '', count: 0 };
        it.count++; by.set(r.assignment_id, it);
      }
      const f = await sb.from('cf_integrity_flags').select('id', { count: 'exact', head: true }).neq('state', 'cleared'); fail(f.error);
      return { pending: [...by.values()].sort((a, b) => b.count - a.count), openFlags: f.count || 0 };
    },
  };
}
