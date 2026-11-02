import { strFromU8, unzipSync } from 'fflate';
import { H, W, newId, norm, slim, type CanvasAppearance } from './canvas';
import { arcSeg, presetPath, presetTextInset, type Adj } from './pptxGeom';

/**
 * PPTX → ClassFlow canvas. The slide is rebuilt the way PowerPoint resolves it: master → layout → slide for
 * placeholders, text styles, backgrounds and shared shapes; theme colours through the colour map; groups as
 * real transforms; tables with their table style. What cannot be drawn (charts, animations...) is listed, not hidden.
 */
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const DEFAULT_W = 12192000, DEFAULT_H = 6858000;

type Paragraphs = NonNullable<CanvasAppearance['paragraphs']>;
export type PptxTextBlock = { appearance?: CanvasAppearance; kind: 'text'; text: string; x: number; y: number; w: number; h: number; size: number; bold?: boolean; color?: string; align: 'left' | 'center' | 'right'; title?: boolean };
export type PptxImageBlock = { appearance?: CanvasAppearance; kind: 'image'; name: string; mime: string; bytes: Uint8Array; dataUrl: string; x: number; y: number; w: number; h: number };
export type PptxShapeBlock = { appearance?: CanvasAppearance; kind: 'shape'; shape: 'rect' | 'ellipse'; fill: string; x: number; y: number; w: number; h: number };
export type PptxBlock = PptxTextBlock | PptxImageBlock | PptxShapeBlock;
export type PptxSlide = { number: number; title: string; text: string; background: string; bgGradient?: string; width: number; height: number; slidePath: string; blocks: PptxBlock[]; notes?: string; hidden?: boolean; unsupported: string[] };
export type PptxDeck = { fileName: string; width: number; height: number; slides: PptxSlide[]; plainText: string; unsupported: string[] };
export type PptxProgress = { phase: string; percent: number; current?: number; total?: number; detail?: string };

/* ───────────── XML helpers ───────────── */
const kids = (p?: Element | null, name?: string) => (p ? Array.from(p.children).filter(e => !name || e.localName === name) : []);
const child = (p?: Element | null, name?: string) => kids(p, name)[0];
const desc = (p: Element | Document | null | undefined, name: string) => (p ? Array.from(p.getElementsByTagNameNS('*', name)) : []);
const first = (p: Element | Document | null | undefined, name: string) => desc(p, name)[0];
const attr = (e: Element | null | undefined, n: string) => e?.getAttribute(n) ?? '';
const has = (e: Element | null | undefined, n: string) => !!e && e.hasAttribute(n);
const nm = (e: Element | null | undefined, n: string, d = 0) => { const v = e?.getAttribute(n); const x = v == null || v === '' ? NaN : Number(v); return Number.isFinite(x) ? x : d; };
const on = (e: Element | null | undefined, n: string) => ['1', 'true', 'on'].includes(attr(e, n));
const rid = (e: Element | null | undefined, n: string) => e?.getAttributeNS(NS_R, n) || e?.getAttribute(`r:${n}`) || '';
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

function parseXml(bytes: Uint8Array, path: string): XMLDocument {
  const doc = new DOMParser().parseFromString(strFromU8(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(`PPTX XML файлы оқылмады: ${path}`);
  return doc;
}
function resolveZipPath(base: string, target: string) {
  const parts = (target.startsWith('/') ? target.slice(1) : `${base.split('/').slice(0, -1).join('/')}/${target}`).split('/');
  const out: string[] = [];
  for (const p of parts) { if (!p || p === '.') continue; if (p === '..') out.pop(); else out.push(p); }
  return out.join('/');
}

/* ───────────── package ───────────── */
type Files = Record<string, Uint8Array>;
type Rel = { id: string; target: string; type: string; external: boolean };
function openPkg(files: Files) {
  const docs = new Map<string, XMLDocument | undefined>(), rels = new Map<string, Rel[]>();
  const doc = (p: string) => { if (!docs.has(p)) docs.set(p, files[p] ? parseXml(files[p], p) : undefined); return docs.get(p); };
  const relList = (p: string) => {
    if (!rels.has(p)) {
      const parts = p.split('/'), file = parts.pop() || '', rp = [...parts, '_rels', `${file}.rels`].join('/');
      rels.set(p, files[rp] ? desc(parseXml(files[rp], rp), 'Relationship').map(e => ({ id: attr(e, 'Id'), target: attr(e, 'Target'), type: attr(e, 'Type'), external: attr(e, 'TargetMode') === 'External' })) : []);
    }
    return rels.get(p)!;
  };
  const target = (p: string, id: string) => { const r = relList(p).find(x => x.id === id); return r && !r.external ? resolveZipPath(p, r.target) : ''; };
  const byType = (p: string, t: string) => { const r = relList(p).find(x => x.type.endsWith(`/${t}`)); return r && !r.external ? resolveZipPath(p, r.target) : ''; };
  return { files, doc, relList, target, byType };
}
type Pkg = ReturnType<typeof openPkg>;

/* ───────────── colour ───────────── */
type RGB = [number, number, number];
type Col = { hex: string; a: number; css: string };
const hx = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
const mk = (rgb: RGB, a = 1): Col => { const hex = `#${rgb.map(hx).join('').toUpperCase()}`; a = clamp(a, 0, 1); return { hex, a, css: a >= 0.999 ? hex : `rgba(${rgb.map(v => Math.round(clamp(v, 0, 255))).join(',')},${+a.toFixed(3)})` }; };
const parseHex = (s: string): RGB | undefined => (/^[0-9a-f]{6}$/i.test(s) ? [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)) as RGB : undefined);
const toLin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const fromLin = (v: number) => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
function toHsl([r, g, b]: RGB): RGB {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl([h, s, l]: RGB): RGB {
  h = ((h % 1) + 1) % 1; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const f = (p: number, q: number, t: number) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}
const PRESET: Record<string, string> = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', lime: '00FF00', blue: '0000FF', yellow: 'FFFF00', cyan: '00FFFF', aqua: '00FFFF', magenta: '800080', fuchsia: 'FF00FF', gray: '808080', grey: '808080', lightGray: 'D3D3D3', lightGrey: 'D3D3D3', darkGray: 'A9A9A9', darkGrey: 'A9A9A9', orange: 'FFA500', purple: '800080', brown: 'A52A2A', pink: 'FFC0CB', navy: '000080', silver: 'C0C0C0', darkBlue: '00008B', darkRed: '8B0000', darkGreen: '006400' };
const COLOR_TAGS = new Set(['srgbClr', 'schemeClr', 'sysClr', 'prstClr', 'hslClr', 'scrgbClr']);

type Theme = { colors: Record<string, string>; major: string; minor: string; fills: Element[]; lines: Element[]; effects: Element[]; bgFills: Element[] };
const OFFICE: Record<string, string> = { dk1: '000000', lt1: 'FFFFFF', dk2: '1F497D', lt2: 'EEECE1', accent1: '4F81BD', accent2: 'C0504D', accent3: '9BBB59', accent4: '8064A2', accent5: '4BACC6', accent6: 'F79646', hlink: '0000FF', folHlink: '800080' };
type Env = {
  pkg: Pkg; k: number; ox: number; oy: number; theme: Theme; clrMap: Record<string, string>; part: string;
  defText?: Element; txStyles?: Element; layoutDoc?: XMLDocument; masterDoc?: XMLDocument; tableStyles?: XMLDocument;
  slideNo: number; skipPh?: boolean; warn: (s: string) => void;
};

function colorBase(c: Element, env: Env, ph?: string): RGB | undefined {
  const v = attr(c, 'val');
  switch (c.localName) {
    case 'srgbClr': return parseHex(v);
    case 'sysClr': return parseHex(attr(c, 'lastClr')) || parseHex(v === 'window' ? 'FFFFFF' : '000000');
    case 'prstClr': return parseHex(PRESET[v] || '');
    case 'scrgbClr': return [nm(c, 'r'), nm(c, 'g'), nm(c, 'b')].map(x => fromLin(x / 100000)) as RGB;
    case 'hslClr': return fromHsl([nm(c, 'hue') / 21600000, nm(c, 'sat') / 100000, nm(c, 'lum') / 100000]);
    case 'schemeClr': {
      if (v === 'phClr') return parseHex((ph || '').replace('#', ''));
      const key = env.clrMap[v] || v;
      return parseHex(env.theme.colors[key] || OFFICE[key] || '');
    }
  }
}
/** The colour inside `parent` (a fill, a gradient stop, a style reference...), with all its OOXML modifiers applied. */
function color(parent: Element | undefined, env: Env, ph?: string): Col | undefined {
  const c = kids(parent).find(e => COLOR_TAGS.has(e.localName));
  const base = c && colorBase(c, env, ph);
  if (!c || !base) return undefined;
  let rgb: RGB = base;
  let a = 1;
  for (const m of kids(c)) {
    const v = nm(m, 'val') / 100000;
    switch (m.localName) {
      case 'alpha': a = v; break;
      case 'alphaMod': a *= v; break;
      case 'alphaOff': a += v; break;
      case 'lumMod': case 'lumOff': case 'satMod': case 'satOff': case 'hueMod': case 'hueOff': case 'hue': case 'sat': case 'lum': case 'comp': {
        const t = toHsl(rgb);
        if (m.localName === 'lumMod') t[2] *= v; else if (m.localName === 'lumOff') t[2] += v;
        else if (m.localName === 'satMod') t[1] *= v; else if (m.localName === 'satOff') t[1] += v;
        else if (m.localName === 'hueMod') t[0] *= v; else if (m.localName === 'hueOff') t[0] += nm(m, 'val') / 21600000;
        else if (m.localName === 'hue') t[0] = nm(m, 'val') / 21600000; else if (m.localName === 'sat') t[1] = v; else if (m.localName === 'lum') t[2] = v;
        else t[0] += 0.5;
        rgb = fromHsl(t); break;
      }
      case 'shade': rgb = rgb.map(x => fromLin(toLin(x) * v)) as RGB; break;
      case 'tint': rgb = rgb.map(x => fromLin(toLin(x) * v + (1 - v))) as RGB; break;
      case 'inv': rgb = rgb.map(x => 255 - x) as RGB; break;
      case 'gray': { const y = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]; rgb = [y, y, y]; break; }
    }
  }
  return mk(rgb, a);
}
/** Default text colour: the theme's text colour (tx1) through the colour map. */
const ink0 = (env: Env) => mk(parseHex(env.theme.colors[env.clrMap.tx1 || 'dk1'] || '') || [0, 0, 0]);
const mix = (a: Col, b: Col, t: number) => { const pa = parseHex(a.hex.slice(1))!, pb = parseHex(b.hex.slice(1))!; return mk(pa.map((v, i) => v * t + pb[i] * (1 - t)) as RGB, 1); };

/* ───────────── theme ───────────── */
function readTheme(pkg: Pkg, masterPath: string): Theme {
  const t: Theme = { colors: { ...OFFICE }, major: 'Calibri', minor: 'Calibri', fills: [], lines: [], effects: [], bgFills: [] };
  const tp = pkg.byType(masterPath, 'theme'), doc = tp ? pkg.doc(tp) : undefined;
  if (!doc) return t;
  for (const c of kids(first(doc, 'clrScheme'))) {
    const v = attr(child(c, 'srgbClr'), 'val') || attr(child(c, 'sysClr'), 'lastClr');
    if (parseHex(v)) t.colors[c.localName] = v.toUpperCase();
  }
  t.major = attr(child(first(doc, 'majorFont'), 'latin'), 'typeface') || t.major;
  t.minor = attr(child(first(doc, 'minorFont'), 'latin'), 'typeface') || t.minor;
  const fmt = first(doc, 'fmtScheme');
  t.fills = kids(child(fmt, 'fillStyleLst')); t.lines = kids(child(fmt, 'lnStyleLst')); t.effects = kids(child(fmt, 'effectStyleLst')); t.bgFills = kids(child(fmt, 'bgFillStyleLst'));
  return t;
}
const themeFont = (face: string, env: Env) => (face === '+mj-lt' ? env.theme.major : face === '+mn-lt' ? env.theme.minor : face.startsWith('+') ? undefined : face || undefined);

/* ───────────── fills, lines, effects ───────────── */
type Grad = { angle: number; radial: boolean; scaled: boolean; stops: { pos: number; color: string; alpha: number }[] };
type Fill = { t: 'none' } | { t: 'solid'; c: Col } | { t: 'grad'; g: Grad } | { t: 'blip'; el: Element } | { t: 'patt'; c: Col };
const FILLS = new Set(['noFill', 'solidFill', 'gradFill', 'blipFill', 'pattFill']);
function fillEl(e: Element, env: Env, ph?: string): Fill | undefined {
  switch (e.localName) {
    case 'noFill': return { t: 'none' };
    case 'solidFill': { const c = color(e, env, ph); return c ? { t: 'solid', c } : undefined; }
    case 'gradFill': {
      const stops = kids(child(e, 'gsLst'), 'gs').flatMap(s => { const c = color(s, env, ph); return c ? [{ pos: nm(s, 'pos') / 1000, color: c.hex, alpha: c.a }] : []; });
      return stops.length ? { t: 'grad', g: { angle: nm(child(e, 'lin'), 'ang') / 60000, radial: !!child(e, 'path'), scaled: on(child(e, 'lin'), 'scaled'), stops } } : undefined;
    }
    case 'blipFill': return { t: 'blip', el: e };
    case 'pattFill': { const fg = color(child(e, 'fgClr'), env, ph), bg = color(child(e, 'bgClr'), env, ph); return fg && bg ? { t: 'patt', c: mix(fg, bg, 0.4) } : fg ? { t: 'patt', c: fg } : undefined; }
  }
}
const fillOf = (props: Element | undefined, env: Env, ph?: string) => { const e = kids(props).find(k => FILLS.has(k.localName)); return e ? fillEl(e, env, ph) : undefined; };
const cssGrad = (g: Grad) => {
  const stops = g.stops.map(s => `${s.color} ${s.pos}%`).join(', ');
  return g.radial ? `radial-gradient(circle at 50% 50%, ${stops})` : `linear-gradient(${g.angle + 90}deg, ${stops})`;
};
const fillColor = (f: Fill | undefined) => (f?.t === 'solid' || f?.t === 'patt' ? f.c : f?.t === 'grad' ? mk(parseHex(f.g.stops[0].color.slice(1))!, f.g.stops[0].alpha) : undefined);

type Ln = { w?: number; fill?: Fill; dash?: string; head?: string; tail?: string };
function lnOf(e: Element | undefined, env: Env, ph?: string): Ln {
  if (!e) return {};
  const end = (n: string) => { const t = attr(child(e, n), 'type'); return t || undefined; };
  return defined<Ln>({ w: has(e, 'w') ? nm(e, 'w') : undefined, fill: fillOf(e, env, ph), dash: attr(child(e, 'prstDash'), 'val') || undefined, head: end('headEnd'), tail: end('tailEnd') });
}

type Shadow = { x: number; y: number; blur: number; color: string };
function shadowOf(effectLst: Element | undefined, env: Env, ph?: string): Shadow | undefined {
  const s = child(effectLst, 'outerShdw');
  const c = s && color(s, env, ph);
  if (!s || !c) return undefined;
  const dist = nm(s, 'dist') * env.k, dir = (nm(s, 'dir') / 60000) * (Math.PI / 180);
  return { x: +(Math.cos(dir) * dist).toFixed(2), y: +(Math.sin(dir) * dist).toFixed(2), blur: +(nm(s, 'blurRad') * env.k).toFixed(2), color: c.css };
}

/* ───────────── transforms ───────────── */
type Tf = { map: (x: number, y: number) => [number, number]; sx: number; sy: number; rot: number; mirror: boolean; fh: boolean; fv: boolean };
const ROOT: Tf = { map: (x, y) => [x, y], sx: 1, sy: 1, rot: 0, mirror: false, fh: false, fv: false };
function groupTf(g: Element, tf: Tf): Tf {
  const x = child(child(g, 'grpSpPr'), 'xfrm');
  if (!x) return tf;
  const off = child(x, 'off'), ext = child(x, 'ext'), co = child(x, 'chOff'), ce = child(x, 'chExt');
  const ex = nm(ext, 'cx'), ey = nm(ext, 'cy'), cex = nm(ce, 'cx', ex) || ex, cey = nm(ce, 'cy', ey) || ey;
  const sx = cex > 0 ? ex / cex : 1, sy = cey > 0 ? ey / cey : 1, deg = nm(x, 'rot') / 60000, r = (deg * Math.PI) / 180, fh = on(x, 'flipH'), fv = on(x, 'flipV');
  const cos = Math.cos(r), sin = Math.sin(r);
  const local = (px: number, py: number): [number, number] => {
    let ux = (px - nm(co, 'x')) * sx - ex / 2, uy = (py - nm(co, 'y')) * sy - ey / 2;
    if (fh) ux = -ux;
    if (fv) uy = -uy;
    return [nm(off, 'x') + ex / 2 + ux * cos - uy * sin, nm(off, 'y') + ey / 2 + ux * sin + uy * cos];
  };
  return { map: (px, py) => tf.map(...local(px, py)), sx: tf.sx * sx, sy: tf.sy * sy, rot: tf.rot + (tf.mirror ? -deg : deg), mirror: tf.mirror !== (fh !== fv), fh: tf.fh !== fh, fv: tf.fv !== fv };
}
type Place = { x: number; y: number; w: number; h: number; rot: number; fh: boolean; fv: boolean };
function place(xfrm: Element | undefined, tf: Tf, env: Env): Place | undefined {
  if (!xfrm || !child(xfrm, 'ext')) return undefined;
  const off = child(xfrm, 'off'), ext = child(xfrm, 'ext');
  const ex = nm(ext, 'cx'), ey = nm(ext, 'cy'), [mx, my] = tf.map(nm(off, 'x') + ex / 2, nm(off, 'y') + ey / 2);
  const w = ex * tf.sx * env.k, h = ey * tf.sy * env.k, r = nm(xfrm, 'rot') / 60000;
  return { x: env.ox + mx * env.k - w / 2, y: env.oy + my * env.k - h / 2, w, h, rot: tf.rot + (tf.mirror ? -r : r), fh: tf.fh !== on(xfrm, 'flipH'), fv: tf.fv !== on(xfrm, 'flipV') };
}

/* ───────────── placeholders ───────────── */
const BODYISH = new Set(['', 'body', 'subTitle', 'obj', 'tbl', 'chart', 'pic', 'media', 'clipArt', 'dgm', 'org']);
const normType = (t: string) => (t === 'ctrTitle' ? 'title' : BODYISH.has(t) ? 'body' : t);
const phOf = (sp: Element | undefined) => child(child(child(sp, sp?.localName === 'pic' ? 'nvPicPr' : 'nvSpPr'), 'nvPr'), 'ph');
function findPh(doc: XMLDocument | undefined, type: string, idx: string, byIdx: boolean): Element | undefined {
  const all = desc(doc, 'sp').filter(sp => phOf(sp));
  if (byIdx && idx) { const hit = all.find(sp => attr(phOf(sp), 'idx') === idx); if (hit) return hit; }
  return all.find(sp => normType(attr(phOf(sp), 'type')) === normType(type));
}
type Inherit = { cat: '' | 'title' | 'body' | 'other'; layout?: Element; master?: Element };
function inherit(env: Env, ph: Element | undefined): Inherit {
  if (!ph) return { cat: '' };
  const type = attr(ph, 'type'), layout = findPh(env.layoutDoc, type, attr(ph, 'idx'), true);
  const lt = attr(phOf(layout), 'type') || type, master = findPh(env.masterDoc, lt, '', false);
  const n = normType(type);
  return { cat: n === 'title' ? 'title' : n === 'body' ? 'body' : 'other', layout, master };
}

/* ───────────── text ───────────── */
type RP = { sz?: number; b?: boolean; i?: boolean; u?: boolean; strike?: boolean; base?: number; caps?: 'all' | 'small' | 'none'; spc?: number; col?: Col; font?: string; href?: string; hl?: Col };
type Sp = { pct?: number; pts?: number };
type Bu = { t: 'none' } | { t: 'char'; ch: string } | { t: 'auto'; type: string; start: number };
type PP = { algn?: string; marL?: number; indent?: number; ln?: Sp; bef?: Sp; aft?: Sp; bu?: Bu; buClr?: Col; buSz?: number; buFont?: string };
type Layer = Element | { rp: RP };

function readRP(e: Element | undefined, env: Env): RP {
  if (!e) return {};
  const o: RP = {};
  if (has(e, 'sz')) o.sz = nm(e, 'sz') / 100;
  if (has(e, 'b')) o.b = on(e, 'b');
  if (has(e, 'i')) o.i = on(e, 'i');
  if (has(e, 'u')) o.u = attr(e, 'u') !== 'none';
  if (has(e, 'strike')) o.strike = attr(e, 'strike') !== 'noStrike';
  if (has(e, 'baseline')) o.base = nm(e, 'baseline') / 100000;
  if (has(e, 'cap')) o.caps = attr(e, 'cap') === 'small' ? 'small' : attr(e, 'cap') === 'none' ? 'none' : 'all';
  if (has(e, 'spc')) o.spc = nm(e, 'spc') / 100;
  const f = fillOf(e, env);
  if (f) o.col = fillColor(f);
  const lat = child(e, 'latin');
  if (lat) o.font = themeFont(attr(lat, 'typeface'), env);
  const hl = child(e, 'highlight');
  if (hl) o.hl = color(hl, env);
  const link = child(e, 'hlinkClick');
  if (link && rid(link, 'id')) { const r = env.pkg.relList(env.part).find(x => x.id === rid(link, 'id')); if (r?.external) o.href = r.target; }
  return o;
}
function readSp(e: Element | undefined, n: string, env: Env): Sp | undefined {
  const s = child(e, n), pc = child(s, 'spcPct'), pt = child(s, 'spcPts');
  return pc ? { pct: nm(pc, 'val') / 100000 } : pt ? { pts: (nm(pt, 'val') / 100) * 12700 * env.k } : undefined;
}
function readPP(e: Element | undefined, env: Env): PP {
  if (!e) return {};
  const o: PP = {};
  if (has(e, 'algn')) o.algn = attr(e, 'algn');
  if (has(e, 'marL')) o.marL = nm(e, 'marL') * env.k;
  if (has(e, 'indent')) o.indent = nm(e, 'indent') * env.k;
  o.ln = readSp(e, 'lnSpc', env); o.bef = readSp(e, 'spcBef', env); o.aft = readSp(e, 'spcAft', env);
  for (const c of kids(e)) {
    switch (c.localName) {
      case 'buNone': o.bu = { t: 'none' }; break;
      case 'buChar': o.bu = { t: 'char', ch: attr(c, 'char') || '•' }; break;
      case 'buBlip': o.bu = { t: 'char', ch: '•' }; break;
      case 'buAutoNum': o.bu = { t: 'auto', type: attr(c, 'type'), start: nm(c, 'startAt', 1) }; break;
      case 'buClr': o.buClr = color(c, env); break;
      case 'buSzPct': o.buSz = nm(c, 'val') / 100000; break;
      case 'buFont': o.buFont = attr(c, 'typeface') || undefined; break;
    }
  }
  return defined(o);
}
const merge = <T extends object>(a: T, b: T) => Object.assign(a, defined(b));

const WING: Record<string, string> = { '§': '▪', Ø: '➢', ü: '✓', q: '❑', v: '❖', n: '■', l: '●', u: '◆', p: '▪', '¨': '◻', '·': '•', Þ: '⇨', '': '•' };
const bulletChar = (ch: string, font?: string) => (font && /wingdings|symbol/i.test(font) ? WING[ch] || '•' : ch);
function numbering(type: string, n: number) {
  const alpha = (v: number) => String.fromCharCode(97 + ((v - 1) % 26));
  const roman = (v: number) => [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']].reduce((s, [k, r]) => { while (v >= (k as number)) { s += r; v -= k as number; } return s; }, '');
  const body = /^alphaLc/.test(type) ? alpha(n) : /^alphaUc/.test(type) ? alpha(n).toUpperCase() : /^romanLc/.test(type) ? roman(n) : /^romanUc/.test(type) ? roman(n).toUpperCase() : String(n);
  return /ParenBoth/.test(type) ? `(${body})` : /ParenR/.test(type) ? `${body})` : /Plain/.test(type) ? body : `${body}.`;
}
/** How tall a line of this font is, as a multiple of its size (PowerPoint uses the font's own metrics). */
const LINE_K: Record<string, number> = { calibri: 1.22, carlito: 1.22, arial: 1.15, helvetica: 1.15, 'times new roman': 1.15, georgia: 1.14, verdana: 1.22, tahoma: 1.21, cambria: 1.17, 'segoe ui': 1.33, 'courier new': 1.13, consolas: 1.17, inter: 1.21 };
const lineK = (font?: string) => LINE_K[(font || '').toLowerCase()] || 1.2;
const FONT_WORDS = /\s+(Bold|Heavy|Black|ExtraBold|SemiBold|Semibold|Medium|Light|ExtraLight|Thin|Italic|Oblique|Regular)$/;
function fontParts(name: string) {
  let family = name, bold = false, italic = false, m;
  while ((m = FONT_WORDS.exec(family))) { family = family.slice(0, m.index); if (/Bold|Heavy|Black/.test(m[1])) bold = true; if (/Italic|Oblique/.test(m[1])) italic = true; }
  return { family: family || name, bold, italic };
}

type Built = { paras: Paragraphs; text: string; first?: { size: number; bold: boolean; italic: boolean; color?: Col; font?: string; spc: number; align: 'left' | 'center' | 'right' } };
type BodyProps = { pad: number[]; anchor: string; wrap: boolean; vert: boolean; cols: number; colGap: number; scale: number; reduce: number };
function bodyProps(bps: (Element | undefined)[], env: Env, over: Partial<Record<'l' | 'r' | 't' | 'b', number>> = {}): BodyProps {
  const get = (n: string) => { for (let i = bps.length - 1; i >= 0; i--) if (has(bps[i], n)) return attr(bps[i], n); return ''; };
  const px = (n: string, d: number) => (get(n) === '' ? d : Number(get(n)) || 0) * env.k;
  const fit = [...bps].reverse().map(b => child(b, 'normAutofit')).find(Boolean);
  const v = get('vert');
  return {
    pad: [over.t ?? px('tIns', 45720), over.r ?? px('rIns', 91440), over.b ?? px('bIns', 45720), over.l ?? px('lIns', 91440)],
    anchor: get('anchor'), wrap: get('wrap') !== 'none', vert: v === 'vert' || v === 'eaVert' || v === 'vert270', cols: Math.max(1, Number(get('numCol')) || 1), colGap: px('spcCol', 0),
    scale: fit && has(fit, 'fontScale') ? nm(fit, 'fontScale') / 100000 : 1, reduce: fit ? nm(fit, 'lnSpcReduction') / 100000 : 0,
  };
}
/** Paragraphs of a text body, every property resolved through the style layers (low → high): defaults, master styles, placeholder lists, the shape's own. */
function buildText(body: Element | undefined, layers: Layer[], bp: BodyProps, env: Env): Built {
  const out: Paragraphs = [], counters: ({ type: string; n: number } | undefined)[] = [], pt = 12700 * env.k;
  let firstRun: Built['first'];
  const paras = kids(body, 'p');
  paras.forEach((p, pi) => {
    const pPr = child(p, 'pPr'), lvl = clamp(nm(pPr, 'lvl'), 0, 8), lv = `lvl${lvl + 1}pPr`;
    const pp: PP = {}, rp: RP = {};
    for (const L of layers) {
      if ('rp' in L) merge(rp, L.rp);
      else { const e = child(L, lv); if (e) { merge(pp, readPP(e, env)); merge(rp, readRP(child(e, 'defRPr'), env)); } }
    }
    merge(pp, readPP(pPr, env)); merge(rp, readRP(child(pPr, 'defRPr'), env));
    const runs: Paragraphs[number]['runs'] = [];
    const add = (text: string, r: RP) => {
      const { family, bold, italic } = fontParts(r.font || env.theme.minor);
      const hl = r.href ? mk(parseHex(env.theme.colors.hlink) || [0, 0, 255]) : undefined;
      runs.push(defined({
        text, size: +((r.sz ?? 18) * bp.scale * pt).toFixed(3), bold: r.b ?? bold, italic: r.i ?? italic, underline: r.u || (r.href ? true : undefined), strike: r.strike,
        color: (hl || r.col || ink0(env)).css, fontFamily: family, letterSpacing: r.spc ? +(r.spc * pt).toFixed(3) : undefined,
        baseline: r.base || undefined, caps: r.caps && r.caps !== 'none' ? r.caps : undefined, hl: r.hl?.css, href: r.href,
      }) as Paragraphs[number]['runs'][number]);
    };
    for (const e of kids(p)) {
      if (e.localName === 'r' || e.localName === 'fld') {
        const own = readRP(child(e, 'rPr'), env), merged = { ...rp }; merge(merged, own);
        let t = desc(e, 't').map(x => x.textContent || '').join('');
        if (e.localName === 'fld' && !t && attr(e, 'type').startsWith('slidenum')) t = String(env.slideNo);
        if (t) add(t, merged);
      } else if (e.localName === 'br') add('\n', { ...rp, ...defined(readRP(child(e, 'rPr'), env)) });
    }
    const text = runs.map(r => r.text).join('');
    if (!runs.length) add('', { ...rp, ...defined(readRP(child(p, 'endParaRPr'), env)) });
    const run0 = runs[0], size = Math.max(...runs.map(r => r.size)), k = lineK(run0.fontFamily);
    // bullets and numbers
    let bullet: Paragraphs[number]['bullet'];
    const bu = pp.bu;
    counters.length = Math.min(counters.length, lvl + 1);
    if (bu?.t === 'auto' && text) { const c = counters[lvl]; counters[lvl] = c && c.type === bu.type ? { type: bu.type, n: c.n + 1 } : { type: bu.type, n: bu.start }; }
    else if (bu?.t !== 'auto') delete counters[lvl];
    if (text && bu && bu.t !== 'none') {
      const bt = bu.t === 'char' ? bulletChar(bu.ch, pp.buFont) : numbering(bu.type, counters[lvl]?.n ?? bu.start);
      bullet = defined({ text: bt, color: pp.buClr?.css || run0.color, size: +(run0.size * (pp.buSz ?? 1)).toFixed(3), fontFamily: pp.buFont && !/wingdings|symbol/i.test(pp.buFont) ? pp.buFont : undefined }) as Paragraphs[number]['bullet'];
    }
    const sp = (s: Sp | undefined) => (s?.pts !== undefined ? s.pts : s?.pct !== undefined ? s.pct * size * k : undefined);
    const lnRaw = pp.ln, lineHeight = lnRaw?.pts !== undefined ? lnRaw.pts : lnRaw?.pct !== undefined ? Math.max(0.1, lnRaw.pct - bp.reduce) * size * k : bp.reduce ? (1 - bp.reduce) * size * k : undefined;
    if (!firstRun && text) firstRun = { size: run0.size, bold: !!run0.bold, italic: !!run0.italic, color: parseHexCss(run0.color), font: run0.fontFamily, spc: run0.letterSpacing || 0, align: pp.algn === 'ctr' ? 'center' : pp.algn === 'r' ? 'right' : 'left' };
    out.push(defined({
      align: pp.algn === 'ctr' ? 'center' : pp.algn === 'r' ? 'right' : pp.algn === 'just' || pp.algn === 'dist' ? 'justify' : 'left',
      lineHeight: lineHeight !== undefined ? +lineHeight.toFixed(3) : undefined, before: pi ? sp(pp.bef) : undefined, after: sp(pp.aft),
      marL: pp.marL || undefined, indent: pp.indent || undefined, bullet, runs,
    }) as Paragraphs[number]);
  });
  return { paras: out, text: out.map(p => p.runs.map(r => r.text).join('')).join('\n'), first: firstRun };
}
const parseHexCss = (c?: string): Col | undefined => { const rgb = c && /^#[0-9a-f]{6}$/i.test(c) ? parseHex(c.slice(1)) : undefined; return rgb ? mk(rgb) : undefined; };

/** Text → text block appearance. `box` is the area text lives in (the shape, or its inner text rectangle). */
function textBlock(t: Built, bp: BodyProps, box: Place, title: boolean, env: Env, extra: Partial<CanvasAppearance> = {}): PptxTextBlock | undefined {
  if (!t.text.trim() && !t.paras.some(p => p.runs.some(r => r.text))) return undefined;
  const f = t.first || { size: 18 * 12700 * env.k, bold: false, italic: false, font: undefined, spc: 0, align: 'left' as const, color: undefined };
  return {
    kind: 'text', text: t.text, x: box.x, y: box.y, w: box.w, h: box.h, size: f.size, bold: f.bold, color: f.color && f.color.a >= 0.999 ? f.color.hex : undefined, align: f.align, title,
    appearance: defined<CanvasAppearance>({
      fontFamily: f.font, italic: f.italic, lineHeight: t.paras[0]?.lineHeight, letterSpacing: f.spc || undefined, padding: bp.pad,
      valign: bp.anchor === 'ctr' ? 'middle' : bp.anchor === 'b' ? 'bottom' : 'top', wrap: bp.wrap, paragraphs: t.paras,
      rotation: box.rot || undefined, vert: bp.vert || undefined, cols: bp.cols > 1 ? bp.cols : undefined, colGap: bp.cols > 1 ? bp.colGap : undefined, ...extra,
    }),
  };
}

/* ───────────── geometry ───────────── */
const adjOf = (g: Element | undefined): Adj => Object.fromEntries(desc(g, 'gd').map(d => [attr(d, 'name'), Number(attr(d, 'fmla').replace('val ', ''))]).filter(([, v]) => Number.isFinite(v)));
const f2 = (n: number) => (Math.round(n * 100) / 100).toString();
/** Custom geometry → one SVG path in px of the shape box. */
function custPath(g: Element, w: number, h: number): string | undefined {
  const parts: string[] = [];
  for (const path of desc(g, 'path')) {
    const pw = nm(path, 'w'), ph = nm(path, 'h'), sx = pw ? w / pw : w ? w / Math.max(1, ...desc(path, 'pt').map(p => nm(p, 'x'))) : 1, sy = ph ? h / ph : h ? h / Math.max(1, ...desc(path, 'pt').map(p => nm(p, 'y'))) : 1;
    let cx = 0, cy = 0, d = '';
    const pts = (c: Element) => kids(c, 'pt').map(p => [nm(p, 'x') * sx, nm(p, 'y') * sy] as [number, number]);
    for (const c of kids(path)) {
      const p = pts(c);
      switch (c.localName) {
        case 'moveTo': if (p[0]) { [cx, cy] = p[0]; d += `M ${f2(cx)} ${f2(cy)} `; } break;
        case 'lnTo': if (p[0]) { [cx, cy] = p[0]; d += `L ${f2(cx)} ${f2(cy)} `; } break;
        case 'cubicBezTo': if (p.length >= 3) { d += `C ${p.map(q => `${f2(q[0])} ${f2(q[1])}`).join(' ')} `; [cx, cy] = p[2]; } break;
        case 'quadBezTo': if (p.length >= 2) { d += `Q ${p.map(q => `${f2(q[0])} ${f2(q[1])}`).join(' ')} `; [cx, cy] = p[1]; } break;
        case 'arcTo': {
          const a = arcSeg(cx / sx, cy / sy, nm(c, 'wR'), nm(c, 'hR'), nm(c, 'stAng') / 60000, nm(c, 'swAng') / 60000);
          d += `A ${f2(a.rx * sx)} ${f2(a.ry * sy)} 0 ${a.large} ${a.sweep} ${f2(a.x * sx)} ${f2(a.y * sy)} `; cx = a.x * sx; cy = a.y * sy; break;
        }
        case 'close': d += 'Z '; break;
      }
    }
    if (d) parts.push(d.trim());
  }
  return parts.length && !parts.some(d => /NaN/.test(d)) ? parts.join(' ') : undefined;
}

/* ───────────── pictures ───────────── */
const MIMES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp' };
function dataUrl(bytes: Uint8Array, mime: string) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}
function picture(blipFill: Element | undefined, env: Env): { name: string; mime: string; bytes: Uint8Array; dataUrl: string; viewport: number[]; alpha?: number } | undefined {
  const blip = child(blipFill, 'blip'), id = rid(blip, 'embed');
  const path = id ? env.pkg.target(env.part, id) : '';
  const bytes = path ? env.pkg.files[path] : undefined;
  if (!bytes) return undefined;
  const ext = path.split('.').pop()?.toLowerCase() || '', mime = MIMES[ext];
  if (!mime) { env.warn(`${ext.toUpperCase()} суреті [image] браузерде ашылмайды`); return undefined; }
  const src = child(blipFill, 'srcRect'), fr = child(child(blipFill, 'stretch'), 'fillRect');
  const sl = nm(src, 'l') / 100000, st = nm(src, 't') / 100000, vw = Math.max(0.001, 1 - sl - nm(src, 'r') / 100000), vh = Math.max(0.001, 1 - st - nm(src, 'b') / 100000);
  const fl = nm(fr, 'l') / 1000, ft = nm(fr, 't') / 1000, iw = 100 - fl - nm(fr, 'r') / 1000, ih = 100 - ft - nm(fr, 'b') / 1000;
  const alpha = child(blip, 'alphaModFix');
  if (child(blip, 'duotone') || child(blip, 'lum') || child(blip, 'biLevel') || child(blip, 'clrChange')) env.warn('Сурет түстерін түзету [recolor] қолданылмады');
  return { name: path.split('/').pop() || 'image', mime, bytes, dataUrl: dataUrl(bytes, mime), viewport: [fl - (sl / vw) * iw, ft - (st / vh) * ih, iw / vw, ih / vh], alpha: alpha ? nm(alpha, 'amt', 100000) / 100000 : undefined };
}

/* ───────────── drawing ───────────── */
type Out = PptxBlock[];
const LINES = /^(line|straightConnector1|(bent|curved)Connector\d)$/;
const stroke = (ln: Ln, env: Env, isLine: boolean) => {
  const c = fillColor(ln.fill);
  if (!c || ln.fill?.t === 'none' || ln.w === 0) return undefined;
  return { color: c.css, width: Math.max(0.2, (ln.w ?? 9525) * env.k) || (isLine ? 1 : 0.75), dash: ln.dash && ln.dash !== 'solid' ? ln.dash : undefined };
};

function drawTree(tree: Element | undefined, tf: Tf, env: Env, out: Out) {
  for (const n of kids(tree)) {
    if (on(first(n, 'cNvPr'), 'hidden') && n.localName !== 'AlternateContent') continue;
    switch (n.localName) {
      case 'sp': case 'cxnSp': addSp(n, tf, env, out); break;
      case 'pic': addPic(n, tf, env, out); break;
      case 'graphicFrame': addFrame(n, tf, env, out); break;
      case 'grpSp': drawTree(n, groupTf(n, tf), env, out); break;
      case 'AlternateContent': drawTree(child(n, 'Fallback') || child(n, 'Choice'), tf, env, out); break;
    }
  }
}

function addSp(node: Element, tf: Tf, env: Env, out: Out) {
  const ph = phOf(node);
  if (ph && env.skipPh) return;
  const inh = inherit(env, ph), chain = [node, inh.layout, inh.master].filter(Boolean) as Element[];
  const props = chain.map(c => child(c, 'spPr'));
  const dsp = node.namespaceURI?.includes('diagram') || node.namespaceURI?.includes('drawing/2008');
  const pl = place(props.map(p => child(p, 'xfrm')).find(Boolean), tf, env);
  if (!pl) return;
  const geom = props.map(p => child(p, 'prstGeom') || child(p, 'custGeom')).find(Boolean);
  const prst = geom?.localName === 'prstGeom' ? attr(geom, 'prst') : geom ? 'custom' : 'rect';
  const style = child(node, 'style');
  const phc = (n: string) => { const r = child(style, n); return { idx: nm(r, 'idx'), ph: color(r, env)?.hex }; };

  // fill, line, shadow: own → placeholder in layout → in master → shape style from the theme
  let fill = props.map(p => fillOf(p, env)).find(Boolean);
  if (!fill && style) { const r = phc('fillRef'); const e = r.idx >= 1001 ? env.theme.bgFills[r.idx - 1001] : r.idx ? env.theme.fills[r.idx - 1] : undefined; fill = e ? fillEl(e, env, r.ph) : undefined; }
  let ln: Ln = {};
  if (style) { const r = phc('lnRef'); ln = r.idx ? lnOf(env.theme.lines[r.idx - 1], env, r.ph) : {}; if (r.idx && !ln.fill) ln.fill = r.ph ? { t: 'solid', c: color(child(style, 'lnRef'), env)! } : undefined; }
  for (const p of [...props].reverse()) ln = { ...ln, ...lnOf(child(p, 'ln'), env) };
  let shadow = props.map(p => shadowOf(child(p, 'effectLst'), env)).find(Boolean);
  if (!shadow && style) { const r = phc('effectRef'); shadow = r.idx ? shadowOf(child(env.theme.effects[r.idx - 1], 'effectLst'), env, r.ph) : undefined; }

  const isLine = node.localName === 'cxnSp' || LINES.test(prst);
  const adj = adjOf(geom && child(geom, 'avLst'));
  let path: string | undefined | null = prst === 'custom' ? custPath(geom!, pl.w, pl.h) : presetPath(prst, pl.w, pl.h, adj);
  if (path === null) { env.warn(`«${prst}» фигурасы төртбұрышпен ауыстырылды`); path = presetPath('rect', pl.w, pl.h)!; }
  const sk = stroke(ln, env, isLine);

  // picture fill
  if (fill?.t === 'blip') {
    const pic = picture(fill.el, env);
    if (pic) out.push({ kind: 'image', name: pic.name, mime: pic.mime, bytes: pic.bytes, dataUrl: pic.dataUrl, x: pl.x, y: pl.y, w: pl.w, h: pl.h, appearance: defined<CanvasAppearance>({ imageViewport: pic.viewport, fit: 'fill', rotation: pl.rot || undefined, flipH: pl.fh || undefined, flipV: pl.fv || undefined, radius: /ellipse/i.test(prst) ? 9999 : prst === 'roundRect' ? Math.min(pl.w, pl.h) * clamp(adj.adj ?? 16667, 0, 50000) / 100000 : undefined, stroke: sk?.color, strokeWidth: sk?.width, dash: sk?.dash, shadow, opacity: pic.alpha }) });
    fill = { t: 'none' };
  }
  const solid = fill?.t === 'solid' || fill?.t === 'patt' ? fill.c : undefined, grad = fill?.t === 'grad' ? fill.g : undefined;
  if ((solid || grad || sk) && path) {
    const m = isLine || pl.w < 1 || pl.h < 1 ? Math.max(4, (sk?.width ?? 1) * 3) : 0;
    out.push({
      kind: 'shape', shape: /ellipse|oval/i.test(prst) ? 'ellipse' : 'rect', fill: solid?.css || 'transparent', x: pl.x - m, y: pl.y - m, w: pl.w + 2 * m, h: pl.h + 2 * m,
      appearance: defined<CanvasAppearance>({
        px: true, path, viewBox: `${f2(-m)} ${f2(-m)} ${f2(pl.w + 2 * m)} ${f2(pl.h + 2 * m)}`, stroke: sk?.color, strokeWidth: sk?.width, dash: sk?.dash, head: isLine ? ln.head : undefined, tail: isLine ? ln.tail : undefined,
        gradDef: grad, shadow, rotation: pl.rot || undefined, flipH: pl.fh || undefined, flipV: pl.fv || undefined,
      }),
    });
  }

  // text
  const body = child(node, 'txBody');
  if (!body) return;
  const lst = (sp: Element | undefined) => child(child(sp, 'txBody'), 'lstStyle');
  const bps = [child(inh.master && child(inh.master, 'txBody'), 'bodyPr'), child(inh.layout && child(inh.layout, 'txBody'), 'bodyPr'), child(body, 'bodyPr')];
  const fontRef = child(style, 'fontRef'), fc = fontRef && color(fontRef, env);
  const layers: Layer[] = [env.defText, inh.cat ? child(env.txStyles, `${inh.cat}Style`) : undefined, lst(inh.master), lst(inh.layout), fc ? { rp: { col: fc } } : undefined, lst(node)].filter(Boolean) as Layer[];
  const bp = bodyProps(bps, env);
  const tx = child(node, 'txXfrm');
  let box: Place = pl;
  if (dsp && tx) box = place(tx, tf, env) || pl;
  else { const [il, it, ir, ib] = presetTextInset(prst, pl.w, pl.h, adj); box = { ...pl, x: pl.x + il, y: pl.y + it, w: Math.max(0.01, pl.w - il - ir), h: Math.max(0.01, pl.h - it - ib) }; }
  if (pl.fv) box = { ...box, rot: box.rot + 180 };
  if (attr(child(bps[2], 'prstTxWarp'), 'prst') && attr(child(bps[2], 'prstTxWarp'), 'prst') !== 'textNoShape') env.warn('Мәтін формасы (WordArt) қолданылмады');
  const text = buildText(body, layers, bp, env);
  const tb = textBlock(text, bp, box, inh.cat === 'title', env);
  if (tb) out.push(tb);
}

function addPic(node: Element, tf: Tf, env: Env, out: Out) {
  const ph = phOf(node);
  if (ph && env.skipPh) return;
  const inh = inherit(env, ph);
  const xfrm = [child(node, 'spPr'), child(inh.layout, 'spPr'), child(inh.master, 'spPr')].map(p => child(p, 'xfrm')).find(Boolean);
  const pl = place(xfrm, tf, env), pic = picture(child(node, 'blipFill'), env);
  if (!pl || !pic) return;
  const props = child(node, 'spPr'), geom = child(props, 'prstGeom'), prst = attr(geom, 'prst'), adj = adjOf(child(geom, 'avLst'));
  const sk = stroke(lnOf(child(props, 'ln'), env), env, false);
  out.push({ kind: 'image', name: pic.name, mime: pic.mime, bytes: pic.bytes, dataUrl: pic.dataUrl, x: pl.x, y: pl.y, w: pl.w, h: pl.h, appearance: defined<CanvasAppearance>({
    imageViewport: pic.viewport, fit: 'fill', rotation: pl.rot || undefined, flipH: pl.fh || undefined, flipV: pl.fv || undefined, opacity: pic.alpha, stroke: sk?.color, strokeWidth: sk?.width, dash: sk?.dash,
    radius: /ellipse|oval/i.test(prst) ? 9999 : prst === 'roundRect' ? (Math.min(pl.w, pl.h) * clamp(adj.adj ?? 16667, 0, 50000)) / 100000 : undefined, shadow: shadowOf(child(props, 'effectLst'), env),
  }) });
}

/* ───────────── frames: tables, SmartArt, charts ───────────── */
function addFrame(node: Element, tf: Tf, env: Env, out: Out) {
  const data = first(node, 'graphicData'), uri = attr(data, 'uri');
  if (child(data, 'tbl')) return addTable(node, child(data, 'tbl')!, tf, env, out);
  if (uri.endsWith('/diagram')) return addDiagram(node, data!, tf, env, out);
  if (uri.endsWith('/chart')) env.warn('Диаграмма [chart] көрсетілмейді');
  else if (child(data, 'oleObj')) env.warn('Ендірілген нысан [OLE object] көрсетілмейді');
  else env.warn('Қолдау көрсетілмейтін нысан [graphic frame]');
}
function addDiagram(node: Element, data: Element, tf: Tf, env: Env, out: Out) {
  const dm = rid(first(data, 'relIds'), 'dm'), dmPath = dm ? env.pkg.target(env.part, dm) : '';
  const ext = dmPath ? first(env.pkg.doc(dmPath), 'dataModelExt') : undefined;
  const drawing = ext ? env.pkg.target(env.part, attr(ext, 'relId')) : env.pkg.byType(env.part, 'diagramDrawing');
  const doc = drawing ? env.pkg.doc(drawing) : undefined, off = child(child(node, 'xfrm'), 'off');
  if (!doc) return env.warn('SmartArt сызбасы [SmartArt] көрсетілмейді');
  const ox = nm(off, 'x'), oy = nm(off, 'y');
  drawTree(first(doc, 'spTree'), { ...tf, map: (x, y) => tf.map(ox + x, oy + y) }, { ...env, part: drawing }, out);
}

type Edge = Ln | undefined;
type StylePart = { fill?: Fill; b?: boolean; col?: Col; bd: Partial<Record<'left' | 'right' | 'top' | 'bottom' | 'insideH' | 'insideV', Ln>> };
/** PowerPoint's built-in "Medium Style 2" family and the "no style" tables; any other id gets the plain look and a note. */
const MEDIUM2: Record<string, string> = { '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}': 'accent1', '{21E4AEA4-8DFA-4A89-87EB-49C32662AFE0}': 'accent2', '{F5AB1C69-6EDB-4FF4-983F-18BD219EF322}': 'accent3', '{00A15C55-8517-42AA-B614-E9B94910E393}': 'accent4', '{7DF18680-E054-41AD-8BC1-D1AEF772440D}': 'accent5', '{93296810-A885-4BE3-A3E7-6D5BEEA58F35}': 'accent6', '{073A0DAA-6AF3-43AB-8588-CEC1D06C72B9}': 'dk1' };
function tableStyle(id: string, env: Env): Record<string, StylePart> | undefined {
  const xmlStyle = desc(env.tableStyles, 'tblStyle').find(s => attr(s, 'styleId') === id);
  if (xmlStyle) {
    const res: Record<string, StylePart> = {};
    for (const part of kids(xmlStyle)) {
      const tc = child(part, 'tcStyle'), tt = child(part, 'tcTxStyle'), bd: StylePart['bd'] = {};
      for (const side of kids(child(tc, 'tcBdr'))) bd[side.localName as keyof StylePart['bd']] = lnOf(child(side, 'ln'), env);
      const fl = child(tc, 'fill');
      res[part.localName] = { fill: fl ? fillOf(fl, env) : undefined, b: has(tt, 'b') ? attr(tt, 'b') === 'on' : undefined, col: tt ? color(tt, env) : undefined, bd };
    }
    return res;
  }
  const accent = MEDIUM2[id];
  if (!accent) { if (!/^\{(2D5ABB26-0587-4C30-8999-92F81FD0307C|5940675A-B579-460E-94D1-54222C63F5DA)\}$/.test(id)) env.warn('Кесте стилі [table style] жуық түрде берілді'); return undefined; }
  const base = parseHex(env.theme.colors[accent] || '000000')!, light = mk([255, 255, 255]), dark = parseHex(env.theme.colors.dk1) || [0, 0, 0];
  const tintOf = (t: number) => mk(base.map(x => fromLin(toLin(x) * t + (1 - t))) as RGB);
  const white: Ln = { w: 12700, fill: { t: 'solid', c: light } }, thick: Ln = { w: 38100, fill: { t: 'solid', c: light } };
  const all = { left: white, right: white, top: white, bottom: white, insideH: white, insideV: white };
  const acc: Fill = { t: 'solid', c: mk(base) };
  return {
    wholeTbl: { fill: { t: 'solid', c: tintOf(0.2) }, col: mk(dark), bd: all },
    band1H: { fill: { t: 'solid', c: tintOf(0.4) }, bd: {} }, band1V: { fill: { t: 'solid', c: tintOf(0.4) }, bd: {} },
    firstCol: { fill: acc, b: true, col: light, bd: {} }, lastCol: { fill: acc, b: true, col: light, bd: {} },
    lastRow: { fill: acc, b: true, col: light, bd: { top: thick } }, firstRow: { fill: acc, b: true, col: light, bd: { bottom: thick } },
  };
}

function addTable(node: Element, tbl: Element, tf: Tf, env: Env, out: Out) {
  const pl = place(child(node, 'xfrm'), tf, env);
  if (!pl) return;
  const pr = child(tbl, 'tblPr'), styleId = attr(pr, 'tableStyleId') || text(child(pr, 'tableStyleId'));
  const styles = (styleId && tableStyle(styleId, env)) || undefined;
  const cols = kids(child(tbl, 'tblGrid'), 'gridCol').map(c => nm(c, 'w') * tf.sx * env.k), rows = kids(tbl, 'tr');
  const heights = rows.map(r => nm(r, 'h') * tf.sy * env.k);
  const xs = cols.reduce<number[]>((a, w) => [...a, a[a.length - 1] + w], [pl.x]), ys = heights.reduce<number[]>((a, h) => [...a, a[a.length - 1] + h], [pl.y]);
  const flag = (n: string) => on(pr, n);
  const R = rows.length, C = cols.length;
  const parts = (r: number, c: number) => {
    const names = ['wholeTbl'];
    const bodyRow = r - (flag('firstRow') ? 1 : 0);
    if (flag('bandRow') && !(flag('firstRow') && r === 0) && !(flag('lastRow') && r === R - 1)) names.push(bodyRow % 2 === 0 ? 'band1H' : 'band2H');
    const bodyCol = c - (flag('firstCol') ? 1 : 0);
    if (flag('bandCol') && !(flag('firstCol') && c === 0) && !(flag('lastCol') && c === C - 1)) names.push(bodyCol % 2 === 0 ? 'band1V' : 'band2V');
    if (flag('lastCol') && c === C - 1) names.push('lastCol');
    if (flag('firstCol') && c === 0) names.push('firstCol');
    if (flag('lastRow') && r === R - 1) names.push('lastRow');
    if (flag('firstRow') && r === 0) names.push('firstRow');
    return names.map(n => [n, styles?.[n]] as const).filter((x): x is readonly [string, StylePart] => !!x[1]);
  };
  type Cell = { r: number; c: number; el: Element; rs: number; cs: number };
  // every grid cell has its own <a:tc>; merged-away ones are marked hMerge / vMerge and belong to the cell that spans them
  const cells: Cell[] = [], grid: (Cell | undefined)[][] = rows.map(() => []);
  rows.forEach((row, r) => {
    kids(row, 'tc').forEach((el, c) => {
      if (on(el, 'hMerge') || on(el, 'vMerge')) return;
      const cs = Math.max(1, nm(el, 'gridSpan', 1)), rs = Math.max(1, nm(el, 'rowSpan', 1)), cell = { r, c, el, rs, cs };
      cells.push(cell);
      for (let i = 0; i < rs; i++) for (let j = 0; j < cs; j++) if (grid[r + i]) grid[r + i][c + j] = cell;
    });
  });
  const edgeOf = (cell: Cell, side: 'left' | 'right' | 'top' | 'bottom'): Edge => {
    const tc = child(cell.el, 'tcPr'), explicit = child(tc, `ln${side[0].toUpperCase()}`);
    if (explicit) return lnOf(explicit, env);
    let res: Ln | undefined;
    const r1 = cell.r + cell.rs - 1, c1 = cell.c + cell.cs - 1;
    const outer = (side === 'left' && cell.c === 0) || (side === 'right' && c1 === C - 1) || (side === 'top' && cell.r === 0) || (side === 'bottom' && r1 === R - 1);
    for (const [name, part] of parts(cell.r, cell.c)) {
      const direct = part.bd[side], inside = side === 'left' || side === 'right' ? part.bd.insideV : part.bd.insideH;
      const v = name === 'wholeTbl' ? (outer ? direct : inside) : direct ?? (outer ? undefined : inside);
      if (v) res = v;
    }
    return res;
  };
  const fills: Out = [], lines: Out = [], texts: Out = [];
  for (const cell of cells) {
    const x = xs[cell.c], y = ys[cell.r], w = xs[Math.min(C, cell.c + cell.cs)] - x, h = ys[Math.min(R, cell.r + cell.rs)] - y;
    const tc = child(cell.el, 'tcPr'), pp = parts(cell.r, cell.c);
    let fill: Fill | undefined = fillOf(tc, env);
    if (!fill) for (const [, part] of pp) if (part.fill) fill = part.fill;
    const sc = fillColor(fill), g = fill?.t === 'grad' ? fill.g : undefined;
    if (sc || g) fills.push({ kind: 'shape', shape: 'rect', fill: sc && !g ? sc.css : 'transparent', x, y, w, h, appearance: { px: true, tableCell: true, path: `M 0 0 H ${f2(w)} V ${f2(h)} H 0 Z`, viewBox: `0 0 ${f2(w)} ${f2(h)}`, gradDef: g } });
    const seg = (ln: Edge, x1: number, y1: number, x2: number, y2: number) => {
      const sk = ln && stroke(ln, env, true);
      if (!sk) return;
      const m = Math.max(4, sk.width * 3);
      lines.push({ kind: 'shape', shape: 'rect', fill: 'transparent', x: Math.min(x1, x2) - m, y: Math.min(y1, y2) - m, w: Math.abs(x2 - x1) + 2 * m, h: Math.abs(y2 - y1) + 2 * m, appearance: { px: true, path: `M ${f2(x1 - Math.min(x1, x2))} ${f2(y1 - Math.min(y1, y2))} L ${f2(x2 - Math.min(x1, x2))} ${f2(y2 - Math.min(y1, y2))}`, viewBox: `${f2(-m)} ${f2(-m)} ${f2(Math.abs(x2 - x1) + 2 * m)} ${f2(Math.abs(y2 - y1) + 2 * m)}`, stroke: sk.color, strokeWidth: sk.width, dash: sk.dash } });
    };
    // each shared edge is drawn once: by the cell on its left / above, unless that cell has nothing and the neighbour does
    const neighbour = (dr: number, dc: number) => grid[cell.r + (dr > 0 ? cell.rs - 1 + dr : dr)]?.[cell.c + (dc > 0 ? cell.cs - 1 + dc : dc)];
    const right = neighbour(0, 1), below = neighbour(1, 0);
    seg(edgeOf(cell, 'right') || (right && right !== cell ? edgeOf(right, 'left') : undefined), x + w, y, x + w, y + h);
    seg(edgeOf(cell, 'bottom') || (below && below !== cell ? edgeOf(below, 'top') : undefined), x, y + h, x + w, y + h);
    if (cell.c === 0) seg(edgeOf(cell, 'left'), x, y, x, y + h);
    if (cell.r === 0) seg(edgeOf(cell, 'top'), x, y, x + w, y);
    // text
    const body = child(cell.el, 'txBody');
    if (!body) continue;
    const rp: RP = {};
    for (const [, part] of pp) { if (part.b !== undefined) rp.b = part.b; if (part.col) rp.col = part.col; }
    const bp = bodyProps([child(body, 'bodyPr')], env, { l: has(tc, 'marL') ? nm(tc, 'marL') * env.k : undefined, r: has(tc, 'marR') ? nm(tc, 'marR') * env.k : undefined, t: has(tc, 'marT') ? nm(tc, 'marT') * env.k : undefined, b: has(tc, 'marB') ? nm(tc, 'marB') * env.k : undefined });
    bp.anchor = attr(tc, 'anchor') || 't';
    const t = buildText(body, [env.defText, { rp }, child(body, 'lstStyle')].filter(Boolean) as Layer[], bp, env);
    const tb = textBlock(t, bp, { x, y, w, h, rot: 0, fh: false, fv: false }, false, env);
    if (tb) texts.push(tb);
  }
  out.push(...fills, ...lines, ...texts);
}
const text = (e: Element | undefined) => e?.textContent?.trim() || '';

/* ───────────── slide ───────────── */
type Bg = { color?: Col; grad?: Grad; image?: PptxImageBlock };
function backgroundOf(doc: XMLDocument | undefined, env: Env): Bg | undefined {
  const bg = first(doc, 'bg');
  if (!bg) return undefined;
  const pr = child(bg, 'bgPr'), ref = child(bg, 'bgRef');
  let fill = pr ? fillOf(pr, env) : undefined;
  if (!fill && ref) { const idx = nm(ref, 'idx'), e = env.theme.bgFills[idx - 1001] || env.theme.fills[idx - 1], ph = color(ref, env); fill = e ? fillEl(e, env, ph?.hex) : ph ? { t: 'solid', c: ph } : undefined; }
  if (!fill) return undefined;
  if (fill.t === 'blip') {
    const pic = picture(fill.el, env);
    return pic ? { image: { kind: 'image', name: `background-${pic.name}`, mime: pic.mime, bytes: pic.bytes, dataUrl: pic.dataUrl, x: 0, y: 0, w: W, h: H, appearance: { fit: 'fill', imageViewport: pic.viewport } } } : undefined;
  }
  return fill.t === 'grad' ? { grad: fill.g, color: fillColor(fill) } : { color: fillColor(fill) };
}

function notesOf(pkg: Pkg, slidePath: string): string | undefined {
  const np = pkg.byType(slidePath, 'notesSlide'), doc = np ? pkg.doc(np) : undefined;
  if (!doc) return undefined;
  const body = desc(doc, 'sp').find(sp => attr(phOf(sp), 'type') === 'body');
  const t = kids(child(body, 'txBody'), 'p').map(p => desc(p, 't').map(x => x.textContent || '').join('')).join('\n').trim();
  return t || undefined;
}

type DeckCx = { pkg: Pkg; width: number; height: number; k: number; ox: number; oy: number; defText?: Element; tableStyles?: XMLDocument; themes: Map<string, Theme> };
function parseSlide(d: DeckCx, path: string, number: number): PptxSlide {
  const { pkg } = d, doc = pkg.doc(path)!, warns = new Set<string>();
  const layoutPath = pkg.byType(path, 'slideLayout'), layoutDoc = layoutPath ? pkg.doc(layoutPath) : undefined;
  const masterPath = layoutPath ? pkg.byType(layoutPath, 'slideMaster') : '', masterDoc = masterPath ? pkg.doc(masterPath) : undefined;
  if (masterPath && !d.themes.has(masterPath)) d.themes.set(masterPath, readTheme(pkg, masterPath));
  const theme = d.themes.get(masterPath) || readTheme(pkg, masterPath);
  const clrMap: Record<string, string> = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' };
  const mapEl = first(masterDoc, 'clrMap'), ovr = child(first(doc, 'clrMapOvr'), 'overrideClrMapping');
  for (const a of Array.from((ovr || mapEl)?.attributes || [])) clrMap[a.name] = a.value;
  const env: Env = { pkg, k: d.k, ox: d.ox, oy: d.oy, theme, clrMap, part: path, defText: d.defText, txStyles: first(masterDoc, 'txStyles'), layoutDoc, masterDoc, tableStyles: d.tableStyles, slideNo: number, warn: s => warns.add(s) };
  const out: Out = [];

  // background: slide → layout → master
  const bg = backgroundOf(doc, env) || backgroundOf(layoutDoc, { ...env, part: layoutPath }) || backgroundOf(masterDoc, { ...env, part: masterPath });
  if (bg?.image) out.push(bg.image);

  // shared shapes from master and layout (not placeholders), then the slide itself
  const sld = doc.documentElement, hideShared = attr(sld, 'showMasterSp') === '0', layoutHidesMaster = attr(layoutDoc?.documentElement, 'showMasterSp') === '0';
  if (!hideShared) {
    if (!layoutHidesMaster && masterDoc) drawTree(first(masterDoc, 'spTree'), ROOT, { ...env, part: masterPath, skipPh: true }, out);
    if (layoutDoc) drawTree(first(layoutDoc, 'spTree'), ROOT, { ...env, part: layoutPath, skipPh: true }, out);
  }
  drawTree(first(doc, 'spTree'), ROOT, env, out);
  if (first(doc, 'timing')?.children.length) warns.add('Анимация [animation] жұмыс істемейді');
  if (first(doc, 'transition')) warns.add('Слайд ауысуы [transition] қолданылмайды');

  const texts = out.filter((b): b is PptxTextBlock => b.kind === 'text'), titleBlock = texts.find(b => b.title);
  const plain = texts.map(b => b.text).join('\n').trim();
  const color0 = bg?.color;
  return {
    number, title: (titleBlock?.text || plain).split('\n')[0] || `Слайд ${number}`, text: plain, background: color0 && color0.a ? color0.hex : '#FFFFFF', bgGradient: bg?.grad ? cssGrad(bg.grad) : undefined,
    width: d.width, height: d.height, slidePath: path, blocks: out, notes: notesOf(pkg, path), hidden: attr(sld, 'show') === '0', unsupported: [...warns],
  };
}

function orderedSlidePaths(pkg: Pkg) {
  const p = 'ppt/presentation.xml', doc = pkg.doc(p);
  if (!doc) throw new Error('PPTX ішінде ppt/presentation.xml табылмады.');
  const paths = desc(first(doc, 'sldIdLst'), 'sldId').map(i => pkg.target(p, rid(i, 'id'))).filter(x => !!pkg.files[x]);
  if (paths.length) return paths;
  return Object.keys(pkg.files).filter(x => /^ppt\/slides\/slide\d+\.xml$/.test(x)).sort((a, b) => Number(a.match(/(\d+)\.xml/)![1]) - Number(b.match(/(\d+)\.xml/)![1]));
}

/** Reads an OOXML presentation without changing its source file. */
export async function parsePptx(file: File, onProgress?: (progress: PptxProgress) => void): Promise<PptxDeck> {
  onProgress?.({ phase: 'unzip', percent: 8, detail: 'PPTX архиві ашылуда...' });
  const bytes = new Uint8Array(await file.arrayBuffer());
  let files: Files;
  try { files = unzipSync(bytes); } catch { throw new Error('PPTX файлын ZIP/OOXML ретінде ашу мүмкін болмады.'); }
  onProgress?.({ phase: 'xml', percent: 18, detail: 'Құрылымы мен түс палитрасы талдануда...' });
  const pkg = openPkg(files), pres = pkg.doc('ppt/presentation.xml');
  if (!pres) throw new Error('PPTX ішінде ppt/presentation.xml табылмады.');
  const sz = first(pres, 'sldSz'), width = nm(sz, 'cx', DEFAULT_W) || DEFAULT_W, height = nm(sz, 'cy', DEFAULT_H) || DEFAULT_H;
  // one scale for both axes, so circles stay round; a slide that is not 16:9 sits centred on the canvas
  const k = Math.min(W / width, H / height), ox = (W - width * k) / 2, oy = (H - height * k) / 2;
  const d: DeckCx = { pkg, width, height, k, ox, oy, defText: first(pres, 'defaultTextStyle'), tableStyles: pkg.doc('ppt/tableStyles.xml'), themes: new Map() };
  const paths = orderedSlidePaths(pkg), total = paths.length;
  if (!total) throw new Error('PPTX ішінде слайд табылмады.');
  const slides: PptxSlide[] = [];
  for (let i = 0; i < total; i++) {
    slides.push(parseSlide(d, paths[i], i + 1));
    onProgress?.({ phase: 'slides', percent: Math.round(20 + ((i + 1) / total) * 30), current: i + 1, total, detail: `Слайдтар талдануда: ${i + 1} / ${total}` });
  }
  const counts = new Map<string, number>();
  slides.forEach(s => s.unsupported.forEach(u => counts.set(u, (counts.get(u) || 0) + 1)));
  const hidden = slides.filter(s => s.hidden).length;
  const unsupported = [...counts].map(([u, n]) => (n > 1 ? `${u} (${n} слайд)` : u));
  if (hidden) unsupported.push(`Жасырын слайдтар [hidden slides] да импортталды: ${hidden}`);
  return { fileName: file.name, width, height, slides, plainText: slides.map(s => `Слайд ${s.number}: ${s.text}`).join('\n\n'), unsupported };
}

export type PptxCanvasOptions = { language: 'kk' | 'ru'; importBatchId: string; imageSources?: Record<string, string> };

/** Maps one parsed slide to the editable ClassFlow canvas model. */
export function pptxSlideToCanvas(slide: PptxSlide, options: PptxCanvasOptions) {
  const blocks = slide.blocks.map(block => {
    const box = { x: block.x, y: block.y, w: block.w, h: block.h, exact: true, appearance: block.appearance };
    if (block.kind === 'image') return slim(norm({ id: newId(), kind: 'image', ...box, src: options.imageSources ? options.imageSources[block.name] || block.dataUrl : block.dataUrl, alt: block.name })!);
    if (block.kind === 'shape') return slim(norm({ id: newId(), kind: 'shape', ...box, shape: block.shape, fill: block.fill })!);
    return slim(norm({ id: newId(), kind: 'text', ...box, text: block.text, variants: { [options.language]: block.text }, size: block.size, bold: block.bold, color: block.color, align: block.align })!);
  });
  if (!blocks.length) blocks.push(slim(norm({ id: newId(), kind: 'text', x: 70, y: 220, w: 820, h: 90, text: 'Бұл слайдта мәтіндік немесе суреттік элемент табылмады.', variants: { [options.language]: 'Бұл слайдта мәтіндік немесе суреттік элемент табылмады.' }, size: 28 })!));
  return {
    type: 'canvas', pageType: 'slide', templateId: 'canvas-blank', title: slide.title, bg: slide.background, bgGradient: slide.bgGradient,
    blocks, slideNumber: slide.number, importBatchId: options.importBatchId, importedLanguage: options.language, ...(slide.notes ? { notes: slide.notes } : {}),
  };
}

export function pptxMime() { return PPTX_MIME; }
