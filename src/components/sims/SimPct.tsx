// Percent in a sheet (Informatics 7, lesson 3.4). Two questions, three steps each: the formula, the stored value, the Percent format,
// with a 10 × 10 grid that fills to the percent. A switch shows the common slip: ×100 and the Percent format together.
// w = { kind: 'pct', whole: 80, part: 25, p: 30 }
import { useState } from 'react';
import { pick, type Lang } from '../../lessons/lang';
import { BTN, Controls, Say, box, inp, usePlayer } from './kit';

const fmt = (x: number, d = 4) => String(Math.round(x * 10 ** d) / 10 ** d);

export function SimPct({ w, lang }: { w: any; lang: Lang }) {
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const [mode, setMode] = useState<'share' | 'part'>(w.mode || 'share');
  const [whole, setWhole] = useState(String(w.whole ?? 80));
  const [part, setPart] = useState(String(w.part ?? 25));
  const [pp, setPp] = useState(String(w.p ?? 30));
  const [slip, setSlip] = useState(false);
  const p = usePlayer(3);
  const W = Number(whole), P = Number(part), Q = Number(pp);
  const ok = W > 0 && Number.isFinite(W) && (mode === 'share' ? Number.isFinite(P) && P >= 0 : Number.isFinite(Q) && Q >= 0);
  const stored = !ok ? 0 : mode === 'share' ? (slip ? P / W * 100 : P / W) : W * Q / 100;
  const pct = !ok ? 0 : mode === 'share' ? stored * 100 : Q; // how much of the grid to fill
  const formula = mode === 'share' ? (slip ? '=B3/B2*100' : '=B3/B2') : `=B2*${pp || 0}%`;
  const subst = mode === 'share' ? (slip ? `${part} / ${whole} × 100` : `${part} / ${whole}`) : `${whole} × ${fmt(Q / 100)}`;
  const shown = mode === 'share' ? `${fmt(stored * 100, 2)}%` : fmt(stored, 2);
  const set = (f: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { f(e.target.value.replace(/[^0-9.]/g, '')); p.reset(); };
  const tab = (m: 'share' | 'part', label: string) => <button type="button" onClick={() => { setMode(m); setSlip(false); p.reset(); }} aria-pressed={mode === m}
    className={`${BTN} ${mode === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{label}</button>;
  const full = Math.max(0, Math.min(100, pct));

  return (
    <div className="space-y-3">
      <div className={`${box} space-y-3`}>
        <div className="flex flex-wrap gap-2">{tab('share', t('Бөлігі неше пайыз?', 'Сколько процентов часть?', 'What percent is the part?'))}{tab('part', t('Санның пайызын табу', 'Процент от числа', 'A percent of a number'))}</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-slate-400">B2 · {t('Барлығы', 'Всего', 'Whole')}<input aria-label={t('Барлығы', 'Всего', 'Whole')} value={whole} onChange={set(setWhole)} className={`${inp} w-28`} inputMode="decimal" /></label>
          {mode === 'share'
            ? <label className="flex flex-col text-xs text-slate-400">B3 · {t('Бөлігі', 'Часть', 'Part')}<input aria-label={t('Бөлігі', 'Часть', 'Part')} value={part} onChange={set(setPart)} className={`${inp} w-28`} inputMode="decimal" /></label>
            : <label className="flex flex-col text-xs text-slate-400">{t('Пайыз', 'Процент', 'Percent')}, %<input aria-label={t('Пайыз', 'Процент', 'Percent')} value={pp} onChange={set(setPp)} className={`${inp} w-24`} inputMode="decimal" /></label>}
          {mode === 'share' && <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-red-300"><input type="checkbox" checked={slip} onChange={e => { setSlip(e.target.checked); p.reset(); }} className="h-5 w-5" />
            {t('Жиі қатені көрсет (×100)', 'Показать частую ошибку (×100)', 'Show the common slip (×100)')}</label>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <ol className="space-y-2">
          {[[t('Формула', 'Формула', 'Formula'), <><span className="text-amber-300">{formula}</span> <span className="text-slate-400">→ {subst}</span></>],
            [t('Ұяшықта сақталған мән', 'Значение в ячейке', 'Value stored in the cell'), <span className="text-blue-400">{ok ? fmt(stored) : '—'}</span>],
            [mode === 'share' ? t('Percent пішімі', 'Формат Percent', 'Percent format') : t('Нәтиже', 'Результат', 'Result'), <span className={slip ? 'text-red-300' : 'text-emerald-300'}>{ok ? shown : '—'}</span>]]
            .map(([h, v], i) => <li key={i} className={`rounded-xl border px-4 py-3 transition ${p.n > i ? 'border-slate-500 bg-slate-900' : 'border-dashed border-slate-700 bg-transparent opacity-40'}`}>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{i + 1}. {h}</div>
              <div className="font-mono text-2xl font-black">{p.n > i ? v : '…'}</div></li>)}
        </ol>
        <div role="img" aria-label={t(`100 шаршының ${fmt(full, 2)}-ы боялған`, `Закрашено ${fmt(full, 2)} из 100 клеток`, `${fmt(full, 2)} of 100 squares filled`)}
          className="grid w-60 max-w-full grid-cols-10 gap-0.5 self-start rounded-xl border border-slate-600 bg-slate-950 p-2">
          {Array.from({ length: 100 }, (_, i) => { const f = p.n >= 3 ? Math.max(0, Math.min(1, full - i)) : 0;
            return <span key={i} className="aspect-square rounded-[3px] bg-slate-800" style={f ? { background: `linear-gradient(90deg, ${slip ? '#E11D48' : '#10B981'} ${f * 100}%, var(--color-surface-2) ${f * 100}%)` } : undefined} />; })}
        </div>
      </div>

      <Controls p={p} max={3} lang={lang} />
      {!ok ? <Say tone="bad">{t('Барлығы 0-ден үлкен сан болуы керек.', 'Целое должно быть числом больше 0.', 'The whole must be a number above 0.')}</Say>
        : p.n === 0 ? <Say>{t('«Қадам» бас: алдымен формула жазылады.', 'Нажми «Шаг»: сначала пишется формула.', 'Press “Step”: first the formula is written.')}</Say>
        : p.n === 1 ? <Say>{mode === 'share' ? t('Үлес = бөлігі ÷ барлығы. 100-ге көбейтудің қажеті жоқ.', 'Доля = часть ÷ целое. Умножать на 100 не нужно.', 'Share = part ÷ whole. No need to multiply by 100.') : t(`% белгісі санды 100-ге бөледі: ${pp}% = ${fmt(Q / 100)}.`, `Знак % делит число на 100: ${pp}% = ${fmt(Q / 100)}.`, `The % sign divides by 100: ${pp}% = ${fmt(Q / 100)}.`)}</Say>
        : p.n === 2 ? <Say>{mode === 'share' ? t(`Ұяшықта ${fmt(stored)} сақталады — бұл бүтіннің бөлігі.`, `В ячейке хранится ${fmt(stored)} — это доля целого.`, `The cell stores ${fmt(stored)}: a fraction of the whole.`) : t(`${whole}-дің ${pp}%-ы = ${fmt(stored, 2)}.`, `${pp}% от ${whole} = ${fmt(stored, 2)}.`, `${pp}% of ${whole} = ${fmt(stored, 2)}.`)}</Say>
        : slip ? <Say tone="bad">{t(`Қате: мән ${fmt(stored)} болды, Percent пішімі оны тағы 100-ге көбейтіп, ${shown} көрсетті. ×100 немесе Percent — біреуі ғана.`, `Ошибка: значение стало ${fmt(stored)}, формат Percent умножил его ещё на 100 и показал ${shown}. Либо ×100, либо Percent — что-то одно.`, `Slip: the value became ${fmt(stored)}, and the Percent format multiplied it by 100 again: ${shown}. Use ×100 or Percent, not both.`)}</Say>
        : <Say tone="ok">{mode === 'share' ? t(`Percent пішімі мәнді өзгертпейді, тек ${fmt(stored)} санын ${shown} етіп көрсетеді.`, `Формат Percent не меняет значение, а только показывает ${fmt(stored)} как ${shown}.`, `The Percent format keeps the value and only shows ${fmt(stored)} as ${shown}.`) : t(`100 шаршының ${pp}-ы боялды: ${whole}-дің ${pp}%-ы — ${fmt(stored, 2)}.`, `Закрашено ${pp} клеток из 100: ${pp}% от ${whole} — это ${fmt(stored, 2)}.`, `${pp} of 100 squares are filled: ${pp}% of ${whole} is ${fmt(stored, 2)}.`)}</Say>}
    </div>
  );
}
