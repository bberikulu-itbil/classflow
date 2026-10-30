/** Metadata for the untouched source file kept alongside editable pages. */

export type PresentationVariant = 'kk' | 'ru';

export type PresentationSource = {
  title: string;
  sourceFormat: 'pptx' | 'pdf';
  sourceName: string;
  sourceSize?: number;
  sourceType?: string;
  sourceUrl: string;
  slideNumber: number;
  presentationImportId?: string;
  presentationWidth?: number;
  presentationHeight?: number;
  sourceSlidePath?: string;
  sourceText?: string;
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
