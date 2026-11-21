// The exam builder (БЖБ/ТЖБ): not a slide editor. Tasks on the left; the chosen task on the right with its variants A–D
// (each student gets one variant per task), the right answer marked in place, and the task as the student will see it.
import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleAlert, ClipboardCheck, Copy, Eye, ListChecks, Plus, Shuffle, TextCursorInput, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Button, ErrorBox, Skeleton } from '../ui';
import * as st from '../curriculum/store';
import { Match } from '../curriculum/Match';
import { KIND, blankTask, blankVar, clash, fromSlides, papers, problems, shuffled, toSlides, total, type Exam, type Kind, type Task, type Var } from './model';
import { VariantMaker } from './VariantMaker';

type Me = { id: string; school_id: string };
const ICON: Record<Kind, typeof ListChecks> = { quiz: ListChecks, short: TextCursorInput, match: Shuffle };
const inp = 'w-full rounded-lg border border-border-input bg-surface px-3 py-2 text-sm';
const L = (i: number) => String.fromCharCode(65 + i);

function decode(id: string) { const [lessonId, q] = id.split('?'); return { lessonId, moduleId: new URLSearchParams(q || '').get('module') || '' }; }

export function ExamBuilder({ id, me }: { id: string; me: Me }) {
  const route = decode(id), isNew = route.lessonId === 'new';
  const [e, setE] = useState<Exam | null>(null);
  const [plan, setPlan] = useState<Record<string, any>>({});
  const [back, setBack] = useState('#lessons/courses');
  const [at, setAt] = useState(0), [vi, setVi] = useState(0);
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [tried, setTried] = useState(false), [saved, setSaved] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const curr = await st.loadCurr(me);
        const mid = route.moduleId || curr.places.find(p => p.lesson_id === route.lessonId)?.module_id;
        const cid = curr.modules.find(m => m.id === mid)?.course_id;
        if (cid) setBack('#course/' + cid);
        if (isNew) { setE({ title: 'БЖБ: ', minutes: 40, tasks: [blankTask('quiz', 1)] }); return; }
        const { data, error } = await sb.from('cf_lessons').select('title,slides,plan').eq('id', route.lessonId).single();
        if (error) throw new Error(error.message);
        const p = data.plan && typeof data.plan === 'object' ? data.plan : {};
        setPlan(p);
        setE(Array.isArray(p.exam?.tasks) ? { title: data.title, minutes: p.exam.minutes || 40, tasks: p.exam.tasks } : fromSlides(data.title, data.slides, p.exam?.minutes));
      } catch (x) { setErr((x as Error).message); }
    })();
  }, [id]);

  if (err && !e) return <main className="mx-auto max-w-6xl p-4"><ErrorBox message={err} /></main>;
  if (!e) return <main className="mx-auto max-w-6xl p-4"><Skeleton /></main>;

  const t = e.tasks[Math.min(at, e.tasks.length - 1)];
  const v = t?.vars[Math.min(vi, t.vars.length - 1)];
  const issues = problems(e);
  const set = (p: Partial<Exam>) => { setE({ ...e, ...p }); setSaved(''); };
  const setT = (p: Partial<Task>) => set({ tasks: e.tasks.map((x, i) => (i === at ? { ...x, ...p } : x)) });
  const setV = (p: Partial<Var>) => setT({ vars: t.vars.map((x, j) => (j === vi ? { ...x, ...p } : x)) });
  const addTask = (k: Kind) => { set({ tasks: [...e.tasks, blankTask(k, e.tasks.length + 1)] }); setAt(e.tasks.length); setVi(0); };
  const moveTask = (d: number) => { const a = [...e.tasks]; [a[at], a[at + d]] = [a[at + d], a[at]]; set({ tasks: a }); setAt(at + d); };
  const taskOk = (x: Task, i: number) => !problems({ ...e, title: 'x', tasks: e.tasks.map((y, j) => (j === i ? y : { ...y, vars: [] })) }).length;

  const save = async () => {
    setTried(true); setErr('');
    if (issues.length) return;
    if (DEMO) { setErr('Демо режимде сақталмайды'); return; }
    setBusy(true);
    try {
      const row = { title: e.title.trim(), subject: 'БЖБ', slides: toSlides(e), plan: { ...plan, exam: { minutes: e.minutes, tasks: e.tasks } } };
      if (isNew) {
        const r = await sb.from('cf_lessons').insert({ ...row, owner_id: me.id, school_id: me.school_id }).select('id').single();
        if (r.error) throw new Error(r.error.message);
        if (route.moduleId) {
          const curr = await st.loadCurr(me);
          await st.placeLesson(me, r.data.id, route.moduleId, st.nextPosition(curr.places.filter(p => p.module_id === route.moduleId)));
          await st.setExam(me, r.data.id, true);
        }
        window.location.hash = 'exam/' + r.data.id;
      } else {
        const r = await sb.from('cf_lessons').update({ ...row, updated_at: new Date().toISOString() }).eq('id', route.lessonId);
        if (r.error) throw new Error(r.error.message);
        setPlan(row.plan); setSaved('Сақталды');
      }
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:p-5">
        <a href={back} className="inline-flex items-center gap-1 text-sm font-medium text-violet-800 hover:underline"><ArrowLeft size={15} aria-hidden="true" />Курсқа оралу</a>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white" aria-hidden="true"><ClipboardCheck size={28} /></span>
          <label className="min-w-0 flex-[1_1_320px]"><span className="text-xs font-bold uppercase tracking-wide text-violet-800">Емтихан құрастыру · БЖБ / ТЖБ</span>
            <input className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xl font-extrabold" value={e.title} onChange={x => set({ title: x.target.value })} aria-label="Емтиханның атауы" /></label>
          <label className="text-xs font-bold text-violet-800">Уақыты, мин<input type="number" min={5} max={240} className="mt-1 block w-24 rounded-lg border border-violet-200 bg-white px-3 py-2 text-base font-bold" value={e.minutes} onChange={x => set({ minutes: +x.target.value })} /></label>
          <div className="rounded-xl bg-white px-4 py-2 text-center"><p className="text-xs font-bold text-violet-800">Жалпы балл</p><p className="text-2xl font-black text-violet-900">{total(e)}</p></div>
          <div className="rounded-xl bg-white px-4 py-2 text-center"><p className="text-xs font-bold text-violet-800">Тапсырма</p><p className="text-2xl font-black text-violet-900">{e.tasks.length}</p></div>
          <div className="rounded-xl bg-white px-4 py-2 text-center" title="Әр тапсырманың нұсқалар санының көбейтіндісі"><p className="text-xs font-bold text-violet-800">Түрлі жиынтық</p><p className="text-2xl font-black text-violet-900">{papers(e) > 99999 ? '99 999+' : papers(e).toLocaleString('ru-RU')}</p></div>
          <Button onClick={save} loading={busy} className="!min-h-[48px] !bg-violet-600 px-6 text-base font-bold !text-white hover:!bg-violet-700">{saved || 'Сақтау'}</Button>
        </div>
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${clash(e, 30) < 0.05 ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>
          {clash(e, 30) < 0.05 ? `30 оқушылық сыныпта әркімге өз жиынтығы түседі (екеуінікі толық сәйкес келу ықтималдығы ${(clash(e, 30) * 100).toFixed(clash(e, 30) < 0.001 ? 2 : 1)}%).`
            : `30 оқушыда екеуіне бірдей жиынтық түсу ықтималдығы ${Math.round(clash(e, 30) * 100)}%. Әр балаға өз нұсқасы түсуі үшін тапсырмаларға нұсқа көбейтіңіз (шаблон немесе ЖИ арқылы).`}</p>
        <p className="mt-2 text-sm text-violet-900">Әр тапсырмаға бірнеше нұсқа жасаңыз (26-ға дейін): қолмен, шаблонмен немесе ЖИ арқылы. Әр оқушыға әр тапсырмадан бір нұсқа түседі, көршісінікі басқа болады. Оқушы тапсырмаларды өзі жылжып орындайды, сабақ өткізу керек емес.</p>
      </section>
      {err && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{err}</p>}
      {tried && issues.length > 0 && (
        <div role="alert" className="rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
          <p className="font-bold">Сақтау үшін толтырыңыз:</p><ul className="ml-5 list-disc">{issues.slice(0, 8).map(x => <li key={x}>{x}</li>)}</ul>{issues.length > 8 && <p>…тағы {issues.length - 8}</p>}
        </div>)}

      <div className="flex flex-wrap items-start gap-4">
        <nav aria-label="Тапсырмалар" className="w-full space-y-2 sm:w-64 sm:shrink-0">
          <ol className="space-y-1.5">
            {e.tasks.map((x, i) => { const Ic = ICON[x.kind], ok = taskOk(x, i); return (
              <li key={i}><button type="button" aria-current={i === at ? 'true' : undefined} onClick={() => { setAt(i); setVi(0); }}
                className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left ${i === at ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' : 'border-border bg-surface hover:bg-surface-2'}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-100 text-sm font-black text-violet-800">{i + 1}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{x.title || 'Тапсырма'}</span>
                  <span className="flex items-center gap-1 text-xs text-text-muted"><Ic size={12} aria-hidden="true" />{KIND[x.kind].split(' ')[0]} · {x.points} б · {x.vars.length} нұсқа</span></span>
                {ok ? <CheckCircle2 size={16} className="shrink-0 text-success" aria-label="толық" /> : <CircleAlert size={16} className="shrink-0 text-warning" aria-label="толық емес" />}
              </button></li>); })}
          </ol>
          <div className="rounded-xl border border-dashed border-violet-300 p-2">
            <p className="px-1 pb-1 text-xs font-bold text-text-muted">Тапсырма қосу</p>
            {(Object.keys(KIND) as Kind[]).map(k => { const Ic = ICON[k]; return (
              <button key={k} type="button" onClick={() => addTask(k)} className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-2 text-sm font-semibold text-violet-800 hover:bg-violet-50"><Plus size={14} aria-hidden="true" /><Ic size={15} aria-hidden="true" />{KIND[k]}</button>); })}
          </div>
        </nav>

        {t && v && (
          <section aria-label={`${at + 1}-тапсырма`} className="min-w-0 flex-[1_1_480px] space-y-3">
            <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface p-3">
              <label className="min-w-0 flex-[1_1_220px] text-xs font-bold text-text-secondary">Тапсырма атауы<input className={inp + ' mt-1'} value={t.title} onChange={x => setT({ title: x.target.value })} /></label>
              <label className="flex flex-col text-xs font-bold text-text-secondary">Түрі
                <select className={inp + ' mt-1 !w-auto'} value={t.kind} onChange={x => { const k = x.target.value as Kind; if (t.vars.some(y => y.q.trim()) && !window.confirm('Түрі өзгерсе, нұсқалардағы жауаптар тазаланады. Жалғастырасыз ба?')) return; setT({ kind: k, vars: t.vars.map(y => ({ ...blankVar(k), q: y.q })) }); }}>
                  {(Object.keys(KIND) as Kind[]).map(k => <option key={k} value={k}>{KIND[k]}</option>)}</select></label>
              <label className="flex flex-col text-xs font-bold text-text-secondary">Балл<input type="number" min={1} max={20} className={inp + ' mt-1 !w-20'} value={t.points} onChange={x => setT({ points: +x.target.value })} /></label>
              <button type="button" aria-label="Тапсырманы жоғары" disabled={!at} onClick={() => moveTask(-1)} className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-30"><ArrowUp size={16} /></button>
              <button type="button" aria-label="Тапсырманы төмен" disabled={at === e.tasks.length - 1} onClick={() => moveTask(1)} className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-30"><ArrowDown size={16} /></button>
              <button type="button" aria-label="Тапсырманы өшіру" onClick={() => { if (!window.confirm(`${at + 1}-тапсырма өшіріледі.`)) return; set({ tasks: e.tasks.filter((_, i) => i !== at) }); setAt(Math.max(0, at - 1)); setVi(0); }} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-danger"><Trash2 size={16} /></button>
            </div>

            <VariantMaker key={at} task={t} onVars={(vars, gen, append) => { setT({ vars: append ? [...t.vars.filter(x => x.q.trim()), ...vars].slice(0, 26) : vars, ...(gen ? { gen } : {}) }); setVi(0); }} />

            <div className="rounded-2xl border border-border bg-surface">
              <div role="tablist" aria-label="Нұсқалар" className="flex flex-wrap items-center gap-1 border-b border-border p-2">
                {t.vars.map((_, j) => (
                  <button key={j} type="button" role="tab" aria-selected={j === vi} onClick={() => setVi(j)}
                    className={`min-h-[40px] rounded-lg px-4 text-sm font-bold ${j === vi ? 'bg-violet-600 text-white' : 'bg-surface-2 text-text-secondary hover:bg-violet-50'}`}>{t.vars.length > 5 ? L(j) : L(j) + " нұсқа"}</button>))}
                {t.vars.length < 26 && <>
                  <button type="button" onClick={() => { setT({ vars: [...t.vars, blankVar(t.kind)] }); setVi(t.vars.length); }} className="flex min-h-[40px] items-center gap-1 rounded-lg px-3 text-sm font-semibold text-violet-800 hover:bg-violet-50"><Plus size={14} aria-hidden="true" />Бос нұсқа</button>
                  <button type="button" onClick={() => { setT({ vars: [...t.vars, JSON.parse(JSON.stringify(v))] }); setVi(t.vars.length); }} className="flex min-h-[40px] items-center gap-1 rounded-lg px-3 text-sm font-semibold text-violet-800 hover:bg-violet-50" title="Осы нұсқаны көшіріп, сандарын ғана өзгертіңіз"><Copy size={14} aria-hidden="true" />{L(vi)}-ны көшіру</button>
                </>}
                <span className="flex-1" />
                {t.vars.length > 1 && <button type="button" onClick={() => { setT({ vars: t.vars.filter((_, j) => j !== vi) }); setVi(Math.max(0, vi - 1)); }} className="flex min-h-[40px] items-center gap-1 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-danger-soft"><Trash2 size={14} aria-hidden="true" />{L(vi)} нұсқаны өшіру</button>}
              </div>

              <div className="space-y-3 p-3 sm:p-4">
                <label className="block text-xs font-bold text-text-secondary">Сұрақ / есептің шарты<textarea rows={3} className={inp + ' mt-1'} value={v.q} onChange={x => setV({ q: x.target.value })} placeholder="Мысалы: 57 санын екілік жүйеге аудар." /></label>

                {t.kind === 'quiz' && (
                  <fieldset className="space-y-2"><legend className="text-xs font-bold text-text-secondary">Жауап нұсқалары · дұрысын белгілеңіз</legend>
                    {v.options.map((o, j) => (
                      <div key={j} className={`flex items-center gap-2 rounded-lg border p-1.5 ${v.answer === j ? 'border-success bg-success-soft' : 'border-border'}`}>
                        <label className="flex min-h-[40px] cursor-pointer items-center gap-2 px-2 text-sm font-bold"><input type="radio" name={`ans${at}-${vi}`} checked={v.answer === j} onChange={() => setV({ answer: j })} aria-label={`${L(j)} — дұрыс жауап`} />{L(j)}</label>
                        <input className={inp + ' flex-1'} value={o} onChange={x => setV({ options: v.options.map((y, k) => (k === j ? x.target.value : y)) })} aria-label={`${L(j)} жауап`} />
                        {v.options.length > 2 && <button type="button" aria-label={`${L(j)} жауапты өшіру`} onClick={() => setV({ options: v.options.filter((_, k) => k !== j), answer: v.answer > j ? v.answer - 1 : v.answer === j ? 0 : v.answer })} className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-surface-2"><Trash2 size={15} /></button>}
                      </div>))}
                    {v.options.length < 6 && <button type="button" onClick={() => setV({ options: [...v.options, ''] })} className="flex min-h-[40px] items-center gap-1 text-sm font-semibold text-violet-800"><Plus size={14} aria-hidden="true" />Жауап қосу</button>}
                  </fieldset>)}

                {t.kind === 'short' && (
                  <label className="block text-xs font-bold text-text-secondary">Дұрыс жауап<span className="font-normal text-text-muted"> · бірнеше болса «;» арқылы: 111001; 00111001</span>
                    <input className={inp + ' mt-1 border-success'} value={v.accept} onChange={x => setV({ accept: x.target.value })} /></label>)}

                {t.kind === 'match' && (
                  <fieldset className="space-y-2"><legend className="text-xs font-bold text-text-secondary">Дұрыс жұптар · оқушыға оң жақ баған араласып көрсетіледі, әр дұрыс жұпқа балдың бір бөлігі</legend>
                    {v.left.map((l, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className="w-6 text-center text-sm font-bold text-text-muted">{j + 1}</span>
                        <input className={inp} value={l} onChange={x => setV({ left: v.left.map((y, k) => (k === j ? x.target.value : y)) })} aria-label={`${j + 1}-жұп, сол жақ`} />
                        <span aria-hidden="true" className="text-text-muted">→</span>
                        <input className={inp} value={v.right[j] || ''} onChange={x => setV({ right: v.left.map((_, k) => (k === j ? x.target.value : v.right[k] || '')) })} aria-label={`${j + 1}-жұп, оң жақ`} />
                        {v.left.length > 2 && <button type="button" aria-label={`${j + 1}-жұпты өшіру`} onClick={() => setV({ left: v.left.filter((_, k) => k !== j), right: v.right.filter((_, k) => k !== j) })} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-2"><Trash2 size={15} /></button>}
                      </div>))}
                    {v.left.length < 8 && <button type="button" onClick={() => setV({ left: [...v.left, ''], right: [...v.right, ''] })} className="flex min-h-[40px] items-center gap-1 text-sm font-semibold text-violet-800"><Plus size={14} aria-hidden="true" />Жұп қосу</button>}
                  </fieldset>)}

                <label className="block text-xs font-bold text-text-secondary">Түсіндірме <span className="font-normal text-text-muted">· нәтижеде мұғалімге көрінеді</span><input className={inp + ' mt-1'} value={v.why} onChange={x => setV({ why: x.target.value })} placeholder="57 = 111001₂" /></label>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-violet-300 bg-surface p-3 sm:p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-800"><Eye size={14} aria-hidden="true" />Оқушы көзімен · {at + 1}-тапсырма, {L(vi)} нұсқа · {t.points} балл</p>
              <p className="mb-2 whitespace-pre-wrap font-semibold">{v.q || <span className="text-text-muted">Сұрақ осында шығады</span>}</p>
              {t.kind === 'quiz' && <div className="grid gap-1.5">{v.options.filter(o => o.trim()).map((o, j) => <span key={j} className="flex min-h-[40px] items-center rounded-lg border border-border px-3 text-sm">{L(j)}. {o}</span>)}</div>}
              {v.widget && <p className="mb-2 rounded-lg bg-surface-2 p-2 text-xs text-text-secondary">Бұл нұсқада сурет-схема бар (кодпен жасалған): оқушыға көрсетіледі, мұнда өзгертілмейді.</p>}
              {t.kind === 'short' && <span className="flex min-h-[40px] items-center rounded-lg border border-border px-3 text-sm text-text-muted">Жауабың</span>}
              {t.kind === 'match' && (() => { const p = v.left.map((l, k) => [l.trim(), (v.right[k] || '').trim()]).filter(([a, b]) => a && b);
                return p.length ? <Match m={{ left: p.map(x => x[0]), right: shuffled(p.map(x => x[1]), vi) }} value="" onChange={() => {}} label="Алдын ала көру" /> : null; })()}
            </div>
          </section>)}
      </div>
    </main>
  );
}
