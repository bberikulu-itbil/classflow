import React, { useEffect, useRef } from 'react';
import { Icon, type IconName } from './Icons';
import { pick, type Lang } from '../lessons/lang';

export type Kind = 'info' | 'example' | 'practice' | 'check';

const ICON: Record<Kind, IconName> = { info: 'info', example: 'bulb', practice: 'pencil', check: 'check' };
// tint (done), border, text/icon, solid (current): the kinds also differ in lightness, not only in hue
const COL: Record<Kind, [string, string, string, string]> = {
  info: ['#E8EFFE', '#BFD0FA', '#1D4ED8', '#1D4ED8'],
  example: ['#FFF1DC', '#F3D3A0', '#9A4A06', '#B45309'],
  practice: ['#E3F4E8', '#B5DEC1', '#15803D', '#15803D'],
  check: ['#EFE9FD', '#D3C5F5', '#6D28D9', '#6D28D9'],
};
const NAME: Record<Kind, [string, string, string]> = {
  info: ['Ақпарат', 'Информация', 'Information'],
  example: ['Мысал', 'Пример', 'Example'],
  practice: ['Практика', 'Практика', 'Practice'],
  check: ['Өзіңді тексер', 'Проверь себя', 'Check yourself'],
};
const state = (k: string): Kind => (k in ICON ? (k as Kind) : 'info');

/** One icon per slide, grouped by kind. Slides not shown yet are locked (only their kind is known); shown ones open for look-back when the teacher allows it. */
export function LessonMap({ kinds, count, cur, viewing, nav, lang, onPick }: {
  kinds: string[]; count: number; cur: number; viewing: number | null; nav: boolean; lang: Lang; onPick: (i: number | null) => void;
}) {
  const shown = viewing ?? cur;
  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { activeRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest' }); }, [shown]);
  const n = Math.max(count, kinds.length, cur + 1);
  const items: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const k = state(kinds[i] ?? 'info'), [tint, bd, fg, solid] = COL[k];
    const kind = pick(lang, ...NAME[k]);
    if (i > 0 && state(kinds[i - 1] ?? 'info') !== k) items.push(<span key={`s${i}`} aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />);
    const label = `${i + 1}, ${kind}`;
    const base = 'grid shrink-0 place-items-center rounded-xl transition';
    if (i > cur) {
      items.push(
        <button key={i} type="button" disabled aria-label={`${label}: ${pick(lang, 'әлі ашылмаған', 'ещё не открыт', 'not open yet')}`} title={`${i + 1} · ${kind}`}
          className={`${base} h-10 w-10 border-[1.5px] border-dashed border-slate-400 bg-slate-100 text-slate-600`}><Icon n={ICON[k]} size={20} /></button>,
      );
    } else if (i === shown) {
      items.push(
        <button key={i} ref={activeRef} type="button" aria-current="true" aria-label={`${label}: ${pick(lang, 'қазір осы слайд', 'сейчас этот слайд', 'this slide now')}`} title={`${i + 1} · ${kind}`}
          onClick={() => viewing !== null && onPick(null)}
          className={`${base} h-11 w-11 text-white ring-2 ring-white`} style={{ background: solid, boxShadow: `0 0 0 4px ${solid}` }}><Icon n={ICON[k]} size={20} /></button>,
      );
    } else {
      const live = i === cur; // the board slide while looking back
      items.push(
        <button key={i} type="button" disabled={!nav && !live} aria-label={`${label}: ${live ? pick(lang, 'тақтадағы слайд', 'слайд на доске', 'board slide') : pick(lang, 'көрілді', 'пройден', 'seen')}`} title={`${i + 1} · ${kind}`}
          onClick={() => onPick(live ? null : i)}
          className={`${base} h-10 w-10 ${nav || live ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ background: tint, color: fg, border: `${live ? 2 : 1}px solid ${live ? solid : bd}` }}><Icon n={ICON[k]} size={20} /></button>,
      );
    }
  }
  return (
    <nav data-testid="lesson-map" aria-label={pick(lang, 'Сабақ картасы', 'Карта урока', 'Lesson map')} className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2.5 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1.5">{items}</div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-text-secondary" aria-live="polite">{shown + 1} / {n}</span>
    </nav>
  );
}
