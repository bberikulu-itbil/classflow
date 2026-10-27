import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Binary, Dice5, Languages, Maximize, Minimize, Pencil, Timer as TimerIcon, Trophy } from 'lucide-react';
import { sb } from '../config';
import { tr, useLang } from '../lessons/lang';
import { renderSlide, spaced, fmt, lbTable, clock } from './Widgets';
import qrcode from 'qrcode-generator';
import { DockBtn, Win, usePersist, useWide } from '../board/Win';
import { QrDock, qrReserve, type Qr } from '../board/QrDock';
import { DrawBar, DrawLayer, type Pen, type Stroke } from '../board/Draw';
import { ConvBody, RandomBody, ScoreBody, TimerBody, useTimer } from '../board/Tools';

// clock() is a hook; as its own component the hook count no longer changes when a task appears
const TaskClock = ({ task }: { task: any }) => <>{clock(task)}</>;

export function BoardView({ sid }: { sid: string }) {
  const [session, setSession] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [groupScores, setGroupScores] = useState<any[]>([]);
  const [task, setTask] = useState<any>(null);
  const [subsCount, setSubsCount] = useState(0);
  const [qr, setQr] = usePersist<Qr>('cf_board_qr', { side: 'right', y: 0.1, open: window.innerWidth >= 1024, big: false });
  const [pen, setPen] = usePersist<Pen>('cf_board_pen', { tool: 'pen', color: '#ef4444', width: 6, bg: 'clear' });
  const [draw, setDraw] = useState(false), [strokes, setStrokes] = useState<Stroke[]>([]);
  const [wins, setWins] = useState<string[]>([]), [full, setFull] = useState(!!document.fullscreenElement);
  const timer = useTimer(), wide = useWide();
  const [lang, flipLang] = useLang();

  const refresh = async () => {
    try {
      const [sRes, curRes, pRes, lbRes, gsRes] = await Promise.all([
        sb.from('cf_sessions').select('*').eq('id', sid).single(),
        sb.rpc('cf_slide', { p_session: sid }),
        sb.from('cf_participants').select('student_id,full_name,presence').eq('session_id', sid),
        sb.rpc('cf_leaderboard', { p_session: sid }),
        sb.rpc('cf_group_scores', { p_session: sid }),
      ]);
      if (sRes.data) setSession(sRes.data);
      if (curRes.data) setCurrentSlide(curRes.data);
      if (pRes.data) setParts(pRes.data);
      if (lbRes.data) setLeaderboard(lbRes.data);
      if (gsRes.data) setGroupScores(gsRes.data);

      if (sRes.data?.active_task_id) {
        const t = (await sb.from('cf_tasks').select('*').eq('id', sRes.data.active_task_id).single()).data;
        setTask(t);
        const sList = (await sb.from('cf_submissions').select('id').eq('task_id', t.id)).data;
        setSubsCount(sList?.length || 0);
      } else {
        setTask(null);
        setSubsCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refresh();
    const ch = sb.channel('cf-board-' + sid);
    ['cf_sessions', 'cf_participants', 'cf_tasks', 'cf_submissions', 'cf_scores'].forEach(tb => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, () => refresh());
    });
    ch.subscribe();
    const iv = setInterval(refresh, 8000);
    return () => {
      sb.removeChannel(ch);
      clearInterval(iv);
    };
  }, [sid]);

  const slideNo = session?.current_slide, total = session?.slide_count || 0;
  // same call as the remote's Артқа / Алға; refresh() shows the new slide at once instead of waiting for realtime
  const go = async (i: number) => {
    if (i < 0 || i >= total) return;
    const { error } = await sb.rpc('cf_goto', { p_session: sid, p_index: i });
    if (error) console.error(error); else refresh();
  };
  const prev = slideNo > 0 ? () => go(slideNo - 1) : undefined, next = slideNo < total - 1 ? () => go(slideNo + 1) : undefined;
  // an annotation belongs to its slide; a blank board (white, grid, dark) is kept across slides
  useEffect(() => { if (pen.bg === 'clear') setStrokes([]); }, [slideNo]);
  useEffect(() => {
    const f = () => setFull(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f);
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === 'Escape') { if (draw) setDraw(false); else setWins(w => w.slice(0, -1)); return; }
      if (e.altKey || e.ctrlKey || e.metaKey || t?.closest('input,textarea,select,[contenteditable=true]')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next?.(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev?.(); }
    };
    window.addEventListener('keydown', k);
    return () => { document.removeEventListener('fullscreenchange', f); window.removeEventListener('keydown', k); };
  }, [draw, slideNo, total]);

  if (!session) return <div data-theme="dark" className="min-h-screen bg-bg flex items-center justify-center text-text text-2xl">Жүктелуде...</div>;

  const qrSvg = (() => {
    try {
      const q = qrcode(0, 'M');
      q.addData(location.origin + location.pathname + '#join/' + session.join_code);
      q.make();
      return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch {
      return '';
    }
  })();

  const ended = session.status === 'ended';
  const toggle = (id: string) => setWins(w => (w.includes(id) ? w.filter(x => x !== id) : [...w, id]));
  const raise = (id: string) => setWins(w => (w[w.length - 1] === id ? w : [...w.filter(x => x !== id), id]));
  const fullscreen = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* not allowed in this browser */ } };
  const people = parts.map((p: any) => ({ name: p.full_name || '—', online: p.presence === 'online' }));
  const reserve = wide && !ended && qr.open ? qrReserve(qr) : 0;
  const win = (id: string, title: string, icon: React.ReactNode, at: { x: number; y: number }, body: React.ReactNode, w?: number) => wins.includes(id) && (
    <Win key={id} id={id} title={title} icon={icon} at={at} w={w} z={50 + wins.indexOf(id)} onFocus={() => raise(id)} onClose={() => toggle(id)}>{body}</Win>
  );
  const tl = !timer.running && !timer.done && timer.left === timer.total ? 'Таймер' : fmt(timer.left);

  return (
    <div data-theme="dark" className="relative min-h-screen bg-bg text-text">
      {ended ? (
        <main className="flex min-h-screen items-center justify-center"><h1 className="text-5xl font-black">Сабақ аяқталды</h1></main>
      ) : (
        <>
          <main className="flex min-h-screen items-center justify-center pb-32 pt-16" style={{ paddingLeft: 32 + (qr.side === 'left' ? reserve : 0), paddingRight: 32 + (qr.side === 'right' ? reserve : 0) }}>
            {renderSlide(tr(currentSlide?.slide || {}, lang), { mode: 'board', lb: () => lbTable(leaderboard) })}
          </main>
          {session.slide_count > 0 && <p className="fixed left-4 top-16 z-20 rounded-full sm:top-4 bg-surface-2 px-3 py-1 text-sm text-text-secondary">Слайд {(session.current_slide || 0) + 1} / {session.slide_count}</p>}
          {task && (
            <div role="status" className={`fixed inset-x-2 top-3 z-40 mx-auto flex w-fit items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 text-lg font-semibold shadow-lg ${task.status === 'open' ? 'bg-success-soft text-text' : 'bg-surface-2 text-text-secondary'}`}>
              {task.status === 'open' ? <span>Тапсырды {subsCount} / {parts.length}</span> : <span>Тапсырма жабық</span>}
              <TaskClock task={task} />
            </div>
          )}
          <QrDock q={qr} set={setQr} svg={qrSvg} code={session.join_code} count={parts.length} />
          {draw && <DrawLayer pen={pen} strokes={strokes} onCommit={s => setStrokes(a => [...a, s])} />}
          <div role="toolbar" aria-label={draw ? 'Сызу құралдары' : 'Тақта құралдары'} className="fixed inset-x-2 bottom-3 z-40 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-border bg-surface p-1.5 text-text shadow-2xl">
            {draw ? (
              <DrawBar pen={pen} set={setPen} canUndo={strokes.length > 0} undo={() => setStrokes(a => a.slice(0, -1))} clear={() => setStrokes([])} close={() => setDraw(false)} nav={{ prev, next }} />
            ) : (
              <>
                <DockBtn label="Артқа" disabled={!prev} onClick={() => prev?.()}><ArrowLeft size={22} /></DockBtn>
                <DockBtn label="Сызу" onClick={() => setDraw(true)}><Pencil size={22} /></DockBtn>
                <DockBtn label={tl} pressed={wins.includes('timer')} onClick={() => toggle('timer')}><TimerIcon size={22} /></DockBtn>
                <DockBtn label="Кездейсоқ" pressed={wins.includes('rand')} onClick={() => toggle('rand')}><Dice5 size={22} /></DockBtn>
                <DockBtn label="Сан жүйесі" pressed={wins.includes('conv')} onClick={() => toggle('conv')}><Binary size={22} /></DockBtn>
                <DockBtn label="Ұпай" pressed={wins.includes('score')} onClick={() => toggle('score')}><Trophy size={22} /></DockBtn>
                <DockBtn label={lang === 'ru' ? 'Язык: РУС' : 'Тіл: ҚАЗ'} onClick={flipLang}><Languages size={22} /></DockBtn>
                <DockBtn label={full ? 'Терезеге' : 'Толық экран'} onClick={fullscreen}>{full ? <Minimize size={22} /> : <Maximize size={22} />}</DockBtn>
                <DockBtn label="Алға" strong disabled={!next} onClick={() => next?.()}><ArrowRight size={22} /></DockBtn>
              </>
            )}
          </div>
          {win('timer', 'Таймер', <TimerIcon size={18} />, { x: 24, y: 96 }, <TimerBody t={timer} />, 320)}
          {win('rand', 'Кездейсоқ оқушы', <Dice5 size={18} />, { x: 64, y: 120 }, <RandomBody people={people} />, 340)}
          {win('conv', 'Санау жүйелері', <Binary size={18} />, { x: 104, y: 144 }, <ConvBody />, 360)}
          {win('score', 'Топтар мен ұпай', <Trophy size={18} />, { x: 144, y: 168 }, <ScoreBody count={parts.length} groups={groupScores} lb={leaderboard} />, 360)}
        </>
      )}
    </div>
  );
}
