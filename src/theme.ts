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
