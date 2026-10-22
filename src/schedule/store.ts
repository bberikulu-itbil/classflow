import { sb, DEMO } from '../config';
import { generate } from './plan';
import { createSession } from '../views/session';

export interface Entry { id: string; class_id: string; weekday: number; period: number }
export interface Slot { id: string; class_id: string; school_year: number; quarter: number; held_on: string; period: number; lesson_id: string | null; session_id: string | null }
export interface Sched { entries: Entry[]; slots: Slot[]; local: boolean }
export interface Me { id: string; school_id: string }

// Rows live in cf_timetable / cf_slots (supabase/009_schedule.sql). Without the tables (and in the demo) they stay in this browser.
// shortcut: data made in the browser before the tables existed is not moved up; add a "move" card if a teacher has real data there.
let noTable = !!DEMO;
type Err = { message: string; code?: string } | null;
const missing = (e: Err) => e?.code === 'PGRST205' || e?.code === '42P01';
const dup = (e: Err) => e?.code === '23505';
const key = (me: Me) => 'cf_schedule_' + me.id;
interface Local { entries: Entry[]; slots: Slot[] }
const demoSeed = (): Local => ({ entries: [{ id: 'e1', class_id: 'c7b', weekday: 2, period: 2 }, { id: 'e2', class_id: 'c7b', weekday: 5, period: 4 }], slots: [] });
function readLocal(me: Me): Local {
  try { const v = JSON.parse(localStorage.getItem(key(me)) || 'null'); if (v && Array.isArray(v.entries) && Array.isArray(v.slots)) return v; } catch { /* unreadable: start empty */ }
  return DEMO ? demoSeed() : { entries: [], slots: [] };
}
const save = (me: Me, v: Local) => { try { localStorage.setItem(key(me), JSON.stringify(v)); } catch { throw new Error('Браузер сақтауға рұқсат бермеді (құпия режимде болуы мүмкін)'); } };
const fail = (e: Err) => { if (e) throw new Error(e.message); };
const TAKEN = 'Бұл күн мен сабақ нөмірі бос емес';

let noSessionCol = false; // an older 009 was run: the column session_id is not there yet
export async function loadSched(me: Me, year: number, quarter: number): Promise<Sched> {
  if (!noTable) {
    const slots = () => sb.from('cf_slots').select(noSessionCol ? 'id,class_id,school_year,quarter,held_on,period,lesson_id' : 'id,class_id,school_year,quarter,held_on,period,lesson_id,session_id')
      .eq('school_year', year).eq('quarter', quarter).order('held_on').order('period');
    const [e, first] = await Promise.all([sb.from('cf_timetable').select('id,class_id,weekday,period'), slots()]);
    let s = first;
    if (s.error?.code === '42703' && !noSessionCol) { noSessionCol = true; s = await slots(); }
    if (!e.error) { fail(s.error); return { entries: e.data as Entry[], slots: (s.data as any[]).map(x => ({ ...x, session_id: x.session_id ?? null })) as Slot[], local: false }; }
    if (!missing(e.error)) fail(e.error);
    noTable = true;
  }
  const l = readLocal(me);
  return { entries: l.entries, slots: l.slots.filter(s => s.school_year === year && s.quarter === quarter).map(s => ({ ...s, session_id: s.session_id ?? null })).sort((a, b) => a.held_on.localeCompare(b.held_on) || a.period - b.period), local: true };
}

export async function addEntry(me: Me, c: Omit<Entry, 'id'>): Promise<void> {
  const id = crypto.randomUUID();
  if (!noTable) {
    const { error } = await sb.from('cf_timetable').insert({ id, ...c, school_id: me.school_id, owner_id: me.id });
    if (!error) return;
    if (dup(error)) throw new Error(TAKEN);
    if (!missing(error)) fail(error);
    noTable = true;
  }
  const l = readLocal(me);
  if (l.entries.some(e => e.weekday === c.weekday && e.period === c.period)) throw new Error(TAKEN);
  save(me, { ...l, entries: [...l.entries, { id, ...c }] });
}
export async function delEntry(me: Me, id: string): Promise<void> {
  if (!noTable) { fail((await sb.from('cf_timetable').delete().eq('id', id)).error); return; }
  const l = readLocal(me); save(me, { ...l, entries: l.entries.filter(e => e.id !== id) });
}

/** Creates the slots of `classId` between two dates from the weekly timetable. Slots that exist already (same date and period) are left alone. Returns how many were new. */
export async function makeSlots(me: Me, classId: string, year: number, quarter: number, from: string, to: string, have: Slot[]): Promise<number> {
  const cells = generate(from, to, (await currentEntries(me)).filter(e => e.class_id === classId));
  const taken = new Set(have.map(s => s.held_on + '|' + s.period));
  const fresh = cells.filter(c => !taken.has(c.held_on + '|' + c.period));
  if (!fresh.length) return 0;
  const rows = fresh.map(c => ({ id: crypto.randomUUID(), class_id: classId, school_year: year, quarter, held_on: c.held_on, period: c.period, lesson_id: null as string | null, session_id: null as string | null }));
  if (!noTable) {
    const { error } = await sb.from('cf_slots').insert(rows.map(({ session_id: _s, ...r }) => ({ ...r, school_id: me.school_id, owner_id: me.id })));
    if (!error) return rows.length;
    if (dup(error)) throw new Error('Кейбір күндер басқа сыныптың ұяшығымен бос емес');
    if (!missing(error)) fail(error);
    noTable = true;
  }
  const l = readLocal(me);
  save(me, { ...l, slots: [...l.slots, ...rows] });
  return rows.length;
}
async function currentEntries(me: Me): Promise<Entry[]> {
  if (!noTable) { const { data, error } = await sb.from('cf_timetable').select('id,class_id,weekday,period'); fail(error); return data as Entry[]; }
  return readLocal(me).entries;
}

export async function setSlotLesson(me: Me, id: string, lessonId: string | null): Promise<void> {
  if (!noTable) { fail((await sb.from('cf_slots').update({ lesson_id: lessonId }).eq('id', id)).error); return; }
  const l = readLocal(me); save(me, { ...l, slots: l.slots.map(s => (s.id === id ? { ...s, lesson_id: lessonId } : s)) });
}
export async function delSlot(me: Me, id: string): Promise<void> {
  if (!noTable) { fail((await sb.from('cf_slots').delete().eq('id', id)).error); return; }
  const l = readLocal(me); save(me, { ...l, slots: l.slots.filter(s => s.id !== id) });
}

/** Starts the lecture of a slot for its class and remembers the live lesson on the slot. Returns the session id; the caller opens the remote. */
export async function startSlot(me: Me, slot: Slot, groups = 3): Promise<string> {
  if (!slot.lesson_id) throw new Error('Алдымен ұяшыққа дәріс қойыңыз');
  if (slot.session_id) return slot.session_id;
  const id = await createSession(slot.lesson_id, slot.class_id, groups);
  // shortcut: if only this link fails to save, the lesson still runs; the slot just shows "Бастау" again (the live lesson is in the lesson page list).
  try {
    if (!noTable) { await sb.from('cf_slots').update({ session_id: id }).eq('id', slot.id); }
    else { const l = readLocal(me); save(me, { ...l, slots: l.slots.map(x => (x.id === slot.id ? { ...x, session_id: id } : x)) }); }
  } catch { /* see shortcut above */ }
  return id;
}
