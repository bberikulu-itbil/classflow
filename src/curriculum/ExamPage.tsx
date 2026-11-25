// The exam (БЖБ) on a page of its own, in full screen, with proctoring (087): leaving the page (another tab or window),
// leaving full screen and pasting are sent to cf_exam_focus and shown to the teacher next to the result.
// Phones that cannot go full screen (iPhone Safari) take the exam without the full-screen lock; leaving is still logged.
import { useEffect, useRef, useState } from 'react';
import { Maximize, ShieldCheck } from 'lucide-react';
import { sb, DEMO } from '../config';
import { ExamTaker } from './StudentCourses';

type Kind = 'start' | 'hidden' | 'blur' | 'fullscreen_exit' | 'paste';
const canFs = () => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;
const goFs = () => document.documentElement.requestFullscreen?.().catch(() => {});

/** Logs leaving the exam. One leave = one row with no duration; coming back adds a row with how long it took. */
function useProctor(lessonId: string, on: boolean) {
  const [left, setLeft] = useState(0), [outFs, setOutFs] = useState(false);
  const away = useRef<{ kind: Kind; t: number } | null>(null);
  useEffect(() => {
    if (!on) return;
    const send = (kind: Kind, ms?: number) => { if (!DEMO) void sb.rpc('cf_exam_focus', { p_lesson: lessonId, p_kind: kind, p_ms: ms ?? null }).then(() => {}, () => {}); };
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
  }, [lessonId, on]);
  return { left, outFs };
}

export function ExamPage({ lessonId }: { lessonId: string }) {
  const [started, setStarted] = useState(false), [done, setDone] = useState(false);
  const { left, outFs } = useProctor(lessonId, started && !done);
  const exit = () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); window.location.hash = 'courses/list'; };

  if (!started) return (
    <main className="grid min-h-screen place-items-center bg-bg p-4 text-text">
      <section aria-labelledby="exam-rules" className="w-full max-w-lg space-y-4 rounded-3xl border border-border bg-surface p-6 shadow-pop">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-on-accent-soft"><ShieldCheck size={26} aria-hidden="true" /></span>
          <h1 id="exam-rules" className="text-2xl font-black">Емтихан ережесі</h1></div>
        <ul className="list-disc space-y-1.5 pl-5 text-text-secondary">
          <li>Емтихан {canFs() ? 'толық экранда' : 'осы бетте'} өтеді. Басқа бетке, қосымшаға өтпе.</li>
          <li>Беттен шығу{canFs() ? ', толық экраннан шығу' : ''} және мәтін қою мұғалімге уақытымен көрсетіледі.</li>
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

  return (
    <main className="min-h-screen bg-bg p-3 text-text sm:p-6">
      <div className="mx-auto max-w-3xl space-y-3">
        {left > 0 && !done && <p role="status" className="rounded-xl border border-warning bg-warning-soft px-4 py-2 text-sm font-semibold">Емтихан бетінен шықтың: {left} рет. Мұғалім мұны көреді.</p>}
        <ExamTaker lesson={{ id: lessonId, title: '', n: 0, exam: true }} back={exit} onDone={() => { setDone(true); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); }} />
      </div>
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
