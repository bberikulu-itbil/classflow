import { useEffect, useState } from 'react';

/** Lecture language. A slide may carry `ru`: fields that replace the Kazakh ones when Russian is chosen. */
export type Lang = 'kk' | 'ru';
const KEY = 'cf_lang';
const subs = new Set<() => void>();
let cur: Lang = (() => { try { return localStorage.getItem(KEY) === 'ru' ? 'ru' : 'kk'; } catch { return 'kk'; } })();

export const setLang = (l: Lang) => {
  cur = l;
  try { localStorage.setItem(KEY, l); } catch { /* private mode: keep it in memory */ }
  subs.forEach(f => f());
};

export function useLang(): [Lang, () => void] {
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump(n => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return [cur, () => setLang(cur === 'ru' ? 'kk' : 'ru')];
}

/** The slide as it should be shown in `lang`; without a `ru` block it stays as written. */
export const tr = (s: any, lang: Lang) => {
  if (!s || lang !== 'ru' || !s.ru || typeof s.ru !== 'object') return s;
  const { ru, ...rest } = s;
  return { ...rest, ...ru };
};
