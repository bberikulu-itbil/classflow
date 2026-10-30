import PptxGenJS from 'pptxgenjs';
import { blocksOf, type CBlock, W, H } from './canvas';

const PW = 13.333333;
const PH = 7.5;
const hex = (value: string | undefined, fallback = 'FFFFFF') => (value || fallback).replace('#', '').toUpperCase();
const x = (v: number) => (v / W) * PW;
const y = (v: number) => (v / H) * PH;

function interactive(slide: any) {
  return slide?.pageType === 'interactive' || ['quiz', 'task', 'matching', 'flashcards', 'logic', 'leaderboard'].includes(slide?.type);
}

function legacyBlocks(slide: any): CBlock[] {
  const result: CBlock[] = [];
  if (slide.title) result.push({ id: 'title', kind: 'text', x: 60, y: 40, w: 840, h: 70, text: String(slide.title), size: 40, bold: true, align: 'left' });
  if (slide.subtitle) result.push({ id: 'subtitle', kind: 'text', x: 60, y: 130, w: 840, h: 60, text: String(slide.subtitle), size: 28, align: 'left' });
  if (Array.isArray(slide.bullets) && slide.bullets.length) result.push({ id: 'bullets', kind: 'text', x: 60, y: 150, w: 840, h: 300, text: slide.bullets.map((b: string) => `• ${b}`).join('\n'), size: 28, align: 'left' });
  if (slide.prompt) result.push({ id: 'prompt', kind: 'text', x: 60, y: 220, w: 840, h: 130, text: String(slide.prompt), size: 28, align: 'left' });
  if (slide.starter) result.push({ id: 'code', kind: 'code', x: 60, y: 280, w: 840, h: 210, code: String(slide.starter), lang: 'cpp', size: 18, align: 'left' });
  return result;
}

async function sourceData(src: string) {
  if (src.startsWith('data:')) return src;
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Сурет жүктелмеді: ${response.status}`);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Суретті PPTX-ке дайындау мүмкін болмады.'));
    reader.readAsDataURL(blob);
  });
}

function addText(pptxSlide: any, block: CBlock) {
  const text = block.kind === 'code' ? block.code || '' : block.text || '';
  if (!text) return;
  pptxSlide.addText(text, {
    x: x(block.x), y: y(block.y), w: x(block.w), h: y(block.h),
    fontFace: block.kind === 'code' ? 'Consolas' : 'Aptos', fontSize: Math.max(8, block.size),
    bold: !!block.bold, color: hex(block.color, block.kind === 'code' ? 'E2E8F5' : '111827'),
    align: block.align || 'left', valign: 'mid', margin: 0, breakLine: false,
    fit: 'shrink',
    fill: block.kind === 'code' ? { color: '0F172A' } : undefined,
  });
}

async function addBlock(pptx: any, pptxSlide: any, block: CBlock) {
  if (block.kind === 'text' || block.kind === 'code') return addText(pptxSlide, block);
  if (block.kind === 'shape') {
    const shape = block.shape === 'ellipse' ? pptx.ShapeType.ellipse : pptx.ShapeType.rect;
    pptxSlide.addShape(shape, { x: x(block.x), y: y(block.y), w: x(block.w), h: y(block.h), fill: { color: hex(block.fill) }, line: { color: hex(block.fill) } });
    return;
  }
  if (!block.src) return;
  try {
    pptxSlide.addImage({ data: await sourceData(block.src), x: x(block.x), y: y(block.y), w: x(block.w), h: y(block.h), transparency: block.hide ? 100 : 0 });
  } catch {
    // The editable ClassFlow slide remains intact; an unavailable remote image is simply omitted from export.
  }
}

/** Exports only educational slide/content pages. Interactive pages and source-only pages are skipped. */
export async function exportClassFlowPptx(slides: any[], title = 'classflow') {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'ClassFlow';
  pptx.subject = title;
  pptx.title = title;
  pptx.company = 'ClassFlow';
  let count = 0;
  for (const page of slides) {
    if (interactive(page) || page?.pageType === 'presentation' || page?.type === 'presentation') continue;
    const blocks = page?.type === 'canvas' ? blocksOf(page) : legacyBlocks(page);
    if (!blocks.length && !page?.title) continue;
    const out = pptx.addSlide();
    out.background = { color: hex(page?.bg) };
    for (const block of blocks) await addBlock(pptx, out, block);
    count += 1;
  }
  if (!count) throw new Error('Экспорт үшін интерактивті емес оқу беттері табылмады.');
  return await pptx.write({ outputType: 'blob' }) as Blob;
}

export function downloadPptx(blob: Blob, title: string) {
  const safe = title.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'classflow';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${safe}.pptx`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
