import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Printer, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { KINDS, makeQuiz } from './quiz';
import type { Q, QKind } from './quiz';
import * as st from './store';
import { setsAreLocal } from './store';
import type { Base, Me, Term } from './store';

function useBase(me: Me) {
  const q = useLoad(() => st.loadBase(me), [me.id]);
  const [msg, setMsg] = useState(''), [note, setNote] = useState('');
  /** Runs a change, then re-reads everything. Returns true when it worked. */
  const act = async (fn: () => Promise<unknown>, done = ''): Promise<boolean> => {
    setMsg(''); setNote('');
    try { await fn(); q.reload(); setNote(done); return true; } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); return false; }
  };
  return { ...q, msg, note, act, setMsg, setNote };
}
const Shell = ({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) => (
  <main className="mx-auto max-w-4xl space-y-4 p-4"><h1 className="text-2xl font-bold">{title}</h1>{lead && <p className="text-text-secondary">{lead}</p>}{children}</main>
);
const Status = ({ msg, note }: { msg: string; note: string }) => <p role="status" aria-live="polite" className={msg || note ? `rounded-lg p-3 text-sm ${msg ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}` : 'sr-only'}>{msg || note}</p>;
const Local = ({ d }: { d?: Base }) => (d?.local || setsAreLocal()) ? <p role="note" className="rounded-lg bg-surface-2 p-3 text-sm text-text-secondary">Сөздік тек осы браузерде сақталады: дерекқорда кестелер әлі жоқ (011_vocab.sql іске қосылмаған).</p> : null;
const label = (t: Term) => [t.kk, t.ru, t.en].filter(Boolean).join(' · ');
const hit = (t: Term, q: string) => !q.trim() || [t.kk, t.ru, t.en, t.definition].some(x => (x || '').toLowerCase().includes(q.trim().toLowerCase()));

function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-surface-2"><input id={id} type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={checked} onChange={e => onChange(e.target.checked)} /><span className="min-w-0 break-words">{children}</span></label>;
}
function Confirm({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return <div role="alertdialog" aria-label="Растау" className="flex flex-wrap items-center gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger"><span>{text}</span><Button variant="danger" onClick={onYes}>Өшіру</Button><Button variant="secondary" onClick={onNo}>Болдырмау</Button></div>;
}
/** "All terms" or the terms linked to one lesson. */
function SourcePick({ d, value, onChange }: { d: Base; value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Терминдер көзі">{id => (
      <select id={id} className={inputCls} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Барлық терминдер ({d.terms.length})</option>
        {d.lessons.map(l => <option key={l.id} value={l.id}>{l.title} ({d.links.filter(k => k.lesson_id === l.id).length})</option>)}
      </select>)}</Field>
  );
}
const termsOf = (d: Base, source: string) => source ? d.terms.filter(t => d.links.some(l => l.lesson_id === source && l.term_id === t.id)) : d.terms;

export function VocabBase({ me }: { me: Me }) {
  const { data, error, loading, reload, msg, note, act, setMsg } = useBase(me);
  const empty = { kk: '', ru: '', en: '', definition: '', subject: '' };
  const [f, setF] = useState(empty), [edit, setEdit] = useState<string | null>(null), [q, setQ] = useState('');
  const [bulk, setBulk] = useState(''), [ask, setAsk] = useState<Term | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = { kk: f.kk, ru: f.ru, en: f.en, definition: f.definition, subject: f.subject };
    if (await act(() => (edit ? st.updateTerm(me, edit, v) : st.addTerm(me, v)), edit ? 'Термин өзгертілді' : 'Термин қосылды')) { setF({ ...empty, subject: f.subject }); setEdit(null); }
  };
  const start = (t: Term) => { setEdit(t.id); setF({ kk: t.kk, ru: t.ru || '', en: t.en || '', definition: t.definition || '', subject: t.subject || '' }); window.scrollTo({ top: 0 }); };
  const upd = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setF(o => ({ ...o, [k]: e.target.value }));
  const lessonsOf = (t: Term) => data!.links.filter(l => l.term_id === t.id).map(l => data!.lessons.find(x => x.id === l.lesson_id)?.title).filter(Boolean).join(', ');
  const list = data ? data.terms.filter(t => hit(t, q)) : [];
  const doBulk = async () => {
    setMsg('');
    try { const r = await st.importTerms(me, bulk, f.subject); setBulk(''); reload(); setMsgNote(`${r.added} термин қосылды${r.skipped ? `, ${r.skipped} бұрыннан бар` : ''}${r.bad ? `, ${r.bad} жол оқылмады` : ''}`); } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); }
  };
  const [bulkNote, setMsgNote] = useState('');
  return (
    <Shell title="Терминдер базасы" lead="Терминдерді қазақша, орысша және ағылшынша бір рет жазасыз, содан кейін сабаққа байлап, оқушыларға бересіз.">
      <Local d={data} /><Status msg={msg} note={note} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton />}
      <Card className="space-y-3">
        <h2 className="font-semibold">{edit ? 'Терминді өзгерту' : 'Термин қосу'}</h2>
        <form onSubmit={submit} noValidate className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Қазақша (міндетті)">{id => <input id={id} className={inputCls} value={f.kk} maxLength={80} onChange={upd('kk')} />}</Field>
            <Field label="Орысша">{id => <input id={id} className={inputCls} value={f.ru} maxLength={80} onChange={upd('ru')} />}</Field>
            <Field label="Ағылшынша">{id => <input id={id} className={inputCls} value={f.en} maxLength={80} onChange={upd('en')} />}</Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2"><Field label="Анықтама">{id => <input id={id} className={inputCls} value={f.definition} maxLength={300} onChange={upd('definition')} />}</Field></div>
            <Field label="Пән">{id => <input id={id} className={inputCls} value={f.subject} maxLength={60} placeholder="Информатика" onChange={upd('subject')} />}</Field>
          </div>
          <div className="flex flex-wrap gap-2"><Button type="submit">{edit ? 'Сақтау' : 'Қосу'}</Button>{edit && <Button variant="secondary" onClick={() => { setEdit(null); setF(empty); }}>Болдырмау</Button>}</div>
        </form>
        {!edit && (
          <details className="rounded-lg border border-border p-3">
            <summary className="min-h-[44px] cursor-pointer py-2 font-medium">Көп терминді бірден қосу</summary>
            <div className="space-y-2 pt-2">
              <p className="text-sm text-text-secondary">Әр жолға бір термин: <code>қазақша | орысша | ағылшынша | анықтама</code>. Соңғы бағандарды қалдыруға болады. Пән жоғарыдағы «Пән» өрісінен алынады.</p>
              <Field label="Терминдер тізімі">{id => <textarea id={id} rows={5} className={inputCls + ' py-2'} value={bulk} onChange={e => setBulk(e.target.value)} />}</Field>
              <Button variant="secondary" disabled={!bulk.trim()} onClick={doBulk}>Тізімді қосу</Button>
              {bulkNote && <p role="status" className="text-sm text-success">{bulkNote}</p>}
            </div>
          </details>
        )}
      </Card>
      {data && (
        <>
          <Field label="Іздеу">{id => <input id={id} className={inputCls} value={q} placeholder="Термин немесе анықтама" onChange={e => setQ(e.target.value)} />}</Field>
          {data.terms.length === 0 ? <EmptyState text="Әзірге термин жоқ. Жоғарыдағы форма арқылы алғашқысын қосыңыз." /> : (
            <>
              <p className="text-sm text-text-secondary">{list.length === data.terms.length ? `${list.length} термин` : `${list.length} / ${data.terms.length} термин`}</p>
              <ul className="space-y-2">
                {list.map(t => (
                  <li key={t.id}><Card className="flex flex-wrap items-start justify-between gap-2 !p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold break-words">{t.kk}</p>
                      <p className="text-sm text-text-secondary break-words">{[t.ru && `RU: ${t.ru}`, t.en && `EN: ${t.en}`].filter(Boolean).join(' · ') || 'Аудармасы жоқ'}</p>
                      {t.definition && <p className="text-sm break-words">{t.definition}</p>}
                      <p className="text-xs text-text-muted">{[t.subject, lessonsOf(t) && `Сабақтар: ${lessonsOf(t)}`].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="flex">
                      <button type="button" aria-label={`${t.kk}: өзгерту`} onClick={() => start(t)} className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"><Pencil size={16} aria-hidden="true" /></button>
                      <button type="button" aria-label={`${t.kk}: өшіру`} onClick={() => setAsk(t)} className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"><Trash2 size={16} aria-hidden="true" /></button>
                    </div>
                  </Card></li>
                ))}
              </ul>
            </>
          )}
          {ask && <Confirm text={`«${ask.kk}» базадан және оған байланған сабақтардан өшіріледі. Оқушыларға берілген жинақтар өзгермейді. Жалғастырасыз ба?`} onNo={() => setAsk(null)} onYes={() => { const t = ask; setAsk(null); act(() => st.delTerm(me, t.id), 'Термин өшірілді'); }} />}
        </>
      )}
    </Shell>
  );
}

export function VocabLink({ me }: { me: Me }) {
  const { data, error, loading, reload, msg, note, act } = useBase(me);
  const [lesson, setLesson] = useState(''), [sel, setSel] = useState<Set<string>>(new Set()), [q, setQ] = useState('');
  const cur = lesson || data?.lessons[0]?.id || '';
  useEffect(() => { if (data) setSel(new Set(data.links.filter(l => l.lesson_id === cur).map(l => l.term_id))); }, [data, cur]);
  const toggle = (id: string, v: boolean) => setSel(s => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; });
  return (
    <Shell title="Тақырыпқа байлау" lead="Сабақты таңдап, оның терминдерін белгілеңіз. Сақтағанда терминдер сабақтың терминдер тізіміне қосылады: оқушы оларды сабақ кезінде көреді және өз сөздігіне қоса алады.">
      <Local d={data} /><Status msg={msg} note={note} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton />}
      {data && data.lessons.length === 0 && <EmptyState text="Сабақ жоқ. Алдымен «Сабақтар» бөлімінде сабақ жасаңыз." />}
      {data && data.lessons.length > 0 && data.terms.length === 0 && <EmptyState text="Базада термин жоқ. Алдымен «Терминдер базасы» бөліміне термин қосыңыз." />}
      {data && data.lessons.length > 0 && data.terms.length > 0 && (
        <Card className="space-y-3">
          <Field label="Сабақ">{id => <select id={id} className={inputCls} value={cur} onChange={e => setLesson(e.target.value)}>{data.lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>}</Field>
          <Field label="Іздеу">{id => <input id={id} className={inputCls} value={q} onChange={e => setQ(e.target.value)} />}</Field>
          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-medium text-text-secondary">Сабақтың терминдері: {sel.size}</legend>
            {data.terms.filter(t => hit(t, q) || sel.has(t.id)).map(t => <Check key={t.id} id={'lk-' + t.id} checked={sel.has(t.id)} onChange={v => toggle(t.id, v)}>{label(t)}</Check>)}
          </fieldset>
          <Button onClick={() => act(() => st.setLinks(me, cur, [...sel], data.links), 'Сабақтың терминдері сақталды')}>Сақтау</Button>
        </Card>
      )}
    </Shell>
  );
}

export function VocabTest({ me }: { me: Me }) {
  const { data, error, loading, reload } = useBase(me);
  const [source, setSource] = useState(''), [count, setCount] = useState('10'), [kinds, setKinds] = useState<QKind[]>(['def', 'ru', 'en']);
  const [quiz, setQuiz] = useState<Q[] | null>(null), [answers, setAnswers] = useState(false);
  const pool = useMemo(() => (data ? termsOf(data, source) : []), [data, source]);
  const make = () => { setQuiz(makeQuiz(pool, { count: +count, kinds })); setAnswers(false); };
  const toggle = (k: QKind, v: boolean) => setKinds(o => (v ? [...o, k] : o.filter(x => x !== k)));
  return (
    <Shell title="Сөздік тесті" lead="Терминдерден жауап нұсқалары бар тест құрылады. Жауап кілтін қосып, басып шығаруға болады.">
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton />}
      {data && (
        <Card className="space-y-3 print:hidden">
          <SourcePick d={data} value={source} onChange={v => { setSource(v); setQuiz(null); }} />
          <Field label="Сұрақ саны">{id => <select id={id} className={inputCls} value={count} onChange={e => setCount(e.target.value)}>{[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}</select>}</Field>
          <fieldset><legend className="mb-1 text-sm font-medium text-text-secondary">Сұрақ түрлері</legend>{KINDS.map(k => <Check key={k.k} id={'qk-' + k.k} checked={kinds.includes(k.k)} onChange={v => toggle(k.k, v)}>{k.label}</Check>)}</fieldset>
          <p className="text-sm text-text-secondary">Көзде {pool.length} термин. Анықтама → термин сұрағы үшін анықтама, аударма сұрақтары үшін орысша/ағылшынша жазылуы керек; кемінде екі түрлі жауап болуы керек.</p>
          <Button disabled={pool.length < 2 || kinds.length === 0} onClick={make}>Тест құру</Button>
        </Card>
      )}
      {quiz && quiz.length === 0 && <EmptyState text="Бұл терминдерден сұрақ құрылмады: анықтамаларды немесе аудармаларды толтырыңыз." />}
      {quiz && quiz.length > 0 && (
        <section aria-label="Тест" className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Check id="show-ans" checked={answers} onChange={setAnswers}>Жауаптарды көрсету</Check>
            <Button variant="secondary" onClick={make}>Қайта араластыру</Button>
            <Button variant="secondary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Басып шығару</Button>
          </div>
          <ol className="space-y-4">
            {quiz.map((x, i) => (
              <li key={i} className="break-inside-avoid space-y-1">
                <p className="font-medium">{i + 1}. {x.prompt}</p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {x.options.map((o, j) => <li key={j} className={answers && j === x.answer ? 'rounded-md bg-success-soft px-2 py-1 font-semibold text-success' : 'px-2 py-1'}>{'ABCD'[j]}) {o}{answers && j === x.answer && <span className="sr-only"> (дұрыс жауап)</span>}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}
    </Shell>
  );
}

export function VocabShare({ me }: { me: Me }) {
  const { data, error, loading, reload, msg, note, act } = useBase(me);
  const [source, setSource] = useState(''), [title, setTitle] = useState(''), [off, setOff] = useState<Set<string>>(new Set()), [cls, setCls] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<string | null>(null);
  const pool = data ? termsOf(data, source) : [];
  const chosen = pool.filter(t => !off.has(t.id));
  const flip = (set: Set<string>, id: string, v: boolean) => { const n = new Set(set); if (v) n.add(id); else n.delete(id); return n; };
  const name = (id: string) => data?.classes.find(c => c.id === id)?.name || '?';
  const send = async () => {
    const lt = data!.lessons.find(l => l.id === source)?.title;
    if (await act(() => st.createSets(me, [...cls], title.trim() || (lt ? `Сөздік: ${lt}` : 'Сөздік'), chosen), 'Жинақ сыныптарға берілді')) { setTitle(''); setCls(new Set()); }
  };
  return (
    <Shell title="Тарату" lead="Терминдер жинағын сыныпқа бересіз: оқушы оны өзінің «Сөздігім» бөлімінде көреді, карточкамен үйренеді және өзін тексереді. Жинақ көшірме ретінде беріледі: кейін базаны өзгертсеңіз, берілгені өзгермейді.">
      <Local d={data} /><Status msg={msg} note={note} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton />}
      {data && data.terms.length === 0 && <EmptyState text="Базада термин жоқ. Алдымен «Терминдер базасы» бөліміне термин қосыңыз." />}
      {data && data.terms.length > 0 && (
        <Card className="space-y-3">
          <SourcePick d={data} value={source} onChange={v => { setSource(v); setOff(new Set()); }} />
          <Field label="Жинақтың атауы">{id => <input id={id} className={inputCls} value={title} maxLength={80} placeholder="Мысалы: Алгоритмдер" onChange={e => setTitle(e.target.value)} />}</Field>
          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-medium text-text-secondary">Терминдер: {chosen.length} / {pool.length}</legend>
            {pool.length === 0 && <p className="text-sm text-text-muted">Бұл сабаққа термин байланбаған.</p>}
            {pool.map(t => <Check key={t.id} id={'sh-' + t.id} checked={!off.has(t.id)} onChange={v => setOff(s => flip(s, t.id, !v))}>{label(t)}</Check>)}
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-medium text-text-secondary">Сыныптар</legend>
            {data.classes.map(c => <Check key={c.id} id={'cl-' + c.id} checked={cls.has(c.id)} onChange={v => setCls(s => flip(s, c.id, v))}>{c.name}</Check>)}
          </fieldset>
          <Button disabled={!chosen.length || !cls.size} onClick={send}>Сыныптарға тарату</Button>
        </Card>
      )}
      {data && (
        <section aria-label="Берілген жинақтар" className="space-y-2">
          <h2 className="font-semibold">Берілген жинақтар</h2>
          {data.sets.length === 0 ? <p className="text-sm text-text-muted">Әзірге ештеңе берілмеген.</p> : (
            <ul className="space-y-2">
              {data.sets.map(s => (
                <li key={s.id}><Card className="flex flex-wrap items-center justify-between gap-2 !p-3">
                  <span className="min-w-0"><b className="break-words">{s.title}</b><span className="block text-sm text-text-secondary">{name(s.class_id)} · {s.terms.length} термин · {s.created_at.slice(8, 10)}.{s.created_at.slice(5, 7)}</span></span>
                  <button type="button" aria-label={`${s.title} (${name(s.class_id)}): өшіру`} onClick={() => setAsk(s.id)} className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"><Trash2 size={16} aria-hidden="true" /></button>
                </Card></li>
              ))}
            </ul>
          )}
          {ask && <Confirm text="Жинақ сыныптан алынады, оқушы оны көрмейді. Жалғастырасыз ба?" onNo={() => setAsk(null)} onYes={() => { const id = ask; setAsk(null); act(() => st.delSet(me, id), 'Жинақ өшірілді'); }} />}
        </section>
      )}
    </Shell>
  );
}
