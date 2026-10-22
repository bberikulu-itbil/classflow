import React, { useState } from 'react';
import { ClipboardList, Puzzle } from 'lucide-react';
import { api } from './types';
import type { LessonSlide } from './types';
import { Button, Card, EmptyState, ErrorBox, Field, inputCls, Skeleton, useLoad } from '../ui';
import { fmtDate, fromLocalInput } from './format';

export function AssignView() {
  const slides = useLoad(() => api().listCodeSlides(), []);
  const classes = useLoad(() => api().listClasses(), []);
  const assigned = useLoad(() => api().listAssigned(), []);
  const [pick, setPick] = useState<LessonSlide | null>(null);
  const [title, setTitle] = useState('');
  const [points, setPoints] = useState(5);
  const [sel, setSel] = useState<string[]>([]);
  const [opens, setOpens] = useState('');
  const [due, setDue] = useState('');
  const [late, setLate] = useState(true);
  const [req, setReq] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);

  const choose = (s: LessonSlide) => { setPick(s); setTitle(s.slide.title || s.lessonTitle); setPoints(s.slide.points || 5); setMsg(null); };
  const submit = async () => {
    if (!pick) return setMsg({ t: 'Алдымен тапсырманы таңда', bad: true });
    if (!title.trim()) return setMsg({ t: 'Атауын жаз', bad: true });
    if (!sel.length) return setMsg({ t: 'Кемінде бір сынып таңда', bad: true });
    if (opens && due && fromLocalInput(due)! <= fromLocalInput(opens)!) return setMsg({ t: 'Мерзім ашылу уақытынан кейін болуы керек', bad: true });
    setBusy(true); setMsg(null);
    try {
      const n = await api().assign({ lesson: pick, title: title.trim(), points, classIds: sel, opensAt: fromLocalInput(opens), dueAt: fromLocalInput(due), allowLate: late, requirePass: req });
      setMsg({ t: `${n} сыныпқа берілді.` }); setPick(null); setSel([]); assigned.reload();
    } catch (e) { setMsg({ t: (e as Error).message, bad: true }); } finally { setBusy(false); }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Үй тапсырмасын беру</h1>
      <section aria-label="Тапсырманы таңда" className="space-y-2">
        <h2 className="font-semibold">1. Сабақтағы код слайдын таңда</h2>
        {slides.loading && <Skeleton rows={2} />}
        {slides.error && <ErrorBox message={slides.error} onRetry={slides.reload} />}
        {slides.data?.length === 0 && <EmptyState icon={<Puzzle size={32} />} text="Сабақтарыңда код слайды жоқ. Сабақ өңдегішінде type: code слайд қос." />}
        {slides.data?.map(s => (
          <label key={s.lessonId + s.index} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer bg-surface ${pick === s ? 'border-accent' : 'border-border'}`}>
            <input type="radio" name="slide" className="mt-1" checked={pick === s} onChange={() => choose(s)} />
            <span className="min-w-0"><b className="break-words">{s.slide.title || 'Код тапсырмасы'}</b><span className="block text-sm text-text-muted break-words">{s.lessonTitle} · {(s.slide.tests || []).length} тест</span></span>
          </label>
        ))}
      </section>
      {pick && (
        <Card className="space-y-4">
          <h2 className="font-semibold">2. Параметрлер</h2>
          <Field label="Атауы">{id => <input id={id} className={inputCls} value={title} maxLength={160} onChange={e => setTitle(e.target.value)} />}</Field>
          <Field label="Ұпай">{id => <input id={id} className={inputCls + ' max-w-[8rem]'} type="number" min={0} value={points} onChange={e => setPoints(+e.target.value)} />}</Field>
          <fieldset className="space-y-1"><legend className="text-sm font-medium text-text-secondary">Сыныптар</legend>
            {classes.data?.map(c => (
              <label key={c.id} className="inline-flex items-center gap-2 mr-4 min-h-[44px] cursor-pointer">
                <input type="checkbox" checked={sel.includes(c.id)} onChange={e => setSel(e.target.checked ? [...sel, c.id] : sel.filter(x => x !== c.id))} />{c.name}
              </label>
            ))}
          </fieldset>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Ашылу уақыты (міндетті емес)">{id => <input id={id} className={inputCls} type="datetime-local" value={opens} onChange={e => setOpens(e.target.value)} />}</Field>
            <Field label="Тапсыру мерзімі (міндетті емес)">{id => <input id={id} className={inputCls} type="datetime-local" value={due} onChange={e => setDue(e.target.value)} />}</Field>
          </div>
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer"><input type="checkbox" checked={late} onChange={e => setLate(e.target.checked)} />Мерзімнен кейін де қабылдау</label>
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer"><input type="checkbox" checked={req} onChange={e => setReq(e.target.checked)} />Барлық тест өтпей тапсыруға болмайды</label>
          <Button loading={busy} onClick={submit}>Тапсырма беру</Button>
        </Card>
      )}
      {msg && <div role={msg.bad ? 'alert' : 'status'} className={`rounded-lg p-3 font-medium ${msg.bad ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}`}>{msg.t}</div>}
      <section aria-label="Берілген тапсырмалар" className="space-y-2">
        <h2 className="font-semibold">Берілген тапсырмалар</h2>
        {assigned.loading && <Skeleton rows={2} />}
        {assigned.error && <ErrorBox message={assigned.error} onRetry={assigned.reload} />}
        {assigned.data?.length === 0 && <EmptyState icon={<ClipboardList size={32} />} text="Әзірге ештеңе берілмеген." />}
        {assigned.data?.map(a => (
          <a key={a.id} href={`#review/${a.id}`} className="flex flex-wrap justify-between gap-2 rounded-lg bg-surface border border-border p-3 hover:border-accent">
            <span className="font-semibold break-words min-w-0">{a.title} · {a.class_name}</span><span className="text-sm text-text-muted">мерзімі: {fmtDate(a.due_at)}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
