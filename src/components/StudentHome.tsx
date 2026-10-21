import React, { useState, useEffect } from 'react';
import { sb } from '../config';
import { TopBar } from './TopBar';
import { INP } from './Widgets';

export function StudentHome({ me, onLogout }: { me: any; onLogout: () => void }) {
  const [code, setCode] = useState('');
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const join = async (args: any) => {
    try {
      const { data, error } = await sb.rpc('cf_join', args);
      if (error) throw error;
      window.location.hash = 's/' + data.id;
    } catch (err: any) {
      alert(err.message || 'Қосылу мүмкін болмады');
    }
  };

  useEffect(() => {
    sb.rpc('cf_live_for_me').then(({ data }) => {
      if (data) setLiveSessions(data);
    });
    sb.from('cf_my_terms')
      .select('term,definition')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setTerms(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#14161A]">
      <TopBar me={me} onLogout={onLogout} />
      <main className="max-w-5xl mx-auto p-4 space-y-4 text-white">
        <h1 className="text-2xl font-bold text-black">Сәлем, {(me.full_name || '').split(' ')[0]}!</h1>
        <section className="bg-blue-600 text-white rounded-2xl p-5 space-y-3">
          <div className="text-xs font-semibold">Сабаққа қосылу</div>
          <div className="space-y-2">
            {liveSessions.map((r, i) => (
              <button
                key={i}
                className="w-full text-left bg-white/15 hover:bg-white/25 rounded-xl p-3 cursor-pointer transition"
                onClick={() => join({ p_session: r.id })}
              >
                <div className="text-xs text-[#86EFAC] font-semibold">
                  ● Сабақ жүріп жатыр {r.class_name ? ' · ' + r.class_name : ''}
                </div>
                <div className="font-bold">{r.title}</div>
                <div className="text-xs text-[#DCE6FB]">{r.teacher_name}</div>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#DCE6FB]">Сабақ коды</label>
              <input
                className="min-h-[52px] w-44 rounded-xl px-3 font-mono text-xl text-black bg-white uppercase outline-none"
                placeholder="000 000"
                maxLength={9}
                value={code}
                onChange={e => setCode(e.target.value)}
              />
            </div>
            <button
              className="min-h-[52px] px-5 rounded-xl bg-white text-blue-500 font-bold cursor-pointer hover:bg-slate-100 transition"
              onClick={() => join({ p_code: code.replace(/\s/g, '').toUpperCase() })}
            >
              Қосылу
            </button>
          </div>
          <div className="text-xs text-[#DCE6FB]">Немесе тақтадағы QR-кодты телефон камерасымен сканерле.</div>
        </section>
        <section className="bg-slate-900 rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="font-bold">Сөздігім</h2>
            <span className="text-sm text-slate-400">{terms.length} термин</span>
          </div>
          {terms.length ? (
            <div className="flex flex-wrap gap-2">
              {terms.slice(0, 20).map((r, i) => (
                <span
                  key={i}
                  className="text-sm bg-indigo-950 text-indigo-300 px-2.5 py-1.5 rounded-lg"
                  title={r.definition}
                >
                  {r.term + (r.definition ? ' — ' + r.definition : '')}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Сабақ кезінде терминді басып сөздікке қоса аласың.</p>
          )}
        </section>
      </main>
    </div>
  );
}
