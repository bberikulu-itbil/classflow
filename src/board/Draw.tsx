import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Eraser, Highlighter, Pencil, Square, Trash2, Undo2, X } from 'lucide-react';
import { DockBtn } from './Win';

export type Tool = 'pen' | 'marker' | 'eraser' | 'arrow' | 'rect';
export type Bg = 'clear' | 'white' | 'grid' | 'dark';
export type Pen = { tool: Tool; color: string; width: number; bg: Bg };
export type Stroke = { tool: Tool; color: string; width: number; pts: number[][] };

const lw = (s: Stroke) => (s.tool === 'marker' ? s.width * 4 : s.tool === 'eraser' ? s.width * 5 : s.width);
function paint(c: CanvasRenderingContext2D, s: Stroke) {
  const p = s.pts; if (!p.length) return;
  const a = p[0], b = p[p.length - 1];
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = lw(s); c.strokeStyle = s.color;
  if (s.tool === 'eraser') c.globalCompositeOperation = 'destination-out';
  if (s.tool === 'marker') c.globalAlpha = 0.35;
  c.beginPath();
  if (s.tool === 'rect') c.rect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  else if (s.tool === 'arrow') {
    c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
    const g = Math.atan2(b[1] - a[1], b[0] - a[0]), h = 12 + s.width * 3;
    for (const d of [-0.45, 0.45]) { c.moveTo(b[0], b[1]); c.lineTo(b[0] - h * Math.cos(g + d), b[1] - h * Math.sin(g + d)); }
  } else {
    c.moveTo(a[0], a[1]); if (p.length === 1) c.lineTo(a[0] + 0.01, a[1]);
    for (let i = 1; i < p.length; i++) c.quadraticCurveTo(p[i - 1][0], p[i - 1][1], (p[i - 1][0] + p[i][0]) / 2, (p[i - 1][1] + p[i][1]) / 2);
    c.lineTo(b[0], b[1]);
  }
  c.stroke(); c.restore();
}

const BG: Record<Bg, React.CSSProperties> = {
  clear: {}, white: { background: '#fff' }, dark: { background: '#0b1220' },
  grid: { backgroundColor: '#fff', backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' },
};

/** Full-screen canvas over the slide. Strokes are data (so undo and resize are exact); the eraser cuts through to whatever is behind. */
export function DrawLayer({ pen, strokes, onCommit }: { pen: Pen; strokes: Stroke[]; onCommit: (s: Stroke) => void }) {
  const cv = useRef<HTMLCanvasElement>(null), cur = useRef<Stroke | null>(null), all = useRef(strokes);
  all.current = strokes;
  const ctx = () => { const c = cv.current!, x = c.getContext('2d')!, d = window.devicePixelRatio || 1; x.setTransform(d, 0, 0, d, 0, 0); return x; };
  const repaint = () => {
    const c = cv.current; if (!c) return;
    const x = c.getContext('2d')!; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    const g = ctx(); all.current.forEach(s => paint(g, s)); if (cur.current) paint(g, cur.current);
  };
  const fit = () => { const c = cv.current!, d = window.devicePixelRatio || 1; c.width = Math.round(window.innerWidth * d); c.height = Math.round(window.innerHeight * d); repaint(); };
  useEffect(() => { fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }, []);
  useEffect(repaint, [strokes]);
  const pt = (e: React.PointerEvent) => [e.clientX, e.clientY];
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cur.current = { tool: pen.tool, color: pen.color, width: pen.width, pts: [pt(e)] }; repaint();
  };
  const move = (e: React.PointerEvent) => {
    const s = cur.current; if (!s || !e.isPrimary) return;
    if (s.tool === 'arrow' || s.tool === 'rect') { s.pts = [s.pts[0], pt(e)]; repaint(); return; }
    s.pts.push(pt(e));
    if (s.tool === 'marker') repaint(); else paint(ctx(), { ...s, pts: s.pts.slice(-2) });
  };
  const up = () => { const s = cur.current; cur.current = null; if (s) onCommit(s); };
  return <canvas ref={cv} role="img" aria-label="Сызу беті" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    style={BG[pen.bg]} className={`fixed inset-0 z-30 h-full w-full touch-none ${pen.tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`} />;
}

const TOOLS: { t: Tool; n: string; i: React.ReactNode }[] = [
  { t: 'pen', n: 'Қалам', i: <Pencil size={22} /> }, { t: 'marker', n: 'Маркер', i: <Highlighter size={22} /> }, { t: 'eraser', n: 'Өшіргіш', i: <Eraser size={22} /> },
  { t: 'arrow', n: 'Көрсеткі', i: <ArrowUpRight size={22} /> }, { t: 'rect', n: 'Жақтау', i: <Square size={22} /> },
];
const COLORS = [['Ақ', '#ffffff'], ['Сары', '#facc15'], ['Қызыл', '#ef4444'], ['Жасыл', '#22c55e'], ['Көк', '#38bdf8'], ['Қара', '#111827']];
const WIDTHS = [['Жіңішке', 3, 6], ['Орташа', 6, 12], ['Жуан', 12, 20]] as const;
const BGS: [Bg, string][] = [['clear', 'Слайд'], ['white', 'Ақ'], ['grid', 'Тор'], ['dark', 'Қара']];
const Sep = () => <span aria-hidden="true" className="mx-1 hidden h-8 w-px bg-border sm:block" />;

export function DrawBar({ pen, set, canUndo, undo, clear, close, nav }: { pen: Pen; set: (p: Pen) => void; canUndo: boolean; undo: () => void; clear: () => void; close: () => void; nav: { prev?: () => void; next?: () => void } }) {
  return (
    <>
      <DockBtn label="Жабу" onClick={close}><X size={22} /></DockBtn>
      <DockBtn label="Артқа" disabled={!nav.prev} onClick={() => nav.prev?.()}><ArrowLeft size={22} /></DockBtn>
      <DockBtn label="Алға" strong disabled={!nav.next} onClick={() => nav.next?.()}><ArrowRight size={22} /></DockBtn><Sep />
      {TOOLS.map(x => <DockBtn key={x.t} label={x.n} pressed={pen.tool === x.t} onClick={() => set({ ...pen, tool: x.t })}>{x.i}</DockBtn>)}<Sep />
      <div role="group" aria-label="Түс" className="flex">
        {COLORS.map(([n, c]) => (
          <button key={c} type="button" aria-label={n} aria-pressed={pen.color === c} onClick={() => set({ ...pen, color: c })} className="flex h-11 w-11 items-center justify-center">
            <span className={`h-7 w-7 rounded-full border border-border ${pen.color === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`} style={{ background: c }} />
          </button>
        ))}
      </div><Sep />
      <div role="group" aria-label="Қалыңдық" className="flex">
        {WIDTHS.map(([n, w, d]) => (
          <button key={n} type="button" aria-label={n} aria-pressed={pen.width === w} onClick={() => set({ ...pen, width: w })} className={`flex h-11 w-11 items-center justify-center rounded-lg ${pen.width === w ? 'bg-accent text-on-accent' : 'text-text hover:bg-surface-2'}`}>
            <span className="rounded-full bg-current" style={{ width: d, height: d }} />
          </button>
        ))}
      </div><Sep />
      <div role="group" aria-label="Фон" className="flex">
        {BGS.map(([b, n]) => <button key={b} type="button" aria-pressed={pen.bg === b} onClick={() => set({ ...pen, bg: b })} className={`min-h-[44px] rounded-lg px-3 text-sm font-medium ${pen.bg === b ? 'bg-accent text-on-accent' : 'text-text hover:bg-surface-2'}`}>{n}</button>)}
      </div><Sep />
      <DockBtn label="Қайтару" disabled={!canUndo} onClick={undo}><Undo2 size={22} /></DockBtn>
      <DockBtn label="Тазарту" disabled={!canUndo} onClick={clear}><Trash2 size={22} /></DockBtn>
    </>
  );
}
