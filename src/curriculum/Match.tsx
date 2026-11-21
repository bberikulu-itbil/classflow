import React from 'react';

/** Matching in an exam: a letter of the right column for every left row; the answer is the letters in row order ("-" = none yet). */
export function Match({ m, value, onChange, label }: { m: { left: string[]; right: string[] }; value: string; onChange: (v: string) => void; label: string }) {
  const cur = m.left.map((_, k) => value[k] && value[k] !== '-' ? value[k] : '-');
  const set = (k: number, ch: string) => onChange(cur.map((c, j) => (j === k ? ch : c)).join(''));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ul className="space-y-1.5" aria-label={`${label}: сол жақ`}>{m.left.map((l, k) => (
        <li key={k} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-3">
          <span className="min-w-0 flex-1 font-mono">{k + 1}. {l}</span>
          <select value={cur[k]} onChange={e => set(k, e.target.value)} aria-label={`${k + 1}. ${l}`} className="min-h-[40px] rounded-md border border-border bg-surface px-2 font-bold">
            <option value="-">—</option>{m.right.map((_, j) => <option key={j} value={String.fromCharCode(65 + j)}>{String.fromCharCode(65 + j)}</option>)}
          </select>
        </li>))}</ul>
      <ul className="space-y-1.5" aria-label={`${label}: оң жақ`}>{m.right.map((r, j) => (
        <li key={j} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-surface-2 px-3 font-mono"><b>{String.fromCharCode(65 + j)}.</b> {r}</li>))}</ul>
    </div>
  );
}
