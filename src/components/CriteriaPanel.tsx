import React, { useState } from 'react';
import { BTN_P } from './Widgets';
import { pick, type Lang } from '../lessons/lang';

export interface Criterion { id: string; text: string; cell: string; points?: number; fn?: string; formula?: boolean }

/** "c1:1,c2:0" (written by cf_submit for a task of kind 'sheet') -> { c1: true, c2: false } */
export const parseCriteriaResult = (fb?: string | null): Record<string, boolean> =>
  Object.fromEntries((fb || '').split(',').filter(Boolean).map(x => { const [id, v] = x.split(':'); return [id, v === '1']; }));

/** The answer sent to cf_submit: the value (and formula) of the cell each criterion points at. */
export const criteriaAnswer = (cr: Criterion[], value: (cell: string) => string, raw: (cell: string) => string) =>
  JSON.stringify(Object.fromEntries(cr.map(c => [c.id, { v: value(c.cell), f: raw(c.cell) }])));

/**
 * Student side of a practice slide with `criteria`: a checklist the sheet is graded against. "Send" reads the cells, the server (cf_submit)
 * marks every criterion and gives the points; the student sees ✓/✗ per criterion and may fix the sheet and send again until the teacher closes the task.
 */
export function CriteriaPanel({ criteria, lang, open, notOpen, closed, sub, maxPoints, onSend, live }: {
  criteria: Criterion[]; lang: Lang; open: boolean; notOpen: boolean; closed: boolean;
  sub: { points: number | null; feedback?: string | null } | null; maxPoints: number;
  onSend: () => Promise<void> | void;
  /** Current value of a cell on the student's sheet, to show next to its criterion. */
  live: (cell: string) => string;
}) {
  const [busy, setBusy] = useState(false);
  const res = parseCriteriaResult(sub?.feedback), sent = !!sub;
  const t = {
    h: pick(lang, 'Тексеру критерийлері', 'Критерии проверки', 'Marking criteria'),
    cell: pick(lang, 'ұяшық', 'ячейка', 'cell'),
    now: pick(lang, 'қазір', 'сейчас', 'now'),
    empty: pick(lang, 'бос', 'пусто', 'empty'),
    send: sent ? pick(lang, '🔄 Түзетіп қайта жіберу', '🔄 Исправить и отправить снова', '🔄 Fix and send again') : pick(lang, '📤 Жіберу және тексеру', '📤 Отправить на проверку', '📤 Submit for checking'),
    wait: pick(lang, 'Мұғалім тапсырманы ашқанда жіберуге болады. Әзірге кестені дайындай бер.', 'Отправить можно, когда учитель откроет задание. Пока готовь таблицу.', 'You can submit when the teacher opens the task. Meanwhile prepare the sheet.'),
    closed: pick(lang, '⏹ Уақыт бітті', '⏹ Время вышло', '⏹ Time is up'),
    score: pick(lang, 'Нәтиже', 'Результат', 'Result'),
    fix: pick(lang, 'Қызыл белгілі критерийді түзетіп, қайта жібер.', 'Исправь критерии с красной меткой и отправь снова.', 'Fix the criteria marked red and send again.'),
    pts: pick(lang, 'ұпай', 'балл', 'pts'),
  };
  return (
    <section data-testid="criteria-panel" aria-label={t.h} className="space-y-3 rounded-2xl border border-border bg-surface p-4 text-text">
      <div className="flex items-center gap-2"><h3 className="text-lg font-black">✅ {t.h}</h3><span className="ml-auto rounded-full bg-accent-soft px-3 py-1 text-sm font-bold text-on-accent-soft">{maxPoints} ⭐</span></div>
      <ul className="space-y-2">
        {criteria.map((c, i) => {
          const state = !sent ? 'todo' : res[c.id] ? 'ok' : 'bad', now = live(c.cell);
          return (
            <li key={c.id} data-testid={`crit-${c.id}`} data-state={state} className={`flex flex-wrap items-start gap-2 rounded-xl border p-3 ${state === 'ok' ? 'border-success bg-success-soft' : state === 'bad' ? 'border-danger bg-danger-soft' : 'border-border bg-bg'}`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface font-black" aria-hidden="true">{state === 'ok' ? '✓' : state === 'bad' ? '✗' : i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{c.text}</p>
                <p className="mt-0.5 font-mono text-xs text-text-muted">{t.cell} {c.cell} · {t.now}: <b>{now || t.empty}</b></p>
              </div>
              <span className="text-sm font-bold text-text-secondary">{c.points ?? 1} {t.pts}</span>
            </li>
          );
        })}
      </ul>
      {sent && <p data-testid="crit-score" className="text-lg font-black">{t.score}: {sub!.points ?? 0} / {maxPoints} ⭐</p>}
      {sent && sub!.points !== maxPoints && <p className="text-sm text-text-secondary">{t.fix}</p>}
      {closed ? <p className="font-bold text-danger">{t.closed}</p> : notOpen ? <p className="text-sm text-text-muted">{t.wait}</p> : (
        <button type="button" data-testid="crit-send" className={`${BTN_P} w-full !py-3 !text-base`} disabled={busy || !open} onClick={async () => { setBusy(true); try { await onSend(); } finally { setBusy(false); } }}>{t.send}</button>
      )}
    </section>
  );
}
