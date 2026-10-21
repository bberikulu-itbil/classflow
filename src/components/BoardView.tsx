import React, { useState, useEffect } from 'react';
import { sb } from '../config';
import { renderSlide, spaced, fmt, lbTable, clock } from './Widgets';
import qrcode from 'qrcode-generator';

export function BoardView({ sid }: { sid: string }) {
  const [session, setSession] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [groupScores, setGroupScores] = useState<any[]>([]);
  const [task, setTask] = useState<any>(null);
  const [subsCount, setSubsCount] = useState(0);

  const refresh = async () => {
    try {
      const [sRes, curRes, pRes, lbRes, gsRes] = await Promise.all([
        sb.from('cf_sessions').select('*').eq('id', sid).single(),
        sb.rpc('cf_slide', { p_session: sid }),
        sb.from('cf_participants').select('student_id,presence').eq('session_id', sid),
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

  if (!session) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-2xl">Жүктелуде...</div>;

  const qrSvg = (() => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(location.origin + location.pathname + '#join/' + session.join_code);
      qr.make();
      return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch {
      return '';
    }
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {session.status === 'ended' ? (
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-5xl font-black">Сабақ аяқталды</h1>
        </div>
      ) : (
        <div className="flex flex-1">
          <div className="flex-1 flex items-center justify-center p-8">
            {renderSlide(currentSlide?.slide || {}, { mode: 'board', lb: () => lbTable(leaderboard) })}
          </div>
          <div className="w-80 p-4 border-l border-slate-800 space-y-4 hidden lg:block bg-slate-900">
            <div className="text-center space-y-2">
              <div
                className="mx-auto w-44 h-44 bg-white p-2 rounded-xl"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="text-xs text-slate-400">немесе кодты енгіз</div>
              <div className="text-4xl font-black tracking-widest text-blue-400 font-mono">{spaced(session.join_code)}</div>
            </div>
            <div className="text-sm text-slate-400">Қатысушы: {parts.length}</div>
            {task && (
              <div className={`p-3 rounded-xl flex justify-between items-center ${task.status === 'open' ? 'bg-emerald-900' : 'bg-slate-800'}`}>
                {task.status === 'open' ? <span>Тапсырды {subsCount} / {parts.length}</span> : <span>⏹ Тапсырма жабық</span>}
                {clock(task)}
              </div>
            )}
            <div>
              <h3 className="font-bold mb-1">👥 Топтар</h3>
              {groupScores.map((g: any, i: number) => (
                <div key={i} className="flex justify-between text-xl">
                  <span>Топ {g.group_no}</span>
                  <b className="text-amber-400">{g.points}</b>
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-bold mb-1">🏆 Үздіктер</h3>
              {lbTable(leaderboard.slice(0, 5))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
