import { useEffect, useState } from 'react';

/** Lecture language. A slide may carry `ru:` / `en:` blocks whose fields replace the Kazakh ones when that language is chosen. */
export type Lang = 'kk' | 'ru' | 'en';
const KEY = 'cf_lang';
const ORDER: Lang[] = ['kk', 'ru', 'en'];
export const LANG_LABEL: Record<Lang, string> = { kk: 'ҚАЗ', ru: 'РУС', en: 'ENG' };
export const LANG_NAME: Record<Lang, string> = { kk: 'Қазақша', ru: 'Русский', en: 'English' };
const subs = new Set<() => void>();
let cur: Lang = (() => { try { const v = localStorage.getItem(KEY) as Lang; return ORDER.includes(v) ? v : 'kk'; } catch { return 'kk'; } })();

export const setLang = (l: Lang) => {
  cur = l;
  try { localStorage.setItem(KEY, l); } catch { /* private mode: keep it in memory */ }
  subs.forEach(f => f());
};

export function useLang(): [Lang, () => void] {
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump(n => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return [cur, () => setLang(ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length])];
}

/** The text in the chosen language: `pick(lang, kk, ru, en)`; a missing English text falls back to Russian, then Kazakh. */
export const pick = (lang: Lang, kk: string, ru: string, en?: string) => (lang === 'en' ? en ?? ru ?? kk : lang === 'ru' ? ru ?? kk : kk);

/** The slide as it should be shown in `lang`; without a block for that language it stays as written. */
export const tr = (s: any, lang: Lang) => {
  if (!s || lang === 'kk' || !s[lang] || typeof s[lang] !== 'object') return s;
  const { ru, en, ...rest } = s;
  return { ...rest, ...s[lang] };
};
