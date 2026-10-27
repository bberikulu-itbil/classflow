import React from 'react';
import type { SpCtx } from './spoil';

/**
 * «Кенеп» slide: a free 16:9 layout of text, code, picture and shape blocks.
 * Coordinates are in a 960×540 space; they are drawn as percentages and font sizes as cqw,
 * so the same slide fits the board, a phone, the editor at any zoom and a filmstrip thumbnail.
 */
export type Kind = 'text' | 'code' | 'image' | 'shape';
export type CBlock = {
  id: string; kind: Kind; x: number; y: number; w: number; h: number;
  text?: string; size: number; bold?: boolean; align: 'left' | 'center' | 'right'; color?: string;
  code?: string; lang?: string; src?: string; alt?: string; shape?: 'rect' | 'ellipse'; fill?: string; hide?: boolean;
};
export const W = 960, H = 540, MIN = 30;
const KINDS: Kind[] = ['text', 'code', 'image', 'shape'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const hex = (c: unknown, d: string) => (typeof c === 'string' && HEX.test(c) ? c : d);
const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Same rule as the other picture slides: https, a small data: image, or a picture shipped under lec/. */
export const imgOk = (s: unknown): s is string => typeof s === 'string' && /^(https:\/\/|data:image\/|lec\/[\w-]+\.(svg|png|webp|jpe?g)$)/.test(s);

export const BG = [['#FFFFFF', 'Ақ'], ['#F4F1E8', 'Қағаз'], ['#E2EFEC', 'Жұмсақ жасыл'], ['#FFF4CC', 'Сары'], ['#0F172A', 'Қою']] as const;
export const INK = [['#111827', 'Қара'], ['#FFFFFF', 'Ақ'], ['#2F6F65', 'Көгілдір-жасыл'], ['#2457D6', 'Көк'], ['#B42318', 'Қызыл'], ['#B45309', 'Қошқыл сары'], ['#6D28D9', 'Күлгін'], ['#64748B', 'Сұр']] as const;
export const LANGS = ['cpp', 'python', 'text'];

const lum = (h: string) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
/** WCAG contrast ratio of two #rrggbb colours. */
export const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
/** Readable default text colour for a background. */
export const ink = (bg: string) => (lum(bg) < 0.4 ? '#FFFFFF' : '#111827');

export const bgOf = (s: any) => hex(s?.bg, '#FFFFFF');
let seq = 0;
export const newId = () => `b${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Clean copy of one block: unknown kinds are dropped, numbers and colours forced into range. */
export function norm(b: any): CBlock | null {
  if (!b || !KINDS.includes(b.kind)) return null;
  const w = num(b.w, 200, MIN, W), h = num(b.h, 100, MIN, H);
  return {
    id: typeof b.id === 'string' && b.id ? b.id : newId(), kind: b.kind, w, h,
    x: num(b.x, 0, 0, W - w), y: num(b.y, 0, 0, H - h),
    text: typeof b.text === 'string' ? b.text : '', size: num(b.size, b.kind === 'code' ? 20 : 32, 8, 160), bold: !!b.bold,
    align: b.align === 'center' || b.align === 'right' ? b.align : 'left', color: typeof b.color === 'string' && HEX.test(b.color) ? b.color : undefined,
    code: typeof b.code === 'string' ? b.code : '', lang: typeof b.lang === 'string' ? b.lang : 'cpp',
    src: typeof b.src === 'string' ? b.src : '', alt: typeof b.alt === 'string' ? b.alt : '',
    shape: b.shape === 'ellipse' ? 'ellipse' : 'rect', fill: hex(b.fill, '#2F6F65'), hide: !!b.hide,
  };
}
/** What is stored: only the fields that matter for the block kind. */
export function slim(b: CBlock): Record<string, unknown> {
  const o: Record<string, unknown> = { id: b.id, kind: b.kind, x: b.x, y: b.y, w: b.w, h: b.h };
  if (b.kind === 'text') Object.assign(o, { text: b.text, size: b.size, align: b.align }, b.bold && { bold: true }, b.color && { color: b.color });
  if (b.kind === 'code') Object.assign(o, { code: b.code, lang: b.lang, size: b.size });
  if (b.kind === 'image') Object.assign(o, { src: b.src, alt: b.alt });
  if (b.kind === 'shape') Object.assign(o, { shape: b.shape, fill: b.fill });
  if (b.hide) o.hide = true;
  return o;
}
export const blocksOf = (s: any): CBlock[] => (Array.isArray(s?.blocks) ? s.blocks : []).map(norm).filter(Boolean) as CBlock[];

export const box = (b: CBlock): React.CSSProperties => ({ position: 'absolute', left: `${(b.x / W) * 100}%`, top: `${(b.y / H) * 100}%`, width: `${(b.w / W) * 100}%`, height: `${(b.h / H) * 100}%` });
export const fs = (n: number) => `${n / 9.6}cqw`;

export function BlockView({ b, bg, R }: { b: CBlock; bg: string; R: (t: string) => React.ReactNode }) {
  if (b.kind === 'text') return <div style={{ fontSize: fs(b.size), fontWeight: b.bold ? 800 : 500, textAlign: b.align, color: b.color || ink(bg), lineHeight: 1.25, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{R(b.text || '')}</div>;
  if (b.kind === 'code') return <pre style={{ margin: 0, width: '100%', height: '100%', boxSizing: 'border-box', padding: '1.4cqw', background: '#0F172A', color: '#E2E8F5', borderRadius: '1.2cqw', fontSize: fs(b.size), lineHeight: 1.4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', overflow: 'auto' }}>{b.code}</pre>;
  if (b.kind === 'image') return imgOk(b.src) ? <img src={b.src} alt={b.alt || ''} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : null;
  return <div style={{ width: '100%', height: '100%', background: b.fill, borderRadius: b.shape === 'ellipse' ? '50%' : '1.2cqw' }} />;
}

/** The 16:9 paper. `clip` is off in the editor so selection handles may stick out. */
export const Stage = React.forwardRef<HTMLDivElement, { bg: string; clip?: boolean; className?: string; children?: React.ReactNode }>(({ bg, clip = true, className = '', children }, ref) => (
  <div ref={ref} className={`relative w-full ${clip ? 'overflow-hidden' : ''} ${className}`} style={{ aspectRatio: '16 / 9', containerType: 'inline-size', background: bg }}>{children}</div>
));
Stage.displayName = 'Stage';

/** Player / board / preview view of a canvas slide. A block with `hide` stays covered until opened (same rule as hidden sections). */
export function CanvasSlide({ s, R, sp }: { s: any; R: (t: string) => React.ReactNode; sp?: SpCtx }) {
  const bg = bgOf(s);
  return (
    <>
      {s.title && <h2 className="sr-only">{s.title}</h2>}
      <Stage bg={bg} className="rounded-xl shadow-lg">
        {blocksOf(s).map(b => {
          const idx = b.hide && sp ? sp.n++ : -1, closed = idx >= 0 && !sp!.shown.has(idx);
          return (
            <div key={b.id} style={box(b)}>
              {closed
                ? <button type="button" onClick={() => sp!.show(idx)} aria-label="Жасырын элемент, көрсету үшін бас" style={{ width: '100%', height: '100%', background: '#475569', color: '#fff', borderRadius: '1cqw', border: 0, cursor: 'pointer', fontSize: fs(28), letterSpacing: '0.3em' }}>●●●</button>
                : <BlockView b={b} bg={bg} R={b.hide ? (t => t.replace(/\|\|(.+?)\|\|/g, '$1')) : R} />}
            </div>
          );
        })}
      </Stage>
    </>
  );
}

const T = (text: string, x: number, y: number, w: number, h: number, size: number, extra: Partial<CBlock> = {}) => norm({ kind: 'text', id: newId(), text, x, y, w, h, size, ...extra })!;
export const LAYOUTS: { id: string; label: string; make: (title: string) => CBlock[] }[] = [
  { id: 'title', label: 'Титул беті', make: t => [T(t || 'Тақырып', 80, 170, 800, 110, 56, { bold: true, align: 'center' }), T('Ішкі тақырып', 80, 300, 800, 60, 28, { align: 'center', color: '#4F5E66' })] },
  { id: 'explain', label: 'Түсіндіру', make: t => [T(t || 'Тақырып', 60, 40, 840, 70, 40, { bold: true }), T('• Негізгі ой\n• Мысал\n• Қорытынды', 60, 140, 840, 340, 28)] },
  { id: 'two-col', label: 'Екі баған', make: t => [T(t || 'Тақырып', 60, 40, 840, 70, 40, { bold: true }), T('Сол жақ баған', 60, 140, 400, 340, 26), T('Оң жақ баған', 500, 140, 400, 340, 26)] },
  { id: 'practice', label: 'Практика', make: t => [T(t || 'Практика', 60, 40, 840, 70, 40, { bold: true }), T('Тапсырма шарты', 60, 130, 840, 110, 26), norm({ kind: 'code', id: newId(), code: '', lang: 'cpp', x: 60, y: 260, w: 840, h: 230, size: 22 })!] },
];
export const canvasPage = (title: string, layout?: string) => ({ type: 'canvas', title, bg: '#FFFFFF', blocks: layout ? LAYOUTS.find(l => l.id === layout)!.make(title).map(slim) : [] });

/** Title and content pages can become a canvas page; their text carries over. Anything else keeps its own player. */
export const canConvert = (s: any) => s?.type === 'title' || s?.type === 'content';
export function toCanvas(s: any) {
  const bl = LAYOUTS.find(l => l.id === (s.type === 'title' ? 'title' : 'explain'))!.make(s.title || '').map(slim);
  bl[1] = { ...bl[1], text: s.type === 'title' ? s.subtitle || '' : (Array.isArray(s.bullets) ? s.bullets : []).map((b: string) => '• ' + b).join('\n') };
  return { type: 'canvas', title: s.title || '', bg: '#FFFFFF', blocks: bl, pageType: 'slide', templateId: 'canvas-blank', ...(s.notes ? { notes: s.notes } : {}) };
}
