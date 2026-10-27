import React, { useRef, useState } from 'react';
import { Button, inputCls } from '../ui';
import { IMG_TYPES, uploadSlideImage } from '../lessons/media';

/** Puts a picture on one slide of the JSON below it: pick the slide, pick the file, describe it. */
export function ImagePanel({ json, setJson, schoolId }: { json: string; setJson: (s: string) => void; schoolId: string }) {
  const file = useRef<HTMLInputElement>(null), [idx, setIdx] = useState(0), [alt, setAlt] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  let slides: any[] | null = null;
  try { const v = JSON.parse(json); if (Array.isArray(v)) slides = v; } catch { /* shown below */ }
  const cur = slides?.[idx];
  const put = (img?: string) => {
    const next = slides!.map((s, i) => { if (i !== idx) return s; const { img: _i, alt: _a, ...rest } = s; return img ? { ...rest, img, alt: alt.trim() } : rest; });
    setJson(JSON.stringify(next, null, 1));
  };
  const pick = async (f: File | undefined) => {
    if (!f || !slides) return;
    setBusy(true); setMsg('');
    try { put(await uploadSlideImage(f, schoolId)); setMsg('Сурет слайдқа қосылды. «Сақтау» батырмасын бас.'); }
    catch (e: any) { setMsg(e.message || 'Жүктеу қатесі'); }
    setBusy(false);
  };
  return (
    <section aria-label="Сурет қосу" className="space-y-2 rounded-xl border border-border bg-surface p-3 text-text">
      <h3 className="font-semibold">Сурет қосу</h3>
      {!slides ? <p className="text-sm text-danger">Алдымен слайд JSON-ындағы қатені түзет.</p> : (
        <>
          <label className="block text-sm text-text-secondary">Қай слайдқа
            <select className={`${inputCls} mt-1`} value={idx} onChange={e => setIdx(+e.target.value)}>
              {slides.map((s, i) => <option key={i} value={i} disabled={!IMG_TYPES.includes(s.type)}>{i + 1}. {s.type}{s.title ? ' — ' + s.title : ''}{s.img ? ' 🖼' : ''}{IMG_TYPES.includes(s.type) ? '' : ' (сурет қолдамайды)'}</option>)}
            </select>
          </label>
          <label className="block text-sm text-text-secondary">Сурет сипаттамасы (көрмейтін оқушыға оқылады)
            <input className={`${inputCls} mt-1`} value={alt} maxLength={200} onChange={e => setAlt(e.target.value)} placeholder="Мысалы: пернетақтаның үш қатары" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={busy || !cur || !IMG_TYPES.includes(cur.type)} onClick={() => file.current?.click()}>{busy ? 'Жүктелуде…' : 'Сурет таңдау'}</Button>
            <input ref={file} type="file" aria-label="Сурет файлы" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" tabIndex={-1} disabled={busy || !cur || !IMG_TYPES.includes(cur.type)} onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            {cur?.img && <button type="button" className="min-h-[44px] text-sm text-danger underline" onClick={() => { put(); setMsg('Сурет алынды. «Сақтау» батырмасын бас.'); }}>Суретті алып тастау</button>}
          </div>
          {cur?.img && <img src={cur.img} alt={cur.alt || ''} className="max-h-40 rounded-lg bg-white" />}
        </>
      )}
      <p role="status" className="text-sm text-text-secondary">{msg}</p>
      <p className="text-xs text-text-muted">PNG, JPEG, WebP, GIF. Сурет 1600 пиксельге дейін кішірейтіліп, жүктеледі. Слайдта «img» және «alt» өрісі болып жазылады.</p>
    </section>
  );
}
