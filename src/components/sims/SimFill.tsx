// Copying a formula down a column (Informatics 8, lesson 3.3): every step fills one more row, the shifted formula is shown with its
// references coloured, the cells it reads are outlined, and an empty cell read as 0 is flagged. Clicking a reference cycles A1 → $A$1 → A$1 → $A1.
// w = { kind: 'fill', cells: { A1: 'x' | [kk, ru, en] }, cols: 4, rows: 7, col: 'D', from: 2, to: 5, formula: '=…', presets?: string[] }
import { useMemo, useState } from 'react';
import { pick, type Lang } from '../../lessons/lang';
import { BTN, Controls, Say, box, inp, tr, usePlayer, type Tri } from './kit';

const REF = /(\$?)([A-Z])(\$?)(\d+)/g;
const INK = ['#0284C7', '#DB2777', '#D97706', '#059669', '#7C3AED']; // readable on the dark and the light theme
const L = (i: number) => String.fromCharCode(65 + i);

/** The formula as pieces: plain text and references (with their $ flags). */
function parts(f: string) {
  const out: ({ s: string } | { c: string; r: number; dc: boolean; dr: boolean })[] = []; let at = 0;
  for (const m of f.matchAll(REF)) {
    if (m.index! > at) out.push({ s: f.slice(at, m.index) });
    out.push({ c: m[2], r: +m[4], dc: !!m[1], dr: !!m[3] }); at = m.index! + m[0].length;
  }
  if (at < f.length) out.push({ s: f.slice(at) });
  return out;
}
const show = (p: ReturnType<typeof parts>) => p.map(x => ('s' in x ? x.s : `${x.dc ? '$' : ''}${x.c}${x.dr ? '$' : ''}${x.r}`)).join('');
/** Copying k rows down: a row without $ moves by k (columns stay, the copy goes straight down). */
const shift = (p: ReturnType<typeof parts>, k: number) => p.map(x => ('s' in x ? x : { ...x, r: x.dr ? x.r : x.r + k }));

export function SimFill({ w, lang }: { w: any; lang: Lang }) {
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const cells: Record<string, Tri> = w.cells || {};
  const cols: number = w.cols || 4, rows: number = w.rows || 7, col: string = w.col || 'D', from: number = w.from || 2, to: number = w.to || 5;
  const [f, setF] = useState<string>(w.formula || '=B2*C2');
  const max = to - from + 1;
  const p = usePlayer(max, 1);
  const base = useMemo(() => parts(f.trim().startsWith('=') ? f.trim() : '=' + f.trim()), [f]);
  const num = (id: string) => { const v = cells[id]; if (Array.isArray(v)) return NaN; const s = v ?? ''; return s.trim() === '' ? null : Number(s.replace(',', '.')); };

  const rowsOut = useMemo(() => Array.from({ length: max }, (_, i) => {
    const r = from + i, q = shift(base, i), empty: string[] = [], text: string[] = [];
    let ex = '';
    for (const x of q) {
      if ('s' in x) { ex += x.s.replace(/^=/, ''); continue; }
      const id = x.c + x.r, v = num(id);
      if (v === null) { empty.push(id); ex += '0'; } else if (Number.isNaN(v)) { text.push(id); ex += 'NaN'; } else ex += `(${v})`;
    }
    let val: number | null = null;
    if (!text.length && /^[\d+\-*/().\s]*$/.test(ex) && ex.trim()) { try { const y = Function(`"use strict";return (${ex})`)(); val = Number.isFinite(y) ? Math.round(y * 100) / 100 : null; } catch { val = null; } }
    return { r, q, empty, text, val };
  }), [base, max, from, cells]);

  const cur = rowsOut[Math.max(0, p.n - 1)];
  const reads = cur ? cur.q.filter(x => !('s' in x)).map((x: any, i) => [x.c + x.r, INK[i % INK.length]] as const) : [];
  const toggle = (idx: number) => { // cycle the $ flags of the idx-th reference
    let k = -1;
    setF(show(base.map(x => { if ('s' in x) return x; k++; if (k !== idx) return x; const st = (x.dc ? 2 : 0) + (x.dr ? 1 : 0), nx = [3, 0, 1, 2][st]; return { ...x, dc: nx >= 2, dr: nx % 2 === 1 }; })));
    p.reset();
  };
  const colored = (q: ReturnType<typeof parts>, click = false) => { let k = -1; return q.map((x, i) => {
    if ('s' in x) return <span key={i}>{x.s}</span>;
    k++; const j = k, s = `${x.dc ? '$' : ''}${x.c}${x.dr ? '$' : ''}${x.r}`, c = INK[j % INK.length];
    return click ? <button key={i} type="button" onClick={() => toggle(j)} aria-label={t(`${s} сілтемесінің $ белгісін ауыстыру`, `Переключить $ в ссылке ${s}`, `Toggle the $ of ${s}`)}
      className="rounded-md border-2 px-1 font-black cursor-pointer hover:bg-slate-800" style={{ color: c, borderColor: c }}>{s}</button>
      : <b key={i} style={{ color: c }}>{s}</b>; }); };

  return (
    <div className="space-y-3">
      <div className={`${box} space-y-3`}>
        <label className="flex flex-col gap-1 text-xs text-slate-400">{t(`${col}${from} ұяшығының формуласы`, `Формула ячейки ${col}${from}`, `Formula in ${col}${from}`)}
          <input aria-label={t('Формула', 'Формула', 'Formula')} value={f} onChange={e => { setF(e.target.value.toUpperCase().replace(/[^A-Z0-9$+\-*/().=, ]/g, '')); p.reset(); }} className={`${inp} w-full max-w-md`} /></label>
        <div className="flex flex-wrap items-center gap-2 font-mono text-2xl"><span className="text-sm font-sans text-slate-400">{t('Сілтемені бас →', 'Нажми на ссылку →', 'Tap a reference →')}</span>{colored(base, true)}</div>
        {Array.isArray(w.presets) && <div className="flex flex-wrap gap-2">{w.presets.map((x: string) => (
          <button key={x} type="button" onClick={() => { setF(x); p.reset(); }} className={`${BTN} font-mono ${x === f ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>{x}</button>))}</div>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-600">
        <table className="w-full border-collapse text-center font-mono text-base">
          <thead><tr><th className="w-10 bg-slate-800" />{Array.from({ length: cols }, (_, c) => <th key={c} className="bg-slate-800 px-2 py-1 text-sm text-slate-400">{L(c)}</th>)}
            <th className="bg-slate-800 px-2 py-1 text-left text-sm text-amber-300">ƒx {col}</th></tr></thead>
          <tbody>{Array.from({ length: rows }, (_, k) => { const r = k + 1, out = rowsOut.find(o => o.r === r), on = out && out.r - from < p.n;
            return <tr key={r}>
              <td className="bg-slate-800 text-sm text-slate-400">{r}</td>
              {Array.from({ length: cols }, (_, c) => { const id = L(c) + r, hit = reads.find(x => x[0] === id), isOut = L(c) === col && !!out;
                const txt = isOut ? (on ? (out!.val ?? '#VALUE!') : '') : tr(lang, cells[id]);
                return <td key={c} className={`border border-slate-700 px-2 py-1.5 ${isOut && on ? (out!.empty.length ? 'bg-warning-soft text-slate-100' : 'bg-success-soft text-slate-100') : 'bg-slate-950 text-slate-100'} ${cur && isOut && out!.r === cur.r ? 'font-black' : ''}`}
                  style={hit ? { outline: `3px solid ${hit[1]}`, outlineOffset: -3 } : undefined}>{txt}</td>; })}
              <td className="whitespace-nowrap border border-slate-700 bg-slate-900 px-2 py-1.5 text-left text-sm">{out && on ? <>{colored(out.q)}{out.empty.length ? <span className="ml-2 text-amber-300">⚠</span> : null}</> : null}</td>
            </tr>; })}</tbody>
        </table>
      </div>

      <Controls p={p} max={max} lang={lang} />
      {cur && (cur.empty.length
        ? <Say tone="warn">{t(`${col}${cur.r}: ${show(cur.q)}. ${cur.empty.join(', ')} ұяшығы бос, кесте оны 0 деп алды — нәтиже қате. Тұрақты ұяшықты $ белгісімен бекіт.`, `${col}${cur.r}: ${show(cur.q)}. Ячейка ${cur.empty.join(', ')} пуста, таблица взяла 0 — результат неверный. Закрепи постоянную ячейку знаком $.`, `${col}${cur.r}: ${show(cur.q)}. ${cur.empty.join(', ')} is empty, the sheet read it as 0, so the result is wrong. Pin the constant cell with $.`)}</Say>
        : cur.val === null ? <Say tone="bad">{t('Формуланы есептеу мүмкін емес: мәтін немесе қате таңба бар.', 'Формулу нельзя вычислить: в ней текст или лишний знак.', 'The formula cannot be calculated: it reads text or has a stray sign.')}</Say>
        : <Say tone="ok">{t(`${col}${cur.r}: ${show(cur.q)} = ${cur.val}. ${p.n > 1 ? '$ жоқ сілтемелердің жол нөмірі бір қадам төмен жылжыды.' : 'Енді «Қадам» басып, формуланы төмен көшір.'}`, `${col}${cur.r}: ${show(cur.q)} = ${cur.val}. ${p.n > 1 ? 'В ссылках без $ номер строки сдвинулся на один вниз.' : 'Теперь нажми «Шаг» и протяни формулу вниз.'}`, `${col}${cur.r}: ${show(cur.q)} = ${cur.val}. ${p.n > 1 ? 'References without $ moved one row down.' : 'Now press “Step” to copy the formula down.'}`)}</Say>)}
    </div>
  );
}
