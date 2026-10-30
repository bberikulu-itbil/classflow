/**
 * Metadata for a presentation that stays in its original PPTX/PDF form.
 *
 * The platform no longer converts a newly uploaded deck into lesson JSON.
 * It stores the source file and keeps one lightweight lesson page that opens
 * the original file in a browser viewer.
 */

export type PresentationVariant = 'kk' | 'ru';

export type PresentationSource = {
  title: string;
  sourceFormat: 'pptx' | 'pdf';
  sourceName: string;
  sourceSize?: number;
  sourceType?: string;
  sourceUrl: string;
  slideNumber: number;
  html?: string;
  css?: string;
  alt?: string;
};

export type PresentationSlide = PresentationSource & {
  type: 'presentation';
  pageType: 'presentation';
  templateId: 'presentation';
  ru?: PresentationSource;
};

const titleOf = (name: string) => name.replace(/\.(pptx|pdf)$/i, '') || 'Презентация';

export function presentationSource(file: File, sourceUrl: string): PresentationSlide {
  return {
    type: 'presentation',
    pageType: 'presentation',
    templateId: 'presentation',
    title: titleOf(file.name),
    sourceFormat: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'pptx',
    sourceName: file.name,
    sourceSize: file.size,
    sourceType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
    sourceUrl,
    slideNumber: 1,
    alt: `${file.name}, түпнұсқа презентация`,
  };
}

export function isPptx(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pptx') || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
}

export function isPdf(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
}
