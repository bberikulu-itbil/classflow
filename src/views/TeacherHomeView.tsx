import React, { useState } from 'react';
import { sb, DEMO } from '../config';
import { api } from '../hw/types';
import { Button, Card, EmptyState, ErrorBox, LinkButton, Skeleton, SoonCard, inputCls, useLoad } from '../ui';
import { startSession } from './session';

interface Lesson { id: string; title: string; class_id: string | null }

function StartLesson({ lessons, classes }: { lessons: Lesson[]; classes: Array<{ id: string; name: string }> }) {
  const [id, setId] = useState(lessons[0]?.id || '');
  const [cls, setCls] = useState(lessons[0]?.class_id || '');
  const [groups, setGroups] = useState(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (lessons.length === 0) return <EmptyState icon="📝" text="Әзірге сабақ жоқ." action={<LinkButton href="#edit/new" variant="primary">+ Жаңа сабақ</LinkButton>} />;
  const pick = (v: string) => { setId(v); setCls(lessons.find(l => l.id === v)?.class_id || ''); };
  const go = async () => {
    setBusy(true); setErr('');
    try { await startSession(id, cls, groups); } catch (e) { setErr((e as Error).message || 'Сабақты бастау мүмкін болмады'); setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <label className="block space-y-1"><span className="block text-sm font-medium text-text-secondary">Сабақ</span>
        <select className={inputCls} value={id} onChange={e => pick(e.target.value)}>{lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex-1 min-w-[8rem] space-y-1"><span className="block text-sm font-medium text-text-secondary">Сынып</span>
          <select className={inputCls} value={cls} onChange={e => setCls(e.target.value)}><option value="">—</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </label>
        <label className="w-24 space-y-1"><span className="block text-sm font-medium text-text-secondary">Топ саны</span>
          <input type="number" min={1} max={8} className={inputCls} value={groups} onChange={e => setGroups(Math.min(8, Math.max(1, +e.target.value || 1)))} />
        </label>
      </div>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <Button onClick={go} loading={busy}>▶ Сабақты бастау</Button>
      <p className="text-xs text-text-muted">Соңғы өңделген сабақ таңдалған.</p>
    </div>
  );
}

export function TeacherHomeView({ me }: { me: { id: string; full_name: string } }) {
  const base = useLoad(async () => {
    if (DEMO) return { lessons: [] as Lesson[], classes: [] as Array<{ id: string; name: string }>, live: [] as Array<{ id: string; title: string; join_code: string }> };
    const [l, c, s] = await Promise.all([
      sb.from('cf_lessons').select('id,title,class_id').order('updated_at', { ascending: false }),
      sb.from('classes').select('id,name').order('name'),
      sb.from('cf_sessions').select('id,title,join_code').eq('teacher_id', me.id).eq('status', 'live'),
    ]);
    if (l.error) throw new Error(l.error.message);
    return { lessons: (l.data || []) as Lesson[], classes: (c.data || []) as Array<{ id: string; name: string }>, live: (s.data || []) as Array<{ id: string; title: string; join_code: string }> };
  }, [me.id]);
  const sum = useLoad(() => api().teacherSummary(), []);
  const pendingTotal = (sum.data?.pending || []).reduce((n, p) => n + p.count, 0);

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      <header>
        <p className="text-sm text-text-muted">{new Date().toLocaleDateString('kk-KZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-2xl font-bold">Сәлеметсіз бе, {(me.full_name || '').split(' ')[0]}</h1>
      </header>

      {base.data && base.data.live.length > 0 && (
        <section aria-label="Жүріп жатқан сабақтар" className="space-y-2">
          <h2 className="font-semibold">🟢 Жүріп жатқан сабақтар</h2>
          <div className="flex flex-wrap gap-2">
            {base.data.live.map(s => <LinkButton key={s.id} href={'#remote/' + s.id} variant="success">{s.title} · {s.join_code}</LinkButton>)}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">Сабақты бастау</h2>
          {base.loading && <Skeleton rows={2} />}
          {base.error && <ErrorBox message={base.error} onRetry={base.reload} />}
          {DEMO && <p className="text-sm text-text-muted">Демо режимде сабақ тізімі жоқ.</p>}
          {base.data && !DEMO && <StartLesson key={base.data.lessons[0]?.id || 'none'} lessons={base.data.lessons} classes={base.data.classes} />}
        </Card>

        <Card className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold">Тексеруді күтетін жұмыстар</h2>
            {sum.data && <span className="text-sm text-text-muted">{pendingTotal}</span>}
          </div>
          {sum.loading && <Skeleton rows={2} />}
          {sum.error && <ErrorBox message={sum.error} onRetry={sum.reload} />}
          {sum.data && sum.data.pending.length === 0 && <p className="text-sm text-text-secondary">Тексеруді күтетін жұмыс жоқ.</p>}
          {sum.data && sum.data.pending.length > 0 && (
            <ul className="space-y-1">
              {sum.data.pending.slice(0, 5).map(p => (
                <li key={p.assignment_id}><a href={'#review/' + p.assignment_id} className="flex items-center justify-between gap-2 min-h-[44px] text-accent hover:underline">
                  <span className="break-words min-w-0">{p.title} · {p.class_name}</span><b className="shrink-0">{p.count}</b>
                </a></li>
              ))}
            </ul>
          )}
          <a href="#tasks/queue" className="inline-flex items-center min-h-[44px] text-sm font-semibold text-accent hover:underline">Тексеру кезегі →</a>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">Ескертулер</h2>
          {sum.loading && <Skeleton rows={1} />}
          {sum.data && sum.data.openFlags === 0 && <p className="text-sm text-text-secondary">Көшіру белгісі бар жұмыс жоқ.</p>}
          {sum.data && sum.data.openFlags > 0 && <p className="text-sm">⚑ Көшіру белгісі бар жұмыс: <b>{sum.data.openFlags}</b> — <a className="text-accent underline" href="#tasks/queue">тексеру</a></p>}
          <p className="text-sm text-text-muted">Focus және қатысу ескертулері жақында осында шығады.</p>
        </Card>

        <SoonCard title="Бүгінгі кесте" items={['Бүгінгі сабақтар', 'Келесі сабақты бір басумен бастау']} />
        <SoonCard title="Жылдық жоспар бойынша прогресс" items={['Өтілген және қалған тақырыптар']} />
      </div>
    </main>
  );
}
