import React from 'react';
import { api } from './types';
import type { MyAssignment } from './types';
import { Card, EmptyState, ErrorBox, Skeleton, StatusChip, useLoad } from '../ui';
import { fmtDate, isPast } from './format';

function Row({ a }: { a: MyAssignment }) {
  const overdue = isPast(a.due_at) && (a.status === 'not_started' || a.status === 'draft');
  return (
    <a href={`#hw/${a.assignment_id}`} className="block rounded-lg bg-surface border border-border shadow-card p-4 hover:border-accent">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold break-words">{a.title}</div>
          <div className="text-sm text-text-muted break-words">{a.unit_title} · мерзімі: {fmtDate(a.due_at)}</div>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {overdue && <StatusChip status="late" />}
          <StatusChip status={a.status} />
        </div>
      </div>
      {(a.points != null || a.tests_total) && (
        <div className="mt-2 text-sm text-text-secondary">
          {a.tests_total ? `Тест: ${a.tests_passed}/${a.tests_total}` : ''}{a.tests_total && a.points != null ? ' · ' : ''}{a.points != null ? `Ұпай: ${a.points}/${a.max_points}${a.status === 'finalized' ? '' : ' (уақытша)'}` : ''}
        </div>
      )}
      {a.feedback && <div className="mt-2 text-sm rounded-md bg-info-soft text-text p-2 break-words">💬 {a.feedback}</div>}
    </a>
  );
}

export function HomeworkList() {
  const { data, error, loading, reload } = useLoad(() => api().listMyAssignments(), []);
  const todo = (data || []).filter(a => ['not_started', 'draft', 'needs_work'].includes(a.status));
  const done = (data || []).filter(a => ['submitted', 'finalized'].includes(a.status));
  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Үй тапсырмасы</h1>
      {loading && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState text="Әзірге үй тапсырмасы жоқ. Мұғалім бергенде осында шығады." />}
      {todo.length > 0 && <section aria-label="Орындау керек" className="space-y-2"><h2 className="font-semibold text-text-secondary">Орындау керек · {todo.length}</h2>{todo.map(a => <Row key={a.assignment_id} a={a} />)}</section>}
      {done.length > 0 && <section aria-label="Тапсырылған" className="space-y-2"><h2 className="font-semibold text-text-secondary">Тапсырылған · {done.length}</h2>{done.map(a => <Row key={a.assignment_id} a={a} />)}</section>}
      {data && data.length > 0 && <Card className="text-sm text-text-muted">Бағасы «уақытша» болса, мұғалім әлі растаған жоқ.</Card>}
    </main>
  );
}
