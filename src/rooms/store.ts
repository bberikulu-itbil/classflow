import { sb, DEMO } from '../config';

// Rows live in cf_rooms / cf_room_items / cf_room_requests / cf_room_request_items (supabase/053_rooms.sql). Requests are written only through
// the RPCs cf_room_request and cf_room_set (they check the manager, the stock and notify). In ?demo the same API runs on in-memory data.
// shortcut: laptops are counted, not tracked one by one; free stock for a slot is checked when a manager approves, not shown while booking.

export interface Me { id: string; full_name?: string; role?: string; school_id?: string }
export interface Room { id: string; name: string; description: string | null; responsible_id: string | null }
export interface Item { id: string; room_id: string; name: string; qty: number; kind: 'equipment' | 'laptop'; note: string | null }
export type ReqStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'cancelled';
export interface Req { id: string; room_id: string; requester_id: string; on_date: string; start_time: string; end_time: string; purpose: string; status: ReqStatus }
export interface ReqItem { request_id: string; item_id: string; qty: number }
export interface Data { rooms: Room[]; items: Item[]; reqs: Req[]; reqItems: ReqItem[]; people: Record<string, string> }
export interface ItemForm { id?: string; name: string; qty: string; kind: 'equipment' | 'laptop'; note: string }
export interface RoomForm { id?: string; name: string; description: string; items: ItemForm[] }

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
    rooms: [{ id: 'r1', name: 'Информатика кабинеті [мысал]', description: '24 орынды компьютер сыныбы', responsible_id: 't1' }, { id: 'r2', name: 'STEM зертханасы [мысал]', description: 'Робототехника және 3D-принтер', responsible_id: 't2' }],
    items: [
      { id: 'i1', room_id: 'r1', name: 'Ноутбук', qty: 12, kind: 'laptop', note: null }, { id: 'i2', room_id: 'r1', name: 'Проектор', qty: 1, kind: 'equipment', note: 'Төбеде' },
      { id: 'i3', room_id: 'r2', name: 'LEGO SPIKE жинағы', qty: 8, kind: 'equipment', note: null }, { id: 'i4', room_id: 'r2', name: '3D-принтер', qty: 2, kind: 'equipment', note: 'PLA пластик' },
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
  const [r, i, q, qi, p] = await Promise.all([
    sb.from('cf_rooms').select('id,name,description,responsible_id').order('name'),
    sb.from('cf_room_items').select('*').order('name'),
    sb.from('cf_room_requests').select('*').order('on_date', { ascending: false }),
    sb.from('cf_room_request_items').select('*'),
    sb.from('profiles').select('id,full_name').is('removed_at', null)]);
  for (const x of [r, i, q, qi, p]) fail(x.error);
  const reqs = (q.data as Req[]).map(x => ({ ...x, start_time: hm(x.start_time), end_time: hm(x.end_time) }));
  return { rooms: r.data as Room[], items: i.data as Item[], reqs, reqItems: qi.data as ReqItem[], people: Object.fromEntries((p.data as { id: string; full_name: string }[]).map(x => [x.id, x.full_name])) };
}

// ---------- room + items ----------
export function validateRoom(f: RoomForm): string {
  if (!f.name.trim() || f.name.trim().length > 80) return 'Кабинет атауы 1–80 таңба болсын';
  if (f.description.length > 500) return 'Сипаттама 500 таңбадан аспасын';
  for (const it of f.items) {
    if (!it.name.trim() || it.name.trim().length > 80) return 'Әр жабдықтың атауы 1–80 таңба болсын';
    const q = Number(it.qty);
    if (!Number.isInteger(q) || q < 0 || q > 1000) return `«${it.name}»: саны 0–1000 бүтін сан болсын`;
    if (it.note.length > 200) return `«${it.name}»: ескертпе 200 таңбадан аспасын`;
  }
  return '';
}

export async function saveRoom(me: Me, f: RoomForm): Promise<string> {
  const bad = validateRoom(f); if (bad) throw new Error(bad);
  const row = { name: f.name.trim(), description: f.description.trim() || null };
  const items = f.items.map(x => ({ name: x.name.trim(), qty: Number(x.qty), kind: x.kind, note: x.note.trim() || null }));
  if (DEMO) {
    const d = D(); const id = f.id ?? `r${++n}-${Date.now()}`;
    if (f.id) d.rooms = d.rooms.map(r => (r.id === id ? { ...r, ...row } : r)); else d.rooms.push({ id, ...row, responsible_id: me.id });
    const keep = new Set(f.items.map(x => x.id).filter(Boolean));
    d.items = [...d.items.filter(x => x.room_id !== id || keep.has(x.id)).map(x => { const m = f.items.find(y => y.id === x.id); return m ? { ...x, name: m.name.trim(), qty: Number(m.qty), kind: m.kind, note: m.note.trim() || null } : x; }),
      ...f.items.filter(x => !x.id).map((x, i) => ({ id: `i${++n}-${i}`, room_id: id, name: x.name.trim(), qty: Number(x.qty), kind: x.kind, note: x.note.trim() || null }))];
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
