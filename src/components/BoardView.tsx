import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Binary, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Eye, LogOut, Maximize, Minimize, Pencil, Timer as TimerIcon, Wrench } from 'lucide-react';
import { sb } from '../config';
import { tr, useLang } from '../lessons/lang';
import { countSpoilers, spCtx, useSpoilers } from '../lessons/spoil';
import { renderSlide, spaced, fmt, lbTable, clock } from './Widgets';
import qrcode from 'qrcode-generator';
import { DockBtn, Win, usePersist, useWide } from '../board/Win';
import { ActivityPanel, DesignPanel, PANELS, PANEL_W, PeoplePanel, SidePanel, TocPanel, tone, type PanelId } from '../board/Panels';
import '../board/look.css';
import { DrawBar, DrawLayer, type Pen, type Stroke } from '../board/Draw';
import { ConvBody, TimerBody, useTimer } from '../board/Tools';

// clock() is a hook; as its own component the hook count no longer changes when a task appears
const TaskClock = ({ task }: { task: any }) => <>{clock(task)}</>;

const RAIL = 84;

export function BoardView({ sid }: { sid: string }) {
  const [session, setSession] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [groupScores, setGroupScores] = useState<any[]>([]);
  const [task, setTask] = useState<any>(null);
  const [subsCount, setSubsCount] = useState(0);
  const [bigQr, setBigQr] = useState(false), [panel, setPanel] = useState<PanelId | ''>('');
  const [pen, setPen] = usePersist<Pen>('cf_board_pen', { tool: 'pen', color: '#ef4444', width: 6, bg: 'clear' });
  const [draw, setDraw] = useState(false), [strokes, setStrokes] = useState<Stroke[]>([]);
  const [wins, setWins] = useState<string[]>([]), [full, setFull] = useState(!!document.fullscreenElement);
  const timer = useTimer(), wide = useWide();
  const [lang, flipLang] = useLang();
  const [ui, setUi] = usePersist('cf_board_ui', { dock: true, rail: window.innerWidth >= 1024, hidePts: false });
  const [look, setLook] = usePersist('cf_board_look', { bg: '', size: 1 });
  const [toc, setToc] = useState<any[] | null | false>(null);
  const spoil = useSpoilers(session?.current_slide ?? -1);

  const refresh = async () => {
    try {
      const [sRes, curRes, pRes, lbRes, gsRes] = await Promise.all([
        sb.from('cf_sessions').select('*').eq('id', sid).single(),
        sb.rpc('cf_slide', { p_session: sid }),
        sb.from('cf_participants').select('student_id,full_name,presence,group_no').eq('session_id', sid),
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
  // Алға first opens what the slide still hides («||…||» text, hide-sections), then changes the slide
  const slideTr = tr(currentSlide?.slide || {}, lang), nHidden = countSpoilers(slideTr), hidden = Math.max(0, nHidden - spoil.shown.size);
  const prev = slideNo > 0 ? () => go(slideNo - 1) : undefined;
  const next = hidden > 0 ? () => { spoil.revealNext(nHidden); } : slideNo < total - 1 ? () => go(slideNo + 1) : undefined;
  // an annotation belongs to its slide; a blank board (white, grid, dark) is kept across slides
  useEffect(() => { if (pen.bg === 'clear') setStrokes([]); }, [slideNo]);
  useEffect(() => {
    const f = () => setFull(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f);
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === 'Escape') { if (draw) setDraw(false); else if (wins.length) setWins(w => w.slice(0, -1)); else setPanel(''); return; }
      if (e.altKey || e.ctrlKey || e.metaKey || t?.closest('input,textarea,select,[contenteditable=true]')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next?.(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev?.(); }
    };
    window.addEventListener('keydown', k);
    return () => { document.removeEventListener('fullscreenchange', f); window.removeEventListener('keydown', k); };
  }, [draw, wins, slideNo, total, hidden, spoil.shown]);
  // the contents list is read once, the first time its window opens (the board belongs to the teacher, who may read the slides)
  useEffect(() => {
    if (panel !== 'toc' || toc !== null) return;
    sb.from('cf_session_private').select('slides').eq('session_id', sid).maybeSingle().then(({ data }: any) => setToc(Array.isArray(data?.slides) ? data.slides : false));
  }, [panel, toc, sid]);

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
  const railW = wide && ui.rail ? RAIL : 0, panelW = wide && ui.rail && panel ? PANEL_W : 0, inset = railW + panelW, edge = (ui.rail ? RAIL : 0) + panelW;
  const split = async (count: number, onlyOnline: boolean) => {
    const { error } = await sb.rpc('cf_random_groups', { p_session: sid, p_count: count, p_only_online: onlyOnline });
    if (error) return 'Бөлу мүмкін болмады: ' + error.message;
    await refresh();
    return null;
  };
  // the board is opened in its own tab: close it, or (if the browser refuses) go back to the remote
  const leave = () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* ignore */ }
    window.close();
    setTimeout(() => { location.hash = '#remote/' + sid; }, 200);
  };
  const openPanel = (id: PanelId) => setPanel(p => (p === id ? '' : id));
  const mode = tone(look.bg);
  const win = (id: string, title: string, icon: React.ReactNode, at: { x: number; y: number }, body: React.ReactNode, w?: number) => wins.includes(id) && (
    <Win key={id} id={id} title={title} icon={icon} at={at} w={w} z={50 + wins.indexOf(id)} onFocus={() => raise(id)} onClose={() => toggle(id)}>{body}</Win>
  );
  const tl = !timer.running && !timer.done && timer.left === timer.total ? 'Таймер' : fmt(timer.left);
  const tab = 'fixed z-40 flex items-center justify-center border border-border bg-surface text-text shadow-lg hover:bg-surface-2';

  return (
    <div data-theme="dark" style={look.bg ? { background: look.bg } : undefined} className={`relative min-h-screen bg-bg text-text cf-${mode}`}>
      {ended ? (
        <main className="cf-slide flex min-h-screen items-center justify-center"><h1 className="text-5xl font-black text-white">Сабақ аяқталды</h1></main>
      ) : (
        <>
          <main className="flex min-h-screen items-center justify-center pb-32 pt-24 lg:pt-16" style={{ paddingLeft: 32 + inset, paddingRight: 32 }}>
            <div style={{ zoom: look.size }} className="flex w-full justify-center">
              {renderSlide(slideTr, { mode: 'board', lb: () => lbTable(leaderboard, ui.hidePts), sp: spCtx(spoil) })}
            </div>
          </main>
          {session.slide_count > 0 && <p className="fixed left-4 top-4 z-20 rounded-full bg-surface-2 px-3 py-1 text-sm text-text-secondary" style={{ left: 16 + edge }}>Слайд {(session.current_slide || 0) + 1} / {session.slide_count}</p>}
          {task && (
            <div role="status" style={{ left: edge + 8 }} className={`fixed right-2 top-[68px] z-40 mx-auto flex w-fit lg:top-3 items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 text-lg font-semibold shadow-lg ${task.status === 'open' ? 'bg-success-soft text-text' : 'bg-surface-2 text-text-secondary'}`}>
              {task.status === 'open' ? <span>Тапсырды {subsCount} / {parts.length}</span> : <span>Тапсырма жабық</span>}
              <TaskClock task={task} />
            </div>
          )}
          <div className="fixed right-3 top-3 z-40 flex items-center gap-2">
            <button type="button" onClick={fullscreen} aria-label={full ? 'Толық экраннан шығу' : 'Толық экран'} title={full ? 'Толық экраннан шығу' : 'Толық экран'} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text shadow-lg hover:bg-surface-2">{full ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}</button>
            <button type="button" onClick={leave} className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text shadow-lg hover:bg-surface-2"><LogOut size={18} aria-hidden="true" />Слайдтан шығу</button>
          </div>
          {draw && <DrawLayer pen={pen} strokes={strokes} onCommit={s => setStrokes(a => [...a, s])} />}

          {ui.rail ? (
            <div role="toolbar" aria-orientation="vertical" aria-label="Тақта мәзірі" className="fixed inset-y-0 left-0 z-40 flex flex-col items-stretch justify-center gap-1 border-r border-border bg-surface p-1 text-text shadow-2xl" style={{ width: RAIL }}>
              {PANELS.map(x => <DockBtn key={x.id} label={x.label} pressed={panel === x.id} onClick={() => openPanel(x.id)}>{x.icon}</DockBtn>)}
              <DockBtn label="Жасыру" onClick={() => { setPanel(''); setUi(u => ({ ...u, rail: false })); }}><ChevronLeft size={22} /></DockBtn>
            </div>
          ) : (
            <button type="button" onClick={() => setUi(u => ({ ...u, rail: true }))} aria-label="Мәзірді көрсету" title="Мәзірді көрсету" className={`${tab} left-0 top-1/2 min-h-[72px] w-10 -translate-y-1/2 rounded-r-xl border-l-0`}><ChevronRight size={22} aria-hidden="true" /></button>
          )}

          {ui.dock || draw ? (
            <div role="toolbar" aria-label={draw ? 'Сызу құралдары' : 'Тақта құралдары'} style={{ left: edge + 8 }} className="fixed right-2 bottom-3 z-40 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-border bg-surface p-1.5 text-text shadow-2xl">
              {draw ? (
                <DrawBar pen={pen} set={setPen} canUndo={strokes.length > 0} undo={() => setStrokes(a => a.slice(0, -1))} clear={() => setStrokes([])} close={() => setDraw(false)} nav={{ prev, next }} />
              ) : (
                <>
                  <DockBtn label="Артқа" disabled={!prev} onClick={() => prev?.()}><ArrowLeft size={22} /></DockBtn>
                  <DockBtn label="Сызу" onClick={() => setDraw(true)}><Pencil size={22} /></DockBtn>
                  <DockBtn label={tl} pressed={wins.includes('timer')} onClick={() => toggle('timer')}><TimerIcon size={22} /></DockBtn>
                  <DockBtn label="Сан жүйесі" pressed={wins.includes('conv')} onClick={() => toggle('conv')}><Binary size={22} /></DockBtn>
                  <DockBtn label="Жасыру" onClick={() => setUi(u => ({ ...u, dock: false }))}><ChevronDown size={22} /></DockBtn>
                  <DockBtn label={hidden > 0 ? 'Көрсету' : 'Алға'} strong disabled={!next} onClick={() => next?.()}>{hidden > 0 ? <Eye size={22} /> : <ArrowRight size={22} />}</DockBtn>
                </>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => setUi(u => ({ ...u, dock: true }))} aria-label="Құралдар панелін көрсету" style={{ left: edge }} className={`${tab} right-0 bottom-0 mx-auto w-fit gap-2 rounded-t-xl border-b-0 px-5 py-2 text-sm font-semibold`}><Wrench size={18} aria-hidden="true" />Құралдар<ChevronUp size={18} aria-hidden="true" /></button>
          )}

          {win('timer', 'Таймер', <TimerIcon size={18} />, { x: 24 + inset, y: 96 }, <TimerBody t={timer} />, 320)}
          {win('conv', 'Санау жүйелері', <Binary size={18} />, { x: 64 + inset, y: 120 }, <ConvBody />, 360)}
          {panel && ui.rail && (() => {
            const meta = PANELS.find(x => x.id === panel)!;
            return (
              <SidePanel title={meta.label} icon={meta.icon} left={RAIL} onClose={() => setPanel('')}>
                {panel === 'toc' && <TocPanel toc={toc} now={slideNo} lang={lang} go={go} />}
                {panel === 'people' && <PeoplePanel svg={qrSvg} code={session.join_code} big={bigQr} setBig={setBigQr} parts={parts} />}
                {panel === 'activity' && <ActivityPanel parts={parts} session={session} groupScores={groupScores} leaderboard={leaderboard} hide={ui.hidePts} setHide={v => setUi(u => ({ ...u, hidePts: v }))} split={split} />}
                {panel === 'design' && <DesignPanel bg={look.bg} setBg={v => setLook(l => ({ ...l, bg: v }))} size={look.size} setSize={v => setLook(l => ({ ...l, size: v }))} lang={lang} flip={flipLang} />}
              </SidePanel>
            );
          })()}
        </>
      )}
    </div>
  );
}
