// Shared pieces of the step-by-step simulations: a player (step / play / pause / reset) and the dark panel styles of LabWidgets.
import { useEffect, useState } from 'react';
import { pick, type Lang } from '../../lessons/lang';

export const box = 'rounded-2xl border border-slate-600 bg-slate-900 p-4';
export const inp = 'h-11 rounded-xl border border-slate-500 bg-slate-950 px-3 font-mono text-lg text-slate-100';
export const BTN = 'min-h-[40px] rounded-xl px-3 text-sm font-semibold cursor-pointer transition';
export type Tri = string | [string, string, string];
export const tr = (lang: Lang, v: Tri | undefined) => (v == null ? '' : typeof v === 'string' ? v : pick(lang, v[0], v[1], v[2]));

/** Step counter 0..max with autoplay. `reset` goes back to `start`. */
export function usePlayer(max: number, start = 0, ms = 1300) {
  const [n, setN] = useState(start);
  const [on, setOn] = useState(false);
  useEffect(() => { if (n > max) setN(max); }, [max, n]);
  useEffect(() => {
    if (!on) return;
    if (n >= max) { setOn(false); return; }
    const id = setTimeout(() => setN(x => Math.min(max, x + 1)), ms);
    return () => clearTimeout(id);
  }, [on, n, max, ms]);
  return { n, on, set: (v: number) => { setOn(false); setN(Math.max(start, Math.min(max, v))); }, step: () => setN(x => Math.min(max, x + 1)), toggle: () => { if (n >= max) setN(start); setOn(o => !o); }, reset: () => { setOn(false); setN(start); } };
}

export function Controls({ p, max, lang, label }: { p: ReturnType<typeof usePlayer>; max: number; lang: Lang; label?: string }) {
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={p.step} disabled={p.n >= max} aria-label={t('Келесі қадам', 'Следующий шаг', 'Next step')}
        className={`${BTN} bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40`}>⏭ {t('Қадам', 'Шаг', 'Step')}</button>
      <button type="button" onClick={p.toggle} aria-label={p.on ? t('Тоқтату', 'Пауза', 'Pause') : t('Ойнату', 'Пуск', 'Play')}
        className={`${BTN} bg-slate-700 text-slate-100 hover:bg-slate-600`}>{p.on ? `⏸ ${t('Тоқтату', 'Пауза', 'Pause')}` : `▶ ${t('Ойнату', 'Пуск', 'Play')}`}</button>
      <button type="button" onClick={p.reset} aria-label={t('Басынан', 'Сначала', 'Reset')} className={`${BTN} bg-slate-800 text-slate-300 hover:bg-slate-700`}>↺ {t('Басынан', 'Сначала', 'Reset')}</button>
      <span className="ml-auto text-sm font-semibold text-slate-400" aria-live="polite">{label ?? `${t('Қадам', 'Шаг', 'Step')} ${p.n} / ${max}`}</span>
    </div>
  );
}

/** One sentence that says what the current step changed. */
export const Say = ({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'warn' | 'bad'; children: React.ReactNode }) => {
  const c = { info: 'border-blue-400 bg-info-soft text-slate-100', ok: 'border-emerald-400 bg-success-soft text-slate-100', warn: 'border-amber-400 bg-warning-soft text-slate-100', bad: 'border-red-400 bg-danger-soft text-slate-100' }[tone];
  return <p role="status" className={`rounded-xl border px-4 py-3 text-base ${c}`}>{children}</p>;
};
