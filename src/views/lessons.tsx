import React, { useState } from 'react';
import { sb, DEMO } from '../config';
import { Button, Card, EmptyState, ErrorBox, LinkButton, Skeleton, inputCls, useLoad } from '../ui';
import { fmtDate } from '../hw/format';
import { byName, startSession } from './session';

interface Lesson { id: string; title: string; subject: string | null; class_id: string | null }
interface Cls { id: string; name: string }

export const DemoNote = () => <EmptyState icon="🧪" text="Демо режимде бұл бөлімнің деректері жоқ. Нақты логинмен кірсең көрінеді." />;

export async function loadLessons() {
  const [l, c] = await Promise.all([
    sb.from('cf_lessons').select('id,title,subject,class_id').order('updated_at', { ascending: false }),
    sb.from('classes').select('id,name'),
  ]);
  if (l.error) throw new Error(l.error.message);
  return { lessons: (l.data || []) as Lesson[], classes: (c.data || []) as Cls[] };
}

function LessonRow({ l, classes }: { l: Lesson; classes: Cls[] }) {
  const [cls, setCls] = useState(l.class_id || '');
  const [groups, setGroups] = useState(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true); setErr('');
    try { await startSession(l.id, cls, groups); } catch (e) { setErr((e as Error).message || 'Сабақты бастау мүмкін болмады'); setBusy(false); }
  };
  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[10rem]">
          <div className="font-semibold break-words">{l.title}</div>
          {l.subject && <div className="text-sm text-text-muted">{l.subject}</div>}
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">Сынып
          <select className={inputCls + ' !w-auto'} value={cls} onChange={e => setCls(e.target.value)}>
            <option value="">—</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary">Топ
          <input type="number" min={1} max={8} className={inputCls + ' !w-20'} value={groups} onChange={e => setGroups(Math.min(8, Math.max(1, +e.target.value || 1)))} />
        </label>
        <LinkButton href={'#edit/' + l.id}>Өңдеу</LinkButton>
        <Button onClick={go} loading={busy}>▶ Бастау</Button>
      </div>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
    </Card>
  );
}

export function LessonsMine() {
  const { data, error, loading, reload } = useLoad(() => (DEMO ? Promise.resolve(null) : loadLessons()), []);
  if (DEMO) return <DemoNote />;
  const names = new Map((data?.classes || []).map(c => [c.id, c.name]));
  const groups = new Map<string, Lesson[]>();
  for (const l of data?.lessons || []) {
    const k = (l.class_id && names.get(l.class_id)) || 'Сыныпсыз';
    groups.set(k, [...(groups.get(k) || []), l]);
  }
  const keys = [...groups.keys()].sort((a, b) => (a === 'Сыныпсыз' ? 1 : b === 'Сыныпсыз' ? -1 : byName(a, b)));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Менің сабақтарым</h2>
        <LinkButton href="#edit/new" variant="primary">+ Жаңа сабақ</LinkButton>
      </div>
      {loading && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.lessons.length === 0 && <EmptyState text="Әзірге сабақ жоқ. «+ Жаңа сабақ» басып бастаңыз." />}
      {keys.map(k => (
        <section key={k} aria-label={k} className="space-y-2">
          <h3 className="font-semibold text-text-secondary">{k} · {groups.get(k)!.length}</h3>
          {groups.get(k)!.map(l => <LessonRow key={l.id} l={l} classes={data!.classes} />)}
        </section>
      ))}
    </div>
  );
}

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
