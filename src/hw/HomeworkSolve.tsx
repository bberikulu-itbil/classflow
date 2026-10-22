import React, { useEffect, useRef, useState } from 'react';
import { api } from './types';
import { Card, ErrorBox, LinkButton, Skeleton, StatusChip, useLoad } from '../ui';
import { HomeworkIDE } from './HomeworkIDE';
import { fmtDate, isPast } from './format';

export function HomeworkSolve({ id }: { id: string }) {
  const { data, error, loading, reload } = useLoad(async () => ({ act: await api().getActivity(id), work: await api().getMyWork(id) }), [id]);
  const [note, setNote] = useState('');
  const acc = useRef({ code: '', pasted: 0, typed: 0, dirty: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flush = (reason = 'autosave') => {
    clearTimeout(timer.current);
    if (!acc.current.dirty) return Promise.resolve();
    const { code, pasted, typed } = acc.current;
    acc.current = { code, pasted: 0, typed: 0, dirty: false };
    return api().save(id, code, pasted, typed, reason).catch(() => { acc.current.dirty = true; });
  };
  // shortcut: autosave every 15 s after the last edit; closing the tab inside that window can lose up to 15 s of typing
  const onEdit = (code: string, pasted: number, typed: number) => {
    acc.current = { code, pasted: acc.current.pasted + pasted, typed: acc.current.typed + typed, dirty: true };
    clearTimeout(timer.current); timer.current = setTimeout(() => flush(), 15000);
  };
  useEffect(() => () => { flush(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return <main className="max-w-6xl mx-auto p-4"><Skeleton rows={4} /></main>;
  if (error || !data) return <main className="max-w-3xl mx-auto p-4"><ErrorBox message={error || 'Қате'} onRetry={reload} /></main>;
  const { act, work } = data;
  const finalized = work?.status === 'finalized';
  const closed = act.locked || finalized;
  const overdue = isPast(act.due_at) && !work;

  const submit = async (code: string, passed: number | null, total: number | null) => {
    await flush('submit');
    await api().submit(id, code, passed, total);
    setNote(total ? `Тапсырылды: ${passed}/${total} тест өтті. Ұпай уақытша, мұғалім растайды.` : 'Тапсырылды. Мұғалім қолмен бағалайды.');
    reload();
  };

  return (
    <main className="max-w-6xl mx-auto p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <LinkButton href="#hw" variant="ghost">← Тізімге</LinkButton>
          <span className="text-sm text-text-muted">Мерзімі: {fmtDate(act.due_at)}</span>
        </div>
        <div className="flex gap-1.5">{overdue && <StatusChip status="late" />}<StatusChip status={work?.status || 'not_started'} /></div>
      </div>
      {note && <div role="status" className="rounded-lg bg-success-soft text-success p-3 font-medium">{note}</div>}
      {work?.status === 'needs_work' && <div role="status" className="rounded-lg bg-danger-soft text-danger p-3">Мұғалім қайта жасауға қайтарды. {work.feedback || ''}</div>}
      {finalized && <Card><div className="font-semibold">Бағаланды: {work!.points}/{act.points}</div>{work!.feedback && <p className="text-text-secondary break-words mt-1">💬 {work!.feedback}</p>}</Card>}
      {act.locked && !finalized && <div role="status" className="rounded-lg bg-warning-soft text-warning p-3">Тапсырма жабық, енді жіберуге болмайды.</div>}
      <HomeworkIDE activity={act} initial={work?.answer || act.content.starter || ''} readOnly={closed} canSubmit={!closed} onEdit={onEdit} onSubmit={submit} />
    </main>
  );
}
