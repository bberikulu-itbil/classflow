import React, { useEffect, useState } from 'react';
import { api } from './types';
import type { ReviewRow } from './types';
import { Button, Card, EmptyState, ErrorBox, LinkButton, Skeleton, StatusChip, inputCls, useLoad } from '../ui';

function Detail({ row, onDone }: { row: ReviewRow; onDone: () => void }) {
  const w = useLoad(() => (row.work_id ? api().getWork(row.work_id) : Promise.resolve(null)), [row.work_id, row.status]);
  const [pts, setPts] = useState('');
  const [fb, setFb] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (w.data) { setPts(String(w.data.points ?? '')); setFb(w.data.feedback || ''); } }, [w.data]);
  if (!row.work_id) return <Card><p className="text-text-secondary">{row.full_name} әлі бастаған жоқ.</p></Card>;
  const act = async (status: 'finalized' | 'needs_work') => {
    const n = Number(pts);
    if (status === 'finalized' && (pts === '' || !Number.isFinite(n) || n < 0)) return setErr('Ұпайды сан түрінде жаз');
    setBusy(true); setErr('');
    try { await api().grade(row.work_id!, n || 0, status, fb); onDone(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Card className="space-y-3">
      <h3 className="font-semibold break-words">{row.full_name}</h3>
      {w.loading && <Skeleton rows={2} />}
      {w.error && <ErrorBox message={w.error} onRetry={w.reload} />}
      {w.data && <>
        <div className="flex flex-wrap gap-2 text-sm text-text-secondary">
          {row.tests_total ? <span>Автотест: {row.tests_passed}/{row.tests_total} (оқушының браузері есептеді)</span> : <span>Автотест жоқ</span>}
          <span>· өзгерту тарихы: {w.data.snapshots}</span>
          {row.open_flags > 0 && <StatusChip status="flag" />}
        </div>
        {row.open_flags > 0 && <p className="text-sm text-warning bg-warning-soft rounded-md p-2">Код көбінесе қойылған (paste). Бұл айыптау емес, тек қарап шығуға ескерту.</p>}
        <pre tabIndex={0} aria-label="Оқушы коды" className="p-3 rounded-md bg-code-bg text-code-text font-mono text-sm leading-6 overflow-auto max-h-80 whitespace-pre">{w.data.answer || '(бос)'}</pre>
        <div className="grid sm:grid-cols-[8rem_1fr] gap-3">
          <label className="space-y-1"><span className="block text-sm font-medium text-text-secondary">Ұпай</span><input className={inputCls} inputMode="numeric" value={pts} onChange={e => setPts(e.target.value)} /></label>
          <label className="space-y-1"><span className="block text-sm font-medium text-text-secondary">Пікір</span><input className={inputCls} value={fb} maxLength={4000} onChange={e => setFb(e.target.value)} /></label>
        </div>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="success" loading={busy} onClick={() => act('finalized')}>Бағалау</Button>
          <Button variant="secondary" disabled={busy} onClick={() => act('needs_work')}>Қайта жасауға қайтару</Button>
        </div>
      </>}
    </Card>
  );
}

export function ReviewView({ id }: { id: string }) {
  const { data, error, loading, reload } = useLoad(() => api().review(id), [id]);
  const [sel, setSel] = useState<string | null>(null);
  const cur = data?.find(r => r.student_id === sel) || null;
  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap"><LinkButton href="#assign" variant="ghost">← Тапсырмалар</LinkButton><h1 className="text-2xl font-bold">Жұмыстарды қарау</h1></div>
      {loading && !data && <Skeleton rows={4} />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data?.length === 0 && <EmptyState text="Бұл сыныпта оқушы жоқ." />}
      {data && data.length > 0 && (
        <div className="grid lg:grid-cols-[minmax(0,3fr)_minmax(0,4fr)] gap-4 items-start">
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <caption className="sr-only">Оқушылар мен жұмыстар</caption>
              <thead><tr className="text-left text-text-muted"><th scope="col" className="p-2 font-medium">Оқушы</th><th scope="col" className="p-2 font-medium">Күй</th><th scope="col" className="p-2 font-medium">Тест</th><th scope="col" className="p-2 font-medium">Ұпай</th></tr></thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.student_id} className={`border-t border-border ${sel === r.student_id ? 'bg-surface-2' : ''}`}>
                    <th scope="row" className="p-2 text-left font-normal"><button className="text-left min-h-[44px] cursor-pointer text-accent underline break-words" onClick={() => setSel(r.student_id)}>{r.full_name}</button></th>
                    <td className="p-2"><span className="flex flex-wrap gap-1"><StatusChip status={r.status} />{r.late && <StatusChip status="late" />}{r.open_flags > 0 && <StatusChip status="flag" />}</span></td>
                    <td className="p-2">{r.tests_total ? `${r.tests_passed}/${r.tests_total}` : '—'}</td>
                    <td className="p-2">{r.points ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cur ? <Detail row={cur} onDone={reload} /> : <Card className="text-text-muted">Оқушыны таңда, кодын көресің.</Card>}
        </div>
      )}
    </main>
  );
}
