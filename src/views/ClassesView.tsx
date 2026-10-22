import React from 'react';
import { sb, DEMO } from '../config';
import { Card, EmptyState, ErrorBox, Skeleton, useLoad } from '../ui';
import { byName } from './session';
import { DemoNote } from './lessons';

export function ClassesView() {
  const { data, error, loading, reload } = useLoad(async () => {
    if (DEMO) return null;
    const [c, s] = await Promise.all([
      sb.from('classes').select('id,name'),
      // shortcut: one request for the whole school's students, grouped here; paginate if a school passes a few thousand
      sb.from('profiles').select('id,full_name,class_id').eq('role', 'student').is('removed_at', null).order('full_name'),
    ]);
    if (c.error) throw new Error(c.error.message);
    const students = (s.data || []) as Array<{ id: string; full_name: string; class_id: string | null }>;
    const classes = ((c.data || []) as Array<{ id: string; name: string }>).sort((a, b) => byName(a.name, b.name));
    return { classes, students, studentsError: s.error?.message || '' };
  }, []);
  if (DEMO) return <DemoNote />;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Сыныптар және оқушылар</h2>
      {loading && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.classes.length === 0 && <EmptyState text="Сынып табылмады." />}
      {data?.studentsError && <ErrorBox message={'Оқушылар тізімі қолжетімсіз: ' + data.studentsError} onRetry={reload} />}
      {data && data.classes.map(c => {
        const list = data.students.filter(s => s.class_id === c.id);
        return (
          <Card key={c.id} className="!p-0">
            <details>
              <summary className="flex items-center justify-between gap-3 min-h-[44px] px-4 py-3 cursor-pointer">
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-text-muted">{data.studentsError ? '—' : `${list.length} оқушы`}</span>
              </summary>
              {list.length > 0 && (
                <ol className="px-4 pb-4 pl-10 list-decimal space-y-1 text-sm">
                  {list.map(s => <li key={s.id} className="break-words">{s.full_name}</li>)}
                </ol>
              )}
            </details>
          </Card>
        );
      })}
    </div>
  );
}
