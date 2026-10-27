import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, Undo2 } from 'lucide-react';
import { Button, inputCls } from '../ui';
import { newPage, pageOf, PAGE_TYPES, TEMPLATES, tplLabel, typeLabel, type PageType } from './pages';

const WARN = 'Бет типін өзгерту кейбір орналасу параметрлерін өзгертуі мүмкін (мәтін мен код сақталады). Өзгерту алдында нобай сақталады — «Қайтару» батырмасымен алуға болады. Жалғастырасың ба?';

/** Page list of the lecture: add (type → template → title), reorder, duplicate, delete, change type or template. The JSON stays the source of truth. */
export function PagesPanel({ json, setJson }: { json: string; setJson: (s: string) => void }) {
  let pages: any[] | null = null;
  try { const v = JSON.parse(json); if (Array.isArray(v)) pages = v; } catch { /* shown below */ }
  const [open, setOpen] = useState(false), [type, setType] = useState<PageType>('slide'), [tpl, setTpl] = useState('title'), [name, setName] = useState('');
  const undo = useRef<string | null>(null), [canUndo, setCanUndo] = useState(false), [msg, setMsg] = useState('');
  const put = (next: any[], note: string) => { undo.current = json; setCanUndo(true); setJson(JSON.stringify(next, null, 1)); setMsg(note + ' «Сақтау» батырмасын бас.'); };
  const pickType = (t: PageType) => { setType(t); setTpl(TEMPLATES[t][0].id); };
  const add = () => { put([...pages!, newPage(type, tpl, name || TEMPLATES[type].find(x => x.id === tpl)!.label)], 'Бет қосылды.'); setOpen(false); setName(''); };
  const move = (i: number, d: number) => { const n = [...pages!]; [n[i], n[i + d]] = [n[i + d], n[i]]; put(n, 'Бет жылжытылды.'); };
  const dup = (i: number) => { const n = [...pages!]; n.splice(i + 1, 0, JSON.parse(JSON.stringify(n[i]))); put(n, 'Бет көшірілді.'); };
  const del = (i: number) => { if (confirm(`«${pages![i].title || 'Бет ' + (i + 1)}» бетін өшіру керек пе?`)) put(pages!.filter((_, k) => k !== i), 'Бет өшірілді.'); };
  const setT = (i: number, t: PageType) => { if (t === pageOf(pages![i]).pageType || !confirm(WARN)) return; put(pages!.map((s, k) => (k === i ? { ...s, pageType: t, templateId: '' } : s)), 'Бет типі өзгертілді.'); };
  const setTpl2 = (i: number, id: string) => put(pages!.map((s, k) => (k === i ? { ...s, pageType: pageOf(s).pageType, templateId: id } : s)), 'Үлгі белгісі өзгертілді.');
  const sel = 'min-h-[44px] rounded-md border border-border-input bg-surface px-2 text-sm text-text';
  return (
    <section aria-label="Беттер" className="space-y-3 rounded-xl border border-border bg-surface p-3 text-text">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Беттер {pages ? `(${pages.length})` : ''}</h3>
        <div className="flex gap-2">
          {canUndo && <Button variant="secondary" onClick={() => { setJson(undo.current!); undo.current = null; setCanUndo(false); setMsg('Соңғы өзгеріс қайтарылды.'); }}><Undo2 size={16} aria-hidden="true" />Қайтару</Button>}
          <Button disabled={!pages} aria-expanded={open} onClick={() => setOpen(o => !o)}><Plus size={16} aria-hidden="true" />Бет қосу</Button>
        </div>
      </div>
      {!pages ? <p className="text-sm text-danger">Алдымен төмендегі «Толық құрылым» ішіндегі JSON қатесін түзет.</p> : (
        <>
          {open && (
            <div role="group" aria-label="Жаңа бет" className="space-y-3 rounded-lg bg-surface-2 p-3">
              <fieldset className="space-y-1"><legend className="text-sm font-semibold">1. Бет типін таңда</legend>
                <div className="flex flex-wrap gap-2">{PAGE_TYPES.map(p => (
                  <button key={p.id} type="button" aria-pressed={type === p.id} onClick={() => pickType(p.id)} className={`min-h-[44px] rounded-lg border px-3 text-left text-sm ${type === p.id ? 'border-accent bg-accent text-on-accent' : 'border-border hover:bg-border'}`}><b>{p.label}</b><span className="block text-xs opacity-80">{p.hint}</span></button>
                ))}</div>
              </fieldset>
              <fieldset className="space-y-1"><legend className="text-sm font-semibold">2. Үлгіні таңда</legend>
                <div className="flex flex-wrap gap-2">{TEMPLATES[type].map(t => (
                  <button key={t.id} type="button" aria-pressed={tpl === t.id} onClick={() => setTpl(t.id)} className={`min-h-[44px] rounded-lg border px-3 text-left text-sm ${tpl === t.id ? 'border-accent bg-accent text-on-accent' : 'border-border hover:bg-border'}`}><b>{t.label}</b><span className="block text-xs opacity-80">{t.hint}</span></button>
                ))}</div>
              </fieldset>
              <label className="block text-sm font-semibold">3. Бет атауы<input className={`${inputCls} mt-1 font-normal`} value={name} onChange={e => setName(e.target.value)} placeholder="Мысалы: Цикл дегеніміз не?" /></label>
              <Button onClick={add}>Бетті жасау</Button>
            </div>
          )}
          <ol className="space-y-1">{pages.map((s, i) => {
            const p = pageOf(s), label = s.title || s.prompt || `Бет ${i + 1}`;
            return (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-2 py-1">
                <span className="w-6 shrink-0 tabular-nums text-text-secondary">{i + 1}</span>
                <span className="min-w-[8rem] flex-1 break-words font-medium">{label}</span>
                <select aria-label={`${i + 1}-бет: типі`} className={sel} value={p.pageType} onChange={e => setT(i, e.target.value as PageType)}>{PAGE_TYPES.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
                <select aria-label={`${i + 1}-бет: үлгісі`} className={sel} value={p.templateId} onChange={e => setTpl2(i, e.target.value)}>
                  {!TEMPLATES[p.pageType].some(x => x.id === p.templateId) && <option value={p.templateId}>{p.templateId ? p.templateId : '— үлгісіз'}</option>}
                  {TEMPLATES[p.pageType].map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
                </select>
                <span className="flex">
                  <button type="button" aria-label={`${i + 1}-бетті жоғары жылжыту`} disabled={i === 0} onClick={() => move(i, -1)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-border disabled:opacity-30"><ArrowUp size={18} aria-hidden="true" /></button>
                  <button type="button" aria-label={`${i + 1}-бетті төмен жылжыту`} disabled={i === pages!.length - 1} onClick={() => move(i, 1)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-border disabled:opacity-30"><ArrowDown size={18} aria-hidden="true" /></button>
                  <button type="button" aria-label={`${i + 1}-бетті көшіру`} onClick={() => dup(i)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-border"><Copy size={18} aria-hidden="true" /></button>
                  <button type="button" aria-label={`${i + 1}-бетті өшіру`} onClick={() => del(i)} className="flex h-11 w-11 items-center justify-center rounded-lg text-danger hover:bg-border"><Trash2 size={18} aria-hidden="true" /></button>
                </span>
              </li>
            );
          })}</ol>
        </>
      )}
      <p role="status" className="text-sm text-text-secondary">{msg}</p>
    </section>
  );
}
