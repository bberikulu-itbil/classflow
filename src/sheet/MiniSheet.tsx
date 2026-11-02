import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addr, colName, evaluator, fill, literal, parseAddr, shiftFormula, type Cells } from './engine';
import { formatValue, looksDate, NF_LABEL, type ChartCfg, type Doc, type Fmt, type NF } from './format';
import { ChartView } from './Chart';

export interface SheetCfg { rows?: number; cols?: number; cells?: Cells; fmt?: Record<string, Fmt>; charts?: ChartCfg[] }
/** What the lesson page can ask of the sheet: the value a cell shows (formatted, like on screen) and a text copy of the whole work. */
export interface SheetApi { get: (cells: string) => string; snapshot: () => string }
type Pos = [number, number];

const T = {
  kk: { fx: 'Формула жолы', fillD: 'Төмен толтыру', fillR: 'Оңға толтыру', reset: 'Бастапқыға қайтару', sum: 'Қосынды', avg: 'Орташа', cnt: 'Саны', undo: 'Қайтару (Ctrl+Z)', bold: 'Қалың (Ctrl+B)', ital: 'Курсив (Ctrl+I)', color: 'Мәтін түсі', bg: 'Ұяшық фоны', left: 'Солға', center: 'Ортаға', right: 'Оңға', border: 'Жиек', addRow: '+ жол', addCol: '+ баған', chart: 'Диаграмма', full: 'Толық экран', close: 'Жабу', pick: 'Диаграмма үшін 2+ ұяшық белгіле', hint: 'Ұяшықты бас да жаза бер. «=» формуланы бастайды. Сүйреп белгіле, төменгі оң бұрыштағы шаршыны сүйреп толтыр.', nf: 'Пішім' },
  ru: { fx: 'Строка формул', fillD: 'Заполнить вниз', fillR: 'Заполнить вправо', reset: 'Сбросить', sum: 'Сумма', avg: 'Среднее', cnt: 'Кол-во', undo: 'Отменить (Ctrl+Z)', bold: 'Жирный (Ctrl+B)', ital: 'Курсив (Ctrl+I)', color: 'Цвет текста', bg: 'Заливка', left: 'Влево', center: 'По центру', right: 'Вправо', border: 'Границы', addRow: '+ строка', addCol: '+ столбец', chart: 'Диаграмма', full: 'На весь экран', close: 'Закрыть', pick: 'Выделите 2+ ячеек для диаграммы', hint: 'Выберите ячейку и вводите. «=» начинает формулу. Выделяйте протяжкой, тяните квадрат в правом нижнем углу для заполнения.', nf: 'Формат' },
};
const load = (k: string): Doc | null => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } };
const save = (k: string, d: Doc) => { try { localStorage.setItem(k, JSON.stringify(d)); } catch { /* private mode: the sheet still works */ } };

const Btn = ({ t, on, children, active, disabled }: { t: string; on: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean }) =>
  <button type="button" title={t} aria-label={t} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={on}
    className={`min-w-[2rem] rounded px-2 py-1 text-sm font-semibold disabled:opacity-40 ${active ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-100 hover:bg-slate-600'}`}>{children}</button>;

/** A real small spreadsheet for lessons: free typing, formulas and functions, ranges, copy/paste with reference shifting, fill down/right and drag,
 *  text/fill colours, bold/italic, alignment, borders, number formats (%, $, scientific, date), undo, extra rows/columns and bar/line/pie charts.
 *  shortcut: no merge cells, no sorting/filters, no cross-sheet references, no click-to-insert references; saved per `storageKey` in this browser only. */
export default function MiniSheet({ cfg, storageKey, lang = 'kk', readOnly = false, apiRef, onChange, tall = false }: {
  cfg: SheetCfg; storageKey: string; lang?: 'kk' | 'ru'; readOnly?: boolean; apiRef?: React.MutableRefObject<SheetApi | null>; onChange?: () => void; tall?: boolean;
}) {
  const t = T[lang];
  const start: Doc = { cells: cfg.cells || {}, fmt: cfg.fmt || {}, charts: cfg.charts || [], rows: cfg.rows || 20, cols: cfg.cols || 10 };
  const [doc, setDoc] = useState<Doc>(() => (readOnly ? null : load(storageKey)) || start);
  const { cells, fmt, charts, rows: R, cols: C } = doc;
  const [a, setA] = useState<Pos>([0, 0]); // active cell
  const [e, setE] = useState<Pos>([0, 0]); // other corner of the selection
  const [edit, setEdit] = useState<string | null>(null);
  const [bar, setBar] = useState(false); // the edit happens in the formula bar, not in the cell
  const [full, setFull] = useState(false);
  const [msg, setMsg] = useState('');
  const hist = useRef<Doc[]>([]);
  const clip = useRef<{ cells: Cells; fmt: Record<string, Fmt>; r0: number; c0: number; h: number; w: number } | null>(null);
  const drag = useRef<'sel' | 'fill' | null>(null);
  const src = useRef<Pos>([0, 0]), srcEnd = useRef<Pos>([0, 0]);
  const box = useRef<HTMLDivElement>(null);
  const get = useMemo(() => evaluator(cells), [cells]);
  const show = (id: string) => formatValue(get(id), fmt[id]?.nf);
  const [r0, r1, c0, c1] = [Math.min(a[0], e[0]), Math.max(a[0], e[0]), Math.min(a[1], e[1]), Math.max(a[1], e[1])];
  const selected = (fn: (id: string) => void) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) fn(addr(r, c)); };

  const commit = (next: Doc) => { hist.current = [...hist.current.slice(-49), doc]; setDoc(next); if (!readOnly) save(storageKey, next); };
  const undo = () => { const p = hist.current.pop(); if (p) { setDoc(p); save(storageKey, p); } };
  const put = (at: string, raw: string) => {
    if (readOnly) return; const n = { ...cells }, f = { ...fmt };
    if (raw === '') delete n[at]; else n[at] = raw;
    if (looksDate(raw) && !f[at]?.nf) f[at] = { ...f[at], nf: 'date' }; // like Google Sheets: a typed date becomes a Date cell
    commit({ ...doc, cells: n, fmt: f });
  };
  const style = (patch: Partial<Fmt> | ((f: Fmt) => Partial<Fmt>)) => { if (readOnly) return; const f = { ...fmt }; selected(id => { const cur = f[id] || {}; f[id] = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) }; }); commit({ ...doc, fmt: f }); };
  const clamp = (r: number, c: number): Pos => [Math.max(0, Math.min(R - 1, r)), Math.max(0, Math.min(C - 1, c))];
  const move = (dr: number, dc: number, extend = false) => { const p = clamp((extend ? e : a)[0] + dr, (extend ? e : a)[1] + dc); if (!extend) setA(p); setE(p); };
  const finish = (dr: number, dc: number) => { if (edit !== null) put(addr(...a), edit); setEdit(null); move(dr, dc); box.current?.focus(); };

  useEffect(() => { // the lesson page reads answers and a copy of the work from here
    if (!apiRef) return;
    apiRef.current = {
      get: list => list.split(',').map(x => (x.trim() ? show(x.trim().toUpperCase()) : '')).join(','),
      snapshot: () => Object.keys(cells).sort((x, y) => (parseAddr(x)![0] - parseAddr(y)![0]) || (parseAddr(x)![1] - parseAddr(y)![1])).map(k => `${k}\t${cells[k]}${cells[k].startsWith('=') ? `\t→ ${show(k)}` : ''}`).join('\n') + (charts.length ? '\n' + charts.map(c => `chart\t${c.type}\t${c.range}`).join('\n') : ''),
    };
    return () => { if (apiRef.current) apiRef.current = null; };
  });
  useEffect(() => { onChange?.(); }, [doc]); // after the effect above: the page that re-renders on this reads the fresh sheet

  const copy = () => {
    const sub: Cells = {}, sf: Record<string, Fmt> = {}; selected(id => { if (cells[id]) sub[id] = cells[id]; if (fmt[id]) sf[id] = fmt[id]; });
    clip.current = { cells: sub, fmt: sf, r0, c0, h: r1 - r0 + 1, w: c1 - c0 + 1 };
    try { navigator.clipboard?.writeText(Array.from({ length: r1 - r0 + 1 }, (_, i) => Array.from({ length: c1 - c0 + 1 }, (_, j) => show(addr(r0 + i, c0 + j))).join('\t')).join('\n')).catch(() => {}); } catch { /* clipboard blocked */ }
  };
  const paste = () => {
    const k = clip.current; if (!k || readOnly) return; const n = { ...cells }, f = { ...fmt };
    for (let i = 0; i < k.h; i++) for (let j = 0; j < k.w; j++) {
      const to = clamp(a[0] + i, a[1] + j); if (to[0] !== a[0] + i || to[1] !== a[1] + j) continue;
      const from = addr(k.r0 + i, k.c0 + j), at = addr(...to);
      if (k.cells[from]) n[at] = shiftFormula(k.cells[from], a[0] - k.r0, a[1] - k.c0); else delete n[at];
      if (k.fmt[from]) f[at] = k.fmt[from]; else delete f[at];
    }
    commit({ ...doc, cells: n, fmt: f }); setE(clamp(a[0] + k.h - 1, a[1] + k.w - 1));
  };
  const fillDown = () => { if (!readOnly && r1 > r0) commit({ ...doc, cells: fill(cells, r0, c0, r0, c1, r1, c1) }); };
  const fillRight = () => { if (!readOnly && c1 > c0) commit({ ...doc, cells: fill(cells, r0, c0, r1, c0, r1, c1) }); };
  const addChart = (type: ChartCfg['type']) => {
    if (r1 === r0 && c1 === c0) { setMsg(t.pick); setTimeout(() => setMsg(''), 2500); return; }
    commit({ ...doc, charts: [...charts, { id: String(Date.now()), type, range: `${addr(r0, c0)}:${addr(r1, c1)}` }] });
  };

  const onKey = (ev: React.KeyboardEvent) => {
    if (edit !== null) return;
    const k = ev.key, ctrl = ev.ctrlKey || ev.metaKey, kl = k.toLowerCase();
    if (ctrl && kl === 'c') { copy(); ev.preventDefault(); }
    else if (ctrl && kl === 'v') { paste(); ev.preventDefault(); }
    else if (ctrl && kl === 'd') { fillDown(); ev.preventDefault(); }
    else if (ctrl && kl === 'r') { fillRight(); ev.preventDefault(); }
    else if (ctrl && kl === 'z') { undo(); ev.preventDefault(); }
    else if (ctrl && kl === 'b') { style(f => ({ b: f.b ? undefined : 1 })); ev.preventDefault(); }
    else if (ctrl && kl === 'i') { style(f => ({ i: f.i ? undefined : 1 })); ev.preventDefault(); }
    else if (ctrl && kl === 'a') { setA([0, 0]); setE([R - 1, C - 1]); ev.preventDefault(); }
    else if (k === 'ArrowDown') { move(1, 0, ev.shiftKey); ev.preventDefault(); }
    else if (k === 'ArrowUp') { move(-1, 0, ev.shiftKey); ev.preventDefault(); }
    else if (k === 'ArrowLeft') { move(0, -1, ev.shiftKey); ev.preventDefault(); }
    else if (k === 'ArrowRight') { move(0, 1, ev.shiftKey); ev.preventDefault(); }
    else if (k === 'Tab') { move(0, ev.shiftKey ? -1 : 1); ev.preventDefault(); }
    else if (k === 'Enter') { move(1, 0); ev.preventDefault(); }
    else if (k === 'F2' && !readOnly) { setBar(false); setEdit(cells[addr(...a)] || ''); ev.preventDefault(); }
    else if ((k === 'Delete' || k === 'Backspace') && !readOnly) { const n = { ...cells }; selected(id => { delete n[id]; }); commit({ ...doc, cells: n }); ev.preventDefault(); }
    else if (k.length === 1 && !ctrl && !ev.altKey && !readOnly) { setBar(false); setEdit(k); ev.preventDefault(); }
  };

  const cellAt = (ev: { clientX: number; clientY: number }): Pos | null => {
    const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-cell]') as HTMLElement | null;
    return el ? (parseAddr(el.dataset.cell!) as Pos) : null;
  };
  const onMove = (ev: React.PointerEvent) => {
    if (!drag.current) return; const p = cellAt(ev); if (!p) return;
    if (drag.current === 'sel') setE(p);
    else setE(Math.abs(p[0] - srcEnd.current[0]) >= Math.abs(p[1] - srcEnd.current[1]) ? [Math.max(p[0], srcEnd.current[0]), srcEnd.current[1]] : [srcEnd.current[0], Math.max(p[1], srcEnd.current[1])]); // fill handle: down or right only
  };
  const onUp = () => {
    if (drag.current === 'fill') {
      const [sr, sc] = src.current, [er, ec] = srcEnd.current;
      if (e[0] > er) commit({ ...doc, cells: fill(cells, sr, sc, er, ec, e[0], ec) });
      else if (e[1] > ec) commit({ ...doc, cells: fill(cells, sr, sc, er, ec, er, e[1]) });
    }
    drag.current = null;
  };

  const nums: number[] = []; selected(id => { const v = literal(get(id)); if (typeof v === 'number' && get(id) !== '') nums.push(v); });
  const sum = nums.reduce((x, y) => x + y, 0), multi = r1 > r0 || c1 > c0;
  const fx = edit ?? (cells[addr(...a)] || '');
  const af = fmt[addr(...a)] || {};

  return (
    <div data-testid="minisheet" className={`rounded-2xl border border-emerald-400/40 bg-slate-900 p-2 text-sm text-slate-100 ${full ? 'fixed inset-0 z-50 flex flex-col overflow-auto rounded-none' : ''}`} onPointerMove={onMove} onPointerUp={onUp}>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 pb-2" data-testid="sheet-toolbar">
          <Btn t={t.undo} on={undo}>↶</Btn>
          <Btn t={t.bold} on={() => style(f => ({ b: f.b ? undefined : 1 }))} active={!!af.b}><b>B</b></Btn>
          <Btn t={t.ital} on={() => style(f => ({ i: f.i ? undefined : 1 }))} active={!!af.i}><i>I</i></Btn>
          <label title={t.color} className="flex cursor-pointer items-center gap-1 rounded bg-slate-700 px-2 py-1 hover:bg-slate-600"><span className="font-bold" style={{ color: af.c || '#fff', textDecoration: 'underline' }}>A</span>
            <input type="color" aria-label={t.color} className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" value={af.c || '#ffffff'} onChange={ev => style({ c: ev.target.value })} /></label>
          <label title={t.bg} className="flex cursor-pointer items-center gap-1 rounded bg-slate-700 px-2 py-1 hover:bg-slate-600"><span>🎨</span>
            <input type="color" aria-label={t.bg} className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" value={af.bg || '#0f172a'} onChange={ev => style({ bg: ev.target.value })} /></label>
          <Btn t={t.left} on={() => style({ al: 'l' })} active={af.al === 'l'}>⇤</Btn><Btn t={t.center} on={() => style({ al: 'c' })} active={af.al === 'c'}>↔</Btn><Btn t={t.right} on={() => style({ al: 'r' })} active={af.al === 'r'}>⇥</Btn>
          <Btn t={t.border} on={() => style(f => ({ bd: f.bd ? undefined : 1 }))} active={!!af.bd}>▦</Btn>
          <select aria-label={t.nf} title={t.nf} className="rounded bg-slate-700 px-1 py-1" value={af.nf || 'gen'} onChange={ev => style({ nf: ev.target.value === 'gen' ? undefined : (ev.target.value as NF) })}>
            {Object.entries(NF_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="mx-1 h-5 w-px bg-slate-600" />
          <Btn t={t.fillD} on={fillDown} disabled={r1 === r0}>↓</Btn><Btn t={t.fillR} on={fillRight} disabled={c1 === c0}>→</Btn>
          <Btn t={t.addRow} on={() => commit({ ...doc, rows: R + 5 })}>{t.addRow}</Btn><Btn t={t.addCol} on={() => commit({ ...doc, cols: Math.min(26, C + 2) })}>{t.addCol}</Btn>
          <span className="mx-1 h-5 w-px bg-slate-600" />
          <Btn t={`${t.chart}: bar`} on={() => addChart('bar')}>📊</Btn><Btn t={`${t.chart}: line`} on={() => addChart('line')}>📈</Btn><Btn t={`${t.chart}: pie`} on={() => addChart('pie')}>🥧</Btn>
          <Btn t={full ? t.close : t.full} on={() => setFull(!full)} active={full}>{full ? '✕' : '⛶'}</Btn>
          <Btn t={t.reset} on={() => { hist.current = []; commit(start); }}>⟲</Btn>
          {msg && <span className="text-amber-300">{msg}</span>}
        </div>
      )}
      <div className="flex items-center gap-2 pb-2">
        <span className="rounded bg-slate-800 px-2 py-1 font-mono font-bold text-emerald-300" data-testid="sheet-name">{multi ? `${addr(r0, c0)}:${addr(r1, c1)}` : addr(...a)}</span>
        <span className="font-mono text-slate-400">fx</span>
        <input data-testid="sheet-fx" aria-label={t.fx} className="min-w-[8rem] flex-1 rounded bg-slate-800 px-2 py-1 font-mono outline-none ring-1 ring-slate-600 focus:ring-emerald-400" value={fx} readOnly={readOnly}
          onFocus={() => { if (!readOnly && edit === null) { setBar(true); setEdit(cells[addr(...a)] || ''); } }} onChange={ev => setEdit(ev.target.value)}
          onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); finish(1, 0); } else if (ev.key === 'Escape') { setEdit(null); box.current?.focus(); } }} />
      </div>
      <div ref={box} tabIndex={0} onKeyDown={onKey} className={`${full ? 'min-h-0 flex-1' : tall ? 'max-h-[34rem]' : 'max-h-[24rem]'} overflow-auto rounded outline-none focus:ring-2 focus:ring-emerald-400/60`} style={{ touchAction: 'none' }}>
        <table className="border-collapse select-none font-mono" style={{ minWidth: '100%' }}>
          <thead><tr><th className="sticky left-0 top-0 z-20 w-8 bg-slate-800" />{Array.from({ length: C }, (_, c) => <th key={c} className={`sticky top-0 z-10 min-w-[5.5rem] border border-slate-700 bg-slate-800 px-2 py-0.5 ${c >= c0 && c <= c1 ? 'text-emerald-300' : 'text-slate-400'}`}>{colName(c)}</th>)}</tr></thead>
          <tbody>{Array.from({ length: R }, (_, r) => (
            <tr key={r}>
              <th className={`sticky left-0 z-10 border border-slate-700 bg-slate-800 px-2 ${r >= r0 && r <= r1 ? 'text-emerald-300' : 'text-slate-400'}`}>{r + 1}</th>
              {Array.from({ length: C }, (_, c) => {
                const id = addr(r, c), inSel = r >= r0 && r <= r1 && c >= c0 && c <= c1, active = r === a[0] && c === a[1], f = fmt[id] || {}, shown = show(id);
                const isNum = shown !== '' && !Number.isNaN(Number(shown.replace(/[$%,]/g, '')));
                return (
                  <td key={c} data-cell={id} data-testid={`cell-${id}`} data-value={shown}
                    onPointerDown={ev => { if (edit !== null) put(addr(...a), edit); setEdit(null); drag.current = 'sel'; setA([r, c]); setE([r, c]); box.current?.focus(); ev.preventDefault(); }}
                    onDoubleClick={() => { if (!readOnly) { setBar(false); setEdit(cells[id] || ''); } }}
                    style={{ color: f.c, background: inSel ? undefined : f.bg, fontWeight: f.b ? 700 : undefined, fontStyle: f.i ? 'italic' : undefined, textAlign: f.al === 'l' ? 'left' : f.al === 'c' ? 'center' : f.al === 'r' ? 'right' : undefined, borderColor: f.bd ? '#e2e8f0' : undefined, borderWidth: f.bd ? 2 : undefined }}
                    className={`relative h-7 whitespace-nowrap border px-2 ${inSel ? 'border-emerald-400/60 bg-emerald-500/15' : 'border-slate-700'} ${active ? 'outline outline-2 outline-emerald-400' : ''} ${!f.al && isNum ? 'text-right' : shown.startsWith('#') ? 'text-red-400' : ''}`}>
                    {active && edit !== null && !bar
                      ? <input autoFocus className="absolute inset-0 w-full bg-slate-950 px-2 font-mono text-white outline-none" value={edit} onChange={ev => setEdit(ev.target.value)} data-testid="cell-editor"
                          onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); finish(1, 0); } else if (ev.key === 'Tab') { ev.preventDefault(); ev.stopPropagation(); finish(0, 1); } else if (ev.key === 'Escape') { setEdit(null); box.current?.focus(); } }} />
                      : shown}
                    {!readOnly && r === r1 && c === c1 && edit === null && (
                      <span data-testid="fill-handle" className="absolute -bottom-1 -right-1 z-10 h-2.5 w-2.5 cursor-crosshair bg-emerald-400"
                        onPointerDown={ev => { ev.stopPropagation(); ev.preventDefault(); drag.current = 'fill'; src.current = [r0, c0]; srcEnd.current = [r1, c1]; setA([r0, c0]); setE([r1, c1]); }} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 pt-1 text-xs text-slate-400">
        <span className="min-w-0 flex-1">{t.hint}</span>
        {multi && nums.length > 0 && <span data-testid="sheet-status" className="font-bold text-emerald-300">{t.sum}: {+sum.toPrecision(12)} · {t.avg}: {+(sum / nums.length).toFixed(4)} · {t.cnt}: {nums.length}</span>}
      </div>
      {charts.length > 0 && <div className="mt-2 grid gap-2 sm:grid-cols-2">{charts.map(ch => <ChartView key={ch.id} cfg={ch} get={get} onDelete={readOnly ? undefined : () => commit({ ...doc, charts: charts.filter(x => x.id !== ch.id) })} />)}</div>}
    </div>
  );
}
