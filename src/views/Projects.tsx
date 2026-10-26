import React, { useEffect, useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import { DEMO, sb } from '../config';
import { Button, Card, inputCls } from '../ui';

type Status = 'planned' | 'active' | 'done';
type Project = { id: string; title: string; description: string; deadline: string | null; status: Status; updated_at: string };
type Me = { id: string; school_id: string };
const statuses: Record<Status, string> = { planned: 'Жоспарда', active: 'Орындалуда', done: 'Аяқталды' };
const empty = () => ({ title: '', description: '', deadline: '', status: 'planned' as Status });
const key = (me: Me) => `cf_projects_${me.id}`;
const missing = (code?: string) => code === 'PGRST205' || code === '42P01';
function readLocal(me: Me): Project[] {
  const value = localStorage.getItem(key(me));
  if (!value) return [];
  const rows: unknown = JSON.parse(value);
  if (!Array.isArray(rows)) throw new Error('Жергілікті жобалар дерегі оқылмады.');
  return rows as Project[];
}

export function Projects({ me }: { me: Me }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [local, setLocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [localPending, setLocalPending] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ReturnType<typeof empty> | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true); setError('');
    try {
      if (!DEMO) {
        const { data, error: err } = await sb.from('cf_projects').select('id,title,description,deadline,status,updated_at').order('updated_at', { ascending: false });
        if (!err) { setProjects((data || []) as Project[]); setLocal(false); setLocalPending(readLocal(me).length); setLoading(false); return; }
        if (!missing(err.code)) throw new Error(err.message);
      }
      setProjects(readLocal(me)); setLocal(true);
    } catch (e) { setError((e as Error).message || 'Жобаларды жүктеу мүмкін болмады.'); }
    setLoading(false);
  };
  useEffect(() => { void load(); }, [me.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form || busy) return;
    const title = form.title.trim();
    if (!title) { setError('Жоба атауын енгізіңіз.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const row: Project = { id: editing || crypto.randomUUID(), title, description: form.description.trim(), deadline: form.deadline || null, status: form.status, updated_at: new Date().toISOString() };
      if (local) {
        const next = [row, ...readLocal(me).filter(p => p.id !== row.id)];
        localStorage.setItem(key(me), JSON.stringify(next)); setProjects(next);
      } else {
        const { error: err } = await sb.from('cf_projects').upsert({ ...row, owner_id: me.id, school_id: me.school_id });
        if (err) throw new Error(err.message);
        setProjects(p => [row, ...p.filter(x => x.id !== row.id)]);
      }
      setForm(null); setEditing(null); setNotice('Жоба сақталды.');
    } catch (err) { setError((err as Error).message || 'Жобаны сақтау мүмкін болмады.'); }
    setBusy(false);
  };
  const remove = async (p: Project) => {
    if (!window.confirm(`«${p.title}» жобасын өшіру керек пе?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (local) { const next = readLocal(me).filter(x => x.id !== p.id); localStorage.setItem(key(me), JSON.stringify(next)); }
      else { const { error: err } = await sb.from('cf_projects').delete().eq('id', p.id); if (err) throw new Error(err.message); }
      setProjects(x => x.filter(row => row.id !== p.id)); setNotice('Жоба өшірілді.');
    } catch (err) { setError((err as Error).message || 'Жобаны өшіру мүмкін болмады.'); }
    setBusy(false);
  };
  const syncLocal = async () => {
    setBusy(true); setError('');
    try {
      const rows = readLocal(me);
      if (rows.length) {
        const { error: err } = await sb.from('cf_projects').upsert(rows.map(p => ({ ...p, owner_id: me.id, school_id: me.school_id })), { ignoreDuplicates: true });
        if (err) throw new Error(err.message);
        localStorage.removeItem(key(me));
      }
      setNotice('Браузердегі жобалар аккаунтқа көшірілді.'); await load();
    } catch (err) { setError((err as Error).message || 'Жобаларды көшіру мүмкін болмады.'); }
    setBusy(false);
  };
  const visible = projects.filter(p => (filter === 'all' || p.status === filter) && `${p.title} ${p.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section className="space-y-4" aria-labelledby="projects-heading">
    <div className="flex flex-wrap justify-between items-start gap-3">
      <div><h2 id="projects-heading" className="text-xl font-semibold">Жобалар</h2><p className="text-sm text-text-secondary mt-1">Жобаларды бір жерде жоспарлаңыз және бақылаңыз.</p></div>
      {!form && <Button onClick={() => { setEditing(null); setForm(empty()); setError(''); setNotice(''); }}><Plus size={18} aria-hidden="true" /> Жоба жасау</Button>}
    </div>
    {local && <p className="rounded-lg bg-warning-soft text-warning p-3 text-sm">Жобалар әзірге тек осы браузерде сақталады. Басқа құрылғыларда көру үшін дерекқор кестесін баптау қажет.</p>}
    {!local && localPending > 0 && <div className="rounded-lg bg-info-soft p-3 text-sm space-y-2"><p>Осы браузерде сақталған {localPending} жоба бар. Оларды аккаунтыңызға көшіріңіз.</p><Button variant="secondary" disabled={busy} onClick={() => void syncLocal()}>Жобаларды көшіру</Button></div>}
    {error && <div role="alert" className="rounded-lg bg-danger-soft text-danger p-3 text-sm">{error} {loading === false && !form && <button type="button" className="underline" onClick={() => void load()}>Қайталау</button>}</div>}
    {notice && <p role="status" className="text-sm text-success">{notice}</p>}
    {form && <Card className="space-y-4"><form onSubmit={save} className="space-y-4">
      <h3 className="font-semibold">{editing ? 'Жобаны өңдеу' : 'Жаңа жоба'}</h3>
      <label className="block space-y-1"><span className="text-sm font-medium">Жоба атауы *</span><input className={inputCls} required maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Мысалы: Робототехника жобасы" /></label>
      <label className="block space-y-1"><span className="text-sm font-medium">Сипаттамасы</span><textarea className={inputCls} rows={3} maxLength={5000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1"><span className="text-sm font-medium">Аяқтау мерзімі</span><input type="date" className={inputCls} value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></label>
      <label className="block space-y-1"><span className="text-sm font-medium">Күйі</span><select className={inputCls} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}>{Object.entries(statuses).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>
      <div className="flex flex-wrap gap-2"><Button type="submit" loading={busy}>Сақтау</Button><Button type="button" variant="secondary" onClick={() => { setForm(null); setEditing(null); setError(''); }}>Болдырмау</Button></div>
    </form></Card>}
    <div className="grid gap-3 sm:grid-cols-[1fr_12rem]"><label><span className="sr-only">Жобаларды іздеу</span><input className={inputCls} value={query} onChange={e => setQuery(e.target.value)} placeholder="Жобаларды іздеу" /></label><label><span className="sr-only">Күйі бойынша сүзгі</span><select className={inputCls} value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Барлық күй</option>{Object.entries(statuses).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>
    {loading ? <p className="text-sm text-text-secondary">Жүктелуде...</p> : visible.length === 0 ? <Card className="text-center space-y-2"><FolderKanban size={28} aria-hidden="true" className="mx-auto text-text-muted" /><p className="font-medium">{projects.length ? 'Сәйкес жоба табылмады' : 'Әзірге жоба жоқ'}</p><p className="text-sm text-text-secondary">{projects.length ? 'Іздеу немесе сүзгіні өзгертіңіз.' : '«Жоба жасау» батырмасын басып, алғашқы жобаңызды қосыңыз.'}</p></Card> : <div className="grid gap-3 sm:grid-cols-2">{visible.map(p => <Card key={p.id} className="space-y-3 min-w-0"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold break-words min-w-0">{p.title}</h3><span className="shrink-0 rounded-full bg-accent-soft text-on-accent-soft px-2 py-1 text-xs font-medium">{statuses[p.status]}</span></div>{p.description && <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">{p.description}</p>}<p className="text-sm text-text-muted">Мерзімі: {p.deadline ? p.deadline.split('-').reverse().join('.') : 'белгіленбеген'}</p><div className="flex gap-2"><Button variant="secondary" disabled={busy} onClick={() => { setEditing(p.id); setForm({ title: p.title, description: p.description, deadline: p.deadline || '', status: p.status }); setError(''); setNotice(''); }}>Өңдеу</Button><Button variant="ghost" disabled={busy} onClick={() => void remove(p)}>Өшіру</Button></div></Card>)}</div>}
  </section>;
}
