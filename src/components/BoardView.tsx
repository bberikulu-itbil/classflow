import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Binary, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Dice5, Eye, Languages, List, Maximize, Minimize, Palette, Pencil, Timer as TimerIcon, Trophy, Users, Wrench } from 'lucide-react';
import { sb } from '../config';
import { tr, useLang } from '../lessons/lang';
import { countSpoilers, spCtx, useSpoilers } from '../lessons/spoil';
import { renderSlide, spaced, fmt, lbTable, clock } from './Widgets';
import qrcode from 'qrcode-generator';
import { DockBtn, Win, usePersist, useWide } from '../board/Win';
import { QrDock, qrReserve, type Qr } from '../board/QrDock';
import { DrawBar, DrawLayer, type Pen, type Stroke } from '../board/Draw';
import { ConvBody, RandomBody, ScoreBody, TimerBody, useTimer } from '../board/Tools';

// clock() is a hook; as its own component the hook count no longer changes when a task appears
const TaskClock = ({ task }: { task: any }) => <>{clock(task)}</>;

const RAIL = 96;
/** Board backgrounds: all dark, because slide text is light. '' keeps the theme's own dark. */
const BGS = [{ n: 'Әдепкі', v: '' }, { n: 'Көк түн', v: '#0a1a3a' }, { n: 'Орман', v: '#0b2a20' }, { n: 'Қызғылт күңгірт', v: '#2a1235' }, { n: 'Шифер', v: '#1e293b' }, { n: 'Таза қара', v: '#000000' }];
const SIZES = [{ n: 'Кіші', v: 0.85 }, { n: 'Қалыпты', v: 1 }, { n: 'Үлкен', v: 1.25 }, { n: 'Өте үлкен', v: 1.5 }];

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
  const [ui, setUi] = usePersist('cf_board_ui', { dock: true, rail: window.innerWidth >= 1024 });
  const [look, setLook] = usePersist('cf_board_look', { bg: '', size: 1 });
  const [toc, setToc] = useState<any[] | null | false>(null);
  const spoil = useSpoilers(session?.current_slide ?? -1);

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
      if (e.key === 'Escape') { if (draw) setDraw(false); else setWins(w => w.slice(0, -1)); return; }
      if (e.altKey || e.ctrlKey || e.metaKey || t?.closest('input,textarea,select,[contenteditable=true]')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next?.(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev?.(); }
    };
    window.addEventListener('keydown', k);
    return () => { document.removeEventListener('fullscreenchange', f); window.removeEventListener('keydown', k); };
  }, [draw, slideNo, total, hidden, spoil.shown]);
  // the contents list is read once, the first time its window opens (the board belongs to the teacher, who may read the slides)
  useEffect(() => {
    if (!wins.includes('toc') || toc !== null) return;
    sb.from('cf_session_private').select('slides').eq('session_id', sid).maybeSingle().then(({ data }: any) => setToc(Array.isArray(data?.slides) ? data.slides : false));
  }, [wins, toc, sid]);

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
  const railW = wide && ui.rail ? RAIL : 0;
  const win = (id: string, title: string, icon: React.ReactNode, at: { x: number; y: number }, body: React.ReactNode, w?: number) => wins.includes(id) && (
    <Win key={id} id={id} title={title} icon={icon} at={at} w={w} z={50 + wins.indexOf(id)} onFocus={() => raise(id)} onClose={() => toggle(id)}>{body}</Win>
  );
  const tl = !timer.running && !timer.done && timer.left === timer.total ? 'Таймер' : fmt(timer.left);
  const tab = 'fixed z-40 flex items-center justify-center border border-border bg-surface text-text shadow-lg hover:bg-surface-2';

  return (
    <div data-theme="dark" style={look.bg ? { background: look.bg } : undefined} className="relative min-h-screen bg-bg text-text">
      {ended ? (
        <main className="flex min-h-screen items-center justify-center"><h1 className="text-5xl font-black">Сабақ аяқталды</h1></main>
      ) : (
        <>
          <main className="flex min-h-screen items-center justify-center pb-32 pt-16" style={{ paddingLeft: 32 + railW + (qr.side === 'left' ? reserve : 0), paddingRight: 32 + (qr.side === 'right' ? reserve : 0) }}>
            <div style={{ zoom: look.size }} className="flex w-full justify-center">
              {renderSlide(slideTr, { mode: 'board', lb: () => lbTable(leaderboard), sp: spCtx(spoil) })}
            </div>
          </main>
          {session.slide_count > 0 && <p className="fixed left-4 top-16 z-20 rounded-full sm:top-4 bg-surface-2 px-3 py-1 text-sm text-text-secondary" style={{ left: 16 + railW }}>Слайд {(session.current_slide || 0) + 1} / {session.slide_count}</p>}
          {task && (
            <div role="status" className={`fixed inset-x-2 top-3 z-40 mx-auto flex w-fit items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 text-lg font-semibold shadow-lg ${task.status === 'open' ? 'bg-success-soft text-text' : 'bg-surface-2 text-text-secondary'}`}>
              {task.status === 'open' ? <span>Тапсырды {subsCount} / {parts.length}</span> : <span>Тапсырма жабық</span>}
              <TaskClock task={task} />
            </div>
          )}
          <QrDock q={qr} set={setQr} svg={qrSvg} code={session.join_code} count={parts.length} inset={railW} />
          {draw && <DrawLayer pen={pen} strokes={strokes} onCommit={s => setStrokes(a => [...a, s])} />}

          {ui.rail ? (
            <div role="toolbar" aria-orientation="vertical" aria-label="Тақта мәзірі" className="fixed left-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-stretch gap-0.5 rounded-r-2xl border border-l-0 border-border bg-surface p-1 text-text shadow-2xl" style={{ width: RAIL - 12 }}>
              <DockBtn label="Мазмұны" pressed={wins.includes('toc')} onClick={() => toggle('toc')}><List size={22} /></DockBtn>
              <DockBtn label="Қатысушылар" pressed={wins.includes('people')} onClick={() => toggle('people')}><Users size={22} /></DockBtn>
              <DockBtn label="Топтар" pressed={wins.includes('score')} onClick={() => toggle('score')}><Trophy size={22} /></DockBtn>
              <DockBtn label="Дизайн" pressed={wins.includes('design')} onClick={() => toggle('design')}><Palette size={22} /></DockBtn>
              <DockBtn label={lang === 'ru' ? 'Язык: РУС' : 'Тіл: ҚАЗ'} onClick={flipLang}><Languages size={22} /></DockBtn>
              <DockBtn label="Жасыру" onClick={() => setUi(u => ({ ...u, rail: false }))}><ChevronLeft size={22} /></DockBtn>
            </div>
          ) : (
            <button type="button" onClick={() => setUi(u => ({ ...u, rail: true }))} aria-label="Мәзірді көрсету" title="Мәзірді көрсету" className={`${tab} left-0 top-1/2 min-h-[72px] w-10 -translate-y-1/2 rounded-r-xl border-l-0`}><ChevronRight size={22} aria-hidden="true" /></button>
          )}

          {ui.dock || draw ? (
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
                  <DockBtn label={full ? 'Терезеге' : 'Толық экран'} onClick={fullscreen}>{full ? <Minimize size={22} /> : <Maximize size={22} />}</DockBtn>
                  <DockBtn label="Жасыру" onClick={() => setUi(u => ({ ...u, dock: false }))}><ChevronDown size={22} /></DockBtn>
                  <DockBtn label={hidden > 0 ? 'Көрсету' : 'Алға'} strong disabled={!next} onClick={() => next?.()}>{hidden > 0 ? <Eye size={22} /> : <ArrowRight size={22} />}</DockBtn>
                </>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => setUi(u => ({ ...u, dock: true }))} aria-label="Құралдар панелін көрсету" className={`${tab} inset-x-0 bottom-0 mx-auto w-fit gap-2 rounded-t-xl border-b-0 px-5 py-2 text-sm font-semibold`}><Wrench size={18} aria-hidden="true" />Құралдар<ChevronUp size={18} aria-hidden="true" /></button>
          )}

          {win('toc', 'Мазмұны', <List size={18} />, { x: railW + 16, y: 96 },
            toc === null ? <p className="text-text-secondary">Жүктелуде...</p>
              : toc === false ? <p className="text-text-secondary">Мазмұн қолжетімсіз.</p>
              : <ol className="max-h-[60vh] space-y-1 overflow-y-auto">{toc.map((x: any, i: number) => {
                  const t = tr(x, lang), cur = i === slideNo;
                  return <li key={i}><button type="button" aria-current={cur ? 'true' : undefined} onClick={() => go(i)} className={`flex min-h-[44px] w-full items-baseline gap-2 rounded-lg px-2 py-1 text-left ${cur ? 'bg-accent text-on-accent font-semibold' : 'hover:bg-surface-2'}`}><span className="w-6 shrink-0 tabular-nums opacity-80">{i + 1}</span><span className="min-w-0 break-words">{t.title || t.prompt || t.type}</span></button></li>;
                })}</ol>, 380)}
          {win('people', 'Қатысушылар', <Users size={18} />, { x: railW + 56, y: 120 },
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Қосылды: {parts.length} · желіде: {people.filter(p => p.online).length}</p>
              <button type="button" aria-pressed={qr.open} onClick={() => setQr({ ...qr, open: !qr.open })} className="min-h-[44px] w-full rounded-lg border border-border px-3 text-left font-medium hover:bg-surface-2">{qr.open ? 'QR-ды шетке жасыру' : 'QR мен кодты көрсету'}</button>
              {people.length ? <ul className="max-h-[45vh] space-y-1 overflow-y-auto">{people.map((p, i) => <li key={i} className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.online ? 'bg-success' : 'bg-text-muted'}`} /><span className="min-w-0 break-words">{p.name}</span><span className="sr-only">{p.online ? ' — желіде' : ' — желіде емес'}</span></li>)}</ul> : <p className="text-sm text-text-muted">Әзірге ешкім қосылған жоқ</p>}
            </div>, 340)}
          {win('design', 'Дизайн', <Palette size={18} />, { x: railW + 96, y: 144 },
            <div className="space-y-4">
              <div role="group" aria-label="Тақта фоны"><p className="mb-1 text-sm font-semibold">Фон</p><div className="flex flex-wrap gap-2">{BGS.map(b => (
                <button key={b.n} type="button" aria-pressed={look.bg === b.v} aria-label={b.n} title={b.n} onClick={() => setLook(l => ({ ...l, bg: b.v }))} style={{ background: b.v || '#0E1116' }} className={`h-11 w-11 rounded-full border-2 ${look.bg === b.v ? 'border-accent ring-2 ring-accent' : 'border-border'}`} />
              ))}</div></div>
              <div role="group" aria-label="Мәтін өлшемі"><p className="mb-1 text-sm font-semibold">Мәтін өлшемі</p><div className="flex flex-wrap gap-2">{SIZES.map(z => (
                <button key={z.n} type="button" aria-pressed={look.size === z.v} onClick={() => setLook(l => ({ ...l, size: z.v }))} className={`min-h-[44px] rounded-lg border px-3 text-sm font-medium ${look.size === z.v ? 'border-accent bg-accent text-on-accent' : 'border-border hover:bg-surface-2'}`}>{z.n}</button>
              ))}</div></div>
            </div>, 340)}
          {win('timer', 'Таймер', <TimerIcon size={18} />, { x: 24 + railW, y: 96 }, <TimerBody t={timer} />, 320)}
          {win('rand', 'Кездейсоқ оқушы', <Dice5 size={18} />, { x: 64 + railW, y: 120 }, <RandomBody people={people} />, 340)}
          {win('conv', 'Санау жүйелері', <Binary size={18} />, { x: 104 + railW, y: 144 }, <ConvBody />, 360)}
          {win('score', 'Топтар мен ұпай', <Trophy size={18} />, { x: 144 + railW, y: 168 }, <ScoreBody count={parts.length} groups={groupScores} lb={leaderboard} />, 360)}
        </>
      )}
    </div>
  );
}
