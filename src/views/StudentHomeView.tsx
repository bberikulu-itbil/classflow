// The student's first screen: join the lesson that is on now, today's lessons of my class, open exams, my courses, homework due.
import React, { useState } from 'react';
import { BookOpen, CalendarClock, ClipboardCheck, Clock, MapPin, QrCode, Radio } from 'lucide-react';
import { sb, DEMO } from '../config';
import { api } from '../hw/types';
import { Card, ErrorBox, Skeleton, StatusChip, useLoad } from '../ui';
import { fmtDate } from '../hw/format';
import { givenName } from '../ui/names';
import { loadBells, nowIn, tint } from '../schedule/ttStore';
import { loadCourses, type StudentCourse } from '../curriculum/StudentCourses';

const DAYS = ['Дүйсенбі', 'Сейсенбі', 'Сәрсенбі', 'Бейсенбі', 'Жұма', 'Сенбі', 'Жексенбі'];
const MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'];
type Row = { weekday: number; period: number; span: number; label: string | null; room: string | null; teacher: string | null };

const openCourse = (course: string, lesson?: string) => {
  try { sessionStorage.setItem('cf_open', JSON.stringify({ course, lesson })); } catch { /* private mode: the list opens */ }
  window.location.hash = 'courses/list';
};

function Today() {
  const q = useLoad(async () => {
    if (DEMO) return null;
    const [b, t] = await Promise.all([loadBells(), sb.rpc('cf_my_timetable')]);
    return { bells: b.bells, rows: (t.error ? [] : t.data || []) as Row[] };
  }, []);
  if (q.loading && !q.data) return <Skeleton rows={3} />;
  if (!q.data || !q.data.rows.length) return <p className="text-sm text-text-secondary">Сыныбыңның сабақ кестесі әлі енгізілмеген.</p>;
  const { bells, rows } = q.data, now = nowIn(bells);
  // today, or the next day with lessons (after school, at the weekend)
  const last = rows.filter(r => r.weekday === now.weekday).reduce((a, r) => Math.max(a, r.period + r.span - 1), 0);
  const over = !last || now.hhmm >= (bells.find(b => b.n === last)?.ends || '99');
  let day = now.weekday;
  if (over) for (let k = 1; k <= 7; k++) { const d = ((now.weekday - 1 + k) % 7) + 1; if (rows.some(r => r.weekday === d)) { day = d; break; } }
  const list = rows.filter(r => r.weekday === day);
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-text-secondary">{day === now.weekday ? 'Бүгін' : DAYS[day - 1]}</p>
      <ol className="space-y-1.5">
        {list.map((r, i) => {
          const a = bells.find(b => b.n === r.period), z = bells.find(b => b.n === r.period + r.span - 1);
          const live = day === now.weekday && now.bell !== null && now.bell >= r.period && now.bell < r.period + r.span;
          const past = day === now.weekday && !!z && now.hhmm >= z.ends;
          return (
            <li key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${live ? 'border-accent bg-accent-soft' : 'border-border'} ${past ? 'opacity-55' : ''}`}>
              <span className="w-[4.5rem] shrink-0 text-xs font-semibold tabular-nums text-text-secondary"><Clock size={12} className="mr-1 inline" aria-hidden="true" />{a?.starts}<br />{z?.ends}</span>
              <span className="min-w-[3.5rem] rounded-lg px-2 py-1 text-center text-sm font-black" style={{ background: tint(r.label || 'x'), color: '#1e293b' }}>{r.label || 'Сабақ'}</span>
              <span className="min-w-0 flex-1 text-sm"><span className="block truncate text-text-secondary">{r.teacher}</span>{r.room && <span className="flex items-center gap-1 text-xs text-text-muted"><MapPin size={12} aria-hidden="true" />{r.room}</span>}</span>
              {live && <span className="rounded-full bg-accent px-2 text-xs font-bold text-on-accent">қазір</span>}
            </li>);
        })}
      </ol>
    </div>
  );
}

function Exams({ courses }: { courses: StudentCourse[] }) {
  const all = courses.flatMap(c => c.modules.flatMap(m => m.lessons.filter(l => l.exam).map(l => ({ c, l }))));
  const open = all.filter(x => x.l.open && !x.l.done), done = all.filter(x => x.l.result).slice(-3).reverse();
  if (!open.length && !done.length) return <p className="text-sm text-text-secondary">Ашық емтихан жоқ. Мұғалім ашқанда осында шығады.</p>;
  return (
    <ul className="space-y-2">
      {open.map(({ c, l }) => (
        <li key={l.id}><button type="button" onClick={() => openCourse(c.id, l.id)} className="flex w-full items-center gap-3 rounded-xl border-2 border-violet-400 bg-violet-50 p-3 text-left hover:bg-violet-100">
          <ClipboardCheck size={22} className="shrink-0 text-violet-700" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block font-bold">{l.title}</span><span className="text-xs text-violet-800">{c.title}{l.closes_at ? ` · ${new Date(l.closes_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} дейін` : ''}</span></span>
          <span className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white">Тапсыру</span>
        </button></li>))}
      {done.map(({ l }) => (
        <li key={l.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
          <ClipboardCheck size={18} className="shrink-0 text-text-muted" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{l.title}</span>
          <b className="tabular-nums">{l.result!.points} / {l.result!.max}</b>
        </li>))}
    </ul>
  );
}

function Courses({ courses }: { courses: StudentCourse[] }) {
  if (!courses.length) return <p className="text-sm text-text-secondary">Мұғалім курс ашқанда осында шығады.</p>;
  return (
    <ul className="space-y-2">
      {courses.map(c => {
        const ls = c.modules.flatMap(m => m.lessons.filter(l => !l.exam)), opened = ls.filter(l => l.open !== false);
        const pct = ls.length ? Math.round((opened.length / ls.length) * 100) : 0;
        const next = opened[opened.length - 1];
        return (
          <li key={c.id}><button type="button" onClick={() => openCourse(c.id)} className="w-full space-y-1.5 rounded-xl border border-border p-3 text-left hover:border-accent/50 hover:bg-surface-2">
            <span className="flex items-center gap-2"><BookOpen size={16} className="shrink-0 text-accent" aria-hidden="true" /><span className="min-w-0 flex-1 truncate font-semibold">{c.title}</span><span className="text-xs font-bold text-text-secondary">{opened.length}/{ls.length}</span></span>
            <span className="block h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.title}: ${pct}%`}><span className="block h-full rounded-full bg-accent" style={{ width: pct + '%' }} /></span>
            {next && <span className="block truncate text-xs text-text-muted">Соңғы ашылғаны: {next.title}</span>}
          </button></li>);
      })}
    </ul>
  );
}

export function StudentHomeView({ me }: { me: { full_name: string } }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const live = useLoad(async () => (DEMO ? [] : ((await sb.rpc('cf_live_for_me')).data || [])) as any[], []);
  const hwList = useLoad(() => api().listMyAssignments(), []);
  const courses = useLoad(loadCourses, []);
  const soon = (hwList.data || []).filter(a => ['not_started', 'draft', 'needs_work'].includes(a.status))
    .sort((a, b) => (a.due_at || '9').localeCompare(b.due_at || '9')).slice(0, 4);
  const d = new Date();

  const join = async (args: any) => {
    setErr('');
    const { data, error } = await sb.rpc('cf_join', args);
    if (error) return setErr(error.message || 'Қосылу мүмкін болмады');
    window.location.hash = 's/' + data.id;
  };

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-extrabold md:text-3xl">Сәлем, {givenName(me.full_name) || 'досым'}!</h1>
        <p className="text-sm text-text-secondary">{DAYS[(d.getDay() + 6) % 7]}, {d.getDate()} {MONTHS[d.getMonth()]}</p>
      </div>

      <section aria-label="Сабаққа қосылу" className="space-y-3 rounded-2xl bg-accent p-5 text-on-accent shadow-card">
        {live.data && live.data.length > 0 ? live.data.map((r: any, i: number) => (
          <button key={i} type="button" onClick={() => join({ p_session: r.id })} className="flex w-full items-center gap-3 rounded-xl bg-surface p-4 text-left text-text hover:bg-surface-2">
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-success-soft text-success"><Radio size={22} aria-hidden="true" /><span className="absolute right-0 top-0 h-3 w-3 animate-pulse rounded-full bg-success" /></span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-success">Сабақ жүріп жатыр{r.class_name ? ' · ' + r.class_name : ''}</span><span className="block truncate text-lg font-bold">{r.title}</span><span className="text-xs text-text-muted">{r.teacher_name}</span></span>
            <span className="rounded-lg bg-accent px-4 py-2.5 font-bold text-on-accent">Қосылу</span>
          </button>))
          : <h2 className="text-lg font-bold">Сабаққа қосылу</h2>}
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-semibold">Сабақ коды
            <input className="min-h-[52px] w-44 rounded-lg bg-surface px-3 font-mono text-xl uppercase text-text" placeholder="000 000" maxLength={9} value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') join({ p_code: code.replace(/\s/g, '').toUpperCase() }); }} />
          </label>
          <button type="button" className="min-h-[52px] cursor-pointer rounded-lg bg-surface px-5 font-bold text-accent hover:bg-surface-2" onClick={() => join({ p_code: code.replace(/\s/g, '').toUpperCase() })}>Қосылу</button>
          <span className="flex items-center gap-1.5 pb-3 text-sm"><QrCode size={16} aria-hidden="true" />немесе тақтадағы QR-кодты сканерле</span>
        </div>
        {err && <p role="alert" className="rounded-md bg-surface p-2 text-sm text-danger">{err}</p>}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 font-bold"><CalendarClock size={18} className="text-accent" aria-hidden="true" />Сабақтарым</h2>
          <Today />
        </Card>
        <Card className="space-y-3">
          <h2 className="flex items-center gap-2 font-bold"><ClipboardCheck size={18} className="text-violet-700" aria-hidden="true" />Емтихандар</h2>
          {courses.error ? <ErrorBox message={courses.error} onRetry={courses.reload} /> : !courses.data ? <Skeleton rows={2} /> : <Exams courses={courses.data} />}
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center gap-2"><h2 className="flex flex-1 items-center gap-2 font-bold"><BookOpen size={18} className="text-accent" aria-hidden="true" />Курстарым</h2><a href="#courses/list" className="text-sm font-semibold text-accent hover:underline">Барлығы →</a></div>
          {courses.error ? null : !courses.data ? <Skeleton rows={2} /> : <Courses courses={courses.data} />}
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center gap-2"><h2 className="flex-1 font-bold">Мерзімі жақын тапсырмалар</h2><a href="#hw" className="text-sm font-semibold text-accent hover:underline">Барлығы →</a></div>
          {hwList.loading && <Skeleton rows={2} />}
          {hwList.error && <ErrorBox message={hwList.error} onRetry={hwList.reload} />}
          {hwList.data && soon.length === 0 && <p className="text-sm text-text-secondary">Орындайтын тапсырма жоқ.</p>}
          {soon.length > 0 && (
            <ul className="space-y-1">
              {soon.map(a => (
                <li key={a.assignment_id}><a href={'#hw/' + a.assignment_id} className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 rounded-lg px-2 hover:bg-surface-2">
                  <span className="min-w-0 break-words font-medium">{a.title}</span>
                  <span className="flex items-center gap-2 text-sm text-text-muted">{fmtDate(a.due_at)} <StatusChip status={a.status} /></span>
                </a></li>))}
            </ul>)}
        </Card>
      </div>
    </main>
  );
}
