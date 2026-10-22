import React, { useState } from 'react';
import { THEMES, getTheme, setTheme } from '../theme';
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
