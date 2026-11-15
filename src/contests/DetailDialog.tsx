import React, { useEffect, useRef, useState } from 'react';
import { Banknote, CalendarDays, ExternalLink, Gauge, MapPin, Pencil, Plane, Users, Wrench, X } from 'lucide-react';
import { Button, Field, LinkButton, inputCls } from '../ui';
import * as st from './store';
import type { Category, Contest, Data, Me, Stage } from './store';
import { AppChip, Chip, age, canEdit, catName, daysTo, dmy, range } from './ui';

export type Role = 'teacher' | 'student';

/** Registration state in words: closed / not yet / open with days left. */
function regLine(c: Contest): { text: string; tone: 'ok' | 'warn' | 'plain' } {
  if (c.status !== 'published' || !c.reg_open) return { text: 'Тіркеу жабық', tone: 'plain' };
  if (c.reg_from && daysTo(c.reg_from) > 0) return { text: `Тіркеу ${dmy(c.reg_from)} басталады`, tone: 'warn' };
  if (c.reg_deadline) {
    const n = daysTo(c.reg_deadline);
    if (n < 0) return { text: `Тіркеу ${dmy(c.reg_deadline)} аяқталған`, tone: 'plain' };
    return { text: n === 0 ? 'Тіркеудің соңғы күні бүгін' : `Тіркеу ${dmy(c.reg_deadline)} дейін, ${n} күн қалды`, tone: n <= 7 ? 'warn' : 'ok' };
  }
  return { text: 'Тіркеу ашық', tone: 'ok' };
}

function Fact({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-on-accent-soft"><Icon size={16} /></span>
      <div className="min-w-0 text-sm"><dt className="text-xs text-text-muted">{label}</dt><dd className="break-words font-medium text-text">{children}</dd></div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-2"><h3 className="text-base font-semibold">{title}</h3>{children}</section>;
}

function CategoryBox({ x }: { x: Category }) {
  return (
    <details className="group rounded-xl border border-border bg-surface open:bg-surface-2/40">
      <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 px-3 py-2 font-medium">
        <span>{x.name}</span>
        {x.grades.length > 0 && <span className="text-xs font-normal text-text-secondary">{x.grades.join(', ')} сынып</span>}
      </summary>
      <div className="space-y-2 border-t border-border p-3 text-sm">
        {x.rules_url && <a href={x.rules_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-on-accent-soft underline">Ереже сілтемесі <ExternalLink size={14} aria-hidden="true" /></a>}
        {x.rules_text.trim() ? <p className="whitespace-pre-wrap">{x.rules_text}</p> : !x.rules_url && <p className="text-text-secondary">Ереже әлі жазылмаған.</p>}
      </div>
    </details>
  );
}

function StageList({ stages }: { stages: Stage[] }) {
  const now = st.currentStage(stages);
  return (
    <ol className="space-y-0">
      {stages.map((s, i) => {
        const cur = s === now;
        return (
          <li key={s.id ?? i} aria-current={cur ? 'step' : undefined} className="relative flex gap-3 pb-4 last:pb-0">
            <span aria-hidden="true" className="flex flex-col items-center">
              <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${cur ? 'bg-accent ring-4 ring-accent-soft' : 'bg-border-input'}`} />
              {i < stages.length - 1 && <span className="w-px flex-1 bg-border" />}
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{s.name}{s.on_date && <span className="ml-2 font-normal text-text-secondary">{dmy(s.on_date)}</span>}</p>
              <p className="flex flex-wrap items-center gap-1 text-text-secondary">
                {s.level && <Chip>{st.nameOf(st.LEVELS, s.level)}</Chip>}
                {s.location && <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{s.location}</span>}
                {s.format && <span>{s.format}</span>}
              </p>
              {s.who && <p className="text-text-secondary">Кім қатыса алады: {s.who}</p>}
              {s.advance && <p className="text-text-secondary">Келесіге өту: {s.advance}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function DetailDialog({ c, d, me, role, onClose, onDone }: { c: Contest; d: Data; me: Me; role: Role; onClose: () => void; onDone: (msg: string) => void }) {
  const stages = d.stages.filter(s => s.contest_id === c.id).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const cats = d.categories.filter(x => x.contest_id === c.id).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const teachers = d.teachers.filter(t => t.contest_id === c.id).map(t => d.people[t.teacher_id]).filter(Boolean);
  const mine = d.apps.find(a => a.contest_id === c.id && a.student_id === me.id);
  const [cat, setCat] = useState(''), [teacher, setTeacher] = useState(teachers[0]?.id ?? ''), [msg, setMsg] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const asideRef = useRef<HTMLElement>(null), box = useRef<HTMLDivElement>(null), closeBtn = useRef<HTMLButtonElement>(null);

  // focus goes into the dialog and back to the opener; Tab stays inside; Escape closes
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; opener?.focus?.(); };
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); return onClose(); }
    if (e.key !== 'Tab' || !box.current) return;
    const f = [...box.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,summary')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const send = async () => {
    setErr(''); setBusy(true);
    try { await st.apply(me, c, teacher, msg, cat); onDone('Өтінім жіберілді'); onClose(); } catch (e) { setErr(e instanceof Error ? e.message : 'Қате'); } finally { setBusy(false); }
  };
  const reg = regLine(c);
  const canApply = role === 'student' && st.regOpen(c) && (!mine || mine.status === 'rejected');
  const place = [c.location, c.is_online ? 'онлайн' : ''].filter(Boolean).join(' · ');

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="contest-title" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6" onClick={onClose} onKeyDown={onKey}>
      <div ref={box} className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="relative shrink-0">
          {c.cover_url
            ? <img src={c.cover_url} alt="" className="h-36 w-full object-cover sm:h-44" />
            : <div aria-hidden="true" className="grid h-28 w-full place-items-center bg-gradient-to-br from-accent-soft to-info-soft text-5xl sm:h-32">{c.icon || '🏆'}</div>}
          {c.cover_url && c.icon && <span aria-hidden="true" className="absolute -bottom-6 left-5 grid h-14 w-14 place-items-center rounded-2xl border border-border bg-surface text-3xl shadow-card">{c.icon}</span>}
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="Жабу" className="absolute right-3 top-3 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-surface/90 text-text shadow-card hover:bg-surface"><X size={20} aria-hidden="true" /></button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto p-5 pt-7 md:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0 space-y-5">
            <header className="space-y-2">
              <div className="flex flex-wrap gap-1">
                <Chip>{st.fieldName(c.field)}</Chip>{c.level && <Chip>{st.nameOf(st.LEVELS, c.level)}</Chip>}
                {c.is_online && <Chip tone="accent">Онлайн</Chip>}
                {c.kind === 'own' && <Chip tone="accent">ClassFlow ішінде{c.format ? ': ' + st.nameOf(st.FORMATS, c.format).toLowerCase() : ''}</Chip>}
                {c.teacher_only && <Chip tone="warn">Тек мұғалімдерге</Chip>}
                {c.status !== 'published' && <Chip tone="warn">{st.STATUS_NAMES[c.status]}</Chip>}
              </div>
              <h2 id="contest-title" className="text-2xl font-bold leading-tight">{c.title}</h2>
              {(c.organizer || c.url) && (
                <p className="text-sm text-text-secondary">{c.organizer && <>Ұйымдастырушы: <b className="text-text">{c.organizer}</b>{c.url ? ' · ' : ''}</>}
                  {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-on-accent-soft underline">Ресми сілтеме <ExternalLink size={14} aria-hidden="true" /></a>}</p>
              )}
            </header>

            {canApply && <Button className="w-full md:hidden" onClick={() => asideRef.current?.scrollIntoView({ block: 'start' })}>Өтінім жіберу ↓</Button>}
            {c.description && <p className="whitespace-pre-wrap">{c.description}</p>}
            {stages.length > 0 && <Block title="Кезеңдер"><StageList stages={stages} /></Block>}
            {cats.length > 0 && <Block title="Санаттар"><div className="space-y-2">{cats.map(x => <CategoryBox key={x.id} x={x} />)}</div></Block>}
            {c.rules_text.trim() && <Block title={`${cats.length ? 'Жалпы ережелер' : 'Ережелер'}${c.rules_locked ? ` (нұсқа ${c.rules_version})` : ''}`}><p className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm">{c.rules_text}</p></Block>}
            {(c.fee_text || c.travel_text) && (
              <Block title="Шығындар">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  {c.fee_text && <div className="rounded-xl bg-surface-2 p-3"><dt className="mb-1 flex items-center gap-1 text-xs text-text-muted"><Banknote size={14} aria-hidden="true" />Қатысу құны</dt><dd className="whitespace-pre-wrap">{c.fee_text}</dd></div>}
                  {c.travel_text && <div className="rounded-xl bg-surface-2 p-3"><dt className="mb-1 flex items-center gap-1 text-xs text-text-muted"><Plane size={14} aria-hidden="true" />Жол шығыны</dt><dd className="whitespace-pre-wrap">{c.travel_text}</dd></div>}
                </dl>
              </Block>
            )}
            {c.toolset && <Block title="Құрал-жабдық"><p className="flex gap-2 text-sm"><Wrench size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-text-muted" /><span className="whitespace-pre-wrap">{c.toolset}</span></p></Block>}
          </div>

          <aside ref={asideRef} aria-label="Қысқаша" className="space-y-4 md:sticky md:top-0 md:self-start">
            <dl className="space-y-3 rounded-2xl border border-border p-4">
              <Fact icon={CalendarDays} label="Күні">{range(c)}</Fact>
              {(place || c.map_url) && <Fact icon={MapPin} label="Орны">{place}{c.map_url && <> <a href={c.map_url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-on-accent-soft underline">2GIS-те ашу</a></>}</Fact>}
              {(age(c) || c.grades.length > 0) && <Fact icon={Gauge} label="Жасы">{[age(c), c.grades.length ? `${c.grades.join(', ')} сынып` : ''].filter(Boolean).join(' · ')}</Fact>}
              {c.team_size && <Fact icon={Users} label="Команда">{c.team_size}</Fact>}
            </dl>

            <div className="space-y-3 rounded-2xl border border-border p-4">
              <p className="flex flex-wrap items-center gap-2 text-sm"><Chip tone={reg.tone}>{reg.text}</Chip></p>
              <p className="text-xs text-text-secondary">
                {c.needs_approval ? 'Өтінімді жауапты мұғалім растайды.' : 'Өтінім автоматты расталады.'}
                {teachers.length > 0 && ` Жауапты: ${teachers.map(t => t.full_name).join(', ')}`}
              </p>
              {role === 'student' && mine && <p className="flex flex-wrap items-center gap-2 text-sm">Сіздің өтініміңіз{mine.category_id ? ` (${catName(d, mine.category_id)})` : ''}: <AppChip s={mine.status} /></p>}
              {canApply && (
                <form className="space-y-3" onSubmit={e => { e.preventDefault(); send(); }}>
                  {cats.length > 0 && <Field label="Санат">{id => <select id={id} required className={inputCls} value={cat} onChange={e => setCat(e.target.value)}><option value="">Таңдаңыз</option>{cats.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}</Field>}
                  <Field label="Жауапты мұғалім">{id => <select id={id} required className={inputCls} value={teacher} onChange={e => setTeacher(e.target.value)}>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select>}</Field>
                  <Field label="Қысқа хабар (міндетті емес)">{id => <textarea id={id} rows={3} maxLength={500} className={inputCls + ' py-2'} value={msg} onChange={e => setMsg(e.target.value)} />}</Field>
                  {err && <p role="alert" className="text-sm text-danger">{err}</p>}
                  <Button type="submit" loading={busy} disabled={!teacher || (cats.length > 0 && !cat)} className="w-full">Өтінім жіберу</Button>
                </form>
              )}
              {role === 'teacher' && canEdit(me, c) && <LinkButton href={`#contest/${c.id}`} className="w-full justify-center"><Pencil size={16} aria-hidden="true" className="mr-2" />Өзгерту</LinkButton>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
