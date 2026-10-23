import React, { useEffect, useRef, useState } from 'react';
import { FilePlus, Layers, Plus } from 'lucide-react';

/** "+ Жасау": a module or a lecture. Disclosure menu: Escape closes it and gives the focus back, a click outside closes it. */
export function CreateMenu({ onModule }: { onModule: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); };
  }, [open]);
  const item = 'flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-text hover:bg-surface-2';
  return (
    <div ref={box} className="relative">
      <button ref={btn} type="button" aria-haspopup="true" aria-expanded={open} aria-controls="create-menu" onClick={() => setOpen(o => !o)}
        className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover"><Plus size={16} aria-hidden="true" />Жасау</button>
      {open && (
        <ul id="create-menu" className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-border bg-surface p-1 shadow-pop">
          <li><button type="button" className={item} onClick={() => { setOpen(false); onModule(); }}><Layers size={16} aria-hidden="true" />Модуль жасау</button></li>
          <li><a href="#edit/new" className={item}><FilePlus size={16} aria-hidden="true" />Дәріс жасау</a></li>
        </ul>
      )}
    </div>
  );
}
