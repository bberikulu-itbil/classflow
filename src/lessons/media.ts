import { sb } from '../config';

const MAX = 1600;

/** Shrinks a picture to at most 1600px and re-encodes it (webp, png/jpeg where webp is unsupported) so a slide stays light on a phone while preserving transparency. */
export async function shrink(file: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Тек PNG, JPEG, WebP немесе GIF суреті болады');
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('Файл суретке ұқсамайды немесе бүлінген'); });
  const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  const x = c.getContext('2d')!;
  const isTransparent = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
  x.clearRect(0, 0, c.width, c.height);
  if (!isTransparent) {
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
  }
  x.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob | null = await new Promise(r => c.toBlob(r, 'image/webp', 0.9));
  if (blob && blob.type === 'image/webp') return blob;
  const fallbackMime = isTransparent ? 'image/png' : 'image/jpeg';
  const fallback: Blob | null = await new Promise(r => c.toBlob(r, fallbackMime, 0.9));
  if (!fallback) throw new Error('Суретті өңдеу мүмкін болмады');
  return fallback;
}

/** Removes near-white pixels from an image (chroma-key/color thresholding), returning a transparent PNG data URL. */
export async function removeWhiteBackground(src: string, threshold = 240): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Суретті оқу мүмкін болмады'));
    img.src = src;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Кенеп мәтінмәні қолжетімсіз');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const soft = Math.max(10, 255 - threshold);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minColor = Math.min(r, g, b);
    if (minColor >= threshold) {
      const diff = 255 - minColor;
      const alphaRatio = diff / soft;
      data[i + 3] = Math.max(0, Math.min(data[i + 3], Math.round(data[i + 3] * alphaRatio)));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Uploads under the teacher's school folder (the bucket policy enforces it too) and returns the public URL. */
export async function uploadSlideImage(file: File, schoolId: string): Promise<string> {
  const blob = await shrink(file);
  if (blob.size > 2 * 1024 * 1024) throw new Error('Сурет тым ауыр (2 МБ-тан асады)');
  const path = `${schoolId}/${crypto.randomUUID()}.${blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg'}`;
  const { error } = await sb.storage.from('cf-media').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return sb.storage.from('cf-media').getPublicUrl(path).data.publicUrl;
}

/** Slide kinds that draw `img` (keep in step with renderSlide). */
export const IMG_TYPES = ['title', 'content', 'quiz', 'task', 'code'];
