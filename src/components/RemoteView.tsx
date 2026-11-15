import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Logo } from '../ui/Logo';
import { ArrowLeft, ArrowRight, Bell, BookOpen, Hand, Layers, Lock, LockOpen, Monitor, Plus, Share2, Square, Play, Sparkles, Check, Eye, X, MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import { sb } from '../config';
import { ShareBoard } from './ShareBoard';
import { Button, Card, EmptyState, Skeleton, inputCls } from '../ui';
import { Tabs } from '../ui/Tabs';
import { spaced, fmt, renderSlide } from './Widgets';
import { tr, useLang, LANG_LABEL } from '../lessons/lang';
import { KindBadge, kindLabel } from '../lessons/kinds';
import { loadSessionNavigation, switchSessionLesson, type SessionNavigation, type LessonTarget } from '../views/sessionNav';
import { coalesce } from '../utils/coalesce';
import { Icon } from './Icons';
import { LessonMap, kindOf } from './LessonMap';
import { StageClock } from './StageClock';

const TYPE: Record<string, string> = { title: 'Тақырып', content: 'Мазмұн', bullets: 'Тізім', quiz: 'Тест', task: 'Тапсырма', code: 'Код', flashcards: 'Карточка', matching: 'Сәйкестендіру', logic: 'Логика', sim: 'Симулятор', leaderboard: 'Рейтинг', summary: 'Қорытынды' };
const PRESENCE: Record<string, string> = { online: 'онлайн', away: 'беттен шықты', offline: 'офлайн' };
const TABS = [{ key: 'class', label: 'Сынып' }, { key: 'subs', label: 'Жауаптар' }, { key: 'score', label: 'Ұпай' }];
// opened from the «Қосымша» menu; the open one shows as a fourth tab
const EXTRA = [{ key: 'ask', label: 'Сұрақтар' }, { key: 'pairs', label: 'Жұптар' }, { key: 'att', label: 'Қатысу' }, { key: 'slides', label: 'Слайдтар' }];
const RULES = [
  { key: 'nav', name: 'Қайта қарауға рұқсат', hint: 'Оқушы өткен слайдтарды өз экранында ашады' },
  { key: 'ask', name: '«Түсінбедім» сұрақтары', hint: 'Оқушы слайдқа сұрақ жаза алады' },
  { key: 'hand', name: 'Қол көтеру', hint: 'Өшірсеңіз, оқушыда батырма жасырылады' },
  { key: 'lock', name: 'Экрандарды бұғаттау', hint: 'Барлық оқушының экраны жабылады' },
];
const slideText = (s: any) => (s.bullets && s.bullets.join(' · ')) || s.prompt || s.subtitle || '';

/** Remaining (limited) or elapsed time of an open task, ticking every second. */
function Countdown({ task }: { task: any }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const sec = Math.max(0, Math.floor((now - new Date(task.opened_at).getTime()) / 1000));
  const left = task.time_limit ? Math.max(0, task.time_limit - sec) : null;
  return <span className={`font-mono tabular-nums ${left !== null && left <= 10 ? 'text-danger font-bold' : ''}`}>{fmt(left ?? sec)}</span>;
}

/** A slide drawn at a fixed 1280-wide design size and shrunk to fit its box, so a preview looks like the real slide at any size. */
function Thumb({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.2);
  useLayoutEffect(() => {
    const el = box.current!, fit = () => setK(el.clientWidth / 1280);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div ref={box} className="relative aspect-video w-full overflow-hidden"><div className="pointer-events-none select-none" style={{ width: 1280, height: 720, transform: `scale(${k})`, transformOrigin: 'top left' }} inert>{children}</div></div>;
}

const IconBtn = ({ label, onClick, children, tone = '' }: { label: string; onClick: () => void; children: React.ReactNode; tone?: string }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} className={`inline-flex h-11 w-11 items-center justify-center rounded-md cursor-pointer hover:bg-surface-2 ${tone || 'text-text-secondary'}`}>{children}</button>
);

export function RemoteView({ sid, me }: { sid: string; me: any; onLogout: () => void }) {
  const [lang, flipLang] = useLang();
  const [session, setSession] = useState<any>(null);
  const [priv, setPriv] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [task, setTask] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [lvTasks, setLvTasks] = useState<any[]>([]); // every task of an open L1-L3 batch
  const [pairs, setPairs] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [pf, setPf] = useState({ host: '', partner: '' });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [groupScores, setGroupScores] = useState<any[]>([]);
  const [tab, setTab] = useState('class');
  const [pickId, setPickId] = useState(''); // the student whose actions are open in the class grid
  const [rulesOpen, setRulesOpen] = useState(false);
  const [planStages, setPlanStages] = useState<{ k: string; min: number }[]>([]);
  const [asks, setAsks] = useState<any[]>([]); // «Түсінбедім» questions of this session
  const loadAsks = () => sb.from('cf_questions').select('*').eq('session_id', sid).order('created_at', { ascending: false }).then(r => { if (r.data) setAsks(r.data); }, () => {});
  const [className, setClassName] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [gradingPoints, setGradingPoints] = useState<{ [subId: string]: string }>({});
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [lessonNav, setLessonNav] = useState<SessionNavigation | null>(null);
  const [switchAsk, setSwitchAsk] = useState<LessonTarget | null>(null);
  const [switching, setSwitching] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean }>({ text: '', bad: false });
  const [ending, setEnding] = useState(false);
  const [share, setShare] = useState(false);
  const autoTRef = useRef<any>(null);
  const privAt = useRef(0);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const refresh = async () => {
    try {
      const needPriv = Date.now() - privAt.current > 60000; // the lesson's slides are 25-60 KB: not on every refresh
      const [sRes, pPriv, pParts, lbRes, gsRes] = await Promise.all([
        sb.from('cf_sessions').select('*').eq('id', sid).single(),
        needPriv ? sb.from('cf_session_private').select('slides').eq('session_id', sid).maybeSingle() : Promise.resolve(null),
        sb.from('cf_participants').select('*').eq('session_id', sid).order('full_name'),
        sb.rpc('cf_leaderboard', { p_session: sid }),
        sb.rpc('cf_group_scores', { p_session: sid }),
      ]);
      if (sRes.data) setSession(sRes.data);
      if (pPriv) { setPriv(pPriv.data?.slides || []); privAt.current = Date.now(); }
      if (pParts.data) setParts(pParts.data);
      if (lbRes.data) setLeaderboard(lbRes.data);
      if (gsRes.data) setGroupScores(gsRes.data);

      const activeTask = sRes.data?.active_task_id ? (await sb.from('cf_tasks').select('*').eq('id', sRes.data.active_task_id).single()).data : null;
      setTask(activeTask);
      if (activeTask?.level != null) {
        const batch = (await sb.from('cf_tasks').select('*').eq('session_id', sid).eq('slide_index', activeTask.slide_index).eq('opened_at', activeTask.opened_at).order('level').order('variant')).data || [];
        setLvTasks(batch);
        setSubs((await sb.from('cf_submissions').select('*').in('task_id', batch.map((b: any) => b.id))).data || []);
      } else {
        setLvTasks([]);
        setSubs(activeTask ? (await sb.from('cf_submissions').select('*').eq('task_id', activeTask.id)).data || [] : []);
      }
      setPairs((await sb.from('cf_pairs').select('*').eq('session_id', sid)).data || []);

      if (sRes.data?.class_id) {
        const cls = (await sb.from('classes').select('name').eq('id', sRes.data.class_id)).data;
        if (cls && cls[0]) setClassName(cls[0].name);
      }
      if (activeTask && activeTask.status === 'open' && activeTask.time_limit) {
        clearTimeout(autoTRef.current);
        const left = new Date(activeTask.opened_at).getTime() + activeTask.time_limit * 1000 - Date.now();
        autoTRef.current = setTimeout(() => { sb.rpc('cf_close_task', { p_task: activeTask.id }).then(refresh, () => {}); }, Math.max(0, left) + 1500);
      }
      if (tabRef.current === 'att') {
        const attRes = await sb.rpc('cf_attendance', { p_session: sid });
        if (attRes.data) setAttendanceRows(attRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refresh();
    const ch = sb.channel('cf-remote-' + sid);
    const fast = coalesce(refresh, 150), slow = coalesce(refresh, 1200); // many students' answers and heartbeats arrive as one refresh
    ['cf_sessions', 'cf_tasks', 'cf_pairs'].forEach(tb => ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, fast));
    ['cf_participants', 'cf_submissions', 'cf_scores'].forEach(tb => ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, slow));
    loadAsks();
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'cf_questions', filter: `session_id=eq.${sid}` }, () => loadAsks());
    ch.subscribe();
    const iv = setInterval(refresh, 8000);
    return () => { sb.removeChannel(ch); clearInterval(iv); clearTimeout(autoTRef.current); };
  }, [sid]);
  useEffect(() => { if (tab === 'att') refresh(); }, [tab]);
  // the class roster (also students who did not log in) for choosing a pair partner
  useEffect(() => { if (tab === 'pairs' && !roster.length) sb.rpc('cf_attendance', { p_session: sid }).then(r => { if (r.data) setRoster(r.data); }, () => {}); }, [tab]);

  useEffect(() => {
    let alive = true;
    setLessonNav(null);
    if (!session?.lesson_id) return () => { alive = false; };
    loadSessionNavigation(session.lesson_id).then(value => { if (alive) setLessonNav(value); }).catch(err => {
      // A live session must still work when the optional course-tree migration is absent.
      console.warn('Remote lesson navigation unavailable', err);
    });
    return () => { alive = false; };
  }, [session?.lesson_id]);

  // planned minutes of the lesson's stages, for the teacher's stage clock
  useEffect(() => {
    setPlanStages([]);
    if (session?.lesson_id) sb.from('cf_lessons').select('plan').eq('id', session.lesson_id).maybeSingle().then(r => setPlanStages(Array.isArray(r.data?.plan?.stages) ? r.data.plan.stages : []), () => {});
  }, [session?.lesson_id]);

  const doSwitch = async (target: LessonTarget) => {
    setSwitching(true);
    try {
      await switchSessionLesson(sid, target.id);
      setSwitchAsk(null);
      setNote({ text: `«${target.title}» сабағына ауыстырылды`, bad: false });
      privAt.current = 0;
      await refresh();
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : 'Ауысу қатесі', bad: true });
    } finally {
      setSwitching(false);
    }
  };

  const total = session?.slide_count || 0, cur = session?.current_slide || 0;
  // students who have not answered the open task: moving on closes it, so ask first (slow students must not lose their turn by accident)
  const waiting = parts.filter(p => !subs.some(x => x.student_id === p.student_id));
  const openAsks = asks.filter(q => !q.resolved).length;
  const goSlide = async (i: number) => {
    const idx = Math.max(0, Math.min(total - 1, i));
    if (idx === cur) return;
    if (task?.status === 'open' && idx > cur && waiting.length && !window.confirm(`${waiting.length} оқушы әлі тапсырмаған (${waiting.slice(0, 5).map(p => p.full_name.split(' ')[0]).join(', ')}). Келесі слайдқа өтсең, тапсырма жабылады. Өтесің бе?`)) return;
    await run(() => sb.rpc('cf_goto', { p_session: sid, p_index: idx }));
  };
  /** One place for every action: shows the server's refusal instead of failing silently, then re-reads. */
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok = '') => {
    setNote({ text: '', bad: false });
    try {
      const r = await fn();
      if (r.error) setNote({ text: r.error.message, bad: true }); else if (ok) setNote({ text: ok, bad: false });
    } catch (e) { setNote({ text: e instanceof Error ? e.message : 'Қате', bad: true }); }
    refresh();
  };
  // arrow keys move the slides unless the teacher is typing or on a tab strip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.altKey || e.ctrlKey || e.metaKey || !t || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.getAttribute('role') === 'tab') return;
      if (e.key === 'ArrowRight') goSlide(cur + 1); else if (e.key === 'ArrowLeft') goSlide(cur - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!session) return <div className="min-h-screen bg-bg text-text p-4 max-w-6xl mx-auto"><Skeleton /></div>;

  const slide = tr(priv[cur] || {}, lang);
  const next = tr(priv[cur + 1], lang);
  const isTask = slide.pageType !== 'scroll' && ['quiz', 'task', 'code'].includes(slide.type);
  const open = task && task.status === 'open';
  const onlineCount = parts.filter(p => p.presence === 'online').length;
  const hands = parts.filter(p => p.hand);
  const warns = parts.filter(p => p.away_count > 0 || p.locked).length;
  const nameOf = (id: string) => (parts.find(p => p.student_id === id) || {}).full_name || '?';
  const pct = Math.round(((cur + 1) / Math.max(1, total)) * 100);
  const msg = () => msgInput.trim();
  const send = (student: string | null, done: string) => {
    if (!msg()) { setNote({ text: 'Алдымен хабарлама жазыңыз', bad: true }); return; }
    run(() => sb.rpc('cf_popup', { p_session: sid, p_student: student, p_message: msg() }), done);
  };
  const toggleNav = () => run(() => sb.rpc('cf_set_nav', { p_session: sid, p_on: !session.student_nav }));
  const lockAll = () => run(() => sb.rpc('cf_lock', { p_session: sid, p_student: null, p_locked: !session.locked }));
  // allow_ask / allow_hand come with migration 063: without the column the rule counts as on
  const ruleOn = (k: string) => k === 'nav' ? !!session.student_nav : k === 'lock' ? !!session.locked : k === 'ask' ? session.allow_ask !== false : session.allow_hand !== false;
  const setRule = (k: string, on: boolean) => k === 'nav' ? toggleNav() : k === 'lock' ? lockAll() : run(() => sb.rpc('cf_set_rule', { p_session: sid, p_rule: k, p_on: on }));
  const subsDone = new Set(subs.map(x => x.student_id)).size;
  /** What the class grid shows beside a name: the level reached (L1-L3), ✓ answered, … still working. */
  const markOf = (id: string) => {
    const mine = subs.filter(x => x.student_id === id);
    if (lvTasks.length) {
      const lv = Math.max(0, ...mine.filter(x => x.is_correct).map(x => lvTasks.find(t => t.id === x.task_id)?.level || 0));
      return lv ? `L${lv}` : open ? '…' : '';
    }
    return !task ? '' : mine.length ? '✓' : open ? '…' : '';
  };
  // one list of everything that needs the teacher now: hands, open questions, students who left the page
  const attention = [
    ...hands.map(p => ({ key: 'h' + p.student_id, name: p.full_name, text: 'Қол көтерді', tone: 'bg-warning-soft', icon: <Hand size={16} aria-hidden="true" />, label: 'Көрдім', act: () => { run(() => sb.rpc('cf_clear_hand', { p_session: sid, p_student: p.student_id })); } })),
    ...asks.filter(q => !q.resolved).map(q => ({ key: 'q' + q.id, name: `${nameOf(q.student_id)} · ${q.slide_index + 1}-слайд`, text: q.body, tone: 'bg-accent/10', icon: <Icon n="help" size={16} />, label: 'Жауап бердім', act: () => { sb.rpc('cf_resolve_question', { p_id: q.id, p_on: true }).then(loadAsks, () => {}); } })),
    ...parts.filter(p => p.presence === 'away').map(p => ({ key: 'a' + p.student_id, name: p.full_name, text: `Беттен шықты${p.away_count ? ` · ${p.away_count} рет` : ''}`, tone: 'bg-danger-soft', icon: <Eye size={16} aria-hidden="true" />, label: 'Хабар', act: () => send(p.student_id, 'Жіберілді') })),
  ];

  const navBtns = (cls: string) => (
    <div className={cls}>
      <Button variant="secondary" className="h-14 text-base" disabled={cur <= 0} onClick={() => goSlide(cur - 1)}><ArrowLeft size={18} aria-hidden="true" />Артқа</Button>
      <Button className="h-14 text-base" disabled={cur >= total - 1} onClick={() => goSlide(cur + 1)}>Келесі<ArrowRight size={18} aria-hidden="true" /></Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text pb-44 sm:pb-28">
      <header className="border-b lg:sticky lg:top-0 lg:z-10 border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 lg:px-4">
          <a href="#" className="min-h-[44px] inline-flex items-center text-xl font-black" aria-label="ClassFlow: басты бет"><Logo /></a>
          <div className="min-w-0 flex-1 basis-40">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-text-secondary">{[className, session.title].filter(Boolean).join(' · ')}</p>
            <p className="truncate font-bold">{slide.title || TYPE[slide.type] || 'Слайд'}</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 sm:inline-flex text-xs font-semibold text-success whitespace-nowrap"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />Тікелей</span>
          <span className="rounded-md bg-surface-2 px-3 py-2 text-sm whitespace-nowrap"><span className="text-text-secondary">Код </span><b className="font-mono tracking-wider">{spaced(session.join_code)}</b></span>
          <a href={`#board/${sid}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-surface-2 px-3 text-sm font-semibold hover:bg-border"><Monitor size={16} aria-hidden="true" />Тақта<span className="sr-only"> (жаңа терезеде)</span></a>
          <button type="button" onClick={() => setShare(true)} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-surface-2 px-3 text-sm font-semibold hover:bg-border"><Share2 size={16} aria-hidden="true" />Бөлісу</button>
          <div className="relative">
            <button type="button" data-testid="rules-open" onClick={() => setRulesOpen(v => !v)} aria-expanded={rulesOpen} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-surface-2 px-3 text-sm font-semibold cursor-pointer hover:bg-border">
              <SlidersHorizontal size={16} aria-hidden="true" />Ережелер<span className="rounded-full bg-accent px-1.5 text-xs text-on-accent">{RULES.filter(r => ruleOn(r.key)).length}</span>
            </button>
            {rulesOpen && (
              <div role="dialog" aria-label="Сабақ ережелері" data-testid="rules" className="absolute right-0 z-30 mt-1 w-80 max-w-[90vw] space-y-1 rounded-xl border border-border bg-surface p-2 shadow-pop">
                {RULES.map(r => {
                  const on = ruleOn(r.key);
                  return (
                    <button key={r.key} type="button" role="switch" aria-checked={on} onClick={() => setRule(r.key, !on)} className={`flex min-h-[52px] w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left cursor-pointer ${on ? 'bg-success-soft' : 'hover:bg-surface-2'}`}>
                      <span className="min-w-0 flex-1"><b className="block text-sm font-semibold">{r.name}</b><span className="text-xs text-text-secondary">{r.hint}</span></span>
                      <span aria-hidden="true" className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 ${on ? 'justify-end bg-success' : 'justify-start bg-text-muted'}`}><span className="h-5 w-5 rounded-full bg-white" /></span>
                    </button>
                  );
                })}
                <p className="px-2 pt-1 text-xs text-text-muted">Бірден әсер етеді.</p>
              </div>
            )}
          </div>
          <Button variant="danger" onClick={() => setEnding(true)} aria-expanded={ending}><Square size={14} aria-hidden="true" />Аяқтау</Button>
        </div>
        <div className="mx-auto max-w-6xl">
          <LessonMap all kinds={priv.map(kindOf)} count={total} cur={cur} viewing={null} nav lang={lang} onPick={i => { if (i !== null) goSlide(i); }} />
          <StageClock stages={planStages} slides={priv} log={session.slide_log} startedAt={session.started_at} cur={cur} />
        </div>
        {share && <ShareBoard sid={sid} onClose={() => setShare(false)} />}
        {ending && (
          <div role="alertdialog" aria-label="Сабақты аяқтау" className="border-t border-border bg-danger-soft">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-3 py-2 text-sm text-danger lg:px-4">
              <span className="flex-1">Сабақ аяқталады, оқушылар шығарылады. Аяқтайсыз ба?</span>
              <Button variant="danger" onClick={async () => { await sb.rpc('cf_end_session', { p_session: sid }); window.location.hash = ''; }}>Иә, аяқтау</Button>
              <Button variant="secondary" onClick={() => setEnding(false)}>Жалғастыру</Button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_29rem] lg:p-4">
        <p role="status" aria-live="polite" className={note.text ? `lg:col-span-2 rounded-lg p-3 text-sm ${note.bad ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}` : 'sr-only'}>{note.text}</p>

        {lessonNav && (
          <section aria-label="Дәрістер мен модульдер бойынша өту" className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-text truncate min-w-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Layers size={15} />
                </span>
                <div className="min-w-0 truncate">
                  <span className="truncate font-bold">{lessonNav.moduleTitle}</span>
                  <span className="mx-1.5 text-text-muted">·</span>
                  <span className="text-text-secondary">{lessonNav.lessonPosition} / {lessonNav.lessonCount} дәріс</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {lessonNav.nextLesson && (
                  <button
                    type="button"
                    onClick={() => setSwitchAsk(lessonNav.nextLesson)}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent hover:bg-accent/20 transition-colors"
                  >
                    <span>Келесі дәріс</span>
                    <ArrowRight size={13} />
                  </button>
                )}
                {lessonNav.nextModule && (
                  <button
                    type="button"
                    onClick={() => setSwitchAsk(lessonNav.nextModule)}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-text hover:bg-border transition-colors"
                  >
                    <span>Келесі модуль</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section aria-label="Слайдты басқару" className="space-y-3 min-w-0">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <KindBadge kind={slide.kind} lang={lang} className="!px-2 !py-0.5 !text-xs whitespace-nowrap" />
                <h2 className="truncate text-base font-bold text-text">{slide.title || TYPE[slide.type] || 'Слайд'}</h2>
              </div>
              <Button variant="secondary" onClick={flipLang} aria-label="Слайд тілі" className="!min-h-[36px] !py-1 text-xs font-bold shrink-0">{LANG_LABEL[lang]}</Button>
            </div>
            {/* Large Current Slide Stage */}
            <div role="region" aria-label="Қазіргі слайдтың көрінісі" data-theme="light" className="overflow-hidden rounded-xl bg-bg text-text shadow-md border border-border/80">
              <div className="aspect-video w-full pointer-events-none select-none" inert>
                {renderSlide(tr(slide, lang), { mode: 'preview', lang })}
              </div>
            </div>
            {slide.notes && (
              <section aria-label="Мұғалім сөзі" data-testid="teacher-notes" className="rounded-xl border border-warning/50 bg-warning-soft p-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-warning">Мұғалім сөзі · тек сізге көрінеді</h3>
                <p className="mt-1 whitespace-pre-wrap text-base leading-relaxed text-text">{slide.notes}</p>
              </section>
            )}
          </Card>
        </section>

        <section aria-label="Сынып" className="min-w-0 space-y-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1"><Tabs id="remote" label="Сынып бөлімдері" tabs={EXTRA.some(t => t.key === tab) ? [...TABS, EXTRA.find(t => t.key === tab)!] : TABS} value={tab} onChange={setTab} /></div>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap pb-3 text-sm font-semibold" title="Онлайн оқушылар"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />{onlineCount}/{parts.length}</span>
            <details className="relative">
              <summary className="inline-flex min-h-[44px] list-none items-center gap-1.5 rounded-md px-3 text-sm font-semibold cursor-pointer hover:bg-surface-2"><MoreHorizontal size={16} aria-hidden="true" />Қосымша{openAsks ? <span className="rounded-full bg-warning px-1.5 text-xs font-bold text-bg">{openAsks}</span> : null}</summary>
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-pop">
                {EXTRA.map(t => (
                  <button key={t.key} type="button" onClick={e => { setTab(t.key); (e.currentTarget.closest('details') as HTMLDetailsElement).open = false; }} className="flex min-h-[44px] w-full items-center justify-between rounded-md px-3 text-left text-sm cursor-pointer hover:bg-surface-2">
                    {t.label}{t.key === 'ask' && openAsks ? <b className="text-warning">{openAsks}</b> : null}
                  </button>
                ))}
              </div>
            </details>
          </div>
          <div id="remote-panel" role="tabpanel" aria-labelledby={`remote-tab-${tab}`} tabIndex={0} className="space-y-2">
            {tab === 'class' && (
              <>
                <div className="flex gap-2">
                  <input aria-label="Хабарлама (оқушыларға қалқымалы терезе)" className={inputCls} placeholder="Хабарлама оқушыларға" value={msgInput} maxLength={200} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(null, 'Барлығына жіберілді'); }} />
                  <Button variant="secondary" onClick={() => send(null, 'Барлығына жіберілді')}><Bell size={16} aria-hidden="true" />Барлығына</Button>
                </div>
                {attention.length > 0 && (
                  <div data-testid="attention" className="space-y-1.5 rounded-xl border border-border bg-surface p-2.5">
                    <p className="flex items-center justify-between px-1 text-sm font-semibold">Назар керек<span className="rounded-full bg-warning px-2 text-xs font-bold text-bg">{attention.length}</span></p>
                    {attention.map(a => (
                      <div key={a.key} className={`flex items-center gap-2 rounded-lg p-2 ${a.tone}`}>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface">{a.icon}</span>
                        <div className="min-w-0 flex-1 text-sm"><b className="break-words">{a.name}</b><div className="break-words text-text-secondary">{a.text}</div></div>
                        <Button variant="secondary" onClick={a.act}>{a.label}</Button>
                      </div>
                    ))}
                  </div>
                )}
                {parts.length === 0 && <EmptyState icon="👥" text={`Әзірге ешкім қосылған жоқ. Оқушыларға код: ${spaced(session.join_code)}`} />}
                <ul data-testid="students" className="grid grid-cols-2 gap-1.5">
                  {parts.map(p => {
                    const sel = pickId === p.student_id, m = markOf(p.student_id);
                    return (
                      <li key={p.student_id} className={sel ? 'col-span-2' : ''}>
                        <button type="button" aria-expanded={sel} onClick={() => setPickId(sel ? '' : p.student_id)}
                          className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg border px-2.5 text-left text-sm cursor-pointer ${p.presence === 'away' ? 'border-danger bg-danger-soft' : 'border-border bg-surface hover:bg-surface-2'}`}>
                          <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.presence === 'online' ? 'bg-success' : p.presence === 'away' ? 'bg-danger' : 'bg-text-muted'}`} />
                          <span className="min-w-0 flex-1 truncate font-medium">{p.full_name}</span>
                          {p.locked && <Lock size={14} className="shrink-0 text-danger" aria-label="бұғатталған" />}
                          {m && <span className={`shrink-0 text-xs font-bold ${m === '…' ? 'text-text-secondary' : 'text-success'}`}>{m}</span>}
                        </button>
                        {sel && (
                          <div className="mt-1 flex items-center gap-1 rounded-lg bg-surface-2 p-1 pl-3">
                            <p className="min-w-0 flex-1 truncate text-xs text-text-secondary">
                          {pairs.find(q => q.host_id === p.student_id) ? `👥 ${pairs.find(q => q.host_id === p.student_id).partner_name} · ` : pairs.find(q => q.partner_id === p.student_id) ? `👥 ${pairs.find(q => q.partner_id === p.student_id).host_name}-мен бір экран · ` : ''}{PRESENCE[p.presence] || p.presence}{p.att === 'late' ? ' · кешікті' : ''}{p.locked ? ' · бұғатталған' : ''}{p.away_count > 0 ? ` · ${p.away_count}× шықты, ${fmt(p.away_seconds)}` : ''}
                            </p>
                      <IconBtn label={`${p.full_name}: ${p.locked ? 'бұғатты ашу' : 'бұғаттау'}`} tone={p.locked ? 'text-danger' : ''} onClick={() => run(() => sb.rpc('cf_lock', { p_session: sid, p_student: p.student_id, p_locked: !p.locked }))}>{p.locked ? <Lock size={18} aria-hidden="true" /> : <LockOpen size={18} aria-hidden="true" />}</IconBtn>
                      <IconBtn label={`${p.full_name}: хабарлама жіберу`} onClick={() => send(p.student_id, 'Жіберілді')}><Bell size={18} aria-hidden="true" /></IconBtn>
                      <IconBtn label={`${p.full_name}: +1 ұпай`} onClick={() => run(() => sb.rpc('cf_award', { p_session: sid, p_student: p.student_id, p_group: null, p_points: 1, p_reason: 'Белсенділік' }))}><Plus size={18} aria-hidden="true" /></IconBtn>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-text-muted">Атын бассаңыз: бұғаттау, хабар, +1 ұпай. L1–L3 — жеткен деңгейі, … — әлі тапсырмаған.</p>
              </>
            )}

            {tab === 'pairs' && (
                <div data-testid="pairs" className="space-y-2 rounded-lg border border-border bg-surface p-2">
                  <p className="px-1 text-sm font-semibold">👥 Жұптар <span className="font-normal text-text-secondary">— бір компьютер, екі оқушы</span></p>
                  {pairs.map(q => (
                    <div key={q.host_id} className="flex items-center justify-between gap-2 px-1 text-sm">
                      <span className="break-words">{q.host_name} + {q.partner_name}</span>
                      <IconBtn label={`${q.host_name} + ${q.partner_name}: жұпты бұзу`} onClick={() => run(() => sb.rpc('cf_pair_set', { p_session: sid, p_host: q.host_id, p_partner: null }))}><X size={16} aria-hidden="true" /></IconBtn>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <select aria-label="Аккаунтымен кірген оқушы" className={inputCls + ' !w-auto min-w-0 flex-1'} value={pf.host} onChange={e => setPf({ ...pf, host: e.target.value })}>
                      <option value="">Компьютердегі оқушы…</option>
                      {parts.filter(p => !pairs.some(q => q.host_id === p.student_id || q.partner_id === p.student_id)).map(p => <option key={p.student_id} value={p.student_id}>{p.full_name}</option>)}
                    </select>
                    <select aria-label="Қасына қосылатын оқушы" className={inputCls + ' !w-auto min-w-0 flex-1'} value={pf.partner} onChange={e => setPf({ ...pf, partner: e.target.value })}>
                      <option value="">Жұбы…</option>
                      {roster.filter(r => r.student_id !== pf.host && !pairs.some(q => q.host_id === r.student_id || q.partner_id === r.student_id)).map(r => <option key={r.student_id} value={r.student_id}>{r.full_name}</option>)}
                    </select>
                    <Button variant="secondary" disabled={!pf.host || !pf.partner} onClick={() => { run(() => sb.rpc('cf_pair_set', { p_session: sid, p_host: pf.host, p_partner: pf.partner }), 'Жұп қосылды'); setPf({ host: '', partner: '' }); }}><Plus size={16} aria-hidden="true" />Жұп қосу</Button>
                  </div>
                </div>
            )}

            {tab === 'subs' && (!task ? <EmptyState icon="✅" text="Белсенді тапсырма жоқ. Тест не тапсырма слайдында «Тапсырма жіберу» батырмасын басыңыз." /> : lvTasks.length ? (
              <div className="overflow-x-auto" data-testid="levels-matrix">
                <table className="w-full text-sm">
                  <caption className="sr-only">Деңгейлер бойынша жауаптар</caption>
                  <thead><tr><th scope="col" className="text-left py-1">Оқушы</th>{lvTasks.map(x => <th key={x.id} scope="col" className="px-1 text-center">L{x.level}{x.variant}</th>)}</tr></thead>
                  <tbody>{[...new Set(subs.map(x => x.student_id))].map(id => {
                    const pr = pairs.find(q => q.host_id === id || q.partner_id === id);
                    return (
                      <tr key={id} className="border-t border-border">
                        <td className="py-1.5 pr-2">{nameOf(id)}{pr ? <span title={`Жұп: ${pr.host_name} + ${pr.partner_name}`}> 👥</span> : null}</td>
                        {lvTasks.map(x => {
                          const sub = subs.find(y => y.student_id === id && y.task_id === x.id);
                          if (!sub) return <td key={x.id} className="text-center text-text-muted">·</td>;
                          if (sub.is_correct == null) return <td key={x.id} className="text-center"><button type="button" aria-label={`${nameOf(id)}: L${x.level}${x.variant} қабылдау`} title={sub.answer} className="cursor-pointer rounded bg-warning-soft px-1.5 text-warning" onClick={() => run(() => sb.rpc('cf_grade', { p_sub: sub.id, p_points: x.points, p_feedback: null }), 'Баға қойылды')}>⏳</button></td>;
                          return <td key={x.id} title={sub.answer} className={`text-center font-bold ${sub.is_correct ? 'text-success' : 'text-danger'}`}>{sub.is_correct ? '✓' : '✗'}</td>;
                        })}
                      </tr>
                    );
                  })}</tbody>
                </table>
                {subs.length === 0 && <p className="text-sm text-text-muted pt-2">Әзірге жауап жоқ.</p>}
                <p className="pt-2 text-xs text-text-muted">⏳ — қолмен тексеру керек: басқанда толық ұпай қойылады, келесі деңгей ашылады.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-text-secondary break-words">{task.prompt}</p>
                {subs.length === 0 && <p className="text-sm text-text-muted">Әзірге жауап жоқ.</p>}
                <ul className="space-y-2">
                  {subs.map(s => {
                    const m = s.meta && s.meta.total ? s.meta : null;
                    const ptsVal = gradingPoints[s.id] ?? (s.points ?? (m ? Math.round(task.points * m.passed / m.total) : ''));
                    return (
                      <li key={s.id} className="space-y-1 rounded-lg border border-border bg-surface p-3">
                        <div className="flex items-start justify-between gap-2">
                          <b className="break-words">{nameOf(s.student_id)}</b>
                          <span className={`inline-flex items-center gap-1 text-sm ${s.is_correct ? 'text-success' : 'text-text-secondary'}`}>
                            {s.is_correct ? <Check size={14} aria-hidden="true" /> : s.points != null ? <X size={14} aria-hidden="true" /> : null}{s.points != null ? `${s.points}/${task.points}` : 'бағаланбаған'}
                          </span>
                        </div>
                        {m && <p className={`text-sm ${m.passed === m.total ? 'text-success' : 'text-warning'}`}>Автотест: {m.passed}/{m.total}</p>}
                        <pre className="whitespace-pre-wrap break-words text-sm text-text-secondary font-sans">{task.kind === 'quiz' ? (task.options || [])[+s.answer] ?? s.answer : s.meta?.sql || s.answer}</pre>
                        {['text', 'code', 'short'].includes(task.kind) && (
                          <div className="flex items-center gap-2 pt-1">
                            <input aria-label={`${nameOf(s.student_id)}: ұпай (0–${task.points})`} className={inputCls + ' !w-20'} type="number" min={0} max={task.points} value={ptsVal} onChange={e => setGradingPoints({ ...gradingPoints, [s.id]: e.target.value })} />
                            <Button variant="success" onClick={() => run(() => sb.rpc('cf_grade', { p_sub: s.id, p_points: +ptsVal || 0, p_feedback: null }), 'Баға қойылды')}>Бағалау</Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ))}

            {tab === 'ask' && (asks.length === 0 ? <p className="text-sm text-text-muted">Әзірге сұрақ жоқ. Оқушы «Түсінбедім» арқылы жазғанда осында шығады.</p> : (
              <ul data-testid="asks" className="space-y-2">
                {asks.map(q => (
                  <li key={q.id} className={`flex items-start gap-3 rounded-xl border border-border p-3 ${q.resolved ? 'opacity-60' : 'bg-surface'}`}>
                    <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-sm font-bold tabular-nums">{q.slide_index + 1}-слайд</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{parts.find(p => p.student_id === q.student_id)?.full_name || 'Оқушы'}</div>
                      <div className="whitespace-pre-wrap break-words">{q.body}</div>
                    </div>
                    <Button variant="secondary" onClick={() => sb.rpc('cf_resolve_question', { p_id: q.id, p_on: !q.resolved }).then(loadAsks, () => {})}>{q.resolved ? 'Қайтару' : 'Жауап бердім'}</Button>
                  </li>
                ))}
              </ul>
            ))}
            {tab === 'score' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: session.groups_count || 3 }, (_, i) => i + 1).map(g => {
                    const pts = (groupScores.find((x: any) => x.group_no === g) || {}).points || 0;
                    return (
                      <div key={g} className="rounded-lg border border-border bg-surface p-3">
                        <div className="flex justify-between"><b>Топ {g}</b><b className="text-warning" aria-label={`${pts} ұпай`}>{pts}</b></div>
                        <div className="mt-2 flex gap-1">
                          {[1, 3, 5].map(n => <Button key={n} variant="secondary" className="flex-1 !px-0" aria-label={`Топ ${g}: +${n} ұпай`} onClick={() => run(() => sb.rpc('cf_award', { p_session: sid, p_student: null, p_group: g, p_points: n, p_reason: 'Топтық' }))}>+{n}</Button>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {leaderboard.length === 0 ? <p className="text-sm text-text-muted">Ұпай әлі берілмеген.</p> : (
                  <table className="w-full text-sm">
                    <caption className="sr-only">Сынып рейтингі</caption>
                    <thead className="sr-only"><tr><th scope="col">Орын</th><th scope="col">Оқушы</th><th scope="col">Топ</th><th scope="col">Ұпай</th></tr></thead>
                    <tbody>{leaderboard.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b border-border"><td className="w-8 py-2 text-text-secondary">{i + 1}</td><td>{r.full_name}</td><td className="text-text-secondary">{r.group_no ? 'Топ ' + r.group_no : ''}</td><td className="text-right font-bold text-warning">{r.points}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </>
            )}

            {tab === 'att' && (attendanceRows.length === 0 ? <p className="text-sm text-text-muted">Деректер жүктелуде немесе әлі жоқ.</p> : (
              <table className="w-full text-sm">
                <caption className="sr-only">Қатысу</caption>
                <thead className="sr-only"><tr><th scope="col">Оқушы</th><th scope="col">Күйі</th><th scope="col">Беттен шығу</th></tr></thead>
                <tbody>{attendanceRows.map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="py-2">{r.full_name}</td>
                    <td className={r.status === 'absent' ? 'text-danger' : r.status === 'late' ? 'text-warning' : 'text-success'}>{({ present: 'бар', late: 'кешікті', absent: 'жоқ' } as Record<string, string>)[r.status] || r.status}</td>
                    <td className="text-right text-text-secondary">{r.away_count ? `${r.away_count}× ${fmt(r.away_seconds)}` : ''}</td>
                  </tr>
                ))}</tbody>
              </table>
            ))}

            {tab === 'slides' && (
              <ol className="space-y-1">
                {priv.map((s: any, i: number) => (
                  <li key={i}>
                    <button type="button" aria-current={i === cur ? 'step' : undefined} onClick={() => goSlide(i)}
                      className={`flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 text-left text-sm cursor-pointer ${i === cur ? 'bg-accent text-on-accent font-semibold' : 'bg-surface border border-border hover:bg-surface-2'}`}>
                      <span className="w-6 shrink-0 tabular-nums opacity-80">{i + 1}</span><span className="min-w-0 flex-1 truncate">{s.title || TYPE[s.type] || s.type}</span><span className="text-xs opacity-80">{kindLabel(s.kind, lang) || TYPE[s.type] || ''}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </main>

      {/* one action bar for every screen: back, the task of this slide, next */}
      <div data-testid="action-bar" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-2.5 shadow-[0_-4px_24px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl grid-cols-2 items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="order-first col-span-2 min-w-0 sm:order-2 sm:col-span-1">
            {open ? (
              <div className="flex min-h-[56px] items-center gap-3 rounded-xl border border-success bg-success-soft px-3 py-1.5">
                <div className="shrink-0 text-sm font-bold text-success">Тапсырма ашық{task.time_limit ? <div><Countdown task={task} /></div> : null}</div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex justify-between gap-2 text-xs font-semibold"><span className="whitespace-nowrap">Тапсырды {subsDone} / {parts.length}</span>{waiting.length > 0 && <span className="truncate text-text-secondary">Қалды: {waiting.slice(0, 3).map(p => p.full_name.split(' ')[0]).join(', ')}{waiting.length > 3 ? ` +${waiting.length - 3}` : ''}</span>}</div>
                  <div role="progressbar" aria-label="Тапсырған оқушылар" aria-valuemin={0} aria-valuemax={parts.length} aria-valuenow={subsDone} className="h-1.5 rounded bg-surface-2"><div className="h-1.5 rounded bg-success" style={{ width: (parts.length ? (subsDone / parts.length) * 100 : 0) + '%' }} /></div>
                </div>
                <Button variant="danger" onClick={() => run(() => sb.rpc('cf_close_task', { p_task: task.id }))}><Square size={14} aria-hidden="true" />Жабу</Button>
              </div>
            ) : isTask ? (
              <div className="flex min-h-[56px] items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-1.5">
                <span className="min-w-0 truncate text-sm text-text-secondary">{task ? `Тапсырма жабылған · тапсырды ${subsDone} / ${parts.length}` : 'Бұл слайдта тапсырма бар'}</span>
                <Button onClick={() => run(() => sb.rpc('cf_open_task', { p_session: sid, p_index: cur }))}><Play size={14} aria-hidden="true" />Тапсырма жіберу</Button>
              </div>
            ) : (
              <p className="hidden text-center text-sm text-text-secondary sm:block">Слайд {cur + 1} / {total} · пернетақтада ← және →</p>
            )}
          </div>
          <Button variant="secondary" className="h-14 text-base sm:order-1 sm:px-5" disabled={cur <= 0} onClick={() => goSlide(cur - 1)}><ArrowLeft size={18} aria-hidden="true" />Артқа</Button>
          {cur >= total - 1 && (lessonNav?.nextLesson || lessonNav?.nextModule) ? (
            <Button className="h-14 text-base sm:order-3 sm:px-5" onClick={() => setSwitchAsk(lessonNav.nextLesson || lessonNav.nextModule)}>Келесі сабаққа өту<ArrowRight size={18} aria-hidden="true" /></Button>
          ) : (
            <Button className="h-14 sm:order-3 sm:px-5" disabled={cur >= total - 1} onClick={() => goSlide(cur + 1)}>
              <span className="min-w-0 text-left leading-tight"><b className="block text-base">Келесі</b>{next ? <span className="block max-w-[14rem] truncate text-xs font-normal opacity-80">{cur + 2} · {next.title || TYPE[next.type] || 'Слайд'}</span> : null}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation modal for switching lesson */}
      {switchAsk && (
        <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <BookOpen size={20} />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-base font-bold text-text">Жаңа сабаққа ауысу</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  <b>«{switchAsk.title}»</b> ({switchAsk.moduleTitle}) сабағына ауысасыз ба?
                </p>
                <p className="text-[11px] text-text-muted">
                  Оқушылар мен басқа құрылғылар сабақтан шығарылмайды, бірден жаңа слайдқа ауысады.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button variant="secondary" onClick={() => setSwitchAsk(null)} className="!min-h-[36px] text-xs">
                Болдырмау
              </Button>
              <Button
                variant="primary"
                disabled={switching}
                onClick={() => doSwitch(switchAsk)}
                className="!min-h-[36px] text-xs font-bold"
              >
                {switching ? 'Ауысуда...' : 'Иә, ауысу'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
