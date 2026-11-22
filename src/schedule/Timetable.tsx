import React, { useState } from 'react';
import { Bell as BellIcon, Clock, MapPin, Play, Plus, Trash2, X } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Button, Card, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { loadClasses } from '../journal/store';
import { loadCurr, type Curr } from '../curriculum/store';
import { createSession } from '../views/session';
import { getPrefs } from '../prefs';
import { DAY } from './plan';
import * as tt from './ttStore';
import type { Bell, Me, TT } from './ttStore';

interface Ctx {
  bells: Bell[]; bellsSaved: boolean; entries: TT[]; classes: { id: string; name: string }[]; rooms: { id: string; name: string }[];
  curr: Curr; taught: Map<string, Set<string>>; people: Record<string, string>;
}
async function loadCtx(me: Me, filter: { owner?: string; room?: string }): Promise<Ctx> {
  const [b, entries, classes, rooms, curr, taught] = await Promise.all([
    tt.loadBells(), tt.loadTT(filter), loadClasses(), sb.from('cf_rooms').select('id,name').order('name').then(r => (r.data || []) as { id: string; name: string }[]),
    loadCurr(me), filter.owner ? tt.taughtByClass(me) : Promise.resolve(new Map<string, Set<string>>()),
  ]);
  const owners = [...new Set(entries.map(e => e.owner_id))];
  const people: Record<string, string> = {};
  if (filter.room && owners.length) for (const p of ((await sb.from('profiles').select('id,full_name').in('id', owners)).data || []) as any[]) people[p.id] = p.full_name;
  return { bells: b.bells, bellsSaved: b.saved, entries, classes, rooms, curr, taught, people };
}

const gradeOf = (name: string) => +(name.match(/\d+/)?.[0] || 0);
const nameOf = (list: { id: string; name: string }[], id: string | null) => (id ? list.find(x => x.id === id)?.name ?? '' : '');

/** A room booking (cf_room_requests via rooms/store) as the timetable shows it. */
export interface Booking { id: string; on_date: string; start_time: string; end_time: string; purpose: string; status: string; who: string }
const hm = (t: string) => t.slice(0, 5);
/** The bells a time range touches: [first, count] or null when it falls outside every bell. */
function bellSpan(bells: Bell[], start: string, end: string): [number, number] | null {
  const hit = bells.filter(b => b.starts < hm(end) && b.ends > hm(start));
  return hit.length ? [hit[0].n, hit[hit.length - 1].n - hit[0].n + 1] : null;
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mondayOf = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
/** Bookings of the room in [from, to] from cf_room_busy (078: everyone's, for all staff), merged with the ones the page already has. */
function useBusy(roomId: string, from: string, to: string, have: Booking[]): Booking[] {
  const r = useLoad(async () => { if (DEMO) return [] as Booking[]; const x = await sb.rpc('cf_room_busy', { p_room: roomId, p_from: from, p_to: to }); return x.error ? [] : ((x.data || []) as any[]).map(b => ({ ...b, who: b.who || '—', purpose: b.purpose || '' })) as Booking[]; }, [roomId, from, to]);
  const mine = new Map(have.map(b => [b.id, b]));
  return [...(r.data || []).map(b => mine.get(b.id) || b), ...have.filter(b => !(r.data || []).some(x => x.id === b.id))];
}
const BOOK_BG = 'repeating-linear-gradient(135deg, #fff7ed 0 8px, #ffedd5 8px 16px)';

/** The week as a grid: days down, bells across. An entry spans its bells; two entries on one bell stack. */
function Grid({ c, onCell, onEntry, showOwner, week, bookings = [] }: { c: Ctx; onCell?: (day: number, n: number) => void; onEntry?: (e: TT) => void; showOwner?: boolean; week?: Date; bookings?: Booking[] }) {
  const now = tt.nowIn(c.bells);
  const dateOf = (d: number) => { if (!week) return ''; const x = new Date(week); x.setDate(x.getDate() + d - 1); return iso(x); };
  const days = [1, 2, 3, 4, 5, ...(c.entries.some(e => e.weekday === 6) || bookings.some(b => new Date(b.on_date + 'T00:00').getDay() === 6) ? [6] : [])];
  const cols = `5.5rem repeat(${c.bells.length}, minmax(5.5rem, 1fr))`;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <div className="min-w-[56rem]">
        <div className="grid border-b border-border bg-surface-2" style={{ gridTemplateColumns: cols }}>
          <div />
          {c.bells.map(b => (
            <div key={b.n} className={`px-1 py-1.5 text-center ${now.bell === b.n ? 'bg-accent-soft' : ''}`}>
              <div className="text-lg font-black leading-tight">{b.label}</div><div className="text-[11px] tabular-nums text-text-secondary">{b.starts}–{b.ends}</div>
            </div>))}
        </div>
        {days.map(d => {
          const bk = bookings.filter(b => b.on_date === dateOf(d)).map(b => ({ b, at: bellSpan(c.bells, b.start_time, b.end_time) })).filter((x): x is { b: Booking; at: [number, number] } => !!x.at);
          const list = [...c.entries.filter(e => e.weekday === d), ...bk.map(x => ({ id: 'bk' + x.b.id, period: x.at[0], span: x.at[1] }) as TT)].sort((a, b) => a.period - b.period);
          // Overlapping lessons (e.g. a span over two single ones) go to separate lanes, so the row is only as tall as it must be.
          const ends: number[] = [], lane = new Map<string, number>();
          for (const e of list) { let i = ends.findIndex(x => x <= e.period); if (i < 0) i = ends.push(0) - 1; ends[i] = e.period + e.span; lane.set(e.id, i + 1); }
          const rows = Math.max(1, ends.length);
          return (
            <div key={d} className={`relative grid border-b border-border last:border-b-0 ${now.weekday === d ? 'bg-accent-soft/30' : ''}`} style={{ gridTemplateColumns: cols, gridAutoRows: 'minmax(4.5rem, auto)' }}>
              <div className="flex flex-col justify-center px-2 font-bold" style={{ gridColumn: 1, gridRow: `1 / span ${rows}` }}>{DAY[d - 1]}{week && <span className="text-xs font-semibold text-text-muted">{dateOf(d).slice(8)}.{dateOf(d).slice(5, 7)}</span>}</div>
              {onCell && c.bells.map(b => (
                <button key={'c' + b.n} type="button" onClick={() => onCell(d, b.n)} aria-label={`${DAY[d - 1]}, ${b.label}: сабақ қосу`} style={{ gridColumn: b.n + 1, gridRow: `1 / span ${rows}` }}
                  className="group m-0.5 grid place-items-center rounded-lg text-text-muted opacity-0 hover:bg-surface-2 hover:opacity-100 focus:opacity-100 cursor-pointer"><Plus size={18} aria-hidden="true" /></button>))}
              {bk.map(({ b, at }) => (
                <div key={'bk' + b.id} className="relative m-0.5 flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-orange-400 px-1 py-3 text-center text-orange-950"
                  style={{ gridColumn: `${at[0] + 1} / span ${at[1]}`, gridRow: lane.get('bk' + b.id), background: BOOK_BG }} title={b.purpose}>
                  <span className="absolute left-1.5 top-1 text-[10px] font-black uppercase tracking-wide">Бронь</span>
                  {b.status === 'pending' && <span className="absolute right-1.5 top-1 rounded bg-orange-200 px-1 text-[10px] font-bold">күтуде</span>}
                  <span className="mt-2 text-sm font-black tabular-nums">{hm(b.start_time)}–{hm(b.end_time)}</span>
                  <span className="line-clamp-1 text-[11px] font-semibold">{b.who}</span>
                  {b.purpose && <span className="line-clamp-1 text-[10px] opacity-80">{b.purpose}</span>}
                </div>))}
              {list.filter(e => !e.id.startsWith('bk')).map(e => {
                const cls = nameOf(c.classes, e.class_id), room = nameOf(c.rooms, e.room_id), next = tt.nextLecture(c.curr, e.course_id, e.class_id ? c.taught.get(e.class_id) : undefined);
                const live = now.weekday === d && now.bell !== null && now.bell >= e.period && now.bell < e.period + e.span;
                const body = (
                  <>
                    {!showOwner && <span className="absolute right-1.5 top-1 text-[11px] font-semibold opacity-80">{room}</span>}
                    <span className="text-xl font-black leading-none">{e.label || (cls ? 'Сабақ' : '—')}</span>
                    {next && !showOwner && <span className="line-clamp-2 px-1 text-center text-[10px] leading-tight opacity-80" title={next.title}>{next.title}</span>}
                    {showOwner && <span className="px-1 text-center text-[10px] leading-tight opacity-80">{c.people[e.owner_id] || ''}</span>}
                    <span className="absolute bottom-1 left-1.5 text-xs font-bold">{cls}</span>
                  </>);
                const cn = `relative m-0.5 flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-lg border border-black/10 px-1 py-4 text-slate-900 shadow-sm ${live ? 'ring-2 ring-accent ring-offset-1' : ''}`;
                const style = { gridColumn: `${e.period + 1} / span ${e.span}`, gridRow: lane.get(e.id), background: tt.tint(cls || e.label || 'x'), color: '#1e293b' };
                return onEntry
                  ? <button key={e.id} type="button" onClick={() => onEntry(e)} aria-label={`${DAY[d - 1]}, ${e.label || ''} ${cls} ${room}: өзгерту`} className={cn + ' cursor-pointer hover:brightness-95'} style={style}>{body}</button>
                  : <div key={e.id} className={cn} style={style}>{body}</div>;
              })}
            </div>);
        })}
      </div>
    </div>
  );
}

/** Add or change one entry: class, label, course (its next lecture is offered at the bell), room, length. */
function EntryDialog({ me, c, e, onDone }: { me: Me; c: Ctx; e: Partial<TT> & { weekday: number; period: number }; onDone: (changed: boolean) => void }) {
  const [v, setV] = useState({ class_id: e.class_id ?? '', label: e.label ?? 'ИНФ', course_id: e.course_id ?? '', room_id: e.room_id ?? (c.rooms.some(r => r.id === getPrefs().room) ? getPrefs().room : c.rooms[0]?.id || ''), span: e.span ?? 1, weekday: e.weekday, period: e.period });
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const g = gradeOf(nameOf(c.classes, v.class_id));
  const courses = [...c.curr.courses].sort((a, b) => +(b.grade === g) - +(a.grade === g));
  const pickClass = (id: string) => {
    const gr = gradeOf(nameOf(c.classes, id));
    const guess = v.course_id || c.curr.courses.find(k => k.grade === gr && /inform|информ/i.test(k.title))?.id || '';
    setV({ ...v, class_id: id, course_id: guess });
  };
  const next = tt.nextLecture(c.curr, v.course_id || null, v.class_id ? c.taught.get(v.class_id) : undefined);
  const save = async () => {
    setBusy(true); setErr('');
    try { await tt.saveTT(me, { id: e.id, class_id: v.class_id || null, label: v.label, course_id: v.course_id || null, room_id: v.room_id || null, span: v.span, weekday: v.weekday, period: v.period }); onDone(true); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  };
  const del = async () => { if (!e.id || !window.confirm('Бұл сабақты кестеден өшіресіз бе?')) return; setBusy(true); try { await tt.delTT(e.id); onDone(true); } catch (x) { setErr((x as Error).message); setBusy(false); } };
  const bell = c.bells.find(b => b.n === v.period);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => onDone(false)}>
      <div role="dialog" aria-modal="true" aria-label="Кестедегі сабақ" onClick={x => x.stopPropagation()} onKeyDown={x => x.key === 'Escape' && onDone(false)} className="w-full max-w-md space-y-3 rounded-2xl bg-surface p-5 shadow-pop">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-lg font-black">{DAY[v.weekday - 1]} · {bell?.label} <span className="text-sm font-normal text-text-secondary">{bell?.starts}–{bell?.ends}</span></h2>
          <button type="button" onClick={() => onDone(false)} aria-label="Жабу" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2 cursor-pointer"><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Сынып">{id => <select id={id} className={inputCls} value={v.class_id} onChange={x => pickClass(x.target.value)}><option value="">— сыныпсыз (жиналыс т.б.) —</option>{c.classes.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</select>}</Field>
          <Field label="Белгі (кестеде)">{id => <input id={id} className={inputCls} maxLength={12} value={v.label} onChange={x => setV({ ...v, label: x.target.value })} placeholder="ИНФ, Ф GD, Сс" />}</Field>
          <Field label="Кабинет">{id => <select id={id} className={inputCls} value={v.room_id} onChange={x => setV({ ...v, room_id: x.target.value })}><option value="">—</option>{c.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}</Field>
          <Field label="Ұзақтығы">{id => <select id={id} className={inputCls} value={v.span} onChange={x => setV({ ...v, span: +x.target.value })}>{[1, 2, 3].filter(n => v.period + n - 1 <= c.bells.length).map(n => <option key={n} value={n}>{n} сабақ</option>)}</select>}</Field>
        </div>
        <Field label="Курс (келесі дәріс осыдан алынады)">{id => <select id={id} className={inputCls} value={v.course_id} onChange={x => setV({ ...v, course_id: x.target.value })}><option value="">— курссыз —</option>{courses.map(k => <option key={k.id} value={k.id}>{k.title}</option>)}</select>}</Field>
        {v.course_id && v.class_id && <p className="rounded-lg bg-surface-2 p-2 text-sm">Келесі дәріс: <b>{next ? next.title : 'курс толық өтілген'}</b></p>}
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        <div className="flex gap-2">
          {e.id && <Button variant="ghost" onClick={del} disabled={busy} className="!text-danger"><Trash2 size={16} aria-hidden="true" />Өшіру</Button>}
          <Button className="ml-auto" onClick={save} loading={busy}>Сақтау</Button>
        </div>
      </div>
    </div>
  );
}

function BellsEditor({ me, c, done }: { me: Me; c: Ctx; done: () => void }) {
  const [b, setB] = useState(c.bells), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const up = (i: number, k: keyof Bell, x: string) => setB(l => l.map((y, j) => (j === i ? { ...y, [k]: x } : y)));
  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">Қоңырау кестесі <span className="text-sm font-normal text-text-secondary">· мектептің барлық мұғаліміне ортақ</span></h2>
      <ol className="grid gap-1.5 sm:grid-cols-2">{b.map((x, i) => (
        <li key={i} className="flex items-center gap-1.5">
          <input aria-label={`${i + 1}: белгі`} className={inputCls + ' !w-20'} value={x.label} maxLength={12} onChange={e => up(i, 'label', e.target.value)} />
          <input aria-label={`${i + 1}: басталуы`} type="time" className={inputCls + ' !w-28'} value={x.starts} onChange={e => up(i, 'starts', e.target.value)} />–
          <input aria-label={`${i + 1}: аяқталуы`} type="time" className={inputCls + ' !w-28'} value={x.ends} onChange={e => up(i, 'ends', e.target.value)} />
          <button type="button" aria-label={`${i + 1}: өшіру`} onClick={() => setB(l => l.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-2 cursor-pointer"><X size={16} aria-hidden="true" /></button>
        </li>))}</ol>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <div className="flex flex-wrap gap-2">
        {b.length < 12 && <Button variant="secondary" onClick={() => setB(l => [...l, { n: l.length + 1, label: String(l.length + 1), starts: l.at(-1)?.ends || '08:00', ends: l.at(-1)?.ends || '08:45' }])}><Plus size={16} aria-hidden="true" />Қоңырау қосу</Button>}
        <Button className="ml-auto" loading={busy} onClick={async () => { setBusy(true); setErr(''); try { await tt.saveBells(me, b); done(); } catch (x) { setErr((x as Error).message); setBusy(false); } }}>Сақтау</Button>
      </div>
    </Card>
  );
}

/** Lessons → Timetable: the teacher's week; click a free bell to add, an entry to change it. */
export function TimetableView({ me, name }: { me: Me; name?: string }) {
  const d = useLoad(() => loadCtx(me, { owner: me.id }), [me.id]);
  const [edit, setEdit] = useState<(Partial<TT> & { weekday: number; period: number }) | null>(null), [bells, setBells] = useState(false);
  if (d.error) return <ErrorBox message={d.error} onRetry={d.reload} />;
  if (!d.data) return <Skeleton rows={6} />;
  const c = d.data;
  return (
    <main className="mx-auto max-w-7xl space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-2xl font-black">Сабақ кестесі{name ? ` · ${name}` : ''}</h1>
        <Button variant="secondary" onClick={() => setBells(x => !x)}><BellIcon size={16} aria-hidden="true" />Қоңыраулар</Button>
      </div>
      {!c.bellsSaved && <p className="rounded-lg bg-surface-2 p-2 text-sm text-text-secondary">Қоңырау уақыттары әлі сақталмаған: лицейдің кестесі үлгі ретінде көрсетілді. «Қоңыраулар» арқылы тексеріп, сақтаңыз.</p>}
      {bells && <BellsEditor me={me} c={c} done={() => { setBells(false); d.reload(); }} />}
      <Grid c={c} onCell={(weekday, period) => setEdit({ weekday, period })} onEntry={e => setEdit(e)} />
      <p className="text-xs text-text-muted">Бос ұяшықты бассаңыз — сабақ қосылады, сабақты бассаңыз — өзгертіледі. Курс таңдалса, ұяшықта сол сыныптың келесі дәрісі көрінеді, ал басты беттегі «Бүгін» картасынан оны бір басумен бастайсыз.</p>
      {edit && <EntryDialog me={me} c={c} e={edit} onDone={ch => { setEdit(null); if (ch) d.reload(); }} />}
    </main>
  );
}

/** Home: today's bells with the next lecture of each class and a start button. */
export function TodayCard({ me }: { me: Me }) {
  const d = useLoad(() => loadCtx(me, { owner: me.id }), [me.id]);
  const [busy, setBusy] = useState(''), [err, setErr] = useState('');
  if (d.error) return <Card><ErrorBox message={d.error} onRetry={d.reload} /></Card>;
  if (!d.data) return <Card><Skeleton rows={2} /></Card>;
  const c = d.data, now = tt.nowIn(c.bells);
  const today = c.entries.filter(e => e.weekday === now.weekday).sort((a, b) => a.period - b.period);
  const start = async (lesson: string, cls: string) => {
    setBusy(lesson + cls); setErr('');
    try { window.location.hash = 'remote/' + (await createSession(lesson, cls, getPrefs().groups)); } catch (x) { setErr((x as Error).message); setBusy(''); }
  };
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2"><h2 className="flex-1 font-semibold">Бүгінгі сабақтар · {DAY[now.weekday - 1]}</h2><a href="#lessons/timetable" className="text-sm text-accent underline">Кесте</a></div>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      {!today.length ? <p className="text-sm text-text-muted">{c.entries.length ? 'Бүгін кестеде сабақ жоқ.' : 'Сабақ кестесі әлі толтырылмаған.'} <a href="#lessons/timetable" className="text-accent underline">Кестені ашу</a></p> : (
        <ul className="divide-y divide-border">{today.map(e => {
          const b = c.bells.find(x => x.n === e.period), last = c.bells.find(x => x.n === e.period + e.span - 1), cls = nameOf(c.classes, e.class_id);
          const next = tt.nextLecture(c.curr, e.course_id, e.class_id ? c.taught.get(e.class_id) : undefined);
          const live = now.bell !== null && now.bell >= e.period && now.bell < e.period + e.span, past = !!last && last.ends <= now.hhmm;
          return (
            <li key={e.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${past ? 'opacity-50' : ''}`}>
              <span className={`inline-flex w-24 items-center gap-1 text-sm tabular-nums ${live ? 'font-bold text-accent' : 'text-text-secondary'}`}><Clock size={14} aria-hidden="true" />{b?.starts}–{last?.ends}</span>
              <span className="inline-block min-w-[3rem] rounded-md px-2 py-0.5 text-center text-sm font-black" style={{ background: tt.tint(cls || e.label || 'x'), color: '#1e293b' }}>{e.label || '—'}</span>
              <span className="font-semibold">{cls}</span>
              {e.room_id && <span className="inline-flex items-center gap-0.5 text-sm text-text-secondary"><MapPin size={13} aria-hidden="true" />{nameOf(c.rooms, e.room_id)}</span>}
              {live && <span className="rounded-full bg-accent px-2 text-xs font-bold text-on-accent">қазір</span>}
              {next && e.class_id && (
                <span className="ml-auto flex items-center gap-2">
                  <span className="max-w-[16rem] truncate text-sm text-text-secondary" title={next.title}>{next.title}</span>
                  <Button variant={live ? 'success' : 'secondary'} className="!min-h-[38px]" disabled={!!DEMO} loading={busy === next.id + e.class_id} onClick={() => start(next.id, e.class_id!)}><Play size={15} aria-hidden="true" />Бастау</Button>
                </span>)}
            </li>);
        })}</ul>)}
    </Card>
  );
}

/** A room's week: every teacher's lessons there (read-only). */
export function RoomWeek({ me, roomId, bookings = [] }: { me: Me; roomId: string; bookings?: Booking[] }) {
  const d = useLoad(() => loadCtx(me, { room: roomId }), [roomId]);
  const [shift, setShift] = useState(0);
  const week = mondayOf(new Date()); week.setDate(week.getDate() + shift * 7);
  const end = new Date(week); end.setDate(end.getDate() + 6);
  const all = useBusy(roomId, iso(week), iso(end), bookings);
  if (d.error) return <ErrorBox message={d.error} onRetry={d.reload} />;
  if (!d.data) return <Skeleton rows={2} />;
  const inWeek = all.filter(b => b.on_date >= iso(week) && b.on_date <= iso(end) && (b.status === 'approved' || b.status === 'pending'));
  const outside = inWeek.filter(b => !bellSpan(d.data!.bells, b.start_time, b.end_time));
  const nav = 'grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-surface-2';
  return (
    <section aria-label="Кабинет кестесі" className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex-1 font-semibold">Кабинет кестесі</h3>
        <span className="flex items-center gap-1.5 text-xs text-text-secondary"><span className="h-3 w-5 rounded border-2 border-dashed border-orange-400" style={{ background: BOOK_BG }} aria-hidden="true" />бронь</span>
        <button type="button" className={nav} aria-label="Алдыңғы апта" onClick={() => setShift(x => x - 1)}>‹</button>
        <button type="button" onClick={() => setShift(0)} className="min-h-[40px] rounded-lg border border-border px-3 text-sm font-semibold hover:bg-surface-2" aria-label="Осы апта">
          {week.getDate()}.{String(week.getMonth() + 1).padStart(2, '0')}–{end.getDate()}.{String(end.getMonth() + 1).padStart(2, '0')}{shift === 0 ? ' · осы апта' : ''}</button>
        <button type="button" className={nav} aria-label="Келесі апта" onClick={() => setShift(x => x + 1)}>›</button>
      </div>
      {d.data.entries.length || inWeek.length ? <Grid c={d.data} showOwner week={week} bookings={inWeek} /> : <p className="text-sm text-text-secondary">Бұл аптада кабинетте сабақ та, бронь да жоқ.</p>}
      {outside.length > 0 && <ul className="space-y-1 text-sm">{outside.map(b => <li key={b.id} className="rounded-lg border border-dashed border-orange-400 px-3 py-1.5"><b>Бронь</b> · {b.on_date.slice(8)}.{b.on_date.slice(5, 7)} {hm(b.start_time)}–{hm(b.end_time)} · {b.who}{b.status === 'pending' ? ' · күтуде' : ''} <span className="text-text-secondary">(қоңырау уақытынан тыс)</span></li>)}</ul>}
    </section>
  );
}

/** For the booking form: what already happens in the room that day (lessons by the bells, other bookings) and whether the asked time clashes. */
export function RoomDay({ me, roomId, date, start, end, bookings }: { me: Me; roomId: string; date: string; start: string; end: string; bookings: Booking[] }) {
  const d = useLoad(() => loadCtx(me, { room: roomId }), [roomId]);
  const all = useBusy(roomId, date, date, bookings);
  if (!d.data || !date) return null;
  const wd = ((new Date(date + 'T00:00').getDay() + 6) % 7) + 1;
  const busy = [
    ...d.data.entries.filter(e => e.weekday === wd).map(e => { const a = d.data!.bells.find(b => b.n === e.period), z = d.data!.bells.find(b => b.n === e.period + e.span - 1);
      return { k: 'e' + e.id, s: a?.starts || '', t: z?.ends || '', text: `${e.label || 'Сабақ'} ${nameOf(d.data!.classes, e.class_id)} · ${d.data!.people[e.owner_id] || ''}` }; }),
    ...all.filter(b => b.on_date === date && (b.status === 'approved' || b.status === 'pending')).map(b => ({ k: 'b' + b.id, s: hm(b.start_time), t: hm(b.end_time), text: `Бронь · ${b.who}${b.status === 'pending' ? ' (күтуде)' : ''}` })),
  ].filter(x => x.s).sort((a, b) => a.s.localeCompare(b.s));
  const clash = busy.filter(x => x.s < end && x.t > start);
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-2 p-3">
      <p className="text-sm font-semibold">Осы күні кабинетте ({DAY[wd - 1]}):</p>
      {busy.length ? <ul className="space-y-1">{busy.map(x => (
        <li key={x.k} className={`flex gap-3 rounded-lg px-2 py-1 text-sm ${clash.includes(x) ? 'bg-danger-soft text-danger' : 'bg-surface'}`}><span className="w-24 shrink-0 font-bold tabular-nums">{x.s}–{x.t}</span><span>{x.text}</span></li>))}</ul>
        : <p className="text-sm text-text-secondary">Бос: сабақ та, бронь да жоқ.</p>}
      {clash.length > 0 && <p role="alert" className="text-sm font-semibold text-danger">Таңдаған уақыт {clash.length === 1 ? 'осымен' : 'булармен'} қабаттасады. Басқа уақыт таңдаңыз.</p>}
    </div>
  );
}
