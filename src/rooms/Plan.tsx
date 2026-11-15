import React, { useRef, useState } from 'react';
import { Copy, LayoutGrid, RotateCw, Trash2 } from 'lucide-react';
import { Button, Field, inputCls } from '../ui';
import * as st from './store';
import type { El, ElType, Item, Layout, Opening, Wall } from './store';
import { freeSpot, front, hsl, opColor, parseHex, spread, wallColor, wallGeo } from './geom';
import { Plan3D } from './Plan3D';

const S = 0.64, PAD = 14; // px per cm in the 2D drawing, margin around the room
const uid = () => crypto.randomUUID().slice(0, 8);
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), Math.max(a, b));
const pts = (poly: { x: number; y: number }[]) => poly.map(p => `${(p.x * S).toFixed(1)},${(p.y * S).toFixed(1)}`).join(' ');
const typeCol = (t: ElType) => { const h = st.EL_TYPES[t].hue; return { fill: `hsl(${h} 80% 92%)`, line: `hsl(${h} 55% 38%)`, text: `hsl(${h} 60% 20%)` }; };

interface On { down?: (e: React.PointerEvent, el: El) => void; key?: (e: React.KeyboardEvent, el: El) => void; size?: (e: React.PointerEvent, el: El) => void; wall?: (w: Wall) => void; pick?: (el: El) => void; bg?: () => void }

/** One drawing for both the read-only view and the editor. An element can be linked to an equipment item. */
function Svg({ layout, sel, items, svgRef, on, ghost, draw }: { layout: Layout; sel?: string; items: Item[]; svgRef?: React.Ref<SVGSVGElement>; on?: On; ghost?: { x1: number; y1: number; x2: number; y2: number } | null; draw?: boolean }) {
  const W = layout.w * S, H = layout.h * S, g = layout.grid ?? 50, edit = !!on?.down;
  return (
    <svg ref={svgRef} viewBox={`${-PAD} ${-PAD} ${W + 2 * PAD} ${H + 2 * PAD}`} role="group" aria-label="Кабинет схемасы" className="w-full select-none rounded-lg border border-border bg-surface" style={{ touchAction: edit ? 'none' : 'auto', maxHeight: '70vh', cursor: draw ? 'crosshair' : undefined }} onPointerDown={e => { if (e.target === e.currentTarget) on?.bg?.(); }}>
      <defs>
        {g * S >= 5 && <pattern id="plan-grid" width={g * S} height={g * S} patternUnits="userSpaceOnUse"><path d={`M ${g * S} 0 L 0 0 0 ${g * S}`} fill="none" stroke="var(--color-border)" strokeWidth="0.6" /></pattern>}
        <pattern id="plan-m" width={100 * S} height={100 * S} patternUnits="userSpaceOnUse"><path d={`M ${100 * S} 0 L 0 0 0 ${100 * S}`} fill="none" stroke="var(--color-border-input)" strokeWidth="0.8" /></pattern>
      </defs>
      <rect width={W} height={H} fill="var(--color-surface)" pointerEvents="none" />
      {g * S >= 5 && <rect width={W} height={H} fill="url(#plan-grid)" pointerEvents="none" />}
      <rect width={W} height={H} fill="url(#plan-m)" stroke="var(--color-border-input)" pointerEvents="none" />
      <g style={{ pointerEvents: draw ? 'none' : undefined }}>
        {(layout.walls ?? []).map(w => {
          const geo = wallGeo(w), c = wallColor(w), len = st.wallLen(w), th = st.thOf(w), act = !!on?.wall;
          return (
            <g key={w.id} role={act ? 'button' : 'img'} aria-label={`Қабырға: ${len} см`} tabIndex={act ? 0 : undefined} style={{ cursor: act ? 'pointer' : 'default', outline: 'none' }} onPointerDown={act ? ev => { ev.stopPropagation(); on!.wall!(w); } : undefined}>
              <title>Қабырға · {len} см, қалыңдығы {th} см, биіктігі {st.wzOf(w)} см</title>
              <polygon points={pts(geo.quad(0, geo.L))} fill={hsl(c)} stroke={sel === w.id ? 'var(--color-accent)' : hsl(c, -38)} strokeWidth={sel === w.id ? 2.5 : 1} />
              {(w.ops ?? []).map(o => <polygon key={o.id} points={pts(geo.quad(o.at, o.at + o.wd, th + 2))} fill={o.k === 'door' ? hsl(opColor(o), 30) : '#cdeefa'} stroke={o.k === 'door' ? hsl(opColor(o), -10) : '#2b7a99'} strokeWidth="1.2"><title>{o.k === 'door' ? 'Есік' : 'Терезе'} · {o.wd} см</title></polygon>)}
              {act && <polyline points={`${w.x1 * S},${w.y1 * S} ${w.x2 * S},${w.y2 * S}`} stroke="transparent" strokeWidth="16" fill="none" pointerEvents="stroke" />}
            </g>
          );
        })}
        {layout.els.map(e => {
          const c = typeCol(e.t), ec = parseHex(e.c), name = e.label || st.EL_TYPES[e.t].name, item = items.find(i => i.id === e.item_id), act = !!(on?.down || (item && on?.pick));
          const pw = e.w * S, ph = e.h * S, tall = ph > pw, run = Math.max(pw, ph), fill = ec ? hsl({ ...ec, l: 88 }) : c.fill, line = ec ? hsl(ec, -30) : c.line, [fx, fy] = front(e);
          return (
            <g key={e.id} role={act ? 'button' : 'img'} aria-label={`${st.EL_TYPES[e.t].name}: ${name}${item ? ` (${item.name})` : ''}`} tabIndex={act ? 0 : undefined}
              style={{ cursor: on?.down ? 'grab' : item && on?.pick ? 'pointer' : 'default', outline: 'none' }}
              onPointerDown={on?.down ? ev => on.down!(ev, e) : undefined} onKeyDown={on?.key ? ev => on.key!(ev, e) : undefined}
              onClick={!on?.down && item ? () => on?.pick?.(e) : undefined} onKeyUp={!on?.down && item ? ev => { if (ev.key === 'Enter') on?.pick?.(e); } : undefined}>
              <title>{name} · {e.w}×{e.h}×{st.zOf(e)} см{item ? ` — ${item.name}, ${item.qty} дана` : ''}</title>
              <svg x={e.x * S} y={e.y * S} width={pw} height={ph}>
                <rect x="1" y="1" width={Math.max(pw - 2, 1)} height={Math.max(ph - 2, 1)} rx="4" fill={fill} stroke={sel === e.id ? 'var(--color-accent)' : line} strokeWidth={sel === e.id ? 3 : 1.5} />
                {e.t === 'chair' && <line x1={pw / 2} y1={ph / 2} x2={pw / 2 + fx * pw * 0.35} y2={ph / 2 + fy * ph * 0.35} stroke={line} strokeWidth="2.5" strokeLinecap="round" />}
                {run >= name.length * 6.5 + 8 && Math.min(pw, ph) >= 14 && (
                  <g transform={tall ? `rotate(-90 ${pw / 2} ${ph / 2})` : undefined} textAnchor="middle" dominantBaseline="central" fill={ec ? hsl(ec, -40) : c.text}>
                    <text x={pw / 2} y={ph / 2 - (Math.min(pw, ph) >= 30 ? 6 : 0)} fontSize="11" fontWeight="600">{name}</text>
                    {Math.min(pw, ph) >= 30 && <text x={pw / 2} y={ph / 2 + 8} fontSize="9" opacity=".75">{e.w}×{e.h} см</text>}
                  </g>)}
              </svg>
              {edit && sel === e.id && <rect x={e.x * S + pw - 5} y={e.y * S + ph - 5} width="10" height="10" rx="2" fill="var(--color-accent)" stroke="white" style={{ cursor: 'nwse-resize' }} onPointerDown={ev => { ev.stopPropagation(); on!.size?.(ev, e); }}><title>Өлшемін өзгерту</title></rect>}
            </g>
          );
        })}
      </g>
      {ghost && <line x1={ghost.x1 * S} y1={ghost.y1 * S} x2={ghost.x2 * S} y2={ghost.y2 * S} stroke="var(--color-accent)" strokeWidth={20 * S} strokeDasharray="6 4" opacity=".6" pointerEvents="none" />}
    </svg>
  );
}

const sizeText = (l: Layout) => `Кабинет ${+(l.w / 100).toFixed(2)} × ${+(l.h / 100).toFixed(2)} м`;

const ModeSwitch = ({ v, set }: { v: boolean; set: (v: boolean) => void }) => (
  <div role="group" aria-label="Көрініс" className="inline-flex rounded-lg bg-surface-2 p-1">
    {([[false, '2D жоспар'], [true, '3D']] as const).map(([k, label]) => <button key={label} type="button" aria-pressed={v === k} onClick={() => set(k)} className={`min-h-[40px] rounded-md px-3 text-sm font-medium ${v === k ? 'bg-surface text-on-accent-soft shadow-card' : 'text-text-secondary'}`}>{label}</button>)}
  </div>
);

/** Whole-number field that commits on blur/Enter, so typing "120" is not clamped after "1". */
function NumField({ value, onCommit, label }: { value: number; onCommit: (n: number) => void; label: string }) {
  const [t, setT] = useState<string | null>(null);
  const done = () => { if (t !== null) { const n = Number(t); if (t.trim() && Number.isFinite(n)) onCommit(Math.round(n)); setT(null); } };
  return <Field label={label}>{x => <input id={x} inputMode="numeric" className={inputCls} value={t ?? String(value)} onChange={e => setT(e.target.value)} onBlur={done} onKeyDown={e => { if (e.key === 'Enter') done(); }} />}</Field>;
}

const SWATCHES: [string, string][] = [['#ef4444', 'Қызыл'], ['#f97316', 'Қызғылт сары'], ['#eab308', 'Сары'], ['#84cc16', 'Ашық жасыл'], ['#22c55e', 'Жасыл'], ['#06b6d4', 'Көгілдір'], ['#3b82f6', 'Көк'], ['#8b5cf6', 'Күлгін'], ['#ec4899', 'Қызғылт'], ['#78716c', 'Қоңыр-сұр'], ['#94a3b8', 'Сұр'], ['#ffffff', 'Ақ']];
function ColorPick({ label, value, onChange, compact }: { label: string; value?: string; onChange: (c?: string) => void; compact?: boolean }) {
  return (
    <div role="group" aria-label={label} className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {!compact && SWATCHES.map(([c, n]) => <button key={c} type="button" aria-label={n} aria-pressed={value === c} title={n} onClick={() => onChange(c)} className="h-8 w-8 rounded-full border" style={{ background: c, borderColor: value === c ? 'var(--color-accent)' : 'var(--color-border-input)', borderWidth: value === c ? 3 : 1 }} />)}
        <input type="color" aria-label={`${label}: басқа түс`} value={value ?? '#94a3b8'} onChange={e => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border-input bg-transparent p-0" />
        {value && <button type="button" onClick={() => onChange(undefined)} className="min-h-[32px] rounded-md px-2 text-sm text-text-secondary underline">Әдепкі</button>}
      </div>
    </div>
  );
}

export function PlanView({ layout, items, onItem }: { layout: Layout; items: Item[]; onItem: (id: string) => void }) {
  const used = [...new Set(layout.els.map(e => e.t))], [d3, setD3] = useState(false);
  return (
    <section aria-label="Кабинет схемасы" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Кабинет схемасы</h3><ModeSwitch v={d3} set={setD3} /></div>
      <p className="text-sm text-text-secondary">{sizeText(layout)}</p>
      {d3 ? <Plan3D layout={layout} items={items} onItem={onItem} /> : <Svg layout={layout} items={items} on={{ pick: e => e.item_id && onItem(e.item_id) }} />}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">{used.map(t => <span key={t} className="inline-flex items-center gap-1"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm border" style={{ background: typeCol(t).fill, borderColor: typeCol(t).line }} />{st.EL_TYPES[t].name}</span>)}
        {layout.els.some(e => e.item_id) && <span>Жабдыққа байланған зат басылғанда карточкасы ашылады.</span>}</p>
    </section>
  );
}

type Drag = { id: string; mode: 'move' | 'size'; dx: number; dy: number } | null;
export function PlanEditor({ layout, items, set }: { layout: Layout | null; items: Item[]; set: (l: Layout | null) => void }) {
  const ref = useRef<SVGSVGElement>(null), drag = useRef<Drag>(null), start = useRef<{ x: number; y: number } | null>(null);
  const [sel, setSel] = useState(''), [rows, setRows] = useState('3'), [cols, setCols] = useState('4'), [chairs, setChairs] = useState(true), [d3, setD3] = useState(false);
  const [tool, setTool] = useState<'sel' | 'wall'>('sel'), [ghost, setGhost] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null), [msg, setMsg] = useState('');
  if (!layout) return <div className="space-y-2"><h3 className="font-semibold">Кабинет схемасы</h3><p className="text-sm text-text-secondary">Схема әлі жоқ: кабинет өлшемін енгізіп, қабырға, парта, компьютер, тақта қойып сызыңыз.</p><Button variant="secondary" onClick={() => set(st.blankLayout())}><LayoutGrid size={16} aria-hidden="true" />Схема сызу</Button></div>;
  const g = layout.grid ?? 50, walls = layout.walls ?? [], W = layout.w, H = layout.h;
  const setEls = (els: El[]) => set({ ...layout, els });
  const upd = (id: string, p: Partial<El>) => setEls(layout.els.map(e => (e.id === id ? { ...e, ...p } : e)));
  const setWalls = (w: Wall[]) => set({ ...layout, walls: w });
  const updW = (id: string, p: Partial<Wall>) => setWalls(walls.map(w => (w.id === id ? { ...w, ...p } : w)));
  const snap = (v: number) => Math.round(v / g) * g;
  const fit = (e: El, x: number, y: number) => ({ x: clamp(x, 0, W - e.w), y: clamp(y, 0, H - e.h) });
  const add = (t: ElType) => { const d = st.EL_TYPES[t], w = Math.min(d.w, W), h = Math.min(d.h, H), e: El = { id: uid(), t, w, h, ...fit({ w, h } as El, snap(100), snap(100)), label: t === 'other' ? '' : undefined }; setEls([...layout.els, e]); setSel(e.id); setTool('sel'); };
  const grid = () => { // a block of desks (with chairs behind them), e.g. the rows of a computer class
    const r = clamp(+rows || 1, 1, 15), c = clamp(+cols || 1, 1, 15), dw = st.EL_TYPES.desk.w, dh = st.EL_TYPES.desk.h, ch = st.EL_TYPES.chair, els: El[] = [];
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
      const x = 100 + j * (dw + 60), y = 150 + i * (dh + (chairs ? ch.h + 45 : 60));
      if (x + dw > W || y + dh + (chairs ? ch.h + 5 : 0) > H) continue;
      els.push({ id: uid(), t: 'desk', x, y, w: dw, h: dh });
      if (chairs) els.push({ id: uid(), t: 'chair', x: x + Math.round((dw - ch.w) / 2), y: y + dh + 5, w: ch.w, h: ch.h, r: 2 });
    }
    setEls([...layout.els, ...els]); setMsg(els.length ? '' : 'Бұл өлшемге парта сыймады');
  };
  const resize = (w: number, h: number) => { const nw = clamp(w, 200, 5000), nh = clamp(h, 200, 4000); set({ ...layout, w: nw, h: nh,
    els: layout.els.map(e => { const ew = Math.min(e.w, nw), eh = Math.min(e.h, nh); return { ...e, w: ew, h: eh, x: Math.min(e.x, nw - ew), y: Math.min(e.y, nh - eh) }; }),
    walls: walls.map(k => ({ ...k, x1: Math.min(k.x1, nw), x2: Math.min(k.x2, nw), y1: Math.min(k.y1, nh), y2: Math.min(k.y2, nh) })) }); };
  const cm = (ev: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(), k = r.width / (W * S + 2 * PAD); return { x: ((ev.clientX - r.left) / k - PAD) / S, y: ((ev.clientY - r.top) / k - PAD) / S }; };
  const down = (ev: React.PointerEvent, e: El) => { ev.preventDefault(); setSel(e.id); const p = cm(ev); drag.current = { id: e.id, mode: 'move', dx: p.x - e.x, dy: p.y - e.y }; (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId); };
  const size = (ev: React.PointerEvent, e: El) => { ev.preventDefault(); drag.current = { id: e.id, mode: 'size', dx: 0, dy: 0 }; (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId); };
  const pt = (ev: React.PointerEvent) => { const p = cm(ev); return { x: clamp(snap(p.x), 0, W), y: clamp(snap(p.y), 0, H) }; };
  const wrapDown = (ev: React.PointerEvent) => { if (tool !== 'wall') return; ev.preventDefault(); start.current = pt(ev); ref.current?.setPointerCapture?.(ev.pointerId); };
  const move = (ev: React.PointerEvent) => {
    if (start.current) { const p = pt(ev); setGhost({ x1: start.current.x, y1: start.current.y, x2: p.x, y2: p.y }); return; }
    const d = drag.current; if (!d) return; const e = layout.els.find(x => x.id === d.id); if (!e) return; const p = cm(ev);
    if (d.mode === 'move') { const n = fit(e, snap(p.x - d.dx), snap(p.y - d.dy)); if (n.x !== e.x || n.y !== e.y) upd(e.id, n); }
    else { const w = clamp(snap(p.x) - e.x, 5, W - e.x), h = clamp(snap(p.y) - e.y, 5, H - e.y); if (w !== e.w || h !== e.h) upd(e.id, { w, h }); }
  };
  const up = () => {
    drag.current = null;
    if (start.current && ghost) {
      const w: Wall = { id: uid(), x1: ghost.x1, y1: ghost.y1, x2: ghost.x2, y2: ghost.y2 };
      if (st.wallLen(w) >= 20) { setWalls([...walls, { ...w, c: walls.at(-1)?.c }]); setSel(w.id); setMsg(''); } else setMsg('Қабырға кемі 20 см болсын');
    }
    start.current = null; setGhost(null);
  };
  const key = (ev: React.KeyboardEvent, e: El) => {
    const s = Math.max(g, 1), d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[ev.key];
    if (d) { ev.preventDefault(); upd(e.id, fit(e, e.x + d[0], e.y + d[1])); } else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); setEls(layout.els.filter(x => x.id !== e.id)); setSel(''); }
  };
  const perimeter = () => { const t = 20, a = t / 2, ps: [number, number][] = [[a, a], [W - a, a], [W - a, H - a], [a, H - a]]; setWalls([...walls, ...ps.map(([x1, y1], i) => ({ id: uid(), x1, y1, x2: ps[(i + 1) % 4][0], y2: ps[(i + 1) % 4][1], th: t }))]); setMsg(''); };
  const cur = layout.els.find(e => e.id === sel), curW = walls.find(w => w.id === sel);
  const rotate = (e: El) => { const w = e.h, h = e.w, n = fit({ ...e, w, h }, e.x, e.y); upd(e.id, { w: Math.min(w, W), h: Math.min(h, H), ...n, r: ((e.r ?? 0) + 1) % 4 }); };
  const copy = (e: El) => { const n = { ...e, id: uid(), ...fit(e, e.x + Math.max(g, 20), e.y + Math.max(g, 20)) }; setEls([...layout.els, n]); setSel(n.id); };
  const setOps = (w: Wall, ops: Opening[]) => updW(w.id, { ops });
  const combo = (w: Wall, kinds: ('door' | 'window')[], replace: boolean) => {
    if (replace) { const o = spread(kinds, st.wallLen(w)); if (!o) return setMsg('Қабырға тым қысқа: есік/терезе сыймайды'); setMsg(''); return setOps(w, o); }
    const k = kinds[0], at = freeSpot(w, k); if (at === null) return setMsg('Қабырғада бос орын жоқ'); setMsg(''); setOps(w, [...(w.ops ?? []), { id: uid(), k, at, wd: st.OP_W[k] }]);
  };
  const updO = (w: Wall, id: string, p: Partial<Opening>) => setOps(w, (w.ops ?? []).map(o => (o.id === id ? { ...o, ...p } : o)));
  const COMBOS: [string, ('door' | 'window')[], boolean][] = [['Есік қосу', ['door'], false], ['Терезе қосу', ['window'], false], ['Қос терезе', ['window', 'window'], true], ['Үш терезе', ['window', 'window', 'window'], true], ['Есік + терезе', ['door', 'window'], true], ['Терезе + есік + терезе', ['window', 'door', 'window'], true]];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2"><h3 className="font-semibold">Кабинет схемасы</h3>
        <div className="flex flex-wrap items-end gap-2">
          <NumField label="Ені (см)" value={W} onCommit={n => resize(n, H)} /><NumField label="Ұзындығы (см)" value={H} onCommit={n => resize(W, n)} />
          <Field label="Тор қадамы">{x => <select id={x} className={inputCls + ' !w-28'} value={g} onChange={e => set({ ...layout, grid: +e.target.value })}>{st.GRIDS.map(c => <option key={c} value={c}>{c === 1 ? 'Еркін' : `${c} см`}</option>)}</select>}</Field>
          <Button variant="ghost" onClick={() => { set(null); setSel(''); }}><Trash2 size={16} aria-hidden="true" />Схеманы жою</Button></div></div>
      <ColorPick label="Еден түсі" compact value={layout.fc} onChange={c => set({ ...layout, fc: c })} />
      <div role="toolbar" aria-label="Схемаға қосу" className="flex flex-wrap gap-2">
        {(Object.keys(st.EL_TYPES) as ElType[]).map(t => <button key={t} type="button" onClick={() => add(t)} className="min-h-[40px] rounded-md border px-3 text-sm font-medium" style={{ background: typeCol(t).fill, borderColor: typeCol(t).line, color: typeCol(t).text }}>+ {st.EL_TYPES[t].name}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={tool === 'wall' ? 'primary' : 'secondary'} aria-pressed={tool === 'wall'} onClick={() => setTool(tool === 'wall' ? 'sel' : 'wall')}>{tool === 'wall' ? 'Қабырға сызу: қосулы' : 'Қабырға сызу'}</Button>
        <Button variant="secondary" onClick={perimeter}>Төрт қабырға</Button>
        {tool === 'wall' && <span className="text-sm text-text-secondary">Екі нүктенің арасын сүйреп сызыңыз (тор қадамына жапсырылады).</span>}
      </div>
      <div className="flex flex-wrap items-end gap-2"><Field label="Парта қатары">{x => <input id={x} type="number" min={1} max={15} className={inputCls + ' !w-20'} value={rows} onChange={e => setRows(e.target.value)} />}</Field>
        <Field label="Бағанасы">{x => <input id={x} type="number" min={1} max={15} className={inputCls + ' !w-20'} value={cols} onChange={e => setCols(e.target.value)} />}</Field>
        <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={chairs} onChange={e => setChairs(e.target.checked)} />Орындықпен</label>
        <Button variant="secondary" onClick={grid}>Парта торын қосу</Button></div>
      {msg && <p role="status" className="text-sm text-danger">{msg}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-text-secondary">{sizeText(layout)}</p><ModeSwitch v={d3} set={setD3} /></div>
      {d3 ? <Plan3D layout={layout} items={items} /> : <div onPointerDown={wrapDown} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <Svg layout={layout} sel={sel} items={items} svgRef={ref} ghost={ghost} draw={tool === 'wall'} on={{ down, key, size, wall: w => { setSel(w.id); setTool('sel'); }, bg: () => setSel('') }} />
      </div>}
      <p className="text-xs text-text-secondary">Затты тышқанмен немесе саусақпен жылжытыңыз, таңдалған заттың бұрышындағы нүктені сүйреп өлшемін өзгертіңіз. Пернетақтамен: бағыттар — жылжыту, Delete — өшіру. Дәл өлшемді төмендегі өрістерге см-мен жазыңыз.</p>
      {cur && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">{st.EL_TYPES[cur.t].name}</p>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <NumField label="X (см)" value={cur.x} onCommit={n => upd(cur.id, { x: clamp(n, 0, W - cur.w) })} />
            <NumField label="Y (см)" value={cur.y} onCommit={n => upd(cur.id, { y: clamp(n, 0, H - cur.h) })} />
            <NumField label="Ені (см)" value={cur.w} onCommit={n => upd(cur.id, { w: clamp(n, 5, W - cur.x) })} />
            <NumField label="Ұзындығы (см)" value={cur.h} onCommit={n => upd(cur.id, { h: clamp(n, 5, H - cur.y) })} />
            <NumField label="Биіктігі (см)" value={st.zOf(cur)} onCommit={n => upd(cur.id, { z: clamp(n, 10, 400) })} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Жазу">{x => <input id={x} className={inputCls} maxLength={40} value={cur.label ?? ''} onChange={e => upd(cur.id, { label: e.target.value })} />}</Field>
            <Field label="Жабдыққа байлау">{x => <select id={x} className={inputCls} value={cur.item_id ?? ''} onChange={e => upd(cur.id, { item_id: e.target.value || undefined })}><option value="">Байланбаған</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>}</Field>
          </div>
          <ColorPick label="Түсі" value={cur.c} onChange={c => upd(cur.id, { c })} />
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => rotate(cur)}><RotateCw size={16} aria-hidden="true" />Бұру</Button><Button variant="secondary" onClick={() => copy(cur)}><Copy size={16} aria-hidden="true" />Көшіру</Button>
            <Button variant="ghost" onClick={() => { setEls(layout.els.filter(x => x.id !== cur.id)); setSel(''); }}><Trash2 size={16} aria-hidden="true" />Өшіру</Button></div>
        </div>)}
      {curW && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">Қабырға <span className="font-normal text-text-secondary">· ұзындығы {st.wallLen(curW)} см</span></p>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <NumField label="Басы X (см)" value={curW.x1} onCommit={n => updW(curW.id, { x1: clamp(n, 0, W) })} /><NumField label="Басы Y (см)" value={curW.y1} onCommit={n => updW(curW.id, { y1: clamp(n, 0, H) })} />
            <NumField label="Соңы X (см)" value={curW.x2} onCommit={n => updW(curW.id, { x2: clamp(n, 0, W) })} /><NumField label="Соңы Y (см)" value={curW.y2} onCommit={n => updW(curW.id, { y2: clamp(n, 0, H) })} />
            <NumField label="Қалыңдығы (см)" value={st.thOf(curW)} onCommit={n => updW(curW.id, { th: clamp(n, 5, 60) })} /><NumField label="Биіктігі (см)" value={st.wzOf(curW)} onCommit={n => updW(curW.id, { z: clamp(n, 100, 500) })} />
          </div>
          <ColorPick label="Қабырға түсі" value={curW.c} onChange={c => updW(curW.id, { c })} />
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setWalls(walls.map(w => ({ ...w, c: curW.c })))}>Түсті барлық қабырғаға қолдану</Button></div>
          <div className="space-y-2"><p className="text-sm font-semibold">Есік пен терезе</p>
            <div className="flex flex-wrap gap-2">{COMBOS.map(([label, kinds, rep]) => <Button key={label} variant="secondary" onClick={() => combo(curW, kinds, rep)}>{label}</Button>)}{(curW.ops ?? []).length > 0 && <Button variant="ghost" onClick={() => setOps(curW, [])}>Барлығын өшіру</Button>}</div>
            <p className="text-xs text-text-secondary">«Қос терезе», «Есік + терезе» сияқты үйлесімдер қабырғадағы барлық есік пен терезені ауыстырып, қабырға бойына тең бөліп қояды.</p>
            {[...(curW.ops ?? [])].sort((a, b) => a.at - b.at).map(o => (
              <div key={o.id} className="space-y-2 rounded-md bg-surface-2 p-2">
                <p className="text-sm font-medium">{o.k === 'door' ? 'Есік' : 'Терезе'}</p>
                <div className="grid gap-2 sm:grid-cols-4">
                  <NumField label="Орны (см)" value={o.at} onCommit={n => updO(curW, o.id, { at: clamp(n, 0, st.wallLen(curW) - o.wd) })} />
                  <NumField label="Ені (см)" value={o.wd} onCommit={n => updO(curW, o.id, { wd: clamp(n, 40, Math.min(400, st.wallLen(curW) - o.at)) })} />
                  <NumField label="Еденнен (см)" value={st.opSill(o)} onCommit={n => updO(curW, o.id, { sill: clamp(n, 0, 300) })} />
                  <NumField label="Биіктігі (см)" value={st.opH(o)} onCommit={n => updO(curW, o.id, { hh: clamp(n, 20, 400) })} />
                </div>
                <div className="flex flex-wrap items-end gap-3"><ColorPick label="Түсі" compact value={o.c} onChange={c => updO(curW, o.id, { c })} /><Button variant="ghost" onClick={() => setOps(curW, (curW.ops ?? []).filter(x => x.id !== o.id))}><Trash2 size={16} aria-hidden="true" />Өшіру</Button></div>
              </div>))}
          </div>
          <Button variant="ghost" onClick={() => { setWalls(walls.filter(w => w.id !== curW.id)); setSel(''); }}><Trash2 size={16} aria-hidden="true" />Қабырғаны өшіру</Button>
        </div>)}
      {!cur && !curW && <p className="text-sm text-text-secondary">Өзгерту үшін схемадағы зат немесе қабырғаны басыңыз.</p>}
    </div>
  );
}
