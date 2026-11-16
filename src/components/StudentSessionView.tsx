import React, { useState, useEffect, useRef } from 'react';
import { sb } from '../config';
import { BTN, BTN_P, INP, renderSlide, CodeIDE, lbTable } from './Widgets';
import { lazy, Suspense } from 'react';
const MiniSheet = lazy(() => import('../sheet/MiniSheet'));
const SqlBox = lazy(() => import('../sql/SqlBox'));
import type { SqlResult } from '../sql/SqlBox';
import { LevelsPanel, cellAnswer, type LvTask, type LvSub, type Pair } from './LevelsPanel';
import type { SheetApi } from '../sheet/MiniSheet';
import { tr, useLang, pick, LANG_LABEL } from '../lessons/lang';
import { CriteriaPanel, criteriaAnswer, type Criterion } from './CriteriaPanel';
import { coalesce } from '../utils/coalesce';
import { Icon } from './Icons';
import { LessonMap } from './LessonMap';
import { AskPanel } from './AskPanel';

const TOP = 'inline-flex h-10 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-text transition hover:bg-bg cursor-pointer';
const KIND_NAME: Record<string, [string, string, string]> = { info: ['Ақпарат', 'Информация', 'Information'], example: ['Мысал', 'Пример', 'Example'], practice: ['Практика', 'Практика', 'Practice'], check: ['Өзіңді тексер', 'Проверь себя', 'Check yourself'] };

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
  const [sqlRes, setSqlRes] = useState<SqlResult | null>(null); // the last successful run of the SQL task on the screen
  useEffect(() => { setSqlRes(null); }, [currentSlideData?.index]);
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
    // slide / task / lock changes show at once; scores and answers (a burst of events when the whole class submits) are batched
    const fast = coalesce(refresh, 100, 400), slow = coalesce(refresh, 2000, 2500);
    ['cf_sessions', 'cf_participants', 'cf_tasks', 'cf_pairs'].forEach(tb => ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, fast));
    ['cf_scores', 'cf_submissions'].forEach(tb => ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, slow));

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

  // Look-back: when the teacher allows it (cf_sessions.student_nav) a student may open the slides already shown, never one beyond the board.
  const cur = currentSlideData?.index ?? 0, nav = !!session?.student_nav;
  const [viewIdx, setViewIdx] = useState<number | null>(null); // null = follow the board
  const [past, setPast] = useState<any>(null);
  const viewing = nav && viewIdx !== null && viewIdx < cur ? viewIdx : null;
  useEffect(() => { setViewIdx(null); }, [cur]); // the board moved on: back to the live slide so no task is missed
  useEffect(() => {
    setPast(null);
    if (viewing === null) return;
    sb.rpc('cf_slide_at', { p_session: sid, p_index: viewing }).then(r => setPast(r.data), () => {});
  }, [viewing, sid]);

  // Lesson map: the kind of every slide (no content), reloaded when the teacher switches the lesson
  const [kinds, setKinds] = useState<string[]>([]);
  useEffect(() => {
    sb.rpc('cf_slide_kinds', { p_session: sid }).then(r => setKinds(Array.isArray(r.data) ? r.data : []), () => {});
  }, [sid, session?.lesson_id, session?.slide_count]);

  const loadDict = async () => {
    const { data } = await sb.from('cf_my_terms').select('*').order('created_at', { ascending: false });
    if (data) setMineTerms(data);
  };

  if (ended) {
    return (
      <div data-theme="light" className="min-h-screen bg-bg text-text flex flex-col items-center justify-center pt-24 text-center">
        <h1 className="text-4xl font-black">Сабақ аяқталды</h1>
        <a href="#" className={`${BTN_P} inline-block mt-6`}>Басты бет</a>
      </div>
    );
  }

  if (!session || !currentSlideData) {
    return <div data-theme="light" className="min-h-screen bg-bg text-text flex items-center justify-center">Жүктелуде...</div>;
  }

  const slide = tr(currentSlideData.slide || {}, lang);
  const sheetBox = slide.sheet ? <Suspense fallback={null}><MiniSheet key={`${sid}:${currentSlideData.index}`} cfg={slide.sheet} storageKey={`cf-sheet:${me.id}:${sid}:${currentSlideData.index}`} lang={lang} apiRef={sheetApi} onChange={() => setTick(x => x + 1)} tall />
  </Suspense> : null;
  const hasLevels = Array.isArray(slide.levels) && slide.levels.length > 0;
  const hasCrit = Array.isArray(slide.criteria) && slide.criteria.length > 0;
  const isScrollPage = slide.pageType === 'scroll';
  const isTask = !isScrollPage && ['task', 'code'].includes(slide.type);
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
    <div data-theme="light" className="min-h-screen bg-bg text-text flex flex-col">
      {bannerShow && <div className="bg-red-600 text-center font-bold p-2">{bannerText}</div>}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2 text-sm sm:px-5">
        <b className="min-w-0 truncate">{session.title}</b>
        <div className="flex items-center gap-2">
          <span data-testid="my-points" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-amber-100 px-3 font-bold text-amber-900"><Icon n="star" />{mineRow ? mineRow.points : 0}<span className="hidden sm:inline">{pick(lang, 'ұпай', 'балл', 'pts')}</span></span>
          <button className={TOP} onClick={flipLang} aria-label={pick(lang, 'Тілді ауыстыру', 'Сменить язык', 'Change language')}><Icon n="globe" />{LANG_LABEL[lang]}</button>
          {session.allow_hand !== false && (
          <button
            className={TOP + (mePart && mePart.hand ? ' !border-amber-600 !bg-amber-100 !text-amber-900' : '')}
            aria-pressed={!!(mePart && mePart.hand)}
            aria-label={pick(lang, 'Қол көтеру', 'Поднять руку', 'Raise hand')}
            onClick={async () => {
              await sb.rpc('cf_set_hand', { p_session: sid, p_on: !(mePart && mePart.hand) });
              refresh();
            }}
          >
            <Icon n="hand" /><span className="hidden sm:inline">{mePart && mePart.hand ? pick(lang, 'Қолды түсіру', 'Опустить руку', 'Lower hand') : pick(lang, 'Қол көтеру', 'Поднять руку', 'Raise hand')}</span>
          </button>
          )}
          <button className={TOP} aria-label={pick(lang, 'Сөздік', 'Словарь', 'Glossary')} onClick={() => { setDictOpen(true); loadDict(); }}>
            <Icon n="book" /><span className="hidden sm:inline">{pick(lang, 'Сөздік', 'Словарь', 'Glossary')}</span>
          </button>
          {fullscreenNeeded ? (
            <button className={TOP + ' !border-blue-700 !bg-blue-700 !text-white'} onClick={() => { setFullscreenNeeded(false); document.documentElement.requestFullscreen().catch(() => {}); }}>
              <Icon n="shield" />Focus
            </button>
          ) : (
            <span className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-100 px-3 text-xs font-semibold text-emerald-900"><Icon n="shield" /><span className="hidden sm:inline">{pick(lang, 'Focus қосулы', 'Focus включён', 'Focus on')}</span></span>
          )}
        </div>
      </header>

      <LessonMap kinds={kinds} count={session.slide_count || 0} cur={cur} viewing={viewing} nav={nav} lang={lang} onPick={setViewIdx} />
      {viewing !== null && (
        <div data-testid="student-nav" className="flex flex-wrap items-center justify-center gap-2 border-b border-border bg-surface p-2 text-sm">
          <button data-testid="to-live" className={TOP + ' !border-blue-700 !bg-blue-700 !text-white'} onClick={() => setViewIdx(null)}>{pick(lang, 'Тақтадағы слайдқа', 'К слайду на доске', 'To the board slide')}</button>
        </div>
      )}

      {viewing !== null ? (
        <div data-testid="past-slide" className="flex-1">
          <p className="mx-auto max-w-5xl px-4 pt-3 text-sm font-semibold text-text-secondary">👀 {pick(lang, 'Өткен слайд — тек қарауға. Тапсырма мен жауап тақтадағы слайдта.', 'Пройденный слайд — только просмотр. Задания и ответы — на слайде у доски.', 'An earlier slide — view only. Tasks and answers are on the board slide.')}</p>
          {past ? renderSlide(tr(past.slide || {}, lang), { mode: 'student', lang, noOptions: true, lb: () => lbTable(leaderboard) }) : <p className="p-4 text-text-muted">{pick(lang, 'Жүктелуде...', 'Загрузка...', 'Loading...')}</p>}
        </div>
      ) : (<>
      <div className={slide.type === 'quiz' ? '' : 'flex-1'}>
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
                  <div className="text-xs font-black uppercase tracking-widest opacity-80">{pick(lang, 'Тапсырма — өзің орында', 'Задание — выполняй сам', 'Task — do it yourself')}</div>
                  <h2 className="text-2xl sm:text-3xl font-black">{slide.title || ''}</h2>
                </div>
                {slide.pair && <span className="rounded-full bg-fuchsia-700 px-3 py-1 text-sm font-bold text-white">👥 {pick(lang, 'Жұппен', 'В паре', 'In a pair')}</span>}
                {slide.points ? <span className="ml-auto rounded-full bg-text px-3 py-1 text-sm font-bold text-bg">{slide.points} ⭐</span> : null}
              </div>
              <div className={slide.sheet ? 'grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] items-start' : slide.sql ? 'max-w-5xl mx-auto' : 'max-w-3xl mx-auto'}>
                <div className="space-y-3 min-w-0">
                  {slide.prompt && <p className="whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-lg">{slide.prompt}</p>}
                  {(slide.steps?.length || hasCrit) && (
                    <ol data-testid="task-steps" className="space-y-2 rounded-2xl border border-orange-300 bg-warning-soft p-4">
                      <li className="font-black text-warning">{pick(lang, 'Қалай орындаймыз?', 'Как выполнять?', 'How to do it')}</li>
                      {(slide.steps?.length ? slide.steps : [
                        pick(lang, 'Суретке мұқият қара — онда дайын кесте көрсетілген.', 'Внимательно посмотри на рисунок — на нём готовая таблица.', 'Look carefully at the picture: it shows the finished table.'),
                        pick(lang, 'Оң жақтағы кестеге деректерді суреттегідей енгіз (A1 ұяшығынан бастап). Ұяшықты бас та жаза бер.', 'Введи данные в таблицу справа так же, как на рисунке (с ячейки A1). Нажми на ячейку и пиши.', 'Type the data into the sheet on the right exactly as in the picture (start at cell A1). Click a cell and type.'),
                        pick(lang, 'Есептеу керек жерлерге формула жаз (= белгісінен баста), санды қолмен жазба.', 'Там, где нужно считать, пиши формулу (начинай с =), не вводи число вручную.', 'Where a calculation is needed, write a formula (start with =); do not type the number by hand.'),
                        pick(lang, 'Төмендегі критерийлерді оқып шық, «Жіберу» бас — жүйе өзі тексеріп, ұпай береді.', 'Прочитай критерии ниже и нажми «Отправить» — система сама проверит и выставит баллы.', 'Read the criteria below and press Submit — the system checks it and gives points.'),
                      ]).map((x: string, i: number) => (
                        <li key={i} className="flex gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-warning text-sm font-black text-bg" aria-hidden="true">{i + 1}</span><span className="min-w-0">{x}</span></li>
                      ))}
                    </ol>
                  )}
                  {slide.picture && (
                    <figure data-testid="task-picture" className="rounded-2xl border border-border bg-white p-2 shadow-sm">
                      <figcaption className="px-2 pb-1 text-sm font-bold text-text-secondary">🖼️ {pick(lang, 'Суретке қара', 'Посмотри на рисунок', 'Look at the picture')}</figcaption>
                      <img src={slide.picture} alt={slide.pictureAlt || slide.title || ''} className="h-auto w-full rounded-xl" />
                    </figure>
                  )}
                  {slide.sql && <Suspense fallback={null}><SqlBox key={`${sid}:${currentSlideData.index}`} cfg={slide.sql} lang={lang} storageKey={`cf-sql:${me.id}:${sid}:${currentSlideData.index}`} onResult={setSqlRes} /></Suspense>}
                  {hasLevels && <LevelsPanel slide={slide} tasks={lvTasks} subs={lvSubs} pair={pair} uid={me.id} lang={lang} onSubmit={submitLevel} readCell={slide.sheet ? (l => sheetApi.current?.get(l) ?? '') : undefined} />}
                </div>
                {slide.sheet && (
                  <div className="min-w-0 space-y-3 lg:sticky lg:top-2">
                    {slide.picture && <div className="px-1 text-sm font-bold text-text-secondary">📊 {pick(lang, 'Мына жерге енгіз', 'Вводи сюда', 'Enter it here')}</div>}
                    {sheetBox}
                    {hasCrit && <CriteriaPanel
                      criteria={slide.criteria as Criterion[]} lang={lang} sub={mySub} maxPoints={(slide.criteria as Criterion[]).reduce((n, c) => n + (c.points ?? 1), 0)}
                      open={task?.status === 'open' && task.kind === 'sheet'} notOpen={!task || task.kind !== 'sheet'} closed={!!task && task.kind === 'sheet' && task.status !== 'open'}
                      live={c => (c.look ? sheetApi.current?.look(c.cell, c.look) ?? '0' : cellAnswer(sheetApi.current?.get(c.cell) ?? ''))}
                      onSend={() => submitAnswer(criteriaAnswer(slide.criteria as Criterion[], c => cellAnswer(sheetApi.current?.get(c) ?? ''), c => sheetApi.current?.raw(c) ?? '', (c, k) => sheetApi.current?.look(c, k) ?? '0'))}
                    />}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>{renderSlide(slide, { mode: 'student', lang, noOptions: slide.type === 'quiz', lb: () => lbTable(leaderboard) })}{slide.sheet && <div className="max-w-3xl mx-auto p-4">{sheetBox}</div>}</>
        )}
      </div>

      <div className="max-w-3xl mx-auto w-full p-4">
        {hasLevels || hasCrit ? null : !task && slide.type === 'quiz' && Array.isArray(slide.options) ? (
          <div data-testid="quiz-preview" className="grid gap-2">
            {slide.options.map((o: string, i: number) => <div key={i} className="rounded-2xl border border-border bg-surface p-4 text-left text-lg">{String.fromCharCode(65 + i)}. {o}</div>)}
            <p className="text-sm text-text-muted">{pick(lang, 'Мұғалім тапсырманы ашқанда жауап бересің.', 'Ответишь, когда учитель откроет вопрос.', 'You can answer when the teacher opens the question.')}</p>
          </div>
        ) : !task ? (
          !['quiz', 'task', 'code'].includes(slide.type) ? null : <p className="text-slate-500">{slide.type === 'code' && !isScrollPage ? pick(lang, 'Тапсырма әлі ашылмаған — жаттығып көруге болады.', 'Задание ещё не открыто — можно потренироваться.', 'The task is not open yet — you can practise.') : pick(lang, 'Тапсырма әлі ашылған жоқ...', 'Задание ещё не открыто...', 'The task is not open yet...')}</p>
        ) : mySub ? (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-2">
            <div className="font-bold text-emerald-400">✓ Жауап жіберілді</div>
            {task.status === 'open' && <div className="text-sm text-slate-400">{pick(lang, 'Басқалар аяқтағанша күт.', 'Подожди, пока закончат остальные.', 'Wait while the others finish.')}</div>}
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
        ) : slide.sql ? (
          <div data-testid="sql-submit" className="space-y-2">
            <p className="text-sm text-text-secondary">{sqlRes ? pick(lang, 'Нәтиже кестесін тапсырмамен салыстыр. Жіберу бір-ақ рет беріледі.', 'Сверь таблицу результата с заданием. Отправить можно только один раз.', 'Compare the result table with the task. You can send only once.') : pick(lang, 'Алдымен сұранысты қатесіз орында («Орындау»), сосын жібер.', 'Сначала выполни запрос без ошибок («Выполнить»), затем отправь.', 'First run the query without errors (“Run”), then send.')}</p>
            <button className={`${BTN_P} w-full disabled:opacity-50`} disabled={!sqlRes} onClick={() => sqlRes && submitAnswer(sqlRes.answer, { sql: sqlRes.sql })}>{pick(lang, 'Жауапты жіберу', 'Отправить ответ', 'Send the answer')}</button>
          </div>
        ) : slide.sheet ? (
          <div data-testid="free-submit" className="space-y-2 rounded-2xl border border-orange-400/40 bg-slate-900 p-4">
            <textarea className={`${INP} h-20`} aria-label={pick(lang, 'Пікір', 'Комментарий', 'Comment')} placeholder={pick(lang, 'Мұғалімге пікір (міндетті емес)', 'Комментарий для учителя (необязательно)', 'Comment for the teacher (optional)')} value={comment} onChange={e => setComment(e.target.value)} />
            <button className={`${BTN_P} w-full`} onClick={() => { submitAnswer(`${comment.trim() ? comment.trim() + '\n\n' : ''}— ${pick(lang, 'Кесте', 'Таблица', 'Table')} —\n${sheetApi.current?.snapshot() ?? ''}`); setComment(''); }}>
              📤 {pick(lang, 'Жұмысты жіберу', 'Сдать работу', 'Hand in the work')}
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
      </>)}

      {!locked && !popupActive && !dictOpen && session.allow_ask !== false && <AskPanel sid={sid} me={me} slide={viewing ?? cur} kind={pick(lang, ...(KIND_NAME[kinds[viewing ?? cur]] || KIND_NAME.info))} lang={lang} />}

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
        <div className="fixed inset-0 z-40 bg-bg overflow-auto p-4 text-text">
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
