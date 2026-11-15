import React, { useRef, useState } from 'react';
import { ImagePlus, Package, X } from 'lucide-react';
import { Button } from '../ui';
import * as st from './store';

export const Note = ({ msg, ok }: { msg: string; ok: boolean }) => <p role="status" aria-live="polite" className={msg ? `rounded-lg p-3 text-sm ${ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}` : 'sr-only'}>{msg}</p>;
export const dmy = (iso: string) => iso.split('-').reverse().join('.');

/** Photo with a neutral placeholder; fixed aspect ratio keeps every card the same height. */
export function Photo({ url, alt, className = '' }: { url: string | null; alt: string; className?: string }) {
  const [bad, setBad] = useState(false);
  return url && !bad
    ? <img src={url} alt={alt} loading="lazy" onError={() => setBad(true)} className={`h-full w-full object-cover ${className}`} />
    : <div aria-hidden="true" className={`grid h-full w-full place-items-center bg-surface-2 text-text-muted ${className}`}><Package size={36} strokeWidth={1.5} /></div>;
}

/** Choose a photo, upload it (shrunk to <2 MB), keep only the URL in the form. */
export function PhotoPick({ me, value, onChange, label }: { me: st.Me; value: string; onChange: (u: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const pick = async (f?: File) => { if (!f) return; setBusy(true); setErr(''); try { onChange(await st.uploadPhoto(me, f)); } catch (e) { setErr(e instanceof Error ? e.message : 'Қате'); } setBusy(false); if (ref.current) ref.current.value = ''; };
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md border border-border"><Photo url={value || null} alt={label} /></div>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={label} onChange={e => pick(e.target.files?.[0])} />
        <Button variant="secondary" loading={busy} onClick={() => ref.current?.click()}><ImagePlus size={16} aria-hidden="true" />{value ? 'Ауыстыру' : 'Сурет қосу'}</Button>
        {value && <Button variant="ghost" aria-label="Суретті өшіру" onClick={() => onChange('')}><X size={16} aria-hidden="true" /></Button>}
      </div>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
    </div>
  );
}
