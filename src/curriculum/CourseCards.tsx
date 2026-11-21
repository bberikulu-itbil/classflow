// The course list as cards: each card says what to do today — how far each class got in the current module, and
// a one-click start of the next lecture. Filters (grade, quarter, school year, mine/shared), hide progress, reorder by drag.
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Eye, EyeOff, FileText, Globe, GripVertical, Lock, Play, Users, ArrowUpDown } from 'lucide-react';
import { coverOf } from '../ui/cover';
import { DEMO } from '../config';
import { Button, useLoad } from '../ui';
import { currentQuarter, schoolYear } from '../lessons/model';
import { getPrefs } from '../prefs';
import { createSession } from '../views/session';
import type { Course, Curr, Me } from './store';
import type { Lang } from '../lessons/lang';
import { courseTitle, moduleTitle } from './display';
import * as pg from './progress';

const LS = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const put = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: keep for this visit */ } };

function Visibility({ c }: { c: Course }) {
  const [Icon, text] = !c.shared ? [Lock, 'Жабық'] : c.audience === 'grade' ? [Users, c.grade ? `${c.grade}-сынып` : 'Сынып'] : c.audience === 'classes' || c.audience === 'students' ? [Users, 'Таңдаулы'] : [Globe, 'Барлығы'];
  return <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary shadow-sm"><Icon size={13} aria-hidden="true" />{text}</span>;
}

export function CourseCards({ me, data, lang, menu }: { me: Me; data: Curr; lang: Lang; menu: (c: Course) => React.ReactNode }) {
  const yearNow = schoolYear(new Date());
  const [year, setYear] = useState(yearNow);
  const [quarter, setQuarter] = useState<number | null>(currentQuarter());
  const [grade, setGrade] = useState<number | null>(null);
  const [scope, setScope] = useState<'mine' | 'shared'>('mine');
  const [prog, setProg] = useState(LS('cf_course_prog', '1') === '1');
  const [sorting, setSorting] = useState(false);
  const okey = 'cf_course_order_' + me.id;
  const [order, setOrder] = useState<string[]>(() => { try { return JSON.parse(LS(okey, '[]')); } catch { return []; } });
  const [drag, setDrag] = useState('');
  const [busy, setBusy] = useState(''), [err, setErr] = useState('');
  const ctx = useLoad(() => pg.loadCtx(me, year), [me.id, year]);
  const c = ctx.data || pg.EMPTY;

  useEffect(() => put('cf_course_prog', prog ? '1' : '0'), [prog]);
  const sorted = useMemo(() => {
    const at = (id: string) => { const i = order.indexOf(id); return i < 0 ? 1e6 : i; };
    return data.courses.map((x, i) => ({ x, i })).sort((a, b) => at(a.x.id) - at(b.x.id) || a.i - b.i).map(a => a.x);
  }, [data.courses, order]);
  const grades = [...new Set(data.courses.map(x => x.grade).filter((g): g is number => !!g))].sort((a, b) => a - b);
  const shown = sorted.filter(x => (grade === null || x.grade === grade) && (scope === 'mine' || x.shared));
  const move = (id: string, to: number) => {
    const ids = sorted.map(x => x.id).filter(x => x !== id);
    ids.splice(Math.max(0, Math.min(ids.length, to)), 0, id);
    setOrder(ids); put(okey, JSON.stringify(ids));
  };
  const start = async (lesson: string, cls: string) => {
    if (DEMO) { setErr('Демо режимде сабақ басталмайды'); return; }
    setBusy(lesson + cls); setErr('');
    try { window.location.hash = 'remote/' + (await createSession(lesson, cls, getPrefs().groups)); } catch (x) { setErr((x as Error).message); setBusy(''); }
  };
  const chip = (on: boolean) => `min-h-[36px] rounded-full px-3.5 text-sm font-semibold ${on ? 'bg-accent text-on-accent' : 'border border-border bg-surface-2 text-text hover:bg-surface'}`;
  const seg = (on: boolean) => `min-h-[34px] rounded-lg px-3.5 text-sm font-semibold ${on ? 'bg-surface text-text shadow-sm' : 'text-text-secondary'}`;
  const sel = 'min-h-[36px] rounded-lg border border-border-input bg-surface px-2.5 text-sm';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-2.5">
        <span className="px-1 text-xs font-semibold text-text-muted">Сынып</span>
        <button type="button" aria-pressed={grade === null} className={chip(grade === null)} onClick={() => setGrade(null)}>Барлығы</button>
        {grades.map(g => <button key={g} type="button" aria-pressed={grade === g} className={chip(grade === g)} onClick={() => setGrade(g)}>{g}</button>)}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
        <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">Тоқсан
          <select className={sel} value={quarter ?? ''} onChange={e => setQuarter(e.target.value ? +e.target.value : null)}>
            <option value="">Барлығы</option>{[1, 2, 3, 4].map(q => <option key={q} value={q}>{q}-тоқсан</option>)}
          </select></label>
        <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">Оқу жылы
          <select className={sel} value={year} onChange={e => setYear(+e.target.value)}>
            {[yearNow, yearNow - 1, yearNow - 2].map(y => <option key={y} value={y}>{y}–{y + 1}</option>)}
          </select></label>
        <span className="flex-1" />
        <div role="group" aria-label="Қай курстар" className="flex rounded-xl bg-surface-2 p-0.5">
          <button type="button" aria-pressed={scope === 'mine'} className={seg(scope === 'mine')} onClick={() => setScope('mine')}>Менің курстарым</button>
          <button type="button" aria-pressed={scope === 'shared'} className={seg(scope === 'shared')} onClick={() => setScope('shared')} title="Оқушыларға ашылған курстар">Ортақ</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm text-text-muted">{sorting ? 'Карточканы сүйреп апарыңыз немесе тұтқаны таңдап ← → басыңыз.' : 'Карточканың кез келген жерін басып курсқа кіресіз.'}</p>
        <Button variant="secondary" className="!min-h-[38px] gap-2 text-sm" aria-pressed={!prog} onClick={() => setProg(p => !p)}>
          {prog ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{prog ? 'Сынып прогресін жасыру' : 'Сынып прогресін көрсету'}</Button>
        <Button variant={sorting ? 'primary' : 'secondary'} className="!min-h-[38px] gap-2 text-sm" aria-pressed={sorting} onClick={() => setSorting(s => !s)}>
          <ArrowUpDown size={16} aria-hidden="true" />{sorting ? 'Дайын' : 'Ретін өзгерту'}</Button>
      </div>
      {err && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{err}</p>}
      {!shown.length && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">Бұл сүзгіге сай курс жоқ.</p>}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(course => {
          const ci = data.courses.indexOf(course);
          const its = pg.items(data, course.id), lect = its.filter(i => !i.exam);
          const classes = c.classesOf.get(course.id) || [];
          const mod = pg.currentModule(its, classes, c, quarter);
          const rows = mod ? classes.map(k => ({ k, ...pg.progressIn(its, mod, k, c) })) : [];
          const behind = [...classes].sort((a, b) => (c.taught.get(a)?.size || 0) - (c.taught.get(b)?.size || 0))
            .map(k => ({ k, n: pg.nextFor(its, k, c) })).find(x => x.n);
          const ready = lect.filter(i => c.kmj.get(i.id)).length, ktp = lect.some(i => c.ktp.has(i.id));
          const kmjTone = !lect.length || !ready ? 'bg-surface-2 text-text-muted' : ready === lect.length ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning';
          const kmjText = !ready ? 'ҚМЖ әлі жоқ' : ready === lect.length ? 'ҚМЖ толық дайын' : `ҚМЖ жетіспейді: ${lect.length - ready}`;
          const pos = sorted.indexOf(course), title = courseTitle(course, lang);
          return (
            <article key={course.id} draggable={sorting} onDragStart={() => setDrag(course.id)} onDragEnd={() => setDrag('')}
              onDragOver={e => { if (sorting) e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (drag && drag !== course.id) move(drag, pos); setDrag(''); }}
              className={`group relative flex flex-col overflow-hidden rounded-2xl bg-surface shadow-card transition-shadow hover:shadow-pop ${sorting ? 'border-2 border-dashed border-accent/60' : 'border border-border'} ${drag === course.id ? 'opacity-50' : ''}`}>
              <div className="relative h-28 overflow-hidden" style={{ background: coverOf(ci) }}>
                {course.cover_url && <img src={course.cover_url} alt="" className="h-full w-full object-cover" />}
                {!course.cover_url && <span aria-hidden="true" className="absolute bottom-2 left-4 text-6xl font-black leading-none text-white/35">{course.grade || (course.subject || 'К').slice(0, 2)}</span>}
                <Visibility c={course} />
                {sorting && (
                  <button type="button" aria-label={`${title}: орнын жылжыту (← →)`} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(course.id, pos - 1); } if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(course.id, pos + 1); } }}
                    className="absolute left-3 top-3 z-10 grid h-11 w-11 cursor-grab place-items-center rounded-xl bg-surface text-text-secondary shadow-md"><GripVertical size={18} aria-hidden="true" /></button>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold leading-6"><a href={'#course/' + course.id} className="break-words text-text after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent">{title}</a></h2>
                    <p className="mt-0.5 text-sm text-text-muted">{mod ? moduleTitle(mod, lang) : `${lect.length} дәріс`}</p>
                  </div>
                  <span role="img" aria-label={ktp ? 'КТП бар' : 'КТП-да әлі жоқ'} title={ktp ? 'КТП бар' : 'КТП-да әлі жоқ'} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${ktp ? 'bg-accent-soft text-on-accent-soft' : 'bg-surface-2 text-text-muted'}`}><CalendarDays size={16} aria-hidden="true" /></span>
                  <span role="img" aria-label={kmjText} title={kmjText} className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${kmjTone}`}><FileText size={16} aria-hidden="true" /></span>
                </div>
                {prog && (rows.length ? (
                  <ul className="space-y-2" aria-label="Сыныптардың прогресі">
                    {rows.map(r => (
                      <li key={r.k} className="grid grid-cols-[2.75rem_1fr_2.5rem] items-center gap-2.5 text-sm">
                        <span className="font-bold">{c.className.get(r.k) || '—'}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.done} aria-label={c.className.get(r.k)}><span className="block h-full rounded-full bg-accent" style={{ width: r.total ? `${(r.done / r.total) * 100}%` : 0 }} /></span>
                        <span className="text-right font-semibold text-text-secondary">{r.done}/{r.total}</span>
                      </li>))}
                  </ul>
                ) : <p className="text-xs text-text-muted">{ctx.loading ? '…' : 'Сабақ кестесінде бұл курсқа сынып қосылмаған.'}</p>)}
                <span className="flex-1" />
                <div className="relative z-10 flex items-center gap-2">
                  {behind?.n ? (
                    <Button variant="secondary" className="!min-h-[44px] flex-1 gap-2 !bg-accent-soft text-sm font-bold !text-on-accent-soft" loading={busy === behind.n.id + behind.k}
                      onClick={() => start(behind.n!.id, behind.k)} aria-label={`${behind.n.label} дәрісін ${c.className.get(behind.k)} сыныбымен бастау`}>
                      <Play size={15} className="fill-current" aria-hidden="true" />{behind.n.label} · {c.className.get(behind.k)}-мен бастау</Button>
                  ) : <a href={'#course/' + course.id} className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-surface-2 text-sm font-semibold text-text">Курсты ашу</a>}
                  {menu(course)}
                </div>
              </div>
            </article>);
        })}
      </div>
    </div>
  );
}
