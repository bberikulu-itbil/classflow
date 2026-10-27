import React, { useEffect, useState } from 'react';
import { Dice5, EyeOff, Eye, Languages, List, Palette, Shuffle, Sparkles, Users, X } from 'lucide-react';
import { spaced } from '../components/Widgets';
import { tr } from '../lessons/lang';
import { RandomBody } from './Tools';
import { IconB } from './Win';

export type PanelId = 'toc' | 'people' | 'activity' | 'design';
export const PANEL_W = 360;
export const PANELS: { id: PanelId; label: string; icon: React.ReactNode }[] = [
  { id: 'toc', label: 'Мазмұны', icon: <List size={22} /> },
  { id: 'people', label: 'Қатысушылар', icon: <Users size={22} /> },
  { id: 'activity', label: 'Белсенділік', icon: <Sparkles size={22} /> },
  { id: 'design', label: 'Дизайн', icon: <Palette size={22} /> },
];

/** Board looks: `tone` says how slide text is drawn on it (dark = light text, light = dark text, vivid = white text on a strong colour). */
export const LOOKS = [
  { n: 'Қараңғы', bg: '', tone: 'dark', g: 'Қараңғы' }, { n: 'Көк түн', bg: '#0a1a3a', tone: 'dark', g: 'Қараңғы' }, { n: 'Орман', bg: '#0b2a20', tone: 'dark', g: 'Қараңғы' }, { n: 'Шифер', bg: '#1e293b', tone: 'dark', g: 'Қараңғы' }, { n: 'Таза қара', bg: '#000000', tone: 'dark', g: 'Қараңғы' },
  { n: 'Ақ', bg: '#ffffff', tone: 'light', g: 'Ашық' }, { n: 'Қағаз', bg: '#fbf3df', tone: 'light', g: 'Ашық' }, { n: 'Ашық көк', bg: '#e6f0ff', tone: 'light', g: 'Ашық' },
  { n: 'Қанық көк', bg: '#1d4ed8', tone: 'vivid', g: 'Қанық' }, { n: 'Қанық жасыл', bg: '#15803d', tone: 'vivid', g: 'Қанық' }, { n: 'Қанық күлгін', bg: '#7e22ce', tone: 'vivid', g: 'Қанық' }, { n: 'Қанық қызыл', bg: '#b91c1c', tone: 'vivid', g: 'Қанық' }, { n: 'Қанық сарғыш', bg: '#c2410c', tone: 'vivid', g: 'Қанық' },
] as const;
export const tone = (bg: string) => LOOKS.find(l => l.bg === bg)?.tone || 'dark';
export const SIZES = [{ n: 'Кіші', v: 0.85 }, { n: 'Қалыпты', v: 1 }, { n: 'Үлкен', v: 1.25 }, { n: 'Өте үлкен', v: 1.5 }];

const sec = 'space-y-2 border-t border-border pt-4 first:border-t-0 first:pt-0';
const btn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-2 disabled:opacity-40';

/** Panel that opens from the edge menu: slides in, takes its own column, closes with ✕ or Esc. */
export function SidePanel({ title, icon, left, onClose, children }: { title: string; icon: React.ReactNode; left: number; onClose: () => void; children: React.ReactNode }) {
  const [on, setOn] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const f = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(f); }, []);
  return (
    <section role="region" aria-label={title} style={{ left, width: `min(${PANEL_W}px, calc(100vw - ${left}px - 8px))`, transform: on ? 'none' : 'translateX(-24px)', opacity: on ? 1 : 0, transition: 'transform 150ms ease-out, opacity 150ms ease-out' }}
      className="fixed inset-y-0 z-[45] flex flex-col border-r border-border bg-surface text-text shadow-2xl">
      <div className="flex shrink-0 items-center border-b border-border bg-surface-2">
        <h2 className="flex min-h-[56px] flex-1 items-center gap-2 px-4 text-lg font-bold"><span aria-hidden="true" className="text-accent">{icon}</span>{title}</h2>
        <IconB label={`${title}: жабу`} onClick={onClose}><X size={20} aria-hidden="true" /></IconB>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
    </section>
  );
}

export function TocPanel({ toc, now, lang, go }: { toc: any[] | null | false; now: number; lang: 'kk' | 'ru'; go: (i: number) => void }) {
  if (toc === null) return <p className="text-text-secondary">Жүктелуде...</p>;
  if (toc === false) return <p className="text-text-secondary">Мазмұн қолжетімсіз.</p>;
  return (
    <ol className="space-y-1">{toc.map((x, i) => {
      const t = tr(x, lang), cur = i === now;
      return <li key={i}><button type="button" aria-current={cur ? 'true' : undefined} onClick={() => go(i)} className={`flex min-h-[44px] w-full items-baseline gap-2 rounded-lg px-2 py-1 text-left ${cur ? 'bg-accent font-semibold text-on-accent' : 'hover:bg-surface-2'}`}><span className="w-6 shrink-0 tabular-nums opacity-80">{i + 1}</span><span className="min-w-0 break-words">{t.title || t.prompt || t.type}</span></button></li>;
    })}</ol>
  );
}

export function PeoplePanel({ svg, code, big, setBig, parts }: { svg: string; code: string; big: boolean; setBig: (v: boolean) => void; parts: any[] }) {
  const px = big ? 272 : 200, online = parts.filter(p => p.presence === 'online').length;
  return (
    <>
      <div className="space-y-1 text-center">
        <div role="img" aria-label="Қосылу QR коды" className="mx-auto rounded-xl bg-white p-2" style={{ width: px, height: px }} dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="pt-1 text-sm text-text-secondary">немесе кодты енгіз</p>
        <p className={`whitespace-nowrap font-mono font-black tracking-widest text-accent ${big ? 'text-5xl' : 'text-4xl'}`}>{spaced(code)}</p>
        <button type="button" aria-pressed={big} onClick={() => setBig(!big)} className={btn + ' mt-1'}>{big ? 'QR-ды кішірейту' : 'QR-ды үлкейту'}</button>
      </div>
      <div className={sec}>
        <h3 className="font-bold">Қатысушылар</h3>
        <p className="text-sm text-text-secondary">Қосылды: {parts.length} · желіде: {online}</p>
        {parts.length ? <ul className="space-y-1">{parts.map((p, i) => (
          <li key={i} className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.presence === 'online' ? 'bg-success' : 'bg-text-muted'}`} /><span className="min-w-0 break-words">{p.full_name || '—'}</span><span className="sr-only">{p.presence === 'online' ? ' — желіде' : ' — желіде емес'}</span></li>
        ))}</ul> : <p className="text-sm text-text-muted">Әзірге ешкім қосылған жоқ</p>}
      </div>
    </>
  );
}

const pts = (v: number, hide: boolean) => (hide ? <span aria-label="жасырылған">•••</span> : v);

export function ActivityPanel({ parts, session, groupScores, leaderboard, hide, setHide, split }: {
  parts: any[]; session: any; groupScores: any[]; leaderboard: any[]; hide: boolean; setHide: (v: boolean) => void; split: (count: number, onlyOnline: boolean) => Promise<string | null>;
}) {
  const [n, setN] = useState(() => Math.min(8, Math.max(2, session?.groups_count || 3))), [only, setOnly] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const people = parts.map(p => ({ name: p.full_name || '—', online: p.presence === 'online' }));
  const run = async (c: number) => { setBusy(true); setErr((await split(c, only)) || ''); setBusy(false); };
  const groups = [...new Set(parts.map(p => p.group_no).filter(Boolean))].sort((a, b) => a - b) as number[];
  const chk = 'flex min-h-[44px] items-center gap-2 text-sm';
  return (
    <>
      <div className={sec}>
        <h3 className="flex items-center gap-2 font-bold"><Dice5 size={18} aria-hidden="true" />Кездейсоқ оқушы</h3>
        <RandomBody people={people} />
      </div>
      <div className={sec}>
        <h3 className="flex items-center gap-2 font-bold"><Shuffle size={18} aria-hidden="true" />Кездейсоқ топқа бөлу</h3>
        <label className={chk}>Топ саны<input type="number" min={2} max={8} value={n} onChange={e => setN(Math.min(8, Math.max(2, +e.target.value || 2)))} className="h-11 w-20 rounded-lg border border-border-input bg-surface-2 px-2 text-center text-text" /></label>
        <label className={chk}><input type="checkbox" className="h-5 w-5" checked={only} onChange={e => setOnly(e.target.checked)} />Топқа бөлгенде тек онлайн</label>
        <div className="flex gap-2">
          <button type="button" className={btn + ' flex-1 !bg-accent !text-on-accent'} disabled={busy || !parts.length} onClick={() => run(n)}>Бөлу</button>
          <button type="button" className={btn} disabled={busy || !groups.length} onClick={() => run(0)}>Тазалау</button>
        </div>
        {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        {groups.map(g => {
          const m = parts.filter(p => p.group_no === g);
          return <div key={g} className="rounded-lg bg-surface-2 p-2"><p className="font-semibold">Топ {g} <span className="font-normal text-text-secondary">· {m.length}</span></p><p className="break-words text-sm text-text-secondary">{m.map(p => p.full_name).join(', ')}</p></div>;
        })}
      </div>
      <div className={sec}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">Ұпайлар</h3>
          <button type="button" aria-pressed={hide} onClick={() => setHide(!hide)} className={btn}>{hide ? <Eye size={18} aria-hidden="true" /> : <EyeOff size={18} aria-hidden="true" />}{hide ? 'Көрсету' : 'Жасыру'}</button>
        </div>
        {groupScores.length ? groupScores.map(g => <div key={g.group_no} className="flex justify-between text-xl"><span>Топ {g.group_no}</span><b className="text-warning">{pts(g.points, hide)}</b></div>) : <p className="text-sm text-text-muted">Топ жоқ</p>}
        <h4 className="pt-2 text-sm font-semibold text-text-secondary">Әр оқушы</h4>
        {leaderboard.length ? <ul className="space-y-0.5">{leaderboard.map((r, i) => (
          <li key={r.student_id || i} className="flex items-baseline gap-2 border-b border-border py-1.5"><span className="w-6 shrink-0 text-text-secondary tabular-nums">{i + 1}</span><span className="min-w-0 flex-1 break-words">{r.full_name}</span>{r.group_no ? <span className="text-xs text-text-secondary">Топ {r.group_no}</span> : null}<b className="w-10 text-right text-warning tabular-nums">{pts(r.points, hide)}</b></li>
        ))}</ul> : <p className="text-sm text-text-muted">Әзірге оқушы жоқ</p>}
      </div>
    </>
  );
}

export function DesignPanel({ bg, setBg, size, setSize, lang, flip }: { bg: string; setBg: (v: string) => void; size: number; setSize: (v: number) => void; lang: 'kk' | 'ru'; flip: () => void }) {
  const groups = ['Қараңғы', 'Ашық', 'Қанық'];
  return (
    <>
      <div className={sec}>
        <h3 className="flex items-center gap-2 font-bold"><Languages size={18} aria-hidden="true" />Дәріс тілі</h3>
        <div role="group" aria-label="Дәріс тілі" className="flex gap-2">
          {([['kk', 'ҚАЗ · Қазақша'], ['ru', 'РУС · Русский']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={lang === v} onClick={() => lang !== v && flip()} className={`${btn} flex-1 ${lang === v ? '!border-accent !bg-accent !text-on-accent' : ''}`}>{l}</button>)}
        </div>
      </div>
      <div className={sec}>
        <h3 className="font-bold">Мәтін өлшемі</h3>
        <div role="group" aria-label="Мәтін өлшемі" className="flex flex-wrap gap-2">{SIZES.map(z => <button key={z.n} type="button" aria-pressed={size === z.v} onClick={() => setSize(z.v)} className={`${btn} ${size === z.v ? '!border-accent !bg-accent !text-on-accent' : ''}`}>{z.n}</button>)}</div>
      </div>
      {groups.map(g => (
        <div key={g} className={sec} role="group" aria-label={`Фон: ${g}`}>
          <h3 className="font-bold">{g} түстер</h3>
          <div className="flex flex-wrap gap-2">{LOOKS.filter(l => l.g === g).map(l => (
            <button key={l.n} type="button" aria-pressed={bg === l.bg} aria-label={l.n} title={l.n} onClick={() => setBg(l.bg)} style={{ background: l.bg || '#0E1116' }} className={`h-11 w-11 rounded-full border-2 ${bg === l.bg ? 'border-accent ring-2 ring-accent' : 'border-border-input'}`} />
          ))}</div>
        </div>
      ))}
    </>
  );
}
