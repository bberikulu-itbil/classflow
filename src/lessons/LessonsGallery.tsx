import React from 'react';
import { Pencil } from 'lucide-react';
import { Card as Box, EmptyState, ErrorBox, LinkButton, Skeleton, useLoad } from '../ui';
import { fmtDate } from '../hw/format';
import { loadLessonData } from './data';
import { ClassChips, QuarterChips, useFilters } from './Filters';
import { bySubject, cards } from './model';
import type { Card, Cls } from './model';

/** A lecture is plain content: no cover (covers belong to modules). */
function LessonCard({ c, classes }: { c: Card; classes: Cls[] }) {
  const { lesson: l } = c;
  const name = (id: string) => classes.find(x => x.id === id)?.name || 'Сыныпсыз';
  return (
    <li className="relative flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 pr-14 focus-within:ring-2 focus-within:ring-accent hover:border-border-input">
      <h4 className="font-semibold break-words"><a href={'#lesson/' + l.id} className="after:absolute after:inset-0 focus:outline-none">{l.title}</a></h4>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-text-secondary">{c.taught.length ? `${c.taught.length} сабақ` : c.everTaught ? 'Бұл кезеңде жоқ' : 'Жаңа'}</span>
        {c.byClass.map(x => <span key={x.id} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-on-accent-soft">{name(x.id)} · {x.n}</span>)}
        {!c.everTaught && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-secondary">Әлі өтілмеген</span>}
      </div>
      <p className="mt-auto text-sm text-text-muted">{c.last ? `Соңғысы: ${fmtDate(c.last)}` : l.class_id ? `Сыныбы: ${name(l.class_id)}` : ' '}</p>
      <a href={'#edit/' + l.id} aria-label={`${l.title}: өңдеу`} className="absolute right-1 top-1 z-10 grid h-11 w-11 place-items-center rounded-full text-text-secondary hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent"><Pencil size={16} aria-hidden="true" /></a>
    </li>
  );
}

export function LessonsGallery({ me }: { me: { id: string } }) {
  const { data, error, loading, reload } = useLoad(() => loadLessonData(me.id), [me.id]);
  const [f, set] = useFilters();
  const shown = data ? cards(data.lessons, data.sessions, f) : [];
  const groups = bySubject(shown);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Менің сабақтарым</h2>
        <LinkButton href="#edit/new" variant="primary">+ Жаңа сабақ</LinkButton>
      </div>
      <Box className="space-y-3">
        <QuarterChips f={f} set={set} />
        {data && <ClassChips f={f} set={set} classes={data.classes} />}
      </Box>
      {loading && !data && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.lessons.length === 0 && <EmptyState text="Әзірге сабақ жоқ. «+ Жаңа сабақ» басып бастаңыз." />}
      {data && data.lessons.length > 0 && shown.length === 0 && <EmptyState text="Таңдалған сынып пен тоқсанда сабақ жоқ. «Барлығы» таңдап көріңіз." />}
      {groups.map(g => (
        <section key={g.subject} aria-label={g.subject} className="space-y-2">
          <h3 className="font-semibold text-text-secondary">{g.subject} · {g.cards.length}</h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{g.cards.map(c => <LessonCard key={c.lesson.id} c={c} classes={data!.classes} />)}</ul>
        </section>
      ))}
    </div>
  );
}
