// Liquid glass pieces (after the LiquidButton the teacher shared): a pill button with the inner glass shadow,
// and the coloured backdrop the frosted surfaces sit on. Styles: .glass / .glass-field / .liquid in tokens.css.
import React from 'react';

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
    </div>
  );
}
