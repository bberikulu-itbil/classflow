import React from 'react';
import { sb, DEMO } from '../config';
import { Card, EmptyState, ErrorBox, Skeleton, useLoad } from '../ui';
import { fmtDate } from '../hw/format';

export const DemoNote = () => <EmptyState icon="🧪" text="Демо режимде бұл бөлімнің деректері жоқ. Нақты логинмен кірсең көрінеді." />;

export function PastSessions({ meId }: { meId: string }) {
  const { data, error, loading, reload } = useLoad(async () => {
    if (DEMO) return null;
    const [s, c] = await Promise.all([
      sb.from('cf_sessions').select('*').eq('teacher_id', meId).neq('status', 'live'),
      sb.from('classes').select('id,name'),
    ]);
    if (s.error) throw new Error(s.error.message);
    const names = new Map((c.data || []).map((x: any) => [x.id, x.name]));
    return (s.data || []).map((r: any) => ({ id: r.id as string, title: r.title as string, cls: (names.get(r.class_id) as string) || '', at: (r.ended_at || r.started_at || r.created_at || null) as string | null }))
      .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  }, [meId]);
  if (DEMO) return <DemoNote />;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Өткен сабақтар журналы</h2>
      {loading && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState text="Өткен сабақ әлі жоқ. Сабақты аяқтағанда осында түседі." />}
      {data && data.map(r => (
        <Card key={r.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-sm text-text-muted w-36">{r.at ? fmtDate(r.at) : '—'}</span>
          <span className="font-semibold break-words flex-1 min-w-[10rem]">{r.title}</span>
          {r.cls && <span className="text-sm text-text-secondary">{r.cls}</span>}
        </Card>
      ))}
    </div>
  );
}
