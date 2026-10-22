import React from 'react';

/** Tab strip with arrow keys (roving tabindex). The caller renders the panel and gives it id `${id}-panel`. */
export function Tabs({ id, label, tabs, value, onChange }: { id: string; label: string; tabs: { key: string; label: string }[]; value: string; onChange: (k: string) => void }) {
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d || !tabs.length) return;
    const next = tabs[(tabs.findIndex(t => t.key === value) + d + tabs.length) % tabs.length].key;
    onChange(next);
    requestAnimationFrame(() => document.getElementById(`${id}-tab-${next}`)?.focus());
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className="flex border-b border-border overflow-x-auto">
      {tabs.map(t => (
        <button key={t.key} id={`${id}-tab-${t.key}`} type="button" role="tab" aria-selected={value === t.key} aria-controls={`${id}-panel`} tabIndex={value === t.key ? 0 : -1} onClick={() => onChange(t.key)}
          className={`min-h-[44px] px-4 text-sm whitespace-nowrap border-b-2 cursor-pointer ${value === t.key ? 'border-accent text-text font-semibold' : 'border-transparent text-text-secondary hover:text-text'}`}>{t.label}</button>
      ))}
    </div>
  );
}
