import React from 'react';
import { pick, type Lang } from '../lessons/lang';

/** Full-screen loader: the CF cube builds itself in a loop (styles: .cf-load in index.html, shown before the app starts too). */
export function Loading({ lang = 'kk', full = true }: { lang?: Lang; full?: boolean }) {
  return (
    <div className="cf-load text-text-muted" style={full ? undefined : { minHeight: 240 }} role="status" aria-live="polite">
      <svg viewBox="65 58 411 411" aria-hidden="true">
        <path className="t" d="M99.5 176.2 270.5 76.4 441.5 176.2 384.8 209.3 270.5 143 158 209.8Z" fill="#998CF8" />
        <path className="l" d="M99.5 176.2 158 209.8V314l112.5 66.8v70.8L99.5 352.1Z" fill="#352AAB" />
        <path className="f" d="M270.5 276.5 441.5 176.2v71.1L333 310.1v33.5l83.7-50.5v32.2L333 375.1v39.2l-62.5 37.3Z" fill="#5F51E0" />
      </svg>
      <span className="dots">{pick(lang, 'Жүктелуде', 'Загрузка', 'Loading')}</span>
    </div>
  );
}
