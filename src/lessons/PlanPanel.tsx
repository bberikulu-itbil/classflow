import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button, Field, inputCls } from '../ui';
import { STAGES, TEMPLATE_45, durationMin, totalMin, type PlanStage } from './stages';

export interface PlanData { subject: string; grade: string; duration: string; summary: string; objectives: string; prior: string; env: string; source: string; stages: PlanStage[] }

/** The «Сабақ жоспары» panel of the canvas editor: lesson card (class, aim, what students know, tools, source) and the timed stages. */
export function PlanPanel({ plan, pages, onChange, onDropStage, onClose }: {
  plan: PlanData; pages: any[]; onChange: (patch: Partial<PlanData>) => void; onDropStage: (i: number) => void; onClose: () => void;
}) {
  const st = plan.stages, total = totalMin(st), goal = durationMin(plan.duration), okTime = total === goal;
  const setStage = (i: number, p: Partial<PlanStage>) => onChange({ stages: st.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const area = (label: string, v: string, set: (s: string) => void, ph: string) => <Field label={label}>{id => <textarea id={id} className={inputCls + ' min-h-[80px] py-2'} value={v} onChange={e => set(e.target.value)} placeholder={ph} />}</Field>;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="plan-h" className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-border bg-surface p-5 text-text shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div><h2 id="plan-h" className="text-lg font-bold">Сабақ жоспары</h2><p className="mt-1 text-sm text-text-secondary">Сынып, мақсат, бастапқы білім және кезеңдер. Әр бетті «Кезең» тізімі арқылы кезеңге байлайсыз.</p></div>
          <button type="button" aria-label="Жабу" className="rounded-md p-2 hover:bg-surface-2" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Пән">{id => <input id={id} className={inputCls} value={plan.subject} onChange={e => onChange({ subject: e.target.value })} />}</Field>
          <Field label="Сынып">{id => <select id={id} className={inputCls} value={plan.grade} onChange={e => onChange({ grade: e.target.value })}>{['7', '8', '9'].map(g => <option key={g} value={g}>{g}-сынып</option>)}</select>}</Field>
          <Field label="Ұзақтығы">{id => <select id={id} className={inputCls} value={plan.duration} onChange={e => onChange({ duration: e.target.value })}>{['45 минут', '90 минут', '120 минут'].map(d => <option key={d}>{d}</option>)}</select>}</Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {area('Қысқаша сипаттама', plan.summary, v => onChange({ summary: v }), 'Сабақ соңында оқушы нені меңгереді?')}
          {area('Оқу мақсаттары', plan.objectives, v => onChange({ objectives: v }), 'Әр мақсатты жаңа жолдан жазыңыз')}
          {area('Бастапқы білім', plan.prior, v => onChange({ prior: v }), 'Оқушылар алдыңғы сабақта нені үйренді?')}
          {area('Жұмыс ортасы', plan.env, v => onChange({ env: v }), 'Бағдарлама, құрылғы саны, интернет')}
        </div>
        {area('Дереккөз', plan.source, v => onChange({ source: v }), 'Оқулық, бөлім, бет нөмірі')}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Кезеңдер</h3>
            <div className="flex flex-wrap gap-2">
              {st.length === 0 && <Button variant="secondary" onClick={() => onChange({ stages: TEMPLATE_45, duration: '45 минут' })}>45 минуттық үлгі</Button>}
              <Button variant="secondary" onClick={() => onChange({ stages: [...st, { k: 'explain', min: 5, do: '' }] })}><Plus size={16} aria-hidden="true" />Кезең қосу</Button>
            </div>
          </div>
          {st.map((x, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent-soft text-sm font-bold text-accent">{i + 1}</span>
              <select aria-label={`Кезең ${i + 1}: түрі`} className={inputCls + ' !w-auto min-w-[9rem]'} value={x.k} onChange={e => setStage(i, { k: e.target.value })}>{STAGES.map(s => <option key={s.k} value={s.k}>{s.kk}</option>)}</select>
              <input type="number" min={0} max={180} aria-label={`Кезең ${i + 1}: минут`} className={inputCls + ' !w-20'} value={x.min} onChange={e => setStage(i, { min: +e.target.value })} /><span className="text-sm text-text-secondary">мин</span>
              <input aria-label={`Кезең ${i + 1}: оқушы әрекеті`} className={inputCls + ' min-w-[12rem] flex-1'} value={x.do} onChange={e => setStage(i, { do: e.target.value })} placeholder="Оқушы не істейді?" />
              <span className="text-xs text-text-secondary">{pages.filter(p => p.stage === x.k).length} бет</span>
              <button type="button" className="rounded-md p-2 text-danger hover:bg-danger-soft" onClick={() => onDropStage(i)} aria-label={`Кезең ${i + 1}: өшіру`}><Trash2 size={16} aria-hidden="true" /></button>
            </div>
          ))}
          {st.length > 0 && <p role="status" className={`text-sm font-semibold ${okTime ? 'text-success' : 'text-danger'}`}>Барлығы: {total} / {goal} мин{okTime ? ' ✓' : ' — уақыт сабақ ұзақтығына сәйкес емес'}</p>}
        </div>
        <div className="flex justify-end"><Button onClick={onClose}>Дайын</Button></div>
      </div>
    </div>
  );
}
