import React from 'react';

/** ClassFlow 1.0 mark: the CF cube. Brand colours, the same on every theme; same drawing as public/favicon.svg. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="65 58 411 411" aria-hidden="true" className="shrink-0">
      <path d="M99.5 176.2 270.5 76.4 441.5 176.2 384.8 209.3 270.5 143 158 209.8Z" fill="#998CF8" />
      <path d="M99.5 176.2 158 209.8V314l112.5 66.8v70.8L99.5 352.1Z" fill="#352AAB" />
      <path d="M270.5 276.5 441.5 176.2v71.1L333 310.1v33.5l83.7-50.5v32.2L333 375.1v39.2l-62.5 37.3Z" fill="#5F51E0" />
    </svg>
  );
}

/** Mark + wordmark; the visible text keeps the accessible name "ClassFlow". «Flow» takes the brand colour of the theme. */
export function Logo({ size = 28 }: { size?: number }) {
  return <span className="inline-flex items-center gap-2 tracking-tight"><LogoMark size={size} /><span style={{ color: 'var(--brand-ink)' }}>Class<span style={{ color: 'var(--brand-flow)' }}>Flow</span></span></span>;
}
