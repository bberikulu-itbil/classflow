import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Bookmark, BookmarkCheck, CalendarDays, ChartGantt, ChevronDown, ChevronLeft, ChevronRight, List, Map as MapIcon, MapPin, Plus, Search } from 'lucide-react';
import { Button, Card, EmptyState, ErrorBox, LinkButton, Skeleton, useLoad } from '../ui';
import { Tabs } from '../ui/Tabs';
import * as st from './store';
import type { Contest, Data, Me, Stage } from './store';
import { DetailDialog } from './DetailDialog';
import type { Role } from './DetailDialog';
import { AppChip, Chip, ContestIcon, canEdit, catName, monthLabel, occRange, occurrences } from './ui';
import type { Occ } from './ui';
import { Timeline } from './Timeline';

export type { Role };
const MapView = lazy(() => import('./MapView'));
const DAYS = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жк'];

function ContestCard({ o, d, me, saved, onSave, onOpen }: { o: Occ; d: Data; me: Me; saved: boolean; onSave: () => void; onOpen: () => void }) {
  const c = o.c;
  const stages = d.stages.filter(s => s.contest_id === c.id);
  const nCats = d.categories.filter(x => x.contest_id === c.id).length;
  const top = st.levelsOf(c, stages).sort((x, y) => st.LEVELS.findIndex(l => l[0] === y) - st.LEVELS.findIndex(l => l[0] === x))[0];
  const meta = o.label ? (o.i >= 0 ? `${o.label} · ${o.i + 1}/${o.n} кезең` : `Күні жоқ кезең: ${o.label}`) : c.location ?? [stages.length ? `${stages.length} кезең` : '', nCats ? `${nCats} санат` : ''].filter(Boolean).join(' · ');
  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-xl border border-border ${c.teacher_only ? 'bg-warning-soft' : 'bg-surface'}`}>
      <div className="relative h-28 shrink-0">
        {c.cover_url ? <img src={c.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ContestIcon c={c} size="lg" />}
        {c.cover_url && <span className="absolute bottom-2 left-3"><ContestIcon c={c} /></span>}
        <span className="absolute right-2 top-2 flex gap-1">
          {c.status !== 'published' && <Chip tone="warn">{st.STATUS_NAMES[c.status]}</Chip>}
          {c.teacher_only && <Chip tone="warn">Тек мұғалімдерге</Chip>}
          {st.regOpen(c) && <Chip tone="ok">Тіркеу ашық</Chip>}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="truncate text-sm text-text-secondary">{occRange(o)}</p>
        <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-semibold leading-7">{c.title}</h3>
        <div className="flex h-6 gap-1 overflow-hidden [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          <Chip>{st.fieldName(c.field)}</Chip>{top && <Chip>{st.nameOf(st.LEVELS, top)}</Chip>}
          {c.is_online && <Chip tone="accent">Онлайн</Chip>}
        </div>
        <p className="flex h-5 items-center gap-1 truncate text-sm text-text-secondary">{meta && <>{!o.label && c.location && <MapPin size={14} aria-hidden="true" className="shrink-0" />}<span className={`truncate ${o.label ? 'font-medium text-on-accent-soft' : ''}`} title={meta}>{meta}</span></>}</p>
        <div className="mt-auto flex gap-2 pt-1">
          {c.status === 'published' && (
            <Button variant="secondary" onClick={onSave} aria-pressed={saved} aria-label={saved ? 'Сақталған, алып тастау' : 'Сақтау'}>{saved ? <BookmarkCheck size={18} aria-hidden="true" /> : <Bookmark size={18} aria-hidden="true" />}</Button>
          )}
          <Button onClick={onOpen} aria-label={`Ашу: ${c.title}`}>Ашу</Button>
          {me.role !== 'student' && canEdit(me, c) && <LinkButton href={`#contest/${c.id}`}>Өзгерту</LinkButton>}
        </div>
      </div>
    </article>
  );
}

function Calendar({ occs, month, setMonth, onOpen }: { occs: Occ[]; month: string; setMonth: (m: string) => void; onOpen: (id: string) => void }) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(y, m, 0).getDate();
  const byDay = useMemo(() => {
    const map = new Map<string, { c: Contest; label: string }[]>();
    for (const o of occs) if (o.from && o.from.startsWith(month)) map.set(o.from, [...(map.get(o.from) ?? []), { c: o.c, label: o.label ? `${o.c.title}: ${o.label}` : o.c.title }]);
    return map;
  }, [occs, month]);
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

function Inbox({ d, me, act }: { d: Data; me: Me; act: (fn: () => Promise<unknown>, done: string) => void }) {
  const rows = d.apps.filter(a => a.status === 'pending' && (a.teacher_id === me.id));
  return (
    <aside aria-label="Оқушылардан өтінімдер" className="space-y-2 rounded-xl bg-surface-2 p-3">
      <h2 className="text-base font-semibold">Оқушылардан өтінімдер <Chip tone="warn">{rows.length}</Chip></h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>
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

const ctl = 'h-10 w-full rounded-lg border border-border-input bg-surface px-2.5 text-sm text-text';
const VIEWS = [['list', 'Тізім', List], ['cal', 'Күнтізбе', CalendarDays], ['time', 'Таймлайн', ChartGantt], ['map', 'Карта', MapIcon]] as const;

function Sel({ label, v, set, opts, all }: { label: string; v: string; set: (s: string) => void; opts: [string, string][]; all: string }) {
  return <div className="min-w-[7rem] flex-1"><select aria-label={label} className={ctl} value={v} onChange={e => set(e.target.value)}><option value="">{all}</option>{opts.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></div>;
}

/** Several values at once: a button with a checklist under it (closes on outside click or Escape). */
function MultiSel({ label, v, set, opts, all }: { label: string; v: string[]; set: (s: string[]) => void; opts: [string, string][]; all: string }) {
  const box = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const off = (e: Event) => { const el = box.current; if (el?.open && (e.type === 'keydown' ? (e as KeyboardEvent).key === 'Escape' : !el.contains(e.target as Node))) el.open = false; };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', off);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', off); };
  }, []);
  return (
    <details ref={box} className="relative min-w-[7rem] flex-1">
      <summary aria-label={label} className={ctl + ' flex cursor-pointer list-none items-center justify-between gap-1 [&::-webkit-details-marker]:hidden'}>
        <span className="truncate">{v.length ? `${label}: ${v.length}` : all}</span><ChevronDown size={16} aria-hidden="true" className="shrink-0 text-text-muted" />
      </summary>
      <div role="group" aria-label={label} className="absolute left-0 z-30 mt-1 max-h-72 w-64 overflow-auto rounded-lg border border-border bg-surface p-1 shadow-pop">
        {opts.map(o => (
          <label key={o[0]} className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-surface-2">
            <input type="checkbox" className="h-4 w-4 shrink-0" checked={v.includes(o[0])} onChange={() => set(v.includes(o[0]) ? v.filter(x => x !== o[0]) : [...v, o[0]])} />{o[1]}
          </label>
        ))}
        {v.length > 0 && <button type="button" onClick={() => set([])} className="mt-1 min-h-[40px] w-full cursor-pointer rounded-md px-2 text-left text-sm font-medium text-on-accent-soft hover:bg-surface-2">Таңдауды тазалау</button>}
      </div>
    </details>
  );
}

export function ContestCatalog({ me, role }: { me: Me; role: Role }) {
  const { data: d, error, loading, reload } = useLoad(() => st.loadAll(me), [me.id]);
  const tabs = role === 'teacher'
    ? [{ key: 'catalog', label: 'Каталог' }, { key: 'saved', label: 'Сақталғандар' }, { key: 'apps', label: 'Өтінімдер' }, { key: 'mine', label: 'Менің сайыстарым' }]
    : [{ key: 'catalog', label: 'Каталог' }, { key: 'saved', label: 'Сақталғандар' }, { key: 'apps', label: 'Менің өтінімдерім' }];
  const [tab, setTab] = useState('catalog'), [view, setView] = useState<'list' | 'cal' | 'time' | 'map'>('list'), [arch, setArch] = useState(false);
  const [q, setQ] = useState(''), [field, setField] = useState<string[]>([]), [cat, setCat] = useState<string[]>([]), [level, setLevel] = useState(''), [grade, setGrade] = useState(''), [kind, setKind] = useState(''), [sort, setSort] = useState('date');
  const [month, setMonth] = useState(st.todayIso().slice(0, 7)), [open, setOpen] = useState<string | null>(null), [note, setNote] = useState(''), [msg, setMsg] = useState('');

  const act = async (fn: () => Promise<unknown>, done: string) => {
    setMsg(''); setNote('');
    try { await fn(); setNote(done); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); }
  };
  const inTab = useMemo(() => (d ? d.contests.filter(c => tab === 'mine' ? c.author_id === me.id : tab === 'saved' ? d.saves.includes(c.id) : c.status === 'published') : []), [d, tab, me.id]);
  const split = tab !== 'mine'; // a contest's own page lists it once; everywhere else each dated stage is its own showing
  // the filters offer only what exists in the data: known fields first, then the teachers' own names
  const fieldOpts = useMemo<[string, string][]>(() => {
    const used = [...new Set(inTab.map(c => c.field))];
    return [...st.FIELDS.filter(f => used.includes(f[0])), ...used.filter(u => !st.FIELDS.some(f => f[0] === u)).sort((a, b) => a.localeCompare(b, 'kk')).map((u): [string, string] => [u, u])];
  }, [inTab]);
  const catOpts = useMemo<[string, string][]>(() => {
    const ids = new Set(inTab.map(c => c.id));
    return [...new Set((d?.categories ?? []).filter(x => ids.has(x.contest_id ?? '')).map(x => x.name))].sort((a, b) => a.localeCompare(b, 'kk')).map((n): [string, string] => [n, n]);
  }, [d, inTab]);
  const all = useMemo(() => {
    if (!d) return [];
    const needle = q.trim().toLowerCase();
    const catsOf = (id: string) => d.categories.filter(x => x.contest_id === id);
    const keep = inTab.filter(c => (!needle || `${c.title} ${c.organizer ?? ''} ${c.location ?? ''} ${catsOf(c.id).map(x => x.name).join(' ')}`.toLowerCase().includes(needle)) && (!field.length || field.includes(c.field))
      && (!cat.length || catsOf(c.id).some(x => cat.includes(x.name))) && (!level || st.levelsOf(c, d.stages.filter(s => s.contest_id === c.id)).includes(level))
      && (!kind || c.kind === kind) && (!grade || ((!c.grades.length || c.grades.includes(Number(grade))))));
    return keep.flatMap(c => occurrences(c, d.stages.filter(s => s.contest_id === c.id), split));
  }, [d, inTab, q, field, cat, level, grade, kind, split]);
  const pastCount = all.filter(o => o.past).length;
  const occs = useMemo(() => {
    const out = all.filter(o => o.past === arch).sort((a, b) => sort === 'title' ? a.c.title.localeCompare(b.c.title, 'kk') || (a.from ?? '9999').localeCompare(b.from ?? '9999') : (a.from ?? '9999').localeCompare(b.from ?? '9999') || a.c.title.localeCompare(b.c.title, 'kk'));
    return arch && sort !== 'title' ? out.reverse() : out;
  }, [all, arch, sort]);
  const list = useMemo(() => [...new Map(occs.map(o => [o.c.id, o.c])).values()], [occs]);
  const groups = useMemo(() => { const m = new Map<string, Occ[]>(); for (const o of occs) { const k = o.from ? o.from.slice(0, 7) : ''; m.set(k, [...(m.get(k) ?? []), o]); } return [...m]; }, [occs]);
  const opened = d?.contests.find(c => c.id === open);
  const pending = d ? d.apps.filter(a => a.status === 'pending' && a.teacher_id === me.id) : [];
  const showInbox = role === 'teacher' && tab !== 'apps' && pending.length > 0;
  const unpinned = list.filter(c => c.lat == null || c.lng == null);
  const emptyText = arch ? 'Архивте сайыс жоқ.' : tab === 'saved' ? 'Сақталған сайыс жоқ.' : tab === 'mine' ? 'Сіз әлі сайыс қоспағансыз.' : 'Сүзгіге сай сайыс табылмады.';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs id="contests" label="Сайыстар бөлімдері" tabs={tabs} value={tab} onChange={setTab} />
        {role === 'teacher' && <LinkButton href="#contest/new" variant="primary"><Plus size={16} aria-hidden="true" className="mr-1" />Сайыс қосу</LinkButton>}
      </div>
      <p role="status" aria-live="polite" className={msg || note ? `rounded-lg p-3 text-sm ${msg ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}` : 'sr-only'}>{msg || note}</p>
      {loading && !d && <Skeleton rows={4} />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {d && (
        <div className="space-y-3">
          {showInbox && <Inbox d={d} me={me} act={act} />}
          <div id="contests-panel" role="tabpanel" className="space-y-3">
            {tab === 'apps' ? <AppsTable d={d} me={me} role={role} /> : (
              <>
                <div role="search" className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[9rem] flex-[2]">
                    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-3 text-text-muted" />
                    <input type="search" aria-label="Іздеу" className={ctl + ' pl-8'} value={q} onChange={e => setQ(e.target.value)} placeholder="Іздеу" /></div>
                  <MultiSel label="Сала" v={field} set={setField} opts={fieldOpts} all="Сала" />
                  <MultiSel label="Санат" v={cat} set={setCat} opts={catOpts} all="Санат" />
                  <Sel label="Деңгей" v={level} set={setLevel} opts={st.LEVELS} all="Деңгей" />
                  <Sel label="Сынып" v={grade} set={setGrade} opts={[5, 6, 7, 8, 9, 10, 11].map(n => [String(n), `${n} сынып`])} all="Сынып" />
                  <Sel label="Түрі" v={kind} set={setKind} opts={[['own', 'ClassFlow ішінде'], ['external', 'Сыртқы сайыс']]} all="Түрі" />
                  <Sel label="Сұрыптау" v={sort} set={setSort} opts={[['date', 'Күні бойынша'], ['title', 'Атауы бойынша']]} all="" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div role="group" aria-label="Көрініс" className="inline-flex rounded-lg bg-surface-2 p-0.5">
                    {VIEWS.map(([k, label, Icon]) => (
                      <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}
                        className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm font-medium sm:px-3 ${view === k ? 'bg-surface text-on-accent-soft shadow-card' : 'text-text-secondary hover:text-text'}`}><Icon size={16} aria-hidden="true" className="hidden sm:block" />{label}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" aria-pressed={arch} onClick={() => setArch(!arch)} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${arch ? 'border-accent bg-accent-soft text-on-accent-soft' : 'border-border text-text-secondary hover:text-text'}`}><Archive size={16} aria-hidden="true" />Архив{pastCount > 0 && <span className="text-xs">({pastCount})</span>}</button>
                    <p className="text-sm text-text-secondary" aria-live="polite">{list.length} сайыс{occs.length !== list.length && ` · ${occs.length} іс-шара`}</p>
                  </div>
                </div>
                {view === 'cal' ? <Calendar occs={occs} month={month} setMonth={setMonth} onOpen={setOpen} />
                  : view === 'time' ? (list.length ? <Timeline occs={occs} onOpen={setOpen} /> : <EmptyState text={emptyText} />)
                  : view === 'map' ? (
                    <div className="space-y-2">
                      <Suspense fallback={<Skeleton rows={4} />}><MapView items={list} onOpen={setOpen} /></Suspense>
                      {unpinned.length > 0 && (
                        <p className="text-sm text-text-secondary"><span className="font-medium text-text">Картада жоқ (онлайн немесе орны көрсетілмеген):</span>{' '}
                          {unpinned.map((c, i) => <React.Fragment key={c.id}>{i > 0 && ', '}<button type="button" onClick={() => setOpen(c.id)} className="cursor-pointer text-on-accent-soft underline">{c.title}</button></React.Fragment>)}</p>
                      )}
                    </div>
                  ) : !groups.length ? <EmptyState text={emptyText} />
                  : groups.map(([k, items]) => (
                    <section key={k || 'none'} aria-label={monthLabel(k)} className="space-y-2">
                      <h2 className="text-base font-semibold text-text-secondary">{monthLabel(k)}</h2>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map(o => <ContestCard key={o.key} o={o} d={d} me={me} saved={d.saves.includes(o.c.id)} onOpen={() => setOpen(o.c.id)}
                        onSave={() => act(() => st.setSaved(me, o.c.id, !d.saves.includes(o.c.id)), '')} />)}</div>
                    </section>
                  ))}
              </>
            )}
          </div>
        </div>
      )}
      {d && opened && <DetailDialog c={opened} d={d} me={me} role={role} onClose={() => setOpen(null)} onDone={m => { setNote(m); reload(); }} />}
    </div>
  );
}
