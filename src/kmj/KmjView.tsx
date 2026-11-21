// The ҚМЖ of one lecture: an editor on the left (every field says where it was filled from), the A4 sheet on the right —
// exactly what the Word file and the print-to-PDF give. Saves itself a moment after each change.
import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Download, Plus, Printer, Sparkles, Trash2 } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Button, ErrorBox, Skeleton } from '../ui';
import * as st from '../curriculum/store';
import * as pg from '../curriculum/progress';
import { lessonTitle, moduleTitle } from '../curriculum/display';
import { autofill, docx, download, loadKmj, saveKmj, type Kmj, type Stage } from './kmj';

type Me = { id: string; school_id: string; full_name?: string | null };
const ta = 'w-full font-normal text-text rounded-lg border border-border-input bg-surface px-2.5 py-2 text-sm';
const lbl = 'flex flex-col gap-1 text-xs font-bold text-text-secondary';
const Src = ({ t }: { t: string }) => <span className="font-semibold text-on-accent-soft"> · {t}</span>;

export function KmjView({ lessonId, me }: { lessonId: string; me: Me }) {
  const [k, setK] = useState<Kmj | null>(null);
  const [ready, setReady] = useState(false);
  const [meta, setMeta] = useState({ title: '', back: '#lessons/courses', crumb: '', fresh: false });
  const [err, setErr] = useState(''), [state, setState] = useState<'' | 'saving' | 'saved' | 'error'>('');
  const dirty = useRef(false), timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const [saved, les, curr, slot] = await Promise.all([
          DEMO ? null : loadKmj(lessonId),
          DEMO ? { data: null } : sb.from('cf_lessons').select('title,plan,slides').eq('id', lessonId).maybeSingle(),
          st.loadCurr(me),
          DEMO ? { data: null } : sb.from('cf_slots').select('class_id,held_on').eq('lesson_id', lessonId).gte('held_on', new Date().toISOString().slice(0, 10)).order('held_on').limit(1).maybeSingle(),
        ]);
        const l = curr.lessons.find(x => x.id === lessonId);
        const place = curr.places.find(p => p.lesson_id === lessonId), mod = curr.modules.find(m => m.id === place?.module_id);
        const course = curr.courses.find(c => c.id === mod?.course_id);
        const label = course ? pg.items(curr, course.id).find(i => i.id === lessonId)?.label : '';
        const title = (les as any).data?.title || (l ? lessonTitle(l, 'kk') : 'Дәріс');
        setMeta({ title: `${label ? label + ' ' : ''}${title}`, back: course ? '#course/' + course.id : '#lessons/courses', crumb: [course?.title, mod && moduleTitle(mod, 'kk')].filter(Boolean).join(' / '), fresh: !saved });
        if (saved) { setK(saved.data); setReady(saved.ready); return; }
        const s: any = (slot as any).data;
        const cn = s?.class_id ? (await sb.from('classes').select('name').eq('id', s.class_id).maybeSingle()).data?.name : '';
        setK(autofill({ topic: title, section: mod ? moduleTitle(mod, 'kk') : '', teacher: me.full_name || '', cls: cn || '', date: s?.held_on ? s.held_on.split('-').reverse().join('.') : '',
          plan: (les as any).data?.plan, slides: Array.isArray((les as any).data?.slides) ? (les as any).data.slides : [] }));
      } catch (e) { setErr((e as Error).message); }
    })();
  }, [lessonId]);

  const save = (next: Kmj, r = ready) => {
    if (DEMO) return;
    window.clearTimeout(timer.current); setState('saving');
    timer.current = window.setTimeout(() => saveKmj(me.id, lessonId, next, r).then(() => { setState('saved'); dirty.current = false; }, e => { setState('error'); setErr((e as Error).message); }), 700);
  };
  const set = (p: Partial<Kmj>) => setK(prev => { const n = { ...prev!, ...p }; dirty.current = true; save(n); return n; });
  const setStage = (i: number, p: Partial<Stage>) => set({ stages: k!.stages.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const moveStage = (i: number, d: number) => { const a = [...k!.stages]; [a[i], a[i + d]] = [a[i + d], a[i]]; set({ stages: a }); };
  const toggleReady = () => { const r = !ready; setReady(r); save(k!, r); };

  if (err && !k) return <main className="mx-auto max-w-6xl p-4"><ErrorBox message={err} /></main>;
  if (!k) return <main className="mx-auto max-w-6xl p-4"><Skeleton /></main>;
  const total = k.stages.reduce((a, s) => a + (Number(s.min) || 0), 0);
  const file = `ҚМЖ ${meta.title}${k.cls ? ' ' + k.cls : ''}.docx`.replace(/[\\/:*?"<>|]/g, '');

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4">
      <style>{'@media print{@page{size:A4;margin:12mm}body *{visibility:hidden}#kmj-doc,#kmj-doc *{visibility:visible}#kmj-doc{position:absolute;inset:0 auto auto 0;width:100%;box-shadow:none;padding:0}}'}</style>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <a href={meta.back} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-accent"><ArrowLeft size={15} aria-hidden="true" />{meta.crumb || 'Курс'}</a>
          <h1 className="mt-0.5 text-2xl font-extrabold">ҚМЖ · {meta.title}</h1>
        </div>
        <span role="status" className={`rounded-full px-3 py-1 text-xs font-bold ${ready ? 'bg-success-soft text-success' : 'bg-surface-2 text-text-secondary'}`}>
          {ready ? 'Дайын' : 'Жоба'}{state === 'saving' ? ' · сақталуда…' : state === 'saved' ? ' · сақталды' : state === 'error' ? ' · сақталмады' : meta.fresh && !dirty.current ? ' · әлі сақталмаған' : ''}</span>
        <Button variant="secondary" className="!min-h-[44px] gap-2" onClick={() => download(docx(k), file)}><Download size={16} aria-hidden="true" />Word (.docx)</Button>
        <Button variant="secondary" className="!min-h-[44px] gap-2" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />PDF / басып шығару</Button>
        <Button variant={ready ? 'secondary' : 'success'} className="!min-h-[44px] gap-2" onClick={toggleReady} aria-pressed={ready}><Check size={16} aria-hidden="true" />{ready ? 'Жобаға қайтару' : 'Дайын деп белгілеу'}</Button>
      </div>
      {err && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{err}</p>}

      <div className="flex flex-wrap items-start gap-5">
        <section aria-label="ҚМЖ редакторы" className="min-w-0 flex-[1_1_520px] space-y-3">
          {meta.fresh && <p className="flex items-start gap-2 rounded-xl bg-success-soft p-3 text-sm text-success"><Sparkles size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span><b>Автотолтырылды:</b> тақырып пен кезеңдер дәрістің «Сабақ жоспарынан», сынып пен күн КТП-дан, бөлім курстан. Тек түзетіп шығыңыз.</span></p>}
          <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
            <label className={lbl}><span>Сабақтың тақырыбы<Src t="дәрістен" /></span><input className={ta} value={k.topic} onChange={e => set({ topic: e.target.value })} /></label>
            <label className={lbl}><span>Бөлім<Src t="курстан" /></span><input className={ta} value={k.section} onChange={e => set({ section: e.target.value })} /></label>
            <label className={lbl}><span>Сынып<Src t="КТП-дан" /></span><input className={ta} value={k.cls} onChange={e => set({ cls: e.target.value })} /></label>
            <label className={lbl}><span>Күні<Src t="КТП-дан" /></span><input className={ta} value={k.date} onChange={e => set({ date: e.target.value })} /></label>
            <label className={lbl + ' sm:col-span-2'}><span>Педагогтің аты-жөні</span><input className={ta} value={k.teacher} onChange={e => set({ teacher: e.target.value })} /></label>
            <label className={lbl + ' sm:col-span-2'}><span>Оқу бағдарламасына сәйкес оқу мақсаттары<Src t="сабақ жоспарынан" /></span><textarea rows={3} className={ta} value={k.goals} onChange={e => set({ goals: e.target.value })} placeholder="7.4.1.1 …" /></label>
            <label className={lbl + ' sm:col-span-2'}><span>Сабақтың мақсаты</span><textarea rows={3} className={ta} value={k.aim} onChange={e => set({ aim: e.target.value })} placeholder="Барлық оқушылар… Көпшілігі… Кейбірі…" /></label>
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-2"><h2 className="flex-1 font-bold">Сабақтың барысы</h2>
              <span className={`text-sm font-semibold ${total === 45 ? 'text-text-secondary' : 'text-warning'}`}>Барлығы {total} мин{total !== 45 ? ' (45 болуы керек)' : ''}</span></div>
            {k.stages.map((s, i) => (
              <fieldset key={i} className="space-y-2 rounded-xl border border-border p-3">
                <legend className="sr-only">{i + 1}-кезең</legend>
                <div className="flex flex-wrap items-center gap-2">
                  <input aria-label="Кезең атауы" className={ta + ' !w-auto flex-1 font-bold'} value={s.name} onChange={e => setStage(i, { name: e.target.value })} />
                  <label className="flex items-center gap-1 text-sm font-semibold"><input aria-label={`${s.name}: минут`} type="number" min={0} max={90} className={ta + ' !w-16 text-center'} value={s.min} onChange={e => setStage(i, { min: +e.target.value })} />мин</label>
                  <button type="button" aria-label="Жоғары" disabled={!i} onClick={() => moveStage(i, -1)} className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button type="button" aria-label="Төмен" disabled={i === k.stages.length - 1} onClick={() => moveStage(i, 1)} className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-30"><ArrowDown size={16} /></button>
                  <button type="button" aria-label={`${s.name}: өшіру`} onClick={() => set({ stages: k.stages.filter((_, j) => j !== i) })} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-danger"><Trash2 size={16} /></button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={lbl}>Педагогтің әрекеті<textarea rows={2} className={ta} value={s.teacher} onChange={e => setStage(i, { teacher: e.target.value })} /></label>
                  <label className={lbl}>Оқушының әрекеті<textarea rows={2} className={ta} value={s.student} onChange={e => setStage(i, { student: e.target.value })} /></label>
                  <label className={lbl}>Бағалау<input className={ta} value={s.assess} onChange={e => setStage(i, { assess: e.target.value })} /></label>
                  <label className={lbl}>Ресурстар<input className={ta} value={s.res} onChange={e => setStage(i, { res: e.target.value })} /></label>
                </div>
              </fieldset>))}
            <button type="button" onClick={() => set({ stages: [...k.stages, { name: 'Жаңа кезең', min: 5, teacher: '', student: '', assess: '', res: '' }] })}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent bg-info-soft text-sm font-bold text-on-accent-soft"><Plus size={16} aria-hidden="true" />Кезең қосу</button>
          </div>

          <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
            <label className={lbl}>Саралау<textarea rows={2} className={ta} value={k.diff} onChange={e => set({ diff: e.target.value })} /></label>
            <label className={lbl}>Бағалау<textarea rows={2} className={ta} value={k.assess} onChange={e => set({ assess: e.target.value })} /></label>
            <label className={lbl + ' sm:col-span-2'}>Денсаулық және қауіпсіздік<textarea rows={2} className={ta} value={k.health} onChange={e => set({ health: e.target.value })} /></label>
            <label className={lbl + ' sm:col-span-2'}><span>Рефлексия<span className="font-semibold text-text-muted"> · сабақтан кейін</span></span><textarea rows={3} className={ta} value={k.reflection} onChange={e => set({ reflection: e.target.value })} placeholder="Не жақсы өтті? Келесі жолы не өзгертемін?" /></label>
          </div>
        </section>

        <section aria-label="ҚМЖ көрінісі (A4)" className="min-w-0 flex-[0_1_620px] space-y-2 lg:sticky lg:top-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Көрінісі · жүктелетін файл осындай болады</p>
          <div id="kmj-doc" className="bg-white p-8 text-[12px] leading-[15px] text-black shadow-pop" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <p className="mb-2 text-center text-[14px] font-bold">Қысқа мерзімді жоспар</p>
            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:p-1.5 [&_td]:align-top [&_th]:border [&_th]:border-black [&_th]:p-1.5 [&_th]:text-left [&_th]:align-top">
              <tbody>
                {([['Бөлім:', k.section], ['Педагогтің аты-жөні:', k.teacher], ['Күні:', k.date], ['Сынып:', `${k.cls}    Қатысқандар саны:      Қатыспағандар саны:`], ['Сабақтың тақырыбы:', k.topic], ['Оқу бағдарламасына сәйкес оқу мақсаттары:', k.goals], ['Сабақтың мақсаты:', k.aim]] as const)
                  .map(([a, b]) => <tr key={a}><th scope="row" className="w-1/3">{a}</th><td className="whitespace-pre-line">{b}</td></tr>)}
              </tbody>
            </table>
            <p className="my-2 text-center font-bold">Сабақтың барысы</p>
            <table className="w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:p-1.5 [&_td]:align-top [&_th]:border [&_th]:border-black [&_th]:p-1.5 [&_th]:text-left">
              <thead><tr><th>Кезең / уақыт</th><th>Педагогтің әрекеті</th><th>Оқушының әрекеті</th><th>Бағалау</th><th>Ресурстар</th></tr></thead>
              <tbody>{k.stages.map((s, i) => <tr key={i}><td><b>{s.name}</b><br />{s.min} мин</td><td className="whitespace-pre-line">{s.teacher}</td><td className="whitespace-pre-line">{s.student}</td><td>{s.assess}</td><td>{s.res}</td></tr>)}</tbody>
            </table>
            <table className="mt-2 w-full border-collapse [&_td]:border [&_td]:border-black [&_td]:p-1.5 [&_td]:align-top [&_th]:border [&_th]:border-black [&_th]:p-1.5 [&_th]:text-left">
              <tbody>
                <tr><th>Саралау</th><th>Бағалау</th><th>Денсаулық және қауіпсіздік</th></tr>
                <tr><td className="whitespace-pre-line">{k.diff}</td><td className="whitespace-pre-line">{k.assess}</td><td className="whitespace-pre-line">{k.health}</td></tr>
                <tr><th colSpan={3}>Рефлексия</th></tr>
                <tr><td colSpan={3} className="h-12 whitespace-pre-line">{k.reflection}</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
