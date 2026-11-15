import React from 'react';
import * as st from './store';
import type { Occ } from './ui';
import { ICONS, dmy, iconKey, occRange } from './ui';

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

function Row({ rows, from, to, teachEnd, today, onOpen }: { rows: Occ[]; from: string; to: string; teachEnd: string; today: string; onOpen: (id: string) => void }) {
  const c = rows[0].c, a = day(from), len = day(to) - a + 1;
  const pc = (iso: string) => ((day(iso) - a) / len) * 100;
  const hue = ICONS[iconKey(c)].hue, { Icon } = ICONS[iconKey(c)], col = `hsl(${hue} 65% 40%)`;
  const marks = rows.filter(o => o.label && o.from).sort((x, y) => (x.from as string).localeCompare(y.from as string));
  const bars = rows.filter(o => !o.label);
  const sub = marks.length ? marks.map(o => `${o.label} ${dmy(o.from as string)}`).join(' · ') : occRange(rows[0]);
  let lastLabel = -100;
  return (
    <li className="grid items-center gap-1 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-3">
      <button type="button" onClick={() => onOpen(c.id)} className="flex min-h-[44px] min-w-0 cursor-pointer items-center gap-2 rounded-md px-1 text-left hover:bg-surface-2" aria-label={`Ашу: ${c.title}. ${sub}`}>
        <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `hsl(${hue} 80% 92%)`, color: `hsl(${hue} 60% 28%)` }}><Icon size={16} /></span>
        <span className="min-w-0"><span className="block truncate text-sm font-medium">{c.title}</span><span className="block truncate text-xs text-text-secondary" title={sub}>{sub}</span></span>
      </button>
      <div aria-hidden="true" className="relative h-8 overflow-hidden rounded-md bg-surface-2">
        {teachEnd < to && <div className="absolute inset-y-0 right-0" style={{ left: `${pc(teachEnd) + 100 / len}%`, background: 'var(--color-border)', opacity: 0.6 }} />}
        {today >= from && today <= to && <div className="absolute inset-y-0 z-10 w-0.5 bg-danger" style={{ left: `${pc(today)}%` }} />}
        {bars.map(o => {
          const f = (o.from as string) < from ? from : (o.from as string), t = (o.to as string) > to ? to : (o.to as string);
          const left = Math.max(0, pc(f)), right = Math.min(100, pc(t) + 100 / len);
          return <div key={o.key} className="absolute inset-y-1.5 rounded" style={{ left: `${left}%`, width: `max(${right - left}%, 8px)`, background: col }} />;
        })}
        {marks.map((o, k) => {
          const x = pc(o.from as string), nx = k + 1 < marks.length ? pc(marks[k + 1].from as string) : 101, flip = x > 72 || (nx - x < 15 && x > 15), show = Math.abs(x - lastLabel) >= 15; if (show) lastLabel = x;
          return (
            <div key={o.key} className={`absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-1 ${flip ? 'flex-row-reverse' : ''}`} style={flip ? { right: `calc(${100 - x}% - 6px)` } : { left: `calc(${x}% - 6px)` }}>
              <span className="h-3 w-3 shrink-0 rounded-full border-2 bg-surface" style={{ borderColor: col, background: o.past ? col : undefined }} />
              {show && <span className="whitespace-nowrap rounded px-1 text-xs font-semibold" style={{ color: `hsl(${hue} 60% 26%)`, background: `hsl(${hue} 80% 94%)` }}>{o.label}</span>}
            </div>
          );
        })}
      </div>
    </li>
  );
}

/** Contests on the school year: one block per quarter; a contest with stages is one row per quarter with a labelled mark for each stage that falls in it. */
export function Timeline({ occs, onOpen }: { occs: Occ[]; onOpen: (id: string) => void }) {
  const today = st.todayIso();
  const inside = (o: Occ, from: string, to: string) => !!o.from && o.from <= to && (o.to as string) >= from;
  const secs = Q.map(q => {
    const rows = new Map<string, Occ[]>();
    for (const o of occs) if (inside(o, q.from, q.to)) rows.set(o.c.id, [...(rows.get(o.c.id) ?? []), o]);
    return { q, rows: [...rows.values()] };
  }).filter(x => x.rows.length);
  const other = occs.filter(o => !Q.some(q => inside(o, q.from, q.to)));
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
            <ol className="space-y-1">{rows.map(r => <Row key={r[0].c.id} rows={r} from={q.from} to={q.to} teachEnd={q.teachEnd} today={today} onOpen={onOpen} />)}</ol>
          </section>
        );
      })}
      {other.length > 0 && (
        <p className="text-sm text-text-secondary"><span className="font-medium text-text">Күні белгісіз немесе оқу жылынан тыс:</span>{' '}
          {other.map((o, i) => <React.Fragment key={o.key}>{i > 0 && ', '}<button type="button" onClick={() => onOpen(o.c.id)} className="cursor-pointer text-on-accent-soft underline">{o.c.title}{o.label ? ` (${o.label})` : ''}</button></React.Fragment>)}</p>
      )}
      <p className="text-xs text-text-secondary">Тоқсан күндері — Оқу-ағарту министрлігінің 2026–2027 оқу жылы мерзімдері бойынша (тоқсан соңы апта санынан есептелген). Қызыл сызық — бүгін, боз бөлік — демалыс, белгі — кезең күні (толтырылған — өткен кезең).</p>
    </div>
  );
}
