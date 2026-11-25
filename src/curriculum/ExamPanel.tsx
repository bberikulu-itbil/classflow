import { useEffect, useState } from 'react';
import { ChevronDown, Eye, Lock, Play, X } from 'lucide-react';
import { sb } from '../config';
import { Button } from '../ui';
import { loadClasses } from '../journal/store';
import { byName } from '../views/session';

// The teacher's side of an exam (071): open it for a class for some minutes, close it early, see the results.
type Exam = { id: string; class_id: string | null; opens_at: string; closes_at: string | null };
type Det = { i: number; ok: boolean; pts: number; max: number; v?: string };
type Res = { exam_id: string; student_id: string; points: number; max_points: number; submitted_at: string; answers?: Record<string, string>; detail?: Det[]; profiles?: { full_name: string } | null };
type Focus = { exam_id: string; student_id: string; kind: string; ms: number | null; at: string };
const KIND: Record<string, string> = { hidden: 'басқа бетке өтті', blur: 'басқа терезеге өтті', fullscreen_exit: 'толық экраннан шықты', paste: 'мәтін қойды' };
const secs = (ms: number) => (ms >= 60000 ? `${Math.floor(ms / 60000)} мин ${Math.round((ms % 60000) / 1000)} с` : `${Math.round(ms / 1000)} с`);
const clock = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** One task of one student's paper: their variant's question, their answer, the right answer. Built from the lesson's slides (the teacher may read the keys). */
function paper(slides: any[], r: Res) {
  return (r.detail || []).map(d => {
    const s = slides[d.i] || {}, vi = d.v ? d.v.charCodeAt(0) - 65 : -1, a = r.answers?.[String(d.i)] ?? '';
    if (s.qvariants) {
      const q = vi >= 0 ? s.qvariants[vi] : null, opt = (k: string) => (k === '' ? '' : `${String.fromCharCode(65 + +k)}. ${q?.options?.[+k] ?? ''}`);
      return { d, title: s.title, prompt: q?.prompt ?? '', mine: opt(a), right: q ? opt(String(q.answer)) : '?' };
    }
    const x = vi >= 0 ? s.xvariants?.[vi] : null, t = vi >= 0 ? s.xtext?.[vi] : null;
    return { d, title: s.title, prompt: t?.prompt ?? '', mine: a, right: x?.accept?.[0] ?? '?' };
  });
}
const when = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const live = (e: Exam) => !e.closes_at || new Date(e.closes_at) > new Date();

export function ExamDialog({ lessonId, title, onClose }: { lessonId: string; title: string; onClose: () => void }) {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [cls, setCls] = useState(''), [mins, setMins] = useState(45);
  const [exams, setExams] = useState<Exam[]>([]), [res, setRes] = useState<Res[]>([]);
  const [focus, setFocus] = useState<Focus[]>([]), [slides, setSlides] = useState<any[]>([]), [open, setOpen] = useState('');
  const [names, setNames] = useState<Record<string, string>>({});
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const name = (id: string | null) => (id ? classes.find(c => c.id === id)?.name || 'сынып' : 'Барлығы');

  // the builder's time (cf_lessons.plan.exam.minutes) is the default
  useEffect(() => { sb.from('cf_lessons').select('plan,slides').eq('id', lessonId).maybeSingle().then(({ data }: any) => { const m = data?.plan?.exam?.minutes; if (m > 0) setMins(m); setSlides(data?.slides || []); }); }, [lessonId]);
  const load = async () => {
    const e = await sb.from('cf_exams').select('id,class_id,opens_at,closes_at').eq('lesson_id', lessonId).order('opens_at', { ascending: false });
    if (e.error) { setErr(/cf_exams/.test(e.error.message) ? 'Емтихан базада әлі қосылмаған (071 миграциясы керек).' : e.error.message); return; }
    setExams((e.data || []) as Exam[]);
    const r = await sb.from('cf_exam_results').select('exam_id,student_id,points,max_points,submitted_at,answers,detail,profiles:student_id(full_name)').eq('lesson_id', lessonId);
    const ids = ((e.data || []) as Exam[]).map(x => x.id);
    const f = ids.length ? await sb.from('cf_exam_focus').select('exam_id,student_id,kind,ms,at').in('exam_id', ids).order('at') : { data: [] };
    const fs = ((f as any).data || []) as Focus[]; setFocus(fs);
    const busyIds = [...new Set(fs.map(x => x.student_id))];
    if (busyIds.length) { const p = await sb.from('profiles').select('id,full_name').in('id', busyIds); setNames(Object.fromEntries(((p.data || []) as any[]).map(x => [x.id, x.full_name]))); }
    setRes(((r.data || []) as any[]).sort((a, b) => byName(a.profiles?.full_name || '', b.profiles?.full_name || '')));
  };
  useEffect(() => { void loadClasses().then(cs => { setClasses(cs); setCls(c => c || cs[0]?.id || ''); }).catch(() => {}); void load(); }, [lessonId]);
  // while an opening is live, refresh every 15 s: who is writing, who left the page
  useEffect(() => { if (!exams.some(live)) return; const t = setInterval(() => void load(), 15000); return () => clearInterval(t); }, [exams]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const act = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(true); setErr('');
    const { error } = await fn();
    setBusy(false);
    if (error) setErr(error.message); else await load();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Емтихан: ${title}`} onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-surface p-5 text-text shadow-pop">
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

        {(() => { // students writing now: started an open exam and not sent yet
          const writing = exams.filter(live).flatMap(e => [...new Set(focus.filter(x => x.exam_id === e.id).map(x => x.student_id))]
            .filter(id => !res.some(r => r.exam_id === e.id && r.student_id === id)).map(id => ({ id, n: focus.filter(x => x.exam_id === e.id && x.student_id === id && x.kind !== 'start' && x.kind !== 'paste' && x.ms === null).length })));
          return writing.length ? <>
            <h4 className="mt-4 mb-1 text-sm font-bold">Қазір тапсырып жатыр: {writing.length}</h4>
            <ul className="flex flex-wrap gap-1.5">{writing.sort((a, b) => byName(names[a.id] || '', names[b.id] || '')).map(w => (
              <li key={w.id} className={`rounded-full px-3 py-1 text-sm ${w.n ? 'bg-warning-soft font-semibold' : 'bg-surface-2'}`}>{names[w.id] || '…'}{w.n ? ` · шықты ${w.n}` : ''}</li>))}</ul>
          </> : null;
        })()}
        <h4 className="mt-4 mb-1 text-sm font-bold">Нәтижелер</h4>
        {!res.length ? <p className="text-sm text-text-muted">Нәтиже жоқ.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-text-secondary"><th className="py-1.5">Оқушы</th><th>Сынып</th><th className="text-right">Ұпай</th><th className="text-right">%</th><th className="text-right">Назардан тыс</th><th className="text-right">Уақыты</th><th className="w-10" /></tr></thead>
            <tbody>{res.map(r => {
              const k = r.exam_id + r.student_id, mine = focus.filter(x => x.exam_id === r.exam_id && x.student_id === r.student_id);
              const leaves = mine.filter(x => x.kind !== 'start' && x.kind !== 'paste' && x.ms === null).length, away = mine.reduce((t, x) => t + (x.ms || 0), 0), pastes = mine.filter(x => x.kind === 'paste').length;
              return [
                <tr key={k} className="border-t border-border/60">
                  <td className="py-1.5">{r.profiles?.full_name || '—'}</td><td className="text-text-secondary">{name(exams.find(e => e.id === r.exam_id)?.class_id ?? null)}</td>
                  <td className="text-right tabular-nums">{r.points} / {r.max_points}</td><td className="text-right font-bold tabular-nums">{r.max_points ? Math.round((r.points / r.max_points) * 100) : 0}</td>
                  <td className={`text-right tabular-nums ${leaves || pastes ? 'font-bold text-warning' : 'text-text-muted'}`}>{leaves || pastes ? `${leaves} рет${away ? ` · ${secs(away)}` : ''}${pastes ? ` · қою ${pastes}` : ''}` : '—'}</td>
                  <td className="text-right text-text-secondary">{when(r.submitted_at)}</td>
                  <td className="text-right"><button type="button" onClick={() => setOpen(o => (o === k ? '' : k))} aria-expanded={open === k} aria-label={`Жауаптары: ${r.profiles?.full_name || ''}`}
                    className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2 cursor-pointer">{open === k ? <ChevronDown size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button></td>
                </tr>,
                open === k && <tr key={k + ':p'}><td colSpan={7} className="pb-3">
                  <ol className="space-y-1.5 rounded-xl bg-surface-2 p-3">{paper(slides, r).map(p => (
                    <li key={p.d.i} className={`rounded-lg border-l-4 bg-surface p-2 ${p.d.ok ? 'border-success' : p.d.pts > 0 ? 'border-warning' : 'border-danger'}`}>
                      <div className="flex flex-wrap items-baseline gap-2"><b>{p.title}</b>{p.d.v && <span className="rounded bg-accent-soft px-1.5 text-xs font-bold text-on-accent-soft">нұсқа {p.d.v}</span>}<span className="ml-auto font-bold tabular-nums">{p.d.pts} / {p.d.max}</span></div>
                      {p.prompt && <p className="text-xs text-text-secondary">{p.prompt}</p>}
                      <p className="mt-0.5 font-mono text-sm">Жауабы: <b className={p.d.ok ? 'text-success' : 'text-danger'}>{p.mine || '— жоқ'}</b>{!p.d.ok && <> · дұрысы: <b>{p.right}</b></>}</p>
                    </li>))}</ol>
                  {mine.some(x => x.kind !== 'start') && <p className="mt-2 text-xs text-text-secondary"><b>Назардан тыс:</b> {mine.filter(x => x.kind !== 'start' && (x.ms === null || x.kind === 'paste')).map(x => `${clock(x.at)} ${KIND[x.kind] || x.kind}`).join(' · ')}</p>}
                </td></tr>,
              ];
            })}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
