// Turns the plain title / content / worked-example slides of the "Spreadsheets lab" module into designed canvas slides
// (960x540 canvas, same block kinds as the PPTX import): coloured header, numbered cards, picture panel, code box, hidden solution.
// Quiz and practice slides keep their own interactive players.
import type { LabLesson } from './dsl';

type Blk = Record<string, any>;
const KIND: Record<string, { a: string; b: string; soft: string; icon: string }> = {
  explain: { a: '#2563EB', b: '#1D4ED8', soft: '#DBEAFE', icon: '📖' },
  example: { a: '#7C3AED', b: '#6D28D9', soft: '#EDE9FE', icon: '💡' },
  exampletask: { a: '#0F766E', b: '#115E59', soft: '#CCFBF1', icon: '🧩' },
  video: { a: '#E11D48', b: '#BE123C', soft: '#FFE4E6', icon: '🎬' },
};
const INK = '#0F172A', MUTE = '#475569', PAPER = '#F1F5F9';
const SHADOW = { x: 0, y: 2.5, blur: 9, color: 'rgba(15,23,42,0.13)' };

/** Pictures in public/lec (see scripts/gen-sheetslab-art.mjs): name -> viewBox height (the width is always 640). */
const ART_H: Record<string, number> = { anatomy: 420, range: 380, recalc: 330, keys: 280, select: 330, toolbar: 260, formats: 380, dates: 300, formula: 380, copy: 380, refs: 400, functions: 380, charts: 330, ifflow: 330, binary: 330, building: 400, wallet: 380, rect: 330, salary: 330, video: 360, hero: 420 };
/** Which picture goes on which slide: `lesson-id:slide index`. */
const ART: Record<string, string> = {
  'inf8lab-1:1': 'recalc', 'inf8lab-1:2': 'video', 'inf8lab-1:3': 'anatomy', 'inf8lab-1:4': 'range', 'inf8lab-1:5': 'range',
  'inf8lab-2:1': 'keys', 'inf8lab-2:2': 'select',
  'inf8lab-3:1': 'toolbar', 'inf8lab-3:2': 'formats', 'inf8lab-3:3': 'dates',
  'inf8lab-4:1': 'formula', 'inf8lab-4:4': 'copy',
  'inf8lab-5:1': 'refs', 'inf8lab-5:2': 'refs', 'inf8lab-5:3': 'rect',
  'inf8lab-6:1': 'functions', 'inf8lab-6:2': 'functions', 'inf8lab-6:3': 'wallet',
  'inf8lab-7:1': 'charts', 'inf8lab-7:2': 'video', 'inf8lab-7:3': 'charts', 'inf8lab-7:4': 'ifflow',
  'inf8lab-8:1': 'building', 'inf8lab-8:2': 'salary', 'inf8lab-8:3': 'building',
};

/** Largest font size (px of the 960 canvas) at which both languages of a text fit the box. */
export function fit(texts: string[], w: number, h: number, max: number, min: number, lh = 1.28): number {
  for (let s = max; s >= min; s--) {
    const cpl = Math.max(1, Math.floor((w / (s * 0.56)) * 0.93));
    const need = Math.max(...texts.map(t => t.split('\n').reduce((n, p) => n + Math.max(1, Math.ceil(p.length / cpl)), 0))) * s * lh;
    if (need <= h) return s;
  }
  return min;
}

class Page {
  blocks: Blk[] = [];
  private n = 0;
  private id = () => `c${++this.n}`;
  rect(x: number, y: number, w: number, h: number, fill: string, o: { r?: number; gradient?: string; shadow?: boolean; stroke?: string; sw?: number; shape?: 'rect' | 'ellipse' } = {}) {
    this.blocks.push({ id: this.id(), kind: 'shape', exact: true, shape: o.shape || 'rect', fill, x, y, w, h, appearance: { radius: o.r ?? 0, ...(o.gradient ? { gradient: o.gradient } : {}), ...(o.shadow ? { shadow: SHADOW } : {}), ...(o.stroke ? { stroke: o.stroke, strokeWidth: o.sw || 2 } : {}) } });
  }
  text(x: number, y: number, w: number, h: number, kk: string, ru: string, size: number, o: { color?: string; bold?: boolean; align?: 'left' | 'center' | 'right'; valign?: 'top' | 'middle' | 'bottom'; hide?: boolean; weight?: number; lh?: number } = {}) {
    // stored lean: `text` is the kk variant, the default ink and left alignment are omitted, `weight` replaces bold
    const color = o.color && o.color !== INK ? o.color : undefined, weight = o.weight || (o.bold ? 700 : 500);
    this.blocks.push({
      id: this.id(), kind: 'text', exact: true, x, y, w, h, variants: { kk, ru }, size, ...(o.align && o.align !== 'left' ? { align: o.align } : {}), ...(color ? { color } : {}), ...(o.hide ? { hide: true } : {}),
      appearance: { ...(o.valign === 'top' || o.valign === 'bottom' ? { valign: o.valign } : { valign: 'middle' }), lineHeight: Math.round(size * (o.lh || 1.28)), weight },
    });
  }
  image(src: string, alt: string, x: number, y: number, w: number, h: number) {
    this.blocks.push({ id: this.id(), kind: 'image', exact: true, src, alt, x, y, w, h, appearance: { fit: 'contain' } });
  }
  code(code: string, x: number, y: number, w: number, h: number, size: number) {
    this.blocks.push({ id: this.id(), kind: 'code', exact: true, code, lang: 'text', x, y, w, h, size });
  }
  /** Picture on a white card, vertically centred in the area y0..y1. */
  picture(name: string, alt: string, x: number, w: number, y0: number, y1: number) {
    const iw = w - 16, ih = Math.min(iw * ART_H[name] / 640, y1 - y0 - 16), cw = Math.min(iw, ih * 640 / ART_H[name]);
    const ch = ih + 16, cy = y0 + (y1 - y0 - ch) / 2;
    this.rect(x, cy, w, ch, '#FFFFFF', { r: 18, shadow: true });
    this.image(`lec/inf8-${name}.svg`, alt, x + (w - cw) / 2, cy + 8, cw, ih);
  }
  header(title: [string, string], k: { a: string; b: string; soft: string; icon: string }) {
    this.rect(0, 0, 960, 540, PAPER);
    this.rect(0, 0, 960, 96, '#FFFFFF');
    this.rect(0, 92, 960, 5, k.a, { gradient: `linear-gradient(90deg, ${k.a}, ${k.b} 55%, ${k.soft})` });
    this.rect(36, 20, 54, 54, k.a, { r: 16, gradient: `linear-gradient(135deg, ${k.a}, ${k.b})`, shadow: true });
    this.text(36, 20, 54, 54, k.icon, k.icon, 28, { align: 'center', color: '#FFFFFF' });
    this.text(108, 12, 816, 72, title[0], title[1], fit(title, 816, 72, 36, 22, 1.15), { bold: true, weight: 800 });
  }
}

const done = (p: Page, s: any, kind: string, bg = PAPER, bgGradient?: string) => ({
  type: 'canvas', pageType: 'slide', templateId: 'canvas-blank', ...(kind ? { kind } : {}), title: s.title, bg, ...(bgGradient ? { bgGradient } : {}), blocks: p.blocks,
  ...(s.notes ? { notes: s.notes } : {}), ...(s.sheet ? { sheet: s.sheet } : {}), ru: { title: s.ru?.title ?? s.title, ...(s.ru?.notes ? { notes: s.ru.notes } : {}) },
});

function titleSlide(s: any, art?: string) {
  const p = new Page();
  p.rect(0, 0, 960, 540, '#0F766E', { gradient: 'linear-gradient(135deg, #0F766E 0%, #115E59 48%, #0F172A 100%)' });
  p.rect(-120, 330, 420, 420, 'rgba(255,255,255,0.06)', { shape: 'ellipse' });
  p.rect(640, -140, 380, 380, 'rgba(45,212,191,0.14)', { shape: 'ellipse' });
  p.rect(48, 56, 250, 40, 'rgba(255,255,255,0.16)', { r: 20 });
  p.text(48, 56, 250, 40, '📊 Информатика · 8-сынып', '📊 Информатика · 8 класс', 17, { color: '#CCFBF1', bold: true, align: 'center' });
  const t: [string, string] = [s.title, s.ru?.title ?? s.title], sub: [string, string] = [s.subtitle || '', s.ru?.subtitle ?? s.subtitle ?? ''];
  p.text(48, 128, 500, 220, t[0], t[1], fit(t, 500, 220, 52, 30, 1.15), { bold: true, weight: 800, color: '#FFFFFF', valign: 'middle' });
  p.rect(48, 362, 96, 6, '#FBBF24', { r: 3 });
  p.text(48, 386, 500, 70, sub[0], sub[1], 22, { color: '#99F6E4', valign: 'top' });
  p.rect(572, 92, 340, 356, '#FFFFFF', { r: 26, shadow: true });
  p.image(`lec/inf8-${art || 'hero'}.svg`, 'Spreadsheet', 580, 100 + (340 - 340 * ART_H[art || 'hero'] / 640) / 2, 324, 324 * ART_H[art || 'hero'] / 640);
  return done(p, s, '', '#0F766E', 'linear-gradient(135deg, #0F766E 0%, #115E59 48%, #0F172A 100%)');
}

/** Numbered cards in the box x,y,w,h (centred vertically when they do not fill it). */
function cards(p: Page, items: [string, string][], x: number, y: number, w: number, h: number, k: { a: string; b: string; soft: string }) {
  const gap = 10, ch = Math.min(112, (h - gap * (items.length - 1)) / items.length), total = ch * items.length + gap * (items.length - 1);
  const size = Math.min(...items.map(t => fit(t, w - 88, ch - 14, 24, 14)));
  items.forEach((t, i) => {
    const cy = y + (h - total) / 2 + i * (ch + gap);
    p.rect(x, cy, w, ch, '#FFFFFF', { r: 16, shadow: true });
    p.rect(x + 14, cy + ch / 2 - 20, 40, 40, k.a, { shape: 'ellipse', gradient: `linear-gradient(135deg, ${k.a}, ${k.b})` });
    p.text(x + 14, cy + ch / 2 - 20, 40, 40, String(i + 1), String(i + 1), 20, { align: 'center', color: '#FFFFFF', weight: 800 });
    p.text(x + 68, cy + 6, w - 84, ch - 12, t[0], t[1], size, { color: INK });
  });
}

function contentSlide(s: any, art: string | undefined) {
  const k = KIND[s.kind] || KIND.explain, p = new Page();
  p.header([s.title, s.ru?.title ?? s.title], k);
  const kk: string[] = s.bullets || [], ru: string[] = s.ru?.bullets || kk, items = kk.map((t, i) => [t, ru[i] ?? t] as [string, string]);
  const y0 = 116, lines = s.code ? String(s.code).split('\n') : [], longest = Math.max(0, ...lines.map((l: string) => l.length));
  if (s.code && !art) { // no picture: the code box runs under the cards over the full width
    const size = Math.max(13, Math.min(19, Math.floor(848 / (longest * 0.62)))), h = Math.min(176, Math.round(lines.length * size * 1.45 + 30));
    p.code(s.code, 40, 520 - h, 880, h, size);
    cards(p, items, 40, y0, 880, 520 - h - 12 - y0, k);
  } else if (s.code && art) { // picture and code share the right column, the cards get the full height on the left
    const w = 340, size = Math.max(12, Math.min(15, Math.floor((w - 32) / (longest * 0.62)))), h = Math.min(190, Math.round(lines.length * size * 1.45 + 26));
    cards(p, items, 40, y0, 520, 520 - y0, k);
    p.picture(art, s.title, 580, w, y0, 520 - h - 12);
    p.code(s.code, 580, 520 - h, w, h, size);
  } else {
    cards(p, items, 40, y0, art ? 520 : 880, 520 - y0, k);
    if (art) p.picture(art, s.title, 580, 340, y0, 520);
  }
  return done(p, s, s.kind);
}

function solutionSlide(s: any, art: string | undefined) {
  const k = KIND.exampletask, p = new Page(), [task, steps, result] = s.sections, rt = s.ru?.sections || s.sections;
  p.header([s.title, s.ru?.title ?? s.title], k);
  const label = (x: number, y: number, kk: string, ru: string, color: string) => p.text(x, y, 300, 22, kk, ru, 14, { color, bold: true, weight: 800, valign: 'middle' });
  const yTop = 116, bottom = 520, solH = 96, solY = bottom - solH;
  let mainX = 40, mainW = 880, mainY = yTop;
  const taskT: [string, string] = [task.text, rt[0].text];
  if (art) {
    const tw = 400, th = Math.min(190, 56 + Math.ceil(Math.max(...taskT.map(t => t.length)) / 22) * 30);
    p.rect(40, yTop, tw, th, k.soft, { r: 18, shadow: true });
    label(60, yTop + 12, 'ШАРТЫ', 'УСЛОВИЕ', k.b);
    p.text(60, yTop + 38, tw - 40, th - 48, taskT[0], taskT[1], fit(taskT, tw - 40, th - 48, 26, 16), { bold: true, valign: 'top' });
    p.picture(art, s.title, 40, tw, yTop + th + 12, bottom);
    mainX = 470; mainW = 450;
  } else {
    const th = 74;
    p.rect(40, yTop, 880, th, k.soft, { r: 18, shadow: true });
    label(60, yTop + 8, 'ШАРТЫ', 'УСЛОВИЕ', k.b);
    p.text(60, yTop + 28, 840, th - 32, taskT[0], taskT[1], fit(taskT, 840, th - 32, 26, 16), { bold: true });
    mainY = yTop + th + 12;
  }
  const st = (steps.bullets as string[]).map((t, i) => [t, rt[1].bullets[i] ?? t] as [string, string]);
  cards(p, st, mainX, mainY, mainW, solY - 12 - mainY, k);
  const res: [string, string] = [result.text, rt[2].text];
  p.rect(mainX, solY, mainW, solH, '#10B981', { r: 18, gradient: 'linear-gradient(135deg, #059669, #10B981)', shadow: true });
  label(mainX + 18, solY + 8, '✅ ШЕШІМІ (басып ашыңыз)', '✅ РЕШЕНИЕ (нажмите, чтобы открыть)', '#D1FAE5');
  p.text(mainX + 18, solY + 34, mainW - 36, solH - 42, res[0], res[1], fit(res, mainW - 36, solH - 42, 26, 16), { color: '#FFFFFF', bold: true, hide: true });
  return done(p, s, 'exampletask');
}

/** The canvas page for a slide stored as `design: 'lab'` (the lesson keeps plain, editable text; the page is drawn when it is shown). */
export function designSlide(s: any) {
  if (s?.design !== 'lab') return s;
  const art = typeof s.art === 'string' && s.art in ART_H ? s.art : undefined;
  if (s.type === 'title') return titleSlide(s);
  if (s.type === 'content') return contentSlide(s, art);
  if (s.type === 'solution') return solutionSlide(s, art);
  return s;
}

/** Marks the title, content and worked-example slides of a lesson for the designed look and attaches their pictures. */
export function markLesson(l: LabLesson): LabLesson {
  return { ...l, slides: l.slides.map((s: any, i: number) => {
    if (!['title', 'content', 'solution'].includes(s.type)) return s;
    const art = ART[`${l.id}:${i}`];
    if (art && !(art in ART_H)) throw new Error(`unknown picture ${art}`);
    return { ...s, design: 'lab', ...(art ? { art } : {}) };
  }) };
}
