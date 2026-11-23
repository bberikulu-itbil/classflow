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

/** The coloured shapes behind the glass; fixed to the viewport, behind the page (its parent needs `isolate`
 *  when it paints its own background). The shapes drift a little towards the pointer (parallax). */
export function GlassBackdrop() {
  const b = 'absolute rounded-full blur-[10px] transition-transform duration-700 ease-out';
  const drift = (k: number, rot = '') => ({ transform: `translate(calc(var(--mx, 0) * ${k}px), calc(var(--my, 0) * ${k}px))${rot}` });
  return (
    <div aria-hidden="true" className="glass-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className={b} style={{ left: '-10%', top: '-16%', width: '48vw', height: '48vw', background: 'var(--glass-blob-a)', ...drift(40) }} />
      <div className={b} style={{ right: '-12%', top: '18%', width: '42vw', height: '46vw', background: 'var(--glass-blob-b)', ...drift(-30) }} />
      <div className={b} style={{ left: '28%', bottom: '-30%', width: '50vw', height: '40vw', background: 'var(--glass-blob-c)', ...drift(24) }} />
      <div className="absolute rounded-[2.5rem] transition-transform duration-700 ease-out" style={{ left: '12%', top: '62%', width: '11rem', height: '11rem', background: 'var(--glass-blob-d)', ...drift(-56, ' rotate(18deg)') }} />
      <CursorTrail />
    </div>
  );
}

/** A glowing colour trail that follows the pointer behind the glass and fades in about a second; a click sends
 *  out a ring. Draws only while something is visible (no idle loop); off under prefers-reduced-motion. */
function CursorTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext('2d'), root = cv?.parentElement;
    if (!cv || !ctx || !root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const LIFE = 1100, RING = 900;
    const pts: { x: number; y: number; t: number }[] = [], rings: { x: number; y: number; t: number; h: number }[] = [];
    let raf = 0, px = 0, py = 0;
    const hue = (t: number) => (t / 12) % 360;
    const size = () => { const d = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const draw = () => {
      const now = performance.now();
      while (pts.length && now - pts[0].t > LIFE) pts.shift();
      while (rings.length && now - rings[0].t > RING) rings.shift();
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // a wide soft glow under a narrow bright core, both thinning with age
      for (const [w, light] of [[56, 70], [18, 58]] as const) {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], c = pts[i], k = 1 - (now - c.t) / LIFE;
          ctx.strokeStyle = `hsl(${hue(c.t)}, 92%, ${light}%)`;
          ctx.lineWidth = w * k * k;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
        }
      }
      for (const r of rings) {
        const k = (now - r.t) / RING;
        ctx.strokeStyle = `hsla(${r.h}, 92%, 60%, ${1 - k})`; ctx.lineWidth = 10 * (1 - k);
        ctx.beginPath(); ctx.arc(r.x, r.y, 20 + 160 * k, 0, Math.PI * 2); ctx.stroke();
      }
      raf = pts.length || rings.length ? requestAnimationFrame(draw) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
    const move = (e: PointerEvent) => {
      const t = performance.now(), last = pts[pts.length - 1];
      // fill gaps of fast moves so the line stays smooth
      if (last) { const dx = e.clientX - last.x, dy = e.clientY - last.y, n = Math.min(8, Math.floor(Math.hypot(dx, dy) / 24));
        for (let i = 1; i <= n; i++) pts.push({ x: last.x + dx * i / (n + 1), y: last.y + dy * i / (n + 1), t: last.t + (t - last.t) * i / (n + 1) }); }
      pts.push({ x: e.clientX, y: e.clientY, t }); while (pts.length > 160) pts.shift();
      px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5;
      root.style.setProperty('--mx', px.toFixed(3)); root.style.setProperty('--my', py.toFixed(3));
      kick();
    };
    const down = (e: PointerEvent) => { rings.push({ x: e.clientX, y: e.clientY, t: performance.now(), h: hue(performance.now()) }); kick(); };
    size();
    addEventListener('resize', size); addEventListener('pointermove', move, { passive: true }); addEventListener('pointerdown', down, { passive: true });
    return () => { removeEventListener('resize', size); removeEventListener('pointermove', move); removeEventListener('pointerdown', down); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" style={{ opacity: 0.55, filter: 'blur(5px)' }} />;
}
