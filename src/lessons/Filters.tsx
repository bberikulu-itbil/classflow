import React, { useState } from 'react';
import { Chips } from '../ui/Chips';
import { currentQuarter } from './model';
import type { Cls, Filters } from './model';

const KEY = 'cf_lessons_filters';
/** Default is "every class, this quarter". A choice lasts for the browser session; a new visit starts from this quarter again. */
export function useFilters() {
  const [f, set] = useState<Filters>(() => {
    try { const v = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (v && typeof v.cls === 'string' && Number.isInteger(v.q) && v.q >= 0 && v.q <= 4) return v; } catch { /* no storage */ }
    return { cls: '', q: currentQuarter() };
  });
  return [f, (p: Partial<Filters>) => set(o => { const n = { ...o, ...p }; try { sessionStorage.setItem(KEY, JSON.stringify(n)); } catch { /* not remembered */ } return n; })] as const;
}

export function QuarterChips({ f, set }: { f: Filters; set: (p: Partial<Filters>) => void }) {
  const cur = currentQuarter();
  return <Chips legend="Тоқсан" name="quarter" value={String(f.q)} onChange={v => set({ q: +v })}
    options={[1, 2, 3, 4].map(q => ({ v: String(q), label: q === cur ? `${q}-тоқсан · қазір` : `${q}-тоқсан` })).concat([{ v: '0', label: 'Барлығы' }])} />;
}
export function ClassChips({ f, set, classes }: { f: Filters; set: (p: Partial<Filters>) => void; classes: Cls[] }) {
  return <Chips legend="Сынып" name="class" value={f.cls} onChange={v => set({ cls: v })} options={[{ v: '', label: 'Барлық сынып' }, ...classes.map(c => ({ v: c.id, label: c.name }))]} />;
}
