import { strFromU8, unzipSync } from 'fflate';
import { H, W, newId, norm, slim } from './canvas';

const EMU_PER_INCH = 914400;
const DEFAULT_WIDTH = 12192000;
const DEFAULT_HEIGHT = 6858000;
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export type PptxTextBlock = {
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

export type PptxBlock = PptxTextBlock | PptxImageBlock;

export type PptxSlide = {
  number: number;
  title: string;
  text: string;
  background: string;
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
  parent ? Array.from((parent as Document | Element).getElementsByTagNameNS('*', name)) : [];
const first = (parent: ParentNode | null | undefined, name: string) => elements(parent, name)[0];
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
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function rect(node: Element | undefined, width: number, height: number) {
  const xfrm = first(node, 'xfrm');
  const off = first(xfrm, 'off');
  const ext = first(xfrm, 'ext');
  const x = (emu(attr(off, 'x')) / width) * W;
  const y = (emu(attr(off, 'y')) / height) * H;
  const w = (emu(attr(ext, 'cx'), width / 4) / width) * W;
  const h = (emu(attr(ext, 'cy'), height / 4) / height) * H;
  return {
    x: Math.max(0, Math.min(W - 30, x)),
    y: Math.max(0, Math.min(H - 30, y)),
    w: Math.max(30, Math.min(W, w)),
    h: Math.max(30, Math.min(H, h)),
  };
}

function colour(node: Element | undefined) {
  const srgb = first(node, 'srgbClr');
  const value = attr(srgb, 'val');
  return /^[0-9a-f]{6}$/i.test(value) ? `#${value}` : undefined;
}

function style(node: Element | undefined) {
  const run = first(node, 'rPr') || first(node, 'defRPr');
  const size = Number(attr(run, 'sz'));
  const align = attr(first(node, 'pPr'), 'algn');
  return {
    size: Number.isFinite(size) && size > 0 ? Math.max(8, Math.min(160, size / 100)) : 24,
    bold: attr(run, 'b') === '1' || attr(run, 'b') === 'true',
    color: colour(first(run, 'solidFill')),
    align: align === 'ctr' ? 'center' as const : align === 'r' ? 'right' as const : 'left' as const,
  };
}

function textIn(shape: Element) {
  const body = first(shape, 'txBody');
  if (!body) return '';
  const paragraphs = elements(body, 'p').map(paragraph => elements(paragraph, 't').map(t => t.textContent || '').join(''));
  return paragraphs.filter(Boolean).join('\n').trim();
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

function slideBackground(doc: XMLDocument) {
  const fill = first(first(doc, 'bg'), 'solidFill');
  return colour(fill) || '#FFFFFF';
}

function titleType(shape: Element) {
  const type = attr(first(shape, 'ph'), 'type');
  return type === 'title' || type === 'ctrTitle' || type === 'subTitle';
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

function parseSlide(files: Record<string, Uint8Array>, path: string, number: number, width: number, height: number): PptxSlide {
  const doc = xml(files[path], path);
  const blocks: PptxBlock[] = [];
  const tree = first(doc, 'spTree');
  const shapes = tree ? Array.from(tree.children) : [];
  for (const shape of shapes) {
    const local = shape.localName;
    if (local === 'sp') {
      const text = textIn(shape);
      if (!text) continue;
      const box = rect(shape, width, height);
      const st = style(first(shape, 'txBody'));
      blocks.push({ kind: 'text', text, ...box, ...st, title: titleType(shape) });
    } else if (local === 'pic') {
      const blip = first(shape, 'blip');
      const rid = attr(blip, 'r:embed') || attr(blip, 'embed');
      const imagePath = relTarget(files, path, rid);
      const bytes = imagePath ? files[imagePath] : undefined;
      if (!bytes) continue;
      const mime = imageMime(imagePath);
      blocks.push({ kind: 'image', name: imagePath.split('/').pop() || `image-${number}`, mime, bytes, dataUrl: dataUrl(bytes, mime), ...rect(shape, width, height) });
    }
  }
  const text = blocks.filter((block): block is PptxTextBlock => block.kind === 'text').map(block => block.text).join('\n').trim();
  const titleBlock = blocks.find((block): block is PptxTextBlock => block.kind === 'text' && !!block.title);
  return { number, title: titleBlock?.text.split('\n')[0] || text.split('\n')[0] || `Слайд ${number}`, text, background: slideBackground(doc), width, height, slidePath: path, blocks };
}

/** Reads an OOXML presentation without changing its source file. */
export async function parsePptx(file: File): Promise<PptxDeck> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { throw new Error('PPTX файлын ZIP/OOXML ретінде ашу мүмкін болмады.'); }
  const presentationPath = 'ppt/presentation.xml';
  const presentation = xml(files[presentationPath], presentationPath);
  const size = presentationSize(presentation);
  const slides = orderedSlidePaths(files).map((path, index) => parseSlide(files, path, index + 1, size.width, size.height));
  if (!slides.length) throw new Error('PPTX ішінде слайд табылмады.');
  return { fileName: file.name, width: size.width, height: size.height, slides, plainText: slides.map(slide => `Слайд ${slide.number}: ${slide.text}`).join('\n\n') };
}

function canvasBox(block: { x: number; y: number; w: number; h: number }, width: number, height: number) {
  return { x: (block.x / width) * W, y: (block.y / height) * H, w: (block.w / width) * W, h: (block.h / height) * H };
}

export type PptxCanvasOptions = {
  sourceUrl: string;
  sourceName: string;
  importId: string;
  imageSources?: Record<string, string>;
};

/** Maps one parsed slide to the editable ClassFlow canvas model. */
export function pptxSlideToCanvas(slide: PptxSlide, options: PptxCanvasOptions) {
  const blocks = slide.blocks.map(block => {
    const box = canvasBox(block, slide.width, slide.height);
    if (block.kind === 'image') return slim(norm({ id: newId(), kind: 'image', ...box, src: options.imageSources ? options.imageSources[block.name] || '' : block.dataUrl, alt: block.name })!);
    return slim(norm({ id: newId(), kind: 'text', ...box, text: block.text, variants: { kk: block.text }, size: block.size, bold: block.bold, color: block.color, align: block.align })!);
  });
  if (!blocks.length) blocks.push(slim(norm({ id: newId(), kind: 'text', x: 70, y: 220, w: 820, h: 90, text: 'Бұл слайдта мәтіндік немесе суреттік элемент табылмады.', variants: { kk: 'Бұл слайдта мәтіндік немесе суреттік элемент табылмады.' }, size: 28 })!));
  return {
    type: 'canvas', pageType: 'slide', templateId: 'canvas-blank', title: slide.title, bg: slide.background,
    blocks, sourceFormat: 'pptx', sourceName: options.sourceName, sourceUrl: options.sourceUrl,
    slideNumber: slide.number, presentationImportId: options.importId, presentationWidth: slide.width, presentationHeight: slide.height,
    sourceSlidePath: slide.slidePath, sourceText: slide.text,
  };
}

export function pptxMime() { return PPTX_MIME; }
