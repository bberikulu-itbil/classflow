import React, { useRef, useState } from 'react';
import { ArrowLeftRight, ChevronLeft, ChevronRight, GripHorizontal, Maximize2, Minimize2, QrCode, Users } from 'lucide-react';
import { spaced } from '../components/Widgets';
import { IconB, track } from './Win';

export type Qr = { side: 'left' | 'right'; y: number; open: boolean; big: boolean };
const SIZE = (q: Qr) => (q.big ? 272 : 176);
/** Width the slide area gives up while the card is open beside it. */
export const qrReserve = (q: Qr) => SIZE(q) + 32 + 12;

/** Join card: drag it anywhere (it snaps to the nearest side edge), fold it into a tab on the edge, enlarge the QR for the back row. */
export function QrDock({ q, set, svg, code, count, inset = 0 }: { q: Qr; set: (v: Qr) => void; svg: string; code: string; count: number; inset?: number }) {
  const card = useRef<HTMLElement>(null);
  const [free, setFree] = useState<{ x: number; y: number } | null>(null);
  const top = `clamp(64px, ${q.y * 100}vh, calc(100vh - ${q.big ? 520 : 400}px))`;
  const edge = q.side === 'right' ? { right: 12 } : { left: 12 + inset };
  if (!q.open) {
    return (
      <button type="button" onClick={() => set({ ...q, open: true })} aria-label="QR мен қосылу кодын көрсету" title="QR мен қосылу кодын көрсету"
        style={{ top, ...(q.side === 'left' ? { left: inset } : {}) }} className={`fixed z-40 flex min-h-[72px] w-12 flex-col items-center justify-center gap-1 border border-border bg-surface text-text shadow-lg hover:bg-surface-2 ${q.side === 'right' ? 'right-0 rounded-l-xl border-r-0' : 'rounded-r-xl border-l-0'}`}>
        <QrCode size={22} aria-hidden="true" /><span aria-hidden="true" className="text-[10px] font-bold">QR</span>
      </button>
    );
  }
  const down = (e: React.PointerEvent) => {
    const r = card.current!.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top; let last = { x: r.left, y: r.top };
    track(e, (x, y) => { last = { x: x - ox, y: y - oy }; setFree(last); }, () => {
      setFree(null);
      set({ ...q, side: last.x + r.width / 2 < window.innerWidth / 2 ? 'left' : 'right', y: Math.max(0.08, Math.min(last.y / window.innerHeight, 0.7)) });
    });
  };
  const px = SIZE(q);
  return (
    <aside ref={card} aria-label="Қосылу: QR және код" style={free ? { left: free.x, top: free.y, width: px + 32 } : { ...edge, top, width: px + 32 }}
      className={`fixed z-40 rounded-2xl border border-border bg-surface text-text shadow-2xl ${free ? 'opacity-90' : ''}`}>
      <div className="flex items-center rounded-t-2xl bg-surface-2">
        <div onPointerDown={down} className="flex min-h-[44px] flex-1 cursor-grab touch-none select-none items-center gap-1.5 px-3 text-sm font-semibold text-text-secondary active:cursor-grabbing">
          <GripHorizontal size={16} aria-hidden="true" />Қосылу
        </div>
        <IconB label={q.big ? 'QR-ды кішірейту' : 'QR-ды үлкейту'} pressed={q.big} onClick={() => set({ ...q, big: !q.big })}>{q.big ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}</IconB>
        <IconB label="Қарсы шетке ауыстыру" onClick={() => set({ ...q, side: q.side === 'right' ? 'left' : 'right' })}><ArrowLeftRight size={18} aria-hidden="true" /></IconB>
        <IconB label="Шетке жасыру" onClick={() => set({ ...q, open: false })}>{q.side === 'right' ? <ChevronRight size={20} aria-hidden="true" /> : <ChevronLeft size={20} aria-hidden="true" />}</IconB>
      </div>
      <div className="space-y-1 p-4 text-center">
        <div role="img" aria-label="Қосылу QR коды" className="mx-auto rounded-xl bg-white p-2" style={{ width: px, height: px }} dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="pt-1 text-sm text-text-secondary">немесе кодты енгіз</p>
        <p className={`font-mono font-black tracking-widest text-accent ${q.big ? 'text-5xl' : 'text-3xl'} whitespace-nowrap`}>{spaced(code)}</p>
        <p className="flex items-center justify-center gap-1.5 text-sm text-text-secondary"><Users size={16} aria-hidden="true" />Қатысушы: {count}</p>
      </div>
    </aside>
  );
}
