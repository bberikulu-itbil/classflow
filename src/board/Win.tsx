import React, { useEffect, useState } from 'react';
import { GripHorizontal, X } from 'lucide-react';

/** Pointer drag that works for mouse, pen and finger; `end` runs once on release. */
export function track(e: React.PointerEvent, move: (x: number, y: number) => void, end?: () => void) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  const mv = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
  const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); end?.(); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}

/** Survives a close/open of the same window within this page visit. */
const saved: Record<string, { x: number; y: number }> = {};

export function Win({ id, title, icon, w = 340, at, z, onFocus, onClose, children }: { id: string; title: string; icon: React.ReactNode; w?: number; at: { x: number; y: number }; z: number; onFocus: () => void; onClose: () => void; children: React.ReactNode }) {
  const [p, setP] = useState(() => {
    const s = saved[id] || at, ww = Math.min(w, window.innerWidth - 16);
    return { x: Math.max(8, Math.min(s.x, window.innerWidth - ww - 8)), y: Math.max(8, Math.min(s.y, window.innerHeight - 140)) };
  });
  const down = (e: React.PointerEvent) => {
    const ox = e.clientX - p.x, oy = e.clientY - p.y;
    track(e, (x, y) => { const n = { x: Math.max(0, Math.min(x - ox, window.innerWidth - 80)), y: Math.max(0, Math.min(y - oy, window.innerHeight - 56)) }; saved[id] = n; setP(n); });
  };
  return (
    <section role="dialog" aria-label={title} onPointerDownCapture={onFocus} style={{ left: p.x, top: p.y, width: w, zIndex: z }}
      className="fixed max-w-[calc(100vw-16px)] rounded-2xl border border-border bg-surface text-text shadow-2xl">
      <div className="flex items-center rounded-t-2xl bg-surface-2">
        <div onPointerDown={down} className="flex min-h-[48px] flex-1 cursor-grab touch-none select-none items-center gap-2 px-3 font-semibold active:cursor-grabbing">
          <GripHorizontal size={16} aria-hidden="true" className="text-text-muted" /><span aria-hidden="true" className="text-accent">{icon}</span>{title}
        </div>
        <button type="button" onClick={onClose} aria-label={`${title}: жабу`} className="flex h-12 w-12 items-center justify-center rounded-tr-2xl text-text-secondary hover:bg-border"><X size={20} aria-hidden="true" /></button>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function IconB({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={pressed} className={`flex h-11 w-11 items-center justify-center rounded-lg ${pressed ? 'bg-accent text-on-accent' : 'text-text-secondary hover:bg-border'}`}>{children}</button>;
}

/** Big icon-over-label button of the tool dock; the visible label is its name. */
export function DockBtn({ label, onClick, pressed, disabled, strong, children }: { label: string; onClick: () => void; pressed?: boolean; disabled?: boolean; strong?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} disabled={disabled}
      className={`flex min-h-[56px] min-w-[60px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-medium leading-tight disabled:opacity-40 ${pressed || strong ? 'bg-accent text-on-accent' : 'text-text hover:bg-surface-2'}`}>
      <span aria-hidden="true">{children}</span>{label}
    </button>
  );
}

export function usePersist<T extends object>(key: string, init: T): [T, (v: T | ((o: T) => T)) => void] {
  const [v, setV] = useState<T>(() => { try { const s = localStorage.getItem(key); if (s) return { ...init, ...JSON.parse(s) }; } catch { /* private mode */ } return init; });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } }, [key, v]);
  return [v, setV];
}

export function useWide() {
  const [w, setW] = useState(window.innerWidth >= 1024);
  useEffect(() => { const f = () => setW(window.innerWidth >= 1024); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return w;
}
