import React, { useState, useEffect, useRef } from 'react';
import { Logo } from '../ui/Logo';
import { ArrowLeft, ArrowRight, Bell, Hand, Lock, LockOpen, Monitor, Plus, Square, Play, Check, X } from 'lucide-react';
import { sb } from '../config';
import { Button, Card, EmptyState, Skeleton, inputCls } from '../ui';
import { Tabs } from '../ui/Tabs';
import { spaced, fmt } from './Widgets';

const TYPE: Record<string, string> = { title: 'Тақырып', content: 'Мазмұн', bullets: 'Тізім', quiz: 'Тест', task: 'Тапсырма', code: 'Код', flashcards: 'Карточка', matching: 'Сәйкестендіру', logic: 'Логика', leaderboard: 'Рейтинг', summary: 'Қорытынды' };
const PRESENCE: Record<string, string> = { online: 'онлайн', away: 'беттен шықты', offline: 'офлайн' };
const TABS = [{ key: 'class', label: 'Сынып' }, { key: 'subs', label: 'Жауаптар' }, { key: 'score', label: 'Ұпай' }, { key: 'att', label: 'Қатысу' }, { key: 'slides', label: 'Слайдтар' }];
const slideText = (s: any) => (s.bullets && s.bullets.join(' · ')) || s.prompt || s.subtitle || '';

/** Remaining (limited) or elapsed time of an open task, ticking every second. */
function Countdown({ task }: { task: any }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const sec = Math.max(0, Math.floor((now - new Date(task.opened_at).getTime()) / 1000));
  const left = task.time_limit ? Math.max(0, task.time_limit - sec) : null;
  return <span className={`font-mono tabular-nums ${left !== null && left <= 10 ? 'text-danger font-bold' : ''}`}>{fmt(left ?? sec)}</span>;
}

const Stat = ({ k, v, tone = '' }: { k: string; v: React.ReactNode; tone?: string }) => (
  <div className={`rounded-lg border border-border bg-surface p-3 ${tone}`}><div className="text-xs text-text-secondary">{k}</div><div className="text-lg font-bold">{v}</div></div>
);
const IconBtn = ({ label, onClick, children, tone = '' }: { label: string; onClick: () => void; children: React.ReactNode; tone?: string }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} className={`inline-flex h-11 w-11 items-center justify-center rounded-md cursor-pointer hover:bg-surface-2 ${tone || 'text-text-secondary'}`}>{children}</button>
);

export function RemoteView({ sid, me }: { sid: string; me: any; onLogout: () => void }) {
  const [session, setSession] = useState<any>(null);
  const [priv, setPriv] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [task, setTask] = useState<any>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [groupScores, setGroupScores] = useState<any[]>([]);
  const [tab, setTab] = useState('class');
  const [className, setClassName] = useState('');
  const [msgInput, setMsgInput] = useState('');
  const [gradingPoints, setGradingPoints] = useState<{ [subId: string]: string }>({});
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [note, setNote] = useState<{ text: string; bad: boolean }>({ text: '', bad: false });
  const [ending, setEnding] = useState(false);
  const autoTRef = useRef<any>(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const refresh = async () => {
    try {
      const [sRes, pPriv, pParts, lbRes, gsRes] = await Promise.all([
        sb.from('cf_sessions').select('*').eq('id', sid).single(),
        sb.from('cf_session_private').select('slides').eq('session_id', sid).maybeSingle(),
        sb.from('cf_participants').select('*').eq('session_id', sid).order('full_name'),
        sb.rpc('cf_leaderboard', { p_session: sid }),
        sb.rpc('cf_group_scores', { p_session: sid }),
      ]);
      if (sRes.data) setSession(sRes.data);
      setPriv(pPriv.data?.slides || []);
      if (pParts.data) setParts(pParts.data);
      if (lbRes.data) setLeaderboard(lbRes.data);
      if (gsRes.data) setGroupScores(gsRes.data);

      const activeTask = sRes.data?.active_task_id ? (await sb.from('cf_tasks').select('*').eq('id', sRes.data.active_task_id).single()).data : null;
      setTask(activeTask);
      setSubs(activeTask ? (await sb.from('cf_submissions').select('*').eq('task_id', activeTask.id)).data || [] : []);

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
    ['cf_sessions', 'cf_participants', 'cf_tasks', 'cf_submissions', 'cf_scores'].forEach(tb => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: tb }, () => refresh());
    });
    ch.subscribe();
    const iv = setInterval(refresh, 8000);
    return () => { sb.removeChannel(ch); clearInterval(iv); clearTimeout(autoTRef.current); };
  }, [sid]);
  useEffect(() => { if (tab === 'att') refresh(); }, [tab]);

  const total = session?.slide_count || 0, cur = session?.current_slide || 0;
  const goSlide = async (i: number) => {
    const idx = Math.max(0, Math.min(total - 1, i));
    if (idx === cur) return;
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

  const slide = priv[cur] || {};
  const next = priv[cur + 1];
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
  const lockAll = () => run(() => sb.rpc('cf_lock', { p_session: sid, p_student: null, p_locked: !session.locked }));

  const navBtns = (cls: string) => (
    <div className={cls}>
      <Button variant="secondary" className="h-14 text-base" disabled={cur <= 0} onClick={() => goSlide(cur - 1)}><ArrowLeft size={18} aria-hidden="true" />Артқа</Button>
      <Button className="h-14 text-base" disabled={cur >= total - 1} onClick={() => goSlide(cur + 1)}>Келесі<ArrowRight size={18} aria-hidden="true" /></Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text pb-28 lg:pb-6">
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
          <Button variant="danger" onClick={() => setEnding(true)} aria-expanded={ending}><Square size={14} aria-hidden="true" />Аяқтау</Button>
        </div>
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

        <section aria-label="Слайдты басқару" className="space-y-3 min-w-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat k="Қатысу" v={`${onlineCount} / ${parts.length}`} />
            <Stat k="Тапсырды" v={task ? `${subs.length} / ${parts.length}` : '—'} />
            <Stat k="Қол көтерді" v={hands.length} tone={hands.length ? 'bg-warning-soft' : ''} />
            <Stat k="Ескерту" v={warns} />
          </div>

          <Card className="space-y-3">
            <div className="flex items-baseline justify-between gap-2 text-sm text-text-secondary">
              <span>Слайд <b className="text-text">{cur + 1}</b> / {total} · {TYPE[slide.type] || slide.type || ''}</span>
              <button type="button" onClick={lockAll} aria-pressed={!!session.locked} className={`inline-flex min-h-[44px] items-center gap-2 rounded-md px-3 text-sm font-semibold cursor-pointer ${session.locked ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-text hover:bg-border'}`}>
                {session.locked ? <Lock size={16} aria-hidden="true" /> : <LockOpen size={16} aria-hidden="true" />}{session.locked ? 'Экрандар бұғатталған' : 'Бәрін бұғаттау'}
              </button>
            </div>
            {/* the preview imitates the projector, so it keeps its own dark colours in every theme */}
            <div className="min-h-[140px] space-y-2 rounded-xl bg-[#10213F] p-5 text-white">
              <p className="text-xl font-bold break-words">{slide.title || ''}</p>
              <p className="line-clamp-5 whitespace-pre-wrap text-sm text-[#C9D5EE] break-words">{slideText(slide)}</p>
            </div>
            <div role="progressbar" aria-label="Сабақ барысы" aria-valuemin={1} aria-valuemax={total} aria-valuenow={cur + 1} className="h-1.5 rounded bg-surface-2"><div className="h-1.5 rounded bg-accent" style={{ width: pct + '%' }} /></div>
            {slide.notes && <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning"><b>Ескертпе:</b> {slide.notes}</p>}
            {next && <p className="text-sm text-text-secondary">Келесі: <b className="text-text">{next.title || TYPE[next.type]}</b></p>}
            {navBtns('hidden grid-cols-2 gap-2 lg:grid')}
            <p className="hidden text-xs text-text-muted lg:block">Пернетақтада ← және → слайдты ауыстырады.</p>
          </Card>

          {(isTask || task) && (
            <Card className="space-y-3" aria-label="Тапсырма">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Тапсырма {open ? <span className="ml-2 text-sm font-normal text-success">ашық</span> : task ? <span className="ml-2 text-sm font-normal text-text-secondary">жабылған</span> : null}</h2>
                {open && task.time_limit ? <Countdown task={task} /> : null}
              </div>
              {task && <p className="text-sm text-text-secondary break-words">{task.prompt}</p>}
              {task && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Тапсырды</span><b>{subs.length} / {parts.length}</b></div>
                  <div role="progressbar" aria-label="Тапсырған оқушылар" aria-valuemin={0} aria-valuemax={parts.length} aria-valuenow={subs.length} className="h-1.5 rounded bg-surface-2"><div className="h-1.5 rounded bg-success" style={{ width: Math.round((subs.length / Math.max(1, parts.length)) * 100) + '%' }} /></div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {open ? <Button variant="danger" onClick={() => run(() => sb.rpc('cf_close_task', { p_task: task.id }))}><Square size={14} aria-hidden="true" />Тапсырманы жабу</Button>
                  : isTask && <Button onClick={() => run(() => sb.rpc('cf_open_task', { p_session: sid, p_index: cur }))}><Play size={14} aria-hidden="true" />Тапсырма жіберу</Button>}
                {task && <Button variant="secondary" onClick={() => setTab('subs')}>Жауаптарды көру</Button>}
              </div>
            </Card>
          )}
        </section>

        <section aria-label="Сынып" className="min-w-0 space-y-3">
          <Tabs id="remote" label="Сынып бөлімдері" tabs={TABS.map(t => t.key === 'class' && hands.length ? { ...t, label: `Сынып · ${hands.length}` } : t)} value={tab} onChange={setTab} />
          <div id="remote-panel" role="tabpanel" aria-labelledby={`remote-tab-${tab}`} tabIndex={0} className="space-y-2">
            {tab === 'class' && (
              <>
                <div className="flex gap-2">
                  <input aria-label="Хабарлама (оқушыларға қалқымалы терезе)" className={inputCls} placeholder="Хабарлама оқушыларға" value={msgInput} maxLength={200} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(null, 'Барлығына жіберілді'); }} />
                  <Button variant="secondary" onClick={() => send(null, 'Барлығына жіберілді')}><Bell size={16} aria-hidden="true" />Барлығына</Button>
                </div>
                {hands.length > 0 && (
                  <div className="rounded-lg bg-warning-soft p-2 space-y-1">
                    <p className="px-1 text-sm font-semibold text-warning">Қол көтергендер</p>
                    {hands.map(p => (
                      <div key={p.student_id} className="flex items-center justify-between gap-2 px-1">
                        <span className="font-medium break-words">{p.full_name}</span>
                        <Button variant="secondary" onClick={() => run(() => sb.rpc('cf_clear_hand', { p_session: sid, p_student: p.student_id }))} aria-label={`${p.full_name}: қолын түсіру`}><Hand size={16} aria-hidden="true" />Түсіру</Button>
                      </div>
                    ))}
                  </div>
                )}
                {parts.length === 0 && <EmptyState icon="👥" text={`Әзірге ешкім қосылған жоқ. Оқушыларға код: ${spaced(session.join_code)}`} />}
                <ul className="space-y-1.5">
                  {parts.map(p => (
                    <li key={p.student_id} className={`flex items-center gap-1 rounded-lg border bg-surface p-1.5 pl-3 ${p.presence === 'away' ? 'border-danger' : 'border-border'}`}>
                      <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.presence === 'online' ? 'bg-success' : p.presence === 'away' ? 'bg-danger' : 'bg-text-muted'}`} />
                      <div className="ml-2 min-w-0 flex-1">
                        <p className="truncate font-medium">{p.full_name}</p>
                        <p className="truncate text-xs text-text-secondary">
                          {PRESENCE[p.presence] || p.presence}{p.att === 'late' ? ' · кешікті' : ''}{p.locked ? ' · бұғатталған' : ''}{p.away_count > 0 ? ` · ${p.away_count}× шықты, ${fmt(p.away_seconds)}` : ''}
                        </p>
                      </div>
                      <IconBtn label={`${p.full_name}: ${p.locked ? 'бұғатты ашу' : 'бұғаттау'}`} tone={p.locked ? 'text-danger' : ''} onClick={() => run(() => sb.rpc('cf_lock', { p_session: sid, p_student: p.student_id, p_locked: !p.locked }))}>{p.locked ? <Lock size={18} aria-hidden="true" /> : <LockOpen size={18} aria-hidden="true" />}</IconBtn>
                      <IconBtn label={`${p.full_name}: хабарлама жіберу`} onClick={() => send(p.student_id, 'Жіберілді')}><Bell size={18} aria-hidden="true" /></IconBtn>
                      <IconBtn label={`${p.full_name}: +1 ұпай`} onClick={() => run(() => sb.rpc('cf_award', { p_session: sid, p_student: p.student_id, p_group: null, p_points: 1, p_reason: 'Белсенділік' }))}><Plus size={18} aria-hidden="true" /></IconBtn>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {tab === 'subs' && (!task ? <EmptyState icon="✅" text="Белсенді тапсырма жоқ. Тест не тапсырма слайдында «Тапсырма жіберу» батырмасын басыңыз." /> : (
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
                        <pre className="whitespace-pre-wrap break-words text-sm text-text-secondary font-sans">{task.kind === 'quiz' ? (task.options || [])[+s.answer] ?? s.answer : s.answer}</pre>
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
                      <span className="w-6 shrink-0 tabular-nums opacity-80">{i + 1}</span><span className="min-w-0 flex-1 truncate">{s.title || TYPE[s.type] || s.type}</span><span className="text-xs opacity-80">{TYPE[s.type] || ''}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </main>

      {/* phone: the two buttons the teacher needs most stay under the thumb */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface p-2 lg:hidden">
        <div className="mx-auto max-w-xl">{navBtns('grid grid-cols-2 gap-2')}</div>
      </div>
    </div>
  );
}
