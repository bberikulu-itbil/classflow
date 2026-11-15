import React, { useEffect, useState } from 'react';
import { stageTimes } from '../utils/stageTimes';
import { stageName } from '../lessons/stages';

const mm = (sec: number) => Math.floor(sec / 60);

/** Teacher-only: time spent in every stage of the lesson plan against the planned minutes. Never rendered for students. */
export function StageClock({ stages, slides, log, startedAt, cur }: { stages: { k: string; min: number }[]; slides: any[]; log?: { i: number; t: number }[]; startedAt?: string; cur: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(iv); }, []);
  if (!stages.length || !startedAt || !Array.isArray(log) || !slides.some(s => s?.stage)) return null;
  const of = (i: number) => slides[i]?.stage as string | undefined;
  const times = stageTimes(log, new Date(startedAt).getTime() / 1000, now / 1000, of, stages[0].k);
  let nowK = stages[0].k;
  for (let j = cur; j >= 0; j--) if (of(j)) { nowK = of(j)!; break; }
  const at = stages.findIndex(s => s.k === nowK);
  const spent = Object.values(times).reduce((a, b) => a + b, 0), total = stages.reduce((n, s) => n + s.min, 0);
  // plan up to this moment: the finished stages in full, the current one as far as it has run (not beyond its minutes)
  const planned = stages.reduce((n, s, i) => n + (i < at ? s.min * 60 : i === at ? Math.min(times[s.k] || 0, s.min * 60) : 0), 0);
  const late = mm(spent - planned);
  return (
    <div data-testid="stage-clock" className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 sm:px-5">
      <div className="flex min-w-0 flex-1 gap-1">
        {stages.map((s, i) => {
          const t = times[s.k] || 0, over = t > s.min * 60, isNow = i === at;
          return (
            <div key={s.k + i} className="min-w-0 space-y-1" style={{ flex: `${s.min} 1 0` }}>
              <div className={`flex justify-between gap-1 overflow-hidden whitespace-nowrap text-xs ${isNow ? 'font-bold text-text' : 'text-text-secondary'}`}>
                <span className="truncate">{stageName(s.k) || s.k}</span><span className="tabular-nums">{t || isNow ? `${mm(t)} / ${s.min}` : `${s.min} мин`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-surface-2" role="progressbar" aria-label={`${stageName(s.k) || s.k}: ${mm(t)} / ${s.min} мин`} aria-valuemin={0} aria-valuemax={s.min} aria-valuenow={Math.min(s.min, mm(t))}>
                <div className={`h-2 ${over ? 'bg-warning' : isNow ? 'bg-accent' : 'bg-text-muted'}`} style={{ width: `${Math.min(100, (t / (s.min * 60)) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="shrink-0 text-right leading-tight">
        <b className="block text-sm tabular-nums">{mm(spent)} / {total} мин</b>
        {late >= 1 ? <span className="text-xs font-bold text-danger">жоспардан {late} мин кеш</span> : <span className="text-xs text-text-secondary">жоспар бойынша</span>}
      </div>
    </div>
  );
}
