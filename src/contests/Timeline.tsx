import React from 'react';
import * as st from './store';
import type { Contest, Data } from './store';
import { ICONS, dmy, iconKey, range, span } from './ui';

// shortcut: school quarters hard-coded for 2026–27 (Оқу-ағарту министрлігінің мерзімдері; quarter ends are computed from the week counts), add the next year when it is published.
const Q: { name: string; from: string; to: string; teachEnd: string }[] = [
  { name: 'I тоқсан', from: '2026-09-01', to: '2026-11-01', teachEnd: '2026-10-23' },
  { name: 'II тоқсан', from: '2026-11-02', to: '2027-01-10', teachEnd: '2026-12-25' },
  { name: 'III тоқсан', from: '2027-01-11', to: '2027-03-28', teachEnd: '2027-03-19' },
  { name: 'IV тоқсан', from: '2027-03-29', to: '2027-05-25', teachEnd: '2027-05-25' },
  { name: 'Жазғы демалыс', from: '2027-05-26', to: '2027-08-31', teachEnd: '2027-05-25' },
];
const day = (iso: string) => Date.parse(iso + 'T00:00:00Z') / 86400000;
const MONTH_SHORT = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'];

function Row({ c, d, from, to, teachEnd, today, onOpen }: { c: Contest; d: Data; from: string; to: string; teachEnd: string; today: string; onOpen: (id: string) => void }) {
  const stages = d.stages.filter(s => s.contest_id === c.id);
  const sp = span(c, stages), a = day(from), len = day(to) - a + 1;
  const pc = (iso: string) => ((day(iso) - a) / len) * 100;
  const s0 = sp.from as string, s1 = (sp.to as string);
  const left = Math.max(0, pc(s0 < from ? from : s0)), right = Math.min(100, pc(s1 > to ? to : s1) + 100 / len);
  const hue = ICONS[iconKey(c)].hue, { Icon } = ICONS[iconKey(c)];
  const dots = stages.filter(s => s.on_date && s.on_date >= from && s.on_date <= to);
  return (
    <li className="grid items-center gap-1 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-3">
      <button type="button" onClick={() => onOpen(c.id)} className="flex min-h-[44px] min-w-0 cursor-pointer items-center gap-2 rounded-md px-1 text-left hover:bg-surface-2" aria-label={`Ашу: ${c.title}. ${range(c)}`}>
        <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `hsl(${hue} 80% 92%)`, color: `hsl(${hue} 60% 28%)` }}><Icon size={16} /></span>
        <span className="min-w-0"><span className="block truncate text-sm font-medium">{c.title}</span><span className="block truncate text-xs text-text-secondary">{range(c)}</span></span>
      </button>
      <div aria-hidden="true" className="relative h-6 overflow-hidden rounded-md bg-surface-2">
        {teachEnd < to && <div className="absolute inset-y-0 right-0" style={{ left: `${pc(teachEnd) + 100 / len}%`, background: 'var(--color-border)', opacity: 0.6 }} />}
        {today >= from && today <= to && <div className="absolute inset-y-0 z-10 w-0.5 bg-danger" style={{ left: `${pc(today)}%` }} />}
        <div className="absolute inset-y-1 rounded" style={{ left: `${left}%`, width: `max(${right - left}%, 8px)`, background: `hsl(${hue} 65% 40%)` }} />
        {dots.map((s, i) => <span key={i} className="absolute top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-surface" style={{ left: `${pc(s.on_date as string)}%`, borderColor: `hsl(${hue} 65% 40%)` }} />)}
      </div>
    </li>
  );
}

/** Contests on the school year: one block per quarter, bars on a day scale; breaks shaded, today marked, stage dates as dots. */
export function Timeline({ items, d, onOpen }: { items: Contest[]; d: Data; onOpen: (id: string) => void }) {
  const today = st.todayIso();
  const dated = items.map(c => ({ c, sp: span(c, d.stages.filter(s => s.contest_id === c.id)) }));
  const inside = (x: { sp: ReturnType<typeof span> }, from: string, to: string) => !!x.sp.from && (x.sp.from as string) <= to && (x.sp.to as string) >= from;
  const secs = Q.map(q => ({ q, rows: dated.filter(x => inside(x, q.from, q.to)) })).filter(s => s.rows.length);
  const other = dated.filter(x => !Q.some(q => inside(x, q.from, q.to)));
  return (
    <div className="space-y-5">
      {secs.map(({ q, rows }) => {
        const months: { iso: string; label: string }[] = [];
        for (let t = new Date(q.from + 'T00:00:00Z'); t.toISOString().slice(0, 10) <= q.to; t = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1))) {
          const iso = t.toISOString().slice(0, 10); months.push({ iso: iso < q.from ? q.from : iso, label: MONTH_SHORT[t.getUTCMonth()] });
        }
        const len = day(q.to) - day(q.from) + 1;
        return (
          <section key={q.name} aria-label={q.name} className="space-y-1">
            <h2 className="text-base font-semibold">{q.name} <span className="text-sm font-normal text-text-secondary">{q.name === 'Жазғы демалыс' ? '26 мамыр – 31 тамыз' : `${dmy(q.from)} – ${dmy(q.teachEnd)}`}</span></h2>
            <div aria-hidden="true" className="grid sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-3">
              <span />
              <div className="relative h-5 text-xs text-text-secondary">{months.map(m => <span key={m.iso} className="absolute" style={{ left: `${((day(m.iso) - day(q.from)) / len) * 100}%` }}>{m.label}</span>)}</div>
            </div>
            <ol className="space-y-1">{rows.map(x => <Row key={x.c.id} c={x.c} d={d} from={q.from} to={q.to} teachEnd={q.teachEnd} today={today} onOpen={onOpen} />)}</ol>
          </section>
        );
      })}
      {other.length > 0 && (
        <p className="text-sm text-text-secondary"><span className="font-medium text-text">Күні белгісіз немесе оқу жылынан тыс:</span>{' '}
          {other.map((x, i) => <React.Fragment key={x.c.id}>{i > 0 && ', '}<button type="button" onClick={() => onOpen(x.c.id)} className="cursor-pointer text-on-accent-soft underline">{x.c.title}</button></React.Fragment>)}</p>
      )}
      <p className="text-xs text-text-secondary">Тоқсан күндері — Оқу-ағарту министрлігінің 2026–2027 оқу жылы мерзімдері бойынша (тоқсан соңы апта санынан есептелген). Қызыл сызық — бүгін, штрихталған бөлік — демалыс, нүкте — кезең күні.</p>
    </div>
  );
}
