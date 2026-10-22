// Demo data layer: same rules as replica/schema.sql, kept in memory. Used with ?demo and in tests.
import { norm, sha256 } from '../utils/pyodide';
import type { ActivityView, AssignedRow, HwApi, LessonSlide, Me, MyAssignment, MyWork, ReviewRow, Status } from './types';

export const DEMO_TEACHER: Me = { id: 't1', full_name: 'Бағдәулет Е.', role: 'teacher', school_id: 's1', class_id: null };
export const DEMO_STUDENT: Me = { id: 'st-aidar', full_name: 'Айдар Нұрланов', role: 'student', school_id: 's1', class_id: 'c7b' };
export const CLASSES = [{ id: 'c7a', name: '7A' }, { id: 'c7b', name: '7B' }];
export const STUDENTS: Me[] = [
  DEMO_STUDENT,
  { id: 'st-dana', full_name: 'Дана Сәрсенова', role: 'student', school_id: 's1', class_id: 'c7b' },
  { id: 'st-erlan', full_name: 'Ерлан Қасымов', role: 'student', school_id: 's1', class_id: 'c7b' },
];
const LESSONS: LessonSlide[] = [{
  lessonId: 'l1', lessonTitle: 'Алгоритм', index: 4,
  slide: {
    title: 'Қосынды', prompt: 'Екі бүтін санды оқып (әрқайсысы жеке жолда), олардың қосындысын шығар.', starter: 'a = int(input())\nb = int(input())\n',
    hints: ['input() жол қайтарады, int() арқылы санға айналдыр', 'print(a + b)'], points: 5,
    tests: [{ input: '3\n4', out: '7', label: 'Мысал 1' }, { input: '-5\n5', out: '0' }, { input: '100\n250', out: '350', hidden: true }],
  },
}];

interface Act { id: string; title: string; content: ActivityView['content']; points: number; tests: Array<{ input: string; out: string; label: string | null; hidden: boolean }>; salt: string }
interface Asg { id: string; classId: string; actId: string; by: string; opens: string | null; due: string | null; allowLate: boolean; locked: boolean; requirePass: boolean }
interface Work { id: string; asgId: string; studentId: string; answer: string; status: Status; passed: number | null; total: number | null; points: number | null; late: boolean; feedback: string | null }

const uid = () => Math.random().toString(36).slice(2, 10);
const deny = (m: string): never => { throw new Error(m); };

export function makeFakeApi(getMe: () => Me): HwApi {
  const acts: Act[] = [], asgs: Asg[] = [], works: Work[] = [], snaps: Array<{ workId: string; answer: string; pasted: number; typed: number }> = [];
  const flags = new Set<string>(); // workId of paste flags
  const now = () => Date.now();
  const inClass = (a: Asg) => getMe().class_id === a.classId;
  const open = (a: Asg) => !a.opens || new Date(a.opens).getTime() <= now();
  const ownsAsg = (a: Asg) => a.by === getMe().id;
  const find = (id: string) => asgs.find(a => a.id === id) || deny('Табылмады');

  return {
    async listMyAssignments() {
      return asgs.filter(a => inClass(a) && open(a)).map((a): MyAssignment => {
        const act = acts.find(x => x.id === a.actId)!, w = works.find(x => x.asgId === a.id && x.studentId === getMe().id);
        return { assignment_id: a.id, title: act.title, kind: 'code', unit_title: 'Үй жұмысы', course_title: 'Үй тапсырмалары', opens_at: a.opens, due_at: a.due, locked: a.locked,
          max_points: act.points, status: w?.status || 'not_started', tests_passed: w?.passed ?? null, tests_total: w?.total ?? null, points: w?.points ?? null, feedback: w?.feedback ?? null, late: w?.late || false };
      }).sort((x, y) => (x.due_at || '9').localeCompare(y.due_at || '9'));
    },
    async getActivity(id) {
      const a = find(id);
      if (!(ownsAsg(a) || (inClass(a) && open(a)))) deny('Құқығыңыз жоқ');
      const act = acts.find(x => x.id === a.actId)!;
      const checks = await Promise.all(act.tests.map(async t => ({ input: t.input, label: t.label, hidden: t.hidden, out: t.hidden ? null : t.out, s: act.salt, h: await sha256(act.salt + norm(t.out)) })));
      return { id: a.id, kind: 'code', title: act.title, points: act.points, content: act.content, due_at: a.due, locked: a.locked, require_pass: a.requirePass, checks };
    },
    async getMyWork(id): Promise<MyWork | null> {
      const w = works.find(x => x.asgId === id && x.studentId === getMe().id);
      return w ? { answer: w.answer, status: w.status, points: w.points, feedback: w.feedback, tests_passed: w.passed, tests_total: w.total, late: w.late } : null;
    },
    async save(id, answer, pasted, typed) {
      const a = find(id);
      if (!inClass(a) || !open(a)) deny('Құқығыңыз жоқ');
      if (a.locked) deny('Тапсырма жабық');
      let w = works.find(x => x.asgId === id && x.studentId === getMe().id);
      if (!w) works.push(w = { id: uid(), asgId: id, studentId: getMe().id, answer: '', status: 'draft', passed: null, total: null, points: null, late: false, feedback: null });
      if (w.status === 'finalized') return;
      w.answer = answer.slice(0, 20000);
      const last = [...snaps].reverse().find(s => s.workId === w!.id);
      if (!last || last.answer !== w.answer) snaps.push({ workId: w.id, answer: w.answer, pasted: Math.max(0, pasted), typed: Math.max(0, typed) });
    },
    async submit(id, answer, passed, total) {
      const a = find(id);
      if (!inClass(a) || !open(a)) deny('Құқығыңыз жоқ');
      if (a.locked) deny('Тапсырма жабық');
      const late = !!a.due && now() > new Date(a.due).getTime();
      if (late && !a.allowLate) deny('Мерзімі өтіп кетті');
      if (total != null && (total < 0 || passed == null || passed < 0 || passed > total)) deny('Тест нәтижесі қате');
      if (a.requirePass && (!total || (passed as number) < total)) deny('Барлық тест өтуі керек');
      const act = acts.find(x => x.id === a.actId)!;
      let w = works.find(x => x.asgId === id && x.studentId === getMe().id);
      if (w && w.status === 'finalized') deny('Бағаланған жұмысты қайта жіберуге болмайды');
      if (!w) works.push(w = { id: uid(), asgId: id, studentId: getMe().id, answer: '', status: 'draft', passed: null, total: null, points: null, late: false, feedback: null });
      Object.assign(w, { answer: answer.slice(0, 20000), status: 'submitted', passed, total, late, points: (total || 0) > 0 ? Math.round(act.points * (passed as number) / (total as number)) : null });
      const last = [...snaps].reverse().find(s => s.workId === w!.id);
      if (!last || last.answer !== w.answer) snaps.push({ workId: w.id, answer: w.answer, pasted: 0, typed: 0 });
      const mine = snaps.filter(s => s.workId === w!.id), pc = mine.reduce((n, s) => n + s.pasted, 0), tc = mine.reduce((n, s) => n + s.typed, 0);
      if (pc + tc >= 80 && pc / (pc + tc) > 0.5) flags.add(w.id);
    },
    async listCodeSlides() { return LESSONS; },
    async listClasses() { return CLASSES; },
    async assign(i) {
      const act: Act = { id: uid(), title: i.title, content: { prompt: i.lesson.slide.prompt, starter: i.lesson.slide.starter, hints: i.lesson.slide.hints }, points: i.points, salt: uid(),
        tests: (i.lesson.slide.tests || []).map(t => ({ input: t.input || '', out: t.out || '', label: t.label || null, hidden: !!t.hidden })) };
      acts.push(act);
      i.classIds.forEach(c => {
        const ex = asgs.find(a => a.classId === c && a.actId === act.id);
        if (!ex) asgs.push({ id: uid(), classId: c, actId: act.id, by: getMe().id, opens: i.opensAt, due: i.dueAt, allowLate: i.allowLate, locked: false, requirePass: i.requirePass });
      });
      return i.classIds.length;
    },
    async listAssigned(): Promise<AssignedRow[]> {
      return asgs.filter(a => a.by === getMe().id).map(a => ({ id: a.id, title: acts.find(x => x.id === a.actId)!.title, class_name: CLASSES.find(c => c.id === a.classId)!.name, due_at: a.due })).reverse();
    },
    async review(id): Promise<ReviewRow[]> {
      const a = find(id);
      if (!ownsAsg(a)) deny('Құқығыңыз жоқ');
      return STUDENTS.filter(s => s.class_id === a.classId).map(s => {
        const w = works.find(x => x.asgId === id && x.studentId === s.id);
        return { work_id: w?.id || null, student_id: s.id, full_name: s.full_name, status: w?.status || 'not_started', tests_passed: w?.passed ?? null, tests_total: w?.total ?? null, points: w?.points ?? null, late: w?.late || false, submitted_at: null, open_flags: w && flags.has(w.id) ? 1 : 0 };
      });
    },
    async getWork(workId) {
      const w = works.find(x => x.id === workId) || deny('Табылмады');
      return { answer: w.answer, status: w.status, points: w.points, feedback: w.feedback, snapshots: snaps.filter(s => s.workId === workId).length };
    },
    async grade(workId, points, status, feedback) {
      const w = works.find(x => x.id === workId) || deny('Табылмады');
      const mx = acts.find(x => x.id === asgs.find(a => a.id === w.asgId)!.actId)!.points;
      if (points < 0 || points > mx) deny(`Ұпай 0 мен ${mx} аралығында болуы керек`);
      Object.assign(w, { status, points, feedback: feedback.slice(0, 4000) });
    },
    async teacherSummary() {
      const mine = asgs.filter(ownsAsg);
      const pending = mine.map(a => ({ assignment_id: a.id, title: acts.find(x => x.id === a.actId)!.title, class_name: CLASSES.find(c => c.id === a.classId)!.name,
        count: works.filter(w => w.asgId === a.id && w.status === 'submitted').length })).filter(p => p.count > 0);
      const openFlags = works.filter(w => flags.has(w.id) && mine.some(a => a.id === w.asgId)).length;
      return { pending, openFlags };
    },
  };
}
