export type PresentationVariant = 'kk' | 'ru';

export function isPptx(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pptx') || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
}
