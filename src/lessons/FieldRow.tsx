import React from 'react';
import { inputCls } from '../ui';
import type { Field } from './blocks';

const CHIP: Record<string, string> = { 'Мәтін': 'bg-accent-soft text-on-accent-soft', 'Код': 'bg-warning-soft text-text', 'Интерактив': 'bg-success-soft text-text', 'Ескертпе': 'bg-surface-2 text-text-secondary' };

export function FieldRow({ f, uid, onChange, options }: { f: Field; uid: string; onChange: (v: any) => void; options: string[] }) {
  const id = `${uid}-${f.id}`;
  return (
    <div className="space-y-1 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2"><label htmlFor={id} className="text-sm font-semibold">{f.label}</label><span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[f.chip]}`}>{f.chip}</span></div>
      {f.kind === 'text' && <input id={id} className={inputCls} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'number' && <input id={id} type="number" min={0} max={100} className={inputCls + ' !w-28'} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'area' && <textarea id={id} rows={3} className={inputCls + ' py-2'} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'lines' && <textarea id={id} rows={Math.max(3, String(f.value).split('\n').length)} className={inputCls + ' py-2'} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'code' && <textarea id={id} rows={Math.max(4, String(f.value).split('\n').length)} spellCheck={false} className={inputCls + ' py-2 font-mono text-sm'} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'bool' && <label className="flex min-h-[44px] items-center gap-2 text-sm"><input id={id} type="checkbox" className="h-5 w-5" checked={f.value} onChange={e => onChange(e.target.checked)} />Иә</label>}
      {f.kind === 'answer' && <select id={id} className={inputCls} value={f.value} onChange={e => onChange(e.target.value)}><option value={-1} disabled>— таңдалмаған —</option>{options.map((o, k) => <option key={k} value={k}>{String.fromCharCode(65 + k)}. {o}</option>)}</select>}
    </div>
  );
}
