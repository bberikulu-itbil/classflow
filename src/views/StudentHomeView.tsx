import React, { useState } from 'react';
import { sb, DEMO } from '../config';
import { api } from '../hw/types';
import { Card, ErrorBox, Skeleton, SoonCard, StatusChip, useLoad } from '../ui';
import { fmtDate } from '../hw/format';

export function StudentHomeView({ me }: { me: { full_name: string } }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const live = useLoad(async () => {
    if (DEMO) return [] as any[];
    const r = await sb.rpc('cf_live_for_me');
    return (r.data || []) as any[];
  }, []);
  const hwList = useLoad(() => api().listMyAssignments(), []);
  const soon = (hwList.data || []).filter(a => ['not_started', 'draft', 'needs_work'].includes(a.status))
    .sort((a, b) => (a.due_at || '9').localeCompare(b.due_at || '9')).slice(0, 4);

  const join = async (args: any) => {
    setErr('');
    const { data, error } = await sb.rpc('cf_join', args);
    if (error) return setErr(error.message || 'Қосылу мүмкін болмады');
    window.location.hash = 's/' + data.id;
  };

  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Сәлем, {(me.full_name || '').split(' ')[0]}!</h1>

      <section aria-label="Сабаққа қосылу" className="rounded-lg bg-accent text-on-accent p-5 space-y-3">
        <h2 className="font-semibold">Сабаққа қосылу</h2>
        {live.data && live.data.length > 0 && (
          <div className="space-y-2">
            {live.data.map((r: any, i: number) => (
              <button key={i} type="button" className="w-full text-left rounded-md bg-surface text-text p-3 cursor-pointer hover:bg-surface-2" onClick={() => join({ p_session: r.id })}>
                <div className="text-xs font-semibold text-success">● Сабақ жүріп жатыр{r.class_name ? ' · ' + r.class_name : ''}</div>
                <div className="font-bold">{r.title}</div>
                <div className="text-xs text-text-muted">{r.teacher_name}</div>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex flex-col gap-1 text-sm">Сабақ коды
            <input className="min-h-[52px] w-44 rounded-md px-3 font-mono text-xl bg-surface text-text uppercase" placeholder="000 000" maxLength={9} value={code} onChange={e => setCode(e.target.value)} />
          </label>
          <button type="button" className="min-h-[52px] px-5 rounded-md bg-surface text-accent font-bold cursor-pointer hover:bg-surface-2" onClick={() => join({ p_code: code.replace(/\s/g, '').toUpperCase() })}>Қосылу</button>
        </div>
        {err && <p role="alert" className="rounded-md bg-surface text-danger text-sm p-2">{err}</p>}
        <p className="text-sm">Немесе тақтадағы QR-кодты телефон камерасымен сканерле.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">Мерзімі жақын тапсырмалар</h2>
          {hwList.loading && <Skeleton rows={2} />}
          {hwList.error && <ErrorBox message={hwList.error} onRetry={hwList.reload} />}
          {hwList.data && soon.length === 0 && <p className="text-sm text-text-secondary">Орындайтын тапсырма жоқ.</p>}
          {soon.length > 0 && (
            <ul className="space-y-1">
              {soon.map(a => (
                <li key={a.assignment_id}><a href={'#hw/' + a.assignment_id} className="flex flex-wrap items-center justify-between gap-2 min-h-[44px] hover:underline">
                  <span className="break-words min-w-0 font-medium">{a.title}</span>
                  <span className="flex items-center gap-2 text-sm text-text-muted">{fmtDate(a.due_at)} <StatusChip status={a.status} /></span>
                </a></li>
              ))}
            </ul>
          )}
          <a href="#hw" className="inline-flex items-center min-h-[44px] text-sm font-semibold text-accent hover:underline">Барлық тапсырмалар →</a>
        </Card>
        <SoonCard title="Бүгінгі кесте" items={['Бүгінгі сабақтар']} />
        <SoonCard title="Тоқсан жолы" items={['Тоқсан бойынша прогресс']} />
        <SoonCard title="Рейтингтегі орным" items={['Сынып пен лицей бойынша орын']} />
      </div>
    </main>
  );
}
