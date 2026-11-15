import React, { useRef, useState } from 'react';
import { Copy, LayoutGrid, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { Button, Field, inputCls } from '../ui';
import * as st from './store';
import type { El, ElType, Item, Layout } from './store';

const C = 32; // px per grid cell in the SVG's own units
const col = (t: ElType) => { const h = st.EL_TYPES[t].hue; return { fill: `hsl(${h} 80% 92%)`, line: `hsl(${h} 55% 38%)`, text: `hsl(${h} 60% 20%)` }; };
const uid = () => crypto.randomUUID().slice(0, 8);

/** One drawing for both the read-only view and the editor. The same element can be linked to an equipment item. */
function Svg({ layout, sel, items, svgRef, on }: { layout: Layout; sel?: string; items: Item[]; svgRef?: React.Ref<SVGSVGElement>;
  on?: { down?: (e: React.PointerEvent, el: El) => void; key?: (e: React.KeyboardEvent, el: El) => void; pick?: (el: El) => void; bg?: () => void } }) {
  const W = layout.w * C, H = layout.h * C;
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Кабинет схемасы" className="w-full select-none rounded-lg border border-border bg-surface" style={{ touchAction: on?.down ? 'none' : 'auto', maxHeight: '70vh' }} onPointerDown={e => { if (e.target === e.currentTarget) on?.bg?.(); }}>
      <defs><pattern id="plan-grid" width={C} height={C} patternUnits="userSpaceOnUse"><path d={`M ${C} 0 L 0 0 0 ${C}`} fill="none" stroke="var(--color-border)" strokeWidth="1" /></pattern></defs>
      <rect width={W} height={H} fill="url(#plan-grid)" pointerEvents="none" />
      {layout.els.map(e => {
        const c = col(e.t), name = e.label || st.EL_TYPES[e.t].name, item = items.find(i => i.id === e.item_id), act = !!(on?.down || (item && on?.pick));
        return (
          <g key={e.id} role={act ? 'button' : 'img'} aria-label={`${st.EL_TYPES[e.t].name}: ${name}${item ? ` (${item.name})` : ''}`} tabIndex={act ? 0 : undefined}
            style={{ cursor: on?.down ? 'grab' : item && on?.pick ? 'pointer' : 'default', outline: 'none' }}
            onPointerDown={on?.down ? ev => on.down!(ev, e) : undefined} onKeyDown={on?.key ? ev => on.key!(ev, e) : undefined}
            onClick={!on?.down && item ? () => on?.pick?.(e) : undefined} onKeyUp={!on?.down && item ? ev => { if (ev.key === 'Enter') on?.pick?.(e); } : undefined}>
            <title>{name} · {e.w * st.cmOf(layout)}×{e.h * st.cmOf(layout)}×{st.zOf(e)} см{item ? ` — ${item.name}, ${item.qty} дана` : ''}</title>
            <svg x={e.x * C} y={e.y * C} width={e.w * C} height={e.h * C}>
              <rect x="1.5" y="1.5" width={e.w * C - 3} height={e.h * C - 3} rx="5" fill={c.fill} stroke={sel === e.id ? 'var(--color-accent)' : c.line} strokeWidth={sel === e.id ? 3 : 1.5} />
              <g transform={e.h > e.w ? `rotate(-90 ${e.w * C / 2} ${e.h * C / 2})` : undefined} textAnchor="middle" dominantBaseline="central" fill={c.text}>
                <text x={e.w * C / 2} y={e.h * C / 2 - (e.w * e.h >= 2 ? 6 : 0)} fontSize="11" fontWeight="600">{name}</text>
                {e.w * e.h >= 2 && <text x={e.w * C / 2} y={e.h * C / 2 + 8} fontSize="9" opacity=".75">{e.w * st.cmOf(layout)}×{e.h * st.cmOf(layout)} см</text>}
              </g>
            </svg>
          </g>
        );
      })}
    </svg>
  );
}


const meters = (cells: number, cm: number) => `${+(cells * cm / 100).toFixed(2)}`;
const sizeText = (l: Layout) => `Кабинет ${meters(l.w, st.cmOf(l))} × ${meters(l.h, st.cmOf(l))} м · 1 тор = ${st.cmOf(l)} см`;

/** Isometric 3D drawn with plain SVG (no library): boxes of real size, painter's order, drag or buttons to turn. */
export function Plan3D({ layout, items, onItem }: { layout: Layout; items: Item[]; onItem?: (id: string) => void }) {
  const [a, setA] = useState(35), drag = useRef<number | null>(null);
  const cm = st.cmOf(layout), W = layout.w * cm, H = layout.h * cm, th = a * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th);
  const uv = (x: number, y: number): [number, number] => [(x - W / 2) * cs - (y - H / 2) * sn, (x - W / 2) * sn + (y - H / 2) * cs];
  const pt = (x: number, y: number, z: number) => { const [u, v] = uv(x, y); return [(u - v) * 0.866, (u + v) * 0.5 - z] as const; };
  const P = (x: number, y: number, z: number) => pt(x, y, z).map(n => n.toFixed(1)).join(',');
  const boxes = layout.els.map(e => { const [u, v] = uv((e.x + e.w / 2) * cm, (e.y + e.h / 2) * cm); return { e, d: u + v }; }).sort((p, q) => p.d - q.d);
  const xs: number[] = [], ys: number[] = [];
  for (const [x, y] of [[0, 0], [W, 0], [W, H], [0, H]]) { const [px, py] = pt(x, y, 0); xs.push(px); ys.push(py); }
  for (const e of layout.els) for (const [x, y] of [[e.x, e.y], [e.x + e.w, e.y + e.h]]) { const [px, py] = pt(x * cm, y * cm, st.zOf(e)); xs.push(px); ys.push(py); }
  const pad = 30, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, vw = Math.max(...xs) + pad - x0, vh = Math.max(...ys) + pad - y0, fs = vw / 50;
  const turn = (d: number) => setA(v => (v + d + 360) % 360);
  const grid: React.ReactNode[] = [];
  for (let m = 100; m < W; m += 100) grid.push(<polyline key={'x' + m} points={`${P(m, 0, 0)} ${P(m, H, 0)}`} stroke="var(--color-border)" fill="none" strokeWidth={fs / 12} />);
  for (let m = 100; m < H; m += 100) grid.push(<polyline key={'y' + m} points={`${P(0, m, 0)} ${P(W, m, 0)}`} stroke="var(--color-border)" fill="none" strokeWidth={fs / 12} />);
  return (
    <div className="space-y-2">
      <svg viewBox={`${x0} ${y0} ${vw} ${vh}`} role="group" aria-label="Кабинеттің 3D көрінісі" className="w-full select-none rounded-lg border border-border bg-surface" style={{ touchAction: 'pan-y', maxHeight: '70vh', cursor: 'grab' }}
        onPointerDown={e => { drag.current = e.clientX; }}
        onPointerMove={e => { if (drag.current !== null && Math.abs(e.clientX - drag.current) > 3) { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); turn((e.clientX - drag.current) * 0.6); drag.current = e.clientX; } }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <polygon points={[[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => P(x, y, 0)).join(' ')} fill="var(--color-surface-2)" stroke="var(--color-border-input)" strokeWidth={fs / 8} />
        {grid}
        {boxes.map(({ e }) => {
          const h = st.EL_TYPES[e.t].hue, z = st.zOf(e), X0 = e.x * cm, X1 = (e.x + e.w) * cm, Y0 = e.y * cm, Y1 = (e.y + e.h) * cm;
          const cor: [number, number][] = [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]], nor: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
          const item = items.find(i => i.id === e.item_id), name = e.label || st.EL_TYPES[e.t].name, [tx, ty] = pt((X0 + X1) / 2, (Y0 + Y1) / 2, z);
          return (
            <g key={e.id} role={item && onItem ? 'button' : 'img'} aria-label={`${st.EL_TYPES[e.t].name}: ${name}`} tabIndex={item && onItem ? 0 : undefined} style={{ cursor: item && onItem ? 'pointer' : 'inherit', outline: 'none' }}
              onClick={item && onItem ? () => onItem(item.id) : undefined} onKeyUp={item && onItem ? k => { if (k.key === 'Enter') onItem(item.id); } : undefined}>
              <title>{name} · {e.w * cm}×{e.h * cm}×{z} см</title>
              {cor.map(([ax, ay], i) => {
                const [bx, by] = cor[(i + 1) % 4], [nx, ny] = nor[i], nu = nx * cs - ny * sn, nv = nx * sn + ny * cs;
                if (nu + nv <= 0) return null;
                return <polygon key={i} points={`${P(ax, ay, 0)} ${P(bx, by, 0)} ${P(bx, by, z)} ${P(ax, ay, z)}`} fill={`hsl(${h} 55% ${66 + 10 * (nu - nv)}%)`} stroke={`hsl(${h} 55% 30%)`} strokeWidth={fs / 14} strokeLinejoin="round" />;
              })}
              <polygon points={cor.map(([x, y]) => P(x, y, z)).join(' ')} fill={`hsl(${h} 80% 90%)`} stroke={`hsl(${h} 55% 30%)`} strokeWidth={fs / 14} strokeLinejoin="round" />
              {e.w * e.h >= 2 && <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight="600" fill={`hsl(${h} 60% 20%)`} stroke="white" strokeWidth={fs / 5} paintOrder="stroke">{name}</text>}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => turn(-45)} aria-label="Солға бұру"><RotateCcw size={16} aria-hidden="true" /></Button>
        <input type="range" min={0} max={359} value={a} onChange={e => setA(+e.target.value)} aria-label="Бұрыш" className="min-w-[8rem] flex-1" />
        <Button variant="secondary" onClick={() => turn(45)} aria-label="Оңға бұру"><RotateCw size={16} aria-hidden="true" /></Button>
      </div>
      <p className="text-xs text-text-secondary">Тышқанмен немесе саусақпен солға-оңға сүйреп айналдырыңыз. Биіктігі шамамен: парта 75 см, шкаф 180 см, есік 200 см.</p>
    </div>
  );
}

const ModeSwitch = ({ v, set }: { v: boolean; set: (v: boolean) => void }) => (
  <div role="group" aria-label="Көрініс" className="inline-flex rounded-lg bg-surface-2 p-1">
    {([[false, '2D жоспар'], [true, '3D']] as const).map(([k, label]) => <button key={label} type="button" aria-pressed={v === k} onClick={() => set(k)} className={`min-h-[40px] rounded-md px-3 text-sm font-medium ${v === k ? 'bg-surface text-on-accent-soft shadow-card' : 'text-text-secondary'}`}>{label}</button>)}
  </div>
);

/** Whole number field that commits on blur/Enter, so typing "100" is not rounded after "1". */
function NumField({ value, onCommit, label }: { value: number; onCommit: (n: number) => void; label: string }) {
  const [t, setT] = useState<string | null>(null);
  const done = () => { if (t !== null) { const n = Number(t); if (t.trim() && Number.isFinite(n)) onCommit(n); setT(null); } };
  return <Field label={label}>{x => <input id={x} inputMode="numeric" className={inputCls} value={t ?? String(value)} onChange={e => setT(e.target.value)} onBlur={done} onKeyDown={e => { if (e.key === 'Enter') done(); }} />}</Field>;
}

export function PlanView({ layout, items, onItem }: { layout: Layout; items: Item[]; onItem: (id: string) => void }) {
  const used = [...new Set(layout.els.map(e => e.t))], [d3, setD3] = useState(false);
  return (
    <section aria-label="Кабинет схемасы" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Кабинет схемасы</h3><ModeSwitch v={d3} set={setD3} /></div>
      <p className="text-sm text-text-secondary">{sizeText(layout)}</p>
      {d3 ? <Plan3D layout={layout} items={items} onItem={onItem} /> : <Svg layout={layout} items={items} on={{ pick: e => e.item_id && onItem(e.item_id) }} />}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">{used.map(t => <span key={t} className="inline-flex items-center gap-1"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm border" style={{ background: col(t).fill, borderColor: col(t).line }} />{st.EL_TYPES[t].name}</span>)}
        {layout.els.some(e => e.item_id) && <span>Жабдыққа байланған зат басылғанда карточкасы ашылады.</span>}</p>
    </section>
  );
}

export function PlanEditor({ layout, items, set }: { layout: Layout | null; items: Item[]; set: (l: Layout | null) => void }) {
  const ref = useRef<SVGSVGElement>(null), drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [sel, setSel] = useState(''), [rows, setRows] = useState('3'), [cols, setCols] = useState('4'), [d3, setD3] = useState(false);
  if (!layout) return <div className="space-y-2"><h3 className="font-semibold">Кабинет схемасы</h3><p className="text-sm text-text-secondary">Схема әлі жоқ: парта, компьютер, тақта, есік орындарын торға қойып сызыңыз.</p><Button variant="secondary" onClick={() => set(st.blankLayout())}><LayoutGrid size={16} aria-hidden="true" />Схема сызу</Button></div>;
  const upd = (id: string, p: Partial<El>) => set({ ...layout, els: layout.els.map(e => (e.id === id ? { ...e, ...p } : e)) });
  const fit = (e: El, x: number, y: number) => ({ x: Math.min(Math.max(0, x), layout.w - e.w), y: Math.min(Math.max(0, y), layout.h - e.h) });
  const add = (t: ElType) => { const d = st.EL_TYPES[t], e: El = { id: uid(), t, x: 0, y: 0, w: Math.min(d.w, layout.w), h: Math.min(d.h, layout.h), label: t === 'other' ? '' : undefined }; set({ ...layout, els: [...layout.els, e] }); setSel(e.id); };
  const grid = () => { // a block of desks, e.g. the rows of a computer class
    const r = Math.min(Math.max(+rows || 1, 1), 15), c = Math.min(Math.max(+cols || 1, 1), 15), els: El[] = [];
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) { const x = 1 + j * 3, y = 3 + i * 2; if (x + 2 <= layout.w && y + 1 <= layout.h) els.push({ id: uid(), t: 'desk', x, y, w: 2, h: 1 }); }
    set({ ...layout, els: [...layout.els, ...els] });
  };
  const size = (k: 'w' | 'h', v: number) => { const n = Math.min(Math.max(Number.isFinite(v) ? Math.round(v) : 6, 6), k === 'w' ? 40 : 30); set({ ...layout, [k]: n, els: layout.els.map(e => ({ ...e, ...(k === 'w' ? { x: Math.min(e.x, Math.max(0, n - e.w)), w: Math.min(e.w, n) } : { y: Math.min(e.y, Math.max(0, n - e.h)), h: Math.min(e.h, n) }) })) }); };
  const cell = (ev: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(), k = r.width / layout.w; return { x: (ev.clientX - r.left) / k, y: (ev.clientY - r.top) / k }; };
  const down = (ev: React.PointerEvent, e: El) => { ev.preventDefault(); setSel(e.id); const p = cell(ev); drag.current = { id: e.id, dx: p.x - e.x, dy: p.y - e.y }; (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId); };
  const move = (ev: React.PointerEvent) => { const d = drag.current; if (!d) return; const e = layout.els.find(x => x.id === d.id); if (!e) return; const p = cell(ev), n = fit(e, Math.round(p.x - d.dx), Math.round(p.y - d.dy)); if (n.x !== e.x || n.y !== e.y) upd(e.id, n); };
  const key = (ev: React.KeyboardEvent, e: El) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
    if (d) { ev.preventDefault(); upd(e.id, fit(e, e.x + d[0], e.y + d[1])); } else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); set({ ...layout, els: layout.els.filter(x => x.id !== e.id) }); setSel(''); }
  };
  const cur = layout.els.find(e => e.id === sel);
  const rotate = (e: El) => { const w = e.h, h = e.w, n = fit({ ...e, w, h }, e.x, e.y); upd(e.id, { w: Math.min(w, layout.w), h: Math.min(h, layout.h), ...n }); };
  const copy = (e: El) => { const n = { ...e, id: uid(), ...fit(e, e.x + 1, e.y + 1) }; set({ ...layout, els: [...layout.els, n] }); setSel(n.id); };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2"><h3 className="font-semibold">Кабинет схемасы</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="1 тор (см)">{x => <select id={x} className={inputCls + ' !w-24'} value={st.cmOf(layout)} onChange={e => set({ ...layout, cm: +e.target.value })}>{st.CELLS_CM.map(c => <option key={c} value={c}>{c} см</option>)}</select>}</Field>
          <Field label="Ені (тор)">{x => <input id={x} type="number" min={6} max={40} className={inputCls + ' !w-20'} value={layout.w} onChange={e => size('w', +e.target.value)} />}</Field>
          <Field label="Ұзындығы (тор)">{x => <input id={x} type="number" min={6} max={30} className={inputCls + ' !w-20'} value={layout.h} onChange={e => size('h', +e.target.value)} />}</Field>
          <Button variant="ghost" onClick={() => { set(null); setSel(''); }}><Trash2 size={16} aria-hidden="true" />Схеманы жою</Button></div></div>
      <div role="toolbar" aria-label="Схемаға қосу" className="flex flex-wrap gap-2">
        {(Object.keys(st.EL_TYPES) as ElType[]).map(t => <button key={t} type="button" onClick={() => add(t)} className="min-h-[40px] rounded-md border px-3 text-sm font-medium" style={{ background: col(t).fill, borderColor: col(t).line, color: col(t).text }}>+ {st.EL_TYPES[t].name}</button>)}
      </div>
      <div className="flex flex-wrap items-end gap-2"><Field label="Парта қатары">{x => <input id={x} type="number" min={1} max={15} className={inputCls + ' !w-20'} value={rows} onChange={e => setRows(e.target.value)} />}</Field>
        <Field label="Бағанасы">{x => <input id={x} type="number" min={1} max={15} className={inputCls + ' !w-20'} value={cols} onChange={e => setCols(e.target.value)} />}</Field>
        <Button variant="secondary" onClick={grid}>Парта торын қосу</Button></div>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-text-secondary">{sizeText(layout)}</p><ModeSwitch v={d3} set={setD3} /></div>
      {d3 ? <Plan3D layout={layout} items={items} /> : <div onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <Svg layout={layout} sel={sel} items={items} svgRef={ref} on={{ down, key, bg: () => setSel('') }} />
      </div>}
      <p className="text-xs text-text-secondary">Затты тышқанмен немесе саусақпен жылжытыңыз. Пернетақтамен: бұрыш пернелері — жылжыту, Delete — өшіру.</p>
      {cur ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">{st.EL_TYPES[cur.t].name} <span className="font-normal text-text-secondary">· ені мен ұзындығы {st.cmOf(layout)} см-ге дөңгелектеледі</span></p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Жазу">{x => <input id={x} className={inputCls} maxLength={40} value={cur.label ?? ''} onChange={e => upd(cur.id, { label: e.target.value })} />}</Field>
            <NumField label="Ені (см)" value={cur.w * st.cmOf(layout)} onCommit={n => upd(cur.id, { w: Math.min(Math.max(1, Math.round(n / st.cmOf(layout))), layout.w - cur.x) })} />
            <NumField label="Ұзындығы (см)" value={cur.h * st.cmOf(layout)} onCommit={n => upd(cur.id, { h: Math.min(Math.max(1, Math.round(n / st.cmOf(layout))), layout.h - cur.y) })} />
            <NumField label="Биіктігі (см)" value={st.zOf(cur)} onCommit={n => upd(cur.id, { z: Math.min(Math.max(10, Math.round(n)), 400) })} />
            <Field label="Жабдыққа байлау">{x => <select id={x} className={inputCls} value={cur.item_id ?? ''} onChange={e => upd(cur.id, { item_id: e.target.value || undefined })}><option value="">Байланбаған</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>}</Field>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => rotate(cur)}><RotateCw size={16} aria-hidden="true" />Бұру</Button><Button variant="secondary" onClick={() => copy(cur)}><Copy size={16} aria-hidden="true" />Көшіру</Button>
            <Button variant="ghost" onClick={() => { set({ ...layout, els: layout.els.filter(x => x.id !== cur.id) }); setSel(''); }}><Trash2 size={16} aria-hidden="true" />Өшіру</Button></div>
        </div>
      ) : <p className="text-sm text-text-secondary">Өзгерту үшін схемадағы затты басыңыз.</p>}
    </div>
  );
}
