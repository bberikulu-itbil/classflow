import React from 'react';
import type { Status } from '../hw/types';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
const V: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface-2 text-text hover:bg-border',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft',
  danger: 'bg-danger text-on-danger hover:opacity-90',
  success: 'bg-success text-on-success hover:opacity-90',
};

export function Button({ variant = 'primary', loading, className = '', children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button type="button" aria-busy={loading || undefined} disabled={p.disabled || loading}
      className={`min-h-[44px] px-4 rounded-md text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${V[variant]} ${className}`} {...p}>
      {loading ? '⏳ ' : ''}{children}
    </button>
  );
}

export function LinkButton({ variant = 'secondary', className = '', ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a className={`inline-flex items-center min-h-[44px] px-4 rounded-md text-sm font-semibold ${V[variant]} ${className}`} {...p} />;
}

export function Field({ label, error, children }: { label: string; error?: string; children: (id: string) => React.ReactNode }) {
  const id = React.useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary">{label}</label>
      {children(id)}
      {error && <p id={id + '-err'} className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export const inputCls = 'w-full min-h-[44px] px-3 rounded-md bg-surface text-text border border-line-input placeholder:text-text-muted';

export function Card({ className = '', ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-surface border border-border rounded-lg shadow-card p-4 ${className}`} {...p} />;
}

const LABEL: Record<Status | 'late' | 'flag', string> = {
  not_started: 'Басталмаған', draft: 'Жоба', submitted: 'Тапсырылды', needs_work: 'Қайта жасау керек', finalized: 'Бағаланды', late: 'Кешікті', flag: 'Тексеру керек',
};
export function StatusChip({ status }: { status: Status | 'late' | 'flag' }) {
  const cls = status === 'flag' ? 'status-late' : 'status-' + status.replace('_', '-');
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{status === 'flag' ? '⚑ ' : ''}{LABEL[status]}</span>;
}

export function EmptyState({ icon = '📭', text, action }: { icon?: string; text: string; action?: React.ReactNode }) {
  return (
    <Card className="text-center py-10 space-y-3">
      <div aria-hidden="true" className="text-3xl">{icon}</div>
      <p className="text-text-secondary">{text}</p>
      {action}
    </Card>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Жүктелуде">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-16 rounded-lg bg-surface-2 animate-pulse" />)}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg bg-danger-soft text-danger p-4 space-y-2">
      <p className="font-medium break-words">{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Қайталау</Button>}
    </div>
  );
}

/** Loads data once and on retry; gives the three states every screen needs. */
export function useLoad<T>(fn: () => Promise<T>, deps: React.DependencyList) {
  const [state, set] = React.useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const run = React.useCallback(() => {
    set(s => ({ ...s, loading: true, error: undefined }));
    fn().then(data => set({ data, loading: false }), (e: Error) => set({ error: e.message || 'Қате', loading: false }));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(run, [run]);
  return { ...state, reload: run };
}
