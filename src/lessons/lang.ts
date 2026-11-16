import { useEffect, useState } from 'react';

/** Lecture and UI language. A slide may carry `ru` and `en`: fields that replace the Kazakh ones. */
export type Lang = 'kk' | 'ru' | 'en';
const KEY = 'cf_lang';
const subs = new Set<() => void>();
let cur: Lang = (() => {
  try {
    const val = localStorage.getItem(KEY);
    return val === 'ru' || val === 'en' ? val : 'kk';
  } catch {
    return 'kk';
  }
})();

export const setLang = (l: Lang) => {
  cur = l;
  try { localStorage.setItem(KEY, l); } catch { /* private mode */ }
  subs.forEach(f => f());
};

export function useLang(): [Lang, () => void, (l: Lang) => void] {
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump(n => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  const nextLang = (l: Lang): Lang => (l === 'kk' ? 'ru' : l === 'ru' ? 'en' : 'kk');
  return [cur, () => setLang(nextLang(cur)), setLang];
}

/** The slide as it should be shown in `lang`; fallback to Kazakh if translation block is missing. */
export const tr = (s: any, lang: Lang) => {
  if (!s || typeof s !== 'object') return s;
  if (lang === 'ru' && s.ru && typeof s.ru === 'object') return { ...s, ...s.ru };
  if (lang === 'en' && s.en && typeof s.en === 'object') return { ...s, ...s.en };
  return s;
};
