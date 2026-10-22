import React from 'react';
import { sb, DEMO } from '../config';
import { api } from '../hw/types';
import { Card, EmptyState, ErrorBox, Skeleton, StatusChip, useLoad } from '../ui';
import { DemoNote } from './lessons';

export function StudentFeedback() {
  const { data, error, loading, reload } = useLoad(() => api().listMyAssignments(), []);
  const rows = (data || []).filter(a => a.status === 'finalized' || a.status === 'needs_work' || a.feedback);
  const done = rows.filter(a => a.status === 'finalized' && a.points != null);
  const got = done.reduce((n, a) => n + (a.points || 0), 0), max = done.reduce((n, a) => n + a.max_points, 0);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Мұғалім пікірлері және ұпайлар</h2>
      {loading && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && rows.length === 0 && <EmptyState text="Мұғалім әлі баға мен пікір қойған жоқ." />}
      {done.length > 0 && <p className="text-sm text-text-secondary">Бағаланған жұмыс: {done.length} · ұпай жиыны: {got}/{max}</p>}
      {rows.map(a => (
        <a key={a.assignment_id} href={'#hw/' + a.assignment_id} className="block rounded-lg bg-surface border border-border shadow-card p-4 hover:border-accent">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="font-semibold break-words min-w-0">{a.title}</div>
            <StatusChip status={a.status} />
          </div>
          {a.points != null && <div className="mt-1 text-sm text-text-secondary">Ұпай: {a.points}/{a.max_points}{a.status === 'finalized' ? '' : ' (уақытша)'}</div>}
          {a.feedback && <div className="mt-2 text-sm rounded-md bg-info-soft text-text p-2 break-words">💬 {a.feedback}</div>}
        </a>
      ))}
    </div>
  );
}

export function StudentTerms() {
  const { data, error, loading, reload } = useLoad(async () => {
    if (DEMO) return null;
    const r = await sb.from('cf_my_terms').select('term,definition').order('created_at', { ascending: false });
    if (r.error) throw new Error(r.error.message);
    return (r.data || []) as Array<{ term: string; definition: string | null }>;
  }, []);
  if (DEMO) return <DemoNote />;
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Сабақтардан жиналған терминдер</h2>
        {data && <span className="text-sm text-text-muted">{data.length} термин</span>}
      </div>
      {loading && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState icon="📖" text="Сабақ кезінде терминді басып сөздікке қоса аласың." />}
      {data && data.length > 0 && (
        <Card>
          <dl className="space-y-3">
            {data.map((t, i) => (
              <div key={i}><dt className="font-semibold break-words">{t.term}</dt>{t.definition && <dd className="text-sm text-text-secondary break-words">{t.definition}</dd>}</div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
