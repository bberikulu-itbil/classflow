// Ways to make many variants of one task, so every student gets a paper of their own:
// a template with changing numbers (exact answers, offline) or similar questions written by the AI from variant A.
import React, { useMemo, useState } from 'react';
import { Plus, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Button } from '../ui';
import { HELPERS, PRESETS, blankGen, generate, type Gen } from './gen';
import type { Task, Var } from './model';

const inp = 'w-full rounded-lg border border-border-input bg-surface px-3 py-2 text-sm';
const lbl = 'flex flex-col gap-1 text-xs font-bold text-text-secondary';

export function VariantMaker({ task, onVars }: { task: Task; onVars: (vars: Var[], gen: Gen | null, append: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [how, setHow] = useState<'tpl' | 'ai'>(task.kind === 'match' ? 'ai' : 'tpl');
  const [g, setG] = useState<Gen>(task.gen || blankGen());
  const [seed, setSeed] = useState(1);
  const [n, setN] = useState(5), [extra, setExtra] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState('');
  const filled = task.vars.filter(v => v.q.trim()).length;
  const preview = useMemo(() => { try { return { ...generate(g, task.kind, seed), err: '' }; } catch (e) { return { vars: [] as Var[], note: '', err: (e as Error).message }; } }, [g, task.kind, seed]);
  const setP = (i: number, p: Partial<Gen['params'][0]>) => setG({ ...g, params: g.params.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  const apply = () => {
    if (!preview.vars.length) return;
    if (filled && !window.confirm(`Бұл тапсырмадағы ${filled} нұсқа шаблоннан жасалған ${preview.vars.length} нұсқамен ауыстырылады. Жалғастырасыз ба?`)) return;
    onVars(preview.vars, g, false); setDone(`${preview.vars.length} нұсқа жасалды`);
  };
  const askAi = async () => {
    const s = task.vars.find(v => v.q.trim());
    if (!s) { setErr('Алдымен А нұсқасын қолмен жазыңыз: ЖИ соған ұқсатып жасайды.'); return; }
    if (DEMO) { setErr('Демо режимде ЖИ жұмыс істемейді'); return; }
    setBusy(true); setErr(''); setDone('');
    const sample = task.kind === 'quiz' ? { q: s.q, options: s.options, answer: s.answer, why: s.why } : task.kind === 'short' ? { q: s.q, accept: s.accept.split(';').map(x => x.trim()), why: s.why } : { q: s.q, left: s.left, right: s.right, why: s.why };
    const { data, error } = await sb.functions.invoke('cf-ai', { body: { mode: 'variants', kind: task.kind, sample, count: Math.min(n, 26 - filled), extra } });
    setBusy(false);
    let msg = data?.error as string | undefined;
    if (error) { try { msg = (await (error as any).context.json()).error; } catch { msg = error.message; } }
    if (msg) { setErr(msg); return; }
    const got: Var[] = ((data?.result?.variants || []) as any[]).map(x => ({
      q: String(x.q || ''), options: Array.isArray(x.options) ? x.options.map(String) : [], answer: Number(x.answer) || 0,
      accept: Array.isArray(x.accept) ? x.accept.map(String).join('; ') : String(x.accept || ''), left: Array.isArray(x.left) ? x.left.map(String) : [], right: Array.isArray(x.right) ? x.right.map(String) : [], why: String(x.why || ''),
    })).filter(v => v.q.trim());
    if (!got.length) { setErr('ЖИ нұсқа қайтармады, қайталап көріңіз.'); return; }
    onVars(got, null, true); setDone(`ЖИ ${got.length} нұсқа қосты. Әрқайсысын тексеріп шығыңыз: ЖИ қателесуі мүмкін.`);
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60">
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="flex min-h-[52px] w-full items-center gap-2 px-4 text-left">
        <Wand2 size={18} className="text-violet-700" aria-hidden="true" />
        <span className="flex-1 font-bold text-violet-900">Нұсқаларды автоматты жасау<span className="ml-2 text-sm font-normal text-violet-800">· қазір {task.vars.length} нұсқа{task.gen ? ' · шаблон сақталған' : ''}</span></span>
        <span className="text-sm font-semibold text-violet-800">{open ? 'Жабу' : 'Ашу'}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-violet-200 p-4">
          <div role="tablist" aria-label="Тәсіл" className="flex flex-wrap gap-1 rounded-xl bg-white p-1">
            <button type="button" role="tab" aria-selected={how === 'tpl'} onClick={() => setHow('tpl')} className={`min-h-[40px] flex-1 rounded-lg px-3 text-sm font-bold ${how === 'tpl' ? 'bg-violet-600 text-white' : 'text-violet-800'}`}>Шаблон: сандар ауысады</button>
            <button type="button" role="tab" aria-selected={how === 'ai'} onClick={() => setHow('ai')} className={`min-h-[40px] flex-1 rounded-lg px-3 text-sm font-bold ${how === 'ai' ? 'bg-violet-600 text-white' : 'text-violet-800'}`}>ЖИ: ұқсас сұрақтар</button>
          </div>

          {how === 'tpl' && (task.kind === 'match' ? <p className="text-sm text-text-secondary">Сәйкестендіруге шаблон жоқ: ЖИ арқылы немесе қолмен жасаңыз.</p> : (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Сұрақта өзгеретін сандарды <b>{'{a}'}</b> деп жазыңыз, есептеуді де жақшаға аласыз: <code>{'{bin(a)}'}</code>. Әр нұсқада сандар кездейсоқ алынады, жауап формуламен дәл есептеледі.</p>
              <label className={lbl}>Дайын шаблон
                <select className={inp} value="" onChange={e => { const p = PRESETS[+e.target.value]; if (p) setG({ ...p.g, params: p.g.params.map(x => ({ ...x })), wrong: [...p.g.wrong], count: g.count }); }}>
                  <option value="">— таңдаңыз —</option>{PRESETS.map((p, i) => <option key={i} value={i}>{p.name}{p.kind !== task.kind ? (p.kind === 'quiz' ? ' (тест үшін)' : ' (қысқа жауап үшін)') : ''}</option>)}
                </select></label>
              <label className={lbl}>Сұрақ шаблоны<textarea rows={2} className={inp} value={g.q} onChange={e => setG({ ...g, q: e.target.value })} /></label>
              <fieldset className="space-y-2"><legend className="text-xs font-bold text-text-secondary">Параметрлер (бүтін сандар)</legend>
                {g.params.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input aria-label="Атауы" className={inp + ' !w-20 font-mono font-bold'} value={p.name} onChange={e => setP(i, { name: e.target.value.trim() })} />
                    <span className="text-sm text-text-secondary">бастап</span><input aria-label={`${p.name}: бастап`} type="number" className={inp + ' !w-24'} value={p.from} onChange={e => setP(i, { from: +e.target.value })} />
                    <span className="text-sm text-text-secondary">дейін</span><input aria-label={`${p.name}: дейін`} type="number" className={inp + ' !w-24'} value={p.to} onChange={e => setP(i, { to: +e.target.value })} />
                    <button type="button" aria-label={`${p.name} параметрін өшіру`} onClick={() => setG({ ...g, params: g.params.filter((_, j) => j !== i) })} className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-white"><Trash2 size={15} /></button>
                  </div>))}
                {g.params.length < 5 && <button type="button" onClick={() => setG({ ...g, params: [...g.params, { name: 'abcdefgh'.split('').find(c => !g.params.some(p => p.name === c)) || 'z', from: 1, to: 20 }] })} className="flex min-h-[36px] items-center gap-1 text-sm font-semibold text-violet-800"><Plus size={14} aria-hidden="true" />Параметр</button>}
              </fieldset>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className={lbl}>Дұрыс жауап формуласы<input className={inp + ' font-mono'} value={g.answer} onChange={e => setG({ ...g, answer: e.target.value })} /></label>
                <label className={lbl}>Шарт (міндетті емес)<input className={inp + ' font-mono'} value={g.when} onChange={e => setG({ ...g, when: e.target.value })} placeholder="b > a" /></label>
              </div>
              {task.kind === 'quiz' && (
                <div className="grid gap-2 sm:grid-cols-3">{[0, 1, 2].map(i => (
                  <label key={i} className={lbl}>{i + 1}-қате жауап<input className={inp + ' font-mono'} value={g.wrong[i] || ''} onChange={e => { const w = [...g.wrong]; w[i] = e.target.value; setG({ ...g, wrong: w }); }} /></label>))}</div>)}
              <p className="text-xs text-text-muted">Функциялар: {HELPERS.join(', ')}. Амалдар: + − * / % ( ).</p>
              <label className={lbl}>Неше нұсқа: {g.count}<input type="range" min={2} max={26} value={g.count} onChange={e => setG({ ...g, count: +e.target.value })} /></label>

              <div className="rounded-xl bg-white p-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-violet-800">Алдын ала көру · алғашқы 3</p>
                {preview.err ? <p role="alert" className="text-sm text-danger">{preview.err}</p> : (
                  <ol className="space-y-1 text-sm">{preview.vars.slice(0, 3).map((v, i) => (
                    <li key={i}><b>{String.fromCharCode(65 + i)}.</b> {v.q} <span className="font-semibold text-success">→ {task.kind === 'quiz' ? v.options[v.answer] : v.accept}</span>
                      {task.kind === 'quiz' && <span className="text-text-muted"> (қате: {v.options.filter((_, k) => k !== v.answer).join(', ')})</span>}</li>))}</ol>)}
                {preview.note && <p className="mt-1 text-sm text-warning">{preview.note}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={apply} disabled={!preview.vars.length} className="!bg-violet-600 !text-white hover:!bg-violet-700"><Wand2 size={16} aria-hidden="true" />{preview.vars.length} нұсқа жасау</Button>
                <Button variant="secondary" onClick={() => setSeed(x => x + 1)}><RefreshCw size={16} aria-hidden="true" />Басқа сандар</Button>
              </div>
            </div>))}

          {how === 'ai' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">ЖИ бірінші толтырылған нұсқаны үлгі етіп, қиындығы бірдей, бірақ мазмұны басқа сұрақтар жазады. Жаңа нұсқалар бар нұсқалардың соңына қосылады.</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className={lbl}>Неше нұсқа<select className={inp + ' !w-28'} value={n} onChange={e => setN(+e.target.value)}>{[3, 5, 10, 15, 20].map(x => <option key={x} value={x}>{x}</option>)}</select></label>
                <label className={lbl + ' min-w-0 flex-1'}>Қосымша тілек<input className={inp} value={extra} onChange={e => setExtra(e.target.value)} placeholder="Мысалы: сандар 100-ден аспасын" maxLength={300} /></label>
                <Button onClick={askAi} loading={busy} disabled={filled >= 26} className="!bg-violet-600 !text-white hover:!bg-violet-700"><Sparkles size={16} aria-hidden="true" />ЖИ-мен жасау</Button>
              </div>
            </div>)}
          {err && <p role="alert" className="rounded-lg bg-danger-soft p-2 text-sm text-danger">{err}</p>}
          {done && <p role="status" className="rounded-lg bg-success-soft p-2 text-sm text-success">{done}</p>}
        </div>)}
    </div>
  );
}
