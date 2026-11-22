// The bottom of the teacher's home: lessons of my courses changed in the last 30 days that I have not looked through
// in demo mode since — «Жаңа» (never looked at, made recently) or «Жаңартылған». A demo run clears the mark (cf_lesson_seen, 081).
import React, { useState } from 'react';
import { Eye, Sparkles } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Button, Card, useLoad } from '../ui';
import { loadCurr } from '../curriculum/store';
import { createSession } from './session';
import { getPrefs } from '../prefs';

type Row = { id: string; title: string; created_at: string; updated_at: string; where: string; fresh: boolean };
const DAYS = 30;
const dm = (s: string) => { const d = new Date(s); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`; };

async function load(me: { id: string; school_id: string }): Promise<Row[]> {
  if (DEMO) return [];
  const curr = await loadCurr(me as any);
  const where = new Map<string, string>();
  for (const p of curr.places) {
    const m = curr.modules.find(x => x.id === p.module_id), c = curr.courses.find(x => x.id === m?.course_id);
    if (m && c && !where.has(p.lesson_id)) where.set(p.lesson_id, `${c.title} · ${m.title}`);
  }
  const ids = [...where.keys()].filter(id => /^[0-9a-f-]{36}$/.test(id));
  if (!ids.length) return [];
  const since = new Date(Date.now() - DAYS * 864e5).toISOString();
  const [ls, seen] = await Promise.all([
    sb.from('cf_lessons').select('id,title,created_at,updated_at').in('id', ids).gt('updated_at', since),
    sb.from('cf_lesson_seen').select('lesson_id,seen_at'),
  ]);
  const at = new Map(((seen.data || []) as any[]).map(x => [x.lesson_id, x.seen_at as string]));
  return ((ls.data || []) as any[])
    .filter(l => !at.has(l.id) || at.get(l.id)! < l.updated_at)
    .map(l => ({ ...l, where: where.get(l.id) || '', fresh: !at.has(l.id) && l.created_at > since }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function FreshLessons({ me }: { me: { id: string; school_id: string } }) {
  const q = useLoad(() => load(me), [me.id]);
  const [all, setAll] = useState(false), [busy, setBusy] = useState(''), [err, setErr] = useState('');
  if (!q.data || !q.data.length) return null;
  const list = all ? q.data : q.data.slice(0, 6);
  const look = async (id: string) => {
    setBusy(id); setErr('');
    try { window.location.hash = 'remote/' + (await createSession(id, 'demo', getPrefs().groups)); } catch (e) { setErr((e as Error).message); setBusy(''); }
  };
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex flex-1 items-center gap-2 font-bold"><Sparkles size={18} className="text-accent" aria-hidden="true" />Жаңа және жаңартылған сабақтар<span className="rounded-full bg-accent px-2 text-xs font-bold text-on-accent">{q.data.length}</span></h2>
        <p className="w-full text-xs text-text-muted sm:w-auto">Демо режимде ашып қарағанша белгісі тұрады</p>
      </div>
      {err && <p role="alert" className="rounded-lg bg-danger-soft p-2 text-sm text-danger">{err}</p>}
      <ul className="divide-y divide-border">
        {list.map(l => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className={`w-[6.75rem] shrink-0 rounded-md px-2 py-0.5 text-center text-xs font-bold ${l.fresh ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>{l.fresh ? 'Жаңа' : 'Жаңартылған'}</span>
            <span className="min-w-0 flex-1">
              <a href={'#edit/' + l.id} className="block break-words font-semibold text-text hover:text-accent">{l.title}</a>
              <span className="block truncate text-xs text-text-muted">{l.where} · {dm(l.updated_at)}</span>
            </span>
            <Button variant="secondary" className="!min-h-[40px] gap-1.5 text-sm" loading={busy === l.id} onClick={() => look(l.id)} aria-label={`${l.title}: демо режимде қарау`}><Eye size={15} aria-hidden="true" />Демода қарау</Button>
          </li>))}
      </ul>
      {q.data.length > 6 && <button type="button" className="min-h-[40px] text-sm font-semibold text-accent hover:underline" onClick={() => setAll(a => !a)}>{all ? 'Жасыру' : `Тағы ${q.data.length - 6} сабақ`}</button>}
    </Card>
  );
}
