import React, { useEffect, useRef, useState } from 'react';
import { Shuffle, UserPlus, Users, X } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Button, Card, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { FontPicker, ThemePicker } from '../ui/ThemePicker';
import { fmtDate } from '../hw/format';
import { CLASSES, STUDENTS } from '../hw/fakeApi';
import { byName } from './session';
import { MAX_ROSTER, MAX_TEAMS, addNames, listRuns, penalty, removeRun, splitTeams } from './jeopardyStore';
import type { Ctx, Run, Setup } from './jeopardyStore';

type Update = (fn: (p: Setup) => Setup) => void;

async function loadClasses(): Promise<{ id: string; name: string }[]> {
  if (DEMO) return CLASSES;
  const { data, error } = await sb.from('classes').select('id,name');
  if (error) throw new Error(error.message);
  return ((data || []) as { id: string; name: string }[]).sort((a, b) => byName(a.name, b.name));
}
async function classNames(id: string): Promise<string[]> {
  if (DEMO) return STUDENTS.filter(s => s.class_id === id).map(s => s.full_name);
  const { data, error } = await sb.from('profiles').select('full_name').eq('class_id', id).eq('role', 'student').is('removed_at', null).order('full_name');
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => r.full_name as string);
}

function Look() {
  return <div className="space-y-3"><ThemePicker /><FontPicker /></div>;
}

function Classes({ update }: { update: Update }) {
  const { data, error } = useLoad(loadClasses, []);
  const [cls, setCls] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    setBusy(true); setMsg('');
    try {
      const names = await classNames(cls);
      update(p => ({ ...p, roster: addNames(p.roster, names.join('\n')) }));
      setMsg(names.length ? `${names.length} оқушы қарастырылды, қайталанғандары қосылмады.` : 'Бұл сыныпта оқушы табылмады.');
    } catch (e) { setMsg((e as Error).message || 'Қате'); }
    setBusy(false);
  };
  if (error) return <p role="alert" className="text-sm text-danger">{error}</p>;
  if (!data?.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1"><Field label="Сыныпты түгел қосу">{id => (
          <select id={id} className={inputCls} value={cls} onChange={e => setCls(e.target.value)}>
            <option value="">Сыныпты таңдаңыз</option>
            {data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>)}</Field></div>
        <Button variant="secondary" disabled={!cls} loading={busy} onClick={add}><Users size={16} aria-hidden="true" />Қосу</Button>
      </div>
      {msg && <p role="status" className="text-sm text-text-secondary">{msg}</p>}
    </div>
  );
}

function People({ setup, update, staff }: { setup: Setup; update: Update; staff: boolean }) {
  const [text, setText] = useState('');
  const [n, setN] = useState(Math.max(2, Math.min(MAX_TEAMS, setup.teams.length)));
  const [clear, setClear] = useState(false);
  const { roster } = setup;
  const add = () => { if (text.trim()) { update(p => ({ ...p, roster: addNames(p.roster, text) })); setText(''); } };
  const teamsN = Math.min(n, Math.max(roster.length, 1));
  const split = () => update(p => ({ ...p, teams: splitTeams(p.roster, teamsN) }));
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Field label="Қатысушы қосу">{id => <textarea id={id} rows={2} className={inputCls + ' py-2'} value={text} onChange={e => setText(e.target.value)} placeholder="Аты-жөні. Бірнеше адам: әрқайсысы жаңа жолда немесе үтір арқылы" />}</Field>
        <Button onClick={add} disabled={!text.trim() || roster.length >= MAX_ROSTER}><UserPlus size={16} aria-hidden="true" />Қосу</Button>
      </div>
      {staff && <Classes update={update} />}

      <section aria-label="Қатысушылар тізімі" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Қатысушылар · {roster.length}</h3>
          {roster.length > 0 && (clear
            ? <span className="flex gap-1"><Button variant="danger" onClick={() => { update(p => ({ ...p, roster: [] })); setClear(false); }}>Иә, бәрін өшіру</Button><Button variant="ghost" onClick={() => setClear(false)}>Жоқ</Button></span>
            : <Button variant="ghost" onClick={() => setClear(true)}>Тазалау</Button>)}
        </div>
        {roster.length === 0 && <p className="text-sm text-text-muted">Әзірге ешкім жоқ. Аттарын жазыңыз немесе сыныпты қосыңыз.</p>}
        <ul className="space-y-1">
          {roster.map(name => (
            <li key={name} className="flex items-center justify-between gap-2 rounded-md bg-surface-2 pl-3">
              <span className="break-words min-w-0">{name}</span>
              <button type="button" aria-label={`${name}: тізімнен алып тастау`} onClick={() => update(p => ({ ...p, roster: p.roster.filter(x => x !== name) }))}
                className="grid place-items-center min-h-[44px] min-w-[44px] cursor-pointer text-text-secondary hover:text-danger"><X size={16} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Командаларға бөлу" className="space-y-2">
        <h3 className="font-semibold">Командаларға бөлу</h3>
        <div className="flex items-end gap-2">
          <div className="w-28"><Field label="Команда саны">{id => <input id={id} type="number" min={2} max={MAX_TEAMS} className={inputCls} value={n} onChange={e => setN(Math.min(MAX_TEAMS, Math.max(2, +e.target.value || 2)))} />}</Field></div>
          <Button disabled={roster.length < 2} onClick={split}><Shuffle size={16} aria-hidden="true" />Рандом бөлу</Button>
        </div>
        <p className="text-sm text-text-muted">Тізімдегілер араласады да, командаларға тең бөлінеді. Қайта басқанда басқаша бөлінеді. Командалар жаңарады, ұпай нөлден басталады.</p>
        <ul className="space-y-2">
          {setup.teams.filter(t => t.members.length > 0).map((t, i) => (
            <li key={i} className="rounded-md border border-border p-2">
              <div className="font-semibold">{t.name} · {t.members.length}</div>
              <div className="text-sm text-text-secondary break-words">{t.members.join(', ')}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function RulesTab({ setup, update }: { setup: Setup; update: Update }) {
  const r = setup.rules;
  const set = (patch: Partial<typeof r>) => update(p => ({ ...p, rules: { ...p.rules, ...patch } }));
  return (
    <div className="space-y-4">
      <Field label="Қате жауап үшін алынатын ұпай үлесі, %">{id => (
        <input id={id} type="number" min={0} max={100} step={5} className={inputCls} value={r.penaltyPct}
          onChange={e => set({ penaltyPct: Math.min(100, Math.max(0, Math.round(+e.target.value) || 0)) })} />)}</Field>
      <p className="text-sm text-text-secondary">Мысалы: 300 ұпайлық сұраққа қате жауап берсе, команда −{penalty(300, r)} ұпай алады. 0% болса, ұпай алынбайды.</p>
      <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={r.allowNegative} onChange={e => set({ allowNegative: e.target.checked })} />
        <span>Ұпай нөлден төмен түсе алады</span>
      </label>
      <Field label="Қосымша ереже (тақтада көрінеді)">{id => <textarea id={id} rows={3} maxLength={200} className={inputCls + ' py-2'} value={r.note} onChange={e => set({ note: e.target.value })} placeholder="Мысалы: жауапқа 20 секунд беріледі" />}</Field>
    </div>
  );
}

const rulesLine = (r: Run['rules']) => `Қате жауап: −${r.penaltyPct}%${r.allowNegative ? '' : ', нөлден төмен емес'}`;

function History({ ctx }: { ctx: Ctx }) {
  const { data, error, loading, reload } = useLoad(() => listRuns(ctx), [ctx.me.id]);
  const [del, setDel] = useState('');
  const [err, setErr] = useState('');
  const drop = async (id: string) => { setDel(''); try { await removeRun(ctx, id); setErr(''); reload(); } catch (e) { setErr((e as Error).message || 'Қате'); } };
  return (
    <div className="space-y-3">
      {data?.local && !DEMO && ctx.staff && <p role="status" className="rounded-md bg-warning-soft text-warning p-3 text-sm">Нәтижелер серверге қосылмаған, тек осы браузерде сақталады (006_jeopardy.sql жүргізілмеген).</p>}
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      {loading && !data && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && data.runs.length === 0 && <p className="text-sm text-text-muted">Әзірге нәтиже жоқ. Ойын аяқталғанда осында автоматты түседі, ал бұрын тоқтатсаңыз «Нәтижені сақтау» батырмасын басыңыз.</p>}
      {data?.runs.map(r => {
        const best = Math.max(...r.teams.map(t => t.score));
        return (
          <Card key={r.id} className="space-y-2 !p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold break-words">{r.title}</div>
                <div className="text-sm text-text-muted">{fmtDate(r.at)}</div>
              </div>
              {del === r.id
                ? <span className="flex gap-1"><Button variant="danger" onClick={() => drop(r.id)}>Иә</Button><Button variant="ghost" onClick={() => setDel('')}>Жоқ</Button></span>
                : <Button variant="ghost" aria-label={`${r.title}, ${fmtDate(r.at)}: нәтижені жою`} onClick={() => setDel(r.id)}>Жою</Button>}
            </div>
            <ol className="space-y-1 text-sm">
              {[...r.teams].sort((a, b) => b.score - a.score).map((t, i) => (
                <li key={i} className={t.score === best ? 'font-semibold' : ''}>
                  {t.name}: {t.score}{t.score === best && ' · жеңімпаз'}
                  {t.members.length > 0 && <div className="font-normal text-text-secondary break-words">{t.members.join(', ')}</div>}
                </li>
              ))}
            </ol>
            <div className="text-xs text-text-muted">{rulesLine(r.rules)}{r.rules.note && ` · ${r.rules.note}`}</div>
          </Card>
        );
      })}
    </div>
  );
}

const TABS = [['look', 'Көрініс'], ['people', 'Қатысушылар'], ['rules', 'Ережелер'], ['history', 'Тарих']] as const;

/** Slides in from the right; stays open while the game goes on. Esc or the close button hides it and puts the focus back. */
export function JeopardyPanel({ ctx, setup, update, onClose }: { ctx: Ctx; setup: Setup; update: Update; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('look');
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    head.current?.focus();
    return () => opener?.focus?.();
  }, []);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
  };
  const arrows = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const next = TABS[(TABS.findIndex(t => t[0] === tab) + d + TABS.length) % TABS.length][0];
    setTab(next);
    requestAnimationFrame(() => document.getElementById('jp-tab-' + next)?.focus());
  };
  return (
    <aside aria-label="Jeopardy параметрлері" onKeyDown={onKey}
      className="!mt-0 fixed inset-y-0 right-0 z-40 w-full sm:w-[26rem] bg-bg text-text border-l border-border shadow-pop flex flex-col">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border">
        <h2 ref={head} tabIndex={-1} className="text-lg font-semibold">Параметрлер</h2>
        <button type="button" aria-label="Панельді жабу" onClick={onClose} className="grid place-items-center min-h-[44px] min-w-[44px] cursor-pointer rounded-md hover:bg-surface-2"><X size={20} aria-hidden="true" /></button>
      </div>
      <div role="tablist" aria-label="Параметрлер бөлімдері" onKeyDown={arrows} className="flex border-b border-border overflow-x-auto">
        {TABS.map(([k, label]) => (
          <button key={k} id={'jp-tab-' + k} type="button" role="tab" aria-selected={tab === k} aria-controls="jp-panel" tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)}
            className={`min-h-[44px] px-3 text-sm whitespace-nowrap border-b-2 cursor-pointer ${tab === k ? 'border-accent text-text font-semibold' : 'border-transparent text-text-secondary hover:text-text'}`}>{label}</button>
        ))}
      </div>
      <div id="jp-panel" role="tabpanel" aria-labelledby={'jp-tab-' + tab} className="flex-1 overflow-y-auto p-3">
        {tab === 'look' && <Look />}
        {tab === 'people' && <People setup={setup} update={update} staff={ctx.staff} />}
        {tab === 'rules' && <RulesTab setup={setup} update={update} />}
        {tab === 'history' && <History ctx={ctx} />}
      </div>
    </aside>
  );
}
