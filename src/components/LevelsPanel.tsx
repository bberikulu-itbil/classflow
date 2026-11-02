import React, { useState } from 'react';
import { BTN_P, INP } from './Widgets';

export interface LvTask { id: string; level: number; variant: 'A' | 'B'; status: string; points: number; reveal?: any; opened_at: string }
export interface LvSub { task_id: string; is_correct: boolean | null; points: number | null; feedback?: string | null; answer?: string }
export interface Pair { host_id: string; partner_id: string; host_name?: string; partner_name?: string }

/** Same rule as cf_my_variant in 038_levels_pairs.sql: A or B by the student's id, A when the level has no B. */
export const myVariant = (uid: string, hasB: boolean): 'A' | 'B' => (hasB && parseInt(uid.replace(/-/g, '').slice(0, 2), 16) % 2 === 1 ? 'B' : 'A');

const L = { kk: {
  title: 'Деңгейлер', locked: 'Алдымен алдыңғы деңгейді дұрыс орында', notOpen: 'Тапсырма әлі ашылмаған', pair: 'Жұп', both: 'Екі нұсқаны да орындаңдар', partner: 'Жұбыңның экранында орындалады',
  ok: 'Дұрыс', bad: 'Қате, қайта көр', wait: 'Мұғалім тексеруде', send: 'Жіберу', ph: 'Жауабың', fromSheet: 'Кестеден жіберу', now: 'Қазір', empty: 'бос', variant: 'нұсқа', closed: 'Жабылған', right: 'Дұрыс жауап',
}, ru: {
  title: 'Уровни', locked: 'Сначала правильно выполни предыдущий уровень', notOpen: 'Задание ещё не открыто', pair: 'Пара', both: 'Выполните оба варианта', partner: 'Выполняется на экране напарника',
  ok: 'Верно', bad: 'Неверно, попробуй ещё', wait: 'Учитель проверяет', send: 'Отправить', ph: 'Твой ответ', fromSheet: 'Отправить из таблицы', now: 'Сейчас', empty: 'пусто', variant: 'вариант', closed: 'Закрыто', right: 'Правильный ответ',
} };

/**
 * Student side of a practice slide with `levels`: L1 -> L2 -> L3, a level opens only after the previous one is correct.
 * Alone a student does one variant (A or B); the host of a pair sees both and the pair must finish both.
 * The server (cf_submit) enforces the same rules, this panel only mirrors them.
 */
/** A number from the sheet goes to the server the way the answer keys spell it: at most 2 decimals. "C2,D2" is read part by part. */
export const cellAnswer = (v: string) => v.split(',').map(x => (x.trim() !== '' && !Number.isNaN(Number(x)) ? String(+Number(x).toFixed(2)) : x.trim())).join(',');

export function LevelsPanel({ slide, tasks, subs, pair, uid, lang, onSubmit, readCell }: {
  slide: any; tasks: LvTask[]; subs: LvSub[]; pair: Pair | null; uid: string; lang: 'kk' | 'ru';
  onSubmit: (taskId: string, answer: string) => Promise<void> | void;
  /** Reads the current value of a cell (or "C2,D2") from the sheet next to the panel; with it a variant that names a `cell` is answered from the sheet. */
  readCell?: (cells: string) => string;
}) {
  const t = L[lang];
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const levels: any[] = slide.levels || [];
  const send = async (id: string) => {
    if (!(draft[id] || '').trim()) return;
    setBusy(id);
    try { await onSubmit(id, draft[id].trim()); } finally { setBusy(''); }
  };
  const isPartner = !!pair && pair.partner_id === uid;
  const taskOf = (lv: number, v: string) => tasks.find(x => x.level === lv && x.variant === v);
  const subOf = (id?: string) => (id ? subs.find(s => s.task_id === id) : undefined);
  const variantsOf = (l: any, i: number): ('A' | 'B')[] => {
    const have = (l.variants || []).map((v: any) => (v.v === 'B' ? 'B' : 'A')) as ('A' | 'B')[];
    return pair ? have : [myVariant(uid, have.includes('B'))]; // both members of a pair see both variants
  };
  const lvNo = (l: any, i: number) => l.lv || i + 1;
  const done = (l: any, i: number) => variantsOf(l, i).every(v => subOf(taskOf(lvNo(l, i), v)?.id)?.is_correct === true);

  return (
    <section data-testid="levels-panel" className="w-full space-y-3">
      {pair && (
        <div data-testid="pair-banner" className="rounded-2xl border border-fuchsia-400/50 bg-fuchsia-500/10 p-3 text-fuchsia-100">
          <b>👥 {t.pair}: {pair.host_name} + {pair.partner_name}</b>
          <div className="text-sm">{isPartner ? t.partner : t.both}</div>
        </div>
      )}
      {levels.map((l, i) => {
        const no = lvNo(l, i);
        const locked = i > 0 && !done(levels[i - 1], i - 1);
        return (
          <div key={no} data-testid={`level-${no}`} data-locked={locked} className={`rounded-2xl border p-3 ${locked ? 'border-slate-700 bg-slate-900/60 opacity-70' : 'border-amber-400/40 bg-slate-900'}`}>
            <div className="flex items-center gap-2 font-black text-lg">
              <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-amber-300">L{no}</span>
              {l.title && <span>{l.title}</span>}
              <span className="ml-auto text-sm font-semibold text-slate-400">{l.points} ⭐{done(l, i) ? ' · ✓' : locked ? ' · 🔒' : ''}</span>
            </div>
            {locked ? <p className="mt-1 text-sm text-slate-400">{t.locked}</p> : (
              <div className="mt-2 space-y-3">
                {variantsOf(l, i).map(v => {
                  const task = taskOf(no, v), sub = subOf(task?.id);
                  const variant = (l.variants || []).find((x: any) => (x.v === 'B' ? 'B' : 'A') === v), prompt = variant?.prompt;
                  const cell: string | undefined = readCell && variant?.cell ? String(variant.cell) : undefined, cellNow = cell ? cellAnswer(readCell!(cell)) : '';
                  const open = task?.status === 'open', manual = sub && sub.is_correct == null;
                  return (
                    <div key={v} data-testid={`task-${no}${v}`} className="rounded-xl bg-slate-800 p-3 space-y-2">
                      {(!!pair || (l.variants || []).length > 1) && <div className="text-xs font-bold uppercase tracking-wide text-fuchsia-300">{v} {t.variant}</div>}
                      <p className="whitespace-pre-wrap">{prompt}</p>
                      {sub?.is_correct === true && <div className="font-bold text-emerald-400">✓ {t.ok}{sub.points != null ? ` · ${sub.points}/${task?.points}` : ''}</div>}
                      {sub?.is_correct === false && <div className="font-bold text-red-400">✗ {t.bad}</div>}
                      {manual && <div className="font-bold text-amber-300">⏳ {t.wait}</div>}
                      {sub?.feedback && <div className="text-sm text-slate-300">{sub.feedback}</div>}
                      {!task ? <p className="text-sm text-slate-500">{t.notOpen}</p>
                        : !open ? <p className="text-sm text-slate-400">⏹ {t.closed}{task.reveal?.answer?.accept ? ` · ${t.right}: ${task.reveal.answer.accept.join(' / ')}` : ''}</p>
                        : isPartner || sub?.is_correct === true || manual ? null : (
                          cell ? (
                            <div className="flex flex-wrap items-center gap-2" data-testid={`cell-check-${no}${v}`}>
                              <span className="rounded-lg bg-slate-950 px-2 py-1 font-mono text-sm text-emerald-300">📊 {cell} · {t.now}: <b data-testid={`cell-now-${no}${v}`}>{cellNow || t.empty}</b></span>
                              <button type="button" className={BTN_P} disabled={busy === task.id || !cellNow} onClick={async () => { setBusy(task.id); try { await onSubmit(task.id, cellNow); } finally { setBusy(''); } }}>{t.fromSheet}</button>
                            </div>
                          ) : (
                          <div className="flex gap-2">
                            <input aria-label={`L${no} ${v}`} className={INP} placeholder={t.ph} value={draft[task.id] || ''} onChange={e => setDraft({ ...draft, [task.id]: e.target.value })}
                              onKeyDown={e => { if (e.key === 'Enter') send(task.id); }} />
                            <button type="button" className={BTN_P} disabled={busy === task.id || !(draft[task.id] || '').trim()} onClick={() => send(task.id)}>{t.send}</button>
                          </div>
                          )
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
