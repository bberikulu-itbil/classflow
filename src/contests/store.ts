import { sb, DEMO } from '../config';

// Rows live in cf_contests / cf_contest_stages / cf_contest_categories / cf_contest_teachers / cf_contest_saves / cf_contest_apps (supabase/052_contests.sql, 054_contests_v2.sql).
// In ?demo the same API runs on in-memory data (reset on reload). Names with "[мысал]" are made up, not a real schedule.
// shortcut: stages and responsible teachers are replaced (delete + insert), not diffed, and not in one transaction; fine for a handful of rows.

/** Known fields (value → label). A contest's field is any text: one of these keys, or the teacher's own name. */
export const FIELDS: [string, string][] = [
  ['general', 'Жалпы'], ['robotics', 'Робототехника'], ['informatics', 'Информатика'], ['programming', 'Бағдарламалау'], ['ai', 'Жасанды интеллект'], ['stem', 'STEM және инженерия'],
  ['math', 'Математика'], ['physics', 'Физика'], ['chemistry', 'Химия'], ['biology', 'Биология'], ['ecology', 'Экология'], ['startup', 'Бизнес және стартап'],
  ['art', 'Өнер және дизайн'], ['languages', 'Тілдер'], ['humanities', 'Гуманитарлық'], ['sport', 'Спорт'], ['teachers', 'Мұғалімдерге'],
];
/** Category names offered when adding a category; the teacher may type any other name. */
export const KNOWN_CATS = ['FLL', 'FTC', 'VEX IQ', 'VEX V5', 'Robot Game', 'Innovation Project', 'Drone Soccer', 'Hardware Control', 'Arduino Hackathon', 'AI Programming', 'Computer Art', 'Startup',
  'Short Film', 'Robotics', 'Science', 'Business', 'Coding/AI', 'Art', 'Engineering', 'Environment', 'Energy', 'Computer Science', 'Python', 'Алгоритмдер', 'Веб-дизайн', 'Ойын жасау',
  'Кибер қауіпсіздік', 'Driving Skills Challenge', 'Autonomous Coding Skills', 'Жеке қатысу', 'Командалық қатысу'];
export const fieldName = (v: string) => FIELDS.find(x => x[0] === v)?.[1] ?? v;
export const LEVELS: [string, string][] = [['school', 'Мектепішілік'], ['city', 'Қалалық'], ['region', 'Облыстық'], ['republic', 'Республикалық'], ['international', 'Халықаралық']];
export const FORMATS: [string, string][] = [['quiz', 'Викторина'], ['coding', 'Кодтау жарысы'], ['tournament', 'Турнир']];
export const STATUS_NAMES: Record<string, string> = { draft: 'Жоба', rules_locked: 'Ережелер бекітілді', published: 'Жарияланды' };
export const APP_NAMES: Record<string, string> = { pending: 'Күтуде', approved: 'Расталды', rejected: 'Бас тартылды' };
export const nameOf = (list: [string, string][], v: string | null) => list.find(x => x[0] === v)?.[1] ?? '';

export interface Me { id: string; full_name?: string; role?: string; school_id?: string; class_id?: string | null }
export interface Contest {
  id: string; author_id: string; title: string; kind: 'own' | 'external'; format: string | null; field: string; level: string | null;
  organizer: string | null; url: string | null; description: string | null; starts_on: string | null; ends_on: string | null; grades: number[];
  teacher_only: boolean; status: 'draft' | 'rules_locked' | 'published'; rules_text: string; rules_version: number; rules_locked: boolean;
  reg_open: boolean; reg_from: string | null; reg_deadline: string | null; needs_approval: boolean;
  location: string | null; map_url: string | null; lat: number | null; lng: number | null; is_online: boolean; age_min: number | null; age_max: number | null; team_size: string | null;
  fee_text: string | null; travel_text: string | null; toolset: string | null; cover_url: string | null; icon: string | null;
}
export interface Stage { id?: string; contest_id?: string; pos?: number; name: string; on_date: string | null; format: string | null; advance: string | null; level: string | null; location: string | null }
/** A part of a contest (FLL, Drone Soccer ...) with its own rules. */
export interface Category { id?: string; contest_id?: string; pos?: number; name: string; rules_url: string | null; rules_text: string; grades: number[] }
export interface App { id: string; contest_id: string; student_id: string; teacher_id: string; message: string; status: 'pending' | 'approved' | 'rejected'; rules_version: number; created_at: string; category_id?: string | null }
export interface Person { id: string; full_name: string; class_name: string; staff: boolean }
export interface Data { contests: Contest[]; stages: Stage[]; categories: Category[]; teachers: { contest_id: string; teacher_id: string }[]; saves: string[]; apps: App[]; people: Record<string, Person> }
export interface Form {
  id?: string; title: string; kind: 'own' | 'external'; format: string; field: string; level: string; organizer: string; url: string; description: string;
  starts_on: string; ends_on: string; grades: number[]; teacher_only: boolean; rules_text: string; rules_locked: boolean; status: Contest['status'];
  reg_open: boolean; reg_from: string; reg_deadline: string; needs_approval: boolean; stages: Stage[]; categories: Category[]; teacher_ids: string[];
  location: string; map_url: string; lat: string; lng: string; is_online: boolean; age_min: string; age_max: string; team_size: string; fee_text: string; travel_text: string; toolset: string; cover_url: string; icon: string;
}

/** Coordinates for a pin: from a 2GIS link (…?m=lon,lat/zoom) when it carries them, else a place-name search (OpenStreetMap Nominatim). */
export async function findCoords(map_url: string, place: string): Promise<{ lat: number; lng: number }> {
  const m = /[?&]m=(-?\d+(?:\.\d+)?)%2C(-?\d+(?:\.\d+)?)|[?&]m=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i.exec(map_url);
  if (m) { const lng = Number(m[1] ?? m[3]), lat = Number(m[2] ?? m[4]); if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }; }
  if (!place.trim()) throw new Error('Орнын жазыңыз немесе координатаны қолмен енгізіңіз');
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=kk,ru,en&q=' + encodeURIComponent(place.trim()));
  if (!r.ok) throw new Error('Іздеу қызметі жауап бермеді');
  const j = (await r.json()) as { lat: string; lon: string }[];
  if (!j.length) throw new Error('Бұл орын табылмады. Координатаны қолмен енгізіңіз');
  return { lat: Number(j[0].lat), lng: Number(j[0].lon) };
}

export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** Registration is open for applications: published, switched on, deadline not passed. */
export const regOpen = (c: Contest) => c.status === 'published' && c.reg_open && (!c.reg_deadline || c.reg_deadline >= todayIso()) && (!c.reg_from || c.reg_from <= todayIso());
/** Levels to show/filter: the contest's own, or the ones its stages carry (a contest with stages has no overall level). */
export const levelsOf = (c: Contest, st: Stage[]): string[] => (c.level ? [c.level] : [...new Set(st.map(s => s.level).filter((x): x is string => !!x))]);
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
  reg_open: true, reg_from: null, reg_deadline: null, needs_approval: true,
  location: null, map_url: null, lat: null, lng: null, is_online: false, age_min: null, age_max: null, team_size: null, fee_text: null, travel_text: null, toolset: null, cover_url: null, icon: null, ...o,
});
const stg = (contest_id: string, rows: [string, string | null, string?, string?][]): Stage[] =>
  rows.map((r, i) => ({ id: `${contest_id}-s${i}`, contest_id, pos: i, name: r[0], on_date: r[1], format: r[2] ?? null, advance: r[3] ?? null, level: null, location: null }));
const ym = (add: number, day: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + add); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; };
let demo: Data | null = null;
const seed = (): Data => ({
  contests: [
    mk('d1', { title: 'KBO [мысал]', field: 'informatics', level: 'republic', organizer: 'Мысал ұйымдастырушы', url: 'https://example.com/kbo', description: 'Үлгі ретінде қосылған сайыс. Күндері нақты кестеге сай емес.', starts_on: ym(0, 20), ends_on: ym(2, 10), grades: [7, 8, 9], reg_deadline: ym(0, 28) }),
    mk('d2', { title: 'FIRST LEGO League [мысал]', field: 'robotics', level: null, icon: '🤖', organizer: 'Мысал ұйымдастырушы', starts_on: ym(1, 12), ends_on: ym(4, 5), grades: [5, 6, 7, 8], location: 'Қостанай [мысал]', map_url: 'https://2gis.kz', lat: 53.2144, lng: 63.6246, team_size: '2–10', toolset: 'LEGO SPIKE, EV3', fee_text: '0 ₸ [мысал]', age_min: 10, age_max: 16, reg_from: ym(0, 1) }),
    mk('d3', { title: 'Қалалық олимпиада [мысал]', field: 'informatics', level: 'city', location: 'Қостанай [мысал]', lat: 53.2, lng: 63.65, starts_on: ym(1, 3), ends_on: ym(1, 3), grades: [9, 10, 11] }),
    mk('d4', { title: 'Мектепішілік кодтау жарысы [мысал]', kind: 'own', format: 'coding', field: 'informatics', level: 'school', starts_on: ym(0, 25), ends_on: ym(0, 25), grades: [8, 9, 10], status: 'published', rules_text: '1. Жарыс 40 минут.\n2. Тек Python.\n3. Көшіруге болмайды.', rules_version: 1, rules_locked: true }),
    mk('d5', { title: 'Мұғалімдерге: әдістемелік конкурс [мысал]', field: 'teachers', level: 'region', teacher_only: true, starts_on: ym(2, 15), ends_on: ym(2, 15) }),
    mk('d6', { title: 'Жоба: мектеп турнирі [мысал]', kind: 'own', format: 'tournament', status: 'draft', starts_on: ym(3, 1), ends_on: ym(3, 1) }),
  ],
  stages: [
    ...stg('d1', [['KBO1', ym(0, 20), 'Онлайн'], ['KBO2', ym(1, 14), 'Онлайн', 'Алғашқы 30 %'], ['KBO3', ym(2, 10), 'Қатысып']]),
    ...stg('d2', [['Қалалық', ym(1, 12)], ['Облыстық', ym(2, 20)], ['Республикалық', ym(3, 25)], ['Халықаралық', ym(4, 5)]]).map((x, i) => ({ ...x, level: ['city', 'region', 'republic', 'international'][i], location: ['Қостанай [мысал]', null, 'Астана [мысал]', null][i] })),
    ...stg('d4', [['Іріктеу', ym(0, 25), 'Онлайн, ClassFlow', 'Алғашқы 5']]),
  ],
  categories: [
    { id: 'd2-c0', contest_id: 'd2', pos: 0, name: 'Robot Game [мысал]', rules_url: 'https://example.com/rg', rules_text: '1. Робот 2 минут 30 секунд ойнайды.\n2. Командада 2–10 бала.', grades: [5, 6, 7, 8] },
    { id: 'd2-c1', contest_id: 'd2', pos: 1, name: 'Innovation Project [мысал]', rules_url: null, rules_text: 'Жоба 5 минут қорғалады.', grades: [6, 7, 8] },
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
  const [c, s, t, v, a, p, k, g] = await Promise.all([
    sb.from('cf_contests').select('*').order('starts_on', { ascending: true, nullsFirst: false }),
    sb.from('cf_contest_stages').select('*').order('pos'),
    sb.from('cf_contest_teachers').select('contest_id,teacher_id'),
    sb.from('cf_contest_saves').select('contest_id').eq('user_id', me.id),
    sb.from('cf_contest_apps').select('*').order('created_at', { ascending: false }),
    sb.from('profiles').select('id,full_name,class_id,role').is('removed_at', null),
    sb.from('classes').select('id,name'),
    sb.from('cf_contest_categories').select('*').order('pos')]);
  for (const r of [c, s, t, v, a, p, k, g]) fail(r.error);
  const cls = new Map((k.data as { id: string; name: string }[]).map(x => [x.id, x.name]));
  const people: Record<string, Person> = {};
  for (const x of p.data as { id: string; full_name: string; class_id: string | null; role: string }[])
    people[x.id] = { id: x.id, full_name: x.full_name, class_name: (x.class_id && cls.get(x.class_id)) || '', staff: x.role !== 'student' };
  return { contests: c.data as Contest[], stages: s.data as Stage[], categories: g.data as Category[], teachers: t.data as Data['teachers'], saves: (v.data as { contest_id: string }[]).map(x => x.contest_id), apps: a.data as App[], people };
}

// ---------- write ----------
export const emptyForm = (me: Me, kind: 'own' | 'external' = 'external'): Form => ({
  title: '', kind, format: kind === 'own' ? 'quiz' : '', field: 'general', level: 'school', organizer: '', url: '', description: '', starts_on: '', ends_on: '', grades: [],
  teacher_only: false, rules_text: '', rules_locked: false, status: 'draft', reg_open: true, reg_from: '', reg_deadline: '', needs_approval: true, stages: [], categories: [], teacher_ids: [me.id],
  location: '', map_url: '', lat: '', lng: '', is_online: false, age_min: '', age_max: '', team_size: '', fee_text: '', travel_text: '', toolset: '', cover_url: '', icon: '',
});
export const formOf = (d: Data, id: string): Form | undefined => {
  const c = d.contests.find(x => x.id === id);
  if (!c) return;
  return {
    id: c.id, title: c.title, kind: c.kind, format: c.format ?? '', field: c.field, level: c.level ?? '', organizer: c.organizer ?? '', url: c.url ?? '', description: c.description ?? '',
    starts_on: c.starts_on ?? '', ends_on: c.ends_on ?? '', grades: c.grades, teacher_only: c.teacher_only, rules_text: c.rules_text, rules_locked: c.rules_locked, status: c.status,
    reg_open: c.reg_open, reg_from: c.reg_from ?? '', reg_deadline: c.reg_deadline ?? '', needs_approval: c.needs_approval,
    location: c.location ?? '', map_url: c.map_url ?? '', lat: c.lat == null ? '' : String(c.lat), lng: c.lng == null ? '' : String(c.lng), is_online: c.is_online, age_min: c.age_min == null ? '' : String(c.age_min), age_max: c.age_max == null ? '' : String(c.age_max),
    team_size: c.team_size ?? '', fee_text: c.fee_text ?? '', travel_text: c.travel_text ?? '', toolset: c.toolset ?? '', cover_url: c.cover_url ?? '', icon: c.icon ?? '',
    categories: d.categories.filter(x => x.contest_id === id).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0)),
    stages: d.stages.filter(s => s.contest_id === id).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0)), teacher_ids: d.teachers.filter(t => t.contest_id === id).map(t => t.teacher_id),
  };
};
export function validate(f: Form, publish: boolean): string {
  if (!f.title.trim()) return 'Сайыстың атауын жазыңыз';
  if (f.starts_on && f.ends_on && f.ends_on < f.starts_on) return 'Аяқталу күні басталу күнінен бұрын болмауы керек';
  if (f.url.trim() && !/^https?:\/\//i.test(f.url.trim())) return 'Сілтеме http:// немесе https:// деп басталуы керек';
  for (const [u, n] of [[f.map_url, '2GIS сілтемесі'], [f.cover_url, 'Мұқаба сілтемесі']] as const) if (u.trim() && !/^https:\/\//i.test(u.trim())) return `${n} https:// деп басталуы керек`;
  if (f.categories.some(c => c.rules_url?.trim() && !/^https?:\/\//i.test(c.rules_url.trim()))) return 'Санат ережесінің сілтемесі http:// немесе https:// деп басталуы керек';
  if (!f.field.trim()) return 'Саланы таңдаңыз немесе жазыңыз';
  if (f.field.trim().length > 60) return 'Сала атауы 60 таңбадан аспауы керек';
  if (!!f.lat.trim() !== !!f.lng.trim()) return 'Координата: ендік пен бойлықты бірге жазыңыз';
  if (f.lat.trim() && (!(Math.abs(Number(f.lat)) <= 90) || !(Math.abs(Number(f.lng)) <= 180))) return 'Координата қате (ендік −90…90, бойлық −180…180)';
  if (f.age_min && f.age_max && Number(f.age_max) < Number(f.age_min)) return 'Жасы: ең үлкені ең кішісінен кіші болмауы керек';
  if (f.reg_from && f.reg_deadline && f.reg_deadline < f.reg_from) return 'Тіркеу мерзімі басталу күнінен бұрын болмауы керек';
  if (f.stages.some(s => !s.name.trim())) return 'Әр кезеңнің атауын жазыңыз';
  if (f.categories.some(c => !c.name.trim())) return 'Әр санаттың атауын жазыңыз';
  if (publish && f.kind === 'own' && !f.rules_locked) return 'Алдымен ережені бекітіңіз';
  if (publish && !f.teacher_only && !f.teacher_ids.length) return 'Кемінде бір жауапты мұғалімді таңдаңыз';
  return '';
}

/** Saves the form; returns the contest id. `publish` true/false sets the status, undefined keeps it. */
export async function saveContest(me: Me, f: Form, opts: { lock?: boolean; publish?: boolean } = {}): Promise<string> {
  const err = validate(f, !!opts.publish); if (err) throw new Error(err);
  const lock = f.rules_locked || !!opts.lock;
  const row = {
    title: f.title.trim(), kind: f.kind, format: f.kind === 'own' ? f.format || 'quiz' : null, field: f.field.trim(), level: f.stages.length ? null : f.level || null, organizer: blank(f.organizer), url: blank(f.url),
    description: blank(f.description), starts_on: f.starts_on || null, ends_on: f.ends_on || f.starts_on || null, grades: f.grades, teacher_only: f.teacher_only,
    rules_text: f.rules_text, reg_open: f.reg_open, reg_from: f.reg_from || null, reg_deadline: f.reg_deadline || null, needs_approval: f.needs_approval,
    location: blank(f.location), map_url: blank(f.map_url), lat: f.lat.trim() ? Number(f.lat) : null, lng: f.lng.trim() ? Number(f.lng) : null, is_online: f.is_online, age_min: f.age_min ? Number(f.age_min) : null, age_max: f.age_max ? Number(f.age_max) : null,
    team_size: blank(f.team_size), fee_text: blank(f.fee_text), travel_text: blank(f.travel_text), toolset: blank(f.toolset), cover_url: blank(f.cover_url), icon: blank(f.icon),
  };
  const status = opts.publish === true ? 'published' : opts.publish === false ? 'draft' : f.status;
  const stages = f.stages.map((s, i) => ({ pos: i, name: s.name.trim(), on_date: s.on_date || null, format: blank(s.format ?? ''), advance: blank(s.advance ?? ''), level: s.level || null, location: blank(s.location ?? '') }));
  const cats = f.categories.map((c, i) => ({ id: c.id, pos: i, name: c.name.trim(), rules_url: blank(c.rules_url ?? ''), rules_text: c.rules_text, grades: c.grades }));
  const teacher_ids = f.teacher_only && !f.teacher_ids.length ? [me.id] : f.teacher_ids;
  if (DEMO) {
    const d = D(); const id = f.id ?? 'dc' + Date.now();
    const old = d.contests.find(c => c.id === id);
    const locked = lock || !!old?.rules_locked;
    const catKey = (cs: { id?: string; name: string; rules_url: string | null; rules_text: string }[]) => JSON.stringify(cs.map(c => [c.id ?? c.name, c.rules_url, c.rules_text]));
    const catsChanged = catKey(d.categories.filter(c => c.contest_id === id)) !== catKey(cats);
    const version = locked ? (old?.rules_locked ? old.rules_version + (old.rules_text !== row.rules_text || catsChanged ? 1 : 0) : 1) : 0;
    const next = mk(id, { ...row, author_id: old?.author_id ?? me.id, rules_locked: locked, rules_version: version, status: locked && status === 'draft' ? 'rules_locked' : status });
    d.contests = old ? d.contests.map(c => (c.id === id ? next : c)) : [...d.contests, next];
    d.stages = [...d.stages.filter(s => s.contest_id !== id), ...stages.map((s, i) => ({ ...s, id: `${id}-s${i}`, contest_id: id }))];
    d.categories = [...d.categories.filter(c => c.contest_id !== id), ...cats.map((c, i) => ({ ...c, id: c.id ?? `${id}-c${Date.now()}${i}`, contest_id: id }))];
    d.teachers = [...d.teachers.filter(t => t.contest_id !== id), ...teacher_ids.map(t => ({ contest_id: id, teacher_id: t }))];
    return id;
  }
  let id = f.id;
  if (!id) {
    const { data, error } = await sb.from('cf_contests').insert({ ...row, school_id: me.school_id, author_id: me.id }).select('id').single();
    fail(error); id = (data as { id: string }).id;
  }
  // categories first: on a first lock the version must stay 1; on a locked contest a changed category rule opens a new version (once)
  fail((await sb.rpc('cf_contest_set_categories', { p_contest: id, p_rows: cats })).error);
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

export async function apply(me: Me, c: Contest, teacher_id: string, message: string, category_id = ''): Promise<void> {
  if (DEMO) {
    const d = D();
    if (d.categories.some(x => x.contest_id === c.id) && !d.categories.some(x => x.id === category_id && x.contest_id === c.id)) throw new Error('Санатты таңдаңыз');
    if (d.apps.some(a => a.contest_id === c.id && a.student_id === me.id && a.status !== 'rejected')) throw new Error('Өтінім бұрын жіберілген');
    d.apps = [{ id: 'da' + Date.now(), contest_id: c.id, student_id: me.id, teacher_id, message: message.slice(0, 500), status: c.needs_approval ? 'pending' : 'approved', rules_version: c.rules_version, created_at: new Date().toISOString(), category_id: category_id || null }, ...d.apps.filter(a => !(a.contest_id === c.id && a.student_id === me.id))];
    return;
  }
  fail((await sb.rpc('cf_contest_apply', { p_contest: c.id, p_teacher: teacher_id, p_message: message, p_category: category_id || null })).error);
}

export async function decide(id: string, status: 'approved' | 'rejected'): Promise<void> {
  if (DEMO) { const d = D(); d.apps = d.apps.map(a => (a.id === id ? { ...a, status } : a)); return; }
  fail((await sb.rpc('cf_contest_decide', { p_app: id, p_status: status })).error);
}
