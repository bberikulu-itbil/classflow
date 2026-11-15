import React, { useRef, useState } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { Button } from '../ui';
import * as st from './store';
import type { Item, Layout } from './store';
import { elParts, hsl, parseHex, wallGeo, wallPieces, type Piece, type Pt } from './geom';

type WallMode = 'full' | 'cut' | 'off';
const WALL_MODES: [WallMode, string][] = [['full', 'Толық'], ['cut', 'Алдыңғысы төмен'], ['off', 'Қабырғасыз']];

/** Isometric 3D with plain SVG (no library): boxes of real size and simple models, painter's order, drag or buttons to turn. */
export function Plan3D({ layout, items, onItem }: { layout: Layout; items: Item[]; onItem?: (id: string) => void }) {
  const [a, setA] = useState(35), [wm, setWm] = useState<WallMode>('cut'), drag = useRef<number | null>(null);
  const W = layout.w, H = layout.h, th = a * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th), walls = layout.walls ?? [];
  const uv = (x: number, y: number): [number, number] => [(x - W / 2) * cs - (y - H / 2) * sn, (x - W / 2) * sn + (y - H / 2) * cs];
  const pt = (x: number, y: number, z: number) => { const [u, v] = uv(x, y); return [(u - v) * 0.866, (u + v) * 0.5 - z] as const; };
  const P = (x: number, y: number, z: number) => pt(x, y, z).map(n => n.toFixed(1)).join(',');
  const depth = (x: number, y: number) => { const [u, v] = uv(x, y); return u + v; };
  type G = { key: string; d: number; el?: st.El; pieces: Piece[] };
  const groups: G[] = layout.els.map(e => ({ key: e.id, d: depth(e.x + e.w / 2, e.y + e.h / 2), el: e, pieces: elParts(e) }));
  if (wm !== 'off') for (const w of walls) {
    const m = wallGeo(w).mid, cap = wm === 'cut' && depth(m.x, m.y) > 0 ? 40 : undefined;
    wallPieces(w, cap).forEach((p, i) => groups.push({ key: `${w.id}:${i}`, d: depth(...centre(p.poly)), pieces: [p] }));
  }
  groups.sort((p, q) => p.d - q.d);
  const xs: number[] = [], ys: number[] = [];
  for (const [x, y] of [[0, 0], [W, 0], [W, H], [0, H]]) { const [px, py] = pt(x, y, 0); xs.push(px); ys.push(py); }
  for (const g of groups) for (const p of g.pieces) for (const q of p.poly) { const [px, py] = pt(q.x, q.y, p.z1); xs.push(px); ys.push(py); }
  const pad = 30, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, vw = Math.max(...xs) + pad - x0, vh = Math.max(...ys) + pad - y0, fs = vw / 55;
  const turn = (d: number) => setA(v => (v + d + 360) % 360);
  const grid: React.ReactNode[] = [];
  for (let m = 100; m < W; m += 100) grid.push(<polyline key={'x' + m} points={`${P(m, 0, 0)} ${P(m, H, 0)}`} stroke="var(--color-border)" fill="none" strokeWidth={fs / 12} />);
  for (let m = 100; m < H; m += 100) grid.push(<polyline key={'y' + m} points={`${P(0, m, 0)} ${P(W, m, 0)}`} stroke="var(--color-border)" fill="none" strokeWidth={fs / 12} />);
  const floor = parseHex(layout.fc);

  // A box: top face plus the side faces that look towards the viewer (normal pointing to +u,+v).
  const prism = (k: string, p: Piece) => {
    const n = p.poly.length, c = centre(p.poly), nodes: React.ReactNode[] = [], line = hsl(p.c, -32), sw = fs / 14;
    for (let i = 0; i < n; i++) {
      const A = p.poly[i], B = p.poly[(i + 1) % n];
      let nx = B.y - A.y, ny = A.x - B.x; const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
      if (nx * ((A.x + B.x) / 2 - c[0]) + ny * ((A.y + B.y) / 2 - c[1]) < 0) { nx = -nx; ny = -ny; }
      const nu = nx * cs - ny * sn, nv = nx * sn + ny * cs;
      if (nu + nv <= 0) continue;
      nodes.push(<polygon key={i} points={`${P(A.x, A.y, p.z0)} ${P(B.x, B.y, p.z0)} ${P(B.x, B.y, p.z1)} ${P(A.x, A.y, p.z1)}`} fill={hsl(p.c, 7 * (nu - nv))} fillOpacity={p.op} stroke={line} strokeWidth={sw} strokeLinejoin="round" />);
    }
    nodes.push(<polygon key="t" points={p.poly.map(q => P(q.x, q.y, p.z1)).join(' ')} fill={hsl(p.c, 20)} fillOpacity={p.op} stroke={line} strokeWidth={sw} strokeLinejoin="round" />);
    return <React.Fragment key={k}>{nodes}</React.Fragment>;
  };
  return (
    <div className="space-y-2">
      <svg viewBox={`${x0} ${y0} ${vw} ${vh}`} role="group" aria-label="Кабинеттің 3D көрінісі" className="w-full select-none rounded-lg border border-border bg-surface" style={{ touchAction: 'pan-y', maxHeight: '70vh', cursor: 'grab' }}
        onPointerDown={e => { drag.current = e.clientX; }}
        onPointerMove={e => { if (drag.current !== null && Math.abs(e.clientX - drag.current) > 3) { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); turn((e.clientX - drag.current) * 0.6); drag.current = e.clientX; } }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <polygon points={[[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => P(x, y, 0)).join(' ')} fill={floor ? hsl(floor) : 'var(--color-surface-2)'} stroke="var(--color-border-input)" strokeWidth={fs / 8} />
        {grid}
        {groups.map(g => {
          const e = g.el, item = e && items.find(i => i.id === e.item_id), name = e ? e.label || st.EL_TYPES[e.t].name : '', act = !!(item && onItem);
          if (!e) return prism(g.key, g.pieces[0]);
          const [tx, ty] = pt(e.x + e.w / 2, e.y + e.h / 2, st.zOf(e));
          return (
            <g key={g.key} role={act ? 'button' : 'img'} aria-label={`${st.EL_TYPES[e.t].name}: ${name}`} tabIndex={act ? 0 : undefined} style={{ cursor: act ? 'pointer' : 'inherit', outline: 'none' }}
              onClick={act ? () => onItem!(item!.id) : undefined} onKeyUp={act ? k => { if (k.key === 'Enter') onItem!(item!.id); } : undefined}>
              <title>{name} · {e.w}×{e.h}×{st.zOf(e)} см</title>
              {[...g.pieces].sort((p, q) => depth(...centre(p.poly)) - depth(...centre(q.poly)) || p.z0 - q.z0).map((p, i) => prism(String(i), p))}
              {e.w * e.h >= 6000 && e.label && <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight="600" fill="#1f2937" stroke="white" strokeWidth={fs / 5} paintOrder="stroke">{name}</text>}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => turn(-45)} aria-label="Солға бұру"><RotateCcw size={16} aria-hidden="true" /></Button>
        <input type="range" min={0} max={359} value={Math.round(a)} onChange={e => setA(+e.target.value)} aria-label="Бұрыш" className="min-w-[8rem] flex-1" />
        <Button variant="secondary" onClick={() => turn(45)} aria-label="Оңға бұру"><RotateCw size={16} aria-hidden="true" /></Button>
        {walls.length > 0 && <div role="group" aria-label="Қабырғалар" className="inline-flex rounded-lg bg-surface-2 p-1">
          {WALL_MODES.map(([k, label]) => <button key={k} type="button" aria-pressed={wm === k} onClick={() => setWm(k)} className={`min-h-[40px] rounded-md px-3 text-sm font-medium ${wm === k ? 'bg-surface text-on-accent-soft shadow-card' : 'text-text-secondary'}`}>{label}</button>)}
        </div>}
      </div>
      <p className="text-xs text-text-secondary">Тышқанмен немесе саусақпен солға-оңға сүйреп айналдырыңыз. «Алдыңғысы төмен» — камераға жақын қабырғалар ішін жаппайды.</p>
    </div>
  );
}
const centre = (poly: Pt[]): [number, number] => [poly.reduce((a, p) => a + p.x, 0) / poly.length, poly.reduce((a, p) => a + p.y, 0) / poly.length];
