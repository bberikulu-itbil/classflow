// The page applies the saved theme before it paints (script in index.html); this file reads and changes it.
export const THEMES = [
  { id: 'light', label: 'Жарық' },
  { id: 'dark', label: 'Қараңғы' },
  { id: 'ocean', label: 'Теңіз' },
  { id: 'sand', label: 'Құм' },
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];

const KEY = 'cf_theme';
export const getTheme = (): ThemeId => {
  try { const v = localStorage.getItem(KEY); return THEMES.find(t => t.id === v)?.id ?? 'light'; } catch { return 'light'; }
};
export const setTheme = (id: ThemeId) => {
  document.documentElement.setAttribute('data-theme', id);
  try { localStorage.setItem(KEY, id); } catch { /* private mode: the theme still changes, it just is not remembered */ }
};

// Text size = the page's root font size in percent; everything in rem (all of Tailwind's text and spacing) follows it.
export const FONTS = [
  { pct: 87, label: 'Кіші' },
  { pct: 100, label: 'Қалыпты' },
  { pct: 115, label: 'Үлкен' },
  { pct: 130, label: 'Өте үлкен' },
] as const;
const FKEY = 'cf_font';
export const getFont = (): number => {
  try { const v = Number(localStorage.getItem(FKEY)); return FONTS.find(f => f.pct === v)?.pct ?? 100; } catch { return 100; }
};
export const setFont = (pct: number) => {
  document.documentElement.style.fontSize = pct + '%';
  try { localStorage.setItem(FKEY, String(pct)); } catch { /* not remembered, still applied */ }
};
