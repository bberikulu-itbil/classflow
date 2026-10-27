import React, { useState, useEffect } from 'react';
import { sb, DEMO } from '../config';
import { TopBar } from './TopBar';
import { INP } from './Widgets';
import { AiPanel } from './AiPanel';
import { ImagePanel } from './ImagePanel';
import { ArrowDown, ArrowUp, Copy, GripVertical, LayoutTemplate, Plus, Trash2, Undo2 } from 'lucide-react';
import { Button, LinkButton, inputCls } from '../ui';
import { checkPages, fieldsOf, type Field } from '../lessons/blocks';
import { PagePicker } from '../lessons/PagePicker';
import { CanvasEditor } from '../lessons/CanvasEditor';
import { newPage, pageOf, PAGE_TYPES, TEMPLATES, tplLabel, typeLabel, type PageType } from '../lessons/pages';

const SAMPLE = [
  { type: 'title', title: 'Алгоритм', subtitle: '7-сынып · Информатика' },
  { type: 'content', title: 'Алгоритм деген не?', bullets: ['Әрекеттердің ретті тізбегі', 'Орындаушыға түсінікті болуы керек', 'Соңы бар (ақырлы)'], notes: 'Тұрмыстық мысал: шай қайнату' },
  { type: 'quiz', title: 'Тест', prompt: 'Қайсысы алгоритм қасиеті?', options: ['Дискреттілік', 'Түс', 'Салмақ'], answer: 0, points: 2, time: 20, speed: true, explanation: 'Алгоритм қадамдарға бөлінеді.' },
  { type: 'task', title: 'Қысқа жауап', prompt: 'Бағдарлама қай тілде жазылады: Python, ____ ? (бір сөз: C++)', accept: ['c++'], points: 3 },
  { type: 'code', title: 'Қосынды', prompt: 'Екі бүтін санды оқып (әрқайсысы жеке жолда), олардың қосындысын шығар.', starter: 'a = int(input())\nb = int(input())\n', hints: ['input() жол қайтарады, int() арқылы санға айналдыр', 'print(a + b)'], tests: [{ input: '3\n4', out: '7', label: 'Мысал 1' }, { input: '-5\n5', out: '0' }, { input: '100\n250', out: '350', hidden: true }], points: 5 },
  { type: 'logic', title: 'Логикалық вентиль', prompt: 'A және B-ні басып көр', gate: 'AND' },
  { type: 'matching', title: 'Сәйкестендір', pairs: [{ l: 'print', r: 'шығару' }, { l: 'input', r: 'енгізу' }, { l: 'len', r: 'ұзындық' }] },
  { type: 'flashcards', title: 'Терминдер', cards: [{ front: 'Алгоритм', back: 'Қадамдар тізбегі' }, { front: 'Айнымалы', back: 'Атауы бар жад ұясы' }] },
  { type: 'leaderboard', title: '🏆 Нәтиже' },
];

const DK = 'cf_demo_lessons'; // demo mode has no database: lectures live in this browser only
const demoAll = (): Record<string, any> => { try { return JSON.parse(localStorage.getItem(DK) || '{}'); } catch { return {}; } };
const STATUS = ['Нобай', 'Тексеруде', 'Жарияланған'];
const GRADES = ['5', '6', '7', '8', '9', '10', '11'];
const WARN = 'Бет типін өзгерту кейбір орналасу параметрлерін өзгертуі мүмкін (мәтін мен код сақталады). Өзгерту алдында нобай сақталады — «Қайтару» батырмасымен алуға болады. Жалғастырасың ба?';
const CHIP: Record<string, string> = { 'Мәтін': 'bg-accent-soft text-on-accent-soft', 'Код': 'bg-warning-soft text-text', 'Интерактив': 'bg-success-soft text-text', 'Ескертпе': 'bg-surface-2 text-text-secondary' };
const TYPE_CHIP: Record<PageType, string> = { slide: 'Слайд', scroll: 'Ұзын бет', interactive: 'Интерактив' };
const card = 'space-y-3 rounded-2xl border border-border bg-surface p-4';
const iconBtn = 'flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-border disabled:opacity-30';

function FieldRow({ f, uid, onChange, options }: { f: Field; uid: string; onChange: (v: any) => void; options: string[] }) {
  const id = `${uid}-${f.id}`;
  return (
    <div className="space-y-1 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2"><label htmlFor={id} className="text-sm font-semibold">{f.label}</label><span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[f.chip]}`}>{f.chip}</span></div>
      {f.kind === 'text' && <input id={id} className={inputCls} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'number' && <input id={id} type="number" min={0} max={100} className={inputCls + ' !w-28'} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'area' && <textarea id={id} rows={3} className={inputCls + ' py-2'} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'lines' && <textarea id={id} rows={Math.max(3, String(f.value).split('\n').length)} className={inputCls + ' py-2'} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'code' && <textarea id={id} rows={Math.max(4, String(f.value).split('\n').length)} spellCheck={false} className={inputCls + ' py-2 font-mono text-sm'} value={f.value} onChange={e => onChange(e.target.value)} />}
      {f.kind === 'bool' && <label className="flex min-h-[44px] items-center gap-2 text-sm"><input id={id} type="checkbox" className="h-5 w-5" checked={f.value} onChange={e => onChange(e.target.checked)} />Иә</label>}
      {f.kind === 'answer' && <select id={id} className={inputCls} value={f.value} onChange={e => onChange(e.target.value)}><option value={-1} disabled>— таңдалмаған —</option>{options.map((o, k) => <option key={k} value={k}>{String.fromCharCode(65 + k)}. {o}</option>)}</select>}
    </div>
  );
}

export function LessonEditorView({ id, me, onLogout }: { id: string; me: any; onLogout: () => void }) {
  const isNew = id === 'new';
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Информатика');
  const [grade, setGrade] = useState(''), [duration, setDuration] = useState(''), [summary, setSummary] = useState(''), [status, setStatus] = useState(STATUS[0]), [planRaw, setPlanRaw] = useState<any>({});
  const [loadErr, setLoadErr] = useState('');
  const [canvasOpen, setCanvasOpen] = useState(false), [dragFrom, setDragFrom] = useState<number | null>(null), [dragOver, setDragOver] = useState<number | null>(null);
  const [slidesJson, setSlidesJson] = useState('');
  const [termsJson, setTermsJson] = useState('');
  const [tab, setTab] = useState<'manual' | 'ai'>('manual'), [sel, setSel] = useState(0), [picking, setPicking] = useState(false), [chg, setChg] = useState(false);
  const [msg, setMsg] = useState(''), [canUndo, setCanUndo] = useState(false), undo = React.useRef<string | null>(null);

  useEffect(() => {
    setLoadErr('');
    const apply = (data: any) => {
      setTitle(data.title || ''); setSubject(data.subject || '');
      const pl = data.plan && typeof data.plan === 'object' && !Array.isArray(data.plan) ? data.plan : {}, m = pl.meta || {};
      setPlanRaw(pl); setGrade(String(m.grade || '')); setDuration(String(m.duration || '')); setSummary(String(m.summary || '')); setStatus(STATUS.includes(m.status) ? m.status : STATUS[0]);
      setSlidesJson(JSON.stringify(data.slides || [], null, 1)); setTermsJson(JSON.stringify(data.terms || [], null, 1)); setSel(0);
    };
    const sample = { slides: SAMPLE, terms: [{ term: 'Алгоритм', definition: 'Есепті шешу қадамдарының тізбегі' }] };
    if (isNew) apply({ subject: 'Информатика', ...sample });
    else if (DEMO) apply(demoAll()[id] || { title: 'Демо дәріс', subject: 'Информатика', ...sample });
    else {
      let live = true;
      sb.from('cf_lessons').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
        if (!live) return;
        if (error || !data) setLoadErr(error?.message || 'Дәріс табылмады'); else apply(data);
      });
      return () => { live = false; };
    }
  }, [id, isNew]);

  let pages: any[] | null = null;
  try { const v = JSON.parse(slidesJson || '[]'); if (Array.isArray(v)) pages = v; } catch { /* the folded JSON box shows the problem */ }
  const cur = pages && pages.length ? Math.min(sel, pages.length - 1) : -1, page = cur >= 0 ? pages![cur] : null;
  const fields = page ? fieldsOf(page) : [];
  const put = (next: any[], note: string, snap = true) => { if (snap) { undo.current = slidesJson; setCanUndo(true); } setSlidesJson(JSON.stringify(next, null, 1)); setMsg(note ? note + ' «Сақтау» батырмасын бас.' : ''); };
  const edit = (f: Field, v: any) => put(pages!.map((s, k) => (k === cur ? f.set(v) : s)), '', false);
  const move = (i: number, d: number) => { const n = [...pages!]; [n[i], n[i + d]] = [n[i + d], n[i]]; put(n, 'Бет жылжытылды.'); setSel(i + d); };
  const dup = (i: number) => { const n = [...pages!]; n.splice(i + 1, 0, JSON.parse(JSON.stringify(n[i]))); put(n, 'Бет көшірілді.'); setSel(i + 1); };
  const del = (i: number) => { if (confirm(`«${pages![i].title || 'Бет ' + (i + 1)}» бетін өшіру керек пе?`)) { put(pages!.filter((_, k) => k !== i), 'Бет өшірілді.'); setSel(Math.max(0, i - 1)); } };
  const secs = (fn: (a: any[]) => any[], note: string) => put(pages!.map((s, k) => (k === cur ? { ...s, sections: fn([...(s.sections || [])]) } : s)), note);
  const create = (t: PageType, tpl: string, name: string) => { const p = newPage(t, tpl, name || TEMPLATES[t].find(x => x.id === tpl)!.label); put([...pages!, p], 'Бет қосылды.'); setSel(pages!.length); setPicking(false); setTab('manual'); if (p.type === 'canvas') setCanvasOpen(true); };
  const reorder = (from: number, to: number) => { setDragFrom(null); setDragOver(null); if (from === to) return; const n = [...pages!]; n.splice(to, 0, n.splice(from, 1)[0]); put(n, 'Бет жылжытылды.'); setSel(to); };
  const setSlide = (sl: any) => setSlidesJson(prev => { try { const a = JSON.parse(prev); a[cur] = sl; return JSON.stringify(a, null, 1); } catch { return prev; } });
  const setType = (t: PageType) => { if (!page || t === pageOf(page).pageType || !confirm(WARN)) return; put(pages!.map((s, k) => (k === cur ? { ...s, pageType: t, templateId: '' } : s)), 'Бет типі өзгертілді.'); };
  const setTpl = (tid: string) => put(pages!.map((s, k) => (k === cur ? { ...s, pageType: pageOf(s).pageType, templateId: tid } : s)), 'Үлгі белгісі өзгертілді.');
  const row = (f: Field) => <FieldRow key={cur + f.id} uid={'f' + cur} f={f} options={page.options || []} onChange={v => edit(f, v)} />;
  const issues = pages ? checkPages(pages) : [];
  const nInter = pages ? pages.filter(s => pageOf(s).pageType === 'interactive').length : 0;
  const nBlocks = pages ? pages.reduce((a, s) => a + fieldsOf(s).length, 0) : 0;

  const save = async () => {
    if (loadErr) return;
    let slides, terms;
    try {
      slides = JSON.parse(slidesJson);
      terms = JSON.parse(termsJson || '[]');
      if (!Array.isArray(slides)) throw 0;
    } catch {
      alert('JSON қате');
      return;
    }
    if (!title.trim()) {
      alert('Тақырып жаз');
      return;
    }
    const meta = { grade, duration: duration ? +duration : '', summary: summary.trim(), status };
    const row = { title: title.trim(), subject, slides, terms, plan: { ...planRaw, meta } };
    if (DEMO) {
      const all = demoAll(), key = isNew ? 'demo-' + Date.now().toString(36) : id;
      all[key] = row;
      try { localStorage.setItem(DK, JSON.stringify(all)); } catch { alert('Браузер сақтауға рұқсат бермеді'); return; }
      alert('Демо режимінде сақталды (тек осы браузерде)'); window.location.hash = ''; return;
    }
    if (isNew) {
      await sb.from('cf_lessons').insert({ ...row, owner_id: me.id, school_id: me.school_id });
    } else {
      await sb.from('cf_lessons').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id);
    }
    alert('Сақталды');
    window.location.hash = '';
  };
  const sel2 = 'min-h-[44px] w-full rounded-md border border-border-input bg-surface px-2 text-sm text-text';

  return (
    <div data-theme="teal" className="min-h-screen bg-bg text-text">
      <TopBar me={me} onLogout={onLogout} />
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2">
          <nav aria-label="Орналасу" className="text-sm text-text-secondary"><a className="underline" href="#lessons/modules">Модульдер</a> / <span>Дәріс</span></nav>
          <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{title || 'Жаңа дәріс'}</h1>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-on-accent-soft">{status}</span>
          {!isNew && <LinkButton variant="ghost" href={'#preview/' + id}>Алдын ала қарау</LinkButton>}
          <Button variant="success" disabled={!!loadErr} onClick={save}>Сақтау</Button>
        </div>
        <div role="tablist" aria-label="Жасау тәсілі" className="mx-auto flex max-w-7xl gap-1 px-4">
          {([['manual', 'Қолмен жасау'], ['ai', 'ЖИ арқылы жасау']] as const).map(([k, l]) => (
            <button key={k} type="button" role="tab" id={'tab-' + k} aria-selected={tab === k} aria-controls="tabpanel" onClick={() => setTab(k)} className={`min-h-[48px] border-b-4 px-4 font-semibold ${tab === k ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text'}`}>{l}</button>
          ))}
        </div>
      </div>
      <main id="tabpanel" role="tabpanel" aria-labelledby={'tab-' + tab} className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          {loadErr && <p role="alert" className="rounded-xl border-2 border-danger bg-danger-soft p-3 text-danger">Дәріс жүктелмеді: {loadErr}. Бос мәтінді қателесіп сақтап жібермеу үшін «Сақтау» өшірілген.</p>}
          {tab === 'ai' && (
            <AiPanel
              mode="slides"
              countLabel="Слайд саны"
              countDef={10}
              onResult={r => {
                setSlidesJson(JSON.stringify(r.slides || [], null, 1));
                setTermsJson(JSON.stringify(r.terms || [], null, 1));
                setSel(0); setTab('manual');
                alert('Слайдтар дайын. Тест жауаптары мен код-тесттерді тексеріп шық! ЖИ нәтижесі нобай болып қалады — әр бетті қарап шық.');
              }}
              onParams={v => {
                if (!title.trim()) setTitle(v.topic);
              }}
            />
          )}
          {tab === 'manual' && (
            <>
              <div><h2 className="text-3xl font-bold">Дәріс конструкторы</h2><p className="text-text-secondary">Негізгі ақпаратты толтырып, дәрісті беттерге бөліп құрастырыңыз.</p></div>
              <section aria-label="Негізгі ақпарат" className={card}>
                <h3 className="text-xl font-bold">Негізгі ақпарат</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm text-text-secondary sm:col-span-2">Дәріс атауы<input className={`${inputCls} mt-1 text-text`} value={title} onChange={e => setTitle(e.target.value)} placeholder="Сабақ тақырыбы" /></label>
                  <label className="block text-sm text-text-secondary">Пән<input className={`${inputCls} mt-1 text-text`} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Пән" /></label>
                  <label className="block text-sm text-text-secondary">Сынып<select className={`${inputCls} mt-1 text-text`} value={grade} onChange={e => setGrade(e.target.value)}><option value="">— таңдалмаған</option>{GRADES.map(g => <option key={g} value={g}>{g}-сынып</option>)}</select></label>
                  <label className="block text-sm text-text-secondary">Ұзақтығы, минут<input type="number" min={5} max={240} className={`${inputCls} mt-1 text-text`} value={duration} onChange={e => setDuration(e.target.value)} placeholder="45" /></label>
                  <label className="block text-sm text-text-secondary">Күйі<select className={`${inputCls} mt-1 text-text`} value={status} onChange={e => setStatus(e.target.value)}>{STATUS.map(x => <option key={x}>{x}</option>)}</select></label>
                  <label className="block text-sm text-text-secondary sm:col-span-2">Қысқаша сипаттама<textarea rows={2} maxLength={400} className={`${inputCls} mt-1 py-2 text-text`} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Дәрістің мақсаты немесе мазмұны" /></label>
                </div>
              </section>
              <section aria-label="Беттер" className={card}>
                <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xl font-bold">Дәріс беттері {pages ? `(${pages.length})` : ''}</h3><p className="text-sm text-text-secondary">Бет типі көріністі анықтайды, ал блоктар бет ішіндегі мазмұнды құрайды.</p></div></div>
                {!pages ? <p role="alert" className="text-sm text-danger">Алдымен төмендегі «Толық құрылым» ішіндегі JSON қатесін түзет.</p> : (
                  <ol aria-label="Дәріс беттері" className="space-y-2">{pages.map((s, i) => {
                    const p = pageOf(s), t = s.title || s.prompt || `Бет ${i + 1}`;
                    return (
                      <li key={i} draggable onDragStart={e => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }} onDragEnd={() => { setDragFrom(null); setDragOver(null); }} onDragOver={e => { if (dragFrom !== null) { e.preventDefault(); setDragOver(i); } }} onDrop={e => { e.preventDefault(); if (dragFrom !== null) reorder(dragFrom, i); }}
                        className={`flex flex-wrap items-center gap-1 rounded-xl border-2 p-1 ${dragOver === i && dragFrom !== null && dragFrom !== i ? 'border-dashed border-accent' : i === cur ? 'border-accent bg-accent-soft' : 'border-border'} ${dragFrom === i ? 'opacity-50' : ''}`}>
                        <span aria-hidden="true" title="Сүйреп ауыстыру" className="flex h-11 w-6 shrink-0 cursor-grab items-center justify-center text-text-muted"><GripVertical size={18} /></span>
                        <button type="button" aria-current={i === cur ? 'true' : undefined} onClick={() => setSel(i)} className="flex min-h-[56px] min-w-[10rem] flex-1 items-center gap-3 rounded-lg px-2 text-left">
                          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 font-bold tabular-nums">{i + 1}</span>
                          <span className="min-w-0 flex-1"><b className="block break-words">{t}</b><span className="text-sm text-text-secondary">{tplLabel(p.pageType, p.templateId) || typeLabel(p.pageType)} · {fieldsOf(s).length} блок</span></span>
                          <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold">{TYPE_CHIP[p.pageType]}</span>
                        </button>
                        <span className="flex">
                          <button type="button" aria-label={`${i + 1}-бетті жоғары жылжыту`} disabled={i === 0} onClick={() => move(i, -1)} className={iconBtn}><ArrowUp size={18} aria-hidden="true" /></button>
                          <button type="button" aria-label={`${i + 1}-бетті төмен жылжыту`} disabled={i === pages!.length - 1} onClick={() => move(i, 1)} className={iconBtn}><ArrowDown size={18} aria-hidden="true" /></button>
                          <button type="button" aria-label={`${i + 1}-бетті көшіру`} onClick={() => dup(i)} className={iconBtn}><Copy size={18} aria-hidden="true" /></button>
                          <button type="button" aria-label={`${i + 1}-бетті өшіру`} onClick={() => del(i)} className={iconBtn + ' !text-danger'}><Trash2 size={18} aria-hidden="true" /></button>
                        </span>
                      </li>
                    );
                  })}</ol>
                )}
                <button type="button" disabled={!pages} onClick={() => setPicking(true)} className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent font-semibold text-accent hover:bg-accent-soft disabled:opacity-40"><Plus size={18} aria-hidden="true" />Жаңа бет: алдымен типін, кейін үлгісін таңдаңыз</button>
              </section>
              {page && (
                <section aria-label="Таңдалған бет ішіндегі блоктар" className={card}>
                  <h3 className="text-xl font-bold">Таңдалған бет ішіндегі блоктар <span className="text-base font-normal text-text-secondary">· {cur + 1}-бет</span></h3>
                  {fields.length ? <div className="space-y-2">{page.type === 'solution' ? <>
                    {fields.filter(f => !/^[hbtcx]\d+$/.test(f.id)).map(row)}
                    {(page.sections || []).map((_: any, i: number, all: any[]) => (
                      <div key={i} role="group" aria-label={`${i + 1}-бөлім`} className="space-y-2 rounded-xl border-2 border-border p-2">
                        <div className="flex items-center justify-between"><b>{i + 1}-бөлім</b><span className="flex">
                          <button type="button" aria-label={`${i + 1}-бөлімді жоғары жылжыту`} disabled={i === 0} className={iconBtn} onClick={() => secs(a => { [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; }, 'Бөлім жылжытылды.')}><ArrowUp size={18} aria-hidden="true" /></button>
                          <button type="button" aria-label={`${i + 1}-бөлімді төмен жылжыту`} disabled={i === all.length - 1} className={iconBtn} onClick={() => secs(a => { [a[i + 1], a[i]] = [a[i], a[i + 1]]; return a; }, 'Бөлім жылжытылды.')}><ArrowDown size={18} aria-hidden="true" /></button>
                          <button type="button" aria-label={`${i + 1}-бөлімді өшіру`} className={iconBtn + ' !text-danger'} onClick={() => { if (confirm(`${i + 1}-бөлімді өшіру керек пе?`)) secs(a => a.filter((_, k) => k !== i), 'Бөлім өшірілді.'); }}><Trash2 size={18} aria-hidden="true" /></button>
                        </span></div>
                        {fields.filter(f => new RegExp(`^[hbtcx]${i}$`).test(f.id)).map(row)}
                      </div>
                    ))}
                    <button type="button" onClick={() => secs(a => [...a, { h: 'Жаңа бөлім', bullets: ['…'] }], 'Бөлім қосылды.')} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent font-semibold text-accent hover:bg-accent-soft"><Plus size={18} aria-hidden="true" />Бөлім қосу</button>
                  </> : fields.map(row)}</div> : <p className="text-sm text-text-secondary">Бұл бет түрінің өрістерін «Толық құрылым» ішінде өңдеуге болады.</p>}
                  {page.type === 'canvas' && <Button variant="secondary" onClick={() => setCanvasOpen(true)}><LayoutTemplate size={16} aria-hidden="true" />Слайд редакторын ашу</Button>}
                  {page.type === 'code' && <p className="text-sm text-text-secondary">Код тесттері (input / out) «Толық құрылым» ішінде өңделеді.</p>}
                </section>
              )}
              <ImagePanel json={slidesJson} setJson={setSlidesJson} schoolId={me.school_id} />
              <details className="rounded-2xl border border-border bg-surface p-4">
                <summary className="cursor-pointer text-lg font-bold">Толық құрылым және техникалық өрістер (JSON)</summary>
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-text-secondary">
                    Слайдтар (JSON). pageType (slide | scroll | interactive) және templateId — беттер тізімінен қойылады. Түрлері: title, content, quiz, task, code, logic, matching, flashcards, solution, leaderboard. solution: sections = [&#123;h, text | bullets, code?, hide?, img?&#125;] — төмен қарай тізілген бөлімдер, hide:true — «Көрсету» басқанша жасырын. Мәтін ішінде ||жасырын|| — нүктелер болып тұрады, басқанда немесе тақтадағы Алға/Көрсету басқанда ашылады. ru: &#123;title, bullets, …&#125; — орысша өрістер (ҚАЗ/РУС ауыстырғышы). img + alt = сурет (title, content, quiz, task, code; төмендегі «Сурет қосу» арқылы); quiz: answer = дұрыс нұсқа нөмірі (0-ден); task: accept = қабылданатын жауаптар; time = секунд, speed:true = жылдамдыққа бонус; code: tests = [&#123;input, out, hidden?&#125;], hints = [...].
                  </p>
                  <textarea aria-label="Слайдтар JSON" className={`${INP} h-96 font-mono`} value={slidesJson} onChange={e => setSlidesJson(e.target.value)} />
                  <p className="text-xs text-text-secondary">Терминдер (JSON): [&#123;term, definition&#125;]</p>
                  <textarea aria-label="Терминдер JSON" className={`${INP} h-28 font-mono`} value={termsJson} onChange={e => setTermsJson(e.target.value)} />
                </div>
              </details>
            </>
          )}
        </div>
        <aside aria-label="Құрастыру көмегі" className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Құрастыру көмегі</h2>
          {page && (
            <section aria-label="Белсенді бет" className="space-y-2 rounded-2xl border-2 border-accent bg-accent-soft p-4">
              <h3 className="text-lg font-bold">Белсенді бет</h3>
              <p className="text-sm text-text-secondary">{typeLabel(pageOf(page).pageType)} · «{tplLabel(pageOf(page).pageType, pageOf(page).templateId) || 'үлгісіз'}» үлгісі</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" aria-expanded={chg} onClick={() => setChg(c => !c)}>Бет түрін өзгерту</Button>
                {canUndo && <Button variant="secondary" onClick={() => { setSlidesJson(undo.current!); undo.current = null; setCanUndo(false); setMsg('Соңғы өзгеріс қайтарылды.'); }}><Undo2 size={16} aria-hidden="true" />Қайтару</Button>}
              </div>
              {chg && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Бет типі<select aria-label={`${cur + 1}-бет: типі`} className={sel2} value={pageOf(page).pageType} onChange={e => setType(e.target.value as PageType)}>{PAGE_TYPES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
                  <label className="block text-sm font-semibold">Үлгі<select aria-label={`${cur + 1}-бет: үлгісі`} className={sel2} value={pageOf(page).templateId} onChange={e => setTpl(e.target.value)}>
                    {!TEMPLATES[pageOf(page).pageType].some(x => x.id === pageOf(page).templateId) && <option value={pageOf(page).templateId}>{pageOf(page).templateId || '— үлгісіз'}</option>}
                    {TEMPLATES[pageOf(page).pageType].map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select></label>
                </div>
              )}
            </section>
          )}
          <section aria-label="Келесі қадам" className="space-y-2 rounded-2xl border border-border bg-surface p-4">
            <h3 className="text-lg font-bold">Келесі қадам</h3>
            <p className="text-sm text-text-secondary">Беттерді реттеңіз немесе бетке жаңа элемент қосыңыз.</p>
            {!isNew && <LinkButton variant="secondary" href={'#preview/' + id}>Алдын ала қарау</LinkButton>}
          </section>
          <section aria-label="Тексеру" className="space-y-2 rounded-2xl border border-border bg-surface p-4">
            <h3 className="text-lg font-bold">Тексеру</h3>
            <p className="text-sm text-text-secondary">{pages ? `${pages.length} бет · ${nBlocks} блок · ${nInter} интерактивті бет` : 'JSON қатесі бар'}</p>
            {issues.length > 0 ? <ul className="list-disc space-y-1 pl-5 text-sm text-danger">{issues.map((x, k) => <li key={k}>{x}</li>)}</ul> : pages && <p className="text-sm text-success">Ескертулер жоқ.</p>}
            <Button variant="success" disabled={!!loadErr} onClick={save}>Сақтау</Button>
          </section>
          <p role="status" className="text-sm text-text-secondary">{msg}</p>
        </aside>
      </main>
      {canvasOpen && page?.type === 'canvas' && <CanvasEditor pages={pages!} cur={cur} schoolId={me.school_id} onChange={setSlide} onSelect={setSel} onClose={ch => { setCanvasOpen(false); if (ch) setMsg('Слайд өзгерді. «Сақтау» батырмасын бас.'); }} />}
      {picking && <PagePicker onCancel={() => setPicking(false)} onCreate={create} />}
    </div>
  );
}
