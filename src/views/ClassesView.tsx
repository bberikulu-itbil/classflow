import React from 'react';
import { sb, DEMO } from '../config';
import { Card, EmptyState, ErrorBox, Skeleton, useLoad } from '../ui';
import { byName } from './session';

const DEMO_CLASS = { id: 'cf-demo-class', name: 'Демо сынып', demo: true } as const;
const DEMO_STUDENTS = [
  { id: 'cf-demo-student-1', full_name: 'Айдана Нұрлан', class_id: DEMO_CLASS.id },
  { id: 'cf-demo-student-2', full_name: 'Данияр Серік', class_id: DEMO_CLASS.id },
  { id: 'cf-demo-student-3', full_name: 'Мөлдір Ермек', class_id: DEMO_CLASS.id },
];

type ClassRow = { id: string; name: string; demo?: boolean };
type StudentRow = { id: string; full_name: string; class_id: string | null };

export function ClassesView() {
  const { data, error, loading, reload } = useLoad(async () => {
    if (DEMO) return {
      classes: [DEMO_CLASS] as ClassRow[],
      students: DEMO_STUDENTS as StudentRow[],
      studentsError: '',
    };
    const [c, s] = await Promise.all([
      sb.from('classes').select('id,name'),
      // shortcut: one request for the whole school's students, grouped here; paginate if a school passes a few thousand
      sb.from('profiles').select('id,full_name,class_id').eq('role', 'student').is('removed_at', null).order('full_name'),
    ]);
    if (c.error) throw new Error(c.error.message);
    const students = (s.data || []) as StudentRow[];
    const classes = ((c.data || []) as ClassRow[]).sort((a, b) => byName(a.name, b.name));
    classes.push(DEMO_CLASS);
    return { classes, students, studentsError: s.error?.message || '' };
  }, []);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Сыныптар және оқушылар</h2>
      <p className="text-sm text-text-secondary">Демо сынып сырттан көрсететін мысал ретінде берілген. Оның деректері нақты журналға жазылмайды.</p>
      {loading && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.classes.length === 0 && <EmptyState text="Сынып табылмады." />}
      {data?.studentsError && <ErrorBox message={'Оқушылар тізімі қолжетімсіз: ' + data.studentsError} onRetry={reload} />}
      {data && data.classes.map(c => {
        const list = data.students.filter(s => s.class_id === c.id);
        return (
          <Card key={c.id} className={`!p-0 ${c.demo ? 'border-accent/50' : ''}`}>
            <details>
              <summary className="flex items-center justify-between gap-3 min-h-[44px] px-4 py-3 cursor-pointer">
                <span className="flex min-w-0 flex-wrap items-center gap-2 font-semibold">
                  <span>{c.name}</span>
                  {c.demo && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-on-accent-soft">Көрсетуге арналған</span>}
                </span>
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
