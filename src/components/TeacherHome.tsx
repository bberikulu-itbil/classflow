import React, { useState, useEffect } from 'react';
import { sb } from '../config';
import { TopBar } from './TopBar';
import { BTN, BTN_P, BTN_G, INP } from './Widgets';

export function TeacherHome({ me, onLogout }: { me: any; onLogout: () => void }) {
  const [lessons, setLessons] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [classSelections, setClassSelections] = useState<{ [id: string]: string }>({});
  const [groupSelections, setGroupSelections] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    Promise.all([
      sb.from('cf_lessons').select('id,title,subject,class_id').order('updated_at', { ascending: false }),
      sb.from('classes').select('id,name').order('name'),
      sb.from('cf_sessions').select('id,title,join_code').eq('teacher_id', me.id).eq('status', 'live'),
    ]).then(([lRes, cRes, sRes]) => {
      if (lRes.data) setLessons(lRes.data);
      if (cRes.data) setClasses(cRes.data);
      if (sRes.data) setLiveSessions(sRes.data);
    });
  }, [me.id]);

  const startSession = async (lessonId: string) => {
    const classId = classSelections[lessonId] || null;
    const groups = groupSelections[lessonId] || 3;
    try {
      const { data, error } = await sb.rpc('cf_start_session', {
        p_lesson: lessonId,
        p_class: classId,
        p_groups: +groups,
      });
      if (error) throw error;
      window.location.hash = 'remote/' + data.id;
    } catch (err: any) {
      alert(err.message || 'Сабақты бастау мүмкін болмады');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#14161A]">
      <TopBar
        me={me}
        onLogout={onLogout}
        right={
          <>
            <a href="#plans" className={BTN}>
              🗓 Жоспарлар
            </a>
            <button className={BTN_P} onClick={() => (window.location.hash = 'edit/new')}>
              + Жаңа сабақ
            </button>
          </>
        }
      />
      <div className="max-w-3xl mx-auto p-4 space-y-4 text-white">
        <div>
          <div className="text-sm text-slate-500">
            {new Date().toLocaleDateString('kk-KZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="text-2xl font-bold text-black">Сәлеметсіз бе, {(me.full_name || '').split(' ')[0]}</h1>
        </div>

        {liveSessions.length > 0 && (
          <div>
            <h3 className="font-bold mb-2 text-black">🟢 Жүріп жатқан сабақтар</h3>
            <div className="flex flex-wrap gap-2">
              {liveSessions.map((s, i) => (
                <a key={i} href={'#remote/' + s.id} className={`${BTN_G} inline-block`}>
                  {s.title} · {s.join_code}
                </a>
              ))}
            </div>
          </div>
        )}

        <h3 className="font-bold text-black">Сабақтарым</h3>
        <div className="space-y-2">
          {lessons.length ? (
            lessons.map(l => (
              <div key={l.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[10rem]">
                  <div className="font-bold">{l.title}</div>
                  <div className="text-xs text-slate-400">{l.subject || ''}</div>
                </div>
                <select
                  className={`${INP} !w-auto`}
                  value={classSelections[l.id] || l.class_id || ''}
                  onChange={e => setClassSelections({ ...classSelections, [l.id]: e.target.value })}
                >
                  <option value="">Сынып</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className={`${INP} !w-16`}
                  type="number"
                  min={1}
                  max={8}
                  value={groupSelections[l.id] ?? 3}
                  onChange={e => setGroupSelections({ ...groupSelections, [l.id]: +e.target.value })}
                  title="Топ саны"
                />
                <button className={BTN} onClick={() => (window.location.hash = 'edit/' + l.id)}>
                  ✏️
                </button>
                <button className={BTN_G} onClick={() => startSession(l.id)}>
                  ▶ Бастау
                </button>
              </div>
            ))
          ) : (
            <p className="text-slate-500">Әзірге сабақ жоқ — «+ Жаңа сабақ» бас.</p>
          )}
        </div>
      </div>
    </div>
  );
}
