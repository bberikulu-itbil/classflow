import React from 'react';
import type { SpCtx } from './spoil';

/**
 * «Кенеп» slide: a free 16:9 layout of text, code, picture and shape blocks.
 * Coordinates are in a 960×540 space; they are drawn as percentages and font sizes as cqw,
 * so the same slide fits the board, a phone, the editor at any zoom and a filmstrip thumbnail.
 */
export type Kind = 'text' | 'code' | 'image' | 'shape';
export type TextVariants = Record<string, string>;
export type CanvasAppearance = {
  fontFamily?: string; italic?: boolean; weight?: number; lineHeight?: number; letterSpacing?: number;
  padding?: number[]; valign?: 'top' | 'middle' | 'bottom'; wrap?: boolean;
  opacity?: number; rotation?: number; radius?: number; gradient?: string;
  stroke?: string; strokeWidth?: number; path?: string; viewBox?: string;
  imageViewport?: number[]; fit?: 'fill' | 'contain' | 'cover';
  tableCell?: boolean;
  flipH?: boolean; flipV?: boolean;
  /** Old pages store a ready CSS string; the PPTX import stores numbers in 960-space so they scale with the slide. */
  shadow?: string | { x: number; y: number; blur: number; color: string };
  removeBg?: boolean; blendMode?: 'normal' | 'multiply';
  /** OOXML preset dash (dash, sysDot, ...), line ends (triangle, arrow, stealth, diamond, oval), `px`: path is in 960-space px and stroke in user units. */
  dash?: string; head?: string; tail?: string; px?: boolean;
  gradDef?: { angle: number; radial?: boolean; scaled?: boolean; stops: { pos: number; color: string; alpha?: number }[] };
  /** Text columns and vertical writing from the PPTX text box. */
  vert?: boolean; cols?: number; colGap?: number;
  paragraphs?: { align: 'left' | 'center' | 'right' | 'justify'; offsetX?: number; offsetY?: number; lineHeight?: number; before?: number; after?: number; marL?: number; indent?: number; bullet?: { text: string; color?: string; size?: number; fontFamily?: string }; runs: { text: string; size: number; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; color?: string; fontFamily?: string; letterSpacing?: number; baseline?: number; caps?: 'all' | 'small'; hl?: string; href?: string }[] }[];
};
export type CBlock = {
  id: string; kind: Kind; x: number; y: number; w: number; h: number;
  text?: string; variants?: TextVariants; size: number; bold?: boolean; align: 'left' | 'center' | 'right'; color?: string;
  code?: string; lang?: string; src?: string; alt?: string; shape?: 'rect' | 'ellipse'; fill?: string; hide?: boolean;
  exact?: boolean; appearance?: CanvasAppearance;
  localized?: Record<string, { x?: number; y?: number; w?: number; h?: number; size?: number; appearance?: CanvasAppearance }>;
};
export const W = 960, H = 540, MIN = 30;
const KINDS: Kind[] = ['text', 'code', 'image', 'shape'];
const HEX = /^#[0-9a-fA-F]{6}$/;
const RGBA = /^rgba\(\d{1,3},\d{1,3},\d{1,3},[\d.]{1,5}\)$/;
const hex = (c: unknown, d: string) => (typeof c === 'string' && HEX.test(c) ? c : d);
const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Same rule as the other picture slides: https, a small data: image, or a picture shipped under lec/. */
export const imgOk = (s: unknown): s is string => typeof s === 'string' && /^(https?:\/\/|\/|data:image\/|lec\/[\w-]+\.(svg|png|webp|jpe?g)$)/.test(s);

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
  const exact = b.exact === true;
  const w = num(b.w, 200, exact ? 0.01 : MIN, exact ? W * 10 : W), h = num(b.h, 100, exact ? 0.01 : MIN, exact ? H * 10 : H);
  const variants = b.kind === 'text' && b.variants && typeof b.variants === 'object'
    ? Object.fromEntries(Object.entries(b.variants).filter(([, value]) => typeof value === 'string')) as TextVariants
    : undefined;
  const text = typeof b.text === 'string' ? b.text : (variants?.kk || Object.values(variants || {})[0] || '');
  const appearance = b.appearance && typeof b.appearance === 'object' ? b.appearance : undefined;
  const localized = b.localized && typeof b.localized === 'object' ? b.localized : undefined;
  return {
    id: typeof b.id === 'string' && b.id ? b.id : newId(), kind: b.kind, w, h,
    x: num(b.x, 0, exact ? -W * 10 : 0, exact ? W * 10 : W - w), y: num(b.y, 0, exact ? -H * 10 : 0, exact ? H * 10 : H - h),
    ...(exact ? { exact: true } : {}),
    ...(appearance ? { appearance } : {}),
    ...(localized ? { localized } : {}),
    text, ...(variants && Object.keys(variants).length ? { variants } : {}), size: num(b.size, b.kind === 'code' ? 20 : 32, exact ? 0.1 : 8, 320), bold: !!b.bold,
    align: b.align === 'center' || b.align === 'right' ? b.align : 'left', color: typeof b.color === 'string' && HEX.test(b.color) ? b.color : undefined,
    code: typeof b.code === 'string' ? b.code : '', lang: typeof b.lang === 'string' ? b.lang : 'cpp',
    src: typeof b.src === 'string' ? b.src : '', alt: typeof b.alt === 'string' ? b.alt : '',
    shape: b.shape === 'ellipse' ? 'ellipse' : 'rect', fill: exact && (b.fill === 'transparent' || RGBA.test(b.fill)) ? b.fill : hex(b.fill, '#2F6F65'), hide: !!b.hide,
  };
}
/** What is stored: only the fields that matter for the block kind. */
export function slim(b: CBlock): Record<string, unknown> {
  const o: Record<string, unknown> = { id: b.id, kind: b.kind, x: b.x, y: b.y, w: b.w, h: b.h };
  if (b.exact) o.exact = true;
  if (b.appearance && Object.keys(b.appearance).length) o.appearance = b.appearance;
  if (b.localized) o.localized = b.localized;
  if (b.kind === 'text') Object.assign(o, { text: b.text, size: b.size, align: b.align }, b.variants && Object.keys(b.variants).length ? { variants: b.variants } : {}, b.bold && { bold: true }, b.color && { color: b.color });
  if (b.kind === 'code') Object.assign(o, { code: b.code, lang: b.lang, size: b.size });
  if (b.kind === 'image') Object.assign(o, { src: b.src, alt: b.alt });
  if (b.kind === 'shape') Object.assign(o, { shape: b.shape, fill: b.fill });
  if (b.hide) o.hide = true;
  return o;
}
export const blocksOf = (s: any): CBlock[] => (Array.isArray(s?.blocks) ? s.blocks : []).map(norm).filter(Boolean) as CBlock[];
export const blockForLanguage = (b: CBlock, lang: string): CBlock => ({ ...b, ...b.localized?.[lang], text: b.variants?.[lang] ?? b.text });

export const box = (b: CBlock): React.CSSProperties => {
  const t: string[] = [];
  if (b.appearance?.rotation) t.push(`rotate(${b.appearance.rotation}deg)`);
  if (b.appearance?.flipH) t.push('scaleX(-1)');
  if (b.appearance?.flipV) t.push('scaleY(-1)');
  const s = b.appearance?.shadow, css = !s ? undefined : typeof s === 'string' ? s : `${fs(s.x)} ${fs(s.y)} ${fs(s.blur)} ${s.color}`;
  const outline = !!b.appearance?.path; // a drawn outline needs drop-shadow; box-shadow would show the rectangle
  return {
    position: 'absolute',
    left: `${(b.x / W) * 100}%`,
    top: `${(b.y / H) * 100}%`,
    width: `${(b.w / W) * 100}%`,
    height: `${(b.h / H) * 100}%`,
    transform: t.length ? t.join(' ') : undefined,
    opacity: b.appearance?.opacity,
    boxShadow: outline ? undefined : css,
    filter: outline && css ? `drop-shadow(${css})` : undefined,
  };
};
export const fs = (n: number) => `${n / 9.6}cqw`;

/** Office fonts get their metric-compatible open twins, so lines wrap where they did in PowerPoint. */
const TWINS: Record<string, string[]> = {
  calibri: ['Carlito'], arial: ['Arimo', 'Liberation Sans'], helvetica: ['Arimo', 'Liberation Sans'], 'times new roman': ['Tinos', 'Liberation Serif'],
  cambria: ['Caladea'], 'courier new': ['Cousine', 'Liberation Mono'], consolas: ['Inconsolata'], 'segoe ui': ['Inter'], aptos: ['Inter'],
};
/** Already on every machine (or the app's own Inter); everything else is requested once from Google Fonts. */
const LOCAL_FONTS = /^(inter|sans-serif|serif|monospace|system-ui|georgia|verdana|tahoma|trebuchet ms|symbol|wingdings.*|comic sans ms|impact|lucida.*|palatino.*|garamond|book antiqua|century.*|candara|corbel|constantia|franklin gothic.*|gill sans.*|cascadia.*|menlo|monaco|sf pro.*)$/i;
const loaded = new Set<string>();
const loadFont = (name: string) => {
  if (typeof document === 'undefined' || loaded.has(name) || LOCAL_FONTS.test(name) || !/^[\w .-]{2,40}$/.test(name)) return;
  loaded.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
  document.head.appendChild(link);
};
const MONO = /mono|courier|consolas|menlo|code|cascadia/i;
const SERIF = /times|cambria|georgia|garamond|palatino|serif$|book antiqua|century/i;
export const fontStack = (name?: string) => {
  if (!name) return 'Inter, sans-serif';
  const twins = TWINS[name.toLowerCase()] || [];
  (twins.length ? twins : [name]).forEach(loadFont);
  const q = (n: string) => (/[ ,]/.test(n) ? `"${n}"` : n);
  return [name, ...twins].map(q).join(', ') + `, ${MONO.test(name) ? 'monospace' : SERIF.test(name) ? 'serif' : 'Inter, sans-serif'}`;
};

const DASHES: Record<string, number[]> = { dash: [4, 3], sysDash: [3, 1], lgDash: [8, 3], dashDot: [4, 3, 1, 3], lgDashDot: [8, 3, 1, 3], lgDashDotDot: [8, 3, 1, 3, 1, 3], sysDashDot: [3, 1, 1, 1], sysDashDotDot: [3, 1, 1, 1, 1, 1], sysDot: [1, 1], dot: [1, 3] };
const dashArray = (name: string | undefined, width: number, unit: (n: number) => string) => (name && DASHES[name] ? DASHES[name].map(n => unit(n * Math.max(width, 1))).join(' ') : undefined);
const cssDash = (name?: string) => (!name || name === 'solid' ? 'solid' : /dot/i.test(name) && !/dash/i.test(name) ? 'dotted' : 'dashed');

/** Outline shapes: presets, custom geometry and lines (with optional arrow ends). */
function PathShape({ b, a }: { b: CBlock; a: CanvasAppearance }) {
  const id = React.useId().replace(/[^\w]/g, '');
  const sw = a.strokeWidth || 0, g = a.gradDef;
  const fill = g ? `url(#g${id})` : b.fill === 'transparent' || !b.fill ? 'none' : b.fill;
  const dash = dashArray(a.dash, sw, a.px ? n => String(n) : fs);
  const end = (kind: string | undefined, side: 'start' | 'end') => {
    if (!a.px || !kind || kind === 'none' || !a.stroke) return undefined;
    const open = kind === 'arrow';
    return (
      <marker key={side} id={`m${side}${id}`} viewBox="0 0 10 10" refX={kind === 'oval' || kind === 'diamond' ? 5 : 9} refY="5" markerWidth="4" markerHeight="4" orient={side === 'start' ? 'auto-start-reverse' : 'auto'} markerUnits="strokeWidth">
        {kind === 'oval' ? <circle cx="5" cy="5" r="4" fill={a.stroke} /> : kind === 'diamond' ? <path d="M0 5 L5 0 L10 5 L5 10 Z" fill={a.stroke} /> : open ? <path d="M1 1 L9 5 L1 9" fill="none" stroke={a.stroke} strokeWidth="1.6" /> : <path d="M0 0 L10 5 L0 10 Z" fill={a.stroke} />}
      </marker>
    );
  };
  const start = end(a.head, 'start'), finish = end(a.tail, 'end');
  const [vx, vy, vw, vh] = (a.viewBox || '0 0 100 100').split(/[ ,]+/).map(Number);
  const r = ((g?.angle || 0) * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  // an unscaled angle is the real angle on screen; a scaled one runs corner to corner of the box (SVG's bounding-box units)
  const len = Math.abs(vw * cos) + Math.abs(vh * sin);
  const line = g && !g.scaled && !g.radial ? { gradientUnits: 'userSpaceOnUse' as const, x1: vx + vw / 2 - (cos * len) / 2, y1: vy + vh / 2 - (sin * len) / 2, x2: vx + vw / 2 + (cos * len) / 2, y2: vy + vh / 2 + (sin * len) / 2 } : { x1: 0.5 - cos / 2, y1: 0.5 - sin / 2, x2: 0.5 + cos / 2, y2: 0.5 + sin / 2 };
  const stops = g?.stops.map((s, i) => <stop key={i} offset={`${s.pos}%`} stopColor={s.color} stopOpacity={s.alpha} />);
  return (
    <svg width="100%" height="100%" viewBox={a.viewBox} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {g && (g.radial ? <radialGradient id={`g${id}`} cx="0.5" cy="0.5" r="0.5">{stops}</radialGradient> : <linearGradient id={`g${id}`} {...line}>{stops}</linearGradient>)}
        {start}{finish}
      </defs>
      <path d={a.path} fill={fill} fillRule="evenodd" stroke={a.stroke} strokeWidth={a.px ? sw : undefined} strokeLinejoin="round" style={a.px ? { strokeDasharray: dash } : { strokeWidth: a.stroke ? fs(sw || 1) : undefined, strokeDasharray: dash }} vectorEffect={a.px ? undefined : 'non-scaling-stroke'} markerStart={start ? `url(#mstart${id})` : undefined} markerEnd={finish ? `url(#mend${id})` : undefined} />
    </svg>
  );
}

export function BlockView({ b, bg, R }: { b: CBlock; bg: string; R: (t: string) => React.ReactNode }) {
  const a = b.appearance || {};
  if (b.exact && b.kind === 'text') {
    const rich = a.paragraphs?.map(p => p.runs.map(r => r.text).join('')).join('\n') === b.text ? a.paragraphs : undefined;
    const cols = (a.cols || 1) > 1;
    return <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: a.padding?.map(fs).join(' '), display: cols ? 'block' : 'flex', flexDirection: 'column', justifyContent: a.valign === 'middle' ? 'center' : a.valign === 'bottom' ? 'flex-end' : 'flex-start', fontFamily: fontStack(a.fontFamily), fontSize: fs(b.size), fontWeight: a.weight || (b.bold ? 700 : 400), fontStyle: a.italic ? 'italic' : undefined, lineHeight: a.lineHeight ? fs(a.lineHeight) : 1.2, textAlign: b.align, color: b.color || ink(bg), letterSpacing: a.letterSpacing ? fs(a.letterSpacing) : undefined, whiteSpace: a.wrap === false ? 'pre' : 'pre-wrap', overflowWrap: 'break-word', writingMode: a.vert ? 'vertical-rl' : undefined, columnCount: cols ? a.cols : undefined, columnGap: a.colGap ? fs(a.colGap) : undefined }}>
      {rich ? rich.map((p, i) => {
        const empty = p.runs.every(r => !r.text), size = Math.max(...p.runs.map(r => r.size), 0.1);
        return (
          // the paragraph's font size is its biggest run, so smaller runs never make a line taller than the line spacing asks
          <div key={i} style={{ position: p.offsetY !== undefined ? 'absolute' : undefined, left: p.offsetX !== undefined ? fs(p.offsetX) : undefined, top: p.offsetY !== undefined ? fs(p.offsetY) : undefined, textAlign: p.align, fontSize: fs(size), lineHeight: p.lineHeight ? fs(p.lineHeight) : undefined, marginTop: p.before ? fs(p.before) : undefined, marginBottom: p.after ? fs(p.after) : undefined, paddingLeft: p.marL ? fs(p.marL) : undefined, textIndent: p.indent ? fs(p.indent) : undefined, breakInside: 'avoid' }}>
            {p.bullet && !empty && <span style={{ display: 'inline-block', textIndent: 0, minWidth: p.indent && p.indent < 0 ? fs(-p.indent) : undefined, paddingRight: !p.indent || p.indent >= 0 ? '0.3em' : undefined, color: p.bullet.color, fontSize: p.bullet.size ? fs(p.bullet.size) : undefined, fontFamily: p.bullet.fontFamily ? fontStack(p.bullet.fontFamily) : undefined, fontWeight: 400, fontStyle: 'normal', textDecoration: 'none' }}>{p.bullet.text}</span>}
            {empty ? <span>{'\u200b'}</span> : p.runs.map((r, j) => {
              const span = <span key={j} style={{ fontSize: fs(r.baseline ? r.size * 0.65 : r.size), fontWeight: r.bold ? 700 : 400, fontStyle: r.italic ? 'italic' : undefined, textDecoration: r.underline && r.strike ? 'underline line-through' : r.underline ? 'underline' : r.strike ? 'line-through' : undefined, color: r.color, fontFamily: r.fontFamily ? fontStack(r.fontFamily) : undefined, letterSpacing: r.letterSpacing ? fs(r.letterSpacing) : undefined, verticalAlign: r.baseline ? fs(r.baseline * r.size) : undefined, textTransform: r.caps === 'all' ? 'uppercase' : undefined, fontVariant: r.caps === 'small' ? 'small-caps' : undefined, backgroundColor: r.hl }}>{R(r.text)}</span>;
              return r.href && /^(https?:|mailto:)/i.test(r.href) ? <a key={j} href={r.href} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'inherit' }}>{span}</a> : span;
            })}
          </div>
        );
      }) : R(b.text || '')}
    </div>;
  }
  if (b.kind === 'image') {
    if (!imgOk(b.src)) return null;
    const [left, top, width, height] = a.imageViewport || [0, 0, 100, 100];
    const hasViewport = Array.isArray(a.imageViewport);
    const fit = a.fit || (b.exact ? 'fill' : 'contain');
    const blend = (a.removeBg || a.blendMode === 'multiply') ? 'multiply' : undefined;
    const rad = a.radius ? (a.radius >= 9999 ? '9999px' : (a.radius >= 50 && a.radius <= 100) ? `${a.radius}%` : fs(a.radius)) : undefined;
    return (
      <div style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        border: a.stroke ? `${fs(a.strokeWidth || 1)} ${cssDash(a.dash)} ${a.stroke}` : undefined,
        borderRadius: rad,
      }}>
        <img
          src={b.src}
          alt={b.alt || ''}
          style={hasViewport ? {
            position: 'absolute',
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
            maxWidth: 'none',
            objectFit: fit,
            mixBlendMode: blend,
          } : {
            width: '100%',
            height: '100%',
            objectFit: fit,
            mixBlendMode: blend,
          }}
        />
      </div>
    );
  }
  if (b.exact && b.kind === 'shape') {
    if (a.path) return <PathShape b={b} a={a} />;
    return <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', background: a.gradient || b.fill, border: a.stroke ? `${fs(a.strokeWidth || 1)} solid ${a.stroke}` : undefined, borderRadius: b.shape === 'ellipse' ? '50%' : fs(a.radius || 0) }} />;
  }
  if (b.kind === 'text') return <div style={{ fontSize: fs(b.size), fontWeight: b.bold ? 800 : 500, textAlign: b.align, color: b.color || ink(bg), lineHeight: 1.25, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{R(b.text || '')}</div>;
  if (b.kind === 'code') return <pre style={{ margin: 0, width: '100%', height: '100%', boxSizing: 'border-box', padding: '1.4cqw', background: '#0F172A', color: '#E2E8F5', borderRadius: '1.2cqw', fontSize: fs(b.size), lineHeight: 1.4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', overflow: 'auto' }}>{b.code}</pre>;
  return <div style={{ width: '100%', height: '100%', background: b.fill, borderRadius: b.shape === 'ellipse' ? '50%' : '1.2cqw' }} />;
}

/** The 16:9 paper. `clip` is off in the editor so selection handles may stick out. */
export const Stage = React.forwardRef<HTMLDivElement, { bg: string; gradient?: string; clip?: boolean; className?: string; children?: React.ReactNode }>(({ bg, gradient, clip = true, className = '', children }, ref) => (
  <div ref={ref} className={`relative w-full ${clip ? 'overflow-hidden' : ''} ${className}`} style={{ aspectRatio: '16 / 9', containerType: 'inline-size', background: gradient || bg }}>{children}</div>
));
Stage.displayName = 'Stage';

/** Player / board / preview view of a canvas slide. A block with `hide` stays covered until opened (same rule as hidden sections). */
export function CanvasSlide({ s, R, sp, lang = 'kk' }: { s: any; R: (t: string) => React.ReactNode; sp?: SpCtx; lang?: string }) {
  const bg = bgOf(s);
  return (
    <>
      {s.title && <h2 className="sr-only">{s.title}</h2>}
      <Stage bg={bg} gradient={s.bgGradient} className="shadow-lg">
        {blocksOf(s).map(original => {
          const b = blockForLanguage(original, lang);
          const idx = b.hide && sp ? sp.n++ : -1, closed = idx >= 0 && !sp!.shown.has(idx);
          return (
            <div key={b.id} style={box(b)}>
              {closed
                ? <button type="button" onClick={() => sp!.show(idx)} aria-label="Жасырын элемент, көрсету үшін бас" style={{ width: '100%', height: '100%', background: '#475569', color: '#fff', borderRadius: '1cqw', border: 0, cursor: 'pointer', fontSize: fs(28), letterSpacing: '0.3em' }}>●●●</button>
                : <BlockView b={b.kind === 'text' ? { ...b, text: b.variants?.[lang] ?? b.text } : b} bg={bg} R={b.hide ? (t => t.replace(/\|\|(.+?)\|\|/g, '$1')) : R} />}
            </div>
          );
        })}
      </Stage>
    </>
  );
}

const T = (text: string, x: number, y: number, w: number, h: number, size: number, extra: Partial<CBlock> = {}) => norm({ kind: 'text', id: newId(), text, variants: { kk: text }, x, y, w, h, size, ...extra })!;
export const LAYOUTS: { id: string; label: string; make: (title: string) => CBlock[] }[] = [
  { id: 'title', label: 'Титул беті', make: t => [T(t || 'Тақырып', 80, 170, 800, 110, 56, { bold: true, align: 'center' }), T('Ішкі тақырып', 80, 300, 800, 60, 28, { align: 'center', color: '#4F5E66' })] },
  { id: 'explain', label: 'Түсіндіру', make: t => [T(t || 'Тақырып', 60, 40, 840, 70, 40, { bold: true }), T('• Негізгі ой\n• Мысал\n• Қорытынды', 60, 140, 840, 340, 28)] },
  { id: 'two-col', label: 'Екі баған', make: t => [T(t || 'Тақырып', 60, 40, 840, 70, 40, { bold: true }), T('Сол жақ баған', 60, 140, 400, 340, 26), T('Оң жақ баған', 500, 140, 400, 340, 26)] },
  { id: 'practice', label: 'Практика', make: t => [T(t || 'Практика', 60, 40, 840, 70, 40, { bold: true }), T('Тапсырма шарты', 60, 130, 840, 110, 26), norm({ kind: 'code', id: newId(), code: '', lang: 'cpp', x: 60, y: 260, w: 840, h: 230, size: 22 })!] },
];
export const canvasPage = (title: string, layout?: string) => ({ type: 'canvas', title, bg: '#FFFFFF', blocks: layout ? LAYOUTS.find(l => l.id === layout)!.make(title).map(slim) : [] });

/** Educational pages can become a canvas page; interactive and source-only pages keep their own player. */
export const canConvert = (s: any) => {
  if (!s || s.type === 'canvas' || s.type === 'presentation' || s.pageType === 'presentation' || s.pageType === 'interactive') return false;
  if (['quiz', 'task', 'matching', 'flashcards', 'logic'].includes(s.type)) return false;
  return ['title', 'content', 'code', 'solution', 'leaderboard'].includes(s.type) || s.pageType === 'slide' || s.pageType === 'scroll';
};

export function toCanvas(s: any) {
  const blocks: CBlock[] = [];
  const addText = (text: unknown, x: number, y: number, w: number, h: number, size: number, extra: Partial<CBlock> = {}) => {
    if (typeof text === 'string' && text.trim()) blocks.push(T(text, x, y, w, h, size, extra));
  };
  const title = String(s.title || '');
  if (title) addText(title, 60, 35, 840, 70, 40, { bold: true });
  if (s.type === 'title') addText(s.subtitle || '', 80, 150, 800, 90, 30, { align: 'center', color: '#2457D6' });
  if (s.type === 'content') addText((Array.isArray(s.bullets) ? s.bullets : []).map((b: string) => '• ' + b).join('\n'), 70, 145, 820, 290, 28);
  if (s.type === 'code') {
    addText(s.prompt || '', 70, 130, 820, 110, 26);
    if (s.starter || s.code) blocks.push(norm({ kind: 'code', id: newId(), code: s.starter || s.code, lang: s.lang || 'cpp', x: 70, y: 255, w: 820, h: 230, size: 20 })!);
  }
  if (s.type === 'solution') {
    let y = 125;
    (Array.isArray(s.sections) ? s.sections : []).forEach((section: any) => {
      addText(section.h || '', 70, y, 820, 42, 28, { bold: true, color: '#2F6F65' }); y += 48;
      const text = section.text || (Array.isArray(section.bullets) ? section.bullets.map((b: string) => '• ' + b).join('\n') : '');
      addText(text, 70, y, 820, 90, 23); y += 105;
      if (section.code) { blocks.push(norm({ kind: 'code', id: newId(), code: section.code, lang: section.lang || 'cpp', x: 70, y, w: 820, h: 150, size: 18 })!); y += 165; }
    });
  }
  if (s.prompt && s.type !== 'code') addText(s.prompt, 70, 145, 820, 120, 26);
  if (typeof s.img === 'string' && imgOk(s.img)) blocks.push(norm({ kind: 'image', id: newId(), src: s.img, alt: s.alt || title, x: 610, y: 150, w: 280, h: 260 })!);
  if (!blocks.length) addText(title || 'Жаңа слайд', 70, 210, 820, 100, 32, { align: 'center' });
  return { type: 'canvas', title, bg: bgOf(s), blocks: blocks.map(slim), pageType: 'slide', templateId: 'canvas-blank', ...(s.notes ? { notes: s.notes } : {}), ...(s.ru ? { ru: s.ru } : {}) };
}
