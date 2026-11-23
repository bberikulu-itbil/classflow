// Liquid glass pieces (after the LiquidButton the teacher shared): a pill button with the inner glass shadow,
// and the coloured backdrop the frosted surfaces sit on. Styles: .glass / .glass-field / .liquid in tokens.css.
import React, { useEffect, useRef } from 'react';

type Tone = 'accent' | 'plain' | 'dark';
const TONE: Record<Tone, string> = {
  accent: 'bg-accent text-on-accent hover:brightness-110',
  plain: 'bg-surface text-text hover:brightness-105',
  dark: 'bg-text text-bg hover:brightness-125',
};
const SIZE = { md: 'min-h-[44px] px-4 text-sm', lg: 'min-h-[52px] px-6 text-base', xl: 'min-h-[56px] px-8 text-lg' };

type Common = { tone?: Tone; size?: keyof typeof SIZE; className?: string; children: React.ReactNode };
const cls = (tone: Tone, size: keyof typeof SIZE, extra: string) =>
  `liquid inline-flex items-center justify-center gap-2 rounded-full font-bold transition active:scale-[.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${TONE[tone]} ${SIZE[size]} ${extra}`;

export function LiquidButton({ tone = 'accent', size = 'lg', className = '', children, ...p }: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cls(tone, size, className)} {...p}>{children}</button>;
}
export function LiquidLink({ tone = 'accent', size = 'lg', className = '', children, ...p }: Common & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={cls(tone, size, className)} {...p}>{children}</a>;
}

/** The coloured shapes behind the glass; fixed to the viewport, behind the page. */
export function GlassBackdrop() {
  const b = 'absolute rounded-full blur-[10px]';
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className={b} style={{ left: '-10%', top: '-16%', width: '48vw', height: '48vw', background: 'var(--glass-blob-a)' }} />
      <div className={b} style={{ right: '-12%', top: '18%', width: '42vw', height: '46vw', background: 'var(--glass-blob-b)' }} />
      <div className={b} style={{ left: '28%', bottom: '-30%', width: '50vw', height: '40vw', background: 'var(--glass-blob-c)' }} />
      <div className="absolute rounded-[2.5rem]" style={{ left: '12%', top: '62%', width: '11rem', height: '11rem', transform: 'rotate(18deg)', background: 'var(--glass-blob-d)' }} />
      <CursorTrail />
    </div>
  );
}

/** A colour trail that follows the pointer behind the glass and fades in about a second.
 *  Draws only while the trail is visible (no idle animation loop); off under prefers-reduced-motion. */
function CursorTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext('2d');
    if (!cv || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const LIFE = 1000, pts: { x: number; y: number; t: number }[] = [];
    let raf = 0;
    const size = () => { const d = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const draw = () => {
      const now = performance.now();
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], k = 1 - (now - b.t) / LIFE; // 1 new … 0 gone
        ctx.strokeStyle = `hsl(${(b.t / 12) % 360}, 90%, 62%)`; // opaque strokes: overlaps merge; the canvas itself is half transparent
        ctx.lineWidth = 40 * k;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      raf = pts.length ? requestAnimationFrame(draw) : 0;
    };
    const move = (e: PointerEvent) => { pts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (pts.length > 120) pts.shift(); if (!raf) raf = requestAnimationFrame(draw); };
    size();
    addEventListener('resize', size); addEventListener('pointermove', move, { passive: true });
    return () => { removeEventListener('resize', size); removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" style={{ opacity: 0.5, filter: 'blur(6px)' }} />;
}
