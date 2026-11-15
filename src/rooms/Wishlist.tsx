import React, { useState } from 'react';
import { ExternalLink, Plus, Printer, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { Chip } from '../contests/ui';
import * as st from './store';
import type { Data, Me, Wish, WishForm } from './store';
import { Note, Photo, PhotoPick } from './parts';

const PRIO: Record<number, { name: string; hue: number }> = { 1: { name: '1-санат · шұғыл', hue: 8 }, 2: { name: '2-санат · маңызды', hue: 38 }, 3: { name: '3-санат · қалауымша', hue: 175 }, 4: { name: '4-санат · кейінірек', hue: 250 } };
const PrioChip = ({ p }: { p: number }) => { const h = PRIO[p]?.hue ?? 250; return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: `hsl(${h} 80% 92%)`, color: `hsl(${h} 60% 26%)` }}>{PRIO[p]?.name ?? `${p}-санат`}</span>; };
const open = (w: Wish) => w.status === 'planned' || w.status === 'ordered';

export function WishCard({ w, edit, canEdit }: { w: Wish; edit: () => void; canEdit: boolean }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface">
      <div className="h-36 shrink-0"><Photo url={w.photo_url} alt={w.name} /></div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap gap-1"><PrioChip p={w.priority} /><Chip tone={w.status === 'received' ? 'ok' : w.status === 'ordered' ? 'accent' : 'plain'}>{st.WISH_STATUS[w.status]}</Chip></div>
        <h4 className="line-clamp-2 min-h-[2.5rem] font-semibold leading-tight">{w.name}</h4>
        {w.description && <p className="line-clamp-2 text-sm text-text-secondary">{w.description}</p>}
        <p className="text-sm text-text-secondary">{st.money(w.price, w.currency)} × {w.qty}{w.delivery > 0 && ` + доставка ${st.money(w.delivery, w.currency)}`}</p>
        <p className="text-lg font-bold">{st.money(st.wishCost(w), w.currency)}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {w.link && <a href={w.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-border-input px-3 text-sm font-medium text-on-accent-soft"><ExternalLink size={14} aria-hidden="true" />Сілтеме<span className="sr-only"> ({w.name}, жаңа бетте ашылады)</span></a>}
          {canEdit && <Button variant="secondary" onClick={edit} aria-label={`Өзгерту: ${w.name}`}>Өзгерту</Button>}
        </div>
      </div>
    </article>
  );
}

export function WishEdit({ me, d, w, done, room }: { me: Me; d: Data; w: Wish | null; done: (msg?: string) => void; room?: string }) {
  const [f, setF] = useState<WishForm>(() => w ? { id: w.id, name: w.name, description: w.description ?? '', price: String(w.price), currency: w.currency, qty: String(w.qty), delivery: w.delivery ? String(w.delivery) : '', priority: String(w.priority), link: w.link ?? '', photo_url: w.photo_url ?? '', note: w.note ?? '', status: w.status, room_id: w.room_id ?? '' } : { ...st.blankWish(), room_id: room ?? '' });
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [ask, setAsk] = useState(false);
  const set = (p: Partial<WishForm>) => setF({ ...f, ...p });
  const run = async (fn: () => Promise<void>, ok: string) => { setBusy(true); setMsg(''); try { await fn(); done(ok); } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); setAsk(false); setBusy(false); } };
  const cost = st.validateWish(f) ? null : st.wishCost({ price: st.num(f.price) as number, qty: Number(f.qty), delivery: st.num(f.delivery) ?? 0 });
  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">{w ? 'Өзгерту' : 'Сатып алу тізіміне қосу'}</h2>
      <PhotoPick me={me} value={f.photo_url} onChange={u => set({ photo_url: u })} label="Жабдық суреті" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Атауы">{x => <input id={x} className={inputCls} maxLength={120} value={f.name} onChange={e => set({ name: e.target.value })} />}</Field>
        <Field label="Сипаттама">{x => <input id={x} className={inputCls} maxLength={300} value={f.description} onChange={e => set({ description: e.target.value })} />}</Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Бағасы (1 дана)">{x => <input id={x} inputMode="decimal" className={inputCls} value={f.price} onChange={e => set({ price: e.target.value })} />}</Field>
        <Field label="Валюта">{x => <select id={x} className={inputCls} value={f.currency} onChange={e => set({ currency: e.target.value as st.Cur })}>{Object.entries(st.CUR).map(([k, v]) => <option key={k} value={k}>{k} {v}</option>)}</select>}</Field>
        <Field label="Саны">{x => <input id={x} type="number" inputMode="numeric" min={1} max={1000} className={inputCls} value={f.qty} onChange={e => set({ qty: e.target.value })} />}</Field>
        <Field label="Доставка (жалпы)">{x => <input id={x} inputMode="decimal" placeholder="0" className={inputCls} value={f.delivery} onChange={e => set({ delivery: e.target.value })} />}</Field>
        <Field label="Санат">{x => <select id={x} className={inputCls} value={f.priority} onChange={e => set({ priority: e.target.value })}>{Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>}</Field>
      </div>
      <p className="text-sm">Жалпы құны: <b>{cost === null ? '—' : st.money(cost, f.currency)}</b> <span className="text-text-secondary">(баға × саны + доставка)</span></p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Күйі">{x => <select id={x} className={inputCls} value={f.status} onChange={e => set({ status: e.target.value as st.WishStatus })}>{Object.entries(st.WISH_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
        <Field label="Қай кабинетке">{x => <select id={x} className={inputCls} value={f.room_id} onChange={e => set({ room_id: e.target.value })}><option value="">Белгісіз</option>{d.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}</Field>
        <Field label="Сілтеме (дүкен, https://…)">{x => <input id={x} type="url" className={inputCls} maxLength={500} value={f.link} onChange={e => set({ link: e.target.value })} />}</Field>
      </div>
      <Field label="Ескертпе">{x => <input id={x} className={inputCls} maxLength={300} value={f.note} onChange={e => set({ note: e.target.value })} />}</Field>
      <Note msg={msg} ok={false} />
      <div className="flex flex-wrap gap-2">
        <Button loading={busy} onClick={() => run(() => st.saveWish(me, f), 'Сақталды')}>Сақтау</Button>
        <Button variant="secondary" onClick={() => done()}>Бас тарту</Button>
        {w && (ask ? <><Button variant="danger" loading={busy} onClick={() => run(() => st.deleteWish(w.id), 'Өшірілді')}>Иә, өшіру</Button><Button variant="secondary" onClick={() => setAsk(false)}>Жоқ</Button></> : <Button variant="ghost" onClick={() => setAsk(true)}><Trash2 size={16} aria-hidden="true" />Өшіру</Button>)}
      </div>
    </Card>
  );
}

const Totals = ({ rows, label }: { rows: Wish[]; label: string }) => <p className="text-sm"><span className="text-text-secondary">{label}: </span><b>{st.moneyMap(st.sumBy(rows, w => w.currency, st.wishCost))}</b></p>;

/** Wishes grouped by room (rooms in their own order, "no room" last), each group with its own total. */
function byRoom(d: Data, rows: Wish[]) {
  const g = d.rooms.map(r => ({ id: r.id, name: r.name, rows: rows.filter(w => w.room_id === r.id) }));
  g.push({ id: '', name: 'Кабинет белгісіз', rows: rows.filter(w => !w.room_id || !d.rooms.some(r => r.id === w.room_id)) });
  return g.filter(x => x.rows.length);
}

export function WishlistView({ me }: { me: Me }) {
  const { data: d, error, loading, reload } = useLoad(() => st.loadAll(me), [me.id]);
  const [edit, setEdit] = useState<Wish | 'new' | null>(null), [note, setNote] = useState(''), [prio, setPrio] = useState(''), [hideDone, setHideDone] = useState(true), [sponsor, setSponsor] = useState(false);
  if (loading && !d) return <Skeleton rows={3} />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!d) return null;
  if (edit) return <WishEdit me={me} d={d} w={edit === 'new' ? null : edit} done={m => { setNote(m ?? ''); setEdit(null); reload(); }} />;
  const rows = d.wishes.filter(w => (!prio || String(w.priority) === prio) && (!hideDone || open(w)));
  const modes = [[false, 'Тізім'], [true, 'Демеушіге көрсету']] as const;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div role="group" aria-label="Көрініс" className="inline-flex rounded-lg bg-surface-2 p-1">
          {modes.map(([k, label]) => <button key={label} type="button" aria-pressed={sponsor === k} onClick={() => setSponsor(k)} className={`min-h-[40px] rounded-md px-3 text-sm font-medium ${sponsor === k ? 'bg-surface text-on-accent-soft shadow-card' : 'text-text-secondary'}`}>{label}</button>)}
        </div>
        {!sponsor && <Button onClick={() => setEdit('new')}><Plus size={16} aria-hidden="true" />Қосу</Button>}
      </div>
      {sponsor ? <SponsorBody d={d} /> : <>
        <div className="space-y-0.5"><Totals rows={d.wishes.filter(open)} label="Жоспардағы жалпы сома" /><p className="text-xs text-text-secondary">Валюталар бір-біріне айналдырылмайды: әр валюта жеке қосылады.</p></div>
        <Note msg={note} ok />
        <div className="flex flex-wrap items-center gap-3">
          <select aria-label="Санат" className={inputCls + ' !w-auto'} value={prio} onChange={e => setPrio(e.target.value)}><option value="">Барлық санат</option>{Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
          <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />Алынған және бас тартылғандарды жасыру</label>
          <span className="text-sm text-text-secondary">{rows.length} зат</span>
        </div>
        {rows.length === 0 ? <EmptyState text="Тізім бос. Қажет жабдықты қосыңыз." /> : byRoom(d, rows).map(g => (
          <section key={g.id || 'none'} aria-label={g.name} className="space-y-2">
            <h2 className="flex flex-wrap items-baseline gap-x-3 border-b border-border pb-1 text-base font-semibold">{g.name}<span className="text-sm font-normal text-text-secondary">{g.rows.length} зат · {st.moneyMap(st.sumBy(g.rows.filter(open), w => w.currency, st.wishCost))}</span></h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{g.rows.map(w => <WishCard key={w.id} w={w} canEdit edit={() => setEdit(w)} />)}</div>
          </section>))}
      </>}
    </div>
  );
}

// ---------- sponsor view: clean, print-ready ----------
const Block = ({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) => (
  <section className="space-y-3 break-inside-avoid-page"><div className="border-b border-border pb-1"><h2 className="text-xl font-bold">{title}</h2>{sub && <div className="text-sm text-text-secondary">{sub}</div>}</div>{children}</section>
);

function SponsorBody({ d }: { d: Data }) {
  const [showHave, setShowHave] = useState(true), [showBuy, setShowBuy] = useState(true), [maxP, setMaxP] = useState('4');
  const buy = d.wishes.filter(w => open(w) && w.priority <= Number(maxP));
  const have = d.items.filter(i => i.qty > 0);
  const units = have.reduce((a, i) => a + i.qty, 0), broken = have.reduce((a, i) => a + i.broken, 0);
  const value = st.sumBy(have.filter(i => i.price != null), i => i.currency, i => (i.price as number) * i.qty);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={showHave} onChange={e => setShowHave(e.target.checked)} />Бізде бар</label>
        <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={showBuy} onChange={e => setShowBuy(e.target.checked)} />Сатып алу керек</label>
        <select aria-label="Санатқа дейін" className={inputCls + ' !w-auto'} value={maxP} onChange={e => setMaxP(e.target.value)}>{[1, 2, 3, 4].map(p => <option key={p} value={p}>{p === 4 ? 'Барлық санат' : `${p}-санатқа дейін`}</option>)}</select>
        <Button className="ml-auto" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Басып шығару / PDF</Button>
      </div>
      <div id="print-area" className="space-y-8 rounded-xl border border-border bg-surface p-5 sm:p-8">
        <header className="space-y-1"><h1 className="text-2xl font-bold sm:text-3xl">Кабинет жабдығы және сатып алу жоспары</h1><p className="text-text-secondary">{new Date().toLocaleDateString('ru-RU')}</p></header>
        {showHave && (
          <Block title="Бізде бар" sub={<>{d.rooms.length} кабинет · {units} дана{broken > 0 && ` (оның ${broken} ақаулы)`} · құны: {st.moneyMap(value)}</>}>
            {d.rooms.filter(r => have.some(i => i.room_id === r.id)).map(r => (
              <div key={r.id} className="space-y-2"><h3 className="font-semibold">{r.name}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">{have.filter(i => i.room_id === r.id).map(i => (
                  <article key={i.id} className="flex break-inside-avoid gap-3 rounded-lg border border-border p-2">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-md"><Photo url={i.photo_url} alt={i.name} /></div>
                    <div className="min-w-0 text-sm"><p className="line-clamp-2 font-semibold leading-tight">{i.name}</p><p className="text-text-secondary">{i.qty} дана{i.acquired_year ? ` · ${i.acquired_year} ж.` : ''}</p>
                      <p className={i.broken ? 'text-warning' : 'text-success'}>{i.broken ? `${i.broken} ақаулы` : 'Жұмыс істейді'}</p></div>
                  </article>))}</div></div>))}
          </Block>
        )}
        {showBuy && (
          <Block title="Сатып алу керек" sub={<>{buy.length} зат · жалпы сома: <b className="text-text">{st.moneyMap(st.sumBy(buy, w => w.currency, st.wishCost))}</b></>}>
            {buy.length === 0 && <p className="text-sm text-text-secondary">Тізім бос.</p>}
            {byRoom(d, buy).map(g => (
              <div key={g.id || 'none'} className="space-y-2"><h3 className="flex flex-wrap items-baseline gap-x-3 font-semibold">{g.name}<span className="text-sm font-normal text-text-secondary">{st.moneyMap(st.sumBy(g.rows, w => w.currency, st.wishCost))}</span></h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">{[...g.rows].sort((x, y) => x.priority - y.priority).map(w => (
                  <article key={w.id} className="flex break-inside-avoid gap-3 rounded-lg border border-border p-2">
                    <div className="h-24 w-28 shrink-0 overflow-hidden rounded-md"><Photo url={w.photo_url} alt={w.name} /></div>
                    <div className="min-w-0 space-y-0.5 text-sm"><PrioChip p={w.priority} /><p className="line-clamp-2 font-semibold leading-tight">{w.name}</p>{w.description && <p className="line-clamp-1 text-text-secondary">{w.description}</p>}
                      <p className="text-text-secondary">{st.money(w.price, w.currency)} × {w.qty}{w.delivery > 0 && ` + доставка ${st.money(w.delivery, w.currency)}`}</p><p className="font-bold">{st.money(st.wishCost(w), w.currency)}</p></div>
                  </article>))}</div></div>))}
            <p className="text-xs text-text-secondary">Валюталар бір-біріне айналдырылмайды. Баға — құжаттағы бағалау, нақты баға жеткізушіге байланысты.</p>
          </Block>
        )}
      </div>
    </div>
  );
}
