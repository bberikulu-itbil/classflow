import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button, Card, EmptyState, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { ClassChips, QuarterChips, useFilters } from '../lessons/Filters';
import { currentQuarter, schoolYear } from '../lessons/model';
import { loadClasses } from '../journal/store';
import { loadCurr } from '../curriculum/store';
import type { Curr } from '../curriculum/store';
import { DAY, defaultRange, dm, mondayOf, rangeError, weekdayOf } from './plan';
import * as st from './store';
import type { Me, Slot } from './store';

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Lecture picker: grouped as course › module, lectures not in any module last. */
function LessonSelect({ curr, value, label, onChange }: { curr: Curr; value: string; label: string; onChange: (id: string) => void }) {
  const placed = new Set(curr.places.map(p => p.lesson_id));
  const title = (id: string) => curr.lessons.find(l => l.id === id)?.title;
  const groups = curr.modules.map(m => ({
    label: `${curr.courses.find(c => c.id === m.course_id)?.title || ''} › ${m.title}`,
    items: curr.places.filter(p => p.module_id === m.id && title(p.lesson_id)).map(p => ({ id: p.lesson_id, t: title(p.lesson_id)! })),
  })).filter(g => g.items.length);
  const loose = curr.lessons.filter(l => !placed.has(l.id));
  return (
    <select aria-label={label} className={inputCls + ' !min-h-[40px] min-w-[12rem]'} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">— дәріс қойылмаған —</option>
      {groups.map(g => <optgroup key={g.label} label={g.label}>{g.items.map(i => <option key={i.id} value={i.id}>{i.t}</option>)}</optgroup>)}
      {loose.length > 0 && <optgroup label="Модульсіз дәрістер">{loose.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</optgroup>}
    </select>
  );
}

export function ScheduleView({ me }: { me: Me }) {
  const classes = useLoad(loadClasses, []);
  const [f, set] = useFilters();
  const q = f.q || currentQuarter(), year = schoolYear(new Date());
  const cls = f.cls || classes.data?.[0]?.id || '';
  const sched = useLoad(() => st.loadSched(me, year, q), [q, me.id]);
  const curr = useLoad(() => loadCurr(me), [me.id]);
  const [msg, setMsg] = useState(''), [note, setNote] = useState('');
  const act = async (fn: () => Promise<unknown>) => { setMsg(''); setNote(''); try { await fn(); sched.reload(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); } };

  const [eCls, setECls] = useState(''), [eDay, setEDay] = useState('1'), [ePer, setEPer] = useState('1');
  const [def0, def1] = defaultRange(year, q);
  const [range, setRange] = useState<{ q: number; from: string; to: string }>({ q, from: def0, to: def1 });
  const r = range.q === q ? range : { q, from: def0, to: def1 };
  const rErr = rangeError(r.from, r.to);

  const name = (id: string) => classes.data?.find(c => c.id === id)?.name || '?';
  const entries = sched.data?.entries || [];
  const mine = entries.filter(e => e.class_id === cls);
  const slots = (sched.data?.slots || []).filter(s => s.class_id === cls);
  const filled = slots.filter(s => s.lesson_id).length;
  const weeks = new Map<string, Slot[]>();
  for (const s of slots) weeks.set(mondayOf(s.held_on), [...(weeks.get(mondayOf(s.held_on)) || []), s]);
  const today = todayIso();

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">КТП: күнтізбелік-тақырыптық жоспар</h1>
      <p className="text-text-secondary">Кесте — «қашан және кімге». Дәрістер (мазмұн) «Модульдер мен дәрістер» бөлімінде тұрады; бұл жерде оларды сыныптың нақты күніне қоясыз.</p>
      {classes.error && <ErrorBox message={classes.error} onRetry={classes.reload} />}
      {sched.data?.local && <p role="note" className="rounded-lg bg-surface-2 p-3 text-sm text-text-secondary">Кесте тек осы браузерде сақталады: дерекқорда кестелер әлі жоқ (009_schedule.sql іске қосылмаған).</p>}
      <p role="status" aria-live="polite" className={msg || note ? `rounded-lg p-3 text-sm ${msg ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}` : 'sr-only'}>{msg || note}</p>

      <Card className="space-y-3">
        <h2 className="font-semibold">Апталық кесте</h2>
        {entries.length === 0 ? <p className="text-sm text-text-muted">Әзірге сабақ қосылмаған.</p> : (
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6, 7].filter(d => entries.some(e => e.weekday === d)).map(d => (
              <li key={d} className="flex flex-wrap items-center gap-1 text-sm">
                <span className="w-8 font-semibold">{DAY[d - 1]}</span>
                {entries.filter(e => e.weekday === d).sort((a, b) => a.period - b.period).map(e => (
                  <span key={e.id} className="inline-flex items-center rounded-full bg-surface-2 pl-3 text-text">
                    {e.period}-сабақ · {name(e.class_id)}
                    <button type="button" aria-label={`${DAY[d - 1]} ${e.period}-сабақ ${name(e.class_id)}: өшіру`} onClick={() => act(() => st.delEntry(me, e.id))} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-border"><X size={14} aria-hidden="true" /></button>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
        {classes.data && (
          <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); act(() => st.addEntry(me, { class_id: eCls || cls, weekday: +eDay, period: +ePer })); }}>
            <Field label="Сынып">{id => <select id={id} className={inputCls} value={eCls || cls} onChange={e => setECls(e.target.value)}>{classes.data!.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}</Field>
            <Field label="Күн">{id => <select id={id} className={inputCls} value={eDay} onChange={e => setEDay(e.target.value)}>{DAY.slice(0, 6).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select>}</Field>
            <Field label="Сабақ нөмірі">{id => <select id={id} className={inputCls} value={ePer} onChange={e => setEPer(e.target.value)}>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>}</Field>
            <Button type="submit" variant="secondary">Кестеге қосу</Button>
          </form>
        )}
      </Card>

      <Card className="space-y-3">
        {classes.data && <ClassChips f={{ ...f, cls }} set={set} classes={classes.data} all={false} />}
        <QuarterChips f={{ ...f, q }} set={set} all={false} />
      </Card>

      {sched.error && <ErrorBox message={sched.error} onRetry={sched.reload} />}
      {sched.loading && !sched.data && <Skeleton />}
      {sched.data && cls && (
        <section aria-label="Тоқсан ұяшықтары" className="space-y-3">
          <Card className="space-y-3">
            <h2 className="font-semibold">Ұяшықтар құру: {name(cls)}, {q}-тоқсан</h2>
            <p className="text-sm text-text-secondary">Күндер шамамен қойылған (демалыстарды ескермейді): өзіңіз өзгертіңіз. Бұрыннан бар ұяшықтар өзгермейді, демалыс күнінің ұяшығын төменнен өшіресіз.</p>
            <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); if (rErr) return; act(async () => { const n = await st.makeSlots(me, cls, year, q, r.from, r.to, slots); setNote(n ? `${n} ұяшық құрылды` : 'Жаңа ұяшық жоқ: бәрі бұрыннан бар'); }); }}>
              <Field label="Бастап">{id => <input id={id} type="date" className={inputCls} value={r.from} onChange={e => setRange({ ...r, from: e.target.value })} />}</Field>
              <Field label="Дейін" error={rErr}>{id => <input id={id} type="date" className={inputCls} value={r.to} aria-invalid={!!rErr || undefined} onChange={e => setRange({ ...r, to: e.target.value })} />}</Field>
              <Button type="submit" disabled={mine.length === 0 || !!rErr}>Ұяшықтарды құру</Button>
            </form>
            {mine.length === 0 && <p className="text-sm text-text-muted">{name(cls)} сыныбы апталық кестеде жоқ: алдымен жоғарыдан қосыңыз.</p>}
          </Card>
          {slots.length === 0 ? <EmptyState text="Бұл сынып пен тоқсанда ұяшық жоқ." /> : (
            <>
              <p className="text-sm text-text-secondary">{slots.length} ұяшық · дәріс қойылғаны: {filled}</p>
              {[...weeks].map(([monday, ws], wi) => (
                <section key={monday} aria-label={`${wi + 1}-апта`} className="overflow-hidden rounded-lg border border-border">
                  <h3 className="bg-surface-2 px-3 py-1 text-sm font-semibold">{wi + 1}-апта · {dm(monday)}</h3>
                  <ul>
                    {ws.map(s => (
                      <li key={s.id} className={`flex flex-wrap items-center gap-2 border-t border-border px-3 py-1 ${s.held_on < today ? 'text-text-secondary' : ''}`}>
                        <span className="w-24 text-sm font-medium">{DAY[weekdayOf(s.held_on) - 1]} {dm(s.held_on)}</span>
                        <span className="w-20 text-sm">{s.period}-сабақ</span>
                        {curr.data
                          ? <LessonSelect curr={curr.data} value={s.lesson_id || ''} label={`${DAY[weekdayOf(s.held_on) - 1]} ${dm(s.held_on)}, ${s.period}-сабақ: дәріс`} onChange={id => act(() => st.setSlotLesson(me, s.id, id || null))} />
                          : <span className="text-sm text-text-muted">Дәрістер жүктелуде…</span>}
                        <button type="button" aria-label={`${dm(s.held_on)}, ${s.period}-сабақ: ұяшықты өшіру`} onClick={() => act(() => st.delSlot(me, s.id))} className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-md text-text-muted hover:bg-surface-2"><Trash2 size={16} aria-hidden="true" /></button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </section>
      )}
    </main>
  );
}
