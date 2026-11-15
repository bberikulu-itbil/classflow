import { sb, DEMO } from '../config';

// Rows live in cf_contests / cf_contest_stages / cf_contest_teachers / cf_contest_saves / cf_contest_apps (supabase/052_contests.sql).
// In ?demo the same API runs on in-memory data (reset on reload). Names with "[мысал]" are made up, not a real schedule.
// shortcut: stages and responsible teachers are replaced (delete + insert), not diffed, and not in one transaction; fine for a handful of rows.

export const FIELDS: [string, string][] = [['general', 'Жалпы'], ['robotics', 'Робототехника'], ['informatics', 'Информатика'], ['teachers', 'Мұғалімдерге']];
export const LEVELS: [string, string][] = [['school', 'Мектепішілік'], ['city', 'Қалалық'], ['region', 'Облыстық'], ['republic', 'Республикалық'], ['international', 'Халықаралық']];
export const FORMATS: [string, string][] = [['quiz', 'Викторина'], ['coding', 'Кодтау жарысы'], ['tournament', 'Турнир']];
export const STATUS_NAMES: Record<string, string> = { draft: 'Жоба', rules_locked: 'Ережелер бекітілді', published: 'Жарияланды' };
export const APP_NAMES: Record<string, string> = { pending: 'Күтуде', approved: 'Расталды', rejected: 'Бас тартылды' };
export const nameOf = (list: [string, string][], v: string | null) => list.find(x => x[0] === v)?.[1] ?? '';

export interface Me { id: string; full_name?: string; role?: string; school_id?: string; class_id?: string | null }
export interface Contest {
  id: string; author_id: string; title: string; kind: 'own' | 'external'; format: string | null; field: string; level: string;
  organizer: string | null; url: string | null; description: string | null; starts_on: string | null; ends_on: string | null; grades: number[];
  teacher_only: boolean; status: 'draft' | 'rules_locked' | 'published'; rules_text: string; rules_version: number; rules_locked: boolean;
  reg_open: boolean; reg_deadline: string | null; needs_approval: boolean;
}
export interface Stage { id?: string; contest_id?: string; pos?: number; name: string; on_date: string | null; format: string | null; advance: string | null }
export interface App { id: string; contest_id: string; student_id: string; teacher_id: string; message: string; status: 'pending' | 'approved' | 'rejected'; rules_version: number; created_at: string }
export interface Person { id: string; full_name: string; class_name: string; staff: boolean }
export interface Data { contests: Contest[]; stages: Stage[]; teachers: { contest_id: string; teacher_id: string }[]; saves: string[]; apps: App[]; people: Record<string, Person> }
export interface Form {
  id?: string; title: string; kind: 'own' | 'external'; format: string; field: string; level: string; organizer: string; url: string; description: string;
  starts_on: string; ends_on: string; grades: number[]; teacher_only: boolean; rules_text: string; rules_locked: boolean; status: Contest['status'];
  reg_open: boolean; reg_deadline: string; needs_approval: boolean; stages: Stage[]; teacher_ids: string[];
}

export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** Registration is open for applications: published, switched on, deadline not passed. */
export const regOpen = (c: Contest) => c.status === 'published' && c.reg_open && (!c.reg_deadline || c.reg_deadline >= todayIso());
/** The stage that is on now or next; after the last one, the last. */
export const currentStage = (st: Stage[]) => st.find(s => s.on_date && s.on_date >= todayIso()) ?? st[st.length - 1];

const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
const blank = (s: string) => { const v = s.trim(); return v || null; };

// ---------- demo data ----------
const T = (id: string, full_name: string): Person => ({ id, full_name, class_name: '', staff: true });
const S = (id: string, full_name: string, class_name: string): Person => ({ id, full_name, class_name, staff: false });
const mk = (id: string, o: Partial<Contest>): Contest => ({
  id, author_id: 't1', title: '', kind: 'external', format: null, field: 'general', level: 'school', organizer: null, url: null, description: null,
  starts_on: null, ends_on: null, grades: [], teacher_only: false, status: 'published', rules_text: '', rules_version: 0, rules_locked: false,
  reg_open: true, reg_deadline: null, needs_approval: true, ...o,
});
const stg = (contest_id: string, rows: [string, string | null, string?, string?][]): Stage[] =>
  rows.map((r, i) => ({ id: `${contest_id}-s${i}`, contest_id, pos: i, name: r[0], on_date: r[1], format: r[2] ?? null, advance: r[3] ?? null }));
const ym = (add: number, day: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + add); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; };
let demo: Data | null = null;
const seed = (): Data => ({
  contests: [
    mk('d1', { title: 'KBO [мысал]', field: 'informatics', level: 'republic', organizer: 'Мысал ұйымдастырушы', url: 'https://example.com/kbo', description: 'Үлгі ретінде қосылған сайыс. Күндері нақты кестеге сай емес.', starts_on: ym(0, 20), ends_on: ym(2, 10), grades: [7, 8, 9], reg_deadline: ym(0, 28) }),
    mk('d2', { title: 'FIRST LEGO League [мысал]', field: 'robotics', level: 'international', organizer: 'Мысал ұйымдастырушы', starts_on: ym(1, 12), ends_on: ym(4, 5), grades: [5, 6, 7, 8] }),
    mk('d3', { title: 'Қалалық олимпиада [мысал]', field: 'informatics', level: 'city', starts_on: ym(1, 3), ends_on: ym(1, 3), grades: [9, 10, 11] }),
    mk('d4', { title: 'Мектепішілік кодтау жарысы [мысал]', kind: 'own', format: 'coding', field: 'informatics', level: 'school', starts_on: ym(0, 25), ends_on: ym(0, 25), grades: [8, 9, 10], status: 'published', rules_text: '1. Жарыс 40 минут.\n2. Тек Python.\n3. Көшіруге болмайды.', rules_version: 1, rules_locked: true }),
    mk('d5', { title: 'Мұғалімдерге: әдістемелік конкурс [мысал]', field: 'teachers', level: 'region', teacher_only: true, starts_on: ym(2, 15), ends_on: ym(2, 15) }),
    mk('d6', { title: 'Жоба: мектеп турнирі [мысал]', kind: 'own', format: 'tournament', status: 'draft', starts_on: ym(3, 1), ends_on: ym(3, 1) }),
  ],
  stages: [
    ...stg('d1', [['KBO1', ym(0, 20), 'Онлайн'], ['KBO2', ym(1, 14), 'Онлайн', 'Алғашқы 30 %'], ['KBO3', ym(2, 10), 'Қатысып']]),
    ...stg('d2', [['Қалалық', ym(1, 12)], ['Облыстық', ym(2, 20)], ['Республикалық', ym(3, 25)], ['Халықаралық', ym(4, 5)]]),
    ...stg('d4', [['Іріктеу', ym(0, 25), 'Онлайн, ClassFlow', 'Алғашқы 5']]),
  ],
  teachers: [{ contest_id: 'd1', teacher_id: 't1' }, { contest_id: 'd1', teacher_id: 't2' }, { contest_id: 'd2', teacher_id: 't1' }, { contest_id: 'd3', teacher_id: 't2' }, { contest_id: 'd4', teacher_id: 't1' }, { contest_id: 'd5', teacher_id: 't1' }, { contest_id: 'd6', teacher_id: 't1' }],
  saves: [],
  apps: [{ id: 'da1', contest_id: 'd1', student_id: 'st-dana', teacher_id: 't1', message: 'Былтыр да қатысқам, енді KBO2-ге өткім келеді.', status: 'pending', rules_version: 0, created_at: new Date().toISOString() }],
  people: Object.fromEntries([T('t1', 'Бағдәулет Е.'), T('t2', 'Әсел М. [мысал]'), S('st-aidar', 'Айдар Нұрланов', '7B'), S('st-dana', 'Дана С. [мысал]', '8A')].map(p => [p.id, p])),
});
const D = () => (demo ||= seed());
const visible = (d: Data, me: Me) => ({
  ...d,
  contests: d.contests.filter(c => (c.status === 'published' && (!c.teacher_only || me.role !== 'student')) || (me.role !== 'student' && c.author_id === me.id)),
  apps: d.apps.filter(a => (me.role === 'student' ? a.student_id === me.id : true)),
});

// ---------- read ----------
export async function loadAll(me: Me): Promise<Data> {
  if (DEMO) return structuredClone(visible(D(), me));
  const [c, s, t, v, a, p, k] = await Promise.all([
    sb.from('cf_contests').select('*').order('starts_on', { ascending: true, nullsFirst: false }),
    sb.from('cf_contest_stages').select('*').order('pos'),
    sb.from('cf_contest_teachers').select('contest_id,teacher_id'),
    sb.from('cf_contest_saves').select('contest_id').eq('user_id', me.id),
    sb.from('cf_contest_apps').select('*').order('created_at', { ascending: false }),
    sb.from('profiles').select('id,full_name,class_id,role').is('removed_at', null),
    sb.from('classes').select('id,name')]);
  for (const r of [c, s, t, v, a, p, k]) fail(r.error);
  const cls = new Map((k.data as { id: string; name: string }[]).map(x => [x.id, x.name]));
  const people: Record<string, Person> = {};
  for (const x of p.data as { id: string; full_name: string; class_id: string | null; role: string }[])
    people[x.id] = { id: x.id, full_name: x.full_name, class_name: (x.class_id && cls.get(x.class_id)) || '', staff: x.role !== 'student' };
  return { contests: c.data as Contest[], stages: s.data as Stage[], teachers: t.data as Data['teachers'], saves: (v.data as { contest_id: string }[]).map(x => x.contest_id), apps: a.data as App[], people };
}

// ---------- write ----------
export const emptyForm = (me: Me, kind: 'own' | 'external' = 'external'): Form => ({
  title: '', kind, format: kind === 'own' ? 'quiz' : '', field: 'general', level: 'school', organizer: '', url: '', description: '', starts_on: '', ends_on: '', grades: [],
  teacher_only: false, rules_text: '', rules_locked: false, status: 'draft', reg_open: true, reg_deadline: '', needs_approval: true, stages: [], teacher_ids: [me.id],
});
export const formOf = (d: Data, id: string): Form | undefined => {
  const c = d.contests.find(x => x.id === id);
  if (!c) return;
  return {
    id: c.id, title: c.title, kind: c.kind, format: c.format ?? '', field: c.field, level: c.level, organizer: c.organizer ?? '', url: c.url ?? '', description: c.description ?? '',
    starts_on: c.starts_on ?? '', ends_on: c.ends_on ?? '', grades: c.grades, teacher_only: c.teacher_only, rules_text: c.rules_text, rules_locked: c.rules_locked, status: c.status,
    reg_open: c.reg_open, reg_deadline: c.reg_deadline ?? '', needs_approval: c.needs_approval,
    stages: d.stages.filter(s => s.contest_id === id).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0)), teacher_ids: d.teachers.filter(t => t.contest_id === id).map(t => t.teacher_id),
  };
};
export function validate(f: Form, publish: boolean): string {
  if (!f.title.trim()) return 'Сайыстың атауын жазыңыз';
  if (f.starts_on && f.ends_on && f.ends_on < f.starts_on) return 'Аяқталу күні басталу күнінен бұрын болмауы керек';
  if (f.url.trim() && !/^https?:\/\//i.test(f.url.trim())) return 'Сілтеме http:// немесе https:// деп басталуы керек';
  if (f.stages.some(s => !s.name.trim())) return 'Әр кезеңнің атауын жазыңыз';
  if (publish && f.kind === 'own' && !f.rules_locked) return 'Алдымен ережені бекітіңіз';
  if (publish && !f.teacher_only && !f.teacher_ids.length) return 'Кемінде бір жауапты мұғалімді таңдаңыз';
  return '';
}

/** Saves the form; returns the contest id. `publish` true/false sets the status, undefined keeps it. */
export async function saveContest(me: Me, f: Form, opts: { lock?: boolean; publish?: boolean } = {}): Promise<string> {
  const err = validate(f, !!opts.publish); if (err) throw new Error(err);
  const lock = f.rules_locked || !!opts.lock;
  const row = {
    title: f.title.trim(), kind: f.kind, format: f.kind === 'own' ? f.format || 'quiz' : null, field: f.field, level: f.level, organizer: blank(f.organizer), url: blank(f.url),
    description: blank(f.description), starts_on: f.starts_on || null, ends_on: f.ends_on || f.starts_on || null, grades: f.grades, teacher_only: f.teacher_only,
    rules_text: f.rules_text, reg_open: f.reg_open, reg_deadline: f.reg_deadline || null, needs_approval: f.needs_approval,
  };
  const status = opts.publish === true ? 'published' : opts.publish === false ? 'draft' : f.status;
  const stages = f.stages.map((s, i) => ({ pos: i, name: s.name.trim(), on_date: s.on_date || null, format: blank(s.format ?? ''), advance: blank(s.advance ?? '') }));
  const teacher_ids = f.teacher_only && !f.teacher_ids.length ? [me.id] : f.teacher_ids;
  if (DEMO) {
    const d = D(); const id = f.id ?? 'dc' + Date.now();
    const old = d.contests.find(c => c.id === id);
    const locked = lock || !!old?.rules_locked;
    const version = locked ? (old?.rules_locked ? old.rules_version + (old.rules_text !== row.rules_text ? 1 : 0) : 1) : 0;
    const next = mk(id, { ...row, author_id: old?.author_id ?? me.id, rules_locked: locked, rules_version: version, status: locked && status === 'draft' ? 'rules_locked' : status });
    d.contests = old ? d.contests.map(c => (c.id === id ? next : c)) : [...d.contests, next];
    d.stages = [...d.stages.filter(s => s.contest_id !== id), ...stages.map((s, i) => ({ ...s, id: `${id}-s${i}`, contest_id: id }))];
    d.teachers = [...d.teachers.filter(t => t.contest_id !== id), ...teacher_ids.map(t => ({ contest_id: id, teacher_id: t }))];
    return id;
  }
  let id = f.id;
  if (!id) {
    const { data, error } = await sb.from('cf_contests').insert({ ...row, school_id: me.school_id, author_id: me.id }).select('id').single();
    fail(error); id = (data as { id: string }).id;
  }
  // rules_locked / status are only honoured on update (the trigger resets them on insert)
  fail((await sb.from('cf_contests').update({ ...row, rules_locked: lock, status }).eq('id', id)).error);
  fail((await sb.from('cf_contest_stages').delete().eq('contest_id', id)).error);
  if (stages.length) fail((await sb.from('cf_contest_stages').insert(stages.map(s => ({ ...s, contest_id: id }))).select('id')).error);
  fail((await sb.from('cf_contest_teachers').delete().eq('contest_id', id)).error);
  if (teacher_ids.length) fail((await sb.from('cf_contest_teachers').insert(teacher_ids.map(t => ({ contest_id: id, teacher_id: t }))).select('contest_id')).error);
  return id!;
}

export async function deleteContest(id: string): Promise<void> {
  if (DEMO) { const d = D(); if (d.apps.some(a => a.contest_id === id)) throw new Error('Өтінімі бар сайысты өшіруге болмайды'); d.contests = d.contests.filter(c => c.id !== id); return; }
  const { data, error } = await sb.from('cf_contests').delete().eq('id', id).select('id');
  fail(error); if (!data?.length) throw new Error('Өтінімі бар сайысты өшіруге болмайды');
}

export async function setSaved(me: Me, id: string, on: boolean): Promise<void> {
  if (DEMO) { const d = D(); d.saves = on ? [...new Set([...d.saves, id])] : d.saves.filter(x => x !== id); return; }
  fail(on ? (await sb.from('cf_contest_saves').upsert({ contest_id: id, user_id: me.id })).error : (await sb.from('cf_contest_saves').delete().eq('contest_id', id).eq('user_id', me.id)).error);
}

export async function apply(me: Me, c: Contest, teacher_id: string, message: string): Promise<void> {
  if (DEMO) {
    const d = D();
    if (d.apps.some(a => a.contest_id === c.id && a.student_id === me.id && a.status !== 'rejected')) throw new Error('Өтінім бұрын жіберілген');
    d.apps = [{ id: 'da' + Date.now(), contest_id: c.id, student_id: me.id, teacher_id, message: message.slice(0, 500), status: c.needs_approval ? 'pending' : 'approved', rules_version: c.rules_version, created_at: new Date().toISOString() }, ...d.apps.filter(a => !(a.contest_id === c.id && a.student_id === me.id))];
    return;
  }
  fail((await sb.rpc('cf_contest_apply', { p_contest: c.id, p_teacher: teacher_id, p_message: message })).error);
}

export async function decide(id: string, status: 'approved' | 'rejected'): Promise<void> {
  if (DEMO) { const d = D(); d.apps = d.apps.map(a => (a.id === id ? { ...a, status } : a)); return; }
  fail((await sb.rpc('cf_contest_decide', { p_app: id, p_status: status })).error);
}
