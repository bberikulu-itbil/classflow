import { sb } from '../config';

const MAX = 1600;

/** Shrinks a picture to at most 1600px and re-encodes it (webp, jpeg where webp is unsupported) so a slide stays light on a phone. */
export async function shrink(file: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Тек PNG, JPEG, WebP немесе GIF суреті болады');
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('Файл суретке ұқсамайды немесе бүлінген'); });
  const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob | null = await new Promise(r => c.toBlob(r, 'image/webp', 0.85));
  if (blob && blob.type === 'image/webp') return blob;
  const jpg: Blob | null = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  if (!jpg) throw new Error('Суретті өңдеу мүмкін болмады');
  return jpg;
}

/** Uploads under the teacher's school folder (the bucket policy enforces it too) and returns the public URL. */
export async function uploadSlideImage(file: File, schoolId: string): Promise<string> {
  const blob = await shrink(file);
  if (blob.size > 2 * 1024 * 1024) throw new Error('Сурет тым ауыр (2 МБ-тан асады)');
  const path = `${schoolId}/${crypto.randomUUID()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
  const { error } = await sb.storage.from('cf-media').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return sb.storage.from('cf-media').getPublicUrl(path).data.publicUrl;
}

/** Stores a rendered presentation page outside the lesson JSON and returns its URL. */
export async function uploadPresentationSlideImage(dataUrl: string, schoolId: string): Promise<string> {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error('Слайд суретінің форматы танылмады');
  const [, contentType, encoded] = match;
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: contentType || 'image/webp' });
  if (blob.size > 2 * 1024 * 1024) throw new Error('Импорт слайды тым ауыр (2 МБ-тан асады)');
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/jpeg' ? 'jpg' : 'webp';
  const path = `${schoolId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('cf-media').upload(path, blob, {
    contentType: contentType || 'image/webp',
    cacheControl: '31536000',
  });
  if (error) throw new Error(error.message);
  return sb.storage.from('cf-media').getPublicUrl(path).data.publicUrl;
}

/** Keeps the original PPTX/PDF unchanged so the platform can open it directly. */
export async function uploadPresentationSource(file: File, schoolId: string): Promise<string> {
  if (!/\.(pptx|pdf)$/i.test(file.name)) throw new Error('Тек PPTX немесе PDF бастапқы файлы болады');
  if (file.size > 50 * 1024 * 1024) throw new Error('Презентация файлы 50 МБ-тан аспауы керек');
  const ext = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'pptx';
  const path = `${schoolId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('cf-presentations').upload(path, file, { contentType: file.type || (ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'), cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return sb.storage.from('cf-presentations').getPublicUrl(path).data.publicUrl;
}

/** Slide kinds that draw `img` (keep in step with renderSlide). */
export const IMG_TYPES = ['title', 'content', 'quiz', 'task', 'code'];
