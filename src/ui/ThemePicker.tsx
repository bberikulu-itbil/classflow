import React, { useState } from 'react';
import { FONTS, THEMES, getFont, getTheme, setFont, setTheme } from '../theme';
import type { ThemeId } from '../theme';
import { Card } from './index';

/** Native radio buttons (arrow keys and screen readers for free); each swatch wears its own theme so it previews itself. */
export function ThemePicker() {
  const [cur, setCur] = useState<ThemeId>(getTheme);
  const pick = (id: ThemeId) => { setTheme(id); setCur(id); };
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold" id="theme-h">Тақырып (түс схемасы)</h2>
      <div role="radiogroup" aria-labelledby="theme-h" className="grid grid-cols-2 gap-2">
        {THEMES.map(t => (
          <label key={t.id} className="cursor-pointer">
            <input type="radio" name="theme" value={t.id} checked={cur === t.id} onChange={() => pick(t.id)} className="peer sr-only" />
            <span data-theme={t.id} className="block rounded-md border border-border bg-bg p-2 text-text peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
              <span className="mb-2 flex gap-1" aria-hidden="true">
                <i className="h-5 w-8 rounded border border-border bg-surface" />
                <i className="h-5 w-8 rounded bg-accent" />
                <i className="h-5 w-8 rounded bg-surface-2" />
              </span>
              <span className="text-sm font-medium">{t.label}{cur === t.id && <span className="sr-only"> (таңдалған)</span>}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-sm text-text-muted">Таңдау осы құрылғыда есте қалады.</p>
    </Card>
  );
}

export function FontPicker() {
  const [cur, setCur] = useState(getFont);
  const pick = (pct: number) => { setFont(pct); setCur(pct); };
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold" id="font-h">Қаріп өлшемі</h2>
      <div role="radiogroup" aria-labelledby="font-h" className="grid grid-cols-2 gap-2">
        {FONTS.map(f => (
          <label key={f.pct} className="cursor-pointer">
            <input type="radio" name="font" value={f.pct} checked={cur === f.pct} onChange={() => pick(f.pct)} className="peer sr-only" />
            <span className="block rounded-md border border-border bg-surface p-2 text-text text-sm font-medium peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2">
              {f.label}{cur === f.pct && <span className="sr-only"> (таңдалған)</span>}
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}

const NAMES: Record<ThemeId, [string, string, string]> = { light: ['Жарық', 'Светлая', 'Light'], dark: ['Қараңғы', 'Тёмная', 'Dark'], ocean: ['Теңіз', 'Море', 'Ocean'], sand: ['Құм', 'Песок', 'Sand'] };

/** A compact theme switch for a top bar (the student's lesson screen): a button that opens the four swatches. */
export function ThemeMenu({ lang = 'kk', className = '' }: { lang?: 'kk' | 'ru' | 'en'; className?: string }) {
  const [cur, setCur] = useState<ThemeId>(getTheme);
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const L = (t: [string, string, string]) => t[lang === 'ru' ? 1 : lang === 'en' ? 2 : 0];
  React.useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); };
  }, [open]);
  const title = L(['Бет түсі', 'Цвет страницы', 'Page colours']);
  return (
    <div ref={ref} className="relative">
      <button type="button" className={className} aria-haspopup="true" aria-expanded={open} aria-label={`${title}: ${L(NAMES[cur])}`} onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></svg><span className="hidden sm:inline">{L(NAMES[cur])}</span>
      </button>
      {open && (
        <div role="radiogroup" aria-label={title} className="absolute right-0 top-12 z-50 grid w-56 grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-2 shadow-xl">
          {THEMES.map(t => (
            <button key={t.id} type="button" role="radio" aria-checked={cur === t.id} data-theme={t.id} onClick={() => { setTheme(t.id); setCur(t.id); setOpen(false); }}
              className={`cursor-pointer rounded-xl border border-border bg-bg p-2 text-left text-text ${cur === t.id ? 'ring-2 ring-accent' : ''}`}>
              <span className="mb-1 flex gap-1" aria-hidden="true"><i className="h-4 w-5 rounded border border-border bg-surface" /><i className="h-4 w-5 rounded bg-accent" /><i className="h-4 w-5 rounded bg-surface-2" /></span>
              <span className="text-sm font-semibold">{L(NAMES[t.id])}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
