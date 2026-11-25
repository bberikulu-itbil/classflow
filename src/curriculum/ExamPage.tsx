// The exam (БЖБ) on a page of its own, in full screen, with proctoring (087): leaving the page (another tab or window),
// leaving full screen and pasting are sent to cf_exam_focus and shown to the teacher next to the result.
// Phones that cannot go full screen (iPhone Safari) take the exam without the full-screen lock; leaving is still logged.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, Maximize, RefreshCw, ShieldCheck } from 'lucide-react';
import { sb, DEMO } from '../config';
import { ExamTaker } from './StudentCourses';
import { ScratchPad, type Sheet } from './Scratch';
import { demoPaper, demoPick, demoScore } from './examDemo';

type Kind = 'start' | 'hidden' | 'blur' | 'fullscreen_exit' | 'paste';
const canFs = () => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;
const goFs = () => document.documentElement.requestFullscreen?.().catch(() => {});

/** Logs leaving the exam. One leave = one row with no duration; coming back adds a row with how long it took. */
function useProctor(lessonId: string, on: boolean, demo = false) {
  const [left, setLeft] = useState(0), [outFs, setOutFs] = useState(false);
  const away = useRef<{ kind: Kind; t: number } | null>(null);
  useEffect(() => {
    if (!on) return;
    const send = (kind: Kind, ms?: number) => { if (!DEMO && !demo) void sb.rpc('cf_exam_focus', { p_lesson: lessonId, p_kind: kind, p_ms: ms ?? null }).then(() => {}, () => {}); };
    const leave = (kind: Kind) => { if (away.current) return; away.current = { kind, t: Date.now() }; setLeft(n => n + 1); send(kind); };
    const back = () => { const a = away.current; if (!a) return; away.current = null; send(a.kind, Date.now() - a.t); };
    const onVis = () => (document.hidden ? leave('hidden') : back());
    const onBlur = () => setTimeout(() => { if (!document.hidden && !document.hasFocus()) leave('blur'); }, 80); // a hidden page also blurs: count it once
    const onFocus = () => { if (!document.hidden) back(); };
    const onFs = () => { if (!canFs()) return; const out = !document.fullscreenElement; setOutFs(out); if (out) { setLeft(n => n + 1); send('fullscreen_exit'); } };
    const onPaste = () => send('paste');
    send('start');
    document.addEventListener('visibilitychange', onVis); window.addEventListener('blur', onBlur); window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('paste', onPaste);
    };
  }, [lessonId, on, demo]);
  return { left, outFs };
}

/** The student's exam page; `demo`: the teacher takes their own random variant, nothing is sent (proctoring and scratch stay local). */
export function ExamPage({ lessonId, me, demo = false }: { lessonId: string; me: { full_name?: string; class_id?: string | null }; demo?: boolean }) {
  const [started, setStarted] = useState(false), [done, setDone] = useState(false);
  const { left, outFs } = useProctor(lessonId, started && !done, demo);
  const exit = () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); window.location.hash = demo ? 'lessons/courses' : 'courses/list'; };
  const [cls, setCls] = useState('');
  useEffect(() => { if (!demo && me.class_id && !DEMO) sb.from('classes').select('name').eq('id', me.class_id).maybeSingle().then(({ data }: any) => setCls(data?.name || '')); }, [me.class_id, demo]);

  // scratch paper: loaded once the exam starts, every sheet saved a second after the last stroke (088)
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  useEffect(() => { if (started && !demo && !DEMO) void sb.rpc('cf_exam_scratch_get', { p_lesson: lessonId }).then(({ data }: any) => { if (Array.isArray(data) && data.length) setSheets(data); }); }, [started, demo, lessonId]);
  const saveSheet = useCallback((i: number, sheet: Sheet) => {
    if (demo || DEMO) return;
    clearTimeout(timers.current[i]);
    timers.current[i] = setTimeout(() => { void sb.rpc('cf_exam_scratch_save', { p_lesson: lessonId, p_sheet: i, p_strokes: sheet }).then(() => {}, () => {}); }, 1000);
  }, [demo, lessonId]);

  // demo: the lesson's slides (the teacher may read the keys), a random variant per task, scored here
  const [round, setRound] = useState(0);
  const [slides, setSlides] = useState<any[] | null>(null);
  useEffect(() => { if (demo) sb.from('cf_lessons').select('title,slides').eq('id', lessonId).maybeSingle().then(({ data }: any) => setSlides(data ? [data.title, ...(data.slides || [])] : [])); }, [demo, lessonId]);
  const pick = useMemo(() => (slides ? demoPick(slides.slice(1)) : []), [slides, round]);
  const load = useMemo(() => (demo ? async () => {
    if (!slides) throw new Error('Жүктелуде…');
    return { title: slides[0] as string, closes_at: null, slides: demoPaper(slides.slice(1), pick) };
  } : undefined), [demo, slides, pick]);
  const submit = useMemo(() => (demo ? async (a: Record<string, string>) => demoScore(slides!.slice(1), pick, a) : undefined), [demo, slides, pick]);

  const who = (
    <header className="sticky top-0 z-30 -mx-3 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface px-4 py-2 sm:-mx-6">
      <span className="text-xl font-black tracking-tight sm:text-2xl">{me.full_name || 'Оқушы'}</span>
      {cls && <span className="rounded-full bg-accent-soft px-3 py-0.5 text-sm font-bold text-on-accent-soft">{cls}</span>}
      {demo && <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-3 py-0.5 text-sm font-bold"><FlaskConical size={14} aria-hidden="true" />Демо: ештеңе сақталмайды</span>}
    </header>
  );

  if (!started) return (
    <main className="grid min-h-screen place-items-center bg-bg p-4 text-text">
      <section aria-labelledby="exam-rules" className="w-full max-w-lg space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-pop">
        <p className="text-lg font-black">{me.full_name}{cls ? ` · ${cls}` : ''}{demo ? ' · демо' : ''}</p>
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-on-accent-soft"><ShieldCheck size={26} aria-hidden="true" /></span>
          <h1 id="exam-rules" className="text-2xl font-black">Емтихан ережесі</h1></div>
        <ul className="list-disc space-y-1.5 pl-5 text-text-secondary">
          <li>Емтихан {canFs() ? 'толық экранда' : 'осы бетте'} өтеді. Басқа бетке, қосымшаға өтпе.</li>
          <li>Беттен шығу{canFs() ? ', толық экраннан шығу' : ''} және мәтін қою мұғалімге уақытымен көрсетіледі.</li>
          <li>Есептеу үшін «Шимай қағаз» бар: ол өшірілмейді, мұғалім көреді.</li>
          <li>Жауаптарың сақталып тұрады. Жіберу — бір-ақ рет.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { if (canFs()) void goFs(); setStarted(true); }}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 text-lg font-bold text-on-accent hover:bg-accent-hover cursor-pointer">
            <Maximize size={20} aria-hidden="true" />Емтиханды бастау</button>
          <button type="button" onClick={exit} className="min-h-[52px] rounded-full border border-border px-5 font-semibold cursor-pointer hover:bg-surface-2">Артқа</button>
        </div>
      </section>
    </main>
  );

  if (demo && !slides) return <main className="grid min-h-screen place-items-center bg-bg text-text-muted">Жүктелуде…</main>;
  return (
    <main className="min-h-screen bg-bg px-3 pb-24 text-text sm:px-6">
      {who}
      <div className="mx-auto max-w-3xl space-y-3">
        {demo && <p className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm">
          Нұсқалар: <b className="font-mono tracking-widest">{pick.filter((_, i) => { const x = slides![i + 1]; return x?.qvariants?.length || x?.xtext?.length; }).map(v => String.fromCharCode(65 + v)).join('')}</b>
          <button type="button" onClick={() => { try { sessionStorage.removeItem('cf_exam_demo:' + lessonId); } catch { /* */ } setRound(n => n + 1); }} className="ml-auto inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-3 font-semibold cursor-pointer hover:bg-surface-2"><RefreshCw size={14} aria-hidden="true" />Басқа нұсқа</button></p>}
        {left > 0 && !done && <p role="status" className="rounded-xl border border-warning bg-warning-soft px-4 py-2 text-sm font-semibold">Емтихан бетінен шықтың: {left} рет. Мұғалім мұны көреді.</p>}
        <ExamTaker key={round} lesson={{ id: demo ? 'demo:' + lessonId : lessonId, title: '', n: 0, exam: true }} back={exit} load={load} submit={submit}
          onDone={() => { setDone(true); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); }} />
      </div>
      {!done && <ScratchPad key={round} sheets={sheets} onChange={saveSheet} />}
      {outFs && !done && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="fs-back" className="fixed inset-0 z-50 grid place-items-center bg-bg/95 p-4">
          <div className="max-w-md space-y-4 text-center">
            <h2 id="fs-back" className="text-2xl font-black">Толық экраннан шықтың</h2>
            <p className="text-text-secondary">Бұл мұғалімге жіберілді. Емтиханды жалғастыру үшін толық экранға қайт.</p>
            <button type="button" autoFocus onClick={() => void goFs()} className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-accent px-6 text-lg font-bold text-on-accent cursor-pointer"><Maximize size={20} aria-hidden="true" />Толық экранға қайту</button>
          </div>
        </div>
      )}
    </main>
  );
}
