import React, { useMemo, useState } from 'react';
import { sb, DEMO } from '../config';
import { Button, Card, EmptyState, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { StudentTerms } from '../views/student';
import { KINDS, makeQuiz } from './quiz';
import type { Q, QKind, VT } from './quiz';
import * as st from './store';
import type { Me, SetRow } from './store';

const OWN = 'own';
const trans = (t: VT) => [t.ru && `RU: ${t.ru}`, t.en && `EN: ${t.en}`].filter(Boolean).join(' · ');
const Wrap = ({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) => (
  <div className="space-y-3"><h2 className="text-lg font-semibold">{title}</h2>{lead && <p className="text-sm text-text-secondary">{lead}</p>}{children}</div>
);

/** Shared sets of my class, plus (signed in) the terms I collected in lessons. */
function useSources(me: Me) {
  return useLoad(async () => {
    const sets = me.class_id ? await st.loadSets(me, false) : [];
    let own: VT[] = [];
    if (!DEMO) {
      const r = await sb.from('cf_my_terms').select('term,definition').order('created_at', { ascending: false });
      if (!r.error) own = (r.data || []).map((x: { term: string; definition: string | null }) => ({ kk: x.term, definition: x.definition || undefined }));
    }
    return { sets, own };
  }, [me.id, me.class_id]);
}
const Source = ({ sets, own, value, onChange }: { sets: SetRow[]; own: VT[]; value: string; onChange: (v: string) => void }) => (
  <Field label="Жинақ">{id => (
    <select id={id} className={inputCls} value={value} onChange={e => onChange(e.target.value)}>
      {sets.map(s => <option key={s.id} value={s.id}>{s.title} ({s.terms.length})</option>)}
      {own.length > 0 && <option value={OWN}>Менің терминдерім ({own.length})</option>}
    </select>)}</Field>
);
const poolOf = (sets: SetRow[], own: VT[], v: string): VT[] => (v === OWN ? own : sets.find(s => s.id === v)?.terms || []);
const none = <EmptyState icon="📖" text="Мұғалім әлі терминдер жинағын бермеген. Сабақта сөздікке қосқан терминдерің де осында шығады." />;

export function StudentVocab({ me }: { me: Me }) {
  const { data, error, loading, reload } = useSources(me);
  const [added, setAdded] = useState<Set<string>>(new Set()), [msg, setMsg] = useState('');
  const add = async (s: SetRow, t: VT) => {
    setMsg('');
    const def = [t.definition, trans(t)].filter(Boolean).join(' · ');
    const { error: e } = await sb.from('cf_my_terms').insert({ student_id: me.id, term: t.kk, definition: def, source: s.title });
    if (e) setMsg(e.message); else setAdded(a => new Set(a).add(s.id + '|' + t.kk));
  };
  return (
    <Wrap title="Терминдерім" lead="Мұғалім берген жинақтар мен сабақта өзің жинаған терминдер.">
      {loading && !data && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {msg && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{msg}</p>}
      {data && data.sets.length === 0 && none}
      {data?.sets.map(s => (
        <Card key={s.id} className="space-y-2">
          <h3 className="font-semibold break-words">{s.title} <span className="text-sm font-normal text-text-muted">· {s.terms.length} термин</span></h3>
          <ul className="space-y-2">
            {s.terms.map(t => (
              <li key={t.kk} className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1"><p className="font-medium break-words">{t.kk}</p>
                  <p className="text-sm text-text-secondary break-words">{[trans(t), t.definition].filter(Boolean).join(' · ')}</p></div>
                <Button variant="secondary" disabled={!!DEMO || added.has(s.id + '|' + t.kk)} onClick={() => add(s, t)} aria-label={`${t.kk}: өз сөздігіме қосу`}>
                  {added.has(s.id + '|' + t.kk) ? 'Қосылды' : 'Қосу'}</Button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      {!DEMO && <StudentTerms />}
    </Wrap>
  );
}

export function StudentCards({ me }: { me: Me }) {
  const { data, error, loading, reload } = useSources(me);
  const [src, setSrc] = useState(''), [i, setI] = useState(0), [open, setOpen] = useState(false), [order, setOrder] = useState<number[] | null>(null);
  const cur = src || data?.sets[0]?.id || (data?.own.length ? OWN : '');
  const pool = data ? poolOf(data.sets, data.own, cur) : [];
  const seq = order && order.length === pool.length ? order : pool.map((_, k) => k);
  const t = pool[seq[Math.min(i, pool.length - 1)]];
  const go = (d: number) => { setI(k => (k + d + pool.length) % pool.length); setOpen(false); };
  const shuffle = () => { const a = pool.map((_, k) => k); for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; } setOrder(a); setI(0); setOpen(false); };
  return (
    <Wrap title="Карточкалар" lead="Терминді оқы, жауабын ойла, сосын «Көрсету» батырмасын бас.">
      {loading && !data && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && !cur && none}
      {data && cur && (
        <>
          <Source sets={data.sets} own={data.own} value={cur} onChange={v => { setSrc(v); setI(0); setOrder(null); setOpen(false); }} />
          {t && (
            <Card className="space-y-3 text-center">
              <p className="text-sm text-text-muted">{Math.min(i, pool.length - 1) + 1} / {pool.length}</p>
              <p className="text-2xl font-bold break-words">{t.kk}</p>
              <div aria-live="polite" className="min-h-[3rem] space-y-1">
                {open ? <>{trans(t) && <p>{trans(t)}</p>}{t.definition && <p className="text-text-secondary break-words">{t.definition}</p>}{!trans(t) && !t.definition && <p className="text-text-muted">Бұл терминнің аудармасы жоқ.</p>}</> : null}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => go(-1)}>Алдыңғы</Button>
                <Button onClick={() => setOpen(o => !o)}>{open ? 'Жасыру' : 'Көрсету'}</Button>
                <Button variant="secondary" onClick={() => go(1)}>Келесі</Button>
                <Button variant="secondary" onClick={shuffle}>Араластыру</Button>
              </div>
            </Card>
          )}
        </>
      )}
    </Wrap>
  );
}

export function StudentQuiz({ me }: { me: Me }) {
  const { data, error, loading, reload } = useSources(me);
  const [src, setSrc] = useState(''), [quiz, setQuiz] = useState<Q[] | null>(null), [pick, setPick] = useState<Record<number, number>>({}), [done, setDone] = useState(false);
  const cur = src || data?.sets[0]?.id || (data?.own.length ? OWN : '');
  const pool = useMemo(() => (data ? poolOf(data.sets, data.own, cur) : []), [data, cur]);
  const kinds: QKind[] = cur === OWN ? ['def'] : ['def', 'ru', 'en'];
  const start = () => { setQuiz(makeQuiz(pool, { count: 10, kinds })); setPick({}); setDone(false); };
  const score = quiz ? quiz.filter((q, k) => pick[k] === q.answer).length : 0;
  return (
    <Wrap title="Өзін-өзі тексеру" lead="Жинақтан 10 сұрақ. Жауап беріп, «Тексеру» батырмасын бас.">
      {loading && !data && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && !cur && none}
      {data && cur && (
        <Card className="space-y-3">
          <Source sets={data.sets} own={data.own} value={cur} onChange={v => { setSrc(v); setQuiz(null); }} />
          <p className="text-sm text-text-secondary">Сұрақ түрлері: {KINDS.filter(k => kinds.includes(k.k)).map(k => k.label).join(', ')}</p>
          <Button disabled={pool.length < 2} onClick={start}>{quiz ? 'Қайта бастау' : 'Бастау'}</Button>
          {pool.length < 2 && <p className="text-sm text-text-muted">Тест үшін кемінде екі термин керек.</p>}
        </Card>
      )}
      {quiz && quiz.length === 0 && <EmptyState text="Бұл жинақтан сұрақ құрылмады: терминдерде анықтама не аударма жоқ." />}
      {quiz && quiz.length > 0 && (
        <section aria-label="Тест" className="space-y-4">
          {quiz.map((q, k) => (
            <fieldset key={k} className="space-y-1">
              <legend className="font-medium">{k + 1}. {q.prompt}</legend>
              {q.options.map((o, j) => {
                const ok = done && j === q.answer, bad = done && pick[k] === j && j !== q.answer;
                return (
                  <label key={j} className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 ${ok ? 'bg-success-soft text-success font-semibold' : bad ? 'bg-danger-soft text-danger' : 'hover:bg-surface-2'}`}>
                    <input type="radio" name={'q' + k} className="h-5 w-5 accent-[var(--accent)]" disabled={done} checked={pick[k] === j} onChange={() => setPick(p => ({ ...p, [k]: j }))} />
                    <span className="break-words">{o}{ok && <span className="sr-only"> (дұрыс жауап)</span>}{bad && <span className="sr-only"> (қате)</span>}</span>
                  </label>
                );
              })}
            </fieldset>
          ))}
          {!done ? <Button disabled={Object.keys(pick).length < quiz.length} onClick={() => setDone(true)}>Тексеру</Button>
            : <p role="status" className="rounded-lg bg-info-soft p-3 font-semibold">Нәтиже: {score} / {quiz.length}</p>}
        </section>
      )}
    </Wrap>
  );
}
