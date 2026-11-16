import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Search, X } from 'lucide-react';
import { sb } from '../config';
import { Button } from '../ui';
import { loadClasses } from '../journal/store';
import { byName } from '../views/session';
import type { Course } from './store';

// Who sees a course (cf_curr_courses.shared + audience + audience_ids, migration 068; checked by cf_course_open on the server).
export type Audience = 'closed' | 'all' | 'grade' | 'classes' | 'students';
const of = (c: Course): Audience => (!c.shared ? 'closed' : (c.audience as Audience) || 'grade');

/** One line for the menu and the course page: «Жабық», «7-сынып параллелі», «7А, 7Б», «3 оқушы». */
export function audienceText(c: Course, classNames: Record<string, string> = {}) {
  const a = of(c), ids = c.audience_ids || [];
  return a === 'closed' ? 'Оқушыларға жабық' : a === 'all' || (a === 'grade' && !c.grade) ? 'Барлық оқушыға'
    : a === 'grade' ? `${c.grade}-сынып параллеліне` : a === 'classes' ? (ids.map(i => classNames[i]).filter(Boolean).sort(byName).join(', ') || 'сынып таңдалмаған')
    : `${ids.length} оқушыға`;
}

const OPTS: { k: Audience; t: string; d: string }[] = [
  { k: 'closed', t: 'Жабық', d: 'Оқушылар курсты көрмейді' },
  { k: 'all', t: 'Барлық оқушыға', d: 'Мектептің кез келген оқушысы' },
  { k: 'grade', t: 'Параллельге', d: 'Курстың сыныбы бойынша (мысалы, барлық 8-сынып)' },
  { k: 'classes', t: 'Таңдалған сыныптарға', d: 'Мысалы, тек 7А және 7Б' },
  { k: 'students', t: 'Таңдалған оқушыларға', d: 'Олимпиада тобы, үйірме' },
];

export function CourseAudienceDialog({ course, onClose, onSaved }: { course: Course; onClose: () => void; onSaved: () => void }) {
  const [a, setA] = useState<Audience>(of(course));
  const [ids, setIds] = useState<string[]>(course.audience_ids || []);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [cls, setCls] = useState(''), [q, setQ] = useState('');
  const [students, setStudents] = useState<{ id: string; full_name: string; class_id: string | null }[]>([]);
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');

  useEffect(() => { void loadClasses().then(cs => { setClasses(cs); setCls(c => c || cs[0]?.id || ''); }).catch(() => {}); }, []);
  useEffect(() => { // students: those already chosen plus the class being browsed
    if (a !== 'students') return;
    void sb.from('profiles').select('id,full_name,class_id').eq('role', 'student').is('removed_at', null)
      .or([cls && `class_id.eq.${cls}`, ids.length && `id.in.(${ids.join(',')})`].filter(Boolean).join(',') || 'id.is.null')
      .then(({ data }) => setStudents(((data || []) as any[]).sort((x, y) => byName(x.full_name, y.full_name))));
  }, [a, cls]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const toggle = (id: string) => setIds(x => (x.includes(id) ? x.filter(y => y !== id) : [...x, id]));
  const pick = (k: Audience) => { setA(k); if (k !== a) setIds([]); };
  const save = async () => {
    if ((a === 'classes' || a === 'students') && !ids.length) { setErr(a === 'classes' ? 'Кемінде бір сынып таңдаңыз' : 'Кемінде бір оқушы таңдаңыз'); return; }
    setBusy(true); setErr('');
    const { error } = await sb.from('cf_curr_courses').update({ shared: a !== 'closed', audience: a === 'closed' ? 'grade' : a, audience_ids: a === 'classes' || a === 'students' ? ids : [] }).eq('id', course.id);
    setBusy(false);
    if (error) setErr(/audience/.test(error.message) ? 'Базада 068 миграциясы әлі жоқ.' : error.message); else { onSaved(); onClose(); }
  };
  const shown = students.filter(s => (q ? s.full_name.toLowerCase().includes(q.toLowerCase()) : s.class_id === cls));
  const chosen = students.filter(s => ids.includes(s.id));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Курстың оқушыларға көрінуі" onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-surface p-5 text-text shadow-pop">
        <div className="mb-3 flex items-start gap-2">
          <div className="flex-1"><h3 className="text-lg font-black">Оқушыларға көрінуі</h3><p className="text-sm text-text-secondary">{course.title}</p></div>
          <button type="button" onClick={onClose} aria-label="Жабу" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2 cursor-pointer"><X size={18} aria-hidden="true" /></button>
        </div>
        <div role="radiogroup" aria-label="Кімге көрінеді" className="space-y-1.5">
          {OPTS.map(o => {
            const off = o.k === 'grade' && !course.grade;
            return (
              <button key={o.k} type="button" role="radio" aria-checked={a === o.k} disabled={off} onClick={() => pick(o.k)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${a === o.k ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface-2'}`}>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${a === o.k ? 'border-accent bg-accent text-on-accent' : 'border-border-input'}`}>{a === o.k && <Check size={12} aria-hidden="true" />}</span>
                <span className="flex-1"><b className="flex items-center gap-1.5 text-sm">{o.k === 'closed' ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}{o.t}{o.k === 'grade' && course.grade ? ` (${course.grade}-сынып)` : ''}</b>
                  <span className="block text-xs text-text-secondary">{off ? 'Курсқа сынып (параллель) көрсетілмеген — «Ақпарат» бөлімінде қойыңыз' : o.d}</span></span>
              </button>
            );
          })}
        </div>

        {a === 'classes' && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Сыныптар">
            {classes.map(c => <button key={c.id} type="button" aria-pressed={ids.includes(c.id)} onClick={() => toggle(c.id)}
              className={`min-h-[40px] rounded-lg border px-3 text-sm font-semibold cursor-pointer ${ids.includes(c.id) ? 'border-accent bg-accent text-on-accent' : 'border-border hover:bg-surface-2'}`}>{c.name}</button>)}
          </div>
        )}

        {a === 'students' && (
          <div className="mt-3 space-y-2">
            {chosen.length > 0 && <div className="flex flex-wrap gap-1">{chosen.map(s => <span key={s.id} className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold">{s.full_name}
              <button type="button" aria-label={`${s.full_name}: алып тастау`} onClick={() => toggle(s.id)} className="cursor-pointer"><X size={12} aria-hidden="true" /></button></span>)}</div>}
            <div className="flex gap-2">
              <select aria-label="Сынып" value={cls} onChange={e => { setCls(e.target.value); setQ(''); }} className="h-10 rounded-lg border border-border-input bg-surface px-2 text-sm">{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <label className="relative flex-1"><Search size={14} aria-hidden="true" className="absolute left-2.5 top-3 text-text-muted" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Осы сыныптан іздеу" aria-label="Оқушыны іздеу" className="h-10 w-full rounded-lg border border-border-input bg-surface pl-8 pr-2 text-sm" /></label>
            </div>
            <ul className="max-h-56 space-y-0.5 overflow-auto rounded-lg border border-border p-1">
              {shown.map(s => <li key={s.id}><label className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-surface-2">
                <input type="checkbox" className="h-4 w-4" checked={ids.includes(s.id)} onChange={() => toggle(s.id)} />{s.full_name}</label></li>)}
              {!shown.length && <li className="p-2 text-sm text-text-muted">Оқушы табылмады</li>}
            </ul>
          </div>
        )}

        {err && <p role="alert" className="mt-3 text-sm text-danger">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Болдырмау</Button>
          <Button onClick={save} loading={busy}>Сақтау</Button>
        </div>
      </div>
    </div>
  );
}
