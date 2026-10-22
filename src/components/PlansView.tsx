import React from 'react';
import { sb } from '../config';
import { Card, EmptyState, ErrorBox, LinkButton, Skeleton, useLoad } from '../ui';

export function PlansView() {
  const { data, error, loading, reload } = useLoad(async () => {
    const r = await sb.from('cf_plans').select('id,kind,title,quarter,updated_at').order('updated_at', { ascending: false });
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  }, []);
  return (
    <main className="max-w-5xl mx-auto p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Жоспарлар</h1>
        <LinkButton href="#plan/new" variant="primary">+ Жаңа жоспар</LinkButton>
      </div>
      {loading && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon="🗓" text="Жоспар жоқ." />}
      {data && data.map((r: any) => (
        <a key={r.id} href={'#plan/' + r.id} className="block rounded-lg bg-surface border border-border shadow-card p-4 hover:border-accent">
          <b className="break-words">{r.title}</b>
          <span className="ml-2 text-xs text-text-muted">{r.kind === 'quarter' ? `Тоқсандық · ${r.quarter || ''}-тоқсан` : 'Сабақ жоспары'}</span>
        </a>
      ))}
    </main>
  );
}
