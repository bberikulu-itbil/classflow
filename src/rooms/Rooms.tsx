import React, { useState } from 'react';
import { ArrowLeft, DoorOpen, Laptop, Plus, Trash2, Wrench } from 'lucide-react';
import { Button, Card, EmptyState, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { Chip } from '../contests/ui';
import * as st from './store';
import type { Data, ItemForm, Me, Req, Room } from './store';

type Mode = { k: 'list' } | { k: 'room'; id: string } | { k: 'edit'; id: string | null } | { k: 'book'; id: string };
const dmy = (iso: string) => iso.split('-').reverse().join('.');
const itemsOf = (d: Data, id: string) => d.items.filter(i => i.room_id === id);
const Note = ({ msg, ok }: { msg: string; ok: boolean }) => <p role="status" aria-live="polite" className={msg ? `rounded-lg p-3 text-sm ${ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}` : 'sr-only'}>{msg}</p>;
const tone = (s: st.ReqStatus) => (s === 'approved' ? 'ok' : s === 'pending' ? 'warn' : 'plain') as 'ok' | 'warn' | 'plain';

function RoomEdit({ me, d, id, done }: { me: Me; d: Data; id: string | null; done: (rid?: string) => void }) {
  const room = d.rooms.find(r => r.id === id);
  const [f, setF] = useState<st.RoomForm>(() => ({ id: room?.id, name: room?.name ?? '', description: room?.description ?? '', items: id ? itemsOf(d, id).map(i => ({ id: i.id, name: i.name, qty: String(i.qty), kind: i.kind, note: i.note ?? '' })) : [] }));
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [ask, setAsk] = useState(false);
  const setItem = (i: number, p: Partial<ItemForm>) => setF({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const save = async () => { setBusy(true); setMsg(''); try { done(await st.saveRoom(me, f)); } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); setBusy(false); } };
  const del = async () => { setBusy(true); try { await st.deleteRoom(f.id as string); done(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); setAsk(false); setBusy(false); } };
  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">{id ? 'Кабинетті өзгерту' : 'Жаңа кабинет'}</h2>
      <Field label="Атауы">{x => <input id={x} className={inputCls} maxLength={80} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />}</Field>
      <Field label="Сипаттама">{x => <textarea id={x} rows={2} maxLength={500} className={inputCls + ' py-2'} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />}</Field>
      <section className="space-y-2">
        <h3 className="font-semibold">Жабдықтар</h3>
        {f.items.length === 0 && <p className="text-sm text-text-secondary">Жабдық жоқ. Қосыңыз.</p>}
        {f.items.map((it, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_6rem_9rem_1fr_auto] sm:items-end">
            <Field label="Атауы">{x => <input id={x} className={inputCls} maxLength={80} value={it.name} onChange={e => setItem(i, { name: e.target.value })} />}</Field>
            <Field label="Саны">{x => <input id={x} type="number" inputMode="numeric" min={0} max={1000} className={inputCls} value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} />}</Field>
            <Field label="Түрі">{x => <select id={x} className={inputCls} value={it.kind} onChange={e => setItem(i, { kind: e.target.value as ItemForm['kind'] })}>{Object.entries(st.KIND_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
            <Field label="Ескертпе">{x => <input id={x} className={inputCls} maxLength={200} value={it.note} onChange={e => setItem(i, { note: e.target.value })} />}</Field>
            <Button variant="ghost" aria-label={`Жабдық ${i + 1} өшіру`} onClick={() => setF({ ...f, items: f.items.filter((_, j) => j !== i) })}><Trash2 size={18} aria-hidden="true" /></Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setF({ ...f, items: [...f.items, { name: '', qty: '1', kind: 'equipment', note: '' }] })}><Plus size={16} aria-hidden="true" />Жабдық қосу</Button>
      </section>
      <Note msg={msg} ok={false} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} loading={busy}>Сақтау</Button>
        <Button variant="secondary" onClick={() => done(id ?? undefined)}>Бас тарту</Button>
        {id && (ask ? <><Button variant="danger" onClick={del} loading={busy}>Иә, өшіру</Button><Button variant="secondary" onClick={() => setAsk(false)}>Жоқ</Button></> : <Button variant="ghost" onClick={() => setAsk(true)}><Trash2 size={16} aria-hidden="true" />Өшіру</Button>)}
      </div>
    </Card>
  );
}

function Book({ me, d, room, done }: { me: Me; d: Data; room: Room; done: (note?: string) => void }) {
  const its = itemsOf(d, room.id).filter(i => i.qty > 0);
  const [date, setDate] = useState(st.todayIso()), [start, setStart] = useState('14:00'), [end, setEnd] = useState('15:00'), [purpose, setPurpose] = useState('');
  const [pick, setPick] = useState<Record<string, string>>({}), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true); setMsg('');
    try {
      const picks = Object.entries(pick).filter(([, q]) => q !== '' && q !== '0').map(([item_id, q]) => ({ item_id, qty: Number(q) }));
      done((await st.request(me, room, date, start, end, purpose, picks)) === 'approved' ? 'Бронь расталды' : 'Сұрау жіберілді: жауапты адам растайды');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); setBusy(false); }
  };
  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Брондау: {room.name}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Күні">{x => <input id={x} type="date" min={st.todayIso()} className={inputCls} value={date} onChange={e => setDate(e.target.value)} />}</Field>
        <Field label="Басталуы">{x => <input id={x} type="time" className={inputCls} value={start} onChange={e => setStart(e.target.value)} />}</Field>
        <Field label="Аяқталуы">{x => <input id={x} type="time" className={inputCls} value={end} onChange={e => setEnd(e.target.value)} />}</Field>
      </div>
      <Field label="Мақсаты">{x => <input id={x} className={inputCls} maxLength={300} value={purpose} onChange={e => setPurpose(e.target.value)} />}</Field>
      {its.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="font-semibold">Қажет жабдық (саны)</legend>
          {its.map(i => (
            <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2">
              <label htmlFor={`q-${i.id}`} className="min-w-0 text-sm"><span className="font-medium">{i.name}</span> <span className="text-text-secondary">· барлығы {i.qty}</span></label>
              <input id={`q-${i.id}`} type="number" inputMode="numeric" min={0} max={i.qty} placeholder="0" className={inputCls + ' !w-24'} value={pick[i.id] ?? ''} onChange={e => setPick({ ...pick, [i.id]: e.target.value })} />
            </div>
          ))}
          <p className="text-sm text-text-secondary">Сол уақытта бос қалдықты жауапты адам растау кезінде тексереді.</p>
        </fieldset>
      )}
      <Note msg={msg} ok={false} />
      <div className="flex gap-2"><Button onClick={send} loading={busy}>{st.manages(me, room) ? 'Брондау' : 'Сұрау жіберу'}</Button><Button variant="secondary" onClick={() => done()}>Бас тарту</Button></div>
    </Card>
  );
}

function RoomCard({ d, r, open }: { d: Data; r: Room; open: () => void }) {
  const its = itemsOf(d, r.id), lap = its.filter(i => i.kind === 'laptop').reduce((a, i) => a + i.qty, 0);
  return (
    <article className="flex h-full flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold"><DoorOpen size={20} aria-hidden="true" className="shrink-0 text-on-accent-soft" /><span className="min-w-0 truncate">{r.name}</span></h3>
      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-text-secondary">{r.description}</p>
      <p className="truncate text-sm text-text-secondary">Жауапты: {r.responsible_id ? d.people[r.responsible_id] ?? '—' : '—'}</p>
      <div className="flex flex-wrap gap-1"><Chip><Wrench size={12} aria-hidden="true" className="mr-1" />{its.length} жабдық</Chip>{lap > 0 && <Chip><Laptop size={12} aria-hidden="true" className="mr-1" />{lap} ноутбук</Chip>}</div>
      <div className="mt-auto pt-1"><Button onClick={open} aria-label={`Ашу: ${r.name}`}>Ашу</Button></div>
    </article>
  );
}

export function RoomsView({ me }: { me: Me }) {
  const { data: d, error, loading, reload } = useLoad(() => st.loadAll(me), [me.id]);
  const [mode, setMode] = useState<Mode>({ k: 'list' }), [note, setNote] = useState('');
  const back = (rid?: string, msg = '') => { setNote(msg); setMode(rid ? { k: 'room', id: rid } : { k: 'list' }); reload(); };
  if (loading && !d) return <Skeleton rows={3} />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!d) return null;
  const room = mode.k === 'list' || (mode.k === 'edit' && !mode.id) ? undefined : d.rooms.find(r => r.id === (mode as { id: string }).id);
  if (mode.k === 'edit') return <RoomEdit me={me} d={d} id={mode.id} done={rid => back(rid)} />;
  if (mode.k === 'book' && room) return <Book me={me} d={d} room={room} done={m => back(room.id, m)} />;
  if (mode.k === 'room' && room) {
    const its = itemsOf(d, room.id);
    return (
      <div className="space-y-3">
        <Button variant="ghost" onClick={() => back()}><ArrowLeft size={16} aria-hidden="true" />Барлық кабинеттер</Button>
        <Note msg={note} ok />
        <Card className="space-y-3 p-4">
          <h2 className="text-xl font-semibold">{room.name}</h2>
          {room.description && <p className="text-text-secondary">{room.description}</p>}
          <p className="text-sm text-text-secondary">Жауапты: {room.responsible_id ? d.people[room.responsible_id] ?? '—' : '—'}</p>
          {its.length === 0 ? <p className="text-sm text-text-secondary">Жабдық тізімі бос.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="text-text-secondary"><tr><th className="py-1 pr-3">Жабдық</th><th className="pr-3">Саны</th><th className="pr-3">Түрі</th><th>Ескертпе</th></tr></thead>
              <tbody>{its.map(i => <tr key={i.id} className="border-t border-border"><td className="py-2 pr-3 font-medium">{i.name}</td><td className="pr-3">{i.qty}</td><td className="pr-3">{st.KIND_NAMES[i.kind]}</td><td className="text-text-secondary">{i.note}</td></tr>)}</tbody></table></div>
          )}
          <div className="flex flex-wrap gap-2"><Button onClick={() => setMode({ k: 'book', id: room.id })}>Брондау</Button>{st.manages(me, room) && <Button variant="secondary" onClick={() => setMode({ k: 'edit', id: room.id })}>Өзгерту</Button>}</div>
        </Card>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2"><p className="text-sm text-text-secondary">{d.rooms.length} кабинет</p><Button onClick={() => setMode({ k: 'edit', id: null })}><Plus size={16} aria-hidden="true" />Кабинет қосу</Button></div>
      <Note msg={note} ok />
      {d.rooms.length === 0 ? <EmptyState text="Кабинет әлі қосылмаған. Алғашқысын қосыңыз." /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{d.rooms.map(r => <RoomCard key={r.id} d={d} r={r} open={() => setMode({ k: 'room', id: r.id })} />)}</div>}
    </div>
  );
}

function ReqCard({ d, q, me, act }: { d: Data; q: Req; me: Me; act: (id: string, s: st.ReqStatus, ok: string) => void }) {
  const room = d.rooms.find(r => r.id === q.room_id);
  const picks = d.reqItems.filter(x => x.request_id === q.id).map(x => `${d.items.find(i => i.id === x.item_id)?.name ?? '?'} × ${x.qty}`);
  const mine = q.requester_id === me.id, mgr = !!room && st.manages(me, room);
  return (
    <Card className="space-y-2 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{room?.name} · {dmy(q.on_date)} {q.start_time}–{q.end_time}</p><Chip tone={tone(q.status)}>{st.STATUS_NAMES[q.status]}</Chip></div>
      <p className="text-text-secondary">{mine ? 'Мен' : d.people[q.requester_id] ?? 'Қолданушы'}{q.purpose && ` · ${q.purpose}`}</p>
      {picks.length > 0 && <p>{picks.join(', ')}</p>}
      <div className="flex flex-wrap gap-2">
        {mgr && q.status === 'pending' && <><Button variant="success" onClick={() => act(q.id, 'approved', 'Бронь расталды')}>Растау</Button><Button variant="secondary" onClick={() => act(q.id, 'rejected', 'Сұрау қабылданбады')}>Бас тарту</Button></>}
        {mgr && q.status === 'approved' && <Button variant="secondary" onClick={() => act(q.id, 'returned', 'Жабдық қайтарылды деп белгіленді')}>Жабдық қайтарылды</Button>}
        {mine && (q.status === 'pending' || q.status === 'approved') && <Button variant="ghost" onClick={() => act(q.id, 'cancelled', 'Бронь бас тартылды')}>Бронь бас тарту</Button>}
      </div>
    </Card>
  );
}

export function RequestsView({ me }: { me: Me }) {
  const { data: d, error, loading, reload } = useLoad(() => st.loadAll(me), [me.id]);
  const [msg, setMsg] = useState(''), [ok, setOk] = useState(true);
  if (loading && !d) return <Skeleton rows={3} />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!d) return null;
  const act = async (id: string, s: st.ReqStatus, done: string) => { try { await st.setStatus(id, s); setOk(true); setMsg(done); reload(); } catch (e) { setOk(false); setMsg(e instanceof Error ? e.message : 'Қате'); } };
  const mgr = d.reqs.filter(q => { const r = d.rooms.find(x => x.id === q.room_id); return r && st.manages(me, r) && q.requester_id !== me.id; });
  const mine = d.reqs.filter(q => q.requester_id === me.id);
  const sec = (title: string, rows: Req[], empty: string) => (
    <section aria-label={title} className="space-y-2"><h2 className="text-base font-semibold">{title} <Chip>{rows.length}</Chip></h2>
      {rows.length ? <div className="grid gap-2 md:grid-cols-2">{rows.map(q => <ReqCard key={q.id} d={d} q={q} me={me} act={act} />)}</div> : <p className="text-sm text-text-secondary">{empty}</p>}</section>
  );
  return (
    <div className="space-y-4">
      <Note msg={msg} ok={ok} />
      {sec('Менің кабинеттеріме сұраулар', [...mgr.filter(q => q.status === 'pending'), ...mgr.filter(q => q.status !== 'pending')], 'Сұрау жоқ.')}
      {sec('Менің брондауларым', mine, 'Сіз әлі брондамағансыз.')}
    </div>
  );
}
