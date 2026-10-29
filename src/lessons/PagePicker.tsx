import React, { useEffect, useRef, useState } from 'react';
import { MousePointerClick, Presentation, ScrollText } from 'lucide-react';
import { renderSlide } from '../components/Widgets';
import { Button, inputCls } from '../ui';
import { newPage, PAGE_TYPES, TEMPLATES, type PageType } from './pages';

const ICON: Record<PageType, React.ReactNode> = { slide: <Presentation size={22} />, scroll: <ScrollText size={22} />, interactive: <MousePointerClick size={22} />, presentation: <Presentation size={22} /> };
const SUB: Record<PageType, string> = { slide: '16:9 кадр. Презентацияға ыңғайлы.', scroll: 'Төмен сырғитын оқу беті. Мәтін, код және тапсырма бір ағынға біріктіріледі.', interactive: 'Сұрақ, жауап, таңдау және нәтиже жинауға арналған.', presentation: 'PPTX/PDF слайдының түпнұсқа көрінісін және тілдік қабатын сақтайды.' };

/** Full-screen «Бет жасау»: type on the left, template + live preview on the right. */
export function PagePicker({ onCancel, onCreate }: { onCancel: () => void; onCreate: (type: PageType, tpl: string, name: string) => void }) {
  const [type, setType] = useState<PageType>('slide'), [tpl, setTpl] = useState('title'), [name, setName] = useState('');
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.focus(); const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const pick = (t: PageType) => { setType(t); setTpl(TEMPLATES[t][0].id); };
  const cur = TEMPLATES[type].find(x => x.id === tpl)!, sample = newPage(type, tpl, name || cur.label);
  const sections = Array.isArray(sample.sections) ? sample.sections.length : 0;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pp-h" className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg text-text">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2">
        <h2 id="pp-h" ref={head} tabIndex={-1} className="text-xl font-bold outline-none">Жаңа оқу беті</h2>
        <div className="flex gap-2"><Button variant="ghost" onClick={onCancel}>Болдырмау</Button><Button onClick={() => onCreate(type, tpl, name)}>Бет жасау</Button></div>
      </header>
      <div className="grid flex-1 gap-0 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <section aria-label="Бет түрі" className="space-y-3 border-b border-border bg-surface p-4 lg:border-b-0 lg:border-r">
          <h3 className="text-2xl font-bold">Бет түрі</h3>
          <p className="text-sm text-text-secondary">Алдымен оқу материалының қалай көрсетілетінін таңдаңыз. Үлгіні кейін де ауыстыруға болады.</p>
          <div className="space-y-2">{PAGE_TYPES.map(p => (
            <button key={p.id} type="button" aria-pressed={type === p.id} onClick={() => pick(p.id)} className={`flex min-h-[72px] w-full items-center gap-3 rounded-xl border-2 p-3 text-left ${type === p.id ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface-2'}`}>
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">{ICON[p.id]}</span>
              <span><b className="block">{p.label}</b><span className="text-sm text-text-secondary">{SUB[p.id]}</span></span>
            </button>
          ))}</div>
        </section>
        <section aria-label="Үлгі" className="min-w-0 space-y-3 bg-surface-2 p-4">
          <div role="group" aria-label="Үлгілер" className="flex flex-wrap gap-2">{TEMPLATES[type].map(t => (
            <button key={t.id} type="button" aria-pressed={tpl === t.id} title={t.hint} onClick={() => setTpl(t.id)} className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${tpl === t.id ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface hover:bg-border'}`}>{t.label}</button>
          ))}</div>
          <p className="flex flex-wrap justify-between gap-2 text-sm text-text-secondary"><span>Үлгі: <b className="text-text">{cur.label}</b> — {cur.hint}</span>{sections > 0 && <span>Ұзындық: {sections} секция</span>}</p>
          <div data-theme="dark" role="img" aria-label={`«${cur.label}» үлгісінің алдын ала көрінісі`} className="max-h-[55vh] overflow-y-auto rounded-xl bg-slate-950 py-4 text-white shadow-lg">
            <div aria-hidden="true" className="pointer-events-none">{renderSlide(sample, { mode: 'preview' })}</div>
          </div>
          <label className="block text-sm font-semibold">Бет атауы<input className={`${inputCls} mt-1 font-normal`} value={name} onChange={e => setName(e.target.value)} placeholder={cur.label} /></label>
          <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={onCancel}>Болдырмау</Button><Button onClick={() => onCreate(type, tpl, name)}>Осы үлгіні қолдану</Button></div>
        </section>
      </div>
    </div>
  );
}
