import { sb, DEMO } from '../config';

// Rows live in cf_rooms / cf_room_items / cf_room_requests / cf_room_request_items (supabase/053_rooms.sql). Requests are written only through
// the RPCs cf_room_request and cf_room_set (they check the manager, the stock and notify). In ?demo the same API runs on in-memory data.
// shortcut: laptops are counted, not tracked one by one; free stock for a slot is checked when a manager approves, not shown while booking.

export interface Me { id: string; full_name?: string; role?: string; school_id?: string }
export type ElType = 'desk' | 'pc' | 'table' | 'shelf' | 'board' | 'door' | 'window' | 'printer' | 'other';
export interface El { id: string; t: ElType; x: number; y: number; w: number; h: number; z?: number; label?: string; item_id?: string }
/** Floor plan on a grid of w x h cells; x, y, w, h of an element are in cells. */
/** w,h in grid cells; cm = real size of one cell (default 50); El.z = height in cm (default by type). */
export interface Layout { w: number; h: number; cm?: number; els: El[] }
export const EL_TYPES: Record<ElType, { name: string; hue: number; w: number; h: number; z: number }> = {
  desk: { name: 'Парта', hue: 35, w: 2, h: 1, z: 75 }, pc: { name: 'Компьютер', hue: 215, w: 1, h: 1, z: 110 }, table: { name: 'Үстел', hue: 28, w: 4, h: 2, z: 75 }, shelf: { name: 'Сөре / шкаф', hue: 150, w: 3, h: 1, z: 180 },
  board: { name: 'Тақта', hue: 255, w: 5, h: 1, z: 120 }, door: { name: 'Есік', hue: 8, w: 1, h: 1, z: 200 }, window: { name: 'Терезе', hue: 195, w: 3, h: 1, z: 130 }, printer: { name: '3D-принтер', hue: 285, w: 2, h: 2, z: 60 }, other: { name: 'Басқа', hue: 220, w: 2, h: 2, z: 75 },
};
export const CELLS_CM = [25, 50, 100] as const;
export const cmOf = (l: Layout) => l.cm ?? 50;
export const zOf = (e: El) => e.z ?? EL_TYPES[e.t].z;
export const blankLayout = (): Layout => ({ w: 20, h: 12, cm: 50, els: [] });
export function validateLayout(l: Layout | null): string {
  if (!l) return '';
  if (!Number.isInteger(l.w) || !Number.isInteger(l.h) || l.w < 6 || l.w > 40 || l.h < 6 || l.h > 30) return 'Схема өлшемі: ені 6–40, ұзындығы 6–30 тор';
  if (l.cm !== undefined && !(CELLS_CM as readonly number[]).includes(l.cm)) return 'Тор өлшемі 25, 50 немесе 100 см болсын';
  if (l.els.length > 300) return 'Схемада 300-ден артық зат болмасын';
  for (const e of l.els) {
    if (!(e.t in EL_TYPES) || ![e.x, e.y, e.w, e.h].every(Number.isInteger) || e.w < 1 || e.h < 1 || e.x < 0 || e.y < 0 || e.x + e.w > l.w || e.y + e.h > l.h) return 'Схемадағы бір зат тордан тыс тұр';
    if (e.z !== undefined && (!Number.isInteger(e.z) || e.z < 10 || e.z > 400)) return 'Заттың биіктігі 10–400 см болсын';
    if ((e.label ?? '').length > 40) return 'Схемадағы жазу 40 таңбадан аспасын';
  }
  return '';
}
export interface Room { id: string; name: string; description: string | null; responsible_id: string | null; layout: Layout | null }
export const CUR = { KZT: '₸', USD: '$', EUR: '€', RUB: '₽', CNY: '¥' } as const;
export type Cur = keyof typeof CUR;
export const money = (n: number, c: Cur) => `${(Math.round(n * 100) / 100).toLocaleString('ru-RU')} ${CUR[c]}`;
export interface Item { id: string; room_id: string; name: string; qty: number; kind: 'equipment' | 'laptop'; note: string | null; inv_no: string | null; acquired_year: number | null; price: number | null; currency: Cur; photo_url: string | null; broken: number; defect: string | null }
export interface Loan { id: string; item_id: string; qty: number; borrower_id: string | null; borrower_name: string | null; purpose: string; given_on: string; due_on: string | null; returned_on: string | null }
export type WishStatus = 'planned' | 'ordered' | 'received' | 'rejected';
export interface Wish { id: string; room_id: string | null; name: string; description: string | null; price: number; currency: Cur; qty: number; delivery: number; priority: number; link: string | null; photo_url: string | null; note: string | null; status: WishStatus }
export const WISH_STATUS: Record<WishStatus, string> = { planned: 'Жоспарда', ordered: 'Тапсырыс берілді', received: 'Алынды', rejected: 'Бас тартылды' };
export type ReqStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'cancelled';
export interface Req { id: string; room_id: string; requester_id: string; on_date: string; start_time: string; end_time: string; purpose: string; status: ReqStatus }
export interface ReqItem { request_id: string; item_id: string; qty: number }
export interface Data { rooms: Room[]; items: Item[]; reqs: Req[]; reqItems: ReqItem[]; people: Record<string, string>; loans: Loan[]; wishes: Wish[] }
export interface ItemForm { id?: string; name: string; qty: string; kind: 'equipment' | 'laptop'; note: string; inv_no: string; year: string; price: string; currency: Cur; photo_url: string; broken: string; defect: string }
export const blankItem = (): ItemForm => ({ name: '', qty: '1', kind: 'equipment', note: '', inv_no: '', year: '', price: '', currency: 'KZT', photo_url: '', broken: '0', defect: '' });
export interface WishForm { id?: string; name: string; description: string; price: string; currency: Cur; qty: string; delivery: string; priority: string; link: string; photo_url: string; note: string; status: WishStatus; room_id: string }
export const blankWish = (): WishForm => ({ name: '', description: '', price: '', currency: 'KZT', qty: '1', delivery: '', priority: '2', link: '', photo_url: '', note: '', status: 'planned', room_id: '' });
/** Items on hand = qty - broken - on loan. */
export const onLoan = (d: Data, itemId: string) => d.loans.filter(l => l.item_id === itemId && !l.returned_on).reduce((a, l) => a + l.qty, 0);
export const freeQty = (d: Data, i: Item) => Math.max(0, i.qty - i.broken - onLoan(d, i.id));
export const wishCost = (w: Pick<Wish, 'price' | 'qty' | 'delivery'>) => w.price * w.qty + w.delivery;
/** Sum per currency (no conversion between currencies). */
export function sumBy<T>(rows: T[], cur: (x: T) => Cur, val: (x: T) => number): Partial<Record<Cur, number>> {
  const o: Partial<Record<Cur, number>> = {}; for (const r of rows) o[cur(r)] = (o[cur(r)] ?? 0) + val(r); return o;
}
export const moneyMap = (m: Partial<Record<Cur, number>>) => { const e = Object.entries(m) as [Cur, number][]; return e.length ? e.map(([c, v]) => money(v, c)).join(' + ') : '—'; };
export interface RoomForm { id?: string; name: string; description: string; items: ItemForm[]; layout: Layout | null }

export const STATUS_NAMES: Record<ReqStatus, string> = { pending: 'Күтуде', approved: 'Расталды', rejected: 'Қабылданбады', returned: 'Қайтарылды', cancelled: 'Бас тартылды' };
export const KIND_NAMES = { equipment: 'Жабдық', laptop: 'Ноутбук' } as const;
export const isAdmin = (me: Me) => me.role === 'deputy' || me.role === 'admin';
export const manages = (me: Me, r: Room) => isAdmin(me) || r.responsible_id === me.id;
export const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
const hm = (t: string) => t.slice(0, 5);

// ---------- demo data ----------
const mkDemo = (): Data => {
  const d = todayIso();
  return {
    rooms: [{ id: 'r1', name: 'Информатика кабинеті [мысал]', description: '24 орынды компьютер сыныбы', responsible_id: 't1', layout: { w: 16, h: 10, els: [
      { id: 'a1', t: 'board', x: 5, y: 0, w: 6, h: 1, label: 'Тақта' }, { id: 'a2', t: 'door', x: 0, y: 8, w: 1, h: 2, label: 'Есік' }, { id: 'a3', t: 'window', x: 15, y: 3, w: 1, h: 4, label: 'Терезе' },
      ...[0, 1, 2].flatMap(r => [0, 1, 2].map(c => ({ id: `p${r}${c}`, t: 'pc' as const, x: 3 + c * 4, y: 3 + r * 2, w: 2, h: 1, label: `ПК ${r * 3 + c + 1}`, ...(r === 0 && c === 0 ? { item_id: 'i1' } : {}) }))),
      { id: 'a4', t: 'shelf', x: 1, y: 3, w: 1, h: 3, label: 'Шкаф' }, { id: 'a5', t: 'desk', x: 6, y: 8, w: 4, h: 1, label: 'Мұғалім үстелі', item_id: 'i2' }] } }, { id: 'r2', name: 'STEM зертханасы [мысал]', description: 'Робототехника және 3D-принтер', responsible_id: 't2', layout: null }],
    items: [
      { id: 'i1', room_id: 'r1', name: 'Ноутбук', qty: 12, kind: 'laptop', note: null, inv_no: 'ИН-0101…0112', acquired_year: 2024, price: 280000, currency: 'KZT', photo_url: null, broken: 1, defect: '№7: экраны жарықсыз' },
      { id: 'i2', room_id: 'r1', name: 'Проектор', qty: 1, kind: 'equipment', note: 'Төбеде', inv_no: 'ИН-0150', acquired_year: 2021, price: 190000, currency: 'KZT', photo_url: null, broken: 0, defect: null },
      { id: 'i3', room_id: 'r2', name: 'LEGO SPIKE жинағы', qty: 8, kind: 'equipment', note: null, inv_no: 'ИН-0201…0208', acquired_year: 2025, price: 328607, currency: 'KZT', photo_url: null, broken: 0, defect: null },
      { id: 'i4', room_id: 'r2', name: '3D-принтер', qty: 2, kind: 'equipment', note: 'PLA пластик', inv_no: 'ИН-0230', acquired_year: 2023, price: 450, currency: 'USD', photo_url: null, broken: 1, defect: 'Қыздыру үстелі істемейді' },
    ],
    loans: [
      { id: 'l1', item_id: 'i1', qty: 3, borrower_id: 't2', borrower_name: null, purpose: 'Олимпиада дайындығы', given_on: d, due_on: d, returned_on: null },
      { id: 'l2', item_id: 'i3', qty: 2, borrower_id: null, borrower_name: '8A сыныбы, Дана С.', purpose: 'Робототехника үйірмесі', given_on: '2026-10-02', due_on: '2026-10-09', returned_on: '2026-10-08' },
    ],
    wishes: [
      { id: 'w1', room_id: 'r2', name: 'BambuLab P2S Combo', description: '3D-принтер', price: 559990, currency: 'KZT', qty: 1, delivery: 0, priority: 1, link: null, photo_url: null, note: null, status: 'planned' },
      { id: 'w2', room_id: 'r2', name: 'LEGO® Education SPIKE™ Prime', description: null, price: 328607, currency: 'KZT', qty: 4, delivery: 0, priority: 1, link: null, photo_url: null, note: null, status: 'planned' },
      { id: 'w3', room_id: 'r2', name: 'VEX V5 Classroom Starter Kit', description: 'VEX KIT', price: 1100, currency: 'USD', qty: 1, delivery: 120, priority: 2, link: null, photo_url: null, note: 'Бағасы дәлелденбеген', status: 'ordered' },
    ],
    reqs: [{ id: 'q1', room_id: 'r1', requester_id: 't2', on_date: d, start_time: '14:00', end_time: '15:30', purpose: 'Олимпиадаға дайындық', status: 'pending' }],
    reqItems: [{ request_id: 'q1', item_id: 'i1', qty: 6 }],
    people: { t1: 'Бағдәулет Е.', t2: 'Әсел М. [мысал]' },
  };
};
let demo: Data | null = null;
const D = () => (demo ||= mkDemo());
let n = 0;

// ---------- read ----------
export async function loadAll(me: Me): Promise<Data> {
  if (DEMO) return structuredClone(D());
  const [r, i, q, qi, p, lo, wi] = await Promise.all([
    sb.from('cf_rooms').select('id,name,description,responsible_id,layout').order('name'),
    sb.from('cf_room_items').select('*').order('name'),
    sb.from('cf_room_requests').select('*').order('on_date', { ascending: false }),
    sb.from('cf_room_request_items').select('*'),
    sb.from('profiles').select('id,full_name').is('removed_at', null),
    sb.from('cf_room_loans').select('*').order('given_on', { ascending: false }),
    sb.from('cf_room_wishlist').select('*').order('priority').order('created_at')]);
  for (const x of [r, i, q, qi, p, lo, wi]) fail(x.error);
  const reqs = (q.data as Req[]).map(x => ({ ...x, start_time: hm(x.start_time), end_time: hm(x.end_time) }));
  return { rooms: r.data as Room[], items: i.data as Item[], loans: lo.data as Loan[], wishes: wi.data as Wish[], reqs, reqItems: qi.data as ReqItem[], people: Object.fromEntries((p.data as { id: string; full_name: string }[]).map(x => [x.id, x.full_name])) };
}

// ---------- room + items ----------
export const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.').replace(/\s/g, '')));
const CURS = Object.keys(CUR);
export function validateRoom(f: RoomForm): string {
  if (!f.name.trim() || f.name.trim().length > 80) return 'Кабинет атауы 1–80 таңба болсын';
  if (f.description.length > 500) return 'Сипаттама 500 таңбадан аспасын';
  const lb = validateLayout(f.layout); if (lb) return lb;
  for (const it of f.items) {
    const n = `«${it.name || 'жабдық'}»`;
    if (!it.name.trim() || it.name.trim().length > 80) return 'Әр жабдықтың атауы 1–80 таңба болсын';
    const q = Number(it.qty), b = Number(it.broken || 0), y = num(it.year), pr = num(it.price);
    if (!Number.isInteger(q) || q < 0 || q > 1000) return `${n}: саны 0–1000 бүтін сан болсын`;
    if (!Number.isInteger(b) || b < 0 || b > q) return `${n}: ақаулы саны 0-ден жалпы саннан аспайтын бүтін сан болсын`;
    if (y !== null && (!Number.isInteger(y) || y < 1990 || y > 2100)) return `${n}: алынған жыл 1990–2100 болсын`;
    if (pr !== null && (!Number.isFinite(pr) || pr < 0)) return `${n}: баға теріс емес сан болсын`;
    if (!CURS.includes(it.currency)) return `${n}: валюта қате`;
    if (it.note.length > 200 || it.defect.length > 300 || it.inv_no.length > 60) return `${n}: мәтін тым ұзын`;
  }
  return '';
}
const itemRow = (x: ItemForm) => ({ name: x.name.trim(), qty: Number(x.qty), kind: x.kind, note: x.note.trim() || null, inv_no: x.inv_no.trim() || null, acquired_year: num(x.year), price: num(x.price), currency: x.currency,
  photo_url: x.photo_url || null, broken: Number(x.broken || 0), defect: x.defect.trim() || null });

export async function saveRoom(me: Me, f: RoomForm): Promise<string> {
  const bad = validateRoom(f); if (bad) throw new Error(bad);
  const row = { name: f.name.trim(), description: f.description.trim() || null, layout: f.layout && f.layout.els.length ? f.layout : null };
  const items = f.items.map(itemRow);
  if (DEMO) {
    const d = D(); const id = f.id ?? `r${++n}-${Date.now()}`;
    if (f.id) d.rooms = d.rooms.map(r => (r.id === id ? { ...r, ...row } : r)); else d.rooms.push({ id, ...row, responsible_id: me.id });
    const keep = new Set(f.items.map(x => x.id).filter(Boolean));
    d.items = [...d.items.filter(x => x.room_id !== id || keep.has(x.id)).map(x => { const k = f.items.findIndex(y => y.id === x.id); return k >= 0 ? { ...x, ...items[k] } : x; }),
      ...f.items.map((x, k) => ({ x, k })).filter(o => !o.x.id).map(o => ({ id: `i${++n}-${o.k}`, room_id: id, ...items[o.k] }))];
    return id;
  }
  let id = f.id;
  if (id) fail((await sb.from('cf_rooms').update(row).eq('id', id)).error);
  else { const r = await sb.from('cf_rooms').insert({ ...row, school_id: me.school_id, responsible_id: me.id }).select('id').single(); fail(r.error); id = (r.data as { id: string }).id; }
  const have = ((await sb.from('cf_room_items').select('id').eq('room_id', id)).data ?? []).map((x: { id: string }) => x.id);
  const keep = f.items.map(x => x.id).filter((x): x is string => !!x);
  const gone = have.filter((x: string) => !keep.includes(x));
  if (gone.length) fail((await sb.from('cf_room_items').delete().in('id', gone)).error);
  for (let i = 0; i < f.items.length; i++) {
    const it = f.items[i];
    if (it.id) fail((await sb.from('cf_room_items').update(items[i]).eq('id', it.id)).error);
    else fail((await sb.from('cf_room_items').insert({ ...items[i], room_id: id })).error);
  }
  return id as string;
}

export async function deleteRoom(id: string) {
  if (DEMO) { const d = D(); if (d.reqs.some(r => r.room_id === id)) throw new Error('Брондауы бар кабинетті өшіруге болмайды'); d.rooms = d.rooms.filter(r => r.id !== id); d.items = d.items.filter(i => i.room_id !== id); return; }
  const r = await sb.from('cf_rooms').delete().eq('id', id).select('id'); fail(r.error);
  if (!r.data?.length) throw new Error('Өшіру мүмкін емес: брондауы бар немесе рұқсат жоқ');
}

// ---------- requests ----------
export function validateRequest(date: string, start: string, end: string, picks: { qty: number }[]): string {
  if (!date || date < todayIso()) return 'Өткен күнге бронь жасалмайды';
  if (!start || !end || end <= start) return 'Аяқталу уақыты басталудан кейін болсын';
  if (picks.some(p => !Number.isInteger(p.qty) || p.qty < 1)) return 'Жабдық саны 1-ден кем болмасын';
  return '';
}

/** Returns 'approved' when a manager booked their own room (approved at once), else 'pending'. */
export async function request(me: Me, room: Room, date: string, start: string, end: string, purpose: string, picks: { item_id: string; qty: number }[]): Promise<'approved' | 'pending'> {
  const bad = validateRequest(date, start, end, picks); if (bad) throw new Error(bad);
  const auto = manages(me, room);
  if (DEMO) {
    const d = D(); const id = `q${++n}-${Date.now()}`;
    d.reqs.unshift({ id, room_id: room.id, requester_id: me.id, on_date: date, start_time: start, end_time: end, purpose: purpose.slice(0, 300), status: auto ? 'approved' : 'pending' });
    d.reqItems.push(...picks.map(p => ({ request_id: id, ...p }))); d.people[me.id] ||= me.full_name ?? 'Мен';
    return auto ? 'approved' : 'pending';
  }
  fail((await sb.rpc('cf_room_request', { p_room: room.id, p_date: date, p_start: start, p_end: end, p_purpose: purpose, p_items: picks })).error);
  return auto ? 'approved' : 'pending';
}

export async function setStatus(id: string, status: ReqStatus) {
  if (DEMO) { const d = D(); d.reqs = d.reqs.map(r => (r.id === id ? { ...r, status } : r)); return; }
  fail((await sb.rpc('cf_room_set', { p_id: id, p_status: status })).error);
}

// ---------- photo ----------
/** Uploads to the school's folder in the cf-media bucket (staff only, 2 MB after shrinking). Demo: a local blob URL. */
export async function uploadPhoto(me: Me, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Тек сурет файлын таңдаңыз');
  if (DEMO) return URL.createObjectURL(file);
  if (!me.school_id) throw new Error('Мектеп табылмады');
  return (await import('../lessons/media')).uploadSlideImage(file, me.school_id);
}

// ---------- loans (usage history) ----------
export async function giveLoan(me: Me, d: Data, item: Item, qty: number, borrowerId: string, name: string, purpose: string, due: string) {
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Саны 1-ден кем болмасын');
  if (!borrowerId && !name.trim()) throw new Error('Кімге беріліп жатқанын көрсетіңіз');
  if (due && due < todayIso()) throw new Error('Қайтару мерзімі өткен күн болмасын');
  if (qty > freeQty(d, item)) throw new Error(`Бос жабдық жеткіліксіз (бос ${freeQty(d, item)})`);
  if (DEMO) { D().loans.unshift({ id: `l${++n}-${Date.now()}`, item_id: item.id, qty, borrower_id: borrowerId || null, borrower_name: name.trim() || null, purpose: purpose.slice(0, 200), given_on: todayIso(), due_on: due || null, returned_on: null }); return; }
  fail((await sb.rpc('cf_loan_give', { p_item: item.id, p_qty: qty, p_borrower: borrowerId || null, p_name: name.trim() || null, p_purpose: purpose, p_due: due || null })).error);
}
export async function returnLoan(id: string) {
  if (DEMO) { D().loans = D().loans.map(l => (l.id === id ? { ...l, returned_on: todayIso() } : l)); return; }
  fail((await sb.rpc('cf_loan_return', { p_id: id })).error);
}

// ---------- wishlist (сатып алу тізімі) ----------
export function validateWish(f: WishForm): string {
  const pr = num(f.price), dl = num(f.delivery), q = Number(f.qty);
  if (!f.name.trim() || f.name.trim().length > 120) return 'Атауы 1–120 таңба болсын';
  if (pr === null || !Number.isFinite(pr) || pr < 0) return 'Бағасын (1 дана) теріс емес санмен жазыңыз';
  if (dl !== null && (!Number.isFinite(dl) || dl < 0)) return 'Доставка теріс емес сан болсын';
  if (!Number.isInteger(q) || q < 1 || q > 1000) return 'Саны 1–1000 бүтін сан болсын';
  if (!CURS.includes(f.currency)) return 'Валюта қате';
  if (f.link.trim() && !/^https?:\/\/\S+$/i.test(f.link.trim())) return 'Сілтеме http:// немесе https:// деп басталсын';
  if (f.description.length > 300 || f.note.length > 300) return 'Мәтін 300 таңбадан аспасын';
  return '';
}
export async function saveWish(me: Me, f: WishForm) {
  const bad = validateWish(f); if (bad) throw new Error(bad);
  const row = { name: f.name.trim(), description: f.description.trim() || null, price: num(f.price) as number, currency: f.currency, qty: Number(f.qty), delivery: num(f.delivery) ?? 0,
    priority: Number(f.priority), link: f.link.trim() || null, photo_url: f.photo_url || null, note: f.note.trim() || null, status: f.status, room_id: f.room_id || null };
  if (DEMO) { const d = D(); if (f.id) d.wishes = d.wishes.map(w => (w.id === f.id ? { ...w, ...row } : w)); else d.wishes.push({ id: `w${++n}-${Date.now()}`, ...row }); return; }
  if (f.id) fail((await sb.from('cf_room_wishlist').update(row).eq('id', f.id)).error);
  else fail((await sb.from('cf_room_wishlist').insert({ ...row, school_id: me.school_id, created_by: me.id })).error);
}
export async function deleteWish(id: string) {
  if (DEMO) { D().wishes = D().wishes.filter(w => w.id !== id); return; }
  const r = await sb.from('cf_room_wishlist').delete().eq('id', id).select('id'); fail(r.error);
  if (!r.data?.length) throw new Error('Өшіру мүмкін емес: рұқсат жоқ');
}
