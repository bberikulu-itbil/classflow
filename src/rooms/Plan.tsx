import React, { useRef, useState } from 'react';
import { Copy, LayoutGrid, RotateCw, Trash2 } from 'lucide-react';
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
            <title>{name}{item ? ` — ${item.name}, ${item.qty} дана` : ''}</title>
            <svg x={e.x * C} y={e.y * C} width={e.w * C} height={e.h * C}>
              <rect x="1.5" y="1.5" width={e.w * C - 3} height={e.h * C - 3} rx="5" fill={c.fill} stroke={sel === e.id ? 'var(--color-accent)' : c.line} strokeWidth={sel === e.id ? 3 : 1.5} />
              <text x={e.w * C / 2} y={e.h * C / 2} transform={e.h > e.w ? `rotate(-90 ${e.w * C / 2} ${e.h * C / 2})` : undefined} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill={c.text}>{name}</text>
            </svg>
          </g>
        );
      })}
    </svg>
  );
}

export function PlanView({ layout, items, onItem }: { layout: Layout; items: Item[]; onItem: (id: string) => void }) {
  const used = [...new Set(layout.els.map(e => e.t))];
  return (
    <section aria-label="Кабинет схемасы" className="space-y-2">
      <h3 className="font-semibold">Кабинет схемасы</h3>
      <Svg layout={layout} items={items} on={{ pick: e => e.item_id && onItem(e.item_id) }} />
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">{used.map(t => <span key={t} className="inline-flex items-center gap-1"><span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm border" style={{ background: col(t).fill, borderColor: col(t).line }} />{st.EL_TYPES[t].name}</span>)}
        {layout.els.some(e => e.item_id) && <span>Жабдыққа байланған зат басылғанда карточкасы ашылады.</span>}</p>
    </section>
  );
}

export function PlanEditor({ layout, items, set }: { layout: Layout | null; items: Item[]; set: (l: Layout | null) => void }) {
  const ref = useRef<SVGSVGElement>(null), drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [sel, setSel] = useState(''), [rows, setRows] = useState('3'), [cols, setCols] = useState('4');
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
          <Field label="Ені (тор)">{x => <input id={x} type="number" min={6} max={40} className={inputCls + ' !w-20'} value={layout.w} onChange={e => size('w', +e.target.value)} />}</Field>
          <Field label="Ұзындығы (тор)">{x => <input id={x} type="number" min={6} max={30} className={inputCls + ' !w-20'} value={layout.h} onChange={e => size('h', +e.target.value)} />}</Field>
          <Button variant="ghost" onClick={() => { set(null); setSel(''); }}><Trash2 size={16} aria-hidden="true" />Схеманы жою</Button></div></div>
      <div role="toolbar" aria-label="Схемаға қосу" className="flex flex-wrap gap-2">
        {(Object.keys(st.EL_TYPES) as ElType[]).map(t => <button key={t} type="button" onClick={() => add(t)} className="min-h-[40px] rounded-md border px-3 text-sm font-medium" style={{ background: col(t).fill, borderColor: col(t).line, color: col(t).text }}>+ {st.EL_TYPES[t].name}</button>)}
      </div>
      <div className="flex flex-wrap items-end gap-2"><Field label="Парта қатары">{x => <input id={x} type="number" min={1} max={15} className={inputCls + ' !w-20'} value={rows} onChange={e => setRows(e.target.value)} />}</Field>
        <Field label="Бағанасы">{x => <input id={x} type="number" min={1} max={15} className={inputCls + ' !w-20'} value={cols} onChange={e => setCols(e.target.value)} />}</Field>
        <Button variant="secondary" onClick={grid}>Парта торын қосу</Button></div>
      <div onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <Svg layout={layout} sel={sel} items={items} svgRef={ref} on={{ down, key, bg: () => setSel('') }} />
      </div>
      <p className="text-xs text-text-secondary">Затты тышқанмен немесе саусақпен жылжытыңыз. Пернетақтамен: бұрыш пернелері — жылжыту, Delete — өшіру.</p>
      {cur ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">{st.EL_TYPES[cur.t].name}</p>
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_2fr]">
            <Field label="Жазу">{x => <input id={x} className={inputCls} maxLength={40} value={cur.label ?? ''} onChange={e => upd(cur.id, { label: e.target.value })} />}</Field>
            <Field label="Ені">{x => <input id={x} type="number" min={1} max={layout.w - cur.x} className={inputCls} value={cur.w} onChange={e => upd(cur.id, { w: Math.min(Math.max(1, +e.target.value || 1), layout.w - cur.x) })} />}</Field>
            <Field label="Ұзындығы">{x => <input id={x} type="number" min={1} max={layout.h - cur.y} className={inputCls} value={cur.h} onChange={e => upd(cur.id, { h: Math.min(Math.max(1, +e.target.value || 1), layout.h - cur.y) })} />}</Field>
            <Field label="Жабдыққа байлау">{x => <select id={x} className={inputCls} value={cur.item_id ?? ''} onChange={e => upd(cur.id, { item_id: e.target.value || undefined })}><option value="">Байланбаған</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>}</Field>
          </div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => rotate(cur)}><RotateCw size={16} aria-hidden="true" />Бұру</Button><Button variant="secondary" onClick={() => copy(cur)}><Copy size={16} aria-hidden="true" />Көшіру</Button>
            <Button variant="ghost" onClick={() => { set({ ...layout, els: layout.els.filter(x => x.id !== cur.id) }); setSel(''); }}><Trash2 size={16} aria-hidden="true" />Өшіру</Button></div>
        </div>
      ) : <p className="text-sm text-text-secondary">Өзгерту үшін схемадағы затты басыңыз.</p>}
    </div>
  );
}
