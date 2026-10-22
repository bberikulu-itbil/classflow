import { sb, DEMO } from '../config';
import { CLASSES, STUDENTS } from '../hw/fakeApi';
import { byName } from '../views/session';
import { currentQuarter, schoolYear } from '../lessons/model';
import type { Cls } from '../lessons/model';
import type { Kind } from './grades';

export interface Col { id: string; class_id: string; school_year: number; quarter: number; kind: Kind; title: string; held_on: string; max_points: number }
export interface Stu { id: string; full_name: string }
/** Marks by "columnId|studentId". A missing key = not assessed. */
export type Marks = Record<string, number>;
export const mkey = (col: string, stu: string) => col + '|' + stu;
export interface Book { cols: Col[]; students: Stu[]; marks: Marks; local: boolean }
export interface Me { id: string; school_id: string }

// Rows live in cf_assessments / cf_marks (supabase/007_gradebook.sql). Without the tables (and in the demo) they stay in this browser.
// shortcut: columns made in the browser before the tables existed are not moved up; add a "move" card if a teacher has real data there.
let noTable = !!DEMO;
const missing = (e: { code?: string }) => e.code === 'PGRST205' || e.code === '42P01';
const localKey = (me: Me) => 'cf_gradebook_' + me.id;
interface Local { cols: Col[]; marks: Marks }
function readLocal(me: Me): Local {
  try {
    const v = JSON.parse(localStorage.getItem(localKey(me)) || 'null');
    if (v && Array.isArray(v.cols) && v.marks && typeof v.marks === 'object') return v;
  } catch { /* unreadable: start empty */ }
  return DEMO ? demoSeed() : { cols: [], marks: {} };
}
const writeLocal = (me: Me, v: Local) => {
  try { localStorage.setItem(localKey(me), JSON.stringify(v)); } catch { throw new Error('Браузер сақтауға рұқсат бермеді (құпия режимде болуы мүмкін)'); }
};

/** Demo: class 7B, this quarter: two ҚБ, one БЖБ, no ТЖБ yet, so the "provisional" state is visible. */
function demoSeed(): Local {
  const y = schoolYear(new Date()), q = currentQuarter();
  const c = (id: string, kind: Kind, title: string, held_on: string, max_points: number): Col => ({ id, class_id: 'c7b', school_year: y, quarter: q, kind, title, held_on, max_points });
  const cols = [c('a1', 'kb', 'ҚБ 1', `${y}-09-10`, 10), c('a2', 'kb', 'ҚБ 2', `${y}-09-17`, 10), c('a3', 'bzb', 'БЖБ 1', `${y}-09-24`, 15)];
  const marks: Marks = {
    [mkey('a1', 'st-aidar')]: 9, [mkey('a2', 'st-aidar')]: 8, [mkey('a3', 'st-aidar')]: 13,
    [mkey('a1', 'st-dana')]: 6, [mkey('a2', 'st-dana')]: 7, [mkey('a3', 'st-dana')]: 9,
    [mkey('a1', 'st-erlan')]: 3, [mkey('a3', 'st-erlan')]: 5, // Ерлан missed ҚБ 2: empty, not a zero
  };
  return { cols, marks };
}

export async function loadClasses(): Promise<Cls[]> {
  if (DEMO) return CLASSES;
  const { data, error } = await sb.from('classes').select('id,name');
  if (error) throw new Error(error.message);
  return ((data || []) as Cls[]).sort((a, b) => byName(a.name, b.name));
}

async function loadStudents(classId: string): Promise<Stu[]> {
  if (DEMO) return STUDENTS.filter(s => s.class_id === classId).map(s => ({ id: s.id, full_name: s.full_name })).sort((a, b) => byName(a.full_name, b.full_name));
  const { data, error } = await sb.from('profiles').select('id,full_name').eq('role', 'student').eq('class_id', classId).is('removed_at', null).order('full_name');
  if (error) throw new Error(error.message);
  return (data || []) as Stu[];
}

export async function loadBook(me: Me, classId: string, year: number, quarter: number): Promise<Book> {
  const students = await loadStudents(classId);
  const inScope = (c: Col) => c.class_id === classId && c.school_year === year && c.quarter === quarter;
  if (!noTable) {
    const a = await sb.from('cf_assessments').select('id,class_id,school_year,quarter,kind,title,held_on,max_points')
      .eq('class_id', classId).eq('school_year', year).eq('quarter', quarter);
    if (!a.error) {
      const cols = (a.data || []) as Col[];
      const marks: Marks = {};
      if (cols.length) {
        const m = await sb.from('cf_marks').select('assessment_id,student_id,points').in('assessment_id', cols.map(c => c.id));
        if (m.error) throw new Error(m.error.message);
        for (const r of m.data || []) marks[mkey(r.assessment_id, r.student_id)] = Number(r.points); // numeric arrives as a string
      }
      return { cols, students, marks, local: false };
    }
    if (!missing(a.error)) throw new Error(a.error.message);
    noTable = true;
  }
  const l = readLocal(me), cols = l.cols.filter(inScope);
  return { cols, students, marks: Object.fromEntries(Object.entries(l.marks).filter(([k]) => cols.some(c => k.startsWith(c.id + '|')))), local: true };
}

export async function addCol(me: Me, c: Omit<Col, 'id'>): Promise<Col> {
  if (!noTable) {
    const { data, error } = await sb.from('cf_assessments').insert({ ...c, school_id: me.school_id, owner_id: me.id }).select('id').single();
    if (!error) return { ...c, id: data.id };
    if (!missing(error)) throw new Error(error.message);
    noTable = true;
  }
  const col = { ...c, id: crypto.randomUUID() }, l = readLocal(me);
  writeLocal(me, { ...l, cols: [...l.cols, col] });
  return col;
}

export async function delCol(me: Me, id: string): Promise<void> {
  if (!noTable) {
    const { error } = await sb.from('cf_assessments').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const l = readLocal(me);
  writeLocal(me, { cols: l.cols.filter(c => c.id !== id), marks: Object.fromEntries(Object.entries(l.marks).filter(([k]) => !k.startsWith(id + '|'))) });
}

/** `points` null = clear the cell. */
export async function setMark(me: Me, col: string, stu: string, points: number | null): Promise<void> {
  if (!noTable) {
    const { error } = points === null
      ? await sb.from('cf_marks').delete().eq('assessment_id', col).eq('student_id', stu)
      : await sb.from('cf_marks').upsert({ assessment_id: col, student_id: stu, points }, { onConflict: 'assessment_id,student_id' });
    if (error) throw new Error(error.message);
    return;
  }
  const l = readLocal(me), k = mkey(col, stu), marks = { ...l.marks };
  if (points === null) delete marks[k]; else marks[k] = points;
  writeLocal(me, { ...l, marks });
}
