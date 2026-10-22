import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { Chips } from '../ui/Chips';
import { ClassChips, QuarterChips, useFilters } from '../lessons/Filters';
import { currentQuarter, schoolYear } from '../lessons/model';
import { KINDS, gradeOfPoints, kindOf, maxOk, percents, quarter, thresholds } from './grades';
import type { Kind } from './grades';
import { addCol, delCol, loadBook, loadClasses, mkey, setMark } from './store';
import type { Book, Col, Me } from './store';

const DEFAULT_MAX: Record<Kind, number> = { kb: 10, bzb: 15, tzb: 25 };
const MAX_HINT: Record<Kind, string> = { kb: '1–100', bzb: '7–20', tzb: '25 немесе 30' };
const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
const pct = (x: number | null) => (x === null ? '—' : Math.round(x) + '%');
const GRADE_CLS: Record<number, string> = { 5: 'bg-success-soft text-success', 4: 'bg-accent-soft text-accent', 3: 'bg-surface-2 text-text', 2: 'bg-danger-soft text-danger' };
const Grade = ({ g, label }: { g: number; label?: string }) => <span aria-label={label} className={`inline-flex min-w-[2rem] justify-center rounded-md px-2 py-0.5 text-sm font-bold ${GRADE_CLS[g]}`}>{g}</span>;

/** One mark. Commits on blur or Enter; an empty cell means "not assessed", 0 is a real zero. */
function Cell({ value, max, label, onCommit, onBad }: { value: number | undefined; max: number; label: string; onCommit: (v: number | null) => void; onBad: (m: string) => void }) {
  const [v, setV] = useState(value === undefined ? '' : String(value));
  const [bad, setBad] = useState(false);
  useEffect(() => { setV(value === undefined ? '' : String(value)); setBad(false); }, [value]);
  const commit = () => {
    if (v.trim() === '') { setBad(false); if (value !== undefined) onCommit(null); return; }
    const n = Number(v.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > max || (n * 2) % 1 !== 0) { setBad(true); onBad(`${label}: ұпай 0 мен ${max} аралығында болуы керек (0,5 қадаммен)`); return; }
    setBad(false);
    if (n !== value) onCommit(n);
  };
  return <input value={v} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    inputMode="decimal" aria-label={label} aria-invalid={bad || undefined}
    className={`h-10 w-14 rounded-md border bg-surface text-center text-text ${bad ? 'border-danger' : 'border-border-input'}`} />;
}

function AddColumn({ busy, count, onAdd }: { busy: boolean; count: Record<Kind, number>; onAdd: (c: { kind: Kind; title: string; held_on: string; max_points: number }) => void }) {
  const [kind, setKind] = useState<Kind>('kb');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [max, setMax] = useState(String(DEFAULT_MAX.kb));
  const [err, setErr] = useState('');
  const pick = (k: Kind) => { setKind(k); setMax(String(DEFAULT_MAX[k])); setErr(''); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = Number(max);
    if (!maxOk(kind, m)) return setErr(`${kindOf(kind).short} үшін ең жоғары ұпай: ${MAX_HINT[kind]}`);
    if (!date) return setErr('Күнін көрсетіңіз');
    setErr(''); onAdd({ kind, title: title.trim() || `${kindOf(kind).short} ${count[kind] + 1}`, held_on: date, max_points: m }); setTitle('');
  };
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Баған қосу</h2>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Chips legend="Түрі" name="kind" value={kind} onChange={v => pick(v as Kind)} options={KINDS.map(x => ({ v: x.k, label: `${x.short} · ${x.full}` }))} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Атауы">{id => <input id={id} className={inputCls} value={title} maxLength={80} placeholder={`${kindOf(kind).short} ${count[kind] + 1}`} onChange={e => setTitle(e.target.value)} />}</Field>
          <Field label="Күні">{id => <input id={id} type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />}</Field>
          <Field label={`Ең жоғары ұпай (${MAX_HINT[kind]})`} error={err}>{id => <input id={id} inputMode="numeric" className={inputCls} value={max} onChange={e => setMax(e.target.value)} aria-invalid={!!err || undefined} />}</Field>
        </div>
        <Button type="submit" loading={busy}>Қосу</Button>
      </form>
    </Card>
  );
}

export function Gradebook({ me }: { me: Me }) {
  const classes = useLoad(loadClasses, []);
  const [f, set] = useFilters();
  const q = f.q || currentQuarter(), year = schoolYear(new Date());
  const cls = f.cls || classes.data?.[0]?.id || '';
  const book = useLoad<Book | null>(() => (cls ? loadBook(me, cls, year, q) : Promise.resolve(null)), [cls, q, me.id]);
  const [cols, setCols] = useState<Col[]>([]);
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<Col | null>(null);
  useEffect(() => { if (book.data) { setCols(book.data.cols); setMarks(book.data.marks); setMsg(''); setAsk(null); } }, [book.data]);

  const sorted = [...cols].sort((a, b) => KINDS.findIndex(k => k.k === a.kind) - KINDS.findIndex(k => k.k === b.kind) || a.held_on.localeCompare(b.held_on) || a.title.localeCompare(b.title, 'kk', { numeric: true }));
  const count = { kb: 0, bzb: 0, tzb: 0 } as Record<Kind, number>;
  cols.forEach(c => count[c.kind]++);
  const students = book.data?.students || [];
  const fail = (e: unknown) => setMsg(e instanceof Error ? e.message : 'Қате');

  const mark = async (col: Col, stu: string, v: number | null) => {
    const k = mkey(col.id, stu), prev = marks[k];
    setMarks(m => { const n = { ...m }; if (v === null) delete n[k]; else n[k] = v; return n; }); setMsg('');
    try { await setMark(me, col.id, stu, v); } catch (e) { setMarks(m => { const n = { ...m }; if (prev === undefined) delete n[k]; else n[k] = prev; return n; }); fail(e); }
  };
  const add = async (c: { kind: Kind; title: string; held_on: string; max_points: number }) => {
    setBusy(true); setMsg('');
    try { const col = await addCol(me, { ...c, class_id: cls, school_year: year, quarter: q }); setCols(x => [...x, col]); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const remove = async (col: Col) => {
    setAsk(null);
    try { await delCol(me, col.id); setCols(x => x.filter(c => c.id !== col.id)); setMarks(m => Object.fromEntries(Object.entries(m).filter(([k]) => !k.startsWith(col.id + '|')))); } catch (e) { fail(e); }
  };

  const result = (stu: string) => {
    const p = percents(sorted.map(c => ({ kind: c.kind, max: c.max_points, points: marks[mkey(c.id, stu)] ?? null })));
    return { p, r: quarter(p) };
  };
  const groups = KINDS.map(k => ({ ...k, cols: sorted.filter(c => c.kind === k.k) })).filter(g => g.cols.length);

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Сынып журналы</h1>
      {classes.error && <ErrorBox message={classes.error} onRetry={classes.reload} />}
      <Card className="space-y-3">
        {classes.data && <ClassChips f={{ ...f, cls }} set={set} classes={classes.data} all={false} />}
        <QuarterChips f={{ ...f, q }} set={set} all={false} />
      </Card>
      {book.data?.local && <p role="note" className="rounded-lg bg-surface-2 p-3 text-sm text-text-secondary">Баға тек осы браузерде сақталады: дерекқорда журнал кестелері әлі жоқ (007_gradebook.sql іске қосылмаған).</p>}
      <p role="status" aria-live="polite" className={msg ? 'rounded-lg bg-danger-soft p-3 text-sm text-danger' : 'sr-only'}>{msg}</p>
      {book.error && <ErrorBox message={book.error} onRetry={book.reload} />}
      {book.loading && !book.data && <Skeleton />}
      {book.data && students.length === 0 && <EmptyState text="Бұл сыныпта әлі оқушы жоқ. Оқушылар «Журнал › Сыныптар» арқылы қосылады." />}
      {book.data && students.length > 0 && (
        <>
          {cols.length === 0 && <EmptyState text="Бұл тоқсанда баған жоқ. Төмендегі форма арқылы алғашқы ҚБ, БЖБ немесе ТЖБ бағанын қосыңыз." />}
          {cols.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">{`Сынып журналы, ${q}-тоқсан: әр оқушының ұпайлары мен тоқсандық бағасы`}</caption>
                <thead className="bg-surface-2 text-text-secondary">
                  <tr>
                    <td rowSpan={2} className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-left align-bottom font-semibold">Оқушы</td>
                    {groups.map(g => <th key={g.k} scope="colgroup" colSpan={g.cols.length} className="border-l border-border px-2 py-1 text-center" title={g.full}>{g.short}</th>)}
                    <th scope="colgroup" colSpan={5} className="border-l border-border px-2 py-1 text-center">Тоқсан</th>
                  </tr>
                  <tr>
                    {groups.flatMap(g => g.cols.map(c => (
                      <th key={c.id} scope="col" className="border-l border-border px-2 py-1 align-top font-normal">
                        <div className="flex items-start justify-center gap-1">
                          <span className="min-w-0 text-center"><span className="block font-semibold text-text break-words">{c.title}</span>
                            <span className="block text-xs">{dm(c.held_on)} · max {c.max_points}</span>
                            {c.kind !== 'kb' && <span className="block text-xs">{(() => { const [a, b, d] = thresholds(c.max_points); return `3≥${a} · 4≥${b} · 5≥${d}`; })()}</span>}
                          </span>
                          <button type="button" aria-label={`${c.title}: бағанды өшіру`} onClick={() => setAsk(c)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-border"><Trash2 size={14} aria-hidden="true" /></button>
                        </div>
                      </th>
                    )))}
                    {['ҚБ', 'БЖБ', 'ТЖБ', 'Барлығы', 'Баға'].map(h => <th key={h} scope="col" className="border-l border-border px-2 py-1 text-center font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const { p, r } = result(s.id);
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-1 text-left font-medium">{s.full_name}</th>
                        {sorted.map(c => {
                          const v = marks[mkey(c.id, s.id)];
                          return (
                            <td key={c.id} className="border-l border-border px-2 py-1">
                              <div className="flex items-center justify-center gap-1">
                                <Cell value={v} max={c.max_points} label={`${s.full_name}: ${c.title}`} onCommit={x => mark(c, s.id, x)} onBad={setMsg} />
                                {c.kind !== 'kb' && v !== undefined && <Grade g={gradeOfPoints(v, c.max_points)} label={`баға ${gradeOfPoints(v, c.max_points)}`} />}
                              </div>
                            </td>
                          );
                        })}
                        {(['kb', 'bzb', 'tzb'] as Kind[]).map(k => <td key={k} className="border-l border-border px-2 py-1 text-center">{pct(p[k])}</td>)}
                        <td className="border-l border-border px-2 py-1 text-center font-semibold">{r ? pct(r.pct) : '—'}</td>
                        <td className="border-l border-border px-2 py-1 text-center">{r ? <span className="inline-flex items-center gap-1"><Grade g={r.grade} />{r.provisional && <span className="text-xs text-text-muted">уақытша</span>}</span> : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {ask && (
            <div role="alertdialog" aria-label="Бағанды өшіру" className="flex flex-wrap items-center gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
              <span>«{ask.title}» бағаны және ондағы барлық ұпай өшіріледі. Жалғастырасыз ба?</span>
              <Button variant="danger" onClick={() => remove(ask)}>Өшіру</Button>
              <Button variant="secondary" onClick={() => setAsk(null)}>Болдырмау</Button>
            </div>
          )}
          <AddColumn busy={busy} count={count} onAdd={add} />
          <p className="text-sm text-text-secondary">Тоқсандық баға = ҚБ 25% + БЖБ 25% + ТЖБ 50%. Пайыз: 0–39% — «2», 40–64% — «3», 65–84% — «4», 85–100% — «5». Бос ұяшық — «бағаланбады», ал 0 — нақты нөл. Бір бөлік (мысалы ТЖБ) әлі жоқ болса, баға «уақытша» деп белгіленеді.</p>
        </>
      )}
    </main>
  );
}
