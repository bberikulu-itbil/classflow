import React, { useState, useEffect, useRef } from 'react';
import { sb } from '../config';
import { BTN, BTN_P, INP, renderSlide, CodeIDE, lbTable } from './Widgets';
import { lazy, Suspense } from 'react';
const MiniSheet = lazy(() => import('../sheet/MiniSheet'));
import { LevelsPanel, type LvTask, type LvSub, type Pair } from './LevelsPanel';
import type { SheetApi } from '../sheet/MiniSheet';
import { tr, useLang } from '../lessons/lang';

export function StudentSessionView({ sid, me }: { sid: string; me: any }) {
  const [lang, flipLang] = useLang();
  const [session, setSession] = useState<any>(null);
  const [lvTasks, setLvTasks] = useState<LvTask[]>([]);
  const [lvSubs, setLvSubs] = useState<LvSub[]>([]);
  const [pair, setPair] = useState<Pair | null>(null);
  const sheetApi = useRef<SheetApi | null>(null); // the sheet of the open task page: the panel reads cells from it
  const [, setTick] = useState(0); // a sheet edit re-renders the panel so it shows the cell's current value
  const [comment, setComment] = useState('');
  const [currentSlideData, setCurrentSlideData] = useState<any>(null);
  const [task, setTask] = useState<any>(null);
  const [mySub, setMySub] = useState<any>(null);
  const [mePart, setMePart] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [fullscreenNeeded, setFullscreenNeeded] = useState(true);
  const [ended, setEnded] = useState(false);

  const [bannerText, setBannerText] = useState('');
  const [bannerShow, setBannerShow] = useState(false);

  const [popupActive, setPopupActive] = useState<any>(null);
  const [popupsQueue, setPopupsQueue] = useState<any[]>([]);
  const seenPopupsRef = useRef<Set<string>>(new Set());

  const [dictOpen, setDictOpen] = useState(false);
  const [mineTerms, setMineTerms] = useState<any[]>([]);
  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');

  const [shortAnswer, setShortAnswer] = useState('');
  const ideCacheRef = useRef<{ [idx: number]: any }>({});

  const quiet = (fn: string, args: any) => sb.rpc(fn, args).then(() => {}, () => {});

  const refresh = async () => {
    try {
      const sRes = await sb.from('cf_sessions').select('*').eq('id', sid).single();
      if (sRes.data) setSession(sRes.data);
      if (sRes.data?.status === 'ended') {
        setEnded(true);
        return;
      }
      const [curRes, partsRes, lbRes] = await Promise.all([
        sb.rpc('cf_slide', { p_session: sid }),
        sb.from('cf_participants').select('*').eq('session_id', sid).eq('student_id', me.id),
        sb.rpc('cf_leaderboard', { p_session: sid }),
      ]);
      setCurrentSlideData(curRes.data);
      // practice slide with L1-L3: the latest batch of level tasks for this slide, my answers to it and my pair (if any)
      const pairRow = (await sb.from('cf_pairs').select('*').eq('session_id', sid)).data?.[0] || null;
      setPair(pairRow);
      if (curRes.data?.slide?.levels) {
        const rows = ((await sb.from('cf_tasks').select('*').eq('session_id', sid).eq('slide_index', curRes.data.index).not('level', 'is', null).order('opened_at', { ascending: false })).data || []) as LvTask[];
        const batch = rows.filter(r => r.opened_at === rows[0]?.opened_at);
        setLvTasks(batch);
        setLvSubs(batch.length ? ((await sb.from('cf_submissions').select('*').in('task_id', batch.map(b => b.id)).eq('student_id', me.id)).data || []) as LvSub[] : []);
      } else { setLvTasks([]); setLvSubs([]); }
      setMePart(partsRes.data?.[0] || null);
      setLeaderboard(lbRes.data || []);

      const activeTask = sRes.data?.active_task_id
        ? (await sb.from('cf_tasks').select('*').eq('id', sRes.data.active_task_id).single()).data
        : null;
      setTask(activeTask);

      if (activeTask) {
        const subRes = (await sb.from('cf_submissions').select('*').eq('task_id', activeTask.id).eq('student_id', me.id)).data;
        setMySub(subRes?.[0] || null);
      } else {
        setMySub(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let awayAt: number | null = null;
    let warnCount = 0;

    const away = () => {
      if (awayAt || ended) return;
      awayAt = Date.now();
      quiet('cf_report_focus', { p_session: sid, p_kind: 'away' });
    };

    const back = () => {
      if (!awayAt) return;
      const ms = Date.now() - awayAt;
      awayAt = null;
      quiet('cf_report_focus', { p_session: sid, p_kind: 'return', p_ms: ms });
      setBannerText(`⚠ Сабақ бетінен ${Math.round(ms / 1000)} сек шықтың (${++warnCount} рет). Мұғалімге белгілі.`);
      setBannerShow(true);
      setTimeout(() => setBannerShow(false), 8000);
    };

    const onVis = () => (document.hidden ? away() : back());
    const onBlur = () => away();
    const onFocus = () => !document.hidden && back();
    const onFs = () => {
      if (!document.fullscreenElement && !fullscreenNeeded) {
        quiet('cf_report_focus', { p_session: sid, p_kind: 'fullscreen_exit' });
      }
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFs);
    const hb = setInterval(() => quiet('cf_heartbeat', { p_session: sid }), 15000);

    sb.rpc('cf_join', { p_session: sid }).then(() => {}, () => {
      window.location.hash = '';
    });
    refresh();

    const ch = sb.channel('student-session-' + sid);
    ['cf_sessions', 'cf_participants', 'cf_tasks', 'cf_scores', 'cf_submissions', 'cf_pairs'].forEach(tb => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, () => refresh());
    });

    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cf_commands', filter: `session_id=eq.${sid}` }, e => {
      const c = e.new;
      if (c.kind !== 'popup' || seenPopupsRef.current.has(c.id) || (c.student_id && c.student_id !== me.id)) return;
      seenPopupsRef.current.add(c.id);
      setPopupsQueue(q => [...q, c]);
    });

    ch.subscribe();

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFs);
      clearInterval(hb);
      sb.removeChannel(ch);
    };
  }, [sid, ended]);

  useEffect(() => {
    if (!popupActive && popupsQueue.length > 0) {
      setPopupActive(popupsQueue[0]);
      setPopupsQueue(q => q.slice(1));
    }
  }, [popupsQueue, popupActive]);

  const loadDict = async () => {
    const { data } = await sb.from('cf_my_terms').select('*').order('created_at', { ascending: false });
    if (data) setMineTerms(data);
  };

  if (ended) {
    return (
      <div data-theme="dark" className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center pt-24 text-center">
        <h1 className="text-4xl font-black">Сабақ аяқталды</h1>
        <a href="#" className={`${BTN_P} inline-block mt-6`}>Басты бет</a>
      </div>
    );
  }

  if (!session || !currentSlideData) {
    return <div data-theme="dark" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Жүктелуде...</div>;
  }

  const slide = tr(currentSlideData.slide || {}, lang);
  const sheetBox = slide.sheet ? <Suspense fallback={null}><MiniSheet key={`${sid}:${currentSlideData.index}`} cfg={slide.sheet} storageKey={`cf-sheet:${me.id}:${sid}:${currentSlideData.index}`} lang={lang} apiRef={sheetApi} onChange={() => setTick(x => x + 1)} tall />
  </Suspense> : null;
  const hasLevels = Array.isArray(slide.levels) && slide.levels.length > 0;
  const isScrollPage = slide.pageType === 'scroll';
  const isTask = !isScrollPage && ['quiz', 'task', 'code'].includes(slide.type);
  const mineRow = leaderboard.find(r => r.student_id === me.id);
  const locked = (mePart && mePart.locked) || (session && session.locked);

  const submitLevel = async (taskId: string, ans: string) => {
    const { error } = await sb.rpc('cf_submit', { p_task: taskId, p_answer: ans, p_meta: null });
    if (error) alert(error.message);
    await refresh();
  };
  const submitAnswer = async (ans: string, meta: any = null) => {
    if (!task) return;
    await sb.rpc('cf_submit', { p_task: task.id, p_answer: ans, p_meta: meta });
    refresh();
  };

  return (
    <div data-theme="dark" className="min-h-screen bg-slate-950 text-white flex flex-col">
      {bannerShow && <div className="bg-red-600 text-center font-bold p-2">{bannerText}</div>}
      <div className="flex items-center justify-between p-2 border-b border-slate-800 text-sm">
        <b>{session.title}</b>
        <div className="flex items-center gap-2">
          <button className={BTN} onClick={flipLang} aria-label="Тіл / Язык">{lang === 'kk' ? 'ҚАЗ' : 'РУС'}</button>
          <span className="text-amber-400 font-bold">⭐ {mineRow ? mineRow.points : 0}</span>
          <button
            className={BTN + ' !bg-amber-700 !text-white'}
            onClick={async () => {
              await sb.rpc('cf_set_hand', { p_session: sid, p_on: !(mePart && mePart.hand) });
              refresh();
            }}
          >
            {mePart && mePart.hand ? '✋ түсірем' : '✋'}
          </button>
          <button
            className={BTN}
            onClick={() => {
              setDictOpen(true);
              loadDict();
            }}
          >
            📖
          </button>
          {fullscreenNeeded ? (
            <button
              className={BTN_P}
              onClick={() => {
                setFullscreenNeeded(false);
                document.documentElement.requestFullscreen().catch(() => {});
              }}
            >
              ⛶ Focus
            </button>
          ) : (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950 px-2.5 py-1.5 rounded-full">🛡 Focus қосулы</span>
          )}
        </div>
      </div>

      <div className="flex-1">
        {slide.type === 'code' && !isScrollPage ? (
          <div className="p-3 max-w-6xl mx-auto w-full">
            {(() => {
              const idx = currentSlideData.index;
              if (!ideCacheRef.current[idx]) {
                ideCacheRef.current[idx] = <CodeIDE
                  s={slide}
                  o={{
                    onPaste: () => quiet('cf_report_focus', { p_session: sid, p_kind: 'paste' }),
                    terms: session.terms || [],
                    onTerm: async (t: any) => {
                      await sb.from('cf_my_terms').insert({ student_id: me.id, term: t.term, definition: t.definition || '', source: session.title });
                      alert('Сөздікке қосылды');
                    },
                    onSubmit: (code: string, meta: any) => submitAnswer(code, meta),
                    canSubmit: !!(task && task.status === 'open' && !mySub),
                  }}
                />;
              }
              return ideCacheRef.current[idx];
            })()}
          </div>
        ) : isTask ? (
          <div data-testid="task-page" className="border-t-4 border-orange-400 bg-gradient-to-b from-orange-500/10 to-transparent">
            <div className="max-w-7xl mx-auto p-4 space-y-4">
              <div data-testid="task-banner" className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-r from-orange-500 to-amber-400 p-4 text-slate-950 shadow-lg">
                <span className="text-5xl" aria-hidden="true">🛠️</span>
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-widest opacity-80">{lang === 'ru' ? 'Задание — выполняй сам' : 'Тапсырма — өзің орында'}</div>
                  <h2 className="text-2xl sm:text-3xl font-black">{slide.title || ''}</h2>
                </div>
                {slide.pair && <span className="rounded-full bg-fuchsia-700 px-3 py-1 text-sm font-bold text-white">👥 {lang === 'ru' ? 'В паре' : 'Жұппен'}</span>}
                {slide.points ? <span className="ml-auto rounded-full bg-slate-950 px-3 py-1 text-sm font-bold text-amber-300">{slide.points} ⭐</span> : null}
              </div>
              <div className={slide.sheet ? 'grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] items-start' : 'max-w-3xl mx-auto'}>
                <div className="space-y-3 min-w-0">
                  {slide.prompt && <p className="text-lg whitespace-pre-wrap rounded-2xl bg-slate-900 p-4 border border-slate-700">{slide.prompt}</p>}
                  {hasLevels && <LevelsPanel slide={slide} tasks={lvTasks} subs={lvSubs} pair={pair} uid={me.id} lang={lang} onSubmit={submitLevel} readCell={slide.sheet ? (l => sheetApi.current?.get(l) ?? '') : undefined} />}
                </div>
                {slide.sheet && <div className="min-w-0 lg:sticky lg:top-2">{sheetBox}</div>}
              </div>
            </div>
          </div>
        ) : (
          <>{renderSlide(slide, { mode: 'student', lang, lb: () => lbTable(leaderboard) })}{slide.sheet && <div className="max-w-3xl mx-auto p-4">{sheetBox}</div>}</>
        )}
      </div>

      <div className="max-w-3xl mx-auto w-full p-4">
        {hasLevels ? null : !task ? (
          <p className="text-slate-500">{slide.type === 'code' && !isScrollPage ? 'Тапсырма әлі ашылмаған — жаттығып көруге болады.' : 'Тапсырма әлі ашылған жоқ...'}</p>
        ) : mySub ? (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-2">
            <div className="font-bold text-emerald-400">✓ Жауап жіберілді</div>
            {mySub.points != null && <div>Ұпай: {mySub.points}/{task.points}</div>}
            {mySub.feedback && <div className="text-slate-300">{mySub.feedback}</div>}
            {task.reveal && (
              <div className="mt-2 p-2 rounded-xl bg-emerald-950 text-sm">
                {(() => {
                  const a = task.reveal.answer ?? task.reveal.correct;
                  const txt = typeof a === 'number' && task.options ? task.options[a] : Array.isArray(a) ? a.join(' / ') : a;
                  return (
                    <>
                      {txt != null && <div>✔ Дұрыс жауап: <b>{String(txt)}</b></div>}
                      {task.reveal.explanation && <div className="text-slate-300">{task.reveal.explanation}</div>}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ) : task.status !== 'open' ? (
          <div className="p-4 rounded-2xl bg-slate-900 text-red-400 font-bold">⏹ Уақыт бітті</div>
        ) : task.kind === 'quiz' ? (
          <div className="grid gap-2">
            {(task.options || []).map((o: string, i: number) => (
              <button
                key={i}
                className="p-4 rounded-2xl bg-slate-800 hover:bg-blue-700 text-left text-lg border border-slate-600 cursor-pointer"
                onClick={() => submitAnswer(String(i))}
              >
                {String.fromCharCode(65 + i)}. {o}
              </button>
            ))}
          </div>
        ) : task.kind === 'code' ? (
          <p className="text-emerald-400 text-sm">📝 Тапсырма ашық: кодты жазып, «✔ Тексеру», сосын «📤 Жіберу» бас.</p>
        ) : slide.sheet ? (
          <div data-testid="free-submit" className="space-y-2 rounded-2xl border border-orange-400/40 bg-slate-900 p-4">
            <textarea className={`${INP} h-20`} aria-label={lang === 'ru' ? 'Комментарий' : 'Пікір'} placeholder={lang === 'ru' ? 'Комментарий для учителя (необязательно)' : 'Мұғалімге пікір (міндетті емес)'} value={comment} onChange={e => setComment(e.target.value)} />
            <button className={`${BTN_P} w-full`} onClick={() => { submitAnswer(`${comment.trim() ? comment.trim() + '\n\n' : ''}— ${lang === 'ru' ? 'Таблица' : 'Кесте'} —\n${sheetApi.current?.snapshot() ?? ''}`); setComment(''); }}>
              📤 {lang === 'ru' ? 'Сдать работу' : 'Жұмысты жіберу'}
            </button>
          </div>
        ) : (
          <div>
            <textarea
              className={`${INP} h-24 text-lg`}
              placeholder="Жауабың..."
              value={shortAnswer}
              onChange={e => setShortAnswer(e.target.value)}
              onPaste={() => quiet('cf_report_focus', { p_session: sid, p_kind: 'paste' })}
            />
            <button
              className={`${BTN_P} mt-2 w-full`}
              onClick={() => {
                if (!shortAnswer.trim()) {
                  alert('Жауап жаз');
                  return;
                }
                submitAnswer(shortAnswer.trim());
              }}
            >
              📤 Жіберу
            </button>
          </div>
        )}
      </div>

      {popupActive && (
        <div className="fixed inset-0 z-50 bg-amber-500 text-black flex flex-col items-center justify-center text-center p-6">
          <div className="text-6xl mb-4">🔔</div>
          <div className="text-3xl font-black mb-8 max-w-xl">{popupActive.message}</div>
          <button
            className="px-8 py-4 rounded-2xl bg-black text-white text-xl font-bold cursor-pointer"
            onClick={() => {
              quiet('cf_ack', { p_command: popupActive.id });
              setPopupActive(null);
            }}
          >
            Түсіндім ✓
          </button>
        </div>
      )}

      {locked && !popupActive && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-center p-6">
          <div className="text-7xl mb-4">🔒</div>
          <div className="text-2xl font-bold">Мұғалім экранды бұғаттады</div>
          <div className="text-slate-400 mt-2">Тақтаға назар аудар</div>
        </div>
      )}

      {dictOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950 overflow-auto p-4 text-white">
          <div className="max-w-xl mx-auto space-y-3">
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">📖 Сөздік</h2>
              <button className={BTN} onClick={() => setDictOpen(false)}>✕</button>
            </div>
            <h3 className="text-sm text-slate-400">Осы сабақтың терминдері</h3>
            {(session.terms || []).map((x: any, i: number) => {
              const added = mineTerms.some(m => m.term === x.term);
              return (
                <div key={i} className="p-2 rounded-xl bg-slate-900 flex items-center gap-2">
                  <div className="flex-1">
                    <b>{x.term}</b>
                    <div className="text-sm text-slate-300">{x.definition}</div>
                  </div>
                  {added ? (
                    <span className="text-emerald-400">✓</span>
                  ) : (
                    <button
                      className={BTN}
                      onClick={async () => {
                        await sb.from('cf_my_terms').insert({ student_id: me.id, term: x.term, definition: x.definition || '', source: session.title });
                        loadDict();
                        alert('Сөздікке қосылды');
                      }}
                    >
                      + Менің сөздігіме
                    </button>
                  )}
                </div>
              );
            })}
            <h3 className="text-sm text-slate-400 pt-3">Менің сөздігім</h3>
            {mineTerms.map((m, i) => (
              <div key={i} className="p-2 rounded-xl bg-slate-900">
                <b>{m.term}</b>
                <div className="text-sm text-slate-300">{m.definition}</div>
              </div>
            ))}
            <input className={INP} placeholder="Термин" value={newTerm} onChange={e => setNewTerm(e.target.value)} />
            <input className={INP} placeholder="Анықтама" value={newDef} onChange={e => setNewDef(e.target.value)} />
            <button
              className={BTN_P}
              onClick={async () => {
                if (!newTerm.trim()) return;
                await sb.from('cf_my_terms').insert({ student_id: me.id, term: newTerm.trim(), definition: newDef.trim(), source: 'өзім' });
                setNewTerm('');
                setNewDef('');
                loadDict();
                alert('Қосылды');
              }}
            >
              Қосу
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
