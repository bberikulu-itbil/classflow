import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, Pencil, Play } from 'lucide-react';
import { DEMO } from '../config';
import { Button, Card, EmptyState, ErrorBox, Field, LinkButton, Skeleton, inputCls, useLoad } from '../ui';
import { Tabs } from '../ui/Tabs';
import { fmtDate } from '../hw/format';
import { startSession } from '../views/session';
import { byName } from '../views/session';
import { loadLessonData, loadResults } from './data';
import { getPrefs } from '../prefs';
import { QuarterChips, useFilters } from './Filters';
import { classTable, matches, sessDate, sessionsByLesson, subjectOf } from './model';
import type { Cls, Sess } from './model';

const STATUS: Record<string, string> = { live: 'Жалғасуда', ended: 'Аяқталды' };

function StartRow({ lessonId, classId }: { lessonId: string; classId: string }) {
  const [groups, setGroups] = useState(getPrefs().groups);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => { setBusy(true); setErr(''); try { await startSession(lessonId, classId, groups); } catch (e) { setErr((e as Error).message || 'Сабақты бастау мүмкін болмады'); setBusy(false); } };
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-24"><Field label="Топ саны">{id => <input id={id} type="number" min={1} max={8} className={inputCls} value={groups} onChange={e => setGroups(Math.min(8, Math.max(1, +e.target.value || 1)))} />}</Field></div>
      <Button variant="success" disabled={!!DEMO} loading={busy} onClick={go}><Play size={16} aria-hidden="true" />Осы сыныппен бастау</Button>
      {DEMO && <span className="text-sm text-text-muted">Демо режимде сабақ басталмайды.</span>}
      {err && <p role="alert" className="w-full text-sm text-danger">{err}</p>}
    </div>
  );
}

/** One class of one lesson: its own sessions in the chosen period and its own results, never mixed with other classes. */
function ClassPanel({ lessonId, classId, sessions }: { lessonId: string; classId: string; sessions: Sess[] }) {
  const ids = sessions.map(s => s.id);
  const { data, error, loading, reload } = useLoad(() => loadResults(ids), [ids.join()]);
  const live = sessions.find(s => s.status === 'live');
  const rows = data ? classTable(sessions, data.parts, data.scores) : [];
  const perSession = (id: string) => {
    const p = (data?.parts || []).filter(x => x.session_id === id);
    const sc = (data?.scores || []).filter(x => x.session_id === id);
    const tot = new Map<string, number>(); sc.forEach(x => tot.set(x.student_id, (tot.get(x.student_id) || 0) + (x.points || 0)));
    const best = [...tot].sort((a, b) => b[1] - a[1])[0];
    return { n: p.length, sum: sc.reduce((n, x) => n + (x.points || 0), 0), best: best && best[1] > 0 ? `${p.find(x => x.student_id === best[0])?.full_name || '—'} (${best[1]})` : '' };
  };
  return (
    <div className="space-y-4 pt-4">
      {live && <p role="status" className="rounded-md bg-success-soft p-3 text-sm font-semibold text-success">Бұл сыныппен сабақ жүріп жатыр. <a className="underline" href={'#remote/' + live.id}>Пультке өту</a></p>}
      <StartRow lessonId={lessonId} classId={classId} />
      {sessions.length === 0 && <EmptyState text="Бұл сыныппен таңдалған кезеңде сабақ өтпеген. Жоғарыдан «Барлығы» тоқсанын таңдап көріңіз немесе сабақты бастаңыз." />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {sessions.length > 0 && (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[['Өткен сабақ', sessions.length], ['Қатысқан оқушы', rows.length], ['Жалпы ұпай', rows.reduce((n, r) => n + r.points, 0)]].map(([k, v]) => (
              <Card key={k as string} className="!p-3"><dt className="text-sm text-text-secondary">{k}</dt><dd className="text-2xl font-bold">{loading && !data && k !== 'Өткен сабақ' ? '…' : v}</dd></Card>
            ))}
          </dl>
          <section aria-label="Оқушылар нәтижесі" className="space-y-2">
            <h3 className="font-semibold">Оқушылардың нәтижесі</h3>
            {loading && !data ? <Skeleton rows={2} /> : rows.length === 0 ? <p className="text-sm text-text-muted">Бұл сабақтарға қатысушы жазылмаған.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Осы сыныптың оқушылары: қатысқан сабақ саны және жиналған ұпай</caption>
                  <thead><tr className="border-b border-border text-text-secondary"><th scope="col" className="py-2 pr-3">Оқушы</th><th scope="col" className="py-2 pr-3">Қатысқаны</th><th scope="col" className="py-2 text-right">Ұпай</th></tr></thead>
                  <tbody>{rows.map(r => (
                    <tr key={r.student_id} className="border-b border-border"><th scope="row" className="py-2 pr-3 font-medium">{r.name}</th><td className="py-2 pr-3">{r.came} / {sessions.length}</td><td className="py-2 text-right font-semibold">{r.points}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <section aria-label="Өткен сабақтар" className="space-y-2">
            <h3 className="font-semibold">Сабақтар</h3>
            <ul className="space-y-2">
              {[...sessions].sort((a, b) => (sessDate(b) || '').localeCompare(sessDate(a) || '')).map(s => {
                const x = perSession(s.id);
                return (
                  <li key={s.id}><Card className="flex flex-wrap items-baseline gap-x-4 gap-y-1 !p-3">
                    <span className="w-36 text-sm text-text-muted">{fmtDate(sessDate(s))}</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-text-secondary">{STATUS[s.status] || s.status}</span>
                    {data && <span className="text-sm text-text-secondary">{x.n} оқушы · {x.sum} ұпай{x.best && ` · үздік: ${x.best}`}</span>}
                  </Card></li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

export function LessonDetail({ id, me }: { id: string; me: { id: string } }) {
  const { data, error, loading, reload } = useLoad(() => loadLessonData(me.id), [me.id]);
  const [f, set] = useFilters();
  const [cls, setCls] = useState<string | null>(null); // null = not picked yet
  const [extra, setExtra] = useState<string[]>([]);
  const lesson = data?.lessons.find(l => l.id === id);
  const all = lesson && data ? sessionsByLesson(data.lessons, data.sessions).get(lesson.id)! : [];
  // tabs: classes this lesson was taught to, its own class, the one picked in the gallery, and any added here
  const tabIds = [...new Set([...all.map(s => s.class_id || ''), ...(lesson?.class_id ? [lesson.class_id] : []), ...(f.cls ? [f.cls] : []), ...extra])];
  const name = (cid: string) => data?.classes.find(c => c.id === cid)?.name || 'Сыныпсыз';
  const tabs = tabIds.map(k => ({ key: k || '_', label: name(k) })).sort((a, b) => (a.key === '_' ? 1 : b.key === '_' ? -1 : byName(a.label, b.label)));
  const cur = cls ?? (tabs.find(t => t.key === (f.cls || '_'))?.key ?? tabs[0]?.key ?? '');
  useEffect(() => { document.title = lesson ? `${lesson.title} · ClassFlow` : document.title; }, [lesson?.title]);
  const addable: Cls[] = (data?.classes || []).filter(c => !tabIds.includes(c.id));
  const back = <a href="#lessons/mine" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-accent underline"><ArrowLeft size={16} aria-hidden="true" />Барлық сабақтар</a>;

  if (loading && !data) return <main className="mx-auto max-w-5xl space-y-4 p-4">{back}<Skeleton /></main>;
  if (error) return <main className="mx-auto max-w-5xl space-y-4 p-4">{back}<ErrorBox message={error} onRetry={reload} /></main>;
  if (!lesson) return <main className="mx-auto max-w-5xl space-y-4 p-4">{back}<EmptyState text="Сабақ табылмады. Ол өшірілген немесе сіздікі емес болуы мүмкін." /></main>;
  const here = all.filter(s => (s.class_id || '_') === cur && matches(s, { cls: '', q: f.q }));
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      {back}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words">{lesson.title}</h1>
          <p className="text-text-secondary">{subjectOf(lesson)}</p>
        </div>
        <div className="flex gap-2"><LinkButton href={'#preview/' + lesson.id}><Eye size={16} aria-hidden="true" />Көру</LinkButton><LinkButton href={'#edit/' + lesson.id}><Pencil size={16} aria-hidden="true" />Өңдеу</LinkButton></div>
      </div>
      <Card><QuarterChips f={f} set={set} /></Card>
      <section aria-label="Сыныптар" className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold">Сыныптар бойынша</h2>
          {addable.length > 0 && (
            <div className="w-56"><Field label="Басқа сыныпты қосу">{sid => (
              <select id={sid} className={inputCls} value="" onChange={e => { if (e.target.value) { setExtra(x => [...x, e.target.value]); setCls(e.target.value); } }}>
                <option value="">Сыныпты таңдаңыз</option>
                {addable.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>)}</Field></div>
          )}
        </div>
        {tabs.length === 0 ? <EmptyState text="Бұл сабақ әлі ешбір сыныппен өтілмеген. «Басқа сыныпты қосу» арқылы сыныпты таңдап бастаңыз." /> : (
          <>
            <Tabs id="lc" label="Сыныптар" tabs={tabs} value={cur} onChange={setCls} />
            <div id="lc-panel" role="tabpanel" aria-labelledby={`lc-tab-${cur}`}>
              <ClassPanel key={cur} lessonId={lesson.id} classId={cur === '_' ? '' : cur} sessions={here} />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
