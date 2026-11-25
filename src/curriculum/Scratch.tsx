// Scratch paper for exams (088): small sheets to draw on with a finger, pen or mouse. Nothing can be erased; a new sheet
// can be started (up to 10). A stroke is a flat list of points [x1, y1, x2, y2, …] on a 360 × 260 sheet.
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FilePlus2, PenLine, X } from 'lucide-react';

export const SHEET_W = 360, SHEET_H = 260, MAX_SHEETS = 10;
export type Sheet = number[][];
const INK = '#1A1D4C';

const path = (s: number[]) => s.length < 4 ? `M${s[0]},${s[1]} l0.1,0` : 'M' + s.reduce<string[]>((a, v, i) => (i % 2 ? a : [...a, `${v},${s[i + 1]}`]), []).join(' L');

/** A sheet as a picture (the teacher's view and the pages already full). */
export function ScratchView({ sheet, className = '' }: { sheet: Sheet; className?: string }) {
  return (
    <svg viewBox={`0 0 ${SHEET_W} ${SHEET_H}`} className={`rounded-lg border border-border bg-white ${className}`} role="img" aria-label={`Шимай: ${sheet.length} сызық`}>
      {sheet.map((s, i) => <path key={i} d={path(s)} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
}

/** The floating scratch panel. `onChange(i, sheet)` gets a sheet after every stroke; the caller saves it. */
export function ScratchPad({ sheets: init, onChange }: { sheets: Sheet[]; onChange: (i: number, sheet: Sheet) => void }) {
  const [open, setOpen] = useState(false);
  const [sheets, setSheets] = useState<Sheet[]>(init.length ? init : [[]]);
  const [at, setAt] = useState(Math.max(0, init.length - 1));
  const [live, setLive] = useState<number[] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => { if (init.length) { setSheets(init); setAt(init.length - 1); } }, [init]);

  const pt = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * SHEET_W), Math.round(((e.clientY - r.top) / r.height) * SHEET_H)];
  };
  const down = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); setLive(pt(e)); };
  const move = (e: React.PointerEvent) => {
    if (!live) return;
    const [x, y] = pt(e), n = live.length;
    if (Math.abs(x - live[n - 2]) + Math.abs(y - live[n - 1]) >= 3) setLive([...live, x, y]); // skip tiny moves: smaller sheets
  };
  const up = () => {
    if (!live) return;
    const next = sheets.map((s, i) => (i === at ? [...s, live] : s));
    setSheets(next); setLive(null); onChange(at, next[at]);
  };
  const add = () => { if (sheets.length >= MAX_SHEETS) return; setSheets([...sheets, []]); setAt(sheets.length); };

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-4 right-4 z-40 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-text px-5 font-bold text-bg shadow-pop cursor-pointer">
      <PenLine size={18} aria-hidden="true" />Шимай қағаз</button>
  );
  return (
    <section aria-label="Шимай қағаз" className="fixed bottom-3 right-3 z-40 w-[min(384px,calc(100vw-24px))] space-y-2 rounded-2xl border border-border bg-surface p-3 shadow-pop">
      <div className="flex items-center gap-1">
        <b className="mr-auto text-sm">Шимай қағаз</b>
        <button type="button" onClick={() => setAt(a => Math.max(0, a - 1))} disabled={at === 0} aria-label="Алдыңғы парақ" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30 cursor-pointer"><ChevronLeft size={18} aria-hidden="true" /></button>
        <span className="min-w-[3.5rem] text-center text-sm tabular-nums" aria-live="polite">{at + 1} / {sheets.length}</span>
        <button type="button" onClick={() => setAt(a => Math.min(sheets.length - 1, a + 1))} disabled={at >= sheets.length - 1} aria-label="Келесі парақ" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2 disabled:opacity-30 cursor-pointer"><ChevronRight size={18} aria-hidden="true" /></button>
        <button type="button" onClick={add} disabled={sheets.length >= MAX_SHEETS} className="inline-flex h-9 items-center gap-1 rounded-lg bg-accent-soft px-2 text-sm font-semibold text-on-accent-soft disabled:opacity-40 cursor-pointer"><FilePlus2 size={16} aria-hidden="true" />Жаңа</button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Жасыру" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2 cursor-pointer"><X size={18} aria-hidden="true" /></button>
      </div>
      <svg ref={svg} viewBox={`0 0 ${SHEET_W} ${SHEET_H}`} className="block w-full touch-none rounded-lg border border-border bg-white cursor-crosshair"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} aria-label={`Шимай парағы ${at + 1}`} role="img">
        <defs><pattern id="sq" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#E2E8F0" strokeWidth="1" /></pattern></defs>
        <rect width={SHEET_W} height={SHEET_H} fill="url(#sq)" />
        {sheets[at].map((s, i) => <path key={i} d={path(s)} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />)}
        {live && <path d={path(live)} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <p className="text-xs text-text-muted">Өшірілмейді: орын бітсе, «Жаңа» парақ аш. Мұғалім шимайыңды көреді.</p>
    </section>
  );
}
