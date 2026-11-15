import React, { useState } from 'react';
import { ArrowLeft, Check, DoorOpen, Laptop, Plus, Trash2, TriangleAlert, Wrench } from 'lucide-react';
import { Button, Card, EmptyState, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { Chip } from '../contests/ui';
import * as st from './store';
import type { Data, Item, ItemForm, Me, Req, Room } from './store';
import { Note, Photo, PhotoPick, dmy } from './parts';

type Mode = { k: 'list' } | { k: 'room'; id: string } | { k: 'edit'; id: string | null } | { k: 'book'; id: string } | { k: 'item'; id: string };
const itemsOf = (d: Data, id: string) => d.items.filter(i => i.room_id === id);
const tone = (s: st.ReqStatus) => (s === 'approved' ? 'ok' : s === 'pending' ? 'warn' : 'plain') as 'ok' | 'warn' | 'plain';

function RoomEdit({ me, d, id, done }: { me: Me; d: Data; id: string | null; done: (rid?: string) => void }) {
  const room = d.rooms.find(r => r.id === id);
  const [f, setF] = useState<st.RoomForm>(() => ({ id: room?.id, name: room?.name ?? '', description: room?.description ?? '', items: id ? itemsOf(d, id).map(i => ({ id: i.id, name: i.name, qty: String(i.qty), kind: i.kind, note: i.note ?? '', inv_no: i.inv_no ?? '', year: i.acquired_year ? String(i.acquired_year) : '', price: i.price != null ? String(i.price) : '', currency: i.currency, photo_url: i.photo_url ?? '', broken: String(i.broken), defect: i.defect ?? '' })) : [] }));
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
          <div key={it.id ?? i} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <PhotoPick me={me} value={it.photo_url} onChange={u => setItem(i, { photo_url: u })} label={`Жабдық ${i + 1}: сурет`} />
              <Button variant="ghost" aria-label={`Жабдық ${i + 1} өшіру`} onClick={() => setF({ ...f, items: f.items.filter((_, j) => j !== i) })}><Trash2 size={18} aria-hidden="true" /></Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr]">
              <Field label="Атауы">{x => <input id={x} className={inputCls} maxLength={80} value={it.name} onChange={e => setItem(i, { name: e.target.value })} />}</Field>
              <Field label="Саны">{x => <input id={x} type="number" inputMode="numeric" min={0} max={1000} className={inputCls} value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} />}</Field>
              <Field label="Түрі">{x => <select id={x} className={inputCls} value={it.kind} onChange={e => setItem(i, { kind: e.target.value as ItemForm['kind'] })}>{Object.entries(st.KIND_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
              <Field label="Алынған жылы">{x => <input id={x} type="number" inputMode="numeric" min={1990} max={2100} placeholder="2025" className={inputCls} value={it.year} onChange={e => setItem(i, { year: e.target.value })} />}</Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-[2fr_1.2fr_1fr_1fr]">
              <Field label="Инвентарь нөмірі">{x => <input id={x} className={inputCls} maxLength={60} placeholder="ИН-0101…0112" value={it.inv_no} onChange={e => setItem(i, { inv_no: e.target.value })} />}</Field>
              <Field label="Бағасы (1 дана)">{x => <input id={x} inputMode="decimal" className={inputCls} value={it.price} onChange={e => setItem(i, { price: e.target.value })} />}</Field>
              <Field label="Валюта">{x => <select id={x} className={inputCls} value={it.currency} onChange={e => setItem(i, { currency: e.target.value as st.Cur })}>{Object.entries(st.CUR).map(([k, v]) => <option key={k} value={k}>{k} {v}</option>)}</select>}</Field>
              <Field label="Ақаулы саны">{x => <input id={x} type="number" inputMode="numeric" min={0} max={1000} className={inputCls} value={it.broken} onChange={e => setItem(i, { broken: e.target.value })} />}</Field>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Ақау туралы ақпарат">{x => <input id={x} className={inputCls} maxLength={300} placeholder="Мысалы: №7 экраны жарықсыз" value={it.defect} onChange={e => setItem(i, { defect: e.target.value })} />}</Field>
              <Field label="Ескертпе">{x => <input id={x} className={inputCls} maxLength={200} value={it.note} onChange={e => setItem(i, { note: e.target.value })} />}</Field>
            </div>
          </div>
        ))}
        <Button variant="secondary" onClick={() => setF({ ...f, items: [...f.items, st.blankItem()] })}><Plus size={16} aria-hidden="true" />Жабдық қосу</Button>
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
  const its = itemsOf(d, room.id).filter(i => i.qty - i.broken > 0);
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
              <label htmlFor={`q-${i.id}`} className="min-w-0 text-sm"><span className="font-medium">{i.name}</span> <span className="text-text-secondary">· жұмыс істейтіні {i.qty - i.broken}{st.freeQty(d, i) < i.qty - i.broken ? `, қазір бос ${st.freeQty(d, i)}` : ''}</span></label>
              <input id={`q-${i.id}`} type="number" inputMode="numeric" min={0} max={i.qty - i.broken} placeholder="0" className={inputCls + ' !w-24'} value={pick[i.id] ?? ''} onChange={e => setPick({ ...pick, [i.id]: e.target.value })} />
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

function ItemCard({ d, i, open }: { d: Data; i: Item; open: () => void }) {
  const free = st.freeQty(d, i), out = st.onLoan(d, i.id);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="h-32 shrink-0"><Photo url={i.photo_url} alt={i.name} /></div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h4 className="line-clamp-2 min-h-[2.5rem] font-semibold leading-tight">{i.name}</h4>
        <div className="flex flex-wrap gap-1">
          <Chip tone="accent">{i.qty} дана</Chip>{i.inv_no && <Chip>№ {i.inv_no}</Chip>}{i.acquired_year && <Chip>{i.acquired_year} ж.</Chip>}
        </div>
        <p className="text-sm text-text-secondary">Бос: <b className="text-text">{free}</b>{out > 0 && ` · берілген ${out}`}</p>
        {i.broken > 0 ? <p className="flex items-start gap-1 rounded-md bg-warning-soft px-2 py-1 text-xs text-warning"><TriangleAlert size={14} aria-hidden="true" className="mt-0.5 shrink-0" /><span>Ақаулы: {i.broken}{i.defect ? ` — ${i.defect}` : ''}</span></p>
          : <p className="flex items-center gap-1 text-xs text-success"><Check size={14} aria-hidden="true" />Барлығы жұмыс істейді</p>}
        {i.price != null && <p className="text-sm text-text-secondary">{st.money(i.price, i.currency)} / дана</p>}
        <div className="mt-auto pt-1"><Button variant="secondary" onClick={open} aria-label={`Ашу: ${i.name}`}>Ашу</Button></div>
      </div>
    </article>
  );
}

function ItemPage({ me, d, i, room, back, reload }: { me: Me; d: Data; i: Item; room: Room; back: () => void; reload: () => void }) {
  const mgr = st.manages(me, room), free = st.freeQty(d, i);
  const loans = d.loans.filter(l => l.item_id === i.id);
  const [who, setWho] = useState(''), [name, setName] = useState(''), [qty, setQty] = useState('1'), [purpose, setPurpose] = useState(''), [due, setDue] = useState('');
  const [msg, setMsg] = useState(''), [ok, setOk] = useState(true), [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>, done: string) => { setBusy(true); setMsg(''); try { await fn(); setOk(true); setMsg(done); reload(); } catch (e) { setOk(false); setMsg(e instanceof Error ? e.message : 'Қате'); } setBusy(false); };
  const give = () => run(async () => { await st.giveLoan(me, d, i, Number(qty), who, name, purpose, due); setWho(''); setName(''); setPurpose(''); setDue(''); setQty('1'); }, 'Жабдық берілді');
  const who_ = (l: st.Loan) => (l.borrower_id ? d.people[l.borrower_id] ?? 'Қолданушы' : l.borrower_name ?? '—') + (l.borrower_id && l.borrower_name ? ` (${l.borrower_name})` : '');
  const people = Object.entries(d.people).sort((a, b) => a[1].localeCompare(b[1], 'kk'));
  return (
    <div className="space-y-3">
      <Button variant="ghost" onClick={back}><ArrowLeft size={16} aria-hidden="true" />{room.name}</Button>
      <Note msg={msg} ok={ok} />
      <Card className="grid gap-4 p-4 md:grid-cols-[16rem_1fr]">
        <div className="h-48 overflow-hidden rounded-lg border border-border md:h-full md:min-h-[12rem]"><Photo url={i.photo_url} alt={i.name} /></div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{i.name}</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {[['Инвентарь нөмірі', i.inv_no ?? '—'], ['Саны', `${i.qty} дана`], ['Түрі', st.KIND_NAMES[i.kind]], ['Алынған жылы', i.acquired_year ? `${i.acquired_year}` : '—'], ['Бағасы (1 дана)', i.price != null ? st.money(i.price, i.currency) : '—'],
              ['Жалпы құны', i.price != null ? st.money(i.price * i.qty, i.currency) : '—'], ['Бос', `${free}`], ['Берілген', `${st.onLoan(d, i.id)}`], ['Ақаулы', `${i.broken}`]].map(([k, v]) => <div key={k}><dt className="text-text-secondary">{k}</dt><dd className="font-medium">{v}</dd></div>)}
          </dl>
          {i.defect && <p className="flex items-start gap-1 rounded-md bg-warning-soft px-2 py-1 text-sm text-warning"><TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />{i.defect}</p>}
          {i.note && <p className="text-sm text-text-secondary">{i.note}</p>}
        </div>
      </Card>
      {mgr && (
        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">Қолдануға беру</h3>
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
            <Field label="Кімге">{x => <select id={x} className={inputCls} value={who} onChange={e => setWho(e.target.value)}><option value="">Басқа адам (атын жазамын)</option>{people.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>}</Field>
            <Field label="Саны">{x => <input id={x} type="number" inputMode="numeric" min={1} max={Math.max(free, 1)} className={inputCls} value={qty} onChange={e => setQty(e.target.value)} />}</Field>
            <Field label="Қайтару мерзімі">{x => <input id={x} type="date" min={st.todayIso()} className={inputCls} value={due} onChange={e => setDue(e.target.value)} />}</Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={who ? 'Ескертпе (сынып, топ)' : 'Аты-жөні / сынып'}>{x => <input id={x} className={inputCls} maxLength={80} value={name} onChange={e => setName(e.target.value)} />}</Field>
            <Field label="Мақсаты">{x => <input id={x} className={inputCls} maxLength={200} value={purpose} onChange={e => setPurpose(e.target.value)} />}</Field>
          </div>
          <Button onClick={give} loading={busy} disabled={free < 1}>{free < 1 ? 'Бос жабдық жоқ' : 'Беру'}</Button>
        </Card>
      )}
      <Card className="space-y-2 p-4">
        <h3 className="font-semibold">Қолданушылар тарихы <Chip>{loans.length}</Chip></h3>
        {loans.length === 0 ? <p className="text-sm text-text-secondary">Әзірге ешкімге берілмеген.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="text-text-secondary"><tr><th className="py-1 pr-3">Кім</th><th className="pr-3">Саны</th><th className="pr-3">Берілді</th><th className="pr-3">Мерзімі</th><th className="pr-3">Қайтарылды</th><th>Мақсаты</th><th /></tr></thead>
            <tbody>{loans.map(l => {
              const late = !l.returned_on && !!l.due_on && l.due_on < st.todayIso();
              return <tr key={l.id} className="border-t border-border align-top">
                <td className="py-2 pr-3 font-medium">{who_(l)}</td><td className="pr-3">{l.qty}</td><td className="pr-3">{dmy(l.given_on)}</td>
                <td className="pr-3">{l.due_on ? dmy(l.due_on) : '—'}</td>
                <td className="pr-3">{l.returned_on ? dmy(l.returned_on) : <Chip tone={late ? 'warn' : 'accent'}>{late ? 'Кешікті' : 'Қолында'}</Chip>}</td>
                <td className="text-text-secondary">{l.purpose}</td>
                <td>{mgr && !l.returned_on && <Button variant="secondary" loading={busy} onClick={() => run(() => st.returnLoan(l.id), 'Қайтарылды деп белгіленді')}>Қайтарылды</Button>}</td></tr>;
            })}</tbody></table></div>
        )}
      </Card>
    </div>
  );
}

function RoomCard({ d, r, open }: { d: Data; r: Room; open: () => void }) {
  const its = itemsOf(d, r.id), lap = its.filter(i => i.kind === 'laptop').reduce((a, i) => a + i.qty, 0);
  return (
    <article className="flex h-full flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold"><DoorOpen size={20} aria-hidden="true" className="shrink-0 text-on-accent-soft" /><span className="min-w-0 truncate">{r.name}</span></h3>
      <p className="line-clamp-2 min-h-[2.5rem] text-sm text-text-secondary">{r.description}</p>
      <p className="truncate text-sm text-text-secondary">Жауапты: {r.responsible_id ? d.people[r.responsible_id] ?? '—' : '—'}</p>
      <div className="flex flex-wrap gap-1"><Chip><Wrench size={12} aria-hidden="true" className="mr-1" />{its.length} жабдық</Chip>{lap > 0 && <Chip><Laptop size={12} aria-hidden="true" className="mr-1" />{lap} ноутбук</Chip>}{its.some(i => i.broken > 0) && <Chip tone="warn"><TriangleAlert size={12} aria-hidden="true" className="mr-1" />{its.reduce((q, i) => q + i.broken, 0)} ақаулы</Chip>}</div>
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
  const room = mode.k === 'list' || mode.k === 'item' || (mode.k === 'edit' && !mode.id) ? undefined : d.rooms.find(r => r.id === (mode as { id: string }).id);
  if (mode.k === 'edit') return <RoomEdit me={me} d={d} id={mode.id} done={rid => back(rid)} />;
  if (mode.k === 'book' && room) return <Book me={me} d={d} room={room} done={m => back(room.id, m)} />;
  const item = mode.k === 'item' ? d.items.find(x => x.id === mode.id) : undefined;
  const iroom = item ? d.rooms.find(r => r.id === item.room_id) : undefined;
  if (item && iroom) return <ItemPage me={me} d={d} i={item} room={iroom} back={() => back(iroom.id)} reload={reload} />;
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
          {its.length === 0 ? <p className="text-sm text-text-secondary">Жабдық тізімі бос.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{its.map(i => <ItemCard key={i.id} d={d} i={i} open={() => setMode({ k: 'item', id: i.id })} />)}</div>}
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
