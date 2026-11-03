import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, RefreshCw, X } from 'lucide-react';
import qrcode from 'qrcode-generator';
import { sb } from '../config';

export const boardUrl = (token: string) => location.origin + location.pathname + '#b/' + token;

/** Link to the read-only board: copy it or show the QR. It works until the session ends; «Жаңа сілтеме» kills the old one. */
export function ShareBoard({ sid, onClose }: { sid: string; onClose: () => void }) {
  const [url, setUrl] = useState(''), [err, setErr] = useState(''), [copied, setCopied] = useState(false), [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = async (reset: boolean) => {
    setBusy(true); setErr(''); setCopied(false);
    const { data, error } = await sb.rpc('cf_board_link', { p_session: sid, p_reset: reset });
    setBusy(false);
    if (error || !data) setErr(error?.message || 'Сілтеме жасалмады'); else setUrl(boardUrl(data));
  };
  useEffect(() => { load(false); }, [sid]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); }
    catch { input.current?.select(); document.execCommand('copy'); } // http or old browser
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const qr = (() => {
    if (!url) return '';
    try { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch { return ''; }
  })();

  return (
    <div role="dialog" aria-modal="true" aria-label="Тақтаны бөлісу" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-surface p-5 text-text shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Тақтаны бөлісу</h3>
            <p className="text-sm text-text-secondary">Сілтемемен кім болса да ашады, аккаунт керек емес. Тек көруге болады, жауаптар көрінбейді.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Жабу" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-surface-2"><X size={20} aria-hidden="true" /></button>
        </div>
        {err ? <p role="alert" className="text-sm text-danger">{err}</p> : (
          <>
            <div className="flex gap-2">
              <input ref={input} readOnly value={url} onFocus={e => e.currentTarget.select()} aria-label="Тақта сілтемесі" className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-border-input bg-surface-2 px-3 text-sm" />
              <button type="button" onClick={copy} disabled={!url} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-on-accent hover:bg-accent-hover disabled:opacity-50">
                {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}{copied ? 'Көшірілді' : 'Көшіру'}
              </button>
            </div>
            {qr && <div className="mx-auto w-40 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR код" role="img" />}
          </>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-text-muted">Сілтеме сабақ аяқталғанша жұмыс істейді.</p>
          <button type="button" onClick={() => load(true)} disabled={busy} className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-surface-2 disabled:opacity-50"><RefreshCw size={16} aria-hidden="true" />Жаңа сілтеме</button>
        </div>
      </div>
    </div>
  );
}
