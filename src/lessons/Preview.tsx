import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Languages, Pencil } from 'lucide-react';
import { sb } from '../config';
import { EmptyState, ErrorBox, LinkButton, Skeleton, inputCls, useLoad } from '../ui';
import { renderSlide } from '../components/Widgets';
import { tr, useLang } from './lang';
import { spCtx, useSpoilers } from './spoil';

interface Row { id: string; title: string; subject: string | null; slides: any[] }
const label = (s: any, i: number, lang: 'kk' | 'ru') => `${i + 1}. ${(tr(s, lang) as any)?.title || (tr(s, lang) as any)?.prompt || s.type}`.slice(0, 70);
/** Teacher-only hint under a slide: the right answer and the lecture notes. Nothing here reaches students. */
const hint = (s: any): string[] => [
  s.type === 'quiz' && Number.isInteger(s.answer) ? `Дұрыс жауап: ${String.fromCharCode(65 + s.answer)}. ${(s.options || [])[s.answer] ?? ''}` : '',
  s.type === 'task' && s.accept ? `Қабылданатын жауап: ${[].concat(s.accept).join(' · ')}` : '',
  s.explanation ? `Түсіндірме: ${s.explanation}` : '',
  s.notes ? `Ескертпе: ${s.notes}` : '',
].filter(Boolean);

/** Read-only walk through a lecture's slides, no class and no live session needed. */
export function LessonPreview({ id }: { id: string }) {
  const q = useLoad(async () => {
    const { data, error } = await sb.from('cf_lessons').select('id,title,subject,slides').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data as Row | null;
  }, [id]);
  const [i, setI] = useState(0);
  const [lang, flip] = useLang();
  const spoil = useSpoilers(id + ':' + i);
  const lesson = q.data, slides = lesson?.slides || [], last = slides.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(last, n)));
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target as HTMLElement).tagName)) return;
      if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1);
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const title = (tr(slides[0], lang)?.title || lesson?.title) as string;
  useEffect(() => { document.title = title ? `${title} · ClassFlow` : document.title; }, [title]);
  const back = <a href="#lessons/modules" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent underline"><ArrowLeft size={16} aria-hidden="true" />Модульдер мен дәрістер</a>;
  if (q.loading && !lesson) return <main className="mx-auto max-w-5xl space-y-4 p-4">{back}<Skeleton /></main>;
  if (q.error) return <main className="mx-auto max-w-5xl space-y-4 p-4">{back}<ErrorBox message={q.error} onRetry={q.reload} /></main>;
  if (!lesson) return <main className="mx-auto max-w-5xl space-y-4 p-4">{back}<EmptyState text="Дәріс табылмады. Ол өшірілген немесе сіздікі емес болуы мүмкін." /></main>;
  const s = tr(slides[Math.min(i, last)], lang), notes = s ? hint(s) : [];
  return (
    <main className="mx-auto max-w-5xl space-y-3 p-4">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><h1 className="text-2xl font-bold break-words">{title}</h1><p className="text-text-secondary">{lesson.subject || 'Пәнсіз'} · {slides.length} слайд</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {slides.some((x: any) => x.ru) && <button type="button" onClick={flip} aria-label={lang === 'ru' ? 'Язык слайдов: русский. Переключить на казахский' : 'Слайд тілі: қазақша. Орысшаға ауыстыру'} className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2"><Languages size={16} aria-hidden="true" />{lang === 'ru' ? 'РУС' : 'ҚАЗ'}</button>}
          <LinkButton href={'#edit/' + lesson.id}><Pencil size={16} aria-hidden="true" />Өңдеу</LinkButton>
        </div>
      </div>
      {!s ? <EmptyState text="Бұл дәрісте слайд жоқ." /> : (
        <>
          <div data-theme="dark" role="region" aria-label={`Слайд ${i + 1} / ${slides.length}`} className="min-h-[18rem] overflow-x-auto rounded-xl bg-slate-950 py-4 text-white">{renderSlide(s, { mode: 'student', sp: spCtx(spoil), lb: () => <p className="text-slate-400">Нәтиже кестесі сабақ кезінде толтырылады.</p> })}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-label="Алдыңғы слайд" disabled={i === 0} onClick={() => go(i - 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-2 disabled:opacity-30"><ChevronLeft size={18} aria-hidden="true" /></button>
            <span aria-live="polite" className="min-w-[4.5rem] text-center text-sm tabular-nums">{i + 1} / {slides.length}</span>
            <button type="button" aria-label="Келесі слайд" disabled={i === last} onClick={() => go(i + 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-2 disabled:opacity-30"><ChevronRight size={18} aria-hidden="true" /></button>
            <select aria-label="Слайдқа өту" className={inputCls + ' !w-auto min-w-[12rem] flex-1'} value={i} onChange={e => go(+e.target.value)}>{slides.map((x, k) => <option key={k} value={k}>{label(x, k, lang)}</option>)}</select>
          </div>
          {notes.length > 0 && <div role="note" className="space-y-1 rounded-lg bg-surface-2 p-3 text-sm text-text-secondary"><p className="font-semibold text-text">Мұғалімге</p>{notes.map((n, k) => <p key={k} className="whitespace-pre-wrap">{n}</p>)}</div>}
        </>
      )}
    </main>
  );
}
