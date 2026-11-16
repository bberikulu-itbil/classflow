import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addr, cellsOf, colIndex, colName, evaluator, fill, literal, matches, parseAddr, shiftFormula, type Cells } from './engine';
import { formatValue, looksDate, NF_LABEL, scaleColor, type ChartCfg, type CondOp, type CondRule, type Doc, type Fmt, type NF } from './format';
import { ChartView } from './Chart';
import { AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowRightToLine, BarChart3, Baseline, Bold, Columns3, Grid3x3, Italic, LineChart, Maximize2, Minimize2, PaintBucket, PieChart, Plus, RotateCcw, Rows3, Undo2, TableCellsMerge, TextWrap, ArrowUpNarrowWide, ArrowDownWideNarrow, Funnel, FunnelX, Highlighter, X } from 'lucide-react';

export interface SheetCfg { rows?: number; cols?: number; cells?: Cells; fmt?: Record<string, Fmt>; charts?: ChartCfg[]; rules?: CondRule[]; merges?: string[] }
/** What a criterion may check besides the value: painted by a conditional rule, row hidden by the filter, merged, wrapped, bold, any fill. */
export type Look = 'rule' | 'hidden' | 'merged' | 'wrap' | 'bold' | 'fill';
/** What the lesson page can ask of the sheet: the value a cell shows (formatted, like on screen) and a text copy of the whole work. */
export interface SheetApi { get: (cells: string) => string; raw: (cell: string) => string; snapshot: () => string; /** '1' or '0' */ look: (cell: string, kind: Look) => string }
type Pos = [number, number];

const T = {
  kk: { fx: 'Формула жолы', fillD: 'Төмен толтыру', fillR: 'Оңға толтыру', reset: 'Бастапқыға қайтару', sum: 'Қосынды', avg: 'Орташа', cnt: 'Саны', undo: 'Қайтару (Ctrl+Z)', bold: 'Қалың (Ctrl+B)', ital: 'Курсив (Ctrl+I)', color: 'Мәтін түсі', bg: 'Ұяшық фоны', left: 'Солға', center: 'Ортаға', right: 'Оңға', border: 'Жиек', addRow: '+ жол', addCol: '+ баған', chart: 'Диаграмма', full: 'Толық экран', close: 'Жабу', pick: 'Диаграмма үшін 2+ ұяшық белгіле', hint: 'Ұяшықты бас да жаза бер. «=» формуланы бастайды. Сүйреп белгіле, төменгі оң бұрыштағы шаршыны сүйреп толтыр.', nf: 'Пішім', merge: 'Ұяшықтарды біріктіру / ажырату', wrap: 'Мәтінді тасымалдау', asc: 'Сұрыптау: өсу ретімен (белсенді баған бойынша)', desc: 'Сұрыптау: кему ретімен', sortPick: 'Сұрыптау үшін тақырыпсыз деректер жолдарын белгіле', cond: 'Шартты пішімдеу', filter: 'Сүзгі', filterPick: 'Сүзгі үшін тақырып жолымен бірге кестені белгіле', range: 'Аралық', add: 'Қосу', apply: 'Қолдану', off: 'Сүзгіні алу', scale: 'Түс шкаласы', value: 'мәні', col: 'Баған', del: 'Өшіру', hidden: 'жол жасырылды' },
  ru: { fx: 'Строка формул', fillD: 'Заполнить вниз', fillR: 'Заполнить вправо', reset: 'Сбросить', sum: 'Сумма', avg: 'Среднее', cnt: 'Кол-во', undo: 'Отменить (Ctrl+Z)', bold: 'Жирный (Ctrl+B)', ital: 'Курсив (Ctrl+I)', color: 'Цвет текста', bg: 'Заливка', left: 'Влево', center: 'По центру', right: 'Вправо', border: 'Границы', addRow: '+ строка', addCol: '+ столбец', chart: 'Диаграмма', full: 'На весь экран', close: 'Закрыть', pick: 'Выделите 2+ ячеек для диаграммы', hint: 'Выберите ячейку и вводите. «=» начинает формулу. Выделяйте протяжкой, тяните квадрат в правом нижнем углу для заполнения.', nf: 'Формат', merge: 'Объединить / разъединить ячейки', wrap: 'Перенос текста', asc: 'Сортировка по возрастанию (по активному столбцу)', desc: 'Сортировка по убыванию', sortPick: 'Для сортировки выделите строки данных без заголовка', cond: 'Условное форматирование', filter: 'Фильтр', filterPick: 'Для фильтра выделите таблицу вместе со строкой заголовков', range: 'Диапазон', add: 'Добавить', apply: 'Применить', off: 'Снять фильтр', scale: 'Цветовая шкала', value: 'значение', col: 'Столбец', del: 'Удалить', hidden: 'строк скрыто' },
  en: { fx: 'Formula bar', fillD: 'Fill down', fillR: 'Fill right', reset: 'Reset', sum: 'Sum', avg: 'Average', cnt: 'Count', undo: 'Undo (Ctrl+Z)', bold: 'Bold (Ctrl+B)', ital: 'Italic (Ctrl+I)', color: 'Text colour', bg: 'Fill colour', left: 'Left', center: 'Centre', right: 'Right', border: 'Borders', addRow: '+ row', addCol: '+ column', chart: 'Chart', full: 'Full screen', close: 'Close', pick: 'Select 2+ cells for a chart', hint: 'Click a cell and type. "=" starts a formula. Drag to select; drag the square in the bottom-right corner to fill.', nf: 'Format', merge: 'Merge / unmerge cells', wrap: 'Wrap text', asc: 'Sort ascending (by the active column)', desc: 'Sort descending', sortPick: 'To sort, select the data rows without the header', cond: 'Conditional formatting', filter: 'Filter', filterPick: 'To filter, select the table together with its header row', range: 'Range', add: 'Add', apply: 'Apply', off: 'Remove filter', scale: 'Colour scale', value: 'value', col: 'Column', del: 'Delete', hidden: 'rows hidden' },
};
const OPS: CondOp[] = ['<', '>', '<=', '>=', '=', '<>', 'scale'];
const load = (k: string): Doc | null => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } };
const save = (k: string, d: Doc) => { try { localStorage.setItem(k, JSON.stringify(d)); } catch { /* private mode: the sheet still works */ } };

const Btn = ({ t, on, children, active, disabled }: { t: string; on: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean }) =>
  <button type="button" title={t} aria-label={t} aria-pressed={active} disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={on}
    className={`inline-flex h-8 min-w-[2rem] items-center justify-center gap-0.5 rounded-lg px-1.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-35 ${active ? 'bg-emerald-600 text-white shadow-inner' : 'text-slate-200 hover:bg-slate-700'}`}>{children}</button>;
/** A group of tools on one rounded strip. */
const Group = ({ children }: { children: React.ReactNode }) => <div className="flex items-center gap-0.5 rounded-xl bg-slate-800 p-1 ring-1 ring-slate-700">{children}</div>;
const IC = 17; // icon size
/** Colour tool: an icon with the chosen colour under it; the real colour input covers the whole button. */
const Swatch = ({ t, icon, value, empty, on }: { t: string; icon: React.ReactNode; value?: string; empty: string; on: (v: string) => void }) =>
  <label title={t} className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-200 transition-colors hover:bg-slate-700 focus-within:outline focus-within:outline-2 focus-within:outline-emerald-400">
    {icon}<span aria-hidden="true" className="absolute bottom-1 h-1 w-4 rounded-full ring-1 ring-slate-500" style={{ background: value || empty }} />
    <input type="color" aria-label={t} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={value || empty} onChange={ev => on(ev.target.value)} />
  </label>;

/** A real small spreadsheet for lessons: free typing, formulas and functions, ranges, copy/paste with reference shifting, fill down/right and drag,
 *  text/fill colours, bold/italic, alignment, borders, number formats (%, $, scientific, date), undo, extra rows/columns and bar/line/pie charts.
 *  merged cells, wrap text, sorting, one condition filter and conditional formatting (rules and a colour scale).
 *  shortcut: no cross-sheet references, no click-to-insert references; saved per `storageKey` in this browser only. */
export default function MiniSheet({ cfg, storageKey, lang = 'kk', readOnly = false, apiRef, onChange, tall = false }: {
  cfg: SheetCfg; storageKey: string; lang?: 'kk' | 'ru' | 'en'; readOnly?: boolean; apiRef?: React.MutableRefObject<SheetApi | null>; onChange?: () => void; tall?: boolean;
}) {
  const t = T[lang];
  const start: Doc = { cells: cfg.cells || {}, fmt: cfg.fmt || {}, charts: cfg.charts || [], rows: cfg.rows || 20, cols: cfg.cols || 10, rules: cfg.rules || [], merges: cfg.merges || [], filter: null };
  const [doc, setDoc] = useState<Doc>(() => (readOnly ? null : load(storageKey)) || start);
  const { cells, fmt, charts, rows: R, cols: C } = doc, rules = doc.rules || [], merges = doc.merges || [];
  const [a, setA] = useState<Pos>([0, 0]); // active cell
  const [e, setE] = useState<Pos>([0, 0]); // other corner of the selection
  const [edit, setEdit] = useState<string | null>(null);
  const [bar, setBar] = useState(false); // the edit happens in the formula bar, not in the cell
  const [full, setFull] = useState(false);
  const [msg, setMsg] = useState('');
  const [panel, setPanel] = useState<'cond' | 'filter' | null>(null);
  const [rop, setRop] = useState<CondOp>('<'), [rv, setRv] = useState(''), [rbg, setRbg] = useState('#f87171');
  const hist = useRef<Doc[]>([]);
  const clip = useRef<{ cells: Cells; fmt: Record<string, Fmt>; r0: number; c0: number; h: number; w: number } | null>(null);
  const drag = useRef<'sel' | 'fill' | null>(null);
  const src = useRef<Pos>([0, 0]), srcEnd = useRef<Pos>([0, 0]);
  const box = useRef<HTMLDivElement>(null);
  const get = useMemo(() => evaluator(cells), [cells]);
  const show = (id: string) => formatValue(get(id), fmt[id]?.nf);
  const ruleBg = useMemo(() => { // later rules win, like the order in Google Sheets' list
    const out = new Map<string, string>();
    for (const rl of rules) {
      const ids = cellsOf(rl.range);
      if (rl.op === 'scale') {
        const ns = ids.map(id => [id, literal(get(id))] as const).filter((x): x is readonly [string, number] => typeof x[1] === 'number' && get(x[0]) !== '');
        const lo = Math.min(...ns.map(x => x[1])), hi = Math.max(...ns.map(x => x[1]));
        ns.forEach(([id, v]) => out.set(id, scaleColor(hi > lo ? (v - lo) / (hi - lo) : 1)));
      } else ids.forEach(id => { const g = get(id); if (g !== '' && matches(literal(g), rl.op + rl.v)) out.set(id, rl.bg); });
    }
    return out;
  }, [rules, get]);
  const hiddenRows = useMemo(() => {
    const out = new Set<number>(), fl = doc.filter; if (!fl) return out;
    const [x, y = x] = fl.range.split(':'), p = parseAddr(x), q = parseAddr(y), col = colIndex(fl.col); if (!p || !q) return out;
    for (let r = Math.min(p[0], q[0]) + 1; r <= Math.max(p[0], q[0]); r++) if (!matches(literal(get(addr(r, col))), fl.op + fl.v)) out.add(r);
    return out;
  }, [doc.filter, get]);
  const { span, covered, owner } = useMemo(() => { // merged ranges: the top-left cell spans the block, the others are not drawn
    const span = new Map<string, [number, number]>(), covered = new Set<string>(), owner = new Map<string, string>();
    for (const m of merges) { const ids = cellsOf(m), [r0, c0] = parseAddr(ids[0])!, [r1, c1] = parseAddr(ids[ids.length - 1])!; span.set(ids[0], [r1 - r0 + 1, c1 - c0 + 1]); ids.forEach((id, i) => { owner.set(id, m); if (i) covered.add(id); }); }
    return { span, covered, owner };
  }, [merges]);
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
      raw: c => cells[c.trim().toUpperCase()] ?? '',
      get: list => list.split(',').map(x => (x.trim() ? show(x.trim().toUpperCase()) : '')).join(','),
      look: (c, kind) => {
        const id = c.trim().toUpperCase(), f = fmt[id] || {}, p = parseAddr(id);
        const on = kind === 'rule' ? ruleBg.has(id) : kind === 'hidden' ? !!p && hiddenRows.has(p[0]) : kind === 'merged' ? owner.has(id)
          : kind === 'wrap' ? !!f.w : kind === 'bold' ? !!f.b : !!f.bg || ruleBg.has(id);
        return on ? '1' : '0';
      },
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
    if (r1 === r0 && c1 === c0) return flash(t.pick);
    commit({ ...doc, charts: [...charts, { id: String(Date.now()), type, range: `${addr(r0, c0)}:${addr(r1, c1)}` }] });
  };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
  const merge = () => {
    if (readOnly) return; const mine = owner.get(addr(...a));
    if (mine) return commit({ ...doc, merges: merges.filter(m => m !== mine) });
    if (r1 === r0 && c1 === c0) return;
    const sel = new Set(cellsOf(`${addr(r0, c0)}:${addr(r1, c1)}`));
    commit({ ...doc, merges: [...merges.filter(m => !cellsOf(m).some(id => sel.has(id))), `${addr(r0, c0)}:${addr(r1, c1)}`] });
  };
  /** Sorts the selected rows by the active cell's column; numbers before text, empty cells last. Formulas keep pointing at their own row. */
  const sortRows = (desc: boolean) => {
    if (readOnly) return; if (r1 === r0) return flash(t.sortPick);
    const key = (r: number) => literal(get(addr(r, a[1])));
    const order = Array.from({ length: r1 - r0 + 1 }, (_, i) => r0 + i).sort((x, y) => {
      const p = key(x), q = key(y), ep = get(addr(x, a[1])) === '', eq = get(addr(y, a[1])) === '';
      if (ep || eq) return +ep - +eq;
      const d = typeof p === 'number' && typeof q === 'number' ? p - q : typeof p === 'number' ? -1 : typeof q === 'number' ? 1 : String(p).localeCompare(String(q), lang);
      return desc ? -d : d;
    });
    const n = { ...cells }, f = { ...fmt };
    order.forEach((from, i) => { const to = r0 + i; for (let c = c0; c <= c1; c++) {
      const s0 = addr(from, c), d0 = addr(to, c);
      if (cells[s0]) n[d0] = shiftFormula(cells[s0], to - from, 0); else delete n[d0];
      if (fmt[s0]) f[d0] = fmt[s0]; else delete f[d0];
    } });
    commit({ ...doc, cells: n, fmt: f });
  };
  const addRule = () => {
    if (readOnly || (rop !== 'scale' && rv.trim() === '')) return;
    commit({ ...doc, rules: [...rules, { id: String(Date.now()), range: `${addr(r0, c0)}:${addr(r1, c1)}`, op: rop, v: rv.trim(), bg: rbg }] });
  };
  const applyFilter = () => {
    if (readOnly) return; if (r1 === r0 || rop === 'scale' || rv.trim() === '') return flash(t.filterPick);
    commit({ ...doc, filter: { range: `${addr(r0, c0)}:${addr(r1, c1)}`, col: colName(a[1]), op: rop, v: rv.trim() } });
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
        <div className="flex flex-wrap items-center gap-1.5 pb-2" data-testid="sheet-toolbar">
          <Group><Btn t={t.undo} on={undo}><Undo2 size={IC} aria-hidden="true" /></Btn></Group>
          <Group>
            <Btn t={t.bold} on={() => style(f => ({ b: f.b ? undefined : 1 }))} active={!!af.b}><Bold size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.ital} on={() => style(f => ({ i: f.i ? undefined : 1 }))} active={!!af.i}><Italic size={IC} aria-hidden="true" /></Btn>
            <Swatch t={t.color} icon={<Baseline size={IC} aria-hidden="true" />} value={af.c} empty="#ffffff" on={v => style({ c: v })} />
            <Swatch t={t.bg} icon={<PaintBucket size={IC} aria-hidden="true" />} value={af.bg} empty="#0f172a" on={v => style({ bg: v })} />
          </Group>
          <Group>
            <Btn t={t.left} on={() => style({ al: 'l' })} active={af.al === 'l'}><AlignLeft size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.center} on={() => style({ al: 'c' })} active={af.al === 'c'}><AlignCenter size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.right} on={() => style({ al: 'r' })} active={af.al === 'r'}><AlignRight size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.border} on={() => style(f => ({ bd: f.bd ? undefined : 1 }))} active={!!af.bd}><Grid3x3 size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.wrap} on={() => style(f => ({ w: f.w ? undefined : 1 }))} active={!!af.w}><TextWrap size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.merge} on={merge} active={owner.has(addr(...a))} disabled={!owner.has(addr(...a)) && r1 === r0 && c1 === c0}><TableCellsMerge size={IC} aria-hidden="true" /></Btn>
          </Group>
          <Group>
            <Btn t={t.asc} on={() => sortRows(false)}><ArrowUpNarrowWide size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.desc} on={() => sortRows(true)}><ArrowDownWideNarrow size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.filter} on={() => setPanel(panel === 'filter' ? null : 'filter')} active={panel === 'filter' || !!doc.filter}><Funnel size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.cond} on={() => setPanel(panel === 'cond' ? null : 'cond')} active={panel === 'cond' || rules.length > 0}><Highlighter size={IC} aria-hidden="true" /></Btn>
          </Group>
          <Group>
            <select aria-label={t.nf} title={t.nf} className="h-8 cursor-pointer rounded-lg bg-transparent px-1.5 text-xs font-semibold text-slate-100 outline-none hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-emerald-400" value={af.nf || 'gen'} onChange={ev => style({ nf: ev.target.value === 'gen' ? undefined : (ev.target.value as NF) })}>
              {Object.entries(NF_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Group>
          <Group>
            <Btn t={t.fillD} on={fillDown} disabled={r1 === r0}><ArrowDownToLine size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.fillR} on={fillRight} disabled={c1 === c0}><ArrowRightToLine size={IC} aria-hidden="true" /></Btn>
            <Btn t={t.addRow} on={() => commit({ ...doc, rows: R + 5 })}><Rows3 size={IC} aria-hidden="true" /><Plus size={11} aria-hidden="true" /></Btn>
            <Btn t={t.addCol} on={() => commit({ ...doc, cols: Math.min(26, C + 2) })}><Columns3 size={IC} aria-hidden="true" /><Plus size={11} aria-hidden="true" /></Btn>
          </Group>
          <Group>
            <Btn t={`${t.chart}: bar`} on={() => addChart('bar')}><BarChart3 size={IC} aria-hidden="true" /></Btn>
            <Btn t={`${t.chart}: line`} on={() => addChart('line')}><LineChart size={IC} aria-hidden="true" /></Btn>
            <Btn t={`${t.chart}: pie`} on={() => addChart('pie')}><PieChart size={IC} aria-hidden="true" /></Btn>
          </Group>
          <Group>
            <Btn t={full ? t.close : t.full} on={() => setFull(!full)} active={full}>{full ? <Minimize2 size={IC} aria-hidden="true" /> : <Maximize2 size={IC} aria-hidden="true" />}</Btn>
            <Btn t={t.reset} on={() => { hist.current = []; commit(start); }}><RotateCcw size={IC} aria-hidden="true" /></Btn>
          </Group>
          {msg && <span className="text-amber-300">{msg}</span>}
        </div>
      )}
      {!readOnly && panel && (
        <div data-testid={`sheet-${panel}`} className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-800 p-2 ring-1 ring-slate-700">
          <b className="text-emerald-300">{panel === 'cond' ? t.cond : t.filter}</b>
          <span className="font-mono text-slate-300">{panel === 'cond' ? `${t.range}: ${addr(r0, c0)}:${addr(r1, c1)}` : `${t.col}: ${colName(a[1])}`}</span>
          <select aria-label="op" value={rop} onChange={ev => setRop(ev.target.value as CondOp)} className="h-8 rounded-lg bg-slate-900 px-1.5 font-mono text-slate-100 ring-1 ring-slate-600">
            {OPS.filter(o => panel === 'cond' || o !== 'scale').map(o => <option key={o} value={o}>{o === 'scale' ? t.scale : o}</option>)}
          </select>
          {rop !== 'scale' && <input aria-label={t.value} placeholder={t.value} value={rv} onChange={ev => setRv(ev.target.value)} className="h-8 w-24 rounded-lg bg-slate-900 px-2 font-mono text-slate-100 ring-1 ring-slate-600" />}
          {panel === 'cond' && rop !== 'scale' && <input type="color" aria-label={t.bg} value={rbg} onChange={ev => setRbg(ev.target.value)} className="h-8 w-10 cursor-pointer rounded-lg bg-transparent" />}
          <button type="button" onClick={panel === 'cond' ? addRule : applyFilter} className="h-8 rounded-lg bg-emerald-600 px-3 font-semibold text-white hover:bg-emerald-500">{panel === 'cond' ? t.add : t.apply}</button>
          {panel === 'filter' && doc.filter && <button type="button" onClick={() => commit({ ...doc, filter: null })} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-slate-200 hover:bg-slate-700"><FunnelX size={15} aria-hidden="true" />{t.off}</button>}
          {panel === 'cond' && rules.map(rl => (
            <span key={rl.id} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 font-mono text-xs">
              {rl.range} {rl.op === 'scale' ? t.scale : `${rl.op} ${rl.v}`}{rl.op !== 'scale' && <span className="h-3 w-3 rounded" style={{ background: rl.bg }} />}
              <button type="button" aria-label={t.del} onClick={() => commit({ ...doc, rules: rules.filter(x => x.id !== rl.id) })} className="rounded p-0.5 hover:bg-slate-700"><X size={13} aria-hidden="true" /></button>
            </span>
          ))}
          {panel === 'filter' && <span className="text-xs text-slate-400">{doc.filter ? `${doc.filter.range} · ${doc.filter.col} ${doc.filter.op} ${doc.filter.v} · ${hiddenRows.size} ${t.hidden}` : t.filterPick}</span>}
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
          <thead><tr><th className="sticky left-0 top-0 z-20 w-8 bg-slate-800" />{Array.from({ length: C }, (_, c) => <th key={c} className={`sticky top-0 z-10 min-w-[5.5rem] border border-slate-700 bg-slate-800 px-2 py-0.5 ${c >= c0 && c <= c1 ? 'text-emerald-300' : 'text-slate-400'}`}>{colName(c)}{doc.filter?.col === colName(c) && <Funnel size={11} className="ml-1 inline" aria-hidden="true" />}</th>)}</tr></thead>
          <tbody>{Array.from({ length: R }, (_, r) => (
            <tr key={r} hidden={hiddenRows.has(r)}>
              <th className={`sticky left-0 z-10 border border-slate-700 bg-slate-800 px-2 ${r >= r0 && r <= r1 ? 'text-emerald-300' : 'text-slate-400'}`}>{r + 1}</th>
              {Array.from({ length: C }, (_, c) => {
                const id = addr(r, c); if (covered.has(id)) return null;
                const sp = span.get(id), lastR = r + (sp ? sp[0] - 1 : 0), lastC = c + (sp ? sp[1] - 1 : 0), rb = ruleBg.get(id);
                const inSel = r >= r0 && r <= r1 && c >= c0 && c <= c1, active = r === a[0] && c === a[1], f = fmt[id] || {}, shown = show(id);
                const isNum = shown !== '' && !Number.isNaN(Number(shown.replace(/[$%,]/g, '')));
                return (
                  <td key={c} data-cell={id} data-testid={`cell-${id}`} data-value={shown} rowSpan={sp?.[0]} colSpan={sp?.[1]}
                    onPointerDown={ev => { if (edit !== null) put(addr(...a), edit); setEdit(null); drag.current = 'sel'; setA([r, c]); setE([lastR, lastC]); box.current?.focus(); ev.preventDefault(); }}
                    onDoubleClick={() => { if (!readOnly) { setBar(false); setEdit(cells[id] || ''); } }}
                    style={{ color: f.c || (rb && !inSel ? '#0f172a' : undefined), background: inSel ? undefined : rb || f.bg, maxWidth: f.w ? '12rem' : undefined, fontWeight: f.b ? 700 : undefined, fontStyle: f.i ? 'italic' : undefined, textAlign: f.al === 'l' ? 'left' : f.al === 'c' ? 'center' : f.al === 'r' ? 'right' : undefined, borderColor: f.bd ? '#e2e8f0' : undefined, borderWidth: f.bd ? 2 : undefined }}
                    className={`relative h-7 ${f.w ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap'} border px-2 ${inSel ? 'border-emerald-400/60 bg-emerald-500/15' : 'border-slate-700'} ${active ? 'outline outline-2 outline-emerald-400' : ''} ${!f.al && isNum ? 'text-right' : shown.startsWith('#') ? 'text-red-400' : ''}`}>
                    {active && edit !== null && !bar
                      ? <input autoFocus className="absolute inset-0 w-full bg-slate-950 px-2 font-mono text-text outline-none" value={edit} onChange={ev => setEdit(ev.target.value)} data-testid="cell-editor"
                          onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); finish(1, 0); } else if (ev.key === 'Tab') { ev.preventDefault(); ev.stopPropagation(); finish(0, 1); } else if (ev.key === 'Escape') { setEdit(null); box.current?.focus(); } }} />
                      : shown}
                    {!readOnly && lastR === r1 && lastC === c1 && edit === null && (
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
