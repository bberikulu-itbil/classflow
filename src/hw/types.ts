export type Status = 'not_started' | 'draft' | 'submitted' | 'needs_work' | 'finalized';

export interface Me { id: string; full_name: string; role: string; school_id: string; class_id: string | null }

export interface MyAssignment {
  assignment_id: string; title: string; kind: string; unit_title: string; course_title: string;
  opens_at: string | null; due_at: string | null; locked: boolean; max_points: number;
  status: Status; tests_passed: number | null; tests_total: number | null; points: number | null;
  feedback: string | null; late: boolean;
}

export interface Check { input: string; label: string | null; hidden: boolean; out: string | null; s: string; h: string }

export interface ActivityView {
  id: string; kind: string; title: string; points: number;
  content: { prompt?: string; starter?: string; hints?: string[] };
  due_at: string | null; locked: boolean; require_pass: boolean; checks: Check[];
}

export interface MyWork { answer: string; status: Status; points: number | null; feedback: string | null; tests_passed: number | null; tests_total: number | null; late: boolean }

export interface LessonSlide {
  lessonId: string; lessonTitle: string; index: number;
  slide: { title?: string; prompt?: string; starter?: string; hints?: string[]; tests?: Array<{ input?: string; out?: string; label?: string; hidden?: boolean }>; points?: number };
}

export interface ClassRow { id: string; name: string }

export interface AssignedRow { id: string; title: string; class_name: string; due_at: string | null }

export interface ReviewRow {
  work_id: string | null; student_id: string; full_name: string; status: Status;
  tests_passed: number | null; tests_total: number | null; points: number | null;
  late: boolean; submitted_at: string | null; open_flags: number;
}

export interface PendingItem { assignment_id: string; title: string; class_name: string; count: number }
export interface TeacherSummary { pending: PendingItem[]; openFlags: number }

export interface WorkDetail { answer: string; status: Status; points: number | null; feedback: string | null; snapshots: number }

export interface AssignInput {
  lesson: LessonSlide; title: string; points: number; classIds: string[];
  opensAt: string | null; dueAt: string | null; allowLate: boolean; requirePass: boolean;
}

/** One contract, two implementations: Supabase (schema.sql) and an in-memory demo with the same rules. */
export interface HwApi {
  // student
  listMyAssignments(): Promise<MyAssignment[]>;
  getActivity(assignmentId: string): Promise<ActivityView>;
  getMyWork(assignmentId: string): Promise<MyWork | null>;
  save(assignmentId: string, answer: string, pasted: number, typed: number, reason: string): Promise<void>;
  submit(assignmentId: string, answer: string, passed: number | null, total: number | null): Promise<void>;
  // teacher
  listCodeSlides(): Promise<LessonSlide[]>;
  listClasses(): Promise<ClassRow[]>;
  assign(input: AssignInput): Promise<number>;
  listAssigned(): Promise<AssignedRow[]>;
  review(assignmentId: string): Promise<ReviewRow[]>;
  getWork(workId: string): Promise<WorkDetail>;
  grade(workId: string, points: number, status: 'finalized' | 'needs_work', feedback: string): Promise<void>;
  /** Works waiting for a grade (grouped by assignment) and unresolved paste flags, for the teacher's home and queue. */
  teacherSummary(): Promise<TeacherSummary>;
}

export const hw: { api: HwApi | null } = { api: null };
export const api = (): HwApi => { if (!hw.api) throw new Error('HwApi is not set'); return hw.api; };
