import { sb, DEMO } from '../config';
import { loadLessons } from '../curriculum/store';
import type { Les } from '../curriculum/store';
import { loadClasses } from '../journal/store';
import type { Cls } from '../lessons/model';
import type { VT } from './quiz';

export interface Term { id: string; kk: string; ru: string | null; en: string | null; definition: string | null; subject: string | null }
export interface Link { term_id: string; lesson_id: string }
export interface SetRow { id: string; class_id: string; title: string; terms: VT[]; created_at: string }
export interface Me { id: string; school_id: string; class_id?: string | null }
export interface Base { terms: Term[]; links: Link[]; lessons: Les[]; classes: Cls[]; sets: SetRow[]; local: boolean }

// Rows live in cf_vocab / cf_vocab_lessons / cf_vocab_sets (supabase/011_vocab.sql). Without the tables (and in the demo) they stay in this browser.
// shortcut: browser data from before the tables existed is not moved up; add a "move" card if a teacher has real data there.
let noBase = !!DEMO, noSets = !!DEMO;
type Err = { message: string; code?: string } | null;
const missing = (e: Err) => e?.code === 'PGRST205' || e?.code === '42P01';
const fail = (e: Err) => { if (e) throw new Error(e.message); };
const DUP = 'Бұл термин базада бар';
const baseKey = (me: Me) => 'cf_vocab_' + me.id;
const SETS_KEY = 'cf_vocab_sets_local'; // one key for the whole browser: in the demo the teacher's set must be visible to the student
interface LocalBase { terms: Term[]; links: Link[] }
const read = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { throw new Error('Браузер сақтауға рұқсат бермеді (құпия режимде болуы мүмкін)'); } };
const demoBase = (): LocalBase => ({
  terms: [
    { id: 'v1', kk: 'алгоритм', ru: 'алгоритм', en: 'algorithm', definition: 'Есепті шешу қадамдарының тізбегі', subject: 'Информатика' },
    { id: 'v2', kk: 'айнымалы', ru: 'переменная', en: 'variable', definition: 'Мәнді сақтайтын атау', subject: 'Информатика' },
    { id: 'v3', kk: 'цикл', ru: 'цикл', en: 'loop', definition: 'Қайталанатын әрекет', subject: 'Информатика' },
    { id: 'v4', kk: 'шарт', ru: 'условие', en: 'condition', definition: null, subject: 'Информатика' },
  ],
  links: [{ term_id: 'v3', lesson_id: 'l1' }],
});
const localBase = (me: Me): LocalBase => { const v = read<LocalBase | null>(baseKey(me), null); return v && Array.isArray(v.terms) && Array.isArray(v.links) ? v : DEMO ? demoBase() : { terms: [], links: [] }; };
const localSets = (): SetRow[] => read<SetRow[]>(SETS_KEY, []).filter(s => s && typeof s.id === 'string' && Array.isArray(s.terms));
const byKk = (a: Term, b: Term) => a.kk.localeCompare(b.kk, 'kk');
const asVT = (t: Term | VT): VT => ({ kk: t.kk, ru: t.ru ?? null, en: t.en ?? null, definition: t.definition ?? null });

export async function loadBase(me: Me): Promise<Base> {
  const [lessons, classes] = await Promise.all([loadLessons(me.id), loadClasses()]);
  let terms: Term[], links: Link[], local = false;
  if (!noBase) {
    const [t, l] = await Promise.all([sb.from('cf_vocab').select('id,kk,ru,en,definition,subject'), sb.from('cf_vocab_lessons').select('term_id,lesson_id')]);
    if (!t.error) { fail(l.error); terms = t.data as Term[]; links = l.data as Link[]; }
    else { if (!missing(t.error)) fail(t.error); noBase = true; ({ terms, links } = localBase(me)); local = true; }
  } else { ({ terms, links } = localBase(me)); local = true; }
  return { terms: terms.sort(byKk), links, lessons, classes, sets: await loadSets(me, true), local };
}

/** Sets a teacher gave (teacher = true, all of them) or the sets of the student's own class. */
export async function loadSets(me: Me, teacher: boolean): Promise<SetRow[]> {
  if (!noSets) {
    const { data, error } = await sb.from('cf_vocab_sets').select('id,class_id,title,terms,created_at').order('created_at', { ascending: false });
    if (!error) return data as SetRow[];
    if (!missing(error)) fail(error);
    noSets = true;
  }
  return localSets().filter(s => teacher || s.class_id === me.class_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export const setsAreLocal = () => noSets;

const clean = (s: string | null | undefined, max: number) => { const v = (s || '').trim().slice(0, max); return v || null; };
export const normalize = (t: Omit<Term, 'id'>): Omit<Term, 'id'> => ({ kk: (t.kk || '').trim().slice(0, 80), ru: clean(t.ru, 80), en: clean(t.en, 80), definition: clean(t.definition, 300), subject: clean(t.subject, 60) });

export async function addTerm(me: Me, input: Omit<Term, 'id'>): Promise<void> {
  const t = normalize(input);
  if (!t.kk) throw new Error('Қазақша терминді жазыңыз');
  const id = crypto.randomUUID();
  if (!noBase) {
    const { error } = await sb.from('cf_vocab').insert({ id, ...t, school_id: me.school_id, owner_id: me.id });
    if (!error) return;
    if (error.code === '23505') throw new Error(DUP);
    if (!missing(error)) fail(error);
    noBase = true;
  }
  const l = localBase(me);
  if (l.terms.some(x => x.kk.toLowerCase() === t.kk.toLowerCase())) throw new Error(DUP);
  write(baseKey(me), { ...l, terms: [...l.terms, { id, ...t }] });
}

/** Pastes of "kk | ru | en | definition" lines (also tab or ;). Returns what happened to each line. */
export function parseLines(text: string): { terms: Omit<Term, 'id'>[]; bad: number } {
  const terms: Omit<Term, 'id'>[] = []; let bad = 0;
  for (const line of text.split('\n').map(x => x.trim()).filter(Boolean)) {
    const [kk, ru, en, definition] = line.split(/\s*[|\t;]\s*/);
    const t = normalize({ kk: kk || '', ru: ru ?? null, en: en ?? null, definition: definition ?? null, subject: null });
    if (t.kk) terms.push(t); else bad++;
  }
  return { terms, bad };
}
export async function importTerms(me: Me, text: string, subject: string): Promise<{ added: number; skipped: number; bad: number }> {
  const { terms, bad } = parseLines(text);
  let added = 0, skipped = 0;
  for (const t of terms) {
    try { await addTerm(me, { ...t, subject: subject.trim() || null }); added++; }
    catch (e) { if ((e as Error).message === DUP) skipped++; else throw e; }
  }
  return { added, skipped, bad };
}

/** The entry a lesson keeps for a term: the shape the student lesson screen already shows ({term, definition}); `vid` marks entries that come from the base. */
const lessonEntry = (t: Term) => ({ term: t.kk, definition: [t.definition, t.ru && `RU: ${t.ru}`, t.en && `EN: ${t.en}`].filter(Boolean).join(' · '), vid: t.id });
/** Rebuilds the base-made entries of lesson.terms from the current links; entries typed by hand in the lesson editor stay. */
async function syncLesson(lessonId: string): Promise<void> {
  if (noBase) return; // browser-only mode has no lesson rows to write to
  const [lt, lk] = await Promise.all([sb.from('cf_lessons').select('terms').eq('id', lessonId).maybeSingle(), sb.from('cf_vocab_lessons').select('term_id').eq('lesson_id', lessonId)]);
  fail(lt.error); fail(lk.error);
  const ids = (lk.data || []).map((x: any) => x.term_id);
  const tt = ids.length ? await sb.from('cf_vocab').select('id,kk,ru,en,definition,subject').in('id', ids) : { data: [] as Term[], error: null };
  fail(tt.error);
  const hand = (Array.isArray((lt.data as any)?.terms) ? (lt.data as any).terms : []).filter((x: any) => !x?.vid);
  fail((await sb.from('cf_lessons').update({ terms: [...hand, ...(tt.data as Term[]).sort(byKk).map(lessonEntry)] }).eq('id', lessonId)).error);
}

export async function updateTerm(me: Me, id: string, input: Omit<Term, 'id'>): Promise<void> {
  const t = normalize(input);
  if (!t.kk) throw new Error('Қазақша терминді жазыңыз');
  if (!noBase) {
    const { error } = await sb.from('cf_vocab').update(t).eq('id', id);
    if (error?.code === '23505') throw new Error(DUP);
    fail(error);
    const { data } = await sb.from('cf_vocab_lessons').select('lesson_id').eq('term_id', id);
    for (const l of data || []) await syncLesson((l as any).lesson_id);
    return;
  }
  const l = localBase(me);
  if (l.terms.some(x => x.id !== id && x.kk.toLowerCase() === t.kk.toLowerCase())) throw new Error(DUP);
  write(baseKey(me), { ...l, terms: l.terms.map(x => (x.id === id ? { id, ...t } : x)) });
}
export async function delTerm(me: Me, id: string): Promise<void> {
  if (!noBase) {
    const { data } = await sb.from('cf_vocab_lessons').select('lesson_id').eq('term_id', id);
    fail((await sb.from('cf_vocab').delete().eq('id', id)).error);
    for (const l of data || []) await syncLesson((l as any).lesson_id);
    return;
  }
  const l = localBase(me);
  write(baseKey(me), { terms: l.terms.filter(x => x.id !== id), links: l.links.filter(x => x.term_id !== id) });
}

/** Makes the terms of a lesson exactly `termIds`. */
export async function setLinks(me: Me, lessonId: string, termIds: string[], current: Link[]): Promise<void> {
  const have = new Set(current.filter(l => l.lesson_id === lessonId).map(l => l.term_id)), want = new Set(termIds);
  const add = termIds.filter(id => !have.has(id)), drop = [...have].filter(id => !want.has(id));
  if (!add.length && !drop.length) return;
  if (!noBase) {
    if (add.length) fail((await sb.from('cf_vocab_lessons').insert(add.map(term_id => ({ term_id, lesson_id: lessonId })))).error);
    if (drop.length) fail((await sb.from('cf_vocab_lessons').delete().eq('lesson_id', lessonId).in('term_id', drop)).error);
    await syncLesson(lessonId);
    return;
  }
  const l = localBase(me);
  write(baseKey(me), { ...l, links: [...l.links.filter(x => !(x.lesson_id === lessonId && drop.includes(x.term_id))), ...add.map(term_id => ({ term_id, lesson_id: lessonId }))] });
}

/** One set per class; the terms are copied, so later edits of the base do not change what students got. */
export async function createSets(me: Me, classIds: string[], title: string, terms: VT[]): Promise<void> {
  const t = title.trim().slice(0, 80);
  if (!t) throw new Error('Жинақтың атауын жазыңыз');
  if (!classIds.length) throw new Error('Кемінде бір сыныпты таңдаңыз');
  if (!terms.length) throw new Error('Кемінде бір термин таңдаңыз');
  const rows = classIds.map(class_id => ({ id: crypto.randomUUID(), class_id, title: t, terms: terms.map(asVT), created_at: new Date().toISOString() }));
  if (!noSets) {
    const { error } = await sb.from('cf_vocab_sets').insert(rows.map(r => ({ ...r, school_id: me.school_id, owner_id: me.id })));
    if (!error) return;
    if (!missing(error)) fail(error);
    noSets = true;
  }
  write(SETS_KEY, [...rows, ...localSets()]);
}
export async function delSet(_me: Me, id: string): Promise<void> {
  if (!noSets) { fail((await sb.from('cf_vocab_sets').delete().eq('id', id)).error); return; }
  write(SETS_KEY, localSets().filter(s => s.id !== id));
}
