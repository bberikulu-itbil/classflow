import React, { useEffect, useState } from 'react';
import { Eye, Languages, Maximize, Minimize } from 'lucide-react';
import { sb } from '../config';
import { tr, useLang } from '../lessons/lang';
import { spCtx, useSpoilers } from '../lessons/spoil';
import { clock, lbTable, renderSlide } from './Widgets';
import '../board/look.css';

const TaskClock = ({ task }: { task: any }) => <>{clock(task)}</>;

/** Read-only board for anyone with the link (#b/<token>); no account. Polls, because anonymous users get no realtime. */
export function PublicBoard({ token }: { token: string }) {
  const [d, setD] = useState<any>(undefined); // undefined = loading, null = bad link
  const [lang, flipLang] = useLang();
  const [full, setFull] = useState(!!document.fullscreenElement);
  const spoil = useSpoilers(d?.index ?? -1);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await sb.rpc('cf_board_public', { p_token: token });
      if (alive && !error) setD(data ?? null);
    };
    load();
    const iv = setInterval(load, 3000);
    const f = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f);
    return () => { alive = false; clearInterval(iv); document.removeEventListener('fullscreenchange', f); };
  }, [token]);

  const fullscreen = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch { /* not allowed */ } };
  const msg = (t: string) => <div data-theme="dark" className="flex min-h-screen items-center justify-center bg-bg p-6 text-center text-2xl text-text">{t}</div>;

  if (d === undefined) return msg('Жүктелуде...');
  if (d === null) return msg('Сілтеме жарамсыз. Мұғалімнен жаңасын сұраңыз.');
  if (d.ended) return msg('Сабақ аяқталды');

  const slide = tr(d.slide || {}, lang), task = d.task;
  const btn = 'flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-text shadow-lg hover:bg-surface-2';
  return (
    <div data-theme="dark" className="cf-dark relative min-h-screen bg-bg text-text">
      <main className="flex min-h-screen items-center justify-center pb-16 pt-24 lg:pt-16" style={{ paddingLeft: 32, paddingRight: 32 }}>
        <div className="flex w-full justify-center">
          {d.slide ? renderSlide(slide, { mode: 'board', lang, lb: () => lbTable(d.leaderboard), sp: spCtx(spoil) }) : <p className="text-xl text-text-secondary">Слайд жоқ</p>}
        </div>
      </main>
      <p className="fixed left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-sm text-text-secondary">
        <Eye size={14} aria-hidden="true" />Тек көру · Слайд {(d.index || 0) + 1} / {d.slide_count}
      </p>
      {task && (
        <div role="status" className={`fixed left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 text-lg font-semibold shadow-lg ${task.status === 'open' ? 'bg-success-soft text-text' : 'bg-surface-2 text-text-secondary'}`}>
          {task.status === 'open' ? <span>Тапсырды {d.subs} / {d.parts}</span> : <span>Тапсырма жабық</span>}
          <TaskClock task={task} />
        </div>
      )}
      <div className="fixed right-3 top-3 z-40 flex items-center gap-2">
        <button type="button" onClick={flipLang} aria-label="Тіл / Язык" title="Тіл / Язык" className={btn}><Languages size={20} aria-hidden="true" /><span className="sr-only">{lang === 'ru' ? 'РУС' : 'ҚАЗ'}</span></button>
        <button type="button" onClick={fullscreen} aria-label={full ? 'Толық экраннан шығу' : 'Толық экран'} title={full ? 'Толық экраннан шығу' : 'Толық экран'} className={btn}>{full ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}</button>
      </div>
    </div>
  );
}
