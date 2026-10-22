import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Trash2, X } from 'lucide-react';
import { Button, Card, EmptyState, ErrorBox, Field, LinkButton, Skeleton, inputCls, useLoad } from '../ui';
import { Chips } from '../ui/Chips';
import { NO_SUBJECT } from '../lessons/model';
import * as st from './store';
import type { Course, Curr, Me, Mod, Place } from './store';

/** Loads the whole structure and re-reads it after every change, so the screen can never drift from the stored rows. */
function useCurr(me: Me) {
  const q = useLoad(() => st.loadCurr(me), [me.id]);
  const [msg, setMsg] = useState('');
  const act = async (fn: () => Promise<unknown>) => { setMsg(''); try { await fn(); q.reload(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); } };
  return { ...q, msg, act };
}
const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => <main className="mx-auto max-w-4xl space-y-4 p-4"><h1 className="text-2xl font-bold">{title}</h1>{children}</main>;
const Status = ({ msg }: { msg: string }) => <p role="status" aria-live="polite" className={msg ? 'rounded-lg bg-danger-soft p-3 text-sm text-danger' : 'sr-only'}>{msg}</p>;
const Local = ({ d }: { d?: Curr }) => d?.local ? <p role="note" className="rounded-lg bg-surface-2 p-3 text-sm text-text-secondary">Құрылым тек осы браузерде сақталады: дерекқорда кестелер әлі жоқ (008_curriculum.sql іске қосылмаған).</p> : null;
const IconBtn = ({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) =>
  <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent">{children}</button>;
function Confirm({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <div role="alertdialog" aria-label="Растау" className="flex flex-wrap items-center gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
      <span>{text}</span><Button variant="danger" onClick={onYes}>Өшіру</Button><Button variant="secondary" onClick={onNo}>Болдырмау</Button>
    </div>
  );
}

export function CoursesView({ me }: { me: Me }) {
  const { data, error, loading, reload, msg, act } = useCurr(me);
  const [title, setTitle] = useState(''), [subject, setSubject] = useState(''), [grade, setGrade] = useState(''), [err, setErr] = useState('');
  const [ask, setAsk] = useState<Course | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setErr('Курстың атауын жазыңыз');
    setErr(''); const t = title.trim();
    act(() => st.addCourse(me, { title: t, subject: subject.trim() || null, grade: grade ? +grade : null })).then(() => { setTitle(''); setSubject(''); setGrade(''); });
  };
  const counts = (c: Course) => {
    const mods = data!.modules.filter(m => m.course_id === c.id), ids = new Set(mods.map(m => m.id));
    return `${mods.length} модуль · ${data!.places.filter(p => ids.has(p.module_id)).length} дәріс`;
  };
  return (
    <Shell title="Курстар">
      <p className="text-text-secondary">Курс — пән немесе сынып деңгейі бойынша толық бағдарлама. Ол сыныпқа, күнге және оқу жылына байланбайды: оларды кесте (КТП) береді.</p>
      <Local d={data} /><Status msg={msg} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton />}
      {data && (
        <>
          {data.courses.length === 0 ? <EmptyState text="Әзірге курс жоқ. Төмендегі форма арқылы алғашқысын қосыңыз." /> : (
            <ul className="space-y-2">
              {data.courses.map(c => (
                <li key={c.id}><Card className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold break-words">{c.title}</h2>
                    <p className="text-sm text-text-secondary">{[c.subject, c.grade && `${c.grade}-сынып`].filter(Boolean).join(' · ') || NO_SUBJECT} · {counts(c)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <LinkButton href="#lessons/modules" variant="primary" onClick={() => st.selectCourse(c.id)} aria-label={`${c.title}: ашу`}>Ашу</LinkButton>
                    <IconBtn label={`${c.title}: өшіру`} onClick={() => setAsk(c)}><Trash2 size={16} aria-hidden="true" /></IconBtn>
                  </div>
                </Card></li>
              ))}
            </ul>
          )}
          {ask && <Confirm text={`«${ask.title}» курсы мен оның модульдері өшіріледі. Дәрістердің өзі сақталады. Жалғастырасыз ба?`} onNo={() => setAsk(null)} onYes={() => { const c = ask; setAsk(null); act(() => st.delCourse(me, c.id)); }} />}
          <Card className="space-y-3">
            <h2 className="font-semibold">Курс қосу</h2>
            <form onSubmit={submit} noValidate className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Атауы" error={err}>{id => <input id={id} className={inputCls} value={title} maxLength={80} placeholder="Информатика 7" aria-invalid={!!err || undefined} onChange={e => setTitle(e.target.value)} />}</Field>
                <Field label="Пән">{id => <input id={id} className={inputCls} value={subject} maxLength={60} placeholder="Информатика" onChange={e => setSubject(e.target.value)} />}</Field>
                <Field label="Сынып деңгейі">{id => (
                  <select id={id} className={inputCls} value={grade} onChange={e => setGrade(e.target.value)}>
                    <option value="">Көрсетілмейді</option>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1}-сынып</option>)}
                  </select>)}</Field>
              </div>
              <Button type="submit">Қосу</Button>
            </form>
          </Card>
        </>
      )}
    </Shell>
  );
}

export function ModulesView({ me }: { me: Me }) {
  const { data, error, loading, reload, msg, act } = useCurr(me);
  const [cid, setCid] = useState(st.selectedCourse());
  const [title, setTitle] = useState(''), [err, setErr] = useState('');
  const [ask, setAsk] = useState<Mod | null>(null);
  const course = data?.courses.find(c => c.id === cid) || data?.courses[0];
  useEffect(() => { if (course && course.id !== cid) setCid(course.id); }, [course?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const mods = course ? data!.modules.filter(m => m.course_id === course.id) : [];
  const placed = new Set(data?.places.map(p => p.lesson_id));
  const free = (data?.lessons || []).filter(l => !placed.has(l.id));
  const lesson = (id: string) => data!.lessons.find(l => l.id === id);
  const inModule = (m: Mod): Place[] => data!.places.filter(p => p.module_id === m.id).filter(p => lesson(p.lesson_id));
  const pick = (id: string) => { setCid(id); st.selectCourse(id); setAsk(null); };
  const addMod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setErr('Модульдің атауын жазыңыз');
    setErr(''); const t = title.trim();
    act(() => st.addModule(me, course!.id, t, st.nextPosition(mods))).then(() => setTitle(''));
  };
  return (
    <Shell title="Модульдер мен дәрістер">
      <p className="text-text-secondary">Курс модульдерге бөлінеді, модуль дәрістерден тұрады. Дәріс — «Менің сабақтарым» ішіндегі сабақ; бір дәріс бір модульде тұрады.</p>
      <Local d={data} /><Status msg={msg} />
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton />}
      {data && data.courses.length === 0 && <EmptyState text="Алдымен курс қосыңыз." action={<LinkButton href="#lessons/courses" variant="primary">Курстарға өту</LinkButton>} />}
      {data && course && (
        <>
          <Card><Chips legend="Курс" name="course" value={course.id} onChange={pick} options={data.courses.map(c => ({ v: c.id, label: c.title }))} /></Card>
          {mods.length === 0 && <EmptyState text="Бұл курста модуль жоқ. Төмендегі форма арқылы алғашқы модульді қосыңыз." />}
          {mods.map((m, mi) => {
            const ps = inModule(m);
            return (
              <section key={m.id} aria-label={m.title} className="space-y-2 rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-1">
                  <input aria-label={`Модуль ${mi + 1}: атауы`} defaultValue={m.title} key={m.title} maxLength={80}
                    onBlur={e => { const v = e.target.value.trim(); if (!v) e.target.value = m.title; else if (v !== m.title) act(() => st.renameModule(me, m.id, v)); }}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="min-h-[44px] min-w-0 flex-1 rounded-md bg-transparent px-2 text-lg font-semibold hover:bg-surface-2" />
                  <IconBtn label={`${m.title}: жоғары`} disabled={mi === 0} onClick={() => act(() => st.swapModules(me, m, mods[mi - 1]))}><ArrowUp size={16} aria-hidden="true" /></IconBtn>
                  <IconBtn label={`${m.title}: төмен`} disabled={mi === mods.length - 1} onClick={() => act(() => st.swapModules(me, m, mods[mi + 1]))}><ArrowDown size={16} aria-hidden="true" /></IconBtn>
                  <IconBtn label={`${m.title}: өшіру`} onClick={() => setAsk(m)}><Trash2 size={16} aria-hidden="true" /></IconBtn>
                </div>
                {ps.length === 0 ? <p className="px-2 text-sm text-text-muted">Модульде дәріс жоқ.</p> : (
                  <ol className="space-y-1">
                    {ps.map((p, i) => {
                      const l = lesson(p.lesson_id)!;
                      return (
                        <li key={p.lesson_id} className="flex items-center gap-1 rounded-md px-2 hover:bg-surface-2">
                          <span className="w-6 text-sm text-text-muted">{i + 1}.</span>
                          <a href={'#edit/' + l.id} className="min-w-0 flex-1 py-2 break-words text-accent underline">{l.title}</a>
                          <span className="hidden text-sm text-text-muted sm:inline">{l.subject}</span>
                          <IconBtn label={`${l.title}: жоғары`} disabled={i === 0} onClick={() => act(() => st.swapLessons(me, p, ps[i - 1]))}><ArrowUp size={16} aria-hidden="true" /></IconBtn>
                          <IconBtn label={`${l.title}: төмен`} disabled={i === ps.length - 1} onClick={() => act(() => st.swapLessons(me, p, ps[i + 1]))}><ArrowDown size={16} aria-hidden="true" /></IconBtn>
                          <IconBtn label={`${l.title}: модульден алу`} onClick={() => act(() => st.unplaceLesson(me, l.id))}><X size={16} aria-hidden="true" /></IconBtn>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <AddLesson key={m.id} free={free} label={m.title} onAdd={id => act(() => st.placeLesson(me, id, m.id, st.nextPosition(data.places.filter(p => p.module_id === m.id))))} />
              </section>
            );
          })}
          {ask && <Confirm text={`«${ask.title}» модулі өшіріледі. Дәрістер сақталады, тек модульден шығады. Жалғастырасыз ба?`} onNo={() => setAsk(null)} onYes={() => { const m = ask; setAsk(null); act(() => st.delModule(me, m.id)); }} />}
          <Card className="space-y-3">
            <h2 className="font-semibold">Модуль қосу</h2>
            <form onSubmit={addMod} noValidate className="flex flex-wrap items-end gap-3">
              <div className="min-w-[14rem] flex-1"><Field label="Атауы" error={err}>{id => <input id={id} className={inputCls} value={title} maxLength={80} placeholder="Алгоритмдер" aria-invalid={!!err || undefined} onChange={e => setTitle(e.target.value)} />}</Field></div>
              <Button type="submit">Қосу</Button>
            </form>
          </Card>
          <p className="text-sm text-text-secondary">Модульге қосылмаған дәрістер: {free.length}. <a href="#edit/new" className="text-accent underline">+ Жаңа сабақ</a></p>
        </>
      )}
    </Shell>
  );
}

function AddLesson({ free, label, onAdd }: { free: { id: string; title: string }[]; label: string; onAdd: (id: string) => void }) {
  const [v, setV] = useState('');
  if (!free.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-2">
      <select aria-label={`${label}: дәріс қосу`} className={inputCls + ' !w-auto min-w-[14rem] flex-1'} value={v} onChange={e => setV(e.target.value)}>
        <option value="">Дәрісті таңдаңыз</option>{free.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
      </select>
      <Button variant="secondary" disabled={!v} onClick={() => { onAdd(v); setV(''); }}>Дәріс қосу</Button>
    </div>
  );
}
