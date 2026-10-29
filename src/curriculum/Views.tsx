import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Info, Languages, Layers, Pencil, Play, Trash2, X } from 'lucide-react';
import { coverOf } from '../ui/cover';
import { DEMO } from '../config';
import { Button, Card, EmptyState, ErrorBox, Field, LinkButton, Skeleton, inputCls, useLoad } from '../ui';
import { Chips } from '../ui/Chips';
import { NO_SUBJECT, currentQuarter } from '../lessons/model';
import { loadClasses } from '../journal/store';
import { getPrefs } from '../prefs';
import { startSession } from '../views/session';
import * as st from './store';
import type { Course, Curr, Kind, Me, Mod, Place } from './store';
import { SHOWS, gradeOf, gradesIn, visible } from './filter';
import type { Show } from './filter';
import { CreateMenu } from '../ui/CreateMenu';
import { useLang } from '../lessons/lang';
import { courseTitle, lessonTitle, moduleTitle } from './display';

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
const IconBtn = ({ label, onClick, disabled, pressed, expanded, controls, children }: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; expanded?: boolean; controls?: string; children: React.ReactNode }) =>
  <button type="button" aria-label={label} title={label} aria-pressed={pressed} aria-expanded={expanded} aria-controls={expanded ? controls : undefined} onClick={onClick} disabled={disabled}
    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-surface-2 disabled:opacity-30 disabled:hover:bg-transparent ${pressed || expanded ? 'bg-surface-2 text-accent' : 'text-text-secondary'}`}>{children}</button>;
function Confirm({ text, onYes, onNo }: { text: string; onYes: () => void; onNo: () => void }) {
  return (
    <div role="alertdialog" aria-label="Растау" className="flex flex-wrap items-center gap-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">
      <span>{text}</span><Button variant="danger" onClick={onYes}>Өшіру</Button><Button variant="secondary" onClick={onNo}>Болдырмау</Button>
    </div>
  );
}

export function CoursesView({ me }: { me: Me }) {
  const { data, error, loading, reload, msg, act } = useCurr(me);
  const [lang] = useLang();
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
                    <h2 className="font-semibold break-words">{courseTitle(c, lang)}</h2>
                    <p className="text-sm text-text-secondary">{[c.subject, c.grade && `${c.grade}-сынып`].filter(Boolean).join(' · ') || NO_SUBJECT} · {counts(c)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <LinkButton href="#lessons/modules" variant="primary" onClick={() => st.selectCourse(c.id)} aria-label={`${courseTitle(c, lang)}: ашу`}>Ашу</LinkButton>
                    <IconBtn label={`${courseTitle(c, lang)}: өшіру`} onClick={() => setAsk(c)}><Trash2 size={16} aria-hidden="true" /></IconBtn>
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

const KIND_LABEL: Record<Kind, string> = { lesson: 'Сабақ', course: 'Курс' };
const qLabel = (q: number | null) => (q ? `${q}-тоқсан` : 'Тоқсансыз');

export function ModulesView({ me, courseId }: { me: Me; courseId?: string }) {
  const { data, error, loading, reload, msg, act } = useCurr(me);
  const [lang, flipLang] = useLang();
  const [cid, setCid] = useState(courseId || st.selectedCourse());
  const [show, setShow] = useState<Show>('lessons'), [grade, setGrade] = useState('');
  const [form, setForm] = useState(false), [fe, setFe] = useState('');
  const [nf, setNf] = useState<{ title: string; kind: Kind; quarter: string; grade: string; course: string }>({ title: '', kind: 'lesson', quarter: String(currentQuarter()), grade: '', course: '' });
  const [ask, setAsk] = useState<Mod | null>(null);
  const [info, setInfo] = useState(false), [openId, setOpenId] = useState(''), [editId, setEditId] = useState('');
  const classes = useLoad(loadClasses, []);
  const [cls, setCls] = useState(st.selectedClass()), [busy, setBusy] = useState(''), [startErr, setStartErr] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const clsName = classes.data?.find(c => c.id === cls)?.name || '';
  const pickClass = (id: string) => { setCls(id); st.selectClass(id); setStartErr(''); };
  /** The lecture is a lesson already: with a class chosen it opens as a live lesson in one click. */
  const start = async (lessonId: string) => {
    setBusy(lessonId); setStartErr('');
    try { await startSession(lessonId, cls, getPrefs().groups); } catch (e) { setStartErr((e as Error).message || 'Сабақты бастау мүмкін болмады'); setBusy(''); }
  };
  useEffect(() => { if (st.takeNewModule()) setForm(true); }, []);
  useEffect(() => { if (form) nameRef.current?.focus(); }, [form]);
  const courses = data?.courses || [];
  const q = currentQuarter();
  const base = { grade: grade ? +grade : 0, quarter: q, course: courses.some(c => c.id === cid) ? cid : '' };
  const mods = data ? data.modules.filter(m => visible(m, courses, { ...base, show })) : [];
  const count = (sh: Show) => (data ? data.modules.filter(m => visible(m, courses, { ...base, show: sh })).length : 0);
  const grades = data ? gradesIn(data.modules, courses) : [];
  const placed = new Set(data?.places.map(p => p.lesson_id));
  const free = (data?.lessons || []).filter(l => !placed.has(l.id));
  const lesson = (id: string) => data!.lessons.find(l => l.id === id);
  const inModule = (m: Mod): Place[] => data!.places.filter(p => p.module_id === m.id).filter(p => lesson(p.lesson_id));
  const pickCourse = (id: string) => { setCid(id); st.selectCourse(id); setAsk(null); };
  const courseOf = (m: Mod) => courses.find(c => c.id === m.course_id);
  const openForm = () => { setNf(o => ({ ...o, course: o.course || (base.course || courses[0]?.id || '') })); setFe(''); setForm(true); };
  const addMod = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = nf.title.trim(), course = nf.course || courses[0]?.id;
    if (!title) return setFe('Модульдің атауын жазыңыз');
    if (!course) return setFe('Алдымен курс қосыңыз');
    setFe('');
    await act(() => st.addModule(me, course, title, st.nextPosition(data!.modules.filter(m => m.course_id === course)), { kind: nf.kind, quarter: nf.kind === 'lesson' && nf.quarter ? +nf.quarter : null, grade: nf.grade ? +nf.grade : null }));
    setNf(o => ({ ...o, title: '' })); setForm(false);
  };
  const meta = (m: Mod, p: Partial<st.ModMeta>) => act(() => st.setModuleMeta(me, m.id, { kind: m.kind, quarter: m.quarter, grade: m.grade, ...p }));
  const sel = 'min-h-[44px] rounded-md border border-border-input bg-surface px-2 text-sm text-text disabled:opacity-50';
  const noKind = !!data && data.kindCol === false;
  const note = 'rounded-lg bg-surface-2 px-3 py-2 text-xs text-text-secondary';
  return (
    <main className="mx-auto max-w-4xl space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Модульдер мен дәрістер</h1>
        <div className="flex items-center gap-1">
          <button type="button" onClick={flipLang} aria-label={lang === 'ru' ? 'Тілді қазақшаға ауыстыру' : 'Переключить курс на русский'} title={lang === 'ru' ? 'Қазақша' : 'Русский'} className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2"><Languages size={16} aria-hidden="true" />{lang === 'ru' ? 'ҚАЗ' : 'РУС'}</button>
          <IconBtn label="Түсініктеме" expanded={info} controls="mod-info" onClick={() => setInfo(v => !v)}><Info size={18} aria-hidden="true" /></IconBtn>
          <CreateMenu onModule={openForm} />
        </div>
      </div>
      {info && (
        <div id="mod-info" className="space-y-1 rounded-lg bg-surface-2 p-3 text-sm text-text-secondary">
          <p>Модуль — дәрістер тобы. Түрі: <b>Сабақ</b> (оқу жылының тоқсанына байланады) немесе <b>Курс</b>.</p>
          <p>Дәріс — мазмұн, сыныпқа байланбайды; ол сыныппен өткенде сабақ болады. Мұқаба модульде, дәрісте жоқ.</p>
          <p>{clsName ? `Модульді ашқанда дәрістің жанындағы «Бастау» батырмасы оны ${clsName} сыныбымен бірден сабақ ретінде ашады.` : 'Сыныпты таңдасаңыз, модуль ішіндегі әр дәрістің жанында «Бастау» батырмасы шығады: дәріс бірден сабақ ретінде ашылады.'}{clsName && DEMO ? ' Демо режимде сабақ басталмайды.' : ''}</p>
        </div>
      )}
      {data?.local && <p role="note" className={note}>Құрылым тек осы браузерде сақталады: дерекқорда кестелер әлі жоқ (008_curriculum.sql іске қосылмаған).</p>}
      <Status msg={msg} />
      {noKind && <p role="note" className={note}>Түрі, тоқсаны, параллелі үшін 012_module_kind.sql іске қосылуы керек. Әзірге барлық модуль «Сабақ».</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {loading && !data && <Skeleton />}
      {data && courses.length === 0 && <EmptyState text="Алдымен курс қосыңыз." action={<LinkButton href="#lessons/courses" variant="primary">Курстарға өту</LinkButton>} />}
      {data && courses.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chips compact legend="Көрсету" name="show" value={show} onChange={v => setShow(v as Show)} options={SHOWS.map(x => ({ v: x.v, label: `${x.label} · ${count(x.v)}` }))} />
            {grades.length > 0 && <select aria-label="Параллель" className={sel} value={grade} onChange={e => setGrade(e.target.value)}><option value="">Барлық параллель</option>{grades.map(g => <option key={g} value={g}>{g}-сынып</option>)}</select>}
            {courses.length > 1 && <select aria-label="Курс" className={sel} value={base.course} onChange={e => pickCourse(e.target.value)}><option value="">Барлық курс</option>{courses.map(c => <option key={c.id} value={c.id}>{courseTitle(c, lang)}</option>)}</select>}
            {classes.data && classes.data.length > 0 && <select aria-label="Сынып (бастау үшін)" className={sel} value={clsName ? cls : ''} onChange={e => pickClass(e.target.value)}><option value="">Сынып таңдалмаған</option>{classes.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          </div>
          {startErr && <p role="alert" className="text-sm text-danger">{startErr}</p>}

          {form && (
            <Card className="space-y-3" aria-label="Модуль жасау">
              <h2 className="font-semibold">Модуль жасау</h2>
              <form onSubmit={addMod} noValidate className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Атауы" error={fe}>{id => <input id={id} ref={nameRef} className={inputCls} value={nf.title} maxLength={80} placeholder="Алгоритмдер" aria-invalid={!!fe || undefined} onChange={e => setNf({ ...nf, title: e.target.value })} />}</Field>
                  <Field label="Курс">{id => <select id={id} className={inputCls} value={nf.course || courses[0].id} onChange={e => setNf({ ...nf, course: e.target.value })}>{courses.map(c => <option key={c.id} value={c.id}>{courseTitle(c, lang)}</option>)}</select>}</Field>
                </div>
                <Chips legend="Түрі" name="new-kind" value={nf.kind} onChange={v => setNf({ ...nf, kind: v as Kind })} options={[{ v: 'lesson', label: 'Сабақ' }, { v: 'course', label: 'Курс' }]} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Тоқсан">{id => <select id={id} className={inputCls} disabled={nf.kind === 'course'} value={nf.kind === 'course' ? '' : nf.quarter} onChange={e => setNf({ ...nf, quarter: e.target.value })}><option value="">Барлық тоқсан</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}-тоқсан</option>)}</select>}</Field>
                  <Field label="Параллель">{id => <select id={id} className={inputCls} value={nf.grade} onChange={e => setNf({ ...nf, grade: e.target.value })}><option value="">Курстан алу</option>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1}-сынып</option>)}</select>}</Field>
                </div>
                <div className="flex flex-wrap gap-2"><Button type="submit">Модуль жасау</Button><Button variant="secondary" onClick={() => { setForm(false); setFe(''); }}>Жабу</Button></div>
              </form>
            </Card>
          )}

          {mods.length === 0 && (
            <EmptyState text={data.modules.length === 0 ? 'Әзірге модуль жоқ. «Жасау» батырмасынан алғашқы модульді жасаңыз.' : 'Бұл сүзгіде модуль жоқ.'}
              action={data.modules.length > 0 ? <Button variant="secondary" onClick={() => { setShow('lessons'); setGrade(''); pickCourse(''); }}>Сүзгіні тазалау</Button> : undefined} />
          )}
          {mods.map((m, mi) => {
            const ps = inModule(m), cr = courseOf(m), g = gradeOf(m, courses);
            const editing = editId === m.id, open = editing || openId === m.id;
            const info1 = [KIND_LABEL[m.kind], m.kind === 'lesson' ? qLabel(m.quarter) : null, g && `${g}-сынып`, `${ps.length} дәріс`].filter(Boolean).join(' · ');
            return (
              <section key={m.id} aria-label={moduleTitle(m, lang)} className="rounded-lg border border-border bg-surface">
                <div className="flex items-center gap-1 pr-1">
                  {/* the cover belongs to the module (a lecture has none); it is the toggle, editing icons stay outside it */}
                  <h2 className="min-w-0 flex-1">
                    <button type="button" aria-expanded={open} aria-controls={`mod-${m.id}`} aria-describedby={`mod-${m.id}-meta`} onClick={() => setOpenId(openId === m.id ? '' : m.id)}
                      className="flex min-h-[56px] w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-2">
                      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white" style={{ background: coverOf(m.kind === 'course' ? 3 : mi) }}><Layers size={20} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-semibold">{moduleTitle(m, lang)}</span>
                        <span id={`mod-${m.id}-meta`} className="block text-xs font-normal text-text-secondary">{info1}</span>
                      </span>
                      <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                  </h2>
                  <IconBtn label={`${m.title}: өңдеу`} pressed={editing} onClick={() => setEditId(editing ? '' : m.id)}><Pencil size={16} aria-hidden="true" /></IconBtn>
                </div>
                {open && (
                  <div id={`mod-${m.id}`} className="space-y-2 border-t border-border p-2">
                    {editing && (
                      <>
                        <div className="flex items-center gap-1">
                          <input aria-label={`Модуль ${mi + 1}: атауы`} defaultValue={m.title} key={m.title} maxLength={80}
                            onBlur={e => { const v = e.target.value.trim(); if (!v) e.target.value = m.title; else if (v !== m.title) act(() => st.renameModule(me, m.id, v)); }}
                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                            className="min-h-[44px] min-w-0 flex-1 rounded-md border border-border-input bg-surface px-2 font-semibold" />
                          <IconBtn label={`${m.title}: жоғары`} disabled={mi === 0} onClick={() => act(() => st.swapModules(me, m, mods[mi - 1]))}><ArrowUp size={16} aria-hidden="true" /></IconBtn>
                          <IconBtn label={`${m.title}: төмен`} disabled={mi === mods.length - 1} onClick={() => act(() => st.swapModules(me, m, mods[mi + 1]))}><ArrowDown size={16} aria-hidden="true" /></IconBtn>
                          <IconBtn label={`${m.title}: өшіру`} onClick={() => setAsk(m)}><Trash2 size={16} aria-hidden="true" /></IconBtn>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select aria-label={`${m.title}: түрі`} className={sel} disabled={noKind} value={m.kind} onChange={e => meta(m, { kind: e.target.value as Kind })}><option value="lesson">Сабақ</option><option value="course">Курс</option></select>
                          <select aria-label={`${m.title}: тоқсаны`} className={sel} disabled={noKind || m.kind === 'course'} value={m.kind === 'course' ? '' : m.quarter ?? ''} onChange={e => meta(m, { quarter: e.target.value ? +e.target.value : null })}><option value="">Барлық тоқсан</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}-тоқсан</option>)}</select>
                          <select aria-label={`${m.title}: параллелі`} className={sel} disabled={noKind} value={m.grade ?? ''} onChange={e => meta(m, { grade: e.target.value ? +e.target.value : null })}><option value="">{cr?.grade ? `Курстан · ${cr.grade}-сынып` : 'Көрсетілмейді'}</option>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1}-сынып</option>)}</select>
                          {courses.length > 1 && cr && <span className="text-sm text-text-muted">Курс: {courseTitle(cr, lang)}</span>}
                        </div>
                      </>
                    )}
                    {!editing && <div className="flex flex-wrap gap-2 px-2"><Button variant="secondary" onClick={() => { window.location.hash = 'edit/new?module=' + encodeURIComponent(m.id); }}>＋ Дәріс жасау</Button>{free.length > 0 && <span className="self-center text-xs text-text-muted">немесе дайын дәрісті қосыңыз</span>}</div>}
                    {ps.length === 0 ? <p className="px-2 text-sm text-text-muted">Модульде дәріс жоқ.</p> : (
                      <ol className="space-y-1">
                        {ps.map((p, i) => {
                          const l = lesson(p.lesson_id)!;
                          return (
                            <li key={p.lesson_id} className="flex flex-wrap items-center gap-1 rounded-md px-2 hover:bg-surface-2">
                              <span className="w-6 text-sm text-text-muted">{i + 1}.</span>
                              <a href={'#edit/' + l.id} className="min-w-0 flex-1 py-2 break-words text-accent underline">{lessonTitle(l, lang)}</a>
                              {!editing && <div className="flex flex-wrap items-center gap-1">
                                <Button variant="success" className="!min-h-[44px]" disabled={!!DEMO || !clsName} title={!clsName ? 'Алдымен сыныпты таңдаңыз' : DEMO ? 'Демо режимде сабақ басталмайды' : undefined} loading={busy === l.id} onClick={() => start(l.id)} aria-label={`${lessonTitle(l, lang)}: ${clsName ? clsName + ' сыныбымен ' : ''}бастау`}><Play size={14} aria-hidden="true" />Бастау</Button>
                                <LinkButton href={'#edit/' + l.id} variant="secondary" aria-label={`${lessonTitle(l, lang)}: өңдеу`}><Pencil size={16} aria-hidden="true" />Өңдеу</LinkButton>
                              </div>}
                              {editing && <>
                                <IconBtn label={`${l.title}: жоғары`} disabled={i === 0} onClick={() => act(() => st.swapLessons(me, p, ps[i - 1]))}><ArrowUp size={16} aria-hidden="true" /></IconBtn>
                                <IconBtn label={`${l.title}: төмен`} disabled={i === ps.length - 1} onClick={() => act(() => st.swapLessons(me, p, ps[i + 1]))}><ArrowDown size={16} aria-hidden="true" /></IconBtn>
                                <IconBtn label={`${l.title}: модульден алу`} onClick={() => act(() => st.unplaceLesson(me, l.id))}><X size={16} aria-hidden="true" /></IconBtn>
                              </>}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                    {editing && <>
                      <AddLesson key={m.id} free={free} label={moduleTitle(m, lang)} lang={lang} onAdd={id => act(() => st.placeLesson(me, id, m.id, st.nextPosition(data.places.filter(p => p.module_id === m.id))))} />
                      <div className="px-2"><Button variant="secondary" onClick={() => setEditId('')}>Дайын</Button></div>
                    </>}
                  </div>
                )}
              </section>
            );
          })}
          {ask && <Confirm text={`«${ask.title}» модулі өшіріледі. Дәрістер сақталады, тек модульден шығады. Жалғастырасыз ба?`} onNo={() => setAsk(null)} onYes={() => { const m = ask; setAsk(null); setEditId(''); act(() => st.delModule(me, m.id)); }} />}
        </>
      )}
    </main>
  );
}

function AddLesson({ free, label, lang, onAdd }: { free: st.Les[]; label: string; lang: import('../lessons/lang').Lang; onAdd: (id: string) => void }) {
  const [v, setV] = useState('');
  if (!free.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-2">
      <select aria-label={`${label}: дәріс қосу`} className={inputCls + ' !w-auto min-w-[14rem] flex-1'} value={v} onChange={e => setV(e.target.value)}>
        <option value="">Дәрісті таңдаңыз</option>{free.map(l => <option key={l.id} value={l.id}>{lessonTitle(l, lang)}</option>)}
      </select>
      <Button variant="secondary" disabled={!v} onClick={() => { onAdd(v); setV(''); }}>Дәріс қосу</Button>
    </div>
  );
}
