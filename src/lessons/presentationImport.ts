/**
 * Browser-side import helpers for source presentations.
 *
 * PowerPoint is converted to slide HTML/SVG in the browser. The resulting
 * slide is kept as HTML instead of being redrawn into our lesson canvas, so
 * the source design remains intact. PDF pages are rendered as images and use
 * the same presentation slide format.
 */

export type PresentationVariant = 'kk' | 'ru';

export type PresentationSlide = {
  type: 'presentation';
  pageType: 'presentation';
  templateId: 'presentation';
  title: string;
  sourceFormat: 'pptx' | 'pdf';
  sourceName: string;
  sourceSize?: number;
  sourceType?: string;
  sourceUrl?: string;
  slideNumber: number;
  html?: string;
  css?: string;
  img?: string;
  alt?: string;
};

const plain = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Removes active content before imported HTML is stored in lesson JSON. */
function safeMarkup(node: Element): string {
  const copy = node.cloneNode(true) as Element;
  copy.querySelectorAll('script, iframe, object, embed, link, meta').forEach(x => x.remove());
  copy.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
      if (/^(href|src)$/i.test(attr.name) && /^(https?:|javascript:|vbscript:)/i.test(attr.value)) el.removeAttribute(attr.name);
    });
  });
  return copy.outerHTML;
}

function titleOf(section: Element, index: number): string {
  const text = plain(section.textContent || '');
  return text.slice(0, 120) || `Слайд ${index + 1}`;
}

async function pptxRenderer(): Promise<(data: ArrayBuffer, host: HTMLElement) => Promise<HTMLElement[]>> {
  // pptx-preview parses the OOXML package in the browser and produces one
  // self-contained HTML/SVG wrapper per slide. It handles current PowerPoint
  // files more reliably than the older pptx2html package.
  const module = await import('pptx-preview');
  return async (data, host) => {
    const viewer = module.init(host, { width: 1600, mode: 'list' });
    await viewer.preview(data);
    return [...host.querySelectorAll<HTMLElement>('[class*="pptx-preview-slide-wrapper-"]')];
  };
}

export async function importPptx(file: File, variant: PresentationVariant = 'kk'): Promise<PresentationSlide[]> {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;width:1920px;pointer-events:none;';
  document.body.appendChild(host);
  try {
    const render = await pptxRenderer();
    const sections = await render(await file.arrayBuffer(), host);
    if (!sections.length) throw new Error('PowerPoint ішінде слайд табылмады.');
    return sections.map((section, index) => {
      const slide: PresentationSlide = {
        type: 'presentation',
        pageType: 'presentation',
        templateId: 'presentation',
        title: titleOf(section, index),
        sourceFormat: 'pptx',
        sourceName: file.name,
        sourceSize: file.size,
        sourceType: file.type || 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        slideNumber: index + 1,
        html: safeMarkup(section),
        alt: `${file.name}, ${index + 1}-слайд`,
      };
      // A Russian import is attached as a variant, so structural fields stay
      // in the Kazakh/base slide and `tr()` can safely merge the language data.
      if (variant === 'kk') return slide;
      const { type: _type, pageType: _pageType, templateId: _templateId, ...languageSlide } = slide;
      return languageSlide as unknown as PresentationSlide;
    });
  } finally {
    host.remove();
  }
}

async function pdfjs(): Promise<any> {
  const module = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Vite turns this URL into the bundled PDF.js worker asset. Using a worker
  // keeps a multi-page deck responsive while it is being imported.
  if (module.GlobalWorkerOptions && !module.GlobalWorkerOptions.workerSrc) {
    module.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url,
    ).toString();
  }
  return module;
}

export async function importPdf(file: File, variant: PresentationVariant = 'ru'): Promise<PresentationSlide[]> {
  const pdf = await pdfjs();
  const document = await pdf.getDocument({ data: await file.arrayBuffer() }).promise;
  const out: PresentationSlide[] = [];
  try {
    for (let pageNo = 1; pageNo <= document.numPages; pageNo++) {
      const page = await document.getPage(pageNo);
      const textContent = await page.getTextContent();
      const extractedTitle = plain(textContent.items.map((item: any) => String(item.str || '')).join(' '));
      // Keep the original page proportions and layout, but use a compact
      // raster size so a translated deck can still be saved as lesson JSON
      // within the database statement timeout.
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('PDF слайдын салуға арналған canvas ашылмады.');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const img = canvas.toDataURL('image/webp', 0.72);
      const slide: PresentationSlide = {
        type: 'presentation',
        pageType: 'presentation',
        templateId: 'presentation',
        title: extractedTitle.slice(0, 240) || `Слайд ${pageNo}`,
        sourceFormat: 'pdf',
        sourceName: file.name,
        sourceSize: file.size,
        sourceType: file.type || 'application/pdf',
        slideNumber: pageNo,
        img,
        alt: `${file.name}, ${pageNo}-бет`,
      };
      if (variant === 'ru') {
        const { type: _type, pageType: _pageType, templateId: _templateId, ...languageSlide } = slide;
        out.push(languageSlide as unknown as PresentationSlide);
      } else out.push(slide);
    }
  } finally {
    await document.destroy();
  }
  return out;
}

export function isPptx(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pptx') || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
}

export function isPdf(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
}

function titleTokens(value: string): Set<string> {
  return new Set((value.toLocaleLowerCase().match(/[a-z0-9]{2,}|[а-яё]{3,}/gi) || []));
}

function titleSimilarity(left: string, right: string): number {
  const a = titleTokens(left);
  const b = titleTokens(right);
  let score = 0;
  a.forEach(token => {
    if (b.has(token)) score += /^[a-z0-9]/i.test(token) || /^\d+$/.test(token) ? 5 : 2;
  });
  return score;
}

/**
 * Aligns a translated PDF to the base deck without assuming that both files
 * have exactly the same page count. A missing title page is left without a
 * variant instead of shifting every later language slide by one position.
 */
export function alignPresentationVariants<T extends { title: string }>(base: T[], variants: T[]): Array<T | undefined> {
  if (!base.length || !variants.length) return base.map(() => undefined);
  if (base.length === variants.length) return variants.slice() as Array<T | undefined>;

  const baseIsLonger = base.length > variants.length;
  const delta = Math.abs(base.length - variants.length);
  const rows = base.length + 1;
  const cols = variants.length + 1;
  const dp = Array.from({ length: rows }, () => Array.from({ length: cols }, () => -Infinity));
  const move = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
  dp[0][0] = 0;
  for (let i = 0; i <= base.length; i++) {
    for (let j = 0; j <= variants.length; j++) {
      if (!Number.isFinite(dp[i][j])) continue;
      const skipped = baseIsLonger ? i - j : j - i;
      if (i < base.length && j < variants.length && skipped <= delta) {
        const candidate = dp[i][j] + titleSimilarity(base[i].title, variants[j].title);
        if (candidate > dp[i + 1][j + 1]) {
          dp[i + 1][j + 1] = candidate;
          move[i + 1][j + 1] = 'match';
        }
      }
      if (baseIsLonger && i < base.length && skipped < delta && dp[i][j] - 1 > dp[i + 1][j]) {
        dp[i + 1][j] = dp[i][j] - 1;
        move[i + 1][j] = 'skip-base';
      }
      if (!baseIsLonger && j < variants.length && skipped < delta && dp[i][j] - 1 > dp[i][j + 1]) {
        dp[i][j + 1] = dp[i][j] - 1;
        move[i][j + 1] = 'skip-variant';
      }
    }
  }

  const aligned = base.map(() => undefined as T | undefined);
  let i = base.length;
  let j = variants.length;
  while (i > 0 || j > 0) {
    const step = move[i][j];
    if (step === 'match') {
      aligned[i - 1] = variants[j - 1];
      i -= 1;
      j -= 1;
    } else if (step === 'skip-base') i -= 1;
    else if (step === 'skip-variant') j -= 1;
    else break;
  }
  return aligned;
}

