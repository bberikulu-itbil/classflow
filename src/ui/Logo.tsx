import React from 'react';

/** ClassFlow mark: a "C" with a flow arrow. Same drawing as public/favicon.svg, coloured by the theme accent. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <g fill="none" stroke="var(--color-on-accent)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a7 7 0 1 0 0 9" strokeWidth="3" />
        <path d="M15 16h9m-3.5-3.5L24 16l-3.5 3.5" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

/** Mark + wordmark; the visible text keeps the accessible name "ClassFlow". */
export function Logo({ size = 28 }: { size?: number }) {
  return <span className="inline-flex items-center gap-2"><LogoMark size={size} /><span>Class<span className="text-accent">Flow</span></span></span>;
}
