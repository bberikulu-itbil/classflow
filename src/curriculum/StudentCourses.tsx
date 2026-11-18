import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardCheck, GraduationCap, Languages, Lock } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Card, EmptyState, ErrorBox, Skeleton, inputCls, useLoad } from '../ui';
import { renderSlide } from '../components/Widgets';
import { tr, useLang, LANG_LABEL } from '../lessons/lang';

const LabWidget = lazy(() => import('../components/LabWidgets').then(m => ({ default: m.LabWidget })));

// The student reads only through cf_student_courses / cf_course_lesson (058_course_share.sql): the teacher opened the course, answers and notes are stripped.
/** `open`: a lesson the class has had (or a self-study course); an exam open now. `done`: the exam is sent in this opening. (071) */
interface L { id: string; title: string; n: number; exam?: boolean; open?: boolean; done?: boolean; closes_at?: string | null; result?: { points: number; max: number } | null }
interface M { id: string; title: string; kind: 'lesson' | 'course'; quarter: number | null; lessons: L[] }
interface C { id: string; title: string; subject: string | null; grade: number | null; description: string | null; cover_url: string | null; instructor: string | null; modules: M[] }
interface Lesson { title: string; slides: any[] }

const DEMO_COURSES: C[] = [{ id: 'dc', title: 'Информатика 7 [мысал]', subject: 'Информатика', grade: 7, description: 'Алгоритмдер мен бағдарламалау негіздері', cover_url: null, instructor: 'Бағдәулет Е.',
  modules: [{ id: 'dm', title: 'Алгоритмдер', kind: 'lesson', quarter: 2, lessons: [{ id: 'dl', title: 'Алгоритм дегеніміз не?', n: 2 }] }] }];
const DEMO_LESSON: Lesson = { title: 'Алгоритм дегеніміз не?', slides: [{ type: 'title', title: 'Алгоритм дегеніміз не?', subtitle: '7-сынып · Информатика' },
  { type: 'content', title: 'Анықтама', bullets: ['Алгоритм — есепті шешу қадамдарының дәйектілігі', 'Әр қадам нақты және орындалатын болуы керек'] }] };

const loadCourses = async (): Promise<C[]> => {
  if (DEMO) return DEMO_COURSES;
  const r = await sb.rpc('cf_student_courses'); if (r.error) throw new Error(r.error.message); return (r.data ?? []) as C[];
};
const loadLesson = async (id: string): Promise<Lesson> => {
  if (DEMO) return DEMO_LESSON;
  const r = await sb.rpc('cf_course_lesson', { p_lesson: id }); if (r.error) throw new Error(r.error.message); return r.data as Lesson;
};

function Reader({ lesson, back }: { lesson: L; back: () => void }) {
  const [lang, flip] = useLang(), [i, setI] = useState(0);
  const q = useLoad(() => loadLesson(lesson.id), [lesson.id]);
  const slides = q.data?.slides ?? [], last = Math.max(0, slides.length - 1), go = (n: number) => setI(Math.min(Math.max(n, 0), last));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target as HTMLElement).tagName)) return; if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const backBtn = <button type="button" onClick={back} className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent underline"><ArrowLeft size={16} aria-hidden="true" />Курсқа оралу</button>;
  if (q.loading && !q.data) return <div className="space-y-3">{backBtn}<Skeleton /></div>;
  if (q.error) return <div className="space-y-3">{backBtn}<ErrorBox message={q.error} onRetry={q.reload} /></div>;
  const s = tr(slides[Math.min(i, last)], lang);
  return (
    <div className="space-y-3">
      {backBtn}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 break-words text-xl font-bold">{lesson.title}</h2>
        {slides.some((x: any) => x.ru || x.en) && <button type="button" onClick={flip} aria-label={`Слайд тілі / Язык: ${LANG_LABEL[lang]}`} className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2"><Languages size={16} aria-hidden="true" />{LANG_LABEL[lang]}</button>}
      </div>
      {!s ? <EmptyState text="Бұл дәрісте әзірге бет жоқ." /> : (
        <>
          <div data-theme="light" role="region" aria-label={`Бет ${i + 1} / ${slides.length}`} className="min-h-[18rem] overflow-x-auto rounded-xl bg-slate-950 py-4 text-text">{renderSlide(s, { mode: 'student', lang, noOptions: true })}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-label="Алдыңғы бет" disabled={i === 0} onClick={() => go(i - 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-2 disabled:opacity-30"><ChevronLeft size={18} aria-hidden="true" /></button>
            <span aria-live="polite" className="min-w-[4.5rem] text-center text-sm tabular-nums">{i + 1} / {slides.length}</span>
            <button type="button" aria-label="Келесі бет" disabled={i === last} onClick={() => go(i + 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-2 disabled:opacity-30"><ChevronRight size={18} aria-hidden="true" /></button>
            <select aria-label="Бетке өту" className={inputCls + ' !w-auto min-w-[12rem] flex-1'} value={i} onChange={e => go(+e.target.value)}>{slides.map((x: any, k: number) => <option key={k} value={k}>{`${k + 1}. ${(tr(x, lang) as any)?.title || (tr(x, lang) as any)?.prompt || x.type}`.slice(0, 70)}</option>)}</select>
          </div>
        </>
      )}
    </div>
  );
}

export function StudentCourses() {
  const { data, error, loading, reload } = useLoad(loadCourses, []);
  const [cid, setCid] = useState(''), [les, setLes] = useState<L | null>(null);
  if (loading && !data) return <Skeleton rows={3} />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const course = data?.find(c => c.id === cid);
  if (course && les) return les.exam ? <ExamTaker lesson={les} back={() => { setLes(null); reload(); }} /> : <Reader lesson={les} back={() => setLes(null)} />;
  if (course) return (
    <div className="space-y-3">
      <button type="button" onClick={() => setCid('')} className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent underline"><ArrowLeft size={16} aria-hidden="true" />Барлық курстар</button>
      <div><h2 className="text-xl font-bold">{course.title}</h2><p className="text-sm text-text-secondary">{[course.subject, course.grade && `${course.grade}-сынып`, course.instructor].filter(Boolean).join(' · ')}</p>{course.description && <p className="mt-1 text-text-secondary">{course.description}</p>}</div>
      {course.modules.length === 0 ? <EmptyState text="Бұл курста әзірге модуль жоқ." /> : course.modules.map(m => (
        <section key={m.id} aria-label={m.title} className="space-y-2"><h3 className="font-semibold">{m.title}{m.quarter ? <span className="ml-2 text-sm font-normal text-text-secondary">{m.quarter}-тоқсан</span> : null}</h3>
          {m.lessons.length === 0 ? <p className="text-sm text-text-secondary">Дәріс жоқ.</p> : <ul className="grid gap-2 sm:grid-cols-2">{m.lessons.map(l => (
            <li key={l.id}>{l.exam ? <ExamItem l={l} onTake={() => setLes(l)} /> : l.open === false ? <div className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-surface-2/50 px-3 py-2 text-text-muted" title="Сыныпта өтілгеннен кейін ашылады"><span className="min-w-0 truncate">{l.title}</span><Lock size={15} aria-hidden="true" className="shrink-0" /><span className="sr-only">сыныпта өткен соң ашылады</span></div> : <button type="button" disabled={!l.n} onClick={() => setLes(l)} className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50"><span className="min-w-0 break-words font-medium">{l.title}</span><span className="shrink-0 text-xs text-text-secondary">{l.n ? `${l.n} бет` : 'бос'}</span></button>}</li>))}</ul>}
        </section>))}
    </div>
  );
  return !data?.length ? <EmptyState text="Мұғалім әзірге ешқандай курсты ашпаған. Ол ашқанда осында көрінеді." /> : (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.map(c => (
      <button key={c.id} type="button" onClick={() => setCid(c.id)} aria-label={`Ашу: ${c.title}`} className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left hover:border-accent/50">
        <div className="h-28 w-full shrink-0 bg-accent-soft">{c.cover_url ? <img src={c.cover_url} alt="" className="h-full w-full object-cover" /> : <div aria-hidden="true" className="grid h-full w-full place-items-center text-on-accent-soft"><GraduationCap size={40} strokeWidth={1.5} /></div>}</div>
        <div className="space-y-1 p-3"><h3 className="line-clamp-2 font-semibold leading-tight">{c.title}</h3><p className="text-xs text-text-secondary">{[c.subject, c.grade && `${c.grade}-сынып`].filter(Boolean).join(' · ')}</p><p className="text-xs text-text-muted">{c.modules.length} модуль · {c.modules.reduce((a, m) => a + m.lessons.length, 0)} дәріс</p></div>
      </button>))}</div>
  );
}

/** An exam in the course list: locked until the teacher opens it, then «Тапсыру»; after it, the result. */
function ExamItem({ l, onTake }: { l: L; onTake: () => void }) {
  const res = l.result ? `${l.result.points} / ${l.result.max}` : '';
  return (
    <div className={`flex min-h-[48px] w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${l.open && !l.done ? 'border-violet-400 bg-violet-50' : 'border-border bg-surface'}`}>
      <ClipboardCheck size={16} aria-hidden="true" className="shrink-0 text-violet-700" />
      <span className="min-w-0 flex-1 font-medium">{l.title} <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-bold text-violet-800">Емтихан</span></span>
      {l.open && !l.done ? <button type="button" onClick={onTake} className="min-h-[40px] rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-700 cursor-pointer">Тапсыру{l.closes_at ? ` · ${new Date(l.closes_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} дейін` : ''}</button>
        : <span className="inline-flex items-center gap-1 text-xs text-text-muted">{res ? <>Нәтиже: <b className="text-text">{res}</b></> : <><Lock size={13} aria-hidden="true" />Мұғалім ашқанда тапсырасың</>}</span>}
    </div>
  );
}

/** Taking an exam: the questions of my variant on one page, a countdown to the closing time, one submission. */
function ExamTaker({ lesson, back }: { lesson: L; back: () => void }) {
  const [lang, flip] = useLang();
  const q = useLoad(async () => { const r = await sb.rpc('cf_exam_get', { p_lesson: lesson.id }); if (r.error) throw new Error(r.error.message); return r.data as { closes_at: string | null; slides: any[] }; }, [lesson.id]);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ points: number; max: number } | null>(null);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const backBtn = <button type="button" onClick={back} className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent underline"><ArrowLeft size={16} aria-hidden="true" />Курсқа оралу</button>;
  if (q.loading && !q.data) return <div className="space-y-3">{backBtn}<Skeleton /></div>;
  if (q.error) return <div className="space-y-3">{backBtn}<ErrorBox message={q.error} onRetry={q.reload} /></div>;
  const items = (q.data?.slides || []).map((s, i) => ({ s: tr(s, lang) as any, i })).filter(x => x.s.type === 'quiz' || (x.s.type === 'task' && !x.s.criteria && !x.s.levels && !x.s.sql));
  const left = q.data?.closes_at ? new Date(q.data.closes_at).getTime() - now : null;
  const send = async () => {
    setBusy(true); setErr('');
    const r = await sb.rpc('cf_exam_submit', { p_lesson: lesson.id, p_answers: Object.fromEntries(Object.entries(ans).map(([k, v]) => [k, v])) });
    setBusy(false);
    if (r.error) setErr(r.error.message); else setResult(r.data as { points: number; max: number });
  };
  if (result) return <div className="space-y-3">{backBtn}<Card className="text-center"><p className="text-sm text-text-secondary">Емтихан тапсырылды</p><p className="text-4xl font-black">{result.points} / {result.max}</p></Card></div>;
  const answered = items.filter(x => (ans[x.i] ?? '').trim() !== '' && !(x.s.match && (ans[x.i] ?? '').includes('-'))).length;
  return (
    <div className="space-y-3">
      {backBtn}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 p-3">
        <h2 className="min-w-0 flex-1 break-words text-lg font-bold">{lesson.title}</h2>
        <span className="text-sm text-text-secondary">{answered} / {items.length}</span>
        {left !== null && <span className={`rounded-lg px-2 py-1 font-mono text-sm font-bold ${left < 60000 ? 'bg-danger text-white' : 'bg-surface'}`}>{left > 0 ? `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}` : '0:00'}</span>}
        <button type="button" onClick={flip} aria-label={`Тіл: ${LANG_LABEL[lang]}`} className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-border bg-surface px-2 text-sm"><Languages size={15} aria-hidden="true" />{LANG_LABEL[lang]}</button>
      </div>
      {items.map((x, k) => (
        <Card key={x.i} className="space-y-2">
          <p className="text-xs font-bold text-text-muted">{k + 1}. {x.s.title}{x.s.variant ? ` · нұсқа ${x.s.variant}` : ''}</p>
          <p className="whitespace-pre-wrap font-semibold">{x.s.prompt || x.s.q}</p>
          {x.s.widget && <Suspense fallback={<Skeleton />}><LabWidget w={x.s.widget} lang={lang} /></Suspense>}
          {x.s.match ? <Match m={x.s.match} value={ans[x.i] ?? ''} onChange={v => setAns(a => ({ ...a, [x.i]: v }))} label={x.s.title} />
          : x.s.type === 'quiz' ? (
            <div className="grid gap-1.5" role="radiogroup" aria-label={x.s.title}>
              {(x.s.options || []).map((o: string, j: number) => (
                <label key={j} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 ${ans[x.i] === String(j) ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface-2'}`}>
                  <input type="radio" name={`q${x.i}`} checked={ans[x.i] === String(j)} onChange={() => setAns(a => ({ ...a, [x.i]: String(j) }))} />{String.fromCharCode(65 + j)}. {o}
                </label>))}
            </div>
          ) : <input className={inputCls} value={ans[x.i] ?? ''} onChange={e => setAns(a => ({ ...a, [x.i]: e.target.value }))} placeholder="Жауабың" aria-label={x.s.title} />}
        </Card>
      ))}
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <button type="button" disabled={busy} onClick={() => { if (answered < items.length && !window.confirm(`${items.length - answered} сұраққа жауап жоқ. Жібересің бе?`)) return; void send(); }}
        className="min-h-[48px] w-full rounded-xl bg-violet-600 px-4 font-bold text-white hover:bg-violet-700 disabled:opacity-50 cursor-pointer">{busy ? 'Жіберілуде…' : 'Емтиханды жіберу (бір-ақ рет)'}</button>
    </div>
  );
}

/** Matching in an exam: a letter of the right column for every left row; the answer is the letters in row order ("-" = none yet). */
export function Match({ m, value, onChange, label }: { m: { left: string[]; right: string[] }; value: string; onChange: (v: string) => void; label: string }) {
  const cur = m.left.map((_, k) => value[k] && value[k] !== '-' ? value[k] : '-');
  const set = (k: number, ch: string) => onChange(cur.map((c, j) => (j === k ? ch : c)).join(''));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ul className="space-y-1.5" aria-label={`${label}: сол жақ`}>{m.left.map((l, k) => (
        <li key={k} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-3">
          <span className="min-w-0 flex-1 font-mono">{k + 1}. {l}</span>
          <select value={cur[k]} onChange={e => set(k, e.target.value)} aria-label={`${k + 1}. ${l}`} className="min-h-[40px] rounded-md border border-border bg-surface px-2 font-bold">
            <option value="-">—</option>{m.right.map((_, j) => <option key={j} value={String.fromCharCode(65 + j)}>{String.fromCharCode(65 + j)}</option>)}
          </select>
        </li>))}</ul>
      <ul className="space-y-1.5" aria-label={`${label}: оң жақ`}>{m.right.map((r, j) => (
        <li key={j} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-surface-2 px-3 font-mono"><b>{String.fromCharCode(65 + j)}.</b> {r}</li>))}</ul>
    </div>
  );
}
