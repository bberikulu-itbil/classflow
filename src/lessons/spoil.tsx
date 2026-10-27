import React, { useState } from 'react';

/**
 * Hidden text on a slide. In any bullet or section text, `||answer||` shows as a row of dots until it is opened;
 * a section with `hide: true` shows only its heading and a «Көрсету» button. They are numbered in the order they are drawn.
 * On the board, Алға opens the next hidden one before it changes the slide.
 */
export type SpCtx = { shown: Set<number>; show: (i: number) => void; n: number };

const MARK = /\|\|(.+?)\|\|/g;
const m = (s: unknown) => (typeof s === 'string' ? (s.match(MARK) || []).length : 0);
/** How many hidden things this slide has (a hidden section counts once, whatever is inside it). */
export const countSpoilers = (s: any): number =>
  (s?.bullets || []).reduce((a: number, b: string) => a + m(b), 0) + m(s?.prompt) +
  (s?.blocks || []).reduce((a: number, b: any) => a + (b?.hide ? 1 : m(b?.text)), 0) +
  (s?.sections || []).reduce((a: number, sec: any) => a + (sec.hide ? 1 : m(sec.text) + (sec.bullets || []).reduce((x: number, b: string) => x + m(b), 0)), 0);

export function useSpoilers(key: string | number) {
  const [st, set] = useState<{ k: string | number; s: Set<number> }>({ k: key, s: new Set() });
  const shown = st.k === key ? st.s : new Set<number>();
  const show = (i: number) => set(o => ({ k: key, s: new Set(o.k === key ? o.s : []).add(i) }));
  /** Opens the lowest hidden one; false when everything is already open. */
  const revealNext = (total: number) => { for (let i = 0; i < total; i++) if (!shown.has(i)) { show(i); return true; } return false; };
  return { shown, show, revealNext };
}
/** A fresh counter for one draw of a slide. */
export const spCtx = (h: { shown: Set<number>; show: (i: number) => void }): SpCtx => ({ shown: h.shown, show: h.show, n: 0 });

/** Text with `||hidden||` parts; without a context the markers are just dropped. */
export function rich(text: string, sp?: SpCtx): React.ReactNode {
  if (typeof text !== 'string' || !text.includes('||')) return text;
  const out: React.ReactNode[] = []; let last = 0, k = 0, r: RegExpExecArray | null;
  MARK.lastIndex = 0;
  while ((r = MARK.exec(text))) {
    if (r.index > last) out.push(text.slice(last, r.index));
    if (!sp) out.push(r[1]);
    else {
      const i = sp.n++;
      out.push(sp.shown.has(i)
        ? <mark key={k++} className="rounded bg-emerald-900 px-1 text-emerald-100">{r[1]}</mark>
        : <button key={k++} type="button" onClick={() => sp.show(i)} aria-label="Жасырын мәтін, көрсету үшін бас" className="cursor-pointer rounded bg-slate-600 px-1.5 text-slate-200 hover:bg-slate-500"><span aria-hidden="true" className="align-middle text-[0.55em] tracking-widest">{'●'.repeat(Math.max(3, Math.min(r[1].length, 10)))}</span></button>);
    }
    last = r.index + r[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
