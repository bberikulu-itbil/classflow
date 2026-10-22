import React, { useState, useEffect, useRef } from 'react';
import { sb } from '../config';
import { TopBar } from './TopBar';
import { BTN, BTN_P, BTN_G, INP, spaced, fmt, lbTable } from './Widgets';

export function RemoteView({ sid, me, onLogout }: { sid: string; me: any; onLogout: () => void }) {
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

  const autoTRef = useRef<any>(null);

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

      const activeTask = sRes.data?.active_task_id
        ? (await sb.from('cf_tasks').select('*').eq('id', sRes.data.active_task_id).single()).data
        : null;
      setTask(activeTask);

      const subList = activeTask ? (await sb.from('cf_submissions').select('*').eq('task_id', activeTask.id)).data : [];
      setSubs(subList || []);

      if (sRes.data?.class_id && !className) {
        const cls = (await sb.from('classes').select('name').eq('id', sRes.data.class_id)).data;
        if (cls && cls[0]) setClassName(cls[0].name);
      }

      if (activeTask && activeTask.status === 'open' && activeTask.time_limit) {
        clearTimeout(autoTRef.current);
        const left = new Date(activeTask.opened_at).getTime() + activeTask.time_limit * 1000 - Date.now();
        autoTRef.current = setTimeout(() => {
          sb.rpc('cf_close_task', { p_task: activeTask.id }).then(refresh, () => {});
        }, Math.max(0, left) + 1500);
      }

      if (tab === 'att') {
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
    return () => {
      sb.removeChannel(ch);
      clearInterval(iv);
      clearTimeout(autoTRef.current);
    };
  }, [sid, tab]);

  if (!session) return <div className="p-10 text-center text-white">Жүктелуде...</div>;

  const curSlide = priv[session.current_slide] || {};
  const isTask = ['quiz', 'task', 'code'].includes(curSlide.type);
  const onlineCount = parts.filter(p => p.presence === 'online').length;
  const hands = parts.filter(p => p.hand);
  const warn = parts.filter(p => p.away_count > 0 || p.locked);
  const prevText = (curSlide.bullets && curSlide.bullets.join(' · ')) || curSlide.prompt || curSlide.subtitle || '';

  const goSlide = async (i: number) => {
    const idx = Math.max(0, Math.min(session.slide_count - 1, i));
    await sb.rpc('cf_goto', { p_session: sid, p_index: idx });
    refresh();
  };

  const statBox = (k: string, v: any) => (
    <div className="bg-slate-900 rounded-2xl p-3 flex flex-col gap-0.5 text-white">
      <div className="text-xs text-slate-400">{k}</div>
      <div className="text-lg font-bold">{v}</div>
    </div>
  );

  const actBox = (label: string, onClick: () => void, cls = '') => (
    <button className={`min-h-[56px] rounded-2xl bg-slate-900 px-3 text-sm font-semibold text-left text-white cursor-pointer hover:bg-slate-800 ${cls}`} onClick={onClick}>
      {label}
    </button>
  );

  const nameOf = (id: string) => (parts.find(p => p.student_id === id) || {}).full_name || '?';

  return (
    <div className="min-h-screen bg-bg pb-24 text-white">
      <TopBar me={me} onLogout={onLogout} right={<a href={`#board/${sid}`} target="_blank" className={BTN}>📺 Тақта</a>} />
      <div className="max-w-xl mx-auto p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{className} · {session.title}</div>
            <div className="text-xl font-bold">{curSlide.title || curSlide.type || ''}</div>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-950 text-emerald-400 whitespace-nowrap">● Тікелей</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {statBox('Код', <span className="font-mono">{spaced(session.join_code)}</span>)}
          {statBox('Қатысу', `${onlineCount} / ${parts.length}`)}
          {statBox('Тапсырды', task ? `${subs.length} / ${parts.length}` : '—')}
        </div>

        <div className="p-3 rounded-2xl bg-slate-900 space-y-3">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Слайд {session.current_slide + 1} / {session.slide_count} · {curSlide.type || ''}</span>
            {task && task.status === 'open' && task.time_limit && <span className="font-mono">{fmt(task.time_limit)}</span>}
          </div>
          <div className="rounded-xl bg-[#10213F] text-white p-4 min-h-[110px] space-y-2">
            <div className="font-semibold">{curSlide.title || ''}</div>
            <div className="text-xs text-[#B9C7E6] line-clamp-4 whitespace-pre-wrap">{prevText}</div>
          </div>
          <div className="h-1.5 rounded bg-slate-700">
            <div className="h-1.5 rounded bg-blue-600" style={{ width: `${Math.round(((session.current_slide + 1) / Math.max(1, session.slide_count)) * 100)}%` }} />
          </div>
          {curSlide.notes && <div className="p-2 rounded-xl bg-amber-950 text-amber-200 text-sm">📝 {curSlide.notes}</div>}
          <div className="grid grid-cols-2 gap-2">
            <button className="h-16 rounded-2xl border border-slate-600 bg-slate-900 text-base font-semibold cursor-pointer" onClick={() => goSlide(session.current_slide - 1)}>← Артқа</button>
            <button className="h-16 rounded-2xl bg-blue-600 text-white text-base font-semibold cursor-pointer" onClick={() => goSlide(session.current_slide + 1)}>Келесі →</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {actBox(session.locked ? '🔓 Бәрін ашу' : '🔒 Бәрін бұғаттау', async () => {
            await sb.rpc('cf_lock', { p_session: sid, p_student: null, p_locked: !session.locked });
            refresh();
          })}
          {isTask ? (
            task && task.status === 'open' ? (
              actBox('⏹ Тапсырманы жабу', async () => { await sb.rpc('cf_close_task', { p_task: task.id }); refresh(); }, '!bg-red-700 !text-white')
            ) : (
              actBox('📝 Тапсырма жіберу', async () => { await sb.rpc('cf_open_task', { p_session: sid, p_index: session.current_slide }); refresh(); })
            )
          ) : (
            actBox('📺 Тақтаны ашу', () => window.open('#board/' + sid, '_blank'))
          )}
          {actBox(`✋ Қол көтерді · ${hands.length}`, () => setTab('class'), hands.length ? '!bg-amber-950' : '')}
          {actBox('🏆 Ұпай', () => setTab('score'))}
        </div>

        {warn.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-3 space-y-2">
            <div className="text-sm font-bold">Ескертулер</div>
            {warn.slice(0, 6).map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                <span><b>{p.full_name}</b> {p.away_count > 0 ? `беттен шықты · ${p.away_count} рет, ${p.away_seconds} с` : 'бұғатталған'}</span>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-950 text-amber-300">Focus</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button className={tab === 'class' ? BTN_P : BTN} onClick={() => setTab('class')}>👥 Сынып</button>
          <button className={tab === 'subs' ? BTN_P : BTN} onClick={() => setTab('subs')}>✅ Жауаптар</button>
          <button className={tab === 'score' ? BTN_P : BTN} onClick={() => setTab('score')}>🏆 Ұпай</button>
          <button className={tab === 'att' ? BTN_P : BTN} onClick={() => setTab('att')}>📋 Қатысу</button>
          <button className={tab === 'slides' ? BTN_P : BTN} onClick={() => setTab('slides')}>🎞 Слайдтар</button>
        </div>

        {tab === 'class' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                className={session.locked ? BTN_G : BTN + ' !bg-red-700 !text-white'}
                onClick={async () => { await sb.rpc('cf_lock', { p_session: sid, p_student: null, p_locked: !session.locked }); refresh(); }}
              >
                {session.locked ? '🔓 Барлығын ашу' : '🔒 Барлығын бұғаттау'}
              </button>
              <button
                className={BTN + ' !bg-amber-600 !text-white'}
                onClick={async () => {
                  if (!msgInput.trim()) return alert('Хабарлама жаз');
                  await sb.rpc('cf_popup', { p_session: sid, p_student: null, p_message: msgInput.trim() });
                  alert('Барлығына жіберілді');
                }}
              >
                🔔 Барлығына
              </button>
            </div>
            {parts.map((p, i) => (
              <div key={i} className={`p-2 rounded-xl bg-slate-900 border ${p.presence === 'away' ? 'border-red-500' : 'border-slate-800'} flex items-center gap-2 flex-wrap`}>
                <span className={`w-2 h-2 rounded-full ${p.presence === 'online' ? 'bg-emerald-400' : 'bg-red-500'}`} />
                <span className="font-semibold flex-1 min-w-[7rem]">
                  {p.full_name} {p.att === 'late' && <span className="ml-1 text-xs text-amber-400">кешікті</span>}
                </span>
                {p.away_count > 0 && <span className="text-xs text-red-400">⚠{p.away_count}× {fmt(p.away_seconds)}</span>}
                {p.hand && (
                  <button className={BTN + ' !bg-amber-600 !text-white'} onClick={async () => { await sb.rpc('cf_clear_hand', { p_session: sid, p_student: p.student_id }); refresh(); }}>✋</button>
                )}
                <button className={BTN} onClick={async () => { await sb.rpc('cf_lock', { p_session: sid, p_student: p.student_id, p_locked: !p.locked }); refresh(); }}>
                  {p.locked ? '🔓' : '🔒'}
                </button>
                <button className={BTN} onClick={async () => {
                  if (!msgInput.trim()) return alert('Хабарлама жаз');
                  await sb.rpc('cf_popup', { p_session: sid, p_student: p.student_id, p_message: msgInput.trim() });
                  alert('Жіберілді');
                }}>🔔</button>
                <button className={BTN} onClick={async () => { await sb.rpc('cf_award', { p_session: sid, p_student: p.student_id, p_group: null, p_points: 1, p_reason: 'Белсенділік' }); refresh(); }}>+1</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'subs' && (
          <div className="space-y-2">
            {!task ? (
              <p className="text-slate-500">Белсенді тапсырма жоқ</p>
            ) : (
              <>
                <p className="text-sm text-slate-400">{task.prompt}</p>
                {subs.map((s, i) => {
                  const m = s.meta && s.meta.total ? s.meta : null;
                  const ptsVal = gradingPoints[s.id] ?? (s.points ?? (m ? Math.round(task.points * m.passed / m.total) : ''));
                  return (
                    <div key={i} className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex justify-between">
                        <b>{nameOf(s.student_id)}</b>
                        <span className={s.is_correct ? 'text-emerald-400' : 'text-slate-400'}>
                          {s.points != null ? `${s.points}/${task.points}` : 'бағаланбаған'}
                        </span>
                      </div>
                      {m && <div className={m.passed === m.total ? 'text-emerald-400 text-sm' : 'text-amber-400 text-sm'}>🧪 Автотест: {m.passed}/{m.total}</div>}
                      <pre className="text-sm whitespace-pre-wrap text-slate-300 mt-1">
                        {task.kind === 'quiz' ? (task.options || [])[+s.answer] ?? s.answer : s.answer}
                      </pre>
                      {['text', 'code', 'short'].includes(task.kind) && (
                        <div className="flex gap-2 mt-2">
                          <input
                            className={`${INP} !w-16`}
                            type="number"
                            min={0}
                            max={task.points}
                            value={ptsVal}
                            onChange={e => setGradingPoints({ ...gradingPoints, [s.id]: e.target.value })}
                          />
                          <button
                            className={BTN_G}
                            onClick={async () => {
                              await sb.rpc('cf_grade', { p_sub: s.id, p_points: +ptsVal || 0, p_feedback: null });
                              refresh();
                            }}
                          >
                            Бағалау
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {tab === 'score' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: session.groups_count || 3 }, (_, i) => i + 1).map(g => {
                const pts = (groupScores.find((x: any) => x.group_no === g) || {}).points || 0;
                return (
                  <div key={g} className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex justify-between">
                      <b>Топ {g}</b>
                      <b className="text-amber-400">{pts}</b>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {[1, 3, 5].map(n => (
                        <button
                          key={n}
                          className={`${BTN} flex-1`}
                          onClick={async () => {
                            await sb.rpc('cf_award', { p_session: sid, p_student: null, p_group: g, p_points: n, p_reason: 'Топтық' });
                            refresh();
                          }}
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {lbTable(leaderboard)}
          </div>
        )}

        {tab === 'att' && (
          <div className="text-sm">
            <table className="w-full">
              <tbody>
                {attendanceRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="py-1">{r.full_name}</td>
                    <td className={r.status === 'absent' ? 'text-red-400' : r.status === 'late' ? 'text-amber-400' : 'text-emerald-400'}>
                      {{ present: 'бар', late: 'кешікті', absent: 'жоқ' }[r.status as 'present' | 'late' | 'absent'] || r.status}
                    </td>
                    <td className="text-slate-400">{r.away_count ? `⚠${r.away_count}× ${fmt(r.away_seconds)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'slides' && (
          <div className="space-y-1">
            {priv.map((s: any, i: number) => (
              <button
                key={i}
                className={`${i === session.current_slide ? BTN_P : BTN} w-full text-left`}
                onClick={() => goSlide(i)}
              >
                {i + 1}. {s.title || s.type}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-slate-950 border-t border-slate-800 p-2 flex gap-2 max-w-xl mx-auto">
        <input className={INP} placeholder="Хабарлама (қалқымалы терезе үшін)" value={msgInput} onChange={e => setMsgInput(e.target.value)} />
        <button
          className={`${BTN} !bg-red-800 !text-white whitespace-nowrap`}
          onClick={async () => {
            if (confirm('Сабақты аяқтау керек пе?')) {
              await sb.rpc('cf_end_session', { p_session: sid });
              window.location.hash = '';
            }
          }}
        >
          ⏹ Аяқтау
        </button>
      </div>
    </div>
  );
}
