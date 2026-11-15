import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, GraduationCap, Languages } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Card, EmptyState, ErrorBox, Skeleton, inputCls, useLoad } from '../ui';
import { renderSlide } from '../components/Widgets';
import { tr, useLang, LANG_LABEL } from '../lessons/lang';

// The student reads only through cf_student_courses / cf_course_lesson (058_course_share.sql): the teacher opened the course, answers and notes are stripped.
interface L { id: string; title: string; n: number }
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
  if (course && les) return <Reader lesson={les} back={() => setLes(null)} />;
  if (course) return (
    <div className="space-y-3">
      <button type="button" onClick={() => setCid('')} className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent underline"><ArrowLeft size={16} aria-hidden="true" />Барлық курстар</button>
      <div><h2 className="text-xl font-bold">{course.title}</h2><p className="text-sm text-text-secondary">{[course.subject, course.grade && `${course.grade}-сынып`, course.instructor].filter(Boolean).join(' · ')}</p>{course.description && <p className="mt-1 text-text-secondary">{course.description}</p>}</div>
      {course.modules.length === 0 ? <EmptyState text="Бұл курста әзірге модуль жоқ." /> : course.modules.map(m => (
        <section key={m.id} aria-label={m.title} className="space-y-2"><h3 className="font-semibold">{m.title}{m.quarter ? <span className="ml-2 text-sm font-normal text-text-secondary">{m.quarter}-тоқсан</span> : null}</h3>
          {m.lessons.length === 0 ? <p className="text-sm text-text-secondary">Дәріс жоқ.</p> : <ul className="grid gap-2 sm:grid-cols-2">{m.lessons.map(l => (
            <li key={l.id}><button type="button" disabled={!l.n} onClick={() => setLes(l)} className="flex min-h-[48px] w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:bg-surface-2 disabled:opacity-50"><span className="min-w-0 break-words font-medium">{l.title}</span><span className="shrink-0 text-xs text-text-secondary">{l.n ? `${l.n} бет` : 'бос'}</span></button></li>))}</ul>}
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
