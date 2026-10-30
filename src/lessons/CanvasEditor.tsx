import React, { useEffect, useRef, useState } from 'react';
import { BringToFront, Layers, LayoutTemplate, Palette, PanelRight, SendToBack, AlignCenter, AlignLeft, AlignRight, Bold, Code2, Copy, Grid3x3, Image as ImageIcon, Magnet, Minus, Plus, Shapes, Table2, Trash2, Type, Undo2, Video, Sigma, MousePointerClick } from 'lucide-react';
import { Button, LinkButton, inputCls } from '../ui';
import { renderSlide } from '../components/Widgets';
import { FieldRow } from './FieldRow';
import { fieldsOf } from './blocks';
import { pageOf, typeLabel } from './pages';
import { track, useWide } from '../board/Win';
import { uploadSlideImage } from './media';
import { BG, BlockView, canConvert, toCanvas, CBlock, CanvasSlide, H, INK, LANGS, LAYOUTS, MIN, Stage, W, bgOf, blocksOf, box, clamp, fs, imgOk, ink, newId, norm, ratio, slim } from './canvas';

type Tab = 'design' | 'content' | 'action';
type Rail = 'elements' | 'templates' | 'layers' | 'bg';
const RAIL = [['elements', 'Элементтер', Shapes], ['templates', 'Үлгілер', LayoutTemplate], ['layers', 'Қабаттар', Layers], ['bg', 'Фон', Palette]] as const;
const TEXT_LANGS = [['kk', 'Қазақша'], ['ru', 'Русский'], ['en', 'English']] as const;
const KIND_LABEL: Record<string, string> = { text: 'Мәтін', code: 'Код', image: 'Сурет', shape: 'Фигура' };
const SOON = [['Видео', Video], ['Кесте', Table2], ['Формула', Sigma], ['Интерактив', MousePointerClick]] as const;
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
const HPOS = (k: number): Record<string, React.CSSProperties> => { const o = -k / 2, c = `calc(50% - ${k / 2}px)`; return { nw: { left: o, top: o, cursor: 'nwse-resize' }, n: { left: c, top: o, cursor: 'ns-resize' }, ne: { right: o, top: o, cursor: 'nesw-resize' }, e: { right: o, top: c, cursor: 'ew-resize' }, se: { right: o, bottom: o, cursor: 'nwse-resize' }, s: { left: c, bottom: o, cursor: 'ns-resize' }, sw: { left: o, bottom: o, cursor: 'nesw-resize' }, w: { left: o, top: c, cursor: 'ew-resize' } }; };
const side = 'space-y-2 rounded-xl border border-border bg-surface p-3';
const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const tb = 'flex h-9 w-9 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 items-center justify-center rounded-md hover:bg-surface-2 aria-pressed:bg-accent aria-pressed:text-on-accent disabled:opacity-40';

const label = (b: CBlock, i: number) => `${i + 1}. ${KIND_LABEL[b.kind]}${b.kind === 'text' && b.text ? ': ' + b.text.replace(/\s+/g, ' ').slice(0, 24) : b.kind === 'code' && b.code ? ': ' + b.code.replace(/\s+/g, ' ').slice(0, 20) : ''}`;

/** Full-screen editor of one «кенеп» page: palette, 16:9 stage, properties, layers and the page strip. */
export function CanvasEditor({ pages, cur, schoolId, title, status, saved, previewHref, embedded = false, onTitle, onChange, onSelect, onAdd, onReorder, onSave, onClose }: {
  pages: any[]; cur: number; schoolId: string; title: string; status: string; saved: string; previewHref?: string;
  embedded?: boolean;
  onTitle: (t: string) => void; onChange: (slide: any) => void; onSelect: (i: number) => void; onAdd: () => void; onReorder: (from: number, to: number) => void; onSave: () => void; onClose: (changed: boolean) => void;
}) {
  const slide = pages[cur], bg = bgOf(slide), blocks = blocksOf(slide), isCv = slide.type === 'canvas';
  const [selId, setSel] = useState<string | null>(null), [tab, setTab] = useState<Tab>('design'), [editing, setEditing] = useState<string | null>(null), [canvasLang, setCanvasLang] = useState('kk');
  const [zoom, setZoom] = useState<number | 'fit'>('fit'), [avail, setAvail] = useState(800), [grid, setGrid] = useState(true), [snap, setSnap] = useState(true);
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [nHist, setNHist] = useState(0);
  const wide = useWide(), [rail, setRail] = useState<Rail | null>(wide ? 'elements' : null), [propsOpen, setPropsOpen] = useState(wide), [dragFrom, setDragFrom] = useState<number | null>(null), [dragOver, setDragOver] = useState<number | null>(null);
  const latest = useRef(slide), hist = useRef<any[]>([]), lastKey = useRef<string | null>(null), changed = useRef(false);
  const cb = useRef(onChange), area = useRef<HTMLDivElement>(null), head = useRef<HTMLHeadingElement>(null);
  latest.current = slide; cb.current = onChange;
  const sel = blocks.find(b => b.id === selId) || null, selIdx = sel ? blocks.indexOf(sel) : -1;
  const z = zoom === 'fit' ? clamp((avail - 48) / W, 0.3, 2) : zoom;
  const hs = coarse() ? 24 : 14, zr = useRef(z); zr.current = z;

  useEffect(() => { head.current?.focus(); }, []);
  useEffect(() => { setSel(null); setEditing(null); hist.current = []; lastKey.current = null; setNHist(0); }, [cur]);
  useEffect(() => {
    const el = area.current; if (!el) return;
    const f = () => setAvail(el.clientWidth);
    f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, []);

  /** key: edits with the same key (a drag, typing in one box) share one undo step. */
  const commit = (next: any, key?: string) => {
    if (!key || key !== lastKey.current) { hist.current.push(latest.current); if (hist.current.length > 60) hist.current.shift(); setNHist(hist.current.length); }
    lastKey.current = key || null; changed.current = true; latest.current = next; cb.current(next);
  };
  const setBlocks = (fn: (b: CBlock[]) => CBlock[], key?: string) => commit({ ...latest.current, blocks: fn(blocksOf(latest.current)).map(slim) }, key);
  const patch = (id: string, p: Partial<CBlock>, key?: string) => setBlocks(bs => bs.map(b => (b.id === id ? (norm({ ...b, ...p }) as CBlock) : b)), key);
  const textFor = (b: CBlock) => b.variants?.[canvasLang] ?? b.text ?? '';
  const patchText = (b: CBlock, value: string, key?: string) => patch(b.id, { text: canvasLang === 'kk' ? value : b.text, variants: { ...(b.variants || {}), [canvasLang]: value } }, key);
  const undo = () => { const p = hist.current.pop(); if (!p) return; lastKey.current = null; latest.current = p; cb.current(p); setNHist(hist.current.length); setSel(null); setEditing(null); setMsg('Соңғы әрекет қайтарылды.'); };
  const sn = (v: number) => (snap ? Math.round(v / 10) * 10 : Math.round(v));

  const add = (kind: CBlock['kind']) => {
    const base: Record<string, any> = {
      text: { x: 80, y: 200, w: 400, h: 80, text: 'Жаңа мәтін', variants: { kk: 'Жаңа мәтін' }, size: 32 },
      code: { x: 80, y: 180, w: 520, h: 200, code: '', lang: 'cpp', size: 22 },
      image: { x: 300, y: 110, w: 360, h: 320, src: '', alt: '' },
      shape: { x: 380, y: 170, w: 200, h: 200, shape: 'rect', fill: '#2F6F65' },
    };
    const b = norm({ id: newId(), kind, ...base[kind] })!;
    setBlocks(bs => [...bs, b]); setSel(b.id); setTab(kind === 'image' || kind === 'text' || kind === 'code' ? 'content' : 'design'); setMsg(`${KIND_LABEL[kind]} элементі қосылды.`);
  };
  const del = (id: string) => { setBlocks(bs => bs.filter(b => b.id !== id)); setSel(null); setEditing(null); setMsg('Элемент өшірілді.'); };
  const dup = (b: CBlock) => { const c = norm({ ...b, id: newId(), x: b.x + 20, y: b.y + 20 })!; setBlocks(bs => [...bs, c]); setSel(c.id); setMsg('Элемент көшірілді.'); };
  const order = (id: string, d: number) => setBlocks(bs => { const i = bs.findIndex(b => b.id === id), j = i + d; if (j < 0 || j >= bs.length) return bs; const n = [...bs]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const layout = (id: string) => {
    if (blocks.length && !confirm('Беттегі қазіргі элементтер жаңа үлгімен ауыстырылады. Жалғастырасың ба? («Болдырмау» арқылы қайтаруға болады)')) return;
    commit({ ...latest.current, blocks: LAYOUTS.find(l => l.id === id)!.make(latest.current.title || '').map(slim) }); setSel(null); setMsg('Үлгі қолданылды.');
  };

  const drag = (e: React.PointerEvent, b: CBlock) => {
    if (editing === b.id) return;
    (e.currentTarget as HTMLElement).focus(); setSel(b.id);
    const ox = e.clientX, oy = e.clientY, key = 'drag' + Date.now();
    track(e, (x, y) => patch(b.id, { x: clamp(sn(b.x + (x - ox) / zr.current), 0, W - b.w), y: clamp(sn(b.y + (y - oy) / zr.current), 0, H - b.h) }, key));
  };
  const resize = (e: React.PointerEvent, b: CBlock, h: string) => {
    e.stopPropagation(); setSel(b.id);
    const ox = e.clientX, oy = e.clientY, key = 'size' + Date.now();
    track(e, (x, y) => {
      const dx = (x - ox) / zr.current, dy = (y - oy) / zr.current;
      let x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
      if (h.includes('w')) x1 = clamp(sn(b.x + dx), 0, x2 - MIN);
      if (h.includes('e')) x2 = clamp(sn(b.x + b.w + dx), x1 + MIN, W);
      if (h.includes('n')) y1 = clamp(sn(b.y + dy), 0, y2 - MIN);
      if (h.includes('s')) y2 = clamp(sn(b.y + b.h + dy), y1 + MIN, H);
      patch(b.id, { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, key);
    });
  };
  const keys = (e: React.KeyboardEvent, b: CBlock) => {
    if (editing === b.id) return;
    const st = e.shiftKey ? 10 : 1, mv: Record<string, [number, number]> = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] };
    if (mv[e.key]) { e.preventDefault(); patch(b.id, { x: clamp(b.x + mv[e.key][0], 0, W - b.w), y: clamp(b.y + mv[e.key][1], 0, H - b.h) }, 'key' + b.id); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); del(b.id); }
    else if (e.key === 'Enter' && b.kind === 'text') { e.preventDefault(); setEditing(b.id); }
    else if (e.key === 'Escape') { e.stopPropagation(); setSel(null); }
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === 'Escape' && !(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) onClose(changed.current);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

  const upload = async (f: File | undefined) => {
    if (!f || !sel) return;
    setBusy(true); setMsg('');
    try { patch(sel.id, { src: await uploadSlideImage(f, schoolId), alt: sel.alt || f.name.replace(/\.\w+$/, '') }); setMsg('Сурет жүктелді.'); }
    catch (er: any) { setMsg(er?.message || 'Суретті жүктеу мүмкін болмады'); }
    setBusy(false);
  };
  const num = (v: string) => (v === '' ? 0 : +v);
  const sw = (list: readonly (readonly [string, string])[], value: string | undefined, pick: (c: string) => void, what: string, small = false) => (
    <div role="group" aria-label={what} className="flex flex-wrap gap-2">{list.map(([c, n]) => (
      <button key={c} type="button" aria-label={`${what}: ${n}`} aria-pressed={value?.toLowerCase() === c.toLowerCase()} onClick={() => pick(c)} style={{ background: c }} className={`${small ? 'h-7 w-7' : 'h-9 w-9'} rounded-full border-2 border-border-input aria-pressed:ring-2 aria-pressed:ring-accent aria-pressed:ring-offset-1 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11`} />
    ))}</div>
  );
  const numIn = (lab: string, v: number, set: (n: number) => void, lo = 0, hi = 960) => (
    <label className="block text-xs font-semibold text-text-secondary">{lab}<input type="number" min={lo} max={hi} className={inputCls + ' mt-1 !min-h-[40px] text-text'} value={Math.round(v)} onChange={e => set(num(e.target.value))} /></label>
  );

  const convert = () => {
    if (!confirm('Бет кенепке айналады: мәтін сақталады, ал орналасуы жаңа 16:9 макетке ауысады.' + (slide.ru ? ' Орысша аударма (ru) осы бетте өшеді.' : '') + ' «Болдырмау» арқылы қайтаруға болады. Жалғастырасың ба?')) return;
    commit(toCanvas(latest.current)); setMsg('Бет кенепке айналды.');
  };
  const ib = (lab: string, I: React.ElementType, fn: () => void, extra: { on?: boolean; off?: boolean } = {}) => <button type="button" aria-label={lab} title={lab} aria-pressed={extra.on} disabled={extra.off} className={tb} onClick={fn}><I size={16} aria-hidden="true" /></button>;
  const sep = <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />;
  const txt = sel && (sel.kind === 'text' || sel.kind === 'code');

  return (
    <div role={embedded ? 'region' : 'dialog'} aria-modal={embedded ? undefined : true} aria-labelledby="ce-h" className={embedded ? 'flex min-h-[48rem] flex-col overflow-hidden rounded-2xl border border-border bg-bg text-text shadow-card' : 'fixed inset-0 z-50 flex flex-col bg-bg text-text'}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Button variant="ghost" onClick={() => onClose(changed.current)}>{embedded ? '← Беттер тізіміне' : '← Дәрістерге'}</Button>
        <h2 id="ce-h" ref={head} tabIndex={-1} className="sr-only">Слайд редакторы · {cur + 1}-бет</h2>
        <input aria-label="Дәріс атауы" value={title} onChange={e => onTitle(e.target.value)} placeholder="Дәріс атауы" className="min-h-[44px] min-w-[8rem] flex-1 rounded-md border border-transparent bg-transparent px-2 text-lg font-bold text-text hover:border-border focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
        <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-on-accent-soft">{status}</span>
        <span role="status" aria-live="polite" className="text-sm text-text-secondary">{saved && `Сақталды · ${saved}`}</span>
        <Button variant="secondary" onClick={undo} disabled={!nHist}><Undo2 size={16} aria-hidden="true" />Болдырмау</Button>
        <button type="button" aria-label="Қасиеттер панелі" title="Қасиеттер панелі" aria-pressed={propsOpen} aria-controls="ce-props" className={tb + ' !h-11 !w-11'} onClick={() => setPropsOpen(o => !o)}><PanelRight size={18} aria-hidden="true" /></button>
        {previewHref && <LinkButton variant="ghost" href={previewHref} target="_blank" rel="noopener">Алдын ала қарау</LinkButton>}
        <Button onClick={onSave}>Сақтау</Button>
      </header>

      <div role="toolbar" aria-label="Элемент құралдары" className="flex min-h-[52px] flex-wrap items-center gap-1 border-b border-border bg-surface px-3 py-1">
        {!isCv ? (<>
          <span className="mr-2 rounded-md bg-accent-soft px-2 py-1 text-sm font-semibold text-on-accent-soft">{typeLabel(pageOf(slide).pageType)}</span>
          {canConvert(slide)
            ? <><Button variant="secondary" onClick={convert}><LayoutTemplate size={16} aria-hidden="true" />Кенепке айналдыру</Button><span className="text-sm text-text-secondary">Элементтерді еркін орналастыру үшін.</span></>
            : <span className="text-sm text-text-secondary">Бұл беттің түрі өз ойнатқышымен көрсетіледі, мазмұнын оң жақтан өңде.</span>}
        </>) : !sel ? <p className="text-sm text-text-secondary">Элементті таңдаңыз немесе сол жақтан қосыңыз. Мәтінді екі рет шертіп өңдейсіз.</p> : (<>
          <span className="mr-2 rounded-md bg-accent-soft px-2 py-1 text-sm font-semibold text-on-accent-soft">{KIND_LABEL[sel.kind]}</span>
          {txt && <>
            {ib('Қаріпті кішірейту', Minus, () => patch(sel.id, { size: sel.size - 2 }))}
            <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">{sel.size}</span>
            {ib('Қаріпті үлкейту', Plus, () => patch(sel.id, { size: sel.size + 2 }))}
          </>}
          {sel.kind === 'text' && <>
            {ib('Қалың', Bold, () => patch(sel.id, { bold: !sel.bold }), { on: !!sel.bold })}
            {([['left', 'Сол жаққа', AlignLeft], ['center', 'Ортаға', AlignCenter], ['right', 'Оң жаққа', AlignRight]] as const).map(([a, l, I]) => <React.Fragment key={a}>{ib(l, I, () => patch(sel.id, { align: a }), { on: sel.align === a })}</React.Fragment>)}
            {sep}{sw(INK, sel.color || ink(bg), c => patch(sel.id, { color: c }), 'Мәтін түсі', true)}
          </>}
          {sel.kind === 'shape' && sw(INK, sel.fill, c => patch(sel.id, { fill: c }), 'Толтыру', true)}
          {sep}
          {ib('Алға шығару', BringToFront, () => order(sel.id, 1), { off: selIdx === blocks.length - 1 })}
          {ib('Артқа жіберу', SendToBack, () => order(sel.id, -1), { off: selIdx === 0 })}
          {ib('Көшіру', Copy, () => dup(sel))}
          <button type="button" aria-label="Өшіру" title="Өшіру" className={tb + ' !text-danger'} onClick={() => del(sel.id)}><Trash2 size={16} aria-hidden="true" /></button>
        </>)}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {isCv && <nav aria-label="Құралдар" className="flex shrink-0 gap-1 border-b border-border bg-surface p-1 lg:w-[4.75rem] lg:flex-col lg:border-b-0 lg:border-r">
          {RAIL.map(([k, l, I]) => (
            <button key={k} type="button" aria-pressed={rail === k} aria-controls="ce-fly" onClick={() => setRail(r => (r === k ? null : k))} className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold leading-tight text-text-secondary hover:bg-surface-2 aria-pressed:bg-accent-soft aria-pressed:text-on-accent-soft lg:flex-none"><I size={20} aria-hidden="true" />{l}</button>
          ))}
        </nav>}
        {isCv && rail && (
          <aside id="ce-fly" aria-label={RAIL.find(r => r[0] === rail)![1]} className="max-h-44 shrink-0 space-y-3 overflow-y-auto border-b border-border bg-surface p-3 lg:max-h-none lg:w-64 lg:border-b-0 lg:border-r">
            {rail === 'elements' && (
              <section aria-label="Элемент қосу" className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Элементтер</h3>
                <div className="grid grid-cols-4 gap-2 lg:grid-cols-2">
                  {([['text', 'Мәтін', Type], ['image', 'Сурет', ImageIcon], ['code', 'Код', Code2], ['shape', 'Фигура', Shapes]] as const).map(([k, l, I]) => (
                    <button key={k} type="button" onClick={() => add(k)} className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-2 text-sm font-semibold hover:border-accent lg:min-h-[64px]"><I size={20} aria-hidden="true" />{l}</button>
                  ))}
                  {SOON.map(([l, I]) => (
                    <button key={l} type="button" disabled title="Жақында қосылады" aria-label={`${l} (жақында)`} className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-sm opacity-50 max-lg:hidden"><I size={20} aria-hidden="true" />{l}</button>
                  ))}
                </div>
              </section>
            )}
            {rail === 'templates' && (
              <section aria-label="Жылдам үлгілер" className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Жылдам үлгілер</h3>
                <div className="grid grid-cols-2 gap-2">{LAYOUTS.map(l => <button key={l.id} type="button" onClick={() => layout(l.id)} className="min-h-[44px] rounded-lg border border-border px-2 text-sm font-medium hover:border-accent hover:bg-accent-soft">{l.label}</button>)}</div>
              </section>
            )}
            {rail === 'layers' && (
              <section aria-label="Қабаттар" className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Қабаттар</h3>
                {blocks.length === 0 ? <p className="text-sm text-text-secondary">Бет бос. «Элементтер» бөлімінен қосыңыз.</p> : (
                  <ol className="space-y-1">{[...blocks].reverse().map(b => (
                    <li key={b.id}><button type="button" aria-pressed={b.id === selId} onClick={() => { setSel(b.id); setEditing(null); }} className={`min-h-[36px] w-full truncate rounded-lg px-2 text-left text-sm [@media(pointer:coarse)]:min-h-[44px] ${b.id === selId ? 'bg-accent-soft font-semibold text-on-accent-soft' : 'hover:bg-surface-2'}`}>{label(b, blocks.indexOf(b))}{b.hide ? ' · жасырын' : ''}</button></li>
                  ))}</ol>
                )}
              </section>
            )}
            {rail === 'bg' && (
              <section aria-label="Слайд фоны" className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Слайд фоны</h3>
                {sw(BG, bg, c => commit({ ...latest.current, bg: c }), 'Фон')}
                <p className="text-sm text-text-secondary">Мәтін түсі фонға қарай өзі таңдалады.</p>
              </section>
            )}
          </aside>
        )}

        <div ref={area} className="relative flex min-h-[18rem] min-w-0 flex-1 overflow-auto bg-surface-2 p-6" onPointerDown={e => { if (e.target === e.currentTarget) { setSel(null); setEditing(null); } }}>
          {!isCv ? <div className="m-auto w-full max-w-4xl"><div data-theme="dark" role="region" aria-label="Беттің көрінісі" className="overflow-x-auto rounded-xl bg-slate-950 py-4 text-white">{renderSlide(slide, { mode: 'preview' })}</div></div> : <div className="relative m-auto shrink-0" style={{ width: W * z }} onPointerDown={e => { if (e.target === e.currentTarget) { setSel(null); setEditing(null); } }}>
            <Stage bg={bg} clip={false} className="shadow-lg">
              <div aria-hidden="true" onPointerDown={() => { setSel(null); setEditing(null); }} style={{ position: 'absolute', inset: 0, backgroundImage: grid ? 'radial-gradient(rgba(100,116,139,.55) 1px, transparent 1.5px)' : 'none', backgroundSize: `${20 / 9.6}cqw ${20 / 9.6}cqw` }} />
              {blocks.map((b, i) => {
                const on = b.id === selId;
                return (
                  <div key={b.id} role="group" tabIndex={0} aria-label={label(b, i)} onPointerDown={e => drag(e, b)} onKeyDown={e => keys(e, b)} onFocus={() => setSel(b.id)} onDoubleClick={() => b.kind === 'text' && setEditing(b.id)}
                    style={{ ...box(b), outline: on ? '2px solid var(--color-accent)' : '1px dashed rgba(100,116,139,.7)', cursor: editing === b.id ? 'text' : 'move', touchAction: 'none', zIndex: on ? 2 : 1 }}>
                    {editing === b.id && b.kind === 'text'
                      ? <textarea aria-label={`${TEXT_LANGS.find(([code]) => code === canvasLang)?.[1] || canvasLang} мәтінін өңдеу`} autoFocus value={textFor(b)} onChange={e => patchText(b, e.target.value, 'type' + b.id)} onBlur={() => setEditing(null)} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); (e.target as HTMLElement).blur(); } }}
                          style={{ width: '100%', height: '100%', background: 'transparent', border: 0, outline: 0, resize: 'none', padding: 0, margin: 0, font: 'inherit', fontSize: fs(b.size), fontWeight: b.bold ? 800 : 500, textAlign: b.align, color: b.color || ink(bg), lineHeight: 1.25 }} />
                      : <BlockView b={b.kind === 'text' ? { ...b, text: textFor(b) } : b} bg={bg} R={t => t} />}
                    {b.kind === 'image' && !imgOk(b.src) && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1F2A30', fontSize: fs(22), background: 'rgba(255,255,255,.85)' }}>Сурет таңдалмаған</div>}
                    {b.hide && <span style={{ position: 'absolute', right: 0, top: 0, background: '#475569', color: '#fff', fontSize: fs(16), padding: '0 .6cqw' }}>жасырын</span>}
                    {on && editing !== b.id && HANDLES.map(h => <span key={h} aria-hidden="true" onPointerDown={e => resize(e, b, h)} style={{ position: 'absolute', width: hs, height: hs, background: 'var(--color-accent)', border: '2px solid #fff', borderRadius: 3, touchAction: 'none', ...HPOS(hs)[h] }} />)}
                  </div>
                );
              })}
            </Stage>
          </div>}
        </div>

        {(propsOpen || !isCv) && (
        <aside id="ce-props" aria-label="Қасиеттер" className="min-h-0 shrink-0 space-y-3 overflow-y-auto border-t border-border bg-surface p-3 lg:w-80 lg:border-l lg:border-t-0">
          {isCv ? (<>
          <div role="tablist" aria-label="Қасиеттер бөлімі" className="flex gap-1 border-b border-border">
            {([['design', 'Дизайн'], ['content', 'Мазмұн'], ['action', 'Әрекет']] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" id={'ce-t-' + k} aria-selected={tab === k} aria-controls="ce-panel" onClick={() => setTab(k)} className={`min-h-[44px] flex-1 border-b-4 font-semibold ${tab === k ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text'}`}>{l}</button>
            ))}
          </div>
          <div id="ce-panel" role="tabpanel" aria-labelledby={'ce-t-' + tab} className="space-y-3">
            {tab === 'design' && (!sel ? (
              <section className={side}><h3 className="font-bold">Дизайн</h3><p className="text-sm text-text-secondary">Элементті таңдасаңыз, оның орны мен өлшемі осы жерде шығады. Түсі мен реті — жоғарғы құралдар жолағында, слайд фоны — сол жақтағы «Фон» бөлімінде.</p></section>
            ) : (<>
              <section className={side}>
                <h3 className="font-bold">{KIND_LABEL[sel.kind]} · орны мен өлшемі</h3>
                <div className="grid grid-cols-2 gap-2">
                  {numIn('X', sel.x, n => patch(sel.id, { x: clamp(n, 0, W - sel.w) }, 'x' + sel.id))}
                  {numIn('Y', sel.y, n => patch(sel.id, { y: clamp(n, 0, H - sel.h) }, 'y' + sel.id))}
                  {numIn('Ені', sel.w, n => patch(sel.id, { w: clamp(n, MIN, W - sel.x) }, 'w' + sel.id), MIN)}
                  {numIn('Биіктігі', sel.h, n => patch(sel.id, { h: clamp(n, MIN, H - sel.y) }, 'h' + sel.id), MIN)}
                </div>
              </section>
              {txt && <section className={side}><h3 className="font-bold">Қаріп</h3>{numIn('Өлшемі', sel.size, n => patch(sel.id, { size: n }, 's' + sel.id), 8, 160)}
                {sel.kind === 'text' && ratio(sel.color || ink(bg), bg) < 4.5 && <p role="note" className="text-sm text-danger">Бұл түс осы фонда нашар көрінеді (контраст {ratio(sel.color || ink(bg), bg).toFixed(1)}:1, кемі 4.5:1 керек). Басқа түс таңда.</p>}</section>}
              {sel.kind === 'shape' && (
                <section className={side}><h3 className="font-bold">Фигура</h3>
                  <label className="block text-xs font-semibold text-text-secondary">Пішіні<select className={inputCls + ' mt-1 text-text'} value={sel.shape} onChange={e => patch(sel.id, { shape: e.target.value as any })}><option value="rect">Төртбұрыш</option><option value="ellipse">Эллипс</option></select></label></section>
              )}
            </>))}
            {tab === 'content' && (!sel ? (
              <section className={side}><label className="block text-sm font-semibold">Бет атауы<input className={inputCls + ' mt-1'} value={slide.title || ''} onChange={e => commit({ ...latest.current, title: e.target.value }, 'title')} /></label><p className="text-sm text-text-secondary">Атау беттер тізімінде, мазмұнда және тақтада көрінеді.</p></section>
            ) : (
              <section className={side}>
                <h3 className="font-bold">{KIND_LABEL[sel.kind]} мазмұны</h3>
                {sel.kind === 'text' && <>
                  <div role="tablist" aria-label="Мәтін тілі" className="flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1">
                    {TEXT_LANGS.map(([code, name]) => <button key={code} type="button" role="tab" aria-selected={canvasLang === code} onClick={() => setCanvasLang(code)} className={`min-h-[36px] flex-1 rounded-md px-2 text-xs font-semibold ${canvasLang === code ? 'bg-surface text-accent shadow-sm' : 'text-text-secondary hover:text-text'}`}>{name}</button>)}
                  </div>
                  <label className="block text-sm font-semibold">{TEXT_LANGS.find(([code]) => code === canvasLang)?.[1] || canvasLang} мәтіні<textarea rows={6} className={inputCls + ' mt-1 py-2'} value={textFor(sel)} onChange={e => patchText(sel, e.target.value, 'type' + sel.id)} /></label>
                  <p className="text-xs text-text-secondary">Әр тіл бөлек сақталады. Толтырылмаған тіл нұсқасы қазақша негізгі мәтінге ауысады.</p>
                </>}
                {sel.kind === 'text' && <p className="text-xs text-text-secondary">||жасырын|| — осылай жазылған бөлік «Алға» басқанша нүктелер болып тұрады.</p>}
                {sel.kind === 'code' && (<>
                  <label className="block text-sm font-semibold">Код<textarea rows={8} spellCheck={false} className={inputCls + ' mt-1 py-2 font-mono text-sm'} value={sel.code} onChange={e => patch(sel.id, { code: e.target.value }, 'type' + sel.id)} /></label>
                  <label className="block text-sm font-semibold">Тіл<select className={inputCls + ' mt-1'} value={sel.lang} onChange={e => patch(sel.id, { lang: e.target.value })}>{LANGS.map(l => <option key={l}>{l}</option>)}</select></label>
                </>)}
                {sel.kind === 'image' && (<>
                  <label className="block text-sm font-semibold">Сурет файлы<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} className="mt-1 block w-full text-sm" /></label>
                  <label className="block text-sm font-semibold">немесе сілтеме (https://…)<input className={inputCls + ' mt-1'} value={sel.src} onChange={e => patch(sel.id, { src: e.target.value }, 'src' + sel.id)} /></label>
                  {sel.src && !imgOk(sel.src) && <p role="alert" className="text-sm text-danger">Сілтеме https:// деп басталуы керек.</p>}
                  <label className="block text-sm font-semibold">Сурет сипаттамасы (көзі көрмейтіндерге)<input className={inputCls + ' mt-1'} value={sel.alt} onChange={e => patch(sel.id, { alt: e.target.value }, 'alt' + sel.id)} /></label>
                </>)}
                {sel.kind === 'shape' && <p className="text-sm text-text-secondary">Фигураның мәтіні жоқ: түсі мен пішіні жоғарғы құралдар жолағында.</p>}
              </section>
            ))}
            {tab === 'action' && (!sel ? (
              <section className={side}><h3 className="font-bold">Әрекет</h3><p className="text-sm text-text-secondary">Элементті таңдап, оның сабақта қалай көрінетінін белгілеңіз.</p></section>
            ) : (
              <section className={side}>
                <h3 className="font-bold">Сабақта көрсету</h3>
                <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={!!sel.hide} onChange={e => patch(sel.id, { hide: e.target.checked })} />Жасырын: «Алға» басқанда ғана ашылады</label>
                <p className="text-xs text-text-secondary">Тапсырма жауабын немесе қорытындыны оқушыларға кейін көрсету үшін.</p>
              </section>
            ))}
            <p role="status" className="min-h-[1.25rem] text-sm text-text-secondary">{msg}</p>
          </div>
          </>) : (
            <section aria-label="Бет мазмұны" className="space-y-2">
              <h3 className="font-bold">Бет мазмұны · {typeLabel(pageOf(slide).pageType)}</h3>
              {fieldsOf(slide).map(f => <FieldRow key={cur + f.id} uid={'ce' + cur} f={f} options={slide.options || []} onChange={v => commit(f.set(v), 'f' + cur + f.id)} />)}
              {slide.type === 'solution' && <p className="text-xs text-text-secondary">Бөлімдерді қосу, жылжыту және өшіру — конструкторда.</p>}
              <p role="status" className="min-h-[1.25rem] text-sm text-text-secondary">{msg}</p>
            </section>
          )}
        </aside>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-3 py-1">
        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm text-text-secondary tabular-nums">{cur + 1} / {pages.length} бет</span>
          {isCv && <button type="button" aria-label="Тор" aria-pressed={grid} title="Тор" className={tb} onClick={() => setGrid(g => !g)}><Grid3x3 size={18} aria-hidden="true" /></button>}
          {isCv && <button type="button" aria-label="Торға тарту" aria-pressed={snap} title="Торға тарту" className={tb} onClick={() => setSnap(s => !s)}><Magnet size={18} aria-hidden="true" /></button>}
        </div>
        {isCv && <div role="group" aria-label="Масштаб" className="flex items-center gap-1">
          <button type="button" aria-label="Кішірейту" className={tb} onClick={() => setZoom(Math.max(0.3, Math.round((z - 0.1) * 100) / 100))}><Minus size={18} aria-hidden="true" /></button>
          <input type="range" aria-label="Масштаб деңгейі" min={30} max={150} step={5} value={Math.round(z * 100)} onChange={e => setZoom(+e.target.value / 100)} className="w-28 accent-[var(--color-accent)] sm:w-40" />
          <button type="button" aria-label="Үлкейту" className={tb} onClick={() => setZoom(Math.min(1.5, Math.round((z + 0.1) * 100) / 100))}><Plus size={18} aria-hidden="true" /></button>
          <span aria-live="polite" className="min-w-[3.2rem] text-center text-sm font-semibold tabular-nums">{Math.round(z * 100)}%</span>
          <Button variant="secondary" aria-pressed={zoom === 'fit'} onClick={() => setZoom('fit')}>Сыйғызу</Button>
        </div>}
      </div>

      <nav aria-label="Беттер лентасы" className="flex gap-2 overflow-x-auto border-t border-border bg-surface px-3 py-2">
        {pages.map((p, i) => (
          <button key={i} type="button" draggable aria-current={i === cur ? 'true' : undefined} aria-label={`${i + 1}-бет${p.title ? ': ' + p.title : ''}`}
            onDragStart={e => { setDragFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }} onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
            onDragOver={e => { if (dragFrom !== null) { e.preventDefault(); setDragOver(i); } }} onDrop={e => { e.preventDefault(); if (dragFrom !== null) { onReorder(dragFrom, i); } setDragFrom(null); setDragOver(null); }}
            onClick={() => { if (i !== cur) onSelect(i); }}
            className={`w-36 shrink-0 rounded-lg border-2 p-1 text-left ${dragOver === i && dragFrom !== null && dragFrom !== i ? 'border-dashed border-accent' : i === cur ? 'border-accent' : 'border-border hover:border-text-muted'} ${dragFrom === i ? 'opacity-50' : ''}`}>
            {p.type === 'canvas' ? <div className="pointer-events-none"><CanvasSlide s={{ ...p, title: '' }} R={t => t} lang={canvasLang} /></div> : <div className="flex aspect-video items-center justify-center rounded bg-surface-2 px-1 text-center text-xs text-text-secondary">{p.title || p.prompt || 'Бет'}</div>}
            <span className="mt-1 block truncate text-xs font-semibold">{i + 1}. {p.title || p.prompt || 'Бет'}</span>
          </button>
        ))}
        <button type="button" onClick={onAdd} className="flex w-36 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-accent text-sm font-semibold text-accent hover:bg-accent-soft"><Plus size={20} aria-hidden="true" />Бет қосу</button>
      </nav>
    </div>
  );
}
