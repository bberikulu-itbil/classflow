import React from 'react';
import { CircleCheck, Flag } from 'lucide-react';
import { api } from '../hw/types';
import { Card, EmptyState, ErrorBox, LinkButton, Skeleton, useLoad } from '../ui';

export function ReviewQueue() {
  const { data, error, loading, reload } = useLoad(() => api().teacherSummary(), []);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Тексеру кезегі</h2>
      {loading && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.pending.length === 0 && <EmptyState icon={<CircleCheck size={32} />} text="Тексеруді күтетін жұмыс жоқ." />}
      {data && data.pending.map(p => (
        <Card key={p.assignment_id} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[10rem]">
            <div className="font-semibold break-words">{p.title}</div>
            <div className="text-sm text-text-muted">{p.class_name} · {p.count} жұмыс күтіп тұр</div>
          </div>
          <LinkButton href={'#review/' + p.assignment_id} variant="primary">Тексеру</LinkButton>
        </Card>
      ))}
      {data && data.openFlags > 0 && <p className="text-sm text-text-secondary"><Flag size={14} aria-hidden="true" className="inline -mt-0.5 mr-1" />Көшіру белгісі бар жұмыс: {data.openFlags}. Белгілер әр тапсырманың ішінде көрінеді.</p>}
      <p className="text-sm text-text-muted">Рубрика (бағалау критерийлері кестесі) және өзара бағалау кейін қосылады.</p>
    </div>
  );
}
