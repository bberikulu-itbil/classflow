import React, { useEffect, useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, ChevronUp, Code2, Copy, Grid3x3, Image as ImageIcon, Magnet, Minus, Plus, Shapes, Table2, Trash2, Type, Undo2, Video, Sigma, MousePointerClick } from 'lucide-react';
import { Button, inputCls } from '../ui';
import { track, useWide } from '../board/Win';
import { uploadSlideImage } from './media';
import { BG, BlockView, CBlock, CanvasSlide, H, INK, LANGS, LAYOUTS, MIN, Stage, W, bgOf, blocksOf, box, clamp, fs, imgOk, ink, newId, norm, ratio, slim } from './canvas';

type Tab = 'design' | 'content' | 'action';
const KIND_LABEL: Record<string, string> = { text: 'Мәтін', code: 'Код', image: 'Сурет', shape: 'Фигура' };
const SOON = [['Видео', Video], ['Кесте', Table2], ['Формула', Sigma], ['Интерактив', MousePointerClick]] as const;
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
const HPOS = (k: number): Record<string, React.CSSProperties> => { const o = -k / 2, c = `calc(50% - ${k / 2}px)`; return { nw: { left: o, top: o, cursor: 'nwse-resize' }, n: { left: c, top: o, cursor: 'ns-resize' }, ne: { right: o, top: o, cursor: 'nesw-resize' }, e: { right: o, top: c, cursor: 'ew-resize' }, se: { right: o, bottom: o, cursor: 'nwse-resize' }, s: { left: c, bottom: o, cursor: 'ns-resize' }, sw: { left: o, bottom: o, cursor: 'nesw-resize' }, w: { left: o, top: c, cursor: 'ew-resize' } }; };
const side = 'space-y-2 rounded-xl border border-border bg-surface p-3';
const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const tb = 'flex h-9 w-9 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 items-center justify-center rounded-md hover:bg-surface-2 aria-pressed:bg-accent aria-pressed:text-on-accent disabled:opacity-40';

const label = (b: CBlock, i: number) => `${i + 1}. ${KIND_LABEL[b.kind]}${b.kind === 'text' && b.text ? ': ' + b.text.replace(/\s+/g, ' ').slice(0, 24) : b.kind === 'code' && b.code ? ': ' + b.code.replace(/\s+/g, ' ').slice(0, 20) : ''}`;

/** Full-screen editor of one «кенеп» page: palette, 16:9 stage, properties, layers and the page strip. */
export function CanvasEditor({ pages, cur, schoolId, onChange, onSelect, onClose }: {
  pages: any[]; cur: number; schoolId: string; onChange: (slide: any) => void; onSelect: (i: number) => void; onClose: (changed: boolean) => void;
}) {
  const slide = pages[cur], bg = bgOf(slide), blocks = blocksOf(slide);
  const [selId, setSel] = useState<string | null>(null), [tab, setTab] = useState<Tab>('design'), [editing, setEditing] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | 'fit'>('fit'), [avail, setAvail] = useState(800), [grid, setGrid] = useState(true), [snap, setSnap] = useState(true);
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [nHist, setNHist] = useState(0);
  const wide = useWide();
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
  const undo = () => { const p = hist.current.pop(); if (!p) return; lastKey.current = null; latest.current = p; cb.current(p); setNHist(hist.current.length); setSel(null); setEditing(null); setMsg('Соңғы әрекет қайтарылды.'); };
  const sn = (v: number) => (snap ? Math.round(v / 10) * 10 : Math.round(v));

  const add = (kind: CBlock['kind']) => {
    const base: Record<string, any> = {
      text: { x: 80, y: 200, w: 400, h: 80, text: 'Жаңа мәтін', size: 32 },
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
  const sw = (list: readonly (readonly [string, string])[], value: string | undefined, pick: (c: string) => void, what: string) => (
    <div role="group" aria-label={what} className="flex flex-wrap gap-2">{list.map(([c, n]) => (
      <button key={c} type="button" aria-label={`${what}: ${n}`} aria-pressed={value?.toLowerCase() === c.toLowerCase()} onClick={() => pick(c)} style={{ background: c }} className="h-9 w-9 rounded-full border-2 border-border-input aria-pressed:ring-4 aria-pressed:ring-accent" />
    ))}</div>
  );
  const numIn = (lab: string, v: number, set: (n: number) => void, lo = 0, hi = 960) => (
    <label className="block text-xs font-semibold text-text-secondary">{lab}<input type="number" min={lo} max={hi} className={inputCls + ' mt-1 !min-h-[40px] text-text'} value={Math.round(v)} onChange={e => set(num(e.target.value))} /></label>
  );

  const toolbarTop = sel && sel.kind === 'text' ? (sel.y > 70 ? { top: `calc(${(sel.y / H) * 100}% - 46px)` } : { top: `calc(${((sel.y + sel.h) / H) * 100}% + 8px)` }) : null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ce-h" className="fixed inset-0 z-50 flex flex-col bg-bg text-text">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Button variant="ghost" onClick={() => onClose(changed.current)}>← Конструкторға қайту</Button>
        <h2 id="ce-h" ref={head} tabIndex={-1} className="min-w-0 flex-1 truncate text-lg font-bold outline-none max-md:sr-only">Слайд редакторы <span className="font-normal text-text-secondary">· {cur + 1}-бет {slide.title ? '· ' + slide.title : ''}</span></h2>
        <Button variant="secondary" onClick={undo} disabled={!nHist}><Undo2 size={16} aria-hidden="true" />Болдырмау</Button>
        <div role="group" aria-label="Масштаб" className="flex items-center gap-1">
          <button type="button" aria-label="Кішірейту" className={tb} onClick={() => setZoom(Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}><Minus size={18} aria-hidden="true" /></button>
          <span aria-live="polite" className="min-w-[3.2rem] text-center text-sm font-semibold tabular-nums">{Math.round(z * 100)}%</span>
          <button type="button" aria-label="Үлкейту" className={tb} onClick={() => setZoom(Math.min(1.5, Math.round((z + 0.25) * 100) / 100))}><Plus size={18} aria-hidden="true" /></button>
          <Button variant="secondary" aria-pressed={zoom === 'fit'} onClick={() => setZoom('fit')}>Сыйғызу</Button>
        </div>
        <button type="button" aria-label="Тор" aria-pressed={grid} title="Тор" className={tb} onClick={() => setGrid(g => !g)}><Grid3x3 size={18} aria-hidden="true" /></button>
        <button type="button" aria-label="Торға тарту" aria-pressed={snap} title="Торға тарту" className={tb} onClick={() => setSnap(s => !s)}><Magnet size={18} aria-hidden="true" /></button>
      </header>

      <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[15rem_minmax(0,1fr)_20rem] lg:overflow-hidden">
        <aside aria-label="Элементтер" className="space-y-3 overflow-y-auto border-b border-border bg-surface p-3 lg:border-b-0 lg:border-r">
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
          <details open={wide || undefined} className="group space-y-2">
            <summary className="cursor-pointer text-sm font-bold uppercase tracking-wider text-text-secondary max-lg:min-h-[44px] max-lg:leading-[44px] lg:pointer-events-none lg:list-none">Жылдам үлгілер және қабаттар</summary>
          <section aria-label="Жылдам үлгілер" className="space-y-2">
            <div className="grid grid-cols-2 gap-2">{LAYOUTS.map(l => <button key={l.id} type="button" onClick={() => layout(l.id)} className="min-h-[44px] rounded-lg border border-border px-2 text-sm font-medium hover:border-accent hover:bg-accent-soft">{l.label}</button>)}</div>
          </section>
          <section aria-label="Қабаттар" className="mt-3 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Қабаттар</h3>
            {blocks.length === 0 ? <p className="text-sm text-text-secondary">Бет бос. Жоғарыдан элемент қосыңыз.</p> : (
              <ol className="max-h-56 space-y-1 overflow-y-auto">{[...blocks].reverse().map(b => (
                <li key={b.id}><button type="button" aria-pressed={b.id === selId} onClick={() => { setSel(b.id); setEditing(null); }} className={`min-h-[36px] w-full truncate rounded-lg px-2 text-left text-sm [@media(pointer:coarse)]:min-h-[44px] ${b.id === selId ? 'bg-accent-soft font-semibold text-on-accent-soft' : 'hover:bg-surface-2'}`}>{label(b, blocks.indexOf(b))}{b.hide ? ' · жасырын' : ''}</button></li>
              ))}</ol>
            )}
          </section>
          </details>
        </aside>

        <div ref={area} className="relative flex min-h-[18rem] overflow-auto bg-surface-2 p-6" onPointerDown={e => { if (e.target === e.currentTarget) { setSel(null); setEditing(null); } }}>
          <div className="relative m-auto shrink-0" style={{ width: W * z }} onPointerDown={e => { if (e.target === e.currentTarget) { setSel(null); setEditing(null); } }}>
            <Stage bg={bg} clip={false} className="shadow-lg">
              <div aria-hidden="true" onPointerDown={() => { setSel(null); setEditing(null); }} style={{ position: 'absolute', inset: 0, backgroundImage: grid ? 'radial-gradient(rgba(100,116,139,.55) 1px, transparent 1.5px)' : 'none', backgroundSize: `${20 / 9.6}cqw ${20 / 9.6}cqw` }} />
              {blocks.map((b, i) => {
                const on = b.id === selId;
                return (
                  <div key={b.id} role="group" tabIndex={0} aria-label={label(b, i)} onPointerDown={e => drag(e, b)} onKeyDown={e => keys(e, b)} onFocus={() => setSel(b.id)} onDoubleClick={() => b.kind === 'text' && setEditing(b.id)}
                    style={{ ...box(b), outline: on ? '2px solid var(--color-accent)' : '1px dashed rgba(100,116,139,.7)', cursor: editing === b.id ? 'text' : 'move', touchAction: 'none', zIndex: on ? 2 : 1 }}>
                    {editing === b.id && b.kind === 'text'
                      ? <textarea aria-label="Мәтінді өңдеу" autoFocus value={b.text} onChange={e => patch(b.id, { text: e.target.value }, 'type' + b.id)} onBlur={() => setEditing(null)} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); (e.target as HTMLElement).blur(); } }}
                          style={{ width: '100%', height: '100%', background: 'transparent', border: 0, outline: 0, resize: 'none', padding: 0, margin: 0, font: 'inherit', fontSize: fs(b.size), fontWeight: b.bold ? 800 : 500, textAlign: b.align, color: b.color || ink(bg), lineHeight: 1.25 }} />
                      : <BlockView b={b} bg={bg} R={t => t} />}
                    {b.kind === 'image' && !imgOk(b.src) && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1F2A30', fontSize: fs(22), background: 'rgba(255,255,255,.85)' }}>Сурет таңдалмаған</div>}
                    {b.hide && <span style={{ position: 'absolute', right: 0, top: 0, background: '#475569', color: '#fff', fontSize: fs(16), padding: '0 .6cqw' }}>жасырын</span>}
                    {on && editing !== b.id && HANDLES.map(h => <span key={h} aria-hidden="true" onPointerDown={e => resize(e, b, h)} style={{ position: 'absolute', width: hs, height: hs, background: 'var(--color-accent)', border: '2px solid #fff', borderRadius: 3, touchAction: 'none', ...HPOS(hs)[h] }} />)}
                  </div>
                );
              })}
            </Stage>
            {sel && sel.kind === 'text' && toolbarTop && (
              <div role="toolbar" aria-label="Мәтін құралдары" style={{ position: 'absolute', left: `${(sel.x / W) * 100}%`, zIndex: 5, ...toolbarTop }} className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-1 shadow-lg">
                <button type="button" aria-label="Қаріпті кішірейту" className={tb} onClick={() => patch(sel.id, { size: sel.size - 2 })}><Minus size={16} aria-hidden="true" /></button>
                <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">{sel.size}</span>
                <button type="button" aria-label="Қаріпті үлкейту" className={tb} onClick={() => patch(sel.id, { size: sel.size + 2 })}><Plus size={16} aria-hidden="true" /></button>
                <button type="button" aria-label="Қалың" aria-pressed={!!sel.bold} className={tb} onClick={() => patch(sel.id, { bold: !sel.bold })}><Bold size={16} aria-hidden="true" /></button>
                {([['left', 'Сол жаққа', AlignLeft], ['center', 'Ортаға', AlignCenter], ['right', 'Оң жаққа', AlignRight]] as const).map(([a, l, I]) => <button key={a} type="button" aria-label={l} aria-pressed={sel.align === a} className={tb} onClick={() => patch(sel.id, { align: a })}><I size={16} aria-hidden="true" /></button>)}
              </div>
            )}
          </div>
        </div>

        <aside aria-label="Қасиеттер" className="min-h-0 space-y-3 overflow-y-auto border-t border-border bg-surface p-3 lg:border-l lg:border-t-0">
          <div role="tablist" aria-label="Қасиеттер бөлімі" className="flex gap-1 border-b border-border">
            {([['design', 'Дизайн'], ['content', 'Мазмұн'], ['action', 'Әрекет']] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" id={'ce-t-' + k} aria-selected={tab === k} aria-controls="ce-panel" onClick={() => setTab(k)} className={`min-h-[44px] flex-1 border-b-4 font-semibold ${tab === k ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text'}`}>{l}</button>
            ))}
          </div>
          <div id="ce-panel" role="tabpanel" aria-labelledby={'ce-t-' + tab} className="space-y-3">
            {tab === 'design' && (!sel ? (
              <section className={side}><h3 className="font-bold">Слайд фоны</h3>{sw(BG, bg, c => commit({ ...latest.current, bg: c }), 'Фон')}<p className="text-sm text-text-secondary">Элементті таңдасаңыз, оның өлшемі мен түсі осы жерде шығады.</p></section>
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
              {(sel.kind === 'text' || sel.kind === 'code') && <section className={side}><h3 className="font-bold">Қаріп</h3>{numIn('Өлшемі', sel.size, n => patch(sel.id, { size: n }, 's' + sel.id), 8, 160)}</section>}
              {sel.kind === 'text' && <section className={side}><h3 className="font-bold">Мәтін түсі</h3>{sw(INK, sel.color || ink(bg), c => patch(sel.id, { color: c }), 'Мәтін түсі')}{ratio(sel.color || ink(bg), bg) < 4.5 && <p role="note" className="text-sm text-danger">Бұл түс осы фонда нашар көрінеді (контраст {ratio(sel.color || ink(bg), bg).toFixed(1)}:1, кемі 4.5:1 керек). Басқа түс таңда.</p>}</section>}
              {sel.kind === 'shape' && (
                <section className={side}><h3 className="font-bold">Фигура</h3>{sw(INK, sel.fill, c => patch(sel.id, { fill: c }), 'Толтыру')}
                  <label className="block text-xs font-semibold text-text-secondary">Пішіні<select className={inputCls + ' mt-1 text-text'} value={sel.shape} onChange={e => patch(sel.id, { shape: e.target.value as any })}><option value="rect">Төртбұрыш</option><option value="ellipse">Эллипс</option></select></label></section>
              )}
              <section className={side}>
                <h3 className="font-bold">Слайд реті</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" disabled={selIdx === blocks.length - 1} onClick={() => order(sel.id, 1)}><ChevronUp size={16} aria-hidden="true" />Алға шығару</Button>
                  <Button variant="secondary" disabled={selIdx === 0} onClick={() => order(sel.id, -1)}><ChevronDown size={16} aria-hidden="true" />Артқа жіберу</Button>
                  <Button variant="secondary" onClick={() => dup(sel)}><Copy size={16} aria-hidden="true" />Көшіру</Button>
                  <Button variant="danger" onClick={() => del(sel.id)}><Trash2 size={16} aria-hidden="true" />Өшіру</Button>
                </div>
              </section>
            </>))}
            {tab === 'content' && (!sel ? (
              <section className={side}><label className="block text-sm font-semibold">Бет атауы<input className={inputCls + ' mt-1'} value={slide.title || ''} onChange={e => commit({ ...latest.current, title: e.target.value }, 'title')} /></label><p className="text-sm text-text-secondary">Атау беттер тізімінде, мазмұнда және тақтада көрінеді.</p></section>
            ) : (
              <section className={side}>
                <h3 className="font-bold">{KIND_LABEL[sel.kind]} мазмұны</h3>
                {sel.kind === 'text' && <label className="block text-sm font-semibold">Мәтін<textarea rows={6} className={inputCls + ' mt-1 py-2'} value={sel.text} onChange={e => patch(sel.id, { text: e.target.value }, 'type' + sel.id)} /></label>}
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
                {sel.kind === 'shape' && <p className="text-sm text-text-secondary">Фигураның мәтіні жоқ: түсі мен пішіні «Дизайн» бөлімінде.</p>}
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
        </aside>
      </div>

      <nav aria-label="Беттер лентасы" className="flex gap-2 overflow-x-auto border-t border-border bg-surface px-3 py-2">
        {pages.map((p, i) => (
          <button key={i} type="button" aria-current={i === cur ? 'true' : undefined} aria-label={`${i + 1}-бет${p.title ? ': ' + p.title : ''}`} onClick={() => { if (i === cur) return; onSelect(i); if (p.type !== 'canvas') onClose(changed.current); }}
            className={`w-36 shrink-0 rounded-lg border-2 p-1 text-left ${i === cur ? 'border-accent' : 'border-border hover:border-text-muted'}`}>
            {p.type === 'canvas' ? <div className="pointer-events-none"><CanvasSlide s={{ ...p, title: '' }} R={t => t} /></div> : <div className="flex aspect-video items-center justify-center rounded bg-surface-2 px-1 text-center text-xs text-text-secondary">{p.title || p.prompt || 'Бет'}</div>}
            <span className="mt-1 block truncate text-xs font-semibold">{i + 1}. {p.title || p.prompt || 'Бет'}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
