import { useEffect, useState } from 'react';
import { Lock, Play, X } from 'lucide-react';
import { sb } from '../config';
import { Button } from '../ui';
import { loadClasses } from '../journal/store';
import { byName } from '../views/session';

// The teacher's side of an exam (071): open it for a class for some minutes, close it early, see the results.
type Exam = { id: string; class_id: string | null; opens_at: string; closes_at: string | null };
type Res = { exam_id: string; student_id: string; points: number; max_points: number; submitted_at: string; profiles?: { full_name: string } | null };
const when = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const live = (e: Exam) => !e.closes_at || new Date(e.closes_at) > new Date();

export function ExamDialog({ lessonId, title, onClose }: { lessonId: string; title: string; onClose: () => void }) {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [cls, setCls] = useState(''), [mins, setMins] = useState(45);
  const [exams, setExams] = useState<Exam[]>([]), [res, setRes] = useState<Res[]>([]);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const name = (id: string | null) => (id ? classes.find(c => c.id === id)?.name || 'сынып' : 'Барлығы');

  // the builder's time (cf_lessons.plan.exam.minutes) is the default
  useEffect(() => { sb.from('cf_lessons').select('plan').eq('id', lessonId).maybeSingle().then(({ data }: any) => { const m = data?.plan?.exam?.minutes; if (m > 0) setMins(m); }); }, [lessonId]);
  const load = async () => {
    const e = await sb.from('cf_exams').select('id,class_id,opens_at,closes_at').eq('lesson_id', lessonId).order('opens_at', { ascending: false });
    if (e.error) { setErr(/cf_exams/.test(e.error.message) ? 'Емтихан базада әлі қосылмаған (071 миграциясы керек).' : e.error.message); return; }
    setExams((e.data || []) as Exam[]);
    const r = await sb.from('cf_exam_results').select('exam_id,student_id,points,max_points,submitted_at,profiles:student_id(full_name)').eq('lesson_id', lessonId);
    setRes(((r.data || []) as any[]).sort((a, b) => byName(a.profiles?.full_name || '', b.profiles?.full_name || '')));
  };
  useEffect(() => { void loadClasses().then(cs => { setClasses(cs); setCls(c => c || cs[0]?.id || ''); }).catch(() => {}); void load(); }, [lessonId]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const act = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true); setErr('');
    const { error } = await fn();
    setBusy(false);
    if (error) setErr(error.message); else await load();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Емтихан: ${title}`} onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-surface p-5 text-text shadow-pop">
        <div className="mb-3 flex items-start gap-2">
          <div className="flex-1"><h3 className="text-lg font-black">Емтихан</h3><p className="text-sm text-text-secondary">{title}</p></div>
          <button type="button" onClick={onClose} aria-label="Жабу" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2 cursor-pointer"><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="mb-3 text-sm text-text-secondary">Оқушылар емтиханды курста көреді, бірақ сіз ашқан уақытта ғана тапсырады. Әр ашылымда бір-ақ рет; тест пен қысқа жауаптарды сервер өзі тексереді.</p>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3">
          <label className="flex flex-col text-xs text-text-muted">Сынып
            <select value={cls} onChange={e => setCls(e.target.value)} className="mt-0.5 h-10 rounded-lg border border-border-input bg-surface px-2 text-sm text-text">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}<option value="">Курсты көретін барлығы</option>
            </select></label>
          <label className="flex flex-col text-xs text-text-muted">Уақыты
            <select value={mins} onChange={e => setMins(+e.target.value)} className="mt-0.5 h-10 rounded-lg border border-border-input bg-surface px-2 text-sm text-text">
              {[...new Set([15, 20, 30, 40, 45, 60, 90, mins || 45])].sort((a, b) => a - b).map(m => <option key={m} value={m}>{m} минут</option>)}<option value={0}>Мен жапқанша</option>
            </select></label>
          <Button onClick={() => act(() => sb.rpc('cf_exam_open', { p_lesson: lessonId, p_class: cls || null, p_minutes: mins }))} loading={busy} className="gap-1.5"><Play size={14} aria-hidden="true" />Ашу</Button>
        </div>
        {err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}

        <h4 className="mt-4 mb-1 text-sm font-bold">Ашылымдар</h4>
        {!exams.length ? <p className="text-sm text-text-muted">Әлі ашылмаған.</p> : (
          <ul className="space-y-1.5">{exams.map(e => { const n = res.filter(r => r.exam_id === e.id).length; return (
            <li key={e.id} className={`flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm ${live(e) ? 'border-success/50 bg-success-soft' : 'border-border'}`}>
              <b>{name(e.class_id)}</b><span className="text-text-secondary">{when(e.opens_at)} → {e.closes_at ? when(e.closes_at) : 'жабылғанша'}</span>
              <span className="text-text-secondary">· тапсырды: {n}</span>
              {live(e) && <Button variant="secondary" onClick={() => act(() => sb.rpc('cf_exam_close', { p_exam: e.id }))} className="ml-auto !min-h-[36px] gap-1.5 text-xs"><Lock size={13} aria-hidden="true" />Жабу</Button>}
            </li>); })}</ul>
        )}

        <h4 className="mt-4 mb-1 text-sm font-bold">Нәтижелер</h4>
        {!res.length ? <p className="text-sm text-text-muted">Нәтиже жоқ.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-text-secondary"><th className="py-1.5">Оқушы</th><th>Сынып</th><th className="text-right">Ұпай</th><th className="text-right">%</th><th className="text-right">Уақыты</th></tr></thead>
            <tbody className="divide-y divide-border/60">{res.map(r => (
              <tr key={r.exam_id + r.student_id}><td className="py-1.5">{r.profiles?.full_name || '—'}</td><td className="text-text-secondary">{name(exams.find(e => e.id === r.exam_id)?.class_id ?? null)}</td>
                <td className="text-right tabular-nums">{r.points} / {r.max_points}</td><td className="text-right font-bold tabular-nums">{r.max_points ? Math.round((r.points / r.max_points) * 100) : 0}</td>
                <td className="text-right text-text-secondary">{when(r.submitted_at)}</td></tr>))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
