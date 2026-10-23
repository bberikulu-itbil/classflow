import React from 'react';

/** A row of native radio buttons dressed as chips: arrow keys, screen readers and the visible focus ring come from the browser. */
export function Chips({ legend, name, options, value, onChange, compact }: { compact?: boolean; legend: string; name: string; options: { v: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className={compact ? 'sr-only' : 'mb-1 text-sm font-medium text-text-secondary'}>{legend}</legend>
      <div className={`flex gap-1.5 overflow-x-auto ${compact ? '' : 'pb-1'}`}>
        {options.map(o => (
          <label key={o.v} className="relative cursor-pointer shrink-0">
            <input type="radio" name={name} value={o.v} checked={value === o.v} onChange={() => onChange(o.v)} className="peer sr-only" />
            <span className="flex items-center min-h-[44px] px-4 rounded-full border border-border bg-surface text-sm text-text peer-checked:bg-accent peer-checked:border-accent peer-checked:text-on-accent peer-checked:font-semibold peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 hover:bg-surface-2 peer-checked:hover:bg-accent">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
