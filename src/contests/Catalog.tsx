import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bookmark, BookmarkCheck, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, List, MapPin, Plus, X } from 'lucide-react';
import { Button, Card, EmptyState, ErrorBox, Field, LinkButton, Skeleton, inputCls, useLoad } from '../ui';
import { Tabs } from '../ui/Tabs';
import * as st from './store';
import type { App, Category, Contest, Data, Me, Stage } from './store';

const MONTHS = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];
const DAYS = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жк'];
const dmy = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1].toLowerCase()}${y === new Date().getFullYear() ? '' : ' ' + y}`; };
const range = (c: Contest) => !c.starts_on ? 'Күні белгісіз' : !c.ends_on || c.ends_on === c.starts_on ? dmy(c.starts_on) : `${dmy(c.starts_on)} – ${dmy(c.ends_on)}`;
const monthKey = (c: Contest) => (c.starts_on ? c.starts_on.slice(0, 7) : '');
const monthLabel = (k: string) => (k ? `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}` : 'Күні белгісіз');
const age = (c: Contest) => c.age_min != null && c.age_max != null ? `${c.age_min}–${c.age_max} жас` : c.age_min != null ? `${c.age_min}+ жас` : c.age_max != null ? `${c.age_max} жасқа дейін` : '';
const catName = (d: Data, id?: string | null) => d.categories.find(x => x.id === id)?.name ?? '';
const canEdit = (me: Me, c: Contest) => c.author_id === me.id || me.role === 'deputy' || me.role === 'admin';

export type Role = 'teacher' | 'student';
const Chip = ({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'accent' | 'ok' | 'warn' }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone === 'accent' ? 'bg-accent-soft text-on-accent-soft' : tone === 'ok' ? 'bg-success-soft text-success' : tone === 'warn' ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-text-secondary'}`}>{children}</span>
);
const AppChip = ({ s }: { s: App['status'] }) => <Chip tone={s === 'approved' ? 'ok' : s === 'pending' ? 'warn' : 'plain'}>{st.APP_NAMES[s]}</Chip>;

function Stages({ stages }: { stages: Stage[] }) {
  if (!stages.length) return null;
  const now = st.currentStage(stages);
  return (
    <ol aria-label="Кезеңдер" className="flex flex-wrap items-center gap-1 text-sm">
      {stages.map((s, i) => (
        <li key={s.id ?? i} className="flex items-center gap-1">
          {i > 0 && <ArrowRight size={14} aria-hidden="true" className="text-text-muted" />}
          <span aria-current={s === now ? 'step' : undefined} className={`rounded-md px-2 py-0.5 ${s === now ? 'bg-accent-soft font-semibold text-on-accent-soft' : 'text-text-secondary'}`}>{s.name}</span>
        </li>
      ))}
    </ol>
  );
}

function ContestCard({ c, d, me, saved, onSave, onOpen }: { c: Contest; d: Data; me: Me; saved: boolean; onSave: () => void; onOpen: () => void }) {
  const stages = d.stages.filter(s => s.contest_id === c.id).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const cats = d.categories.filter(x => x.contest_id === c.id);
  return (
    <article className={`overflow-hidden rounded-lg border border-border ${c.teacher_only ? 'bg-warning-soft' : 'bg-surface'}`}>
      {c.cover_url && <img src={c.cover_url} alt="" loading="lazy" className="h-28 w-full object-cover" />}
      <div className="space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-text-secondary">{range(c)}</p>
          <h3 className="text-lg font-semibold">{c.icon && <span aria-hidden="true" className="mr-1">{c.icon}</span>}{c.title}</h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {c.status !== 'published' && <Chip tone="warn">{st.STATUS_NAMES[c.status]}</Chip>}
          {c.teacher_only && <Chip tone="warn">Тек мұғалімдерге</Chip>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Chip>{st.nameOf(st.FIELDS, c.field)}</Chip>{st.levelsOf(c, stages).map(l => <Chip key={l}>{st.nameOf(st.LEVELS, l)}</Chip>)}
        {c.is_online && <Chip tone="accent">Онлайн</Chip>}
        {c.location && <Chip><MapPin size={12} aria-hidden="true" className="mr-1" />{c.location}</Chip>}
        {c.kind === 'own' && <Chip tone="accent">ClassFlow ішінде</Chip>}
        {st.regOpen(c) && <Chip tone="ok">Тіркеу ашық</Chip>}
      </div>
      {cats.length > 0 && <p className="text-sm text-text-secondary"><span className="font-medium text-text">Санаттар:</span> {cats.map(x => x.name).join(' · ')}</p>}
      <Stages stages={stages} />
      <div className="flex flex-wrap gap-2 pt-1">
        {c.status === 'published' && (
          <Button variant="secondary" onClick={onSave} aria-pressed={saved}>{saved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}{saved ? 'Сақталды' : 'Сақтау'}</Button>
        )}
        <Button onClick={onOpen} aria-label={`Ашу: ${c.title}`}>Ашу</Button>
        {me.role !== 'student' && canEdit(me, c) && <LinkButton href={`#contest/${c.id}`}>Өзгерту</LinkButton>}
      </div>
      </div>
    </article>
  );
}

function Calendar({ items, d, month, setMonth, onOpen }: { items: Contest[]; d: Data; month: string; setMonth: (m: string) => void; onOpen: (id: string) => void }) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(y, m, 0).getDate();
  const byDay = useMemo(() => {
    const map = new Map<string, { c: Contest; label: string }[]>();
    const add = (iso: string | null, c: Contest, label: string) => { if (iso && iso.startsWith(month)) map.set(iso, [...(map.get(iso) ?? []), { c, label }]); };
    for (const c of items) { add(c.starts_on, c, c.title); for (const s of d.stages.filter(s => s.contest_id === c.id)) if (s.on_date !== c.starts_on) add(s.on_date, c, `${c.title}: ${s.name}`); }
    return map;
  }, [items, d.stages, month]);
  const shift = (n: number) => { const t = new Date(y, m - 1 + n, 1); setMonth(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`); };
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <section aria-label="Күнтізбе" className="space-y-2">
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => shift(-1)} aria-label="Алдыңғы ай"><ChevronLeft size={18} aria-hidden="true" /></Button>
        <h3 className="text-lg font-semibold">{monthLabel(month)}</h3>
        <Button variant="secondary" onClick={() => shift(1)} aria-label="Келесі ай"><ChevronRight size={18} aria-hidden="true" /></Button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border text-xs">
        {DAYS.map(x => <div key={x} className="bg-surface-2 p-1 text-center font-semibold text-text-secondary">{x}</div>)}
        {cells.map((n, i) => {
          const iso = n ? `${month}-${String(n).padStart(2, '0')}` : '';
          return (
            <div key={i} className={`min-h-[64px] space-y-1 bg-surface p-1 ${iso === st.todayIso() ? 'ring-2 ring-inset ring-accent' : ''}`}>
              {n && <div className="text-text-secondary">{n}</div>}
              {(byDay.get(iso) ?? []).map((e, j) => (
                <button key={j} type="button" onClick={() => onOpen(e.c.id)} title={e.label}
                  className={`block min-h-[24px] w-full cursor-pointer truncate rounded px-1 text-left ${e.c.teacher_only ? 'bg-warning-soft text-warning' : 'bg-accent-soft text-on-accent-soft'}`}>{e.label}</button>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CategoryBox({ x }: { x: Category }) {
  return (
    <details className="rounded-lg border border-border p-3">
      <summary className="cursor-pointer font-medium">{x.name}{x.grades.length > 0 && <span className="ml-2 text-sm font-normal text-text-secondary">{x.grades.join(', ')} сынып</span>}</summary>
      <div className="mt-2 space-y-2 text-sm">
        {x.rules_url && <a href={x.rules_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline">Ереже сілтемесі <ExternalLink size={14} aria-hidden="true" /></a>}
        {x.rules_text.trim() ? <p className="whitespace-pre-wrap rounded-md bg-surface-2 p-3">{x.rules_text}</p> : !x.rules_url && <p className="text-text-secondary">Ереже әлі жазылмаған.</p>}
      </div>
    </details>
  );
}

function Detail({ c, d, me, role, onClose, onDone }: { c: Contest; d: Data; me: Me; role: Role; onClose: () => void; onDone: (msg: string) => void }) {
  const stages = d.stages.filter(s => s.contest_id === c.id).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const teachers = d.teachers.filter(t => t.contest_id === c.id).map(t => d.people[t.teacher_id]).filter(Boolean);
  const cats = d.categories.filter(x => x.contest_id === c.id).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  const mine = d.apps.find(a => a.contest_id === c.id && a.student_id === me.id);
  const [cat, setCat] = useState(''), [teacher, setTeacher] = useState(teachers[0]?.id ?? ''), [msg, setMsg] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const send = async () => {
    setErr(''); setBusy(true);
    try { await st.apply(me, c, teacher, msg, cat); onDone('Өтінім жіберілді'); onClose(); } catch (e) { setErr(e instanceof Error ? e.message : 'Қате'); } finally { setBusy(false); }
  };
  const canApply = role === 'student' && st.regOpen(c) && (!mine || mine.status === 'rejected');
  return (
    <div role="dialog" aria-modal="true" aria-label={c.title} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-t-xl bg-surface p-4 sm:rounded-xl" onClick={e => e.stopPropagation()}>
        {c.cover_url && <img src={c.cover_url} alt="" className="h-40 w-full rounded-lg object-cover" />}
        <div className="flex items-start justify-between gap-2">
          <div><p className="text-sm text-text-secondary">{range(c)}</p><h2 className="text-xl font-bold">{c.icon && <span aria-hidden="true" className="mr-1">{c.icon}</span>}{c.title}</h2></div>
          <Button variant="ghost" onClick={onClose} aria-label="Жабу"><X size={18} aria-hidden="true" /></Button>
        </div>
        <div className="flex flex-wrap gap-1"><Chip>{st.nameOf(st.FIELDS, c.field)}</Chip>{st.levelsOf(c, stages).map(l => <Chip key={l}>{st.nameOf(st.LEVELS, l)}</Chip>)}{c.is_online && <Chip tone="accent">Онлайн</Chip>}{c.kind === 'own' && <Chip tone="accent">ClassFlow ішінде{c.format ? ': ' + st.nameOf(st.FORMATS, c.format).toLowerCase() : ''}</Chip>}{c.grades.length > 0 && <Chip>{c.grades.join(', ')} сынып</Chip>}</div>
        {c.description && <p className="whitespace-pre-wrap">{c.description}</p>}
        {(c.organizer || c.url) && (
          <p className="text-sm">{c.organizer && <span>Ұйымдастырушы: <b>{c.organizer}</b>. </span>}
            {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline">Ресми сілтеме <ExternalLink size={14} aria-hidden="true" /></a>}</p>
        )}
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          {(c.location || c.map_url) && <><dt className="text-text-secondary">Орны</dt><dd>{c.location}{c.map_url && <> <a href={c.map_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline"><MapPin size={14} aria-hidden="true" />2GIS-те ашу</a></>}</dd></>}
          {(age(c) || c.grades.length > 0) && <><dt className="text-text-secondary">Жасы</dt><dd>{[age(c), c.grades.length ? `${c.grades.join(', ')} сынып` : ''].filter(Boolean).join(' · ')}</dd></>}
          {c.team_size && <><dt className="text-text-secondary">Команда</dt><dd>{c.team_size}</dd></>}
          {c.toolset && <><dt className="text-text-secondary">Жабдық</dt><dd className="whitespace-pre-wrap">{c.toolset}</dd></>}
          {c.fee_text && <><dt className="text-text-secondary">Қатысу құны</dt><dd className="whitespace-pre-wrap">{c.fee_text}</dd></>}
          {c.travel_text && <><dt className="text-text-secondary">Жол шығыны</dt><dd className="whitespace-pre-wrap">{c.travel_text}</dd></>}
        </dl>
        {stages.length > 0 && (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-1 text-left font-semibold">Кезеңдер</caption>
            <thead className="text-text-secondary"><tr><th className="py-1 pr-3">Кезең</th><th className="pr-3">Күні</th><th className="pr-3">Деңгей</th><th className="pr-3">Орны</th><th className="pr-3">Формат</th><th>Келесіге өту</th></tr></thead>
            <tbody>{stages.map((s, i) => <tr key={s.id ?? i} className="border-t border-border"><td className="py-1 pr-3 font-medium">{s.name}</td><td className="pr-3">{s.on_date ? dmy(s.on_date) : '—'}</td><td className="pr-3">{s.level ? st.nameOf(st.LEVELS, s.level) : '—'}</td><td className="pr-3">{s.location || '—'}</td><td className="pr-3">{s.format || '—'}</td><td>{s.advance || '—'}</td></tr>)}</tbody></table></div>
        )}
        {cats.length > 0 && (
          <section aria-label="Санаттар" className="space-y-2"><h3 className="font-semibold">Санаттар</h3>
            {cats.map(x => <CategoryBox key={x.id} x={x} />)}</section>
        )}
        {c.rules_text.trim() && (
          <section><h3 className="font-semibold">{cats.length ? 'Жалпы ережелер' : 'Ережелер'}{c.rules_locked ? ` (нұсқа ${c.rules_version})` : ''}</h3><p className="whitespace-pre-wrap rounded-md bg-surface-2 p-3 text-sm">{c.rules_text}</p></section>
        )}
        <p className="text-sm text-text-secondary">
          {c.reg_from || c.reg_deadline ? `Тіркеу${c.reg_from ? ' ' + dmy(c.reg_from) + ' бастап' : ''}${c.reg_deadline ? ' ' + dmy(c.reg_deadline) + ' дейін' : ''}. ` : ''}{c.needs_approval ? 'Өтінімді жауапты мұғалім растайды.' : 'Өтінім автоматты расталады.'}
          {teachers.length > 0 && ` Жауапты мұғалімдер: ${teachers.map(t => t.full_name).join(', ')}.`}
        </p>
        {role === 'student' && mine && <p className="flex items-center gap-2 text-sm">Сіздің өтініміңіз{mine.category_id ? ` (${catName(d, mine.category_id)})` : ''}: <AppChip s={mine.status} /></p>}
        {canApply && (
          <form className="space-y-3 rounded-lg border border-border p-3" onSubmit={e => { e.preventDefault(); send(); }}>
            <h3 className="font-semibold">Өтінім жіберу</h3>
            {cats.length > 0 && <Field label="Санат">{id => <select id={id} required className={inputCls} value={cat} onChange={e => setCat(e.target.value)}><option value="">Таңдаңыз</option>{cats.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}</Field>}
            <Field label="Жауапты мұғалім">{id => <select id={id} required className={inputCls} value={teacher} onChange={e => setTeacher(e.target.value)}>{teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select>}</Field>
            <Field label="Қысқа хабар (міндетті емес)">{id => <textarea id={id} rows={3} maxLength={500} className={inputCls + ' py-2'} value={msg} onChange={e => setMsg(e.target.value)} />}</Field>
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
            <Button type="submit" loading={busy} disabled={!teacher || (cats.length > 0 && !cat)}>Өтінім жіберу</Button>
          </form>
        )}
        {role === 'student' && !canApply && !mine && c.status === 'published' && <p className="text-sm text-text-secondary">Тіркеу жабық.</p>}
      </div>
    </div>
  );
}

function Inbox({ d, me, act }: { d: Data; me: Me; act: (fn: () => Promise<unknown>, done: string) => void }) {
  const rows = d.apps.filter(a => a.status === 'pending' && (a.teacher_id === me.id));
  return (
    <aside aria-label="Оқушылардан өтінімдер" className="space-y-3">
      <h2 className="text-lg font-semibold">Оқушылардан өтінімдер {rows.length > 0 && <Chip tone="warn">{rows.length}</Chip>}</h2>
      {!rows.length && <p className="text-sm text-text-secondary">Жаңа өтінім жоқ.</p>}
      {rows.map(a => {
        const p = d.people[a.student_id], c = d.contests.find(x => x.id === a.contest_id);
        return (
          <Card key={a.id} className="space-y-2 p-3 text-sm">
            <p><b>{p?.full_name ?? 'Оқушы'}</b>{p?.class_name && ` · ${p.class_name}`}</p>
            <p className="text-text-secondary">{c?.title}{a.category_id ? ` · ${catName(d, a.category_id)}` : ''}</p>
            {a.message && <p className="whitespace-pre-wrap rounded-md bg-surface-2 p-2">{a.message}</p>}
            <div className="flex gap-2">
              <Button variant="success" onClick={() => act(() => st.decide(a.id, 'approved'), 'Өтінім расталды')}>Растау</Button>
              <Button variant="secondary" onClick={() => act(() => st.decide(a.id, 'rejected'), 'Өтінімнен бас тартылды')}>Бас тарту</Button>
            </div>
          </Card>
        );
      })}
    </aside>
  );
}

function AppsTable({ d, me, role }: { d: Data; me: Me; role: Role }) {
  const rows = d.apps.filter(a => role === 'student' || a.teacher_id === me.id || d.contests.find(c => c.id === a.contest_id)?.author_id === me.id);
  if (!rows.length) return <EmptyState text={role === 'student' ? 'Сіз әлі өтінім жібермегенсіз.' : 'Өтінімдер жоқ.'} />;
  return (
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="text-text-secondary"><tr>{role === 'teacher' && <th className="py-1 pr-3">Оқушы</th>}<th className="pr-3">Сайыс</th><th className="pr-3">Жауапты мұғалім</th><th>Күйі</th></tr></thead>
      <tbody>{rows.map(a => {
        const p = d.people[a.student_id];
        return <tr key={a.id} className="border-t border-border">{role === 'teacher' && <td className="py-2 pr-3">{p?.full_name}{p?.class_name && ` · ${p.class_name}`}</td>}
          <td className="py-2 pr-3">{d.contests.find(c => c.id === a.contest_id)?.title}{a.category_id ? ` · ${catName(d, a.category_id)}` : ''}</td><td className="pr-3">{d.people[a.teacher_id]?.full_name}</td><td><AppChip s={a.status} /></td></tr>;
      })}</tbody></table></div>
  );
}

export function ContestCatalog({ me, role }: { me: Me; role: Role }) {
  const { data: d, error, loading, reload } = useLoad(() => st.loadAll(me), [me.id]);
  const tabs = role === 'teacher'
    ? [{ key: 'catalog', label: 'Каталог' }, { key: 'saved', label: 'Сақталғандар' }, { key: 'apps', label: 'Өтінімдер' }, { key: 'mine', label: 'Менің сайыстарым' }]
    : [{ key: 'catalog', label: 'Каталог' }, { key: 'saved', label: 'Сақталғандар' }, { key: 'apps', label: 'Менің өтінімдерім' }];
  const [tab, setTab] = useState('catalog'), [view, setView] = useState<'list' | 'cal'>('list');
  const [q, setQ] = useState(''), [field, setField] = useState(''), [level, setLevel] = useState(''), [grade, setGrade] = useState(''), [kind, setKind] = useState(''), [sort, setSort] = useState('date');
  const [month, setMonth] = useState(st.todayIso().slice(0, 7)), [open, setOpen] = useState<string | null>(null), [note, setNote] = useState(''), [msg, setMsg] = useState('');

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setMsg(''); setNote('');
    try { await fn(); setNote(done); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); }
  };
  const list = useMemo(() => {
    if (!d) return [];
    const base = d.contests.filter(c => tab === 'mine' ? c.author_id === me.id : tab === 'saved' ? d.saves.includes(c.id) : c.status === 'published');
    const needle = q.trim().toLowerCase();
    const out = base.filter(c => (!needle || `${c.title} ${c.organizer ?? ''}`.toLowerCase().includes(needle)) && (!field || c.field === field) && (!level || st.levelsOf(c, d.stages.filter(s => s.contest_id === c.id)).includes(level))
      && (!kind || c.kind === kind) && (!grade || !c.grades.length || c.grades.includes(Number(grade))));
    return out.sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'kk') : (a.starts_on ?? '9999').localeCompare(b.starts_on ?? '9999'));
  }, [d, tab, q, field, level, grade, kind, sort, me.id]);
  const groups = useMemo(() => { const m = new Map<string, Contest[]>(); for (const c of list) m.set(monthKey(c), [...(m.get(monthKey(c)) ?? []), c]); return [...m]; }, [list]);
  const opened = d?.contests.find(c => c.id === open);
  const sel = (label: string, v: string, set: (s: string) => void, opts: [string, string][], all: string) =>
    <Field label={label}>{id => <select id={id} className={inputCls} value={v} onChange={e => set(e.target.value)}>{all && <option value="">{all}</option>}{opts.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>}</Field>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs id="contests" label="Сайыстар бөлімдері" tabs={tabs} value={tab} onChange={setTab} />
        {role === 'teacher' && <LinkButton href="#contest/new" variant="primary"><Plus size={16} aria-hidden="true" className="mr-1" />Сайыс қосу</LinkButton>}
      </div>
      <p role="status" aria-live="polite" className={msg || note ? `rounded-lg p-3 text-sm ${msg ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}` : 'sr-only'}>{msg || note}</p>
      {loading && !d && <Skeleton rows={4} />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {d && (
        <div className={role === 'teacher' && tab !== 'apps' ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]' : ''}>
          <div id="contests-panel" role="tabpanel" className="space-y-4">
            {tab === 'apps' ? <AppsTable d={d} me={me} role={role} /> : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Іздеу">{id => <input id={id} type="search" className={inputCls} value={q} onChange={e => setQ(e.target.value)} placeholder="Атауы немесе ұйымдастырушы" />}</Field>
                  {sel('Сала', field, setField, st.FIELDS, 'Барлығы')}
                  {sel('Деңгей', level, setLevel, st.LEVELS, 'Барлығы')}
                  {sel('Сынып', grade, setGrade, [5, 6, 7, 8, 9, 10, 11].map(n => [String(n), `${n} сынып`]), 'Барлығы')}
                  {sel('Түрі', kind, setKind, [['own', 'ClassFlow ішінде'], ['external', 'Сыртқы сайыс']], 'Барлығы')}
                  {sel('Сұрыптау', sort, setSort, [['date', 'Күні бойынша'], ['title', 'Атауы бойынша']], '')}
                </div>
                <div className="flex gap-2" role="group" aria-label="Көрініс">
                  <Button variant={view === 'list' ? 'primary' : 'secondary'} aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={16} aria-hidden="true" />Тізіммен</Button>
                  <Button variant={view === 'cal' ? 'primary' : 'secondary'} aria-pressed={view === 'cal'} onClick={() => setView('cal')}><CalendarDays size={16} aria-hidden="true" />Күнтізбе</Button>
                </div>
                {view === 'cal' ? <Calendar items={list} d={d} month={month} setMonth={setMonth} onOpen={setOpen} />
                  : !groups.length ? <EmptyState text={tab === 'saved' ? 'Сақталған сайыс жоқ.' : tab === 'mine' ? 'Сіз әлі сайыс қоспағансыз.' : 'Сүзгіге сай сайыс табылмады.'} />
                  : groups.map(([k, items]) => (
                    <section key={k || 'none'} aria-label={monthLabel(k)} className="space-y-2">
                      <h2 className="text-base font-semibold text-text-secondary">{monthLabel(k)}</h2>
                      {items.map(c => <ContestCard key={c.id} c={c} d={d} me={me} saved={d.saves.includes(c.id)} onOpen={() => setOpen(c.id)}
                        onSave={() => act(() => st.setSaved(me, c.id, !d.saves.includes(c.id)), '')} />)}
                    </section>
                  ))}
              </>
            )}
          </div>
          {role === 'teacher' && tab !== 'apps' && <Inbox d={d} me={me} act={act} />}
        </div>
      )}
      {d && opened && <Detail c={opened} d={d} me={me} role={role} onClose={() => setOpen(null)} onDone={m => { setNote(m); reload(); }} />}
    </div>
  );
}
