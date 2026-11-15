import React, { useEffect, useState } from 'react';
import { Lock, MapPin, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, ErrorBox, Field, LinkButton, Skeleton, inputCls, useLoad } from '../ui';
import * as st from './store';
import type { Form, Me } from './store';

const STEPS: Form['status'][] = ['draft', 'rules_locked', 'published'];
const BACK = '#contests/catalog';

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
  type TextKey = 'title' | 'organizer' | 'url' | 'description' | 'starts_on' | 'ends_on' | 'reg_from' | 'reg_deadline' | 'rules_text' | 'location' | 'map_url' | 'age_min' | 'age_max' | 'team_size' | 'fee_text' | 'travel_text' | 'toolset' | 'cover_url' | 'icon' | 'lat' | 'lng' | 'field';
  const upd = (k: TextKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value);
  const [finding, setFinding] = useState(false);
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
  const stageSet = (i: number, k: 'name' | 'on_date' | 'format' | 'advance' | 'level' | 'location' | 'who', v: string) => set('stages', f.stages.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const catSet = (i: number, p: Partial<st.Category>) => set('categories', f.categories.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const published = f.status === 'published';
  const otherField = !st.FIELDS.some(x => x[0] === f.field);
  const catNames = [...new Set([...st.KNOWN_CATS, ...(d?.categories.map(x => x.name) ?? [])])].sort((a, b) => a.localeCompare(b, 'kk'));
  const find = async () => {
    setMsg(''); setNote(''); setFinding(true);
    try { const p = await st.findCoords(f.map_url, f.location); setF(o => (o ? { ...o, lat: p.lat.toFixed(5), lng: p.lng.toFixed(5) } : o)); setNote('Координата табылды: картада нүкте көрінеді. Сақтауды ұмытпаңыз'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Қате'); } finally { setFinding(false); }
  };

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
          <div className="space-y-2">
            <Field label="Сала">{i => <select id={i} className={inputCls} value={otherField ? '__other' : f.field} onChange={e => set('field', e.target.value === '__other' ? '' : e.target.value)}>{st.FIELDS.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}<option value="__other">Басқа (өзім жазамын)</option></select>}</Field>
            {otherField && <Field label="Сала атауы">{i => <input id={i} className={inputCls} maxLength={60} value={f.field} onChange={upd('field')} />}</Field>}
          </div>
          {f.stages.length === 0
            ? <Field label="Деңгей">{i => <select id={i} className={inputCls} value={f.level} onChange={e => set('level', e.target.value)}><option value="">Көрсетілмеген</option>{st.LEVELS.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>}</Field>
            : <p className="self-end pb-2 text-sm text-text-secondary">Кезеңдер бар: деңгей әр кезеңде көрсетіледі.</p>}
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Орны, шарттары, безендіру</h2>
        <Check id="online" checked={f.is_online} onChange={v => set('is_online', v)}>Онлайн өтеді</Check>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Қай жерде өтеді">{i => <input id={i} className={inputCls} maxLength={200} value={f.location} onChange={upd('location')} />}</Field>
          <Field label="2GIS сілтемесі">{i => <input id={i} type="url" inputMode="url" placeholder="https://2gis.kz/..." className={inputCls} value={f.map_url} onChange={upd('map_url')} />}</Field>
          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Ендік (картадағы нүкте)">{i => <input id={i} inputMode="decimal" className={inputCls} placeholder="53.21440" value={f.lat} onChange={upd('lat')} />}</Field>
            <Field label="Бойлық">{i => <input id={i} inputMode="decimal" className={inputCls} placeholder="63.62460" value={f.lng} onChange={upd('lng')} />}</Field>
            <Button variant="secondary" loading={finding} onClick={find}><MapPin size={16} aria-hidden="true" />Координатаны табу</Button>
          </div>
          <Field label="Жасы: бастап">{i => <input id={i} type="number" min={3} max={99} className={inputCls} value={f.age_min} onChange={upd('age_min')} />}</Field>
          <Field label="Жасы: дейін">{i => <input id={i} type="number" min={3} max={99} className={inputCls} value={f.age_max} onChange={upd('age_max')} />}</Field>
          <Field label="Команда мөлшері">{i => <input id={i} className={inputCls} maxLength={40} placeholder="1–2" value={f.team_size} onChange={upd('team_size')} />}</Field>
          <Field label="Белгіше (эмодзи)">{i => <input id={i} className={inputCls} maxLength={8} placeholder="🤖" value={f.icon} onChange={upd('icon')} />}</Field>
        </div>
        <Field label="Құрал-жабдық / бағдарлама">{i => <textarea id={i} rows={2} maxLength={600} className={inputCls + ' py-2'} value={f.toolset} onChange={upd('toolset')} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Қатысу құны">{i => <textarea id={i} rows={2} maxLength={600} className={inputCls + ' py-2'} value={f.fee_text} onChange={upd('fee_text')} />}</Field>
          <Field label="Жол шығыны">{i => <textarea id={i} rows={2} maxLength={800} className={inputCls + ' py-2'} value={f.travel_text} onChange={upd('travel_text')} />}</Field>
        </div>
        <Field label="Мұқаба суретінің сілтемесі (https)">{i => <input id={i} type="url" inputMode="url" placeholder="https://" className={inputCls} value={f.cover_url} onChange={upd('cover_url')} />}</Field>
        {f.cover_url.trim() && /^https:\/\//i.test(f.cover_url.trim()) && <img src={f.cover_url.trim()} alt="Мұқаба алдын ала көрінісі" className="h-32 w-full rounded-lg object-cover" />}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Кезеңдер кестесі</h2>
        {f.stages.length === 0 && <p className="text-sm text-text-secondary">Кезең жоқ. Қажет болса қосыңыз.</p>}
        {f.stages.map((s, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-3">
            <Field label={`Кезең ${i + 1}`}>{x => <input id={x} className={inputCls} maxLength={80} value={s.name} onChange={e => stageSet(i, 'name', e.target.value)} />}</Field>
            <Field label="Күні">{x => <input id={x} type="date" className={inputCls} value={s.on_date ?? ''} onChange={e => stageSet(i, 'on_date', e.target.value)} />}</Field>
            <Field label="Деңгейі">{x => <select id={x} className={inputCls} value={s.level ?? ''} onChange={e => stageSet(i, 'level', e.target.value)}><option value="">Көрсетілмеген</option>{st.LEVELS.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>}</Field>
            <Field label="Орны">{x => <input id={x} className={inputCls} maxLength={200} value={s.location ?? ''} onChange={e => stageSet(i, 'location', e.target.value)} />}</Field>
            <Field label="Кім қатыса алады">{x => <input id={x} className={inputCls} maxLength={300} placeholder="Мысалы: облыстағы кез келген команда" value={s.who ?? ''} onChange={e => stageSet(i, 'who', e.target.value)} />}</Field>
            <Field label="Формат">{x => <input id={x} className={inputCls} maxLength={120} placeholder="Онлайн / қатысып" value={s.format ?? ''} onChange={e => stageSet(i, 'format', e.target.value)} />}</Field>
            <Field label="Келесіге өту шарты">{x => <input id={x} className={inputCls} maxLength={200} value={s.advance ?? ''} onChange={e => stageSet(i, 'advance', e.target.value)} />}</Field>
            <Button variant="ghost" className="justify-self-start" onClick={() => set('stages', f.stages.filter((_, j) => j !== i))} aria-label={`Кезең ${i + 1} өшіру`}><Trash2 size={18} aria-hidden="true" />Өшіру</Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => set('stages', [...f.stages, { name: '', on_date: null, format: null, advance: null, level: null, location: null, who: null }])}><Plus size={16} aria-hidden="true" />Кезең қосу</Button>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Санаттар</h2>
        <datalist id="known-cats">{catNames.map(n => <option key={n} value={n} />)}</datalist>
        <p className="text-sm text-text-secondary">Жарыс ішінде бөлімдер болса (мысалы, FLL, Drone Soccer), әрқайсысына өз ережесін жазыңыз. Оқушы өтінімде санатты таңдайды. Атауын жаза бастасаңыз, белгілі санаттар ұсынылады; тізімде жоқ санатты өзіңіз жаза аласыз.</p>
        {f.categories.map((c, i) => (
          <div key={c.id ?? i} className="space-y-2 rounded-lg border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label={`Санат ${i + 1}`}>{x => <input id={x} list="known-cats" className={inputCls} maxLength={120} value={c.name} onChange={e => catSet(i, { name: e.target.value })} />}</Field>
              <Field label="Ереже сілтемесі">{x => <input id={x} type="url" inputMode="url" placeholder="https://" className={inputCls} value={c.rules_url ?? ''} onChange={e => catSet(i, { rules_url: e.target.value })} />}</Field>
            </div>
            <Field label="Ереже мәтіні">{x => <textarea id={x} rows={4} className={inputCls + ' py-2'} value={c.rules_text} onChange={e => catSet(i, { rules_text: e.target.value })} />}</Field>
            <fieldset><legend className="mb-1 text-sm font-medium text-text-secondary">Сыныптар (таңдамасаңыз, жалпы)</legend>
              <div className="flex flex-wrap gap-x-2">{[5, 6, 7, 8, 9, 10, 11].map(n => <Check key={n} id={`cg${i}-${n}`} checked={c.grades.includes(n)} onChange={v => catSet(i, { grades: v ? [...c.grades, n].sort((a, b) => a - b) : c.grades.filter(x => x !== n) })}>{n}</Check>)}</div></fieldset>
            <Button variant="ghost" onClick={() => set('categories', f.categories.filter((_, j) => j !== i))} aria-label={`Санат ${i + 1} өшіру`}><Trash2 size={18} aria-hidden="true" />Өшіру</Button>
          </div>
        ))}
        <Button variant="secondary" onClick={() => set('categories', [...f.categories, { name: '', rules_url: null, rules_text: '', grades: [] }])}><Plus size={16} aria-hidden="true" />Санат қосу</Button>
      </section>

      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">Жалпы ережелер {f.rules_locked && <span className="inline-flex items-center gap-1 text-sm font-normal text-success"><Lock size={14} aria-hidden="true" />бекітілген{c ? `, нұсқа ${c.rules_version}` : ''}</span>}</h2>
        {f.rules_locked && <p className="rounded-md bg-warning-soft p-3 text-sm text-warning">Ереже бекітілген. Мәтінді өзгертіп сақтасаңыз, жаңа нұсқа ашылады және өтінім берген оқушыларға хабар барады.</p>}
        <Field label="Ереже мәтіні">{i => <textarea id={i} rows={8} className={inputCls + ' py-2'} value={f.rules_text} onChange={upd('rules_text')} />}</Field>
        {!f.rules_locked && <Button variant="secondary" disabled={busy || !f.title.trim()} onClick={() => run({ lock: true }, 'Ереже бекітілді')}><Lock size={16} aria-hidden="true" />Ережелерді бекіту</Button>}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Тіркеу</h2>
        <Check id="regopen" checked={f.reg_open} onChange={v => set('reg_open', v)}>Тіркеу ашық</Check>
        <Check id="needapp" checked={f.needs_approval} onChange={v => set('needs_approval', v)}>Өтінімді жауапты мұғалім растайды</Check>
        <Field label="Тіркеу басталуы (бастап)">{i => <input id={i} type="date" className={inputCls} value={f.reg_from} onChange={upd('reg_from')} />}</Field>
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
