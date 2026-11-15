import React, { useEffect, useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, ErrorBox, Field, LinkButton, Skeleton, inputCls, useLoad } from '../ui';
import * as st from './store';
import type { Form, Me } from './store';

const STEPS: Form['status'][] = ['draft', 'rules_locked', 'published'];
const BACK = '#exams/catalog';

function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-surface-2"><input id={id} type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={checked} onChange={e => onChange(e.target.checked)} />{children}</label>;
}

/** Teacher: add (id = "new") or edit a contest. */
export function ContestForm({ me, id }: { me: Me; id: string }) {
  const isNew = id === 'new';
  const { data: d, error, loading, reload } = useLoad(() => st.loadAll(me), [me.id, id]);
  const [f, setF] = useState<Form | null>(null), [msg, setMsg] = useState(''), [note, setNote] = useState(''), [busy, setBusy] = useState(false), [ask, setAsk] = useState(false);
  useEffect(() => { if (d && !f) setF(isNew ? st.emptyForm(me) : st.formOf(d, id) ?? null); }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF(o => (o ? { ...o, [k]: v } : o));
  const upd = (k: 'title' | 'organizer' | 'url' | 'description' | 'starts_on' | 'ends_on' | 'reg_deadline' | 'rules_text') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value);
  const staff = d ? Object.values(d.people).filter(p => p.staff).sort((a, b) => a.full_name.localeCompare(b.full_name, 'kk')) : [];

  if (loading && !d) return <main className="mx-auto max-w-3xl space-y-4 p-4"><Skeleton rows={5} /></main>;
  if (error) return <main className="mx-auto max-w-3xl p-4"><ErrorBox message={error} onRetry={reload} /></main>;
  if (!f) return <main className="mx-auto max-w-3xl space-y-4 p-4"><EmptyState text="Сайыс табылмады." action={<LinkButton href={BACK}>Каталогқа оралу</LinkButton>} /></main>;
  const c = d?.contests.find(x => x.id === f.id);
  if (c && !(c.author_id === me.id || me.role === 'deputy' || me.role === 'admin')) return <main className="mx-auto max-w-3xl p-4"><EmptyState text="Бұл сайысты тек авторы өзгерте алады." action={<LinkButton href={BACK}>Каталогқа оралу</LinkButton>} /></main>;

  const run = async (opts: { lock?: boolean; publish?: boolean }, done: string) => {
    setMsg(''); setNote(''); setBusy(true);
    try {
      const sid = await st.saveContest(me, f, opts);
      setNote(done);
      if (isNew) { window.location.hash = `contest/${sid}`; return; }
      const nd = await st.loadAll(me); setF(st.formOf(nd, sid) ?? f); reload();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); } finally { setBusy(false); }
  };
  const remove = async () => {
    try { await st.deleteContest(f.id!); window.location.hash = BACK.slice(1); } catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); setAsk(false); }
  };
  const stageSet = (i: number, k: 'name' | 'on_date' | 'format' | 'advance', v: string) => set('stages', f.stages.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const published = f.status === 'published';

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">{isNew ? 'Сайыс қосу' : 'Сайысты өзгерту'}</h1><LinkButton href={BACK}>Каталогқа оралу</LinkButton></div>
      <ol aria-label="Күйі" className="flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((s, i) => <li key={s} aria-current={s === f.status ? 'step' : undefined} className={`rounded-full px-3 py-1 ${s === f.status ? 'bg-accent text-on-accent font-semibold' : 'bg-surface-2 text-text-secondary'}`}>{i + 1}. {st.STATUS_NAMES[s]}</li>)}
      </ol>
      <p role="status" aria-live="polite" className={msg || note ? `rounded-lg p-3 text-sm ${msg ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}` : 'sr-only'}>{msg || note}</p>

      {!f.id && (
        <fieldset className="space-y-2"><legend className="mb-1 text-sm font-medium text-text-secondary">Режим</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {([['own', 'Өз сайысымды құру', 'Сайыс ClassFlow ішінде өтеді'], ['external', 'Бар жарысты енгізу', 'Сыртқы олимпиада: ұйымдастырушы мен ресми сілтеме']] as const).map(m => (
              <label key={m[0]} className={`flex min-h-[44px] cursor-pointer flex-col rounded-lg border p-3 ${f.kind === m[0] ? 'border-accent bg-accent-soft' : 'border-border'}`}>
                <span className="flex items-center gap-2 font-semibold"><input type="radio" name="kind" className="accent-[var(--accent)]" checked={f.kind === m[0]} onChange={() => setF({ ...f, kind: m[0], format: m[0] === 'own' ? f.format || 'quiz' : '' })} />{m[1]}</span>
                <span className="text-sm text-text-secondary">{m[2]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <section className="space-y-3">
        <Field label="Атауы">{i => <input id={i} className={inputCls} maxLength={120} value={f.title} onChange={upd('title')} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Сала">{i => <select id={i} className={inputCls} value={f.field} onChange={e => set('field', e.target.value)}>{st.FIELDS.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>}</Field>
          <Field label="Деңгей">{i => <select id={i} className={inputCls} value={f.level} onChange={e => set('level', e.target.value)}>{st.LEVELS.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>}</Field>
          <Field label="Басталу күні">{i => <input id={i} type="date" className={inputCls} value={f.starts_on} onChange={upd('starts_on')} />}</Field>
          <Field label="Аяқталу күні">{i => <input id={i} type="date" className={inputCls} value={f.ends_on} min={f.starts_on || undefined} onChange={upd('ends_on')} />}</Field>
        </div>
        {f.kind === 'own'
          ? <Field label="Пішімі">{i => <select id={i} className={inputCls} value={f.format} onChange={e => set('format', e.target.value)}>{st.FORMATS.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>}</Field>
          : <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ұйымдастырушы">{i => <input id={i} className={inputCls} maxLength={120} value={f.organizer} onChange={upd('organizer')} />}</Field>
              <Field label="Ресми сілтеме">{i => <input id={i} type="url" inputMode="url" placeholder="https://" className={inputCls} value={f.url} onChange={upd('url')} />}</Field>
            </div>}
        <fieldset><legend className="mb-1 text-sm font-medium text-text-secondary">Сыныптар (таңдамасаңыз, бәріне)</legend>
          <div className="flex flex-wrap gap-x-2">{[5, 6, 7, 8, 9, 10, 11].map(n => <Check key={n} id={`g${n}`} checked={f.grades.includes(n)} onChange={v => set('grades', v ? [...f.grades, n].sort((a, b) => a - b) : f.grades.filter(x => x !== n))}>{n}</Check>)}</div></fieldset>
        <Field label="Сипаттама">{i => <textarea id={i} rows={3} maxLength={1000} className={inputCls + ' py-2'} value={f.description} onChange={upd('description')} />}</Field>
        <Check id="tonly" checked={f.teacher_only} onChange={v => set('teacher_only', v)}>Тек мұғалімдерге: оқушылар көрмейді</Check>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Кезеңдер кестесі</h2>
        {f.stages.length === 0 && <p className="text-sm text-text-secondary">Кезең жоқ. Қажет болса қосыңыз.</p>}
        {f.stages.map((s, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_9rem_1fr_1fr_auto]">
            <Field label={`Кезең ${i + 1}`}>{x => <input id={x} className={inputCls} maxLength={80} value={s.name} onChange={e => stageSet(i, 'name', e.target.value)} />}</Field>
            <Field label="Күні">{x => <input id={x} type="date" className={inputCls} value={s.on_date ?? ''} onChange={e => stageSet(i, 'on_date', e.target.value)} />}</Field>
            <Field label="Формат">{x => <input id={x} className={inputCls} maxLength={120} placeholder="Онлайн / қатысып" value={s.format ?? ''} onChange={e => stageSet(i, 'format', e.target.value)} />}</Field>
            <Field label="Келесіге өту шарты">{x => <input id={x} className={inputCls} maxLength={200} value={s.advance ?? ''} onChange={e => stageSet(i, 'advance', e.target.value)} />}</Field>
            <Button variant="ghost" className="self-end" onClick={() => set('stages', f.stages.filter((_, j) => j !== i))} aria-label={`Кезең ${i + 1} өшіру`}><Trash2 size={18} aria-hidden="true" /></Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => set('stages', [...f.stages, { name: '', on_date: null, format: null, advance: null }])}><Plus size={16} aria-hidden="true" />Кезең қосу</Button>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">Ережелер {f.rules_locked && <span className="inline-flex items-center gap-1 text-sm font-normal text-success"><Lock size={14} aria-hidden="true" />бекітілген{c ? `, нұсқа ${c.rules_version}` : ''}</span>}</h2>
        {f.rules_locked && <p className="rounded-md bg-warning-soft p-3 text-sm text-warning">Ереже бекітілген. Мәтінді өзгертіп сақтасаңыз, жаңа нұсқа ашылады және өтінім берген оқушыларға хабар барады.</p>}
        <Field label="Ереже мәтіні">{i => <textarea id={i} rows={8} className={inputCls + ' py-2'} value={f.rules_text} onChange={upd('rules_text')} />}</Field>
        {!f.rules_locked && <Button variant="secondary" disabled={busy || !f.title.trim()} onClick={() => run({ lock: true }, 'Ереже бекітілді')}><Lock size={16} aria-hidden="true" />Ережелерді бекіту</Button>}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Тіркеу</h2>
        <Check id="regopen" checked={f.reg_open} onChange={v => set('reg_open', v)}>Тіркеу ашық</Check>
        <Check id="needapp" checked={f.needs_approval} onChange={v => set('needs_approval', v)}>Өтінімді жауапты мұғалім растайды</Check>
        <Field label="Өтінім мерзімі (дейін)">{i => <input id={i} type="date" className={inputCls} value={f.reg_deadline} onChange={upd('reg_deadline')} />}</Field>
        <fieldset><legend className="mb-1 text-sm font-medium text-text-secondary">Жауапты мұғалімдер</legend>
          <div className="grid gap-x-2 sm:grid-cols-2">{staff.map(p => <Check key={p.id} id={`t-${p.id}`} checked={f.teacher_ids.includes(p.id)} onChange={v => set('teacher_ids', v ? [...f.teacher_ids, p.id] : f.teacher_ids.filter(x => x !== p.id))}>{p.full_name}</Check>)}</div></fieldset>
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-surface py-3">
        <Button loading={busy} onClick={() => run({}, 'Сақталды')}>Сақтау</Button>
        {!published
          ? <Button variant="success" disabled={busy} onClick={() => run({ publish: true }, 'Жарияланды')}>Жариялау</Button>
          : <Button variant="secondary" disabled={busy} onClick={() => run({ publish: false }, 'Жариядан алынды')}>Жариядан алу</Button>}
        {f.id && !ask && <Button variant="ghost" onClick={() => setAsk(true)}>Өшіру</Button>}
        {ask && <span role="alertdialog" aria-label="Растау" className="flex items-center gap-2 rounded-lg bg-danger-soft p-2 text-sm text-danger">Сайысты өшіру керек пе?<Button variant="danger" onClick={remove}>Өшіру</Button><Button variant="secondary" onClick={() => setAsk(false)}>Жоқ</Button></span>}
      </div>
    </main>
  );
}
