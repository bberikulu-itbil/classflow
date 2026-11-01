import { strFromU8, unzipSync } from 'fflate';
import { H, W, newId, norm, slim, type CanvasAppearance } from './canvas';

const EMU_PER_INCH = 914400;
const DEFAULT_WIDTH = 12192000;
const DEFAULT_HEIGHT = 6858000;
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export type PptxTextBlock = {
  appearance?: CanvasAppearance;
  kind: 'text';
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  bold?: boolean;
  color?: string;
  align: 'left' | 'center' | 'right';
  title?: boolean;
};

export type PptxImageBlock = {
  appearance?: CanvasAppearance;
  kind: 'image';
  name: string;
  mime: string;
  bytes: Uint8Array;
  dataUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PptxShapeBlock = {
  appearance?: CanvasAppearance;
  kind: 'shape';
  shape: 'rect' | 'ellipse';
  fill: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PptxBlock = PptxTextBlock | PptxImageBlock | PptxShapeBlock;

export type PptxSlide = {
  number: number;
  title: string;
  text: string;
  background: string;
  bgGradient?: string;
  width: number;
  height: number;
  slidePath: string;
  blocks: PptxBlock[];
};

export type PptxDeck = {
  fileName: string;
  width: number;
  height: number;
  slides: PptxSlide[];
  plainText: string;
};

type Rel = { id: string; target: string; type: string };

const elements = (parent: ParentNode | null | undefined, name: string): Element[] =>
  parent ? Array.from(parent.querySelectorAll('*')).filter(e => e.localName.split(':').pop() === name) : [];
const first = (parent: ParentNode | null | undefined, name: string) => elements(parent, name)[0];
const lname = (e: Element) => e.localName.split(':').pop();
const child = (p: Element | undefined, name: string) => Array.from(p?.children || []).find(e => lname(e) === name);
const attr = (el: Element | undefined, name: string) => el?.getAttribute(name) || '';

function xml(bytes: Uint8Array, path: string): XMLDocument {
  const doc = new DOMParser().parseFromString(strFromU8(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error(`PPTX XML файлы оқылмады: ${path}`);
  return doc;
}

function resolveZipPath(basePath: string, target: string) {
  const parts = (target.startsWith('/') ? target.slice(1) : `${basePath.split('/').slice(0, -1).join('/')}/${target}`)
    .split('/');
  const result: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') result.pop();
    else result.push(part);
  }
  return result.join('/');
}

function relsPath(sourcePath: string) {
  const parts = sourcePath.split('/');
  const file = parts.pop() || '';
  return [...parts, '_rels', `${file}.rels`].join('/');
}

function readRels(files: Record<string, Uint8Array>, sourcePath: string): Rel[] {
  const path = relsPath(sourcePath);
  const bytes = files[path];
  if (!bytes) return [];
  const doc = xml(bytes, path);
  return elements(doc, 'Relationship').map(el => ({
    id: attr(el, 'Id'),
    target: attr(el, 'Target'),
    type: attr(el, 'Type'),
  }));
}

function relTarget(files: Record<string, Uint8Array>, sourcePath: string, id: string) {
  const rel = readRels(files, sourcePath).find(item => item.id === id);
  return rel ? resolveZipPath(sourcePath, rel.target) : '';
}

function emu(value: string, fallback = 0) {
  if (!value) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

type CoordTransform = { x: number; y: number; sx: number; sy: number };
const IDENTITY_TRANSFORM: CoordTransform = { x: 0, y: 0, sx: 1, sy: 1 };

/**
 * A group has its own child coordinate system. `off/ext` place the group in
 * the parent system, while `chOff/chExt` describe the coordinates used by
 * the group's children.
 */
function groupTransform(node: Element): CoordTransform {
  const xfrm = first(first(node, 'grpSpPr'), 'xfrm') || first(node, 'xfrm');
  const off = first(xfrm, 'off');
  const ext = first(xfrm, 'ext');
  const chOff = first(xfrm, 'chOff');
  const chExt = first(xfrm, 'chExt');
  const ox = emu(attr(off, 'x'));
  const oy = emu(attr(off, 'y'));
  const ex = emu(attr(ext, 'cx'));
  const ey = emu(attr(ext, 'cy'));
  const cox = emu(attr(chOff, 'x'));
  const coy = emu(attr(chOff, 'y'));
  const cex = emu(attr(chExt, 'cx'), ex);
  const cey = emu(attr(chExt, 'cy'), ey);
  const sx = cex > 0 && ex > 0 ? ex / cex : 1;
  const sy = cey > 0 && ey > 0 ? ey / cey : 1;
  return { x: ox - cox * sx, y: oy - coy * sy, sx, sy };
}

function composeTransform(parent: CoordTransform, local: CoordTransform): CoordTransform {
  return {
    x: parent.x + local.x * parent.sx,
    y: parent.y + local.y * parent.sy,
    sx: parent.sx * local.sx,
    sy: parent.sy * local.sy,
  };
}

function rect(node: Element | undefined, width: number, height: number, transform: CoordTransform = IDENTITY_TRANSFORM) {
  const xfrm = first(node, 'xfrm');
  const off = first(xfrm, 'off');
  const ext = first(xfrm, 'ext');
  const localX = emu(attr(off, 'x'));
  const localY = emu(attr(off, 'y'));
  const localW = emu(attr(ext, 'cx'), width / 4);
  const localH = emu(attr(ext, 'cy'), height / 4);
  const x = ((transform.x + localX * transform.sx) / width) * W;
  const y = ((transform.y + localY * transform.sy) / height) * H;
  const w = (localW * transform.sx / width) * W;
  const h = (localH * transform.sy / height) * H;
  return {
    x, y, w: Math.max(0.01, w), h: Math.max(0.01, h),
  };
}

const DEFAULT_THEME_COLORS: Record<string, string> = {
  dk1: '000000', lt1: 'FFFFFF', dk2: '1F497D', lt2: 'EEECE1',
  accent1: '4F81BD', accent2: 'C0504D', accent3: '9BBB59', accent4: '8064A2',
  accent5: '4BACC6', accent6: 'F79646', hlink: '0000FF', folHlink: '800080',
  tx1: '000000', tx2: '1F497D', bg1: 'FFFFFF', bg2: 'EEECE1',
};

const PRESET_COLORS: Record<string, string> = {
  black: '000000', white: 'FFFFFF', red: 'FF0000', green: '00FF00', blue: '0000FF',
  yellow: 'FFFF00', cyan: '00FFFF', magenta: 'FF00FF', gray: '808080', grey: '808080',
  lightGray: 'D3D3D3', lightGrey: 'D3D3D3', darkGray: 'A9A9A9', darkGrey: 'A9A9A9',
};

function parseThemeColors(files: Record<string, Uint8Array>): Record<string, string> {
  const map: Record<string, string> = { ...DEFAULT_THEME_COLORS };
  const themePath = Object.keys(files).find(p => /^ppt\/theme\/theme\d+\.xml$/.test(p)) || 'ppt/theme/theme1.xml';
  const bytes = files[themePath];
  if (!bytes) return map;
  try {
    const doc = xml(bytes, themePath);
    const clrScheme = first(doc, 'clrScheme');
    if (clrScheme) {
      for (const child of Array.from(clrScheme.children)) {
        const name = lname(child);
        if (!name) continue;
        const srgb = first(child, 'srgbClr');
        const sys = first(child, 'sysClr');
        const val = attr(srgb, 'val') || attr(sys, 'lastClr');
        if (val && /^[0-9a-f]{6}$/i.test(val)) {
          map[name] = val.toUpperCase();
        }
      }
    }
  } catch { /* use defaults */ }
  if (map.dk1) map.tx1 = map.dk1;
  if (map.dk2) map.tx2 = map.dk2;
  if (map.lt1) map.bg1 = map.lt1;
  if (map.lt2) map.bg2 = map.lt2;
  return map;
}

function applyLuminance(hex: string, lumMod = 1, lumOff = 0): string {
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  r = Math.min(255, Math.max(0, Math.round(r * lumMod + lumOff * 255)));
  g = Math.min(255, Math.max(0, Math.round(g * lumMod + lumOff * 255)));
  b = Math.min(255, Math.max(0, Math.round(b * lumMod + lumOff * 255)));
  return [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function colour(node: Element | undefined, themeColors?: Record<string, string>) {
  if (!node) return undefined;
  const srgb = first(node, 'srgbClr');
  let hex = attr(srgb, 'val');
  if (!hex) {
    const scheme = first(node, 'schemeClr');
    const schemeVal = attr(scheme, 'val');
    if (schemeVal && themeColors && themeColors[schemeVal]) hex = themeColors[schemeVal];
    else if (schemeVal && DEFAULT_THEME_COLORS[schemeVal]) hex = DEFAULT_THEME_COLORS[schemeVal];
  }
  if (!hex) {
    const sys = first(node, 'sysClr');
    hex = attr(sys, 'lastClr');
  }
  if (!hex) {
    const prst = first(node, 'prstClr');
    const prstVal = attr(prst, 'val');
    if (prstVal && PRESET_COLORS[prstVal]) hex = PRESET_COLORS[prstVal];
  }
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return undefined;

  const lumModEl = first(node, 'lumMod');
  const lumOffEl = first(node, 'lumOff');
  if (lumModEl || lumOffEl) {
    const lumMod = lumModEl ? emu(attr(lumModEl, 'val'), 100000) / 100000 : 1;
    const lumOff = lumOffEl ? emu(attr(lumOffEl, 'val'), 0) / 100000 : 0;
    hex = applyLuminance(hex, lumMod, lumOff);
  }
  return `#${hex.toUpperCase()}`;
}

function shapeFill(shape: Element, themeColors?: Record<string, string>) {
  return colour(child(child(shape, 'spPr'), 'solidFill'), themeColors);
}

function shapeKind(shape: Element): 'rect' | 'ellipse' {
  const preset = attr(first(first(shape, 'spPr'), 'prstGeom'), 'prst').toLowerCase();
  return preset.includes('ellipse') || preset.includes('oval') ? 'ellipse' : 'rect';
}

function canvasFontSize(points: number, slideWidth: number) {
  // PPTX stores font sizes in points; ClassFlow stores them in the 960px
  // canvas coordinate system.
  return points * (W * EMU_PER_INCH) / (slideWidth * 72);
}

function style(node: Element | undefined, slideWidth: number, scale = 1, themeColors?: Record<string, string>) {
  const run = first(node, 'rPr') || first(node, 'defRPr');
  const size = Number(attr(run, 'sz'));
  const align = attr(first(node, 'pPr'), 'algn');
  const points = Number.isFinite(size) && size > 0 ? size / 100 : 18;
  return {
    size: canvasFontSize(points, slideWidth) * scale,
    bold: attr(run, 'b') === '1' || attr(run, 'b') === 'true',
    color: colour(first(run, 'solidFill'), themeColors),
    align: align === 'ctr' ? 'center' as const : align === 'r' ? 'right' as const : 'left' as const,
  };
}

function textIn(shape: Element) {
  const body = first(shape, 'txBody');
  if (!body) return '';
  return elements(body, 'p').map(paragraph => Array.from(paragraph.children).map(c => lname(c) === 'br' ? '\n' : elements(c, 't').map(t => t.textContent || '').join('')).join('')).join('\n');
}

function gradient(node: Element | undefined, themeColors?: Record<string, string>) {
  const g = child(node, 'gradFill');
  if (!g) return undefined;
  const stops = elements(g, 'gs').map(s => `${colour(s, themeColors) || '#FFFFFF'} ${emu(attr(s, 'pos')) / 1000}%`);
  return stops.length ? `linear-gradient(${90 + emu(attr(first(g, 'lin'), 'ang')) / 60000}deg, ${stops.join(', ')})` : undefined;
}

function appearance(shape: Element, width: number, transform: CoordTransform, themeColors?: Record<string, string>): CanvasAppearance {
  const props = child(shape, 'spPr');
  const xfrm = first(props, 'xfrm');
  const factor = W / width;
  const body = first(shape, 'txBody');
  const bp = child(body, 'bodyPr');
  const run = first(body, 'rPr') || first(body, 'defRPr');
  const font = (r: Element | undefined) => (attr(first(r, 'latin'), 'typeface') || 'Inter').replace(/ Bold| Heavy| Italics| Italic/g, '');
  const pt = (n: number) => canvasFontSize(n, width) * transform.sy;
  const paragraphs = elements(body, 'p').map(p => {
    const pr = child(p, 'pPr');
    const def = first(pr, 'defRPr') || run;
    const runs = Array.from(p.children).filter(e => ['r', 'fld', 'br'].includes(lname(e) || '')).map(e => {
      const r = first(e, 'rPr') || def;
      const family = attr(first(r, 'latin'), 'typeface');
      return {
        text: lname(e) === 'br' ? '\n' : elements(e, 't').map(t => t.textContent || '').join(''),
        size: pt(emu(attr(r, 'sz'), emu(attr(def, 'sz'), 1800)) / 100),
        bold: /Bold|Heavy/.test(family) || ['1','true'].includes(attr(r, 'b')),
        italic: /Italic/.test(family) || ['1','true'].includes(attr(r, 'i')),
        underline: attr(r, 'u') !== '' && attr(r, 'u') !== 'none' && attr(r, 'u') !== null && attr(r, 'u') !== undefined,
        strike: attr(r, 'strike') !== '' && attr(r, 'strike') !== 'noStrike' && attr(r, 'strike') !== null && attr(r, 'strike') !== undefined,
        color: colour(child(r, 'solidFill'), themeColors),
        fontFamily: font(r),
        letterSpacing: pt(emu(attr(r, 'spc')) / 100),
      };
    });
    const bullet = child(pr, 'buChar');
    if (bullet && runs.length) runs[0].text = `${attr(bullet, 'char')} ${runs[0].text}`;
    const autoNum = child(pr, 'buAutoNum');
    if (autoNum && runs.length) {
      const startAt = emu(attr(autoNum, 'startAt'), 1);
      runs[0].text = `${startAt}. ${runs[0].text}`;
    }
    const spacing = child(pr, 'lnSpc');
    const points = child(spacing, 'spcPts'), percent = child(spacing, 'spcPct');
    const lineHeight = points ? pt(emu(attr(points, 'val')) / 100) : percent ? (runs[0]?.size || pt(18)) * emu(attr(percent, 'val')) / 100000 : undefined;
    return {
      align: (attr(pr, 'algn') === 'ctr' ? 'center' : attr(pr, 'algn') === 'r' ? 'right' : 'left') as 'left'|'center'|'right',
      lineHeight,
      before: pt(emu(attr(first(child(pr, 'spcBef'), 'spcPts'), 'val')) / 100),
      after: pt(emu(attr(first(child(pr, 'spcAft'), 'spcPts'), 'val')) / 100),
      runs
    };
  });
  const fill = child(props, 'blipFill') || child(shape, 'blipFill');
  const fr = first(fill, 'fillRect'), sr = first(fill, 'srcRect');
  const l = emu(attr(fr, 'l')) / 1000, t = emu(attr(fr, 't')) / 1000, r = emu(attr(fr, 'r')) / 1000, b = emu(attr(fr, 'b')) / 1000;
  const sl = emu(attr(sr, 'l')) / 100000, st = emu(attr(sr, 't')) / 100000, sw = 1 - sl - emu(attr(sr, 'r')) / 100000, sh = 1 - st - emu(attr(sr, 'b')) / 100000;
  const iw = (100 - l - r) / Math.max(.001, sw), ih = (100 - t - b) / Math.max(.001, sh);
  const ln = child(props, 'ln');
  const fillAlpha = first(child(props, 'solidFill'), 'alpha') || first(fill, 'alphaModFix');
  const path = first(child(props, 'custGeom'), 'path');
  const prstName = attr(first(props, 'prstGeom'), 'prst');
  const isLine = prstName === 'line' || prstName === 'straightConnector1' || lname(shape) === 'cxnSp';
  let d = path ? Array.from(path.children).map(c => {
    const pts = elements(c, 'pt').map(p => `${attr(p, 'x')} ${attr(p, 'y')}`).join(' ');
    return ({moveTo:'M', lnTo:'L', cubicBezTo:'C', quadBezTo:'Q', close:'Z'} as Record<string,string>)[lname(c) || ''] ? `${({moveTo:'M', lnTo:'L', cubicBezTo:'C', quadBezTo:'Q', close:'Z'} as Record<string,string>)[lname(c) || '']} ${pts}` : '';
  }).join(' ') : undefined;
  let viewBox = path ? `0 0 ${attr(path, 'w')} ${attr(path, 'h')}` : undefined;
  if (!d && isLine) {
    d = 'M 0 50 L 100 50';
    viewBox = '0 0 100 100';
  }
  const outerShdw = first(first(props, 'effectLst'), 'outerShdw');
  const shadow = outerShdw ? (() => {
    const dist = emu(attr(outerShdw, 'dist')) * factor * transform.sx;
    const blur = emu(attr(outerShdw, 'blurRad')) * factor * transform.sx;
    const clr = colour(outerShdw, themeColors) || 'rgba(0,0,0,0.25)';
    return `0 ${Math.max(1, dist)}px ${Math.max(2, blur)}px ${clr}`;
  })() : undefined;
  return {
    fontFamily: font(run), italic: /Italic/.test(attr(first(run, 'latin'), 'typeface')), lineHeight: paragraphs[0]?.lineHeight, letterSpacing: pt(emu(attr(run, 'spc')) / 100),
    padding: [emu(attr(bp, 'tIns'), 45720)*factor*transform.sy, emu(attr(bp, 'rIns'), 91440)*factor*transform.sx, emu(attr(bp, 'bIns'), 45720)*factor*transform.sy, emu(attr(bp, 'lIns'), 91440)*factor*transform.sx],
    valign: attr(bp, 'anchor') === 'ctr' ? 'middle' : attr(bp, 'anchor') === 'b' ? 'bottom' : 'top', wrap: attr(bp,'wrap') !== 'none', paragraphs,
    imageViewport: fill ? [l - sl*iw, t - st*ih, iw, ih] : undefined, fit: 'fill', rotation: emu(attr(xfrm, 'rot')) / 60000,
    flipH: attr(xfrm, 'flipH') === '1' || attr(xfrm, 'flipH') === 'true',
    flipV: attr(xfrm, 'flipV') === '1' || attr(xfrm, 'flipV') === 'true',
    shadow,
    opacity: fillAlpha ? emu(attr(fillAlpha, lname(fillAlpha) === 'alphaModFix' ? 'amt' : 'val'), 100000)/100000 : undefined,
    gradient: gradient(props, themeColors), stroke: colour(child(ln, 'solidFill'), themeColors), strokeWidth: emu(attr(ln, 'w'))*factor*transform.sx,
    radius: prstName === 'roundRect' ? 8 : 0,
    path: d, viewBox };
}

function dataUrl(bytes: Uint8Array, mime: string) {
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
  return `data:${mime};base64,${btoa(binary)}`;
}

function imageMime(name: string) {
  const ext = name.toLowerCase().split('.').pop();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'svg' || ext === 'svgz') return 'image/svg+xml';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

function slideBackground(doc: XMLDocument, files?: Record<string, Uint8Array>, path?: string, themeColors?: Record<string, string>) {
  const bgPr = first(first(doc, 'bg'), 'bgPr') || first(doc, 'bg');
  const fill = first(bgPr, 'solidFill');
  const c = colour(fill, themeColors);
  if (c) return c;
  if (files && path) {
    try {
      const rels = readRels(files, path);
      const layoutRel = rels.find(r => r.type.includes('slideLayout'));
      if (layoutRel) {
        const layoutPath = resolveZipPath(path, layoutRel.target);
        if (files[layoutPath]) {
          const lDoc = xml(files[layoutPath], layoutPath);
          const lBg = first(first(lDoc, 'bg'), 'bgPr') || first(lDoc, 'bg');
          const lc = colour(first(lBg, 'solidFill'), themeColors);
          if (lc) return lc;
        }
      }
    } catch { /* ignore fallback */ }
  }
  return '#FFFFFF';
}

function slideBackgroundImage(files: Record<string, Uint8Array>, doc: XMLDocument, path: string): PptxImageBlock | null {
  const bgPr = first(first(doc, 'bg'), 'bgPr');
  const blip = first(first(bgPr, 'blipFill'), 'blip');
  const rid = attr(blip, 'r:embed') || attr(blip, 'embed');
  const imagePath = relTarget(files, path, rid);
  const bytes = imagePath ? files[imagePath] : undefined;
  if (!bytes) return null;
  const mime = imageMime(imagePath);
  return { kind: 'image', name: `background-${path.split('/').pop() || 'slide'}.${imagePath.split('.').pop() || 'png'}`, mime, bytes, dataUrl: dataUrl(bytes, mime), x: 0, y: 0, w: W, h: H };
}

function titleType(shape: Element) {
  const type = attr(first(shape, 'ph'), 'type');
  return type === 'title' || type === 'ctrTitle' || type === 'subTitle';
}

type DrawingEntry = { node: Element; transform: CoordTransform };

function drawingShapes(node: Element | null | undefined, parentTransform: CoordTransform = IDENTITY_TRANSFORM): DrawingEntry[] {
  if (!node) return [];
  const out: DrawingEntry[] = [];
  for (const child of Array.from(node.children)) {
    if (['sp','pic','graphicFrame','cxnSp'].includes(lname(child) || '')) out.push({ node: child, transform: parentTransform });
    if (lname(child) === 'grpSp') out.push(...drawingShapes(child, composeTransform(parentTransform, groupTransform(child))));
  }
  return out;
}

function presentationSize(doc: XMLDocument) {
  const size = first(doc, 'sldSz');
  return { width: emu(attr(size, 'cx'), DEFAULT_WIDTH), height: emu(attr(size, 'cy'), DEFAULT_HEIGHT) };
}

function orderedSlidePaths(files: Record<string, Uint8Array>) {
  const presentationPath = 'ppt/presentation.xml';
  const presentation = files[presentationPath];
  if (!presentation) throw new Error('PPTX ішінде ppt/presentation.xml табылмады.');
  const doc = xml(presentation, presentationPath);
  const rels = readRels(files, presentationPath);
  const byId = new Map(rels.map(rel => [rel.id, rel]));
  const list = first(doc, 'sldIdLst');
  const paths = elements(list, 'sldId').map(item => {
    const rel = byId.get(attr(item, 'r:id'));
    return rel ? resolveZipPath(presentationPath, rel.target) : '';
  }).filter(path => !!files[path]);
  if (paths.length) return paths;
  return Object.keys(files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path)).sort((a, b) => {
    const na = Number(a.match(/slide(\d+)/)?.[1] || 0), nb = Number(b.match(/slide(\d+)/)?.[1] || 0);
    return na - nb;
  });
}

function parseSlide(files: Record<string, Uint8Array>, path: string, number: number, width: number, height: number, themeColors?: Record<string, string>): PptxSlide {
  const doc = xml(files[path], path);
  const blocks: PptxBlock[] = [];
  const backgroundImage = slideBackgroundImage(files, doc, path);
  if (backgroundImage) blocks.push(backgroundImage);
  const tree = first(doc, 'spTree');
  const shapes = drawingShapes(tree);
  for (const entry of shapes) {
    const shape = entry.node;
    const local = lname(shape);
    const ap = appearance(shape, width, entry.transform, themeColors);
    if (local === 'graphicFrame') {
      const tbl = first(shape, 'tbl');
      if (!tbl) continue;
      const frame = rect(shape, width, height, entry.transform);
      const cols = elements(first(tbl, 'tblGrid'), 'gridCol').map(c => emu(attr(c, 'w')) * W / width * entry.transform.sx);
      const cellBackgrounds: PptxBlock[] = [], cellTexts: PptxBlock[] = [];
      let y = frame.y;
      for (const row of Array.from(tbl.children).filter(e => lname(e) === 'tr')) {
        const h = emu(attr(row, 'h')) * H / height * entry.transform.sy;
        let x = frame.x, col = 0;
        for (const cell of Array.from(row.children).filter(e => lname(e) === 'tc')) {
          const span = Math.max(1, emu(attr(cell, 'gridSpan'), 1));
          const w = cols.slice(col,col+span).reduce((a,b)=>a+b,0);
          if (!['1','true'].includes(attr(cell,'hMerge')) && !['1','true'].includes(attr(cell,'vMerge'))) {
            const props = child(cell, 'tcPr');
            const cellFill = colour(child(props, 'solidFill'), themeColors);
            const lnEl = child(props, 'lnL') || child(props, 'lnT') || child(props, 'lnB') || child(props, 'lnR');
            const cellStroke = colour(child(lnEl, 'solidFill'), themeColors) || colour(first(props, 'solidFill'), themeColors) || '#D1D5DB';
            cellBackgrounds.push({ kind:'shape', shape:'rect', x,y,w,h,fill:cellFill || 'transparent', appearance:{ tableCell: true, stroke:cellStroke, strokeWidth:.5 } });
            const a = appearance(cell,width,entry.transform, themeColors);
            a.padding = [4,5,4,5]; a.valign = 'middle';
            const text = a.paragraphs?.map(p=>p.runs.map(r=>r.text).join('')).join('\n') || textIn(cell);
            if (text) cellTexts.push({kind:'text', x,y,w,h,text,...style(first(cell,'txBody'),width,entry.transform.sy, themeColors),appearance:a});
          }
          x += cols[col] || w; col += 1;
        }
        y += h;
      }
      blocks.push(...cellBackgrounds, ...cellTexts);
    } else if (local === 'sp' || local === 'cxnSp') {
      const box = rect(shape, width, height, entry.transform);
      const blip = first(shape, 'blip');
      const rid = attr(blip, 'r:embed') || attr(blip, 'embed');
      const imagePath = relTarget(files, path, rid);
      const imageBytes = imagePath ? files[imagePath] : undefined;
      if (imageBytes) {
        const mime = imageMime(imagePath);
        blocks.push({ kind: 'image', name: imagePath.split('/').pop() || `image-${number}`, mime, bytes: imageBytes, dataUrl: dataUrl(imageBytes, mime), ...box, appearance:ap });
      }
      const fill = shapeFill(shape, themeColors);
      const text = ap.paragraphs?.map(p=>p.runs.map(r=>r.text).join('')).join('\n') || textIn(shape);
      if (fill || ap.gradient || (ap.stroke && !imageBytes) || ap.path) blocks.push({ kind: 'shape', shape: shapeKind(shape), fill:fill || 'transparent', ...box, appearance:ap });
      if (!text) continue;
      const st = style(first(shape, 'txBody'), width, entry.transform.sy, themeColors);
      blocks.push({ kind: 'text', text, ...box, ...st, appearance:ap, title: titleType(shape) });
    } else if (local === 'pic') {
      const blip = first(shape, 'blip');
      const rid = attr(blip, 'r:embed') || attr(blip, 'embed');
      const imagePath = relTarget(files, path, rid);
      const bytes = imagePath ? files[imagePath] : undefined;
      if (!bytes) continue;
      const mime = imageMime(imagePath);
      blocks.push({ kind: 'image', name: imagePath.split('/').pop() || `image-${number}`, mime, bytes, dataUrl: dataUrl(bytes, mime), ...rect(shape, width, height, entry.transform), appearance:ap });
    }
  }
  const text = blocks.filter((block): block is PptxTextBlock => block.kind === 'text').map(block => block.text).join('\n').trim();
  const titleBlock = blocks.find((block): block is PptxTextBlock => block.kind === 'text' && !!block.title);
  const bg = slideBackground(doc, files, path, themeColors);
  const bgGrad = gradient(first(doc, 'bgPr'), themeColors) || gradient(first(first(doc, 'bg'), 'bgPr'), themeColors);
  return { number, title: titleBlock?.text.split('\n')[0] || text.split('\n')[0] || `Слайд ${number}`, text, background: bg, bgGradient: bgGrad, width, height, slidePath: path, blocks };
}

/** Reads an OOXML presentation without changing its source file. */
export async function parsePptx(file: File): Promise<PptxDeck> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { throw new Error('PPTX файлын ZIP/OOXML ретінде ашу мүмкін болмады.'); }
  const presentationPath = 'ppt/presentation.xml';
  const presentation = xml(files[presentationPath], presentationPath);
  const size = presentationSize(presentation);
  const themeColors = parseThemeColors(files);
  const slides = orderedSlidePaths(files).map((path, index) => parseSlide(files, path, index + 1, size.width, size.height, themeColors));
  if (!slides.length) throw new Error('PPTX ішінде слайд табылмады.');
  return { fileName: file.name, width: size.width, height: size.height, slides, plainText: slides.map(slide => `Слайд ${slide.number}: ${slide.text}`).join('\n\n') };
}

export type PptxCanvasOptions = {
  language: 'kk' | 'ru';
  importBatchId: string;
  imageSources?: Record<string, string>;
};

/** Maps one parsed slide to the editable ClassFlow canvas model. */
export function pptxSlideToCanvas(slide: PptxSlide, options: PptxCanvasOptions) {
  const blocks = slide.blocks.map(block => {
    // parseSlide already normalizes OOXML coordinates to the ClassFlow 960×540 canvas.
    const box = { x: block.x, y: block.y, w: block.w, h: block.h, exact:true, appearance:block.appearance };
    if (block.kind === 'image') return slim(norm({ id: newId(), kind: 'image', ...box, src: options.imageSources ? options.imageSources[block.name] || block.dataUrl : block.dataUrl, alt: block.name })!);
    if (block.kind === 'shape') return slim(norm({ id: newId(), kind: 'shape', ...box, shape: block.shape, fill: block.fill })!);
    return slim(norm({ id: newId(), kind: 'text', ...box, text: block.text, variants: { [options.language]: block.text }, size: block.size, bold: block.bold, color: block.color, align: block.align })!);
  });
  if (!blocks.length) blocks.push(slim(norm({ id: newId(), kind: 'text', x: 70, y: 220, w: 820, h: 90, text: 'Бұл слайдта мәтіндік немесе суреттік элемент табылмады.', variants: { [options.language]: 'Бұл слайдта мәтіндік немесе суреттік элемент табылмады.' }, size: 28 })!));
  return {
    type: 'canvas', pageType: 'slide', templateId: 'canvas-blank', title: slide.title, bg: slide.background, bgGradient:slide.bgGradient,
    blocks, slideNumber: slide.number, importBatchId: options.importBatchId, importedLanguage: options.language,
  };
}

export function pptxMime() { return PPTX_MIME; }
