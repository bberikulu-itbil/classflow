import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BookOpen, ClipboardCheck, Minus, Target, Trash2, TrendingUp, Users, X } from 'lucide-react';
import { sb } from '../config';
import { addCol, setMark } from '../journal/store';
import { quarterOf, schoolYear } from '../lessons/model';
import { byName } from '../views/session';
import { METHODS, markOf, pctOf, percentiles, type Method } from './grading';

// Data: cf_module_results / cf_module_task_stats / cf_delete_session (migration 066).
type Row = { session_id: string; lesson_id: string; class_id: string | null; class_name: string | null; started_at: string; student_id: string; full_name: string; points: number; max_points: number; done: number; tasks: number };
type Stat = { task_id: string; session_id: string; lesson_id: string; class_id: string | null; kind: string; prompt: string | null; options: string[] | null; points: number; subs: number; correct: number; wrong_answer: string | null; wrong_count: number | null };
type Col = { key: string; session_id: string; lesson_id: string; started_at: string; max: number; tasks: number };
type Me = { id: string; school_id: string };

const day = (iso: string) => new Date(iso).toLocaleDateString('ru-RU'); // 04.11.2026, as in the school journal
const avgOf = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
/** Heatmap colour by percent; the number is always printed on top, so colour is never the only signal. */
const heat = (p: number | null) => (p === null ? '#E2E8F0' : p < 50 ? '#FCA5A5' : p < 70 ? '#FDE68A' : p < 85 ? '#BBF7D0' : '#4ADE80');
const LEGEND: [string, string][] = [['<50', '#FCA5A5'], ['50–69', '#FDE68A'], ['70–84', '#BBF7D0'], ['85+', '#4ADE80'], ['қатыспады', '#E2E8F0']];

export function ModuleAnalytics({ me, courseId, modules, titleOf, onChanged }: {
  me: Me; courseId: string; modules: { id: string; title: string; lessonIds: string[] }[]; titleOf: (lessonId: string) => string; onChanged?: () => void;
}) {
  const [modId, setModId] = useState(modules[0]?.id || '');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [err, setErr] = useState('');
  const [cls, setCls] = useState(() => { try { return localStorage.getItem('cf_an_class') || ''; } catch { return ''; } });
  const [view, setView] = useState<'class' | 'compare'>('class');
  const [roster, setRoster] = useState<Record<string, { id: string; full_name: string }[]>>({});
  const [grade, setGrade] = useState<Col | null>(null);
  const [peek, setPeek] = useState<{ col: Col; student: string; name: string } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!modId) return;
    setRows(null);
    (async () => {
      const [r, s] = await Promise.all([sb.rpc('cf_module_results', { p_module: modId }), sb.rpc('cf_module_task_stats', { p_module: modId })]);
      if (r.error) { setErr(r.error.message); setRows([]); return; }
      setErr(''); setRows((r.data || []) as Row[]); setStats(((s.data || []) as Stat[]));
    })();
  }, [modId, tick]);

  const classes = useMemo(() => [...new Map((rows || []).map(r => [r.class_id || '-', r.class_name || 'Сыныпсыз'])).entries()].sort((a, b) => byName(a[1], b[1])), [rows]);
  const cur = classes.some(([k]) => k === cls) ? cls : classes[0]?.[0] || '';
  const pickClass = (k: string) => { setCls(k); setView('class'); try { localStorage.setItem('cf_an_class', k); } catch { /* remembered for this visit only */ } };

  useEffect(() => { // the whole class list, so absent students show up too
    if (!cur || cur === '-' || roster[cur]) return;
    void sb.from('profiles').select('id,full_name').eq('role', 'student').eq('class_id', cur).is('removed_at', null)
      .then(({ data }) => setRoster(r => ({ ...r, [cur]: (data || []) as { id: string; full_name: string }[] })));
  }, [cur]);

  const mod = modules.find(m => m.id === modId);
  const mine = (rows || []).filter(r => (r.class_id || '-') === cur);
  const cols: Col[] = [...new Map(mine.map(r => [`${r.session_id}:${r.lesson_id}`, { key: `${r.session_id}:${r.lesson_id}`, session_id: r.session_id, lesson_id: r.lesson_id, started_at: r.started_at, max: r.max_points, tasks: r.tasks }])).values()]
    .sort((a, b) => a.started_at.localeCompare(b.started_at));
  const cell = new Map(mine.map(r => [`${r.student_id}|${r.session_id}:${r.lesson_id}`, r]));
  const names = new Map<string, string>([...(roster[cur] || []).map(s => [s.id, s.full_name] as [string, string]), ...mine.map(r => [r.student_id, r.full_name] as [string, string])]);
  const students = [...names.entries()].sort((a, b) => byName(a[1], b[1]));
  const pct = (sid: string, c: Col) => { const r = cell.get(`${sid}|${c.key}`); return r ? (r.max_points > 0 ? Math.round(pctOf(r.points, r.max_points)) : null) : undefined; };
  const colAvg = cols.map(c => avgOf(students.map(([id]) => pct(id, c)).filter((p): p is number => typeof p === 'number')));

  // the numbers on top: mastery and its change from the lesson before, lessons taught, attendance, who needs attention
  const allP = students.flatMap(([id]) => cols.map(c => pct(id, c))).filter((p): p is number => typeof p === 'number');
  const mastery = avgOf(allP), delta = colAvg.length > 1 ? colAvg[colAvg.length - 1] - colAvg[colAvg.length - 2] : null;
  const taught = new Set(cols.map(c => c.lesson_id)), left = (mod?.lessonIds || []).filter(id => !taught.has(id));
  const seen = students.reduce((n, [id]) => n + cols.filter(c => cell.has(`${id}|${c.key}`)).length, 0), slots = students.length * cols.length;
  const attention = students.flatMap(([id, name]) => {
    const ps = cols.map(c => pct(id, c)), missed = ps.filter(p => p === undefined).length, got = ps.filter((p): p is number => typeof p === 'number');
    const low = got.length >= 2 && got.slice(-2).every(p => p < 50);
    return low || missed >= 2 ? [{ id, name, why: [low ? `соңғы 2 сабақта 50%-дан төмен (${got.slice(-2).join('%, ')}%)` : '', missed >= 2 ? `${missed} сабаққа қатыспады` : ''].filter(Boolean).join(' · ') }] : [];
  });
  const trend = (id: string) => {
    const got = cols.map(c => pct(id, c)).filter((p): p is number => typeof p === 'number');
    if (got.length < 2) return 0;
    const last = got[got.length - 1], before = avgOf(got.slice(0, -1));
    return last - before >= 5 ? 1 : before - last >= 5 ? -1 : 0;
  };
  const hard = stats.filter(s => (s.class_id || '-') === cur && s.subs > 0).map(s => ({ ...s, rate: Math.round((s.correct / s.subs) * 100) }))
    .sort((a, b) => a.rate - b.rate).slice(0, 3);
  const wrongText = (s: Stat) => {
    if (!s.wrong_answer || !s.wrong_count) return '';
    const v = s.kind === 'quiz' && s.options ? s.options[+s.wrong_answer] ?? s.wrong_answer : s.wrong_answer;
    return /^[0-9a-f]{8,}$/.test(v) ? '' : `Жиі қате жауап: «${v.length > 40 ? v.slice(0, 40) + '…' : v}» (${s.wrong_count} оқушы)`;
  };

  if (!modules.length) return null;
  const tabCls = (on: boolean) => `min-h-[40px] rounded-lg px-3 text-sm font-semibold cursor-pointer ${on ? 'bg-surface text-text shadow-sm' : 'text-text-secondary hover:text-text'}`;

  return (
    <section aria-label="Модуль талдауы" className="space-y-4" data-testid="module-analytics">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-0 flex-col text-xs text-text-muted">Модуль
          <select value={modId} onChange={e => { setModId(e.target.value); setGrade(null); setPeek(null); }} className="mt-0.5 min-h-[40px] max-w-[22rem] rounded-lg border border-border-input bg-surface px-2 text-sm font-semibold text-text">
            {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </label>
        {classes.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Сынып">
            {classes.map(([k, n]) => <button key={k} type="button" role="tab" aria-selected={view === 'class' && k === cur} onClick={() => pickClass(k)} className={tabCls(view === 'class' && k === cur)}>{n}</button>)}
            {classes.length > 1 && <button type="button" role="tab" aria-selected={view === 'compare'} onClick={() => setView('compare')} className={tabCls(view === 'compare')}>Салыстыру</button>}
          </div>
        )}
      </div>

      {rows === null ? <p className="text-sm text-text-muted">Жүктелуде…</p>
        : err ? <p role="alert" className="text-sm text-danger">{err}</p>
        : !rows.length ? <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-text-muted">Бұл модуль бойынша аяқталған сабақ әлі жоқ. Сабақ аяқталғанда нәтижелер осында өздігінен шығады.</p>
        : view === 'compare' ? <Compare rows={rows} classes={classes} titleOf={titleOf} />
        : (<>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={<Target size={14} aria-hidden="true" />} label="Модуль меңгерілуі" value={`${mastery}%`}
              sub={delta === null ? 'орташа пайыз' : delta === 0 ? 'алдыңғы сабақпен бірдей' : <span className={`inline-flex items-center gap-0.5 ${delta >= 0 ? 'text-success' : 'text-danger'}`}>{delta >= 0 ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}алдыңғы сабақтан {delta >= 0 ? '+' : '−'}{Math.abs(delta)}%</span>} />
            <Kpi icon={<BookOpen size={14} aria-hidden="true" />} label="Өтілді" value={`${taught.size} / ${mod?.lessonIds.length || taught.size}`} sub={left.length ? `қалды: ${left.slice(0, 2).map(titleOf).map(t => t.split(' ')[0]).join(', ')}${left.length > 2 ? '…' : ''}` : 'модуль толық өтілді'} />
            <Kpi icon={<Users size={14} aria-hidden="true" />} label="Қатысу" value={slots ? `${Math.round((seen / slots) * 100)}%` : '—'} sub={`${students.length} оқушы × ${cols.length} сабақ`} />
            <Kpi icon={<AlertTriangle size={14} aria-hidden="true" />} label="Назар керек" value={String(attention.length)} sub="төмен нәтиже немесе қатыспау" tone={attention.length ? 'text-danger' : 'text-success'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 rounded-xl border border-border bg-surface p-4 lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold">Оқушылар × сабақтар</h3>
                <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-text-muted">{LEGEND.map(([t, c]) => <span key={t} className="inline-flex items-center gap-1"><i aria-hidden="true" className="h-3 w-3 rounded" style={{ background: c }} />{t}</span>)}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-text-secondary">
                      <th className="sticky left-0 bg-surface py-1 pr-2 text-left font-semibold">Оқушы</th>
                      {cols.map(c => (
                        <th key={c.key} className="min-w-[3.5rem] px-0.5 font-semibold">
                          <button type="button" onClick={() => setGrade(c)} title={`${titleOf(c.lesson_id)} · ${day(c.started_at)} — бағалау`}
                            className="w-full rounded-md px-1 py-1 hover:bg-surface-2 cursor-pointer">{titleOf(c.lesson_id).split(' ')[0]}<span className="block text-[10px] font-normal text-text-muted">{day(c.started_at).slice(0, 5)}</span></button>
                        </th>
                      ))}
                      <th className="px-1 text-right font-semibold">Орташа</th><th className="px-1 font-semibold">Үрдіс</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(([id, name]) => {
                      const got = cols.map(c => pct(id, c)).filter((p): p is number => typeof p === 'number'), t = trend(id);
                      return (
                        <tr key={id} className="hover:bg-surface-2/40">
                          <td className="sticky left-0 bg-surface py-0.5 pr-2 font-medium whitespace-nowrap">{name}</td>
                          {cols.map(c => {
                            const p = pct(id, c), r = cell.get(`${id}|${c.key}`);
                            return (
                              <td key={c.key} className="p-0.5">
                                <button type="button" disabled={!r} onClick={() => setPeek({ col: c, student: id, name })} aria-label={`${name}, ${titleOf(c.lesson_id)}: ${r ? `${r.points} / ${r.max_points}` : 'қатыспады'}`}
                                  className="grid h-8 w-full place-items-center rounded-md text-xs font-bold enabled:cursor-pointer enabled:hover:ring-2 enabled:hover:ring-accent" style={{ background: p === undefined ? '#E2E8F0' : p === null ? '#DBEAFE' : heat(p), color: '#0f172a' }}>{p === undefined ? '—' : p === null ? '✓' : p}</button>
                              </td>
                            );
                          })}
                          <td className="px-1 text-right font-black tabular-nums">{got.length ? `${avgOf(got)}%` : '—'}</td>
                          <td className="px-1 text-center">{t > 0 ? <ArrowUpRight size={16} className="inline text-success" aria-label="өсуде" /> : t < 0 ? <ArrowDownRight size={16} className="inline text-danger" aria-label="төмендеуде" /> : <Minus size={14} className="inline text-text-muted" aria-label="тұрақты" />}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-border text-xs text-text-secondary">
                      <td className="sticky left-0 bg-surface py-1.5 font-semibold">Сынып орташасы</td>
                      {colAvg.map((a, j) => <td key={j} className="text-center font-bold">{a}%</td>)}<td /><td />
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-text-muted">Сабақ атауын бассаңыз — бағалау терезесі (балл, персентиль, журналға жіберу); ұяшықты бассаңыз — оқушының жауаптары.</p>
            </div>

            <div className="space-y-4">
              <div className={`rounded-xl border p-4 ${attention.length ? 'border-danger/40 bg-danger-soft' : 'border-border bg-surface'}`}>
                <h3 className={`flex items-center gap-2 font-bold ${attention.length ? 'text-danger' : ''}`}><AlertTriangle size={16} aria-hidden="true" />Назар керек</h3>
                {attention.length ? (
                  <ul className="mt-2 space-y-2 text-sm">{attention.map(a => <li key={a.id} className="rounded-lg bg-surface p-2"><b>{a.name}</b><br /><span className="text-xs text-text-secondary">{a.why}</span></li>)}</ul>
                ) : <p className="mt-1 text-sm text-text-secondary">Барлығы қалыпты.</p>}
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <h3 className="flex items-center gap-2 font-bold"><TrendingUp size={16} aria-hidden="true" />Сынып динамикасы</h3>
                <Spark vals={colAvg} labels={cols.map(c => titleOf(c.lesson_id).split(' ')[0])} />
                {colAvg.length > 1 && <p className="text-xs text-text-secondary">Бірінші сабақ {colAvg[0]}% → соңғы {colAvg[colAvg.length - 1]}%</p>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="font-bold">Ең қиын тапсырмалар <span className="text-xs font-normal text-text-muted">— толық дұрыс орындағандар үлесі бойынша</span></h3>
            {hard.length ? (
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {hard.map(s => (
                  <div key={s.task_id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-2 text-sm font-semibold"><span className="line-clamp-2">{titleOf(s.lesson_id).split(' ')[0]} · {s.prompt || 'Тапсырма'}</span><span className={s.rate < 50 ? 'text-danger' : 'text-warning'}>{s.rate}%</span></div>
                    <div className="mt-1 h-1.5 rounded bg-surface-2"><div className={`h-1.5 rounded ${s.rate < 50 ? 'bg-danger' : 'bg-warning'}`} style={{ width: `${s.rate}%` }} /></div>
                    <p className="mt-2 text-xs text-text-secondary">{s.correct} / {s.subs} оқушы толық дұрыс</p>
                    {wrongText(s) && <p className="text-xs text-text-secondary">{wrongText(s)}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="mt-1 text-sm text-text-muted">Тапсырма жауаптары әлі жоқ.</p>}
          </div>
        </>)}

      {grade && <GradeDialog me={me} courseId={courseId} col={grade} classId={cur} title={titleOf(grade.lesson_id)} rows={mine.filter(r => `${r.session_id}:${r.lesson_id}` === grade.key)}
        onClose={() => setGrade(null)} onDeleted={() => { setGrade(null); setTick(n => n + 1); onChanged?.(); }} />}
      {peek && <Answers col={peek.col} student={peek.student} name={peek.name} title={titleOf(peek.col.lesson_id)} onClose={() => setPeek(null)} />}
    </section>
  );
}

const Kpi = ({ icon, label, value, sub, tone = '' }: { icon: React.ReactNode; label: string; value: string; sub: React.ReactNode; tone?: string }) => (
  <div className="rounded-xl border border-border bg-surface p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">{icon}{label}</div>
    <p className={`mt-1 text-3xl font-black ${tone}`}>{value}</p>
    <p className="text-[11px] text-text-muted">{sub}</p>
  </div>
);

function Spark({ vals, labels }: { vals: number[]; labels: string[] }) {
  if (vals.length < 2) return <p className="mt-2 text-sm text-text-muted">Динамика екі сабақтан кейін көрінеді.</p>;
  const W = 280, H = 80, lo = Math.max(0, Math.min(...vals) - 10), hi = Math.min(100, Math.max(...vals) + 10);
  const x = (j: number) => 12 + (j * (W - 24)) / (vals.length - 1), y = (v: number) => H - 16 - ((v - lo) / Math.max(1, hi - lo)) * (H - 28);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`Сынып орташасы: ${vals.join(', ')}`}>
      <polyline fill="none" stroke="var(--color-accent)" strokeWidth="2.5" points={vals.map((v, j) => `${x(j)},${y(v)}`).join(' ')} />
      {vals.map((v, j) => <g key={j}><circle cx={x(j)} cy={y(v)} r="3.5" fill="var(--color-accent)"><title>{labels[j]}: {v}%</title></circle><text x={x(j)} y={H - 2} fontSize="9" textAnchor="middle" fill="currentColor" opacity=".6">{labels[j]}</text></g>)}
    </svg>
  );
}

/** One lesson across classes: the class average of each lesson, side by side. */
function Compare({ rows, classes, titleOf }: { rows: Row[]; classes: [string, string][]; titleOf: (id: string) => string }) {
  const lessons = [...new Set(rows.map(r => r.lesson_id))].sort((a, b) => byName(titleOf(a), titleOf(b)));
  const avg = (lid: string, cid: string) => { const xs = rows.filter(r => r.lesson_id === lid && (r.class_id || '-') === cid && r.max_points > 0).map(r => pctOf(r.points, r.max_points)); return xs.length ? avgOf(xs) : null; };
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface p-4">
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-text-secondary"><th className="py-1 text-left font-semibold">Сабақ</th>{classes.map(([k, n]) => <th key={k} className="px-2 text-left font-semibold">{n}</th>)}</tr></thead>
        <tbody className="divide-y divide-border/60">
          {lessons.map(l => (
            <tr key={l}>
              <td className="py-2 pr-3 font-medium">{titleOf(l)}</td>
              {classes.map(([k]) => { const a = avg(l, k); return (
                <td key={k} className="min-w-[8rem] px-2">{a === null ? <span className="text-xs text-text-muted">өтілмеген</span> : (
                  <div className="flex items-center gap-2"><div className="h-2 flex-1 rounded bg-surface-2"><div className="h-2 rounded" style={{ width: `${a}%`, background: heat(a) }} /></div><b className="w-10 text-right tabular-nums">{a}%</b></div>
                )}</td>
              ); })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Overlay = ({ label, onClose, children, wide = false }: { label: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) => {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()} className={`max-h-[90vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-auto rounded-2xl bg-surface p-5 text-text shadow-pop`}>
        <div className="mb-3 flex items-start gap-2"><h3 className="flex-1 text-lg font-black">{label}</h3>
          <button type="button" onClick={onClose} aria-label="Жабу" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-surface-2 cursor-pointer"><X size={18} aria-hidden="true" /></button></div>
        {children}
      </div>
    </div>
  );
};

/** End-of-lesson grading: points → percent → percentile → a 1-10 formative mark by the chosen method; marks can be edited, then go to the journal as one ҚБ column. */
function GradeDialog({ me, courseId, col, classId, title, rows, onClose, onDeleted }: {
  me: Me; courseId: string; col: Col; classId: string; title: string; rows: Row[]; onClose: () => void; onDeleted: () => void;
}) {
  const key = 'cf_grading_' + courseId;
  const [m, setM] = useState<Method>(() => { try { return (localStorage.getItem(key) as Method) || 'scale'; } catch { return 'scale'; } });
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(''), [msg, setMsg] = useState('');
  const list = [...rows].sort((a, b) => byName(a.full_name, b.full_name));
  const pc = list.map(r => pctOf(r.points, r.max_points)), pr = percentiles(list.map(r => r.points));
  const auto = list.map((_, i) => markOf(m, pc[i], pr[i]));
  const final = list.map((r, i) => { const e = edit[r.student_id]; return e === undefined ? auto[i] : e === '' ? null : Math.min(10, Math.max(1, Math.round(+e))) || null; });
  const dist = Array.from({ length: 10 }, (_, k) => final.filter(x => x === 10 - k).length);
  const choose = (k: Method) => { setM(k); setEdit({}); try { localStorage.setItem(key, k); } catch { /* not remembered */ } };

  const send = async () => {
    if (classId === '-') { setMsg('Сабақ сыныпқа байланбаған — журналға жіберу мүмкін емес.'); return; }
    setBusy('send'); setMsg('');
    try {
      const d = new Date(col.started_at), held_on = d.toISOString().slice(0, 10), t = `ҚБ: ${title}`.slice(0, 60);
      const ex = await sb.from('cf_assessments').select('id').eq('class_id', classId).eq('held_on', held_on).eq('title', t).maybeSingle();
      const id = ex.data?.id || (await addCol(me, { class_id: classId, school_year: schoolYear(d), quarter: quarterOf(d), kind: 'kb', title: t, held_on, max_points: 10 })).id;
      for (const [i, r] of list.entries()) await setMark(me, id, r.student_id, final[i]);
      setMsg(`Журналға жіберілді: «${t}», ${final.filter(x => x !== null).length} балл.`);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(''); }
  };
  const del = async () => {
    if (!window.confirm(`«${title}» (${day(col.started_at)}) сабағын өшіресіз бе?\nОсы сабақтағы барлық тапсырма, жауап және ұпай біржола жойылады.`)) return;
    setBusy('del');
    const { error } = await sb.rpc('cf_delete_session', { p_session: col.session_id });
    setBusy('');
    if (error) setMsg(error.message); else onDeleted();
  };

  return (
    <Overlay label={`Бағалау: ${title} · ${day(col.started_at)}`} onClose={onClose} wide>
      <div className="grid gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Бағалау әдісі">
        {METHODS.map(x => (
          <button key={x.k} type="button" role="radio" aria-checked={m === x.k} onClick={() => choose(x.k)}
            className={`rounded-xl border p-2.5 text-left cursor-pointer ${m === x.k ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface-2'}`}>
            <b className="text-sm">{x.name}</b><span className="block text-[11px] leading-tight text-text-secondary">{x.hint}</span>
          </button>
        ))}
      </div>
      {m !== 'points' && (
        <div className="mt-3 flex items-end gap-1" aria-label="Балл бөлінісі">
          {dist.map((n, k) => <div key={k} className="flex flex-1 flex-col items-center gap-0.5 text-[10px] text-text-muted"><span>{n || ''}</span><div className="w-full rounded-t bg-accent" style={{ height: `${4 + n * 10}px`, opacity: n ? 1 : 0.15 }} /><span className="font-bold text-text-secondary">{10 - k}</span></div>)}
        </div>
      )}
      <table className="mt-3 w-full text-sm">
        <thead><tr className="border-b border-border text-xs text-text-secondary"><th className="py-1.5 text-left font-semibold">Оқушы</th><th className="text-right font-semibold">Ұпай</th><th className="text-right font-semibold">%</th><th className="text-right font-semibold" title="Сыныптағы орны: неше пайызынан жоғары">PR</th><th className="w-20 text-right font-semibold">Балл</th></tr></thead>
        <tbody className="divide-y divide-border/60">
          {list.map((r, i) => (
            <tr key={r.student_id}>
              <td className="py-1.5 pr-2">{r.full_name}</td>
              <td className="text-right tabular-nums">{r.points} / {r.max_points}</td>
              <td className="text-right tabular-nums">{Math.round(pc[i])}</td>
              <td className="text-right tabular-nums text-text-secondary">{Math.round(pr[i])}</td>
              <td className="text-right">
                {m === 'points' ? <span className="text-text-muted">—</span> : (
                  <input type="number" min={1} max={10} inputMode="numeric" aria-label={`${r.full_name}: балл`} value={edit[r.student_id] ?? String(auto[i] ?? '')}
                    onChange={e => setEdit(x => ({ ...x, [r.student_id]: e.target.value }))}
                    className={`h-9 w-16 rounded-lg border px-2 text-right font-bold ${edit[r.student_id] !== undefined ? 'border-accent' : 'border-border-input'} bg-surface`} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <p role="status" className="mt-3 text-sm text-text-secondary">{msg}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={del} disabled={!!busy} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger-soft cursor-pointer disabled:opacity-50"><Trash2 size={16} aria-hidden="true" />Сабақты өшіру</button>
        <button type="button" onClick={send} disabled={!!busy || m === 'points' || !list.length} className="ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent cursor-pointer disabled:opacity-50"><ClipboardCheck size={16} aria-hidden="true" />{busy === 'send' ? 'Жіберілуде…' : 'Журналға жіберу (ҚБ)'}</button>
      </div>
    </Overlay>
  );
}

/** One student's answers in one lesson of a session. */
function Answers({ col, student, name, title, onClose }: { col: Col; student: string; name: string; title: string; onClose: () => void }) {
  const [list, setList] = useState<{ id: string; prompt: string; kind: string; options: string[] | null; answer: string; meta: any; is_correct: boolean | null; points: number | null; max: number }[] | null>(null);
  useEffect(() => { void (async () => {
    const t = await sb.from('cf_tasks').select('id,prompt,kind,options,points,slide_index').eq('session_id', col.session_id).eq('lesson_id', col.lesson_id).order('slide_index');
    const ids = (t.data || []).map((x: any) => x.id);
    const s = ids.length ? await sb.from('cf_submissions').select('task_id,answer,meta,is_correct,points').eq('student_id', student).in('task_id', ids) : { data: [] };
    const by = new Map((s.data || []).map((x: any) => [x.task_id, x]));
    setList((t.data || []).map((x: any) => { const b: any = by.get(x.id); return { id: x.id, prompt: x.prompt || 'Тапсырма', kind: x.kind, options: x.options, answer: b?.answer ?? '', meta: b?.meta, is_correct: b ? b.is_correct : null, points: b ? b.points : null, max: x.points }; }));
  })(); }, [col.key, student]);
  const shown = (a: { kind: string; options: string[] | null; answer: string; meta: any }) =>
    a.meta?.sql || (a.kind === 'quiz' && a.options ? a.options[+a.answer] ?? a.answer : a.kind === 'sheet' ? 'кесте' : a.answer);
  return (
    <Overlay label={`${name} · ${title}`} onClose={onClose}>
      {!list ? <p className="text-sm text-text-muted">Жүктелуде…</p> : !list.length ? <p className="text-sm text-text-muted">Бұл сабақта тапсырма болмаған.</p> : (
        <ul className="space-y-2">{list.map(a => (
          <li key={a.id} className={`rounded-lg border p-2.5 text-sm ${a.is_correct === null ? 'border-border' : a.is_correct ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft'}`}>
            <div className="flex gap-2"><span className="flex-1 font-semibold">{a.prompt}</span><span className="tabular-nums text-text-secondary">{a.points ?? 0} / {a.max}</span></div>
            <p className="mt-1 break-words font-mono text-xs text-text-secondary">{a.is_correct === null ? 'жауап бермеді' : shown(a)}</p>
          </li>
        ))}</ul>
      )}
    </Overlay>
  );
}
