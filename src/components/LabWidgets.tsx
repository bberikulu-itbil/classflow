// Interactive pieces for the 10th-grade "Data representation" chapter, shown under a slide that carries `widget`:
//   { kind: 'base', mode: 'convert' | 'arith', ... }  number systems: conversion with its steps, column addition / subtraction
//   { kind: 'circuit', circuit | pick }               logic gates and circuits: switch the inputs, the wires light up, the truth table follows
//   { kind: 'code', mode: 'int' | 'text' }            how numbers (8 bits, two's complement) and characters (ASCII / Unicode / UTF-8) are stored
// Everything is computed in the browser; nothing is sent. Texts are in kk / ru / en.
import { useMemo, useState } from 'react';
import { pick, type Lang } from '../lessons/lang';

const DIG = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n: number) => String(n).split('').map(d => SUB[+d]).join('');
const sup = (n: number) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');
const okIn = (t: string, b: number) => t !== '' && [...t.toUpperCase()].every(c => DIG.slice(0, b).includes(c));
const BTN = 'min-h-[40px] rounded-xl px-3 text-sm font-semibold cursor-pointer transition';
const box = 'rounded-2xl border border-slate-600 bg-slate-900/70 p-4';
const inp = 'h-11 rounded-xl border border-slate-500 bg-slate-950 px-3 font-mono text-lg text-slate-100';

export function LabWidget({ w, lang = 'kk', big = false }: { w: any; lang?: Lang; big?: boolean }) {
  if (!w) return null;
  const inner = w.kind === 'base' ? (w.mode === 'arith' ? <BaseArith w={w} lang={lang} /> : <BaseConvert w={w} lang={lang} />)
    : w.kind === 'circuit' ? <Circuit w={w} lang={lang} /> : w.kind === 'adder' ? <Adder w={w} lang={lang} /> : w.kind === 'code' ? (w.mode === 'text' ? <TextCode w={w} lang={lang} /> : <IntCode w={w} lang={lang} />) : null;
  return <div data-testid={`widget-${w.kind}`} className={`mx-auto w-full max-w-5xl px-4 pb-4 text-slate-100 ${big ? 'text-lg' : ''}`}>{inner}</div>;
}

/* ───────────── number systems: conversion ───────────── */
function BaseConvert({ w, lang }: { w: any; lang: Lang }) {
  const [txt, setTxt] = useState(String(w.value ?? '199'));
  const [from, setFrom] = useState<number>(w.from || 10);
  const [to, setTo] = useState<number>(w.to || 2);
  const [shown, setShown] = useState(99);
  const n = okIn(txt, from) ? parseInt(txt, from) : null;
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const bases = [2, 8, 10, 16];
  const steps = useMemo(() => { // repeated division: [dividend, quotient, remainder]
    const out: [number, number, number][] = []; let q = n ?? 0;
    if (n === null) return out; if (q === 0) return [[0, 0, 0]];
    while (q > 0) { out.push([q, Math.floor(q / to), q % to]); q = Math.floor(q / to); }
    return out;
  }, [n, to]);
  const groups = (from === 2 && (to === 8 || to === 16)) || (to === 2 && (from === 8 || from === 16));
  const k = (from === 2 ? to : from) === 8 ? 3 : 4;
  const bin = n === null ? '' : n.toString(2);
  const padded = bin.padStart(Math.ceil(bin.length / k) * k, '0');
  const set = (v: string) => { setTxt(v.toUpperCase().replace(/[^0-9A-Z]/g, '')); setShown(1); };

  return (
    <div className="space-y-3">
      <div className={`${box} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col text-xs text-slate-400">{t('Сан', 'Число', 'Number')}
          <input aria-label={t('Сан', 'Число', 'Number')} value={txt} onChange={e => set(e.target.value)} className={`${inp} w-44 ${n === null ? 'border-red-500' : ''}`} /></label>
        <label className="flex flex-col text-xs text-slate-400">{t('Қай жүйеден', 'Из системы', 'From base')}
          <select aria-label={t('Қай жүйеден', 'Из системы', 'From base')} value={from} onChange={e => { setFrom(+e.target.value); setShown(1); }} className={inp}>{bases.map(b => <option key={b} value={b}>{b}</option>)}</select></label>
        <span className="pb-2 text-2xl text-slate-400">→</span>
        <label className="flex flex-col text-xs text-slate-400">{t('Қай жүйеге', 'В систему', 'To base')}
          <select aria-label={t('Қай жүйеге', 'В систему', 'To base')} value={to} onChange={e => { setTo(+e.target.value); setShown(1); }} className={inp}>{bases.map(b => <option key={b} value={b}>{b}</option>)}</select></label>
        {n === null && <p role="alert" className="pb-2 text-sm text-red-400">{t(`${from}-жүйеде мұндай цифр жоқ`, `В системе ${from} нет такой цифры`, `Not a base-${from} number`)}</p>}
      </div>

      {n !== null && <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {bases.map(b => <div key={b} className={`rounded-xl border p-3 ${b === to ? 'border-amber-400 bg-amber-400/10' : b === from ? 'border-sky-400 bg-sky-400/10' : 'border-slate-700 bg-slate-900/60'}`}>
            <div className="text-xs text-slate-400">{b === 2 ? 'BIN' : b === 8 ? 'OCT' : b === 10 ? 'DEC' : 'HEX'} · {b}</div>
            <div className="break-all font-mono text-xl font-bold">{n.toString(b).toUpperCase()}<span className="text-sm text-slate-400">{sub(b)}</span></div></div>)}
        </div>

        {from !== 10 && !groups && (
          <div className={box}>
            <p className="mb-2 font-semibold text-sky-300">{t('Ондыққа: әр цифрды орнының салмағына көбейтіп қосамыз', 'В десятичную: каждую цифру умножаем на вес разряда и складываем', 'To decimal: multiply each digit by its place value and add')}</p>
            <div className="flex flex-wrap gap-1.5">
              {[...txt].map((d, i) => { const p = txt.length - 1 - i, v = parseInt(d, from) * from ** p; return (
                <div key={i} className="min-w-[3.5rem] rounded-lg border border-slate-600 bg-slate-950 p-2 text-center">
                  <div className="font-mono text-2xl font-black text-sky-300">{d}</div>
                  <div className="text-xs text-slate-400">{from}{sup(p)} = {from ** p}</div>
                  <div className={`font-mono text-sm ${v ? 'text-amber-300' : 'text-slate-500'}`}>{v}</div>
                </div>
              ); })}
            </div>
            <p className="mt-2 font-mono text-sm text-slate-300">{[...txt].map((d, i) => parseInt(d, from) * from ** (txt.length - 1 - i)).filter(Boolean).join(' + ') || '0'} = <b className="text-amber-300">{n}</b></p>
          </div>
        )}

        {groups && (
          <div className={box}>
            <p className="mb-2 font-semibold text-sky-300">{t(`Жылдам жол: екілік санды оңнан ${k} биттен топтаймыз (${k} бит = 1 цифр)`, `Быстрый путь: делим двоичное число справа на группы по ${k} (${k} бита = 1 цифра)`, `Shortcut: group the bits by ${k} from the right (${k} bits = 1 digit)`)}</p>
            <div className="flex flex-wrap gap-2">
              {padded.match(new RegExp(`.{${k}}`, 'g'))!.map((g, i) => <div key={i} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-center">
                <div className="font-mono text-xl tracking-widest text-sky-300">{g}</div><div className="font-mono text-2xl font-black text-amber-300">{parseInt(g, 2).toString(16).toUpperCase()}</div></div>)}
            </div>
          </div>
        )}

        {to !== 10 && !groups && (
          <div className={box}>
            <p className="mb-2 font-semibold text-amber-300">{t(`${to}-жүйеге: ${to}-ге бөліп, қалдықтарды жазамыз`, `В систему ${to}: делим на ${to} и записываем остатки`, `To base ${to}: divide by ${to}, write the remainders`)}</p>
            <table className="font-mono text-base"><tbody>
              {steps.slice(0, shown).map(([a, q, r], i) => <tr key={i}><td className="pr-2 text-right">{a}</td><td className="px-1 text-slate-400">:</td><td className="pr-2">{to}</td><td className="px-1 text-slate-400">=</td><td className="pr-4 text-right">{q}</td>
                <td className="rounded bg-amber-400/15 px-2 text-amber-300">{t('қалдық', 'остаток', 'rem')} {DIG[r]}</td></tr>)}
            </tbody></table>
            {shown < steps.length
              ? <div className="mt-2 flex gap-2"><button type="button" className={`${BTN} bg-blue-600 text-white hover:bg-blue-500`} onClick={() => setShown(s => s + 1)}>{t('Келесі қадам', 'Следующий шаг', 'Next step')}</button>
                  <button type="button" className={`${BTN} bg-slate-700 hover:bg-slate-600`} onClick={() => setShown(99)}>{t('Бәрін көрсету', 'Показать все', 'Show all')}</button></div>
              : <p className="mt-2 text-sm">{t('Қалдықтарды төменнен жоғары оқимыз', 'Читаем остатки снизу вверх', 'Read the remainders bottom-up')} ↑ <b className="font-mono text-xl text-amber-300">{n.toString(to).toUpperCase()}{sub(to)}</b></p>}
          </div>
        )}
      </>}
    </div>
  );
}

/* ───────────── number systems: column addition / subtraction ───────────── */
export function columnOp(a: string, b: string, base: number, op: '+' | '-') {
  const L = Math.max(a.length, b.length) + (op === '+' ? 1 : 0);
  const A = a.padStart(L, '0'), B = b.padStart(L, '0'), res: number[] = Array(L).fill(0), mark: number[] = Array(L).fill(0);
  let c = 0;
  for (let i = L - 1; i >= 0; i--) {
    const x = parseInt(A[i], base), y = parseInt(B[i], base);
    if (op === '+') { const s = x + y + c; res[i] = s % base; c = s >= base ? 1 : 0; if (i > 0) mark[i - 1] = c; }
    else { let d = x - y - c; c = d < 0 ? 1 : 0; if (d < 0) d += base; res[i] = d; if (i > 0) mark[i - 1] = c; }
  }
  return { A, B, res: res.map(d => DIG[d]).join(''), mark, L };
}

function BaseArith({ w, lang }: { w: any; lang: Lang }) {
  const [base, setBase] = useState<number>(w.base || 2);
  const [a, setA] = useState(String(w.a ?? '11010')), [b, setB] = useState(String(w.b ?? '1100'));
  const [op, setOp] = useState<'+' | '-'>(w.op || '+');
  const [cols, setCols] = useState(0);
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const ok = okIn(a, base) && okIn(b, base);
  const av = ok ? parseInt(a, base) : 0, bv = ok ? parseInt(b, base) : 0, swap = op === '-' && av < bv;
  const r = ok ? columnOp(swap ? b : a, swap ? a : b, base, op) : null;
  const L = r?.L || 0, vis = (i: number) => L - i <= cols;
  const reset = (f: () => void) => { f(); setCols(0); };
  const cell = 'w-9 text-center';

  return (
    <div className="space-y-3">
      <div className={`${box} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col text-xs text-slate-400">{t('Жүйе', 'Система', 'Base')}
          <select aria-label={t('Жүйе', 'Система', 'Base')} value={base} onChange={e => reset(() => setBase(+e.target.value))} className={inp}>{[2, 8, 16].map(x => <option key={x} value={x}>{x}</option>)}</select></label>
        <input aria-label="A" value={a} onChange={e => reset(() => setA(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '')))} className={`${inp} w-40 ${okIn(a, base) ? '' : 'border-red-500'}`} />
        <div className="flex gap-1">{(['+', '-'] as const).map(o => <button key={o} type="button" aria-pressed={op === o} onClick={() => reset(() => setOp(o))} className={`${BTN} w-11 font-mono text-xl ${op === o ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>{o === '-' ? '−' : '+'}</button>)}</div>
        <input aria-label="B" value={b} onChange={e => reset(() => setB(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '')))} className={`${inp} w-40 ${okIn(b, base) ? '' : 'border-red-500'}`} />
      </div>
      {!ok ? <p role="alert" className="text-sm text-red-400">{t(`Тек ${base}-жүйенің цифрлары: ${DIG.slice(0, base)}`, `Только цифры системы ${base}: ${DIG.slice(0, base)}`, `Digits of base ${base} only: ${DIG.slice(0, base)}`)}</p> : r && (
        <div className={`${box} space-y-3`}>
          {swap && <p className="text-sm text-amber-300">{t('A < B: B − A есептеп, алдына минус қоямыз', 'A < B: считаем B − A и ставим минус', 'A < B: compute B − A and put a minus')}</p>}
          <table className="font-mono text-2xl"><tbody>
            <tr className="text-sm text-rose-300"><td />{Array.from({ length: L }, (_, i) => <td key={i} className={cell}>{vis(i + 1) && r.mark[i] ? (op === '+' ? '1' : '•') : ''}</td>)}<td className="pl-3 text-xs text-slate-400">{op === '+' ? t('ауыстыру (көшеді)', 'перенос', 'carry') : t('қарызға алу', 'заём', 'borrow')}</td></tr>
            <tr><td />{[...r.A].map((d, i) => <td key={i} className={`${cell} ${d === '0' && i < L - (swap ? b : a).length ? 'text-slate-600' : ''}`}>{d}</td>)}</tr>
            <tr><td className="pr-1 text-slate-400">{op === '+' ? '+' : '−'}</td>{[...r.B].map((d, i) => <td key={i} className={`${cell} ${i < L - (swap ? a : b).length ? 'text-slate-600' : ''}`}>{d}</td>)}</tr>
            <tr><td />{Array.from({ length: L }, (_, i) => <td key={i} className="border-t-2 border-slate-400" />)}</tr>
            <tr className="font-black text-amber-300"><td>{swap ? '−' : ''}</td>{[...r.res].map((d, i) => <td key={i} className={`${cell} ${vis(i) ? '' : 'opacity-0'} ${L - i === cols ? 'rounded bg-amber-400/20' : ''}`}>{d}</td>)}</tr>
          </tbody></table>
          <div className="flex flex-wrap items-center gap-2">
            {cols < L ? <>
              <button type="button" className={`${BTN} bg-blue-600 text-white hover:bg-blue-500`} onClick={() => setCols(c => c + 1)}>{t('Келесі разряд', 'Следующий разряд', 'Next column')} ←</button>
              <button type="button" className={`${BTN} bg-slate-700 hover:bg-slate-600`} onClick={() => setCols(L)}>{t('Нәтиже', 'Результат', 'Result')}</button>
            </> : <p className="text-sm text-slate-300">{t('Тексеру ондықта', 'Проверка в десятичной', 'Check in decimal')}: <span className="font-mono">{av} {op === '+' ? '+' : '−'} {bv} = <b className="text-amber-300">{op === '+' ? av + bv : av - bv}</b></span>
              {' · '}<span className="font-mono">{(swap ? '−' : '') + r.res.replace(/^0+(?=.)/, '')}{sub(base)} = {op === '+' ? av + bv : av - bv}</span></p>}
          </div>
          {base === 2 && <p className="text-xs text-slate-400">{op === '+' ? '0+0=0 · 0+1=1 · 1+0=1 · 1+1=10 · 1+1+1=11' : '0−0=0 · 1−0=1 · 1−1=0 · 0−1=1 (' + t('көршіден 1 қарыз', 'заём 1 у соседа', 'borrow 1 from the left') + ')'}</p>}
        </div>
      )}
    </div>
  );
}

/* ───────────── logic gates and circuits ───────────── */
export type Gate = { id: string; type: 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR'; in: string[] };
export type CircuitDef = { inputs: string[]; gates: Gate[]; out: string };
export const gateFn = (type: Gate['type'], xs: number[]) => {
  const v = type === 'AND' || type === 'NAND' ? +xs.every(Boolean) : type === 'OR' || type === 'NOR' ? +xs.some(Boolean)
    : type === 'XOR' ? xs.reduce((a, b) => a ^ b, 0) : xs[0] ? 0 : 1;
  return type === 'NAND' || type === 'NOR' ? 1 - v : v;
};
/** Value of every input and gate for one assignment of the inputs. */
export const evalCircuit = (c: CircuitDef, ins: Record<string, number>) => {
  const v: Record<string, number> = { ...ins };
  const get = (id: string): number => { if (id in v) return v[id]; const g = c.gates.find(x => x.id === id)!; return (v[id] = gateFn(g.type, g.in.map(get))); };
  c.gates.forEach(g => get(g.id));
  return v;
};
/** The truth table's output column as a string of 0/1, rows in binary order of the inputs (000, 001, …). */
export const truthColumn = (c: CircuitDef) => Array.from({ length: 2 ** c.inputs.length }, (_, r) =>
  evalCircuit(c, Object.fromEntries(c.inputs.map((n, i) => [n, (r >> (c.inputs.length - 1 - i)) & 1])))[c.out]).join('');

const SHAPE: Record<string, (x: number, y: number) => string> = {
  AND: (x, y) => `M${x},${y - 22} h28 a22,22 0 0 1 0,44 h-28 z`,
  NAND: (x, y) => `M${x},${y - 22} h28 a22,22 0 0 1 0,44 h-28 z`,
  OR: (x, y) => `M${x - 4},${y - 22} q30,0 54,22 q-24,22 -54,22 q12,-22 0,-44 z`,
  NOR: (x, y) => `M${x - 4},${y - 22} q30,0 54,22 q-24,22 -54,22 q12,-22 0,-44 z`,
  XOR: (x, y) => `M${x - 4},${y - 22} q30,0 54,22 q-24,22 -54,22 q12,-22 0,-44 z M${x - 12},${y - 22} q12,22 0,44`,
  NOT: (x, y) => `M${x},${y - 20} L${x + 42},${y} L${x},${y + 20} z`,
};
const NAME: Record<string, [string, string, string]> = { AND: ['ЖӘНЕ', 'И', 'AND'], OR: ['НЕМЕСЕ', 'ИЛИ', 'OR'], NOT: ['ЕМЕС', 'НЕ', 'NOT'], XOR: ['XOR', 'XOR', 'XOR'], NAND: ['ЖӘНЕ-ЕМЕС', 'И-НЕ', 'NAND'], NOR: ['НЕМЕСЕ-ЕМЕС', 'ИЛИ-НЕ', 'NOR'] };

function Circuit({ w, lang }: { w: any; lang: Lang }) {
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const [g1, setG1] = useState<Gate['type']>(w.gate || 'AND');
  const c: CircuitDef = w.pick ? (g1 === 'NOT' ? { inputs: ['A'], gates: [{ id: 'Q', type: 'NOT', in: ['A'] }], out: 'Q' } : { inputs: ['A', 'B'], gates: [{ id: 'Q', type: g1, in: ['A', 'B'] }], out: 'Q' }) : w.circuit;
  const [ins, setIns] = useState<Record<string, number>>({});
  const cur = Object.fromEntries(c.inputs.map(n => [n, ins[n] ?? 0]));
  const v = evalCircuit(c, cur);
  // layout: column = depth (inputs 0), rows spread evenly
  const depth: Record<string, number> = Object.fromEntries(c.inputs.map(n => [n, 0]));
  const d = (id: string): number => depth[id] ?? (depth[id] = 1 + Math.max(...c.gates.find(g => g.id === id)!.in.map(d)));
  c.gates.forEach(g => d(g.id));
  const maxD = Math.max(...Object.values(depth)), H = Math.max(c.inputs.length, ...Array.from({ length: maxD + 1 }, (_, k) => Object.values(depth).filter(x => x === k).length)) * 80 + 20;
  const pos: Record<string, [number, number]> = {};
  for (let k = 0; k <= maxD; k++) {
    const ids = Object.keys(depth).filter(id => depth[id] === k);
    ids.forEach((id, i) => { pos[id] = [40 + k * 170, ((i + 1) * H) / (ids.length + 1)]; });
  }
  const W = 40 + maxD * 170 + 140;
  const outX = (id: string) => (id in cur ? pos[id][0] + 26 : pos[id][0] + (['NOT', 'NAND', 'NOR'].includes(c.gates.find(g => g.id === id)!.type) ? 58 : 50));
  const on = '#facc15', off = '#64748b';
  const rows = Array.from({ length: 2 ** c.inputs.length }, (_, r) => c.inputs.map((_, i) => (r >> (c.inputs.length - 1 - i)) & 1));
  const curRow = parseInt(c.inputs.map(n => cur[n]).join(''), 2);
  const mids = c.gates.filter(g => g.id !== c.out);

  return (
    <div className="space-y-3">
      {w.pick && <div className="flex flex-wrap gap-1.5">{(['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR'] as const).map(x =>
        <button key={x} type="button" aria-pressed={g1 === x} onClick={() => { setG1(x); setIns({}); }} className={`${BTN} ${g1 === x ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{x} <span className="text-xs opacity-75">{NAME[x][lang === 'ru' ? 1 : lang === 'en' ? 2 : 0]}</span></button>)}</div>}
      {w.scene === 'alarm' && <AlarmScene d={cur.D} win={cur.W} s={cur.S} q={v[c.out]} flip={n => setIns(x => ({ ...x, [n]: cur[n] ? 0 : 1 }))} lang={lang} />}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className={`${box} overflow-x-auto`}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[22rem]" role="img" aria-label={t('Схема', 'Схема', 'Circuit') + `: ${c.out} = ${v[c.out]}`}>
            {c.gates.map(g => g.in.map((src, j) => {
              const [gx, gy] = pos[g.id], k = g.in.length, ty = k === 1 ? gy : gy - 12 + (24 * j) / (k - 1), sx = outX(src), sy = pos[src][1],
                mx = depth[src] + 1 < depth[g.id] ? gx - 36 - 10 * j : (sx + gx) / 2; // a wire that skips a column turns next to its own gate, not through the gates between
              return <path key={g.id + j} d={`M${sx},${sy} H${mx} V${ty} H${gx + (g.type === 'XOR' || g.type === 'OR' || g.type === 'NOR' ? 6 : 0)}`} fill="none" stroke={v[src] ? on : off} strokeWidth={v[src] ? 4 : 3} />;
            }))}
            {c.inputs.map(n => (
              <g key={n} role="button" tabIndex={0} aria-label={`${n} = ${cur[n]}`} className="cursor-pointer" onClick={() => setIns(x => ({ ...x, [n]: cur[n] ? 0 : 1 }))}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setIns(x => ({ ...x, [n]: cur[n] ? 0 : 1 }))}>
                <rect x={pos[n][0] - 26} y={pos[n][1] - 18} width={52} height={36} rx={10} fill={cur[n] ? on : '#1e293b'} stroke={cur[n] ? on : off} strokeWidth={2} />
                <text x={pos[n][0]} y={pos[n][1] + 6} textAnchor="middle" fontSize="18" fontWeight="800" fill={cur[n] ? '#0f172a' : '#e2e8f0'}>{n}={cur[n]}</text>
              </g>
            ))}
            {c.gates.map(g => { const [x, y] = pos[g.id], live = v[g.id]; return (
              <g key={g.id}>
                <path d={SHAPE[g.type](x, y)} fill="#1e293b" stroke={live && !(w.hideOut && g.id === c.out) ? on : '#94a3b8'} strokeWidth={2.5} />
                {['NOT', 'NAND', 'NOR'].includes(g.type) && <circle cx={x + (g.type === 'NOT' ? 47 : 55)} cy={y} r={5} fill="#1e293b" stroke={live ? on : '#94a3b8'} strokeWidth={2.5} />}
                <text x={x + 20} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#cbd5e1">{g.type}</text>
                {g.id === c.out ? <>
                  <path d={`M${outX(g.id)},${y} H${outX(g.id) + 34}`} stroke={live && !w.hideOut ? on : off} strokeWidth={4} />
                  <circle cx={outX(g.id) + 52} cy={y} r={16} fill={live && !w.hideOut ? on : '#334155'} stroke={live && !w.hideOut ? '#fde68a' : off} strokeWidth={3} />
                  <text x={outX(g.id) + 52} y={y + 6} textAnchor="middle" fontSize="16" fontWeight="900" fill={live && !w.hideOut ? '#0f172a' : '#e2e8f0'}>{w.hideOut ? '?' : live}</text>
                </> : <text x={outX(g.id) + 4} y={y - 8} fontSize="12" fill="#94a3b8">{g.id}</text>}
              </g>
            ); })}
          </svg>
          <p className="mt-1 text-xs text-slate-400">{t('Кірісті басып 0/1 ауыстыр: 1 сигнал сары сызықпен жүреді', 'Нажимай на входы (0/1): сигнал 1 идёт по жёлтому проводу', 'Click the inputs (0/1): a 1 flows along the yellow wires')}</p>
        </div>
        <div className={`${box} overflow-x-auto`}>
          <p className="mb-1 text-sm font-semibold text-sky-300">{t('Ақиқаттық кестесі', 'Таблица истинности', 'Truth table')}</p>
          <table className="font-mono text-base"><thead><tr className="text-slate-400">{c.inputs.map(n => <th key={n} className="px-2">{n}</th>)}{!w.hideMid && mids.map(g => <th key={g.id} className="px-2 text-xs">{g.id}</th>)}<th className="px-2 text-amber-300">{c.out}</th></tr></thead>
            <tbody>{rows.map((r, i) => { const vv = evalCircuit(c, Object.fromEntries(c.inputs.map((n, j) => [n, r[j]]))); return (
              <tr key={i} className={i === curRow ? 'bg-amber-400/20' : ''}>{r.map((x, j) => <td key={j} className="px-2 text-center">{x}</td>)}
                {!w.hideMid && mids.map(g => <td key={g.id} className="px-2 text-center text-slate-400">{vv[g.id]}</td>)}
                <td className="px-2 text-center font-black text-amber-300">{w.hideOut ? '?' : vv[c.out]}</td></tr>
            ); })}</tbody></table>
          <p className="mt-1 text-xs text-slate-400">{2 ** c.inputs.length} {t('жол', 'строк', 'rows')} = 2{sup(c.inputs.length)}</p>
        </div>
      </div>
    </div>
  );
}

/** The burglar-alarm example as a picture: the door (D), the window (W) and the arming switch (S) are the circuit's inputs, the siren is Q. */
function AlarmScene({ d, win, s, q, flip, lang }: { d: number; win: number; s: number; q: number; flip: (n: string) => void; lang: Lang }) {
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const hot = '#facc15', dim = '#64748b';
  const key = (n: string) => ({ role: 'button', tabIndex: 0, className: 'cursor-pointer', onClick: () => flip(n), onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && flip(n) });
  const row = (n: string, val: number, name: string, st: [string, string]) => (
    <li key={n} className="flex items-center gap-2"><b className={`grid h-8 w-8 place-items-center rounded-lg font-mono ${val ? 'bg-amber-400 text-slate-900' : 'bg-slate-700'}`}>{n}</b>
      <span>{name}: <b className={val ? 'text-amber-300' : 'text-slate-300'}>{val} — {val ? st[1] : st[0]}</b></span></li>);
  return (
    <div className={`${box} grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem] md:items-center`}>
      <svg viewBox="0 0 520 300" className="w-full" role="img" aria-label={t('Үй: есік, терезе, күзет қосқышы және дабыл', 'Дом: дверь, окно, выключатель охраны и сирена', 'A house: door, window, arming switch and siren')}>
        <rect x="0" y="262" width="520" height="38" fill="#14532d" />
        <path d="M60,130 L230,30 L400,130 Z" fill="#7f1d1d" stroke="#fca5a5" strokeWidth="3" />
        <rect x="80" y="130" width="300" height="132" fill="#334155" stroke="#94a3b8" strokeWidth="3" />
        {/* door D */}
        <g {...key('D')} aria-label={`D: ${t('есік', 'дверь', 'door')} = ${d}`}>
          <rect x="110" y="170" width="62" height="92" fill="#0f172a" stroke={d ? hot : '#94a3b8'} strokeWidth="3" />
          {d ? <path d="M110,170 L140,180 L140,272 L110,262 Z" fill="#a16207" stroke={hot} strokeWidth="2" /> : <><rect x="110" y="170" width="62" height="92" fill="#a16207" /><circle cx="162" cy="218" r="4" fill="#fde68a" /></>}
          <text x="141" y="162" textAnchor="middle" fontSize="15" fontWeight="800" fill={d ? hot : '#e2e8f0'}>D</text>
        </g>
        {/* window W */}
        <g {...key('W')} aria-label={`W: ${t('терезе', 'окно', 'window')} = ${win}`}>
          <rect x="250" y="160" width="90" height="62" fill={win ? '#0f172a' : '#7dd3fc'} stroke={win ? hot : '#94a3b8'} strokeWidth="3" />
          {win ? <path d="M250,160 L232,150 L232,232 L250,222 Z" fill="#7dd3fc" stroke={hot} strokeWidth="2" /> : <path d="M295,160 V222 M250,191 H340" stroke="#94a3b8" strokeWidth="3" />}
          <text x="295" y="152" textAnchor="middle" fontSize="15" fontWeight="800" fill={win ? hot : '#e2e8f0'}>W</text>
        </g>
        {/* arming switch S */}
        <g {...key('S')} aria-label={`S: ${t('күзет қосқышы', 'выключатель охраны', 'arming switch')} = ${s}`}>
          <rect x="420" y="170" width="70" height="92" rx="10" fill="#1e293b" stroke={s ? '#22c55e' : '#94a3b8'} strokeWidth="3" />
          <rect x="440" y={s ? 182 : 214} width="30" height="36" rx="6" fill={s ? '#22c55e' : '#475569'} />
          <text x="455" y="256" textAnchor="middle" fontSize="13" fontWeight="800" fill={s ? '#86efac' : '#cbd5e1'}>{s ? t('ҚОСУЛЫ', 'ВКЛ', 'ON') : t('ӨШІК', 'ВЫКЛ', 'OFF')}</text>
          <text x="455" y="160" textAnchor="middle" fontSize="15" fontWeight="800" fill={s ? '#86efac' : '#e2e8f0'}>S</text>
        </g>
        {/* siren Q */}
        <g aria-label={`Q: ${t('дабыл', 'сирена', 'siren')} = ${q}`}>
          <rect x="212" y="78" width="36" height="16" fill="#475569" />
          <path d="M214,78 a16,16 0 0 1 32,0 Z" fill={q ? '#ef4444' : '#334155'} stroke={q ? '#fecaca' : dim} strokeWidth="2" />
          {q ? <path d="M196,52 l-14,-8 M190,70 h-16 M264,52 l14,-8 M270,70 h16 M230,40 v-14" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" /> : null}
          <text x="230" y="118" textAnchor="middle" fontSize="15" fontWeight="900" fill={q ? '#fca5a5' : '#e2e8f0'}>Q = {q}</text>
        </g>
      </svg>
      <div className="space-y-2 text-sm">
        <ul className="space-y-1.5">
          {row('D', d, t('есік', 'дверь', 'door'), [t('жабық', 'закрыта', 'closed'), t('ашық', 'открыта', 'open')])}
          {row('W', win, t('терезе', 'окно', 'window'), [t('жабық', 'закрыто', 'closed'), t('ашық', 'открыто', 'open')])}
          {row('S', s, t('күзет қосқышы', 'выключатель охраны', 'arming switch'), [t('өшік', 'выключен', 'off'), t('қосулы', 'включён', 'on')])}
        </ul>
        <p className={`rounded-lg px-3 py-2 font-bold ${q ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}`}>Q — {t('дабыл', 'сирена', 'siren')}: {q ? t('1 — шырылдап тұр!', '1 — звенит!', '1 — ringing!') : t('0 — тыныш', '0 — тихо', '0 — quiet')}</p>
        <p className="text-xs text-slate-400">{t('Суреттегі есікті, терезені, қосқышты басуға болады. Схема мен кесте бірге өзгереді.', 'Можно нажимать на дверь, окно и выключатель — схема и таблица меняются вместе.', 'Click the door, window and switch — the circuit and table change with them.')}</p>
      </div>
    </div>
  );
}

/* ───────────── adders: 1 bit (half adder) and 2 bits (half + full adder) ───────────── */
type AG = { id: string; type: Gate['type']; in: string[]; x: number; y: number };
// Hand-placed gates; a wire is [source, gate, input index, x of its vertical part] so the wires do not overlap.
const ADD1 = { W: 520, H: 270, ins: { A: 70, B: 190 } as Record<string, number>, outs: ['S', 'C'],
  gates: [{ id: 'S', type: 'XOR', in: ['A', 'B'], x: 250, y: 90 }, { id: 'C', type: 'AND', in: ['A', 'B'], x: 250, y: 190 }] as AG[],
  mid: { 'S0': 140, 'S1': 175, 'C0': 120, 'C1': 155 } as Record<string, number> };
const ADD2 = { W: 860, H: 420, ins: { A0: 50, B0: 120, A1: 250, B1: 330 } as Record<string, number>, outs: ['S0', 'S1', 'C2'],
  gates: [
    { id: 'S0', type: 'XOR', in: ['A0', 'B0'], x: 230, y: 60 }, { id: 'C0', type: 'AND', in: ['A0', 'B0'], x: 230, y: 140 },
    { id: 'X', type: 'XOR', in: ['A1', 'B1'], x: 230, y: 260 }, { id: 'C1a', type: 'AND', in: ['A1', 'B1'], x: 230, y: 340 },
    { id: 'S1', type: 'XOR', in: ['X', 'C0'], x: 450, y: 200 }, { id: 'C1b', type: 'AND', in: ['X', 'C0'], x: 450, y: 280 },
    { id: 'C2', type: 'OR', in: ['C1a', 'C1b'], x: 640, y: 320 },
  ] as AG[],
  mid: { 'S00': 130, 'S01': 165, 'C00': 115, 'C01': 150, 'X0': 130, 'X1': 165, 'C1a0': 115, 'C1a1': 150, 'S10': 350, 'S11': 400, 'C1b0': 335, 'C1b1': 385, 'C20': 560, 'C21': 590 } as Record<string, number> };
/** All gate values of an adder for the given input bits. */
export const evalAdder = (bits: 1 | 2, ins: Record<string, number>) =>
  evalCircuit({ inputs: Object.keys((bits === 1 ? ADD1 : ADD2).ins), gates: (bits === 1 ? ADD1 : ADD2).gates, out: '' }, ins);

function Adder({ w, lang }: { w: any; lang: Lang }) {
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const L = w.bits === 2 ? ADD2 : ADD1;
  const [ins, setIns] = useState<Record<string, number>>({});
  const cur = Object.fromEntries(Object.keys(L.ins).map(n => [n, ins[n] ?? 0]));
  const v = evalAdder(w.bits === 2 ? 2 : 1, cur);
  const on = '#facc15', off = '#64748b', IX = 50;
  const outX = (id: string) => (id in L.ins ? IX + 30 : L.gates.find(g => g.id === id)!.x + 50);
  const outY = (id: string) => (id in L.ins ? L.ins[id] : L.gates.find(g => g.id === id)!.y);
  const lampX = L.W - 50;
  const flip = (n: string) => setIns(x => ({ ...x, [n]: cur[n] ? 0 : 1 }));
  const a = w.bits === 2 ? cur.A1 * 2 + cur.A0 : cur.A, b = w.bits === 2 ? cur.B1 * 2 + cur.B0 : cur.B;
  const res = w.bits === 2 ? [v.C2, v.S1, v.S0] : [v.C, v.S];
  const bin = (x: number, n: number) => x.toString(2).padStart(n, '0');
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className={`${box} overflow-x-auto`}>
          <svg viewBox={`0 0 ${L.W} ${L.H}`} className="w-full min-w-[24rem]" role="img" aria-label={`${bin(a, w.bits || 1)} + ${bin(b, w.bits || 1)} = ${res.join('')}`}>
            {L.gates.map(g => g.in.map((src, j) => {
              const ty = g.y - 12 + 24 * j, sx = outX(src), sy = outY(src), mx = L.mid[g.id + j] ?? (sx + g.x) / 2;
              return <path key={g.id + j} d={`M${sx},${sy} H${mx} V${ty} H${g.x + (g.type === 'XOR' || g.type === 'OR' ? 6 : 0)}`} fill="none" stroke={v[src] ? on : off} strokeWidth={v[src] ? 4 : 3} strokeLinejoin="round" />;
            }))}
            {L.gates.filter(g => L.outs.includes(g.id)).map(g => (
              <g key={'o' + g.id}>
                <path d={`M${g.x + 50},${g.y} H${lampX - 18}`} stroke={v[g.id] ? on : off} strokeWidth={4} />
                <circle cx={lampX} cy={g.y} r={18} fill={v[g.id] ? on : '#334155'} stroke={v[g.id] ? '#fde68a' : off} strokeWidth={3} />
                <text x={lampX} y={g.y + 6} textAnchor="middle" fontSize="17" fontWeight="900" fill={v[g.id] ? '#0f172a' : '#e2e8f0'}>{v[g.id]}</text>
                <text x={lampX} y={g.y - 26} textAnchor="middle" fontSize="13" fontWeight="800" fill="#fbbf24">{g.id}</text>
              </g>))}
            {Object.keys(L.ins).map(n => (
              <g key={n} role="button" tabIndex={0} aria-label={`${n} = ${cur[n]}`} className="cursor-pointer" onClick={() => flip(n)} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && flip(n)}>
                <rect x={IX - 30} y={L.ins[n] - 18} width={60} height={36} rx={10} fill={cur[n] ? on : '#1e293b'} stroke={cur[n] ? on : off} strokeWidth={2} />
                <text x={IX} y={L.ins[n] + 6} textAnchor="middle" fontSize="17" fontWeight="800" fill={cur[n] ? '#0f172a' : '#e2e8f0'}>{n}={cur[n]}</text>
              </g>))}
            {L.gates.map(g => (
              <g key={g.id}>
                <path d={SHAPE[g.type](g.x, g.y)} fill="#1e293b" stroke={v[g.id] ? on : '#94a3b8'} strokeWidth={2.5} />
                <text x={g.x + 20} y={g.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#cbd5e1">{g.type}</text>
                {!L.outs.includes(g.id) && <text x={g.x + 54} y={g.y - 8} fontSize="12" fill="#94a3b8">{g.id}</text>}
              </g>))}
            {w.bits === 2 && <>
              <text x={250} y={L.H - 8} textAnchor="middle" fontSize="12" fill="#7dd3fc">{t('0-разряд: жарты қосындылағыш', '0-й разряд: полусумматор', 'bit 0: half adder')}</text>
              <text x={520} y={L.H - 8} textAnchor="middle" fontSize="12" fill="#7dd3fc">{t('1-разряд: толық қосындылағыш (C0 көшеді)', '1-й разряд: полный сумматор (перенос C0)', 'bit 1: full adder (carry C0)')}</text>
            </>}
          </svg>
          <p className="mt-1 text-xs text-slate-400">{t('Кірістерді басып 0/1 ауыстыр', 'Нажимай на входы (0/1)', 'Click the inputs (0/1)')}</p>
        </div>
        <div className={`${box} space-y-2 text-center`}>
          <p className="text-sm font-semibold text-sky-300">{t('Нәтиже', 'Результат', 'Result')}</p>
          <div className="font-mono text-2xl leading-relaxed">
            <div><span className="text-slate-400">A</span> {bin(a, w.bits || 1).padStart(res.length, '\u00a0')}</div>
            <div className="border-b-2 border-slate-500 pb-1"><span className="text-slate-400">+B</span> {bin(b, w.bits || 1).padStart(res.length, '\u00a0')}</div>
            <div className="font-black text-amber-300">{res.join('')}<sub className="text-sm">2</sub></div>
          </div>
          <div aria-live="polite" className="rounded-xl bg-black/60 py-2 font-mono text-5xl font-black text-emerald-400">{a + b}</div>
          <p className="font-mono text-sm text-slate-300">{a} + {b} = {a + b}</p>
          <p className="text-xs text-slate-400">{w.bits === 2 ? 'S0 = A0 XOR B0 · C0 = A0 AND B0 · S1 = A1 XOR B1 XOR C0 · C2 = (A1 AND B1) OR ((A1 XOR B1) AND C0)' : 'S = A XOR B · C = A AND B'}</p>
        </div>
      </div>
      {w.bits !== 2 && (
        <div className={`${box} overflow-x-auto`}>
          <table className="mx-auto font-mono text-base"><thead><tr className="text-slate-400"><th className="px-3">A</th><th className="px-3">B</th><th className="px-3 text-amber-300">C</th><th className="px-3 text-amber-300">S</th><th className="px-3">A+B</th></tr></thead>
            <tbody>{[[0, 0], [0, 1], [1, 0], [1, 1]].map(([x, y]) => (
              <tr key={`${x}${y}`} className={x === cur.A && y === cur.B ? 'bg-amber-400/20' : ''}><td className="px-3 text-center">{x}</td><td className="px-3 text-center">{y}</td>
                <td className="px-3 text-center font-black text-amber-300">{x & y}</td><td className="px-3 text-center font-black text-amber-300">{x ^ y}</td><td className="px-3 text-center">{x + y} = {bin(x + y, 2)}₂</td></tr>))}</tbody></table>
        </div>)}
    </div>
  );
}

/* ───────────── coding: integers (8 bits) ───────────── */
function IntCode({ w, lang }: { w: any; lang: Lang }) {
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const [bits, setBits] = useState<number[]>(() => toBits(w.value ?? -13));
  const [txt, setTxt] = useState(String(w.value ?? -13));
  const u = parseInt(bits.join(''), 2), s = u >= 128 ? u - 256 : u;
  const set = (v: string) => { setTxt(v); const n = parseInt(v, 10); if (Number.isInteger(n) && n >= -128 && n <= 255) setBits(toBits(n)); };
  const flip = (i: number) => { const b = [...bits]; b[i] = 1 - b[i]; setBits(b); const nu = parseInt(b.join(''), 2); setTxt(String(nu >= 128 ? nu - 256 : nu)); };
  const neg = s < 0, abs = toBits(Math.abs(s)), inv = abs.map(x => 1 - x);
  return (
    <div className="space-y-3">
      <div className={`${box} flex flex-wrap items-end gap-4`}>
        <label className="flex flex-col text-xs text-slate-400">{t('Бүтін сан (−128…127)', 'Целое число (−128…127)', 'Integer (−128…127)')}
          <input aria-label={t('Бүтін сан', 'Целое число', 'Integer')} value={txt} onChange={e => set(e.target.value)} className={`${inp} w-36`} /></label>
        <div className="flex gap-1" role="group" aria-label={t('8 бит', '8 бит', '8 bits')}>
          {bits.map((b, i) => <button key={i} type="button" onClick={() => flip(i)} aria-label={`${t('бит', 'бит', 'bit')} ${7 - i}: ${b}`}
            className={`grid h-14 w-11 place-items-center rounded-lg border-2 font-mono text-2xl font-black cursor-pointer ${i === 0 ? 'border-rose-400' : 'border-slate-500'} ${b ? 'bg-amber-400 text-slate-900' : 'bg-slate-950 text-slate-300'}`}>{b}</button>)}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-600 bg-slate-900/60 p-3"><div className="text-xs text-slate-400">{t('Таңбасыз (0…255)', 'Без знака (0…255)', 'Unsigned (0…255)')}</div><div className="font-mono text-2xl font-bold">{u}</div></div>
        <div className="rounded-xl border border-amber-400 bg-amber-400/10 p-3"><div className="text-xs text-slate-400">{t('Таңбалы, қосымша код', 'Со знаком, доп. код', 'Signed, two’s complement')}</div><div className="font-mono text-2xl font-bold text-amber-300">{s}</div></div>
        <div className="rounded-xl border border-slate-600 bg-slate-900/60 p-3"><div className="text-xs text-slate-400">{t('Таңба биті (сол жақ)', 'Знаковый бит (левый)', 'Sign bit (leftmost)')}</div><div className="font-mono text-2xl font-bold text-rose-300">{bits[0]} → {bits[0] ? t('теріс', 'отрицательное', 'negative') : t('оң', 'положительное', 'positive')}</div></div>
      </div>
      {neg && (
        <div className={`${box} font-mono text-lg`}>
          <p className="mb-2 font-sans text-sm font-semibold text-sky-300">{t(`${s} санының қосымша коды үш қадаммен`, `Дополнительный код числа ${s} за три шага`, `Two’s complement of ${s} in three steps`)}</p>
          <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1">
            <span className="font-sans text-sm text-slate-400">1. |{s}| = {-s}</span><span className="tracking-[0.3em]">{abs.join('')}</span>
            <span className="font-sans text-sm text-slate-400">2. {t('инверсия', 'инверсия', 'invert')}</span><span className="tracking-[0.3em]">{inv.join('')}</span>
            <span className="font-sans text-sm text-slate-400">3. +1</span><span className="tracking-[0.3em] text-amber-300">{bits.join('')}</span>
          </div>
          <p className="mt-2 font-sans text-xs text-slate-400">{t('Тексеру: оң сан + теріс сан = 0 (8 биттен асқан 1 тасталады)', 'Проверка: положительное + отрицательное = 0 (1 за пределами 8 бит отбрасывается)', 'Check: positive + negative = 0 (the 1 beyond 8 bits is dropped)')}</p>
        </div>
      )}
    </div>
  );
}
const toBits = (n: number) => ((n + 256) % 256).toString(2).padStart(8, '0').split('').map(Number);

/* ───────────── coding: characters ───────────── */
function TextCode({ w, lang }: { w: any; lang: Lang }) {
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const [txt, setTxt] = useState(String(w.value ?? 'Hi Қ!'));
  const chars = [...txt].slice(0, 16);
  const enc = new TextEncoder();
  const bytes = enc.encode(chars.join('')).length;
  return (
    <div className="space-y-3">
      <div className={`${box} flex flex-wrap items-end gap-4`}>
        <label className="flex flex-col text-xs text-slate-400">{t('Мәтін (16 таңбаға дейін)', 'Текст (до 16 символов)', 'Text (up to 16 characters)')}
          <input aria-label={t('Мәтін', 'Текст', 'Text')} value={txt} onChange={e => setTxt(e.target.value)} className={`${inp} w-72`} /></label>
        <p className="pb-2 text-sm text-slate-300">{chars.length} {t('таңба', 'символов', 'characters')} · UTF-8: <b className="text-amber-300">{bytes}</b> {t('байт', 'байт', 'bytes')} = {bytes * 8} {t('бит', 'бит', 'bits')}</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-600">
        <table className="w-full font-mono text-sm">
          <thead className="bg-slate-800 text-left text-xs text-slate-400"><tr><th className="p-2">{t('Таңба', 'Символ', 'Char')}</th><th className="p-2">{t('Код (10)', 'Код (10)', 'Code (10)')}</th><th className="p-2">Unicode</th><th className="p-2">{t('Екілік', 'Двоичный', 'Binary')}</th><th className="p-2">UTF-8</th><th className="p-2">{t('Кесте', 'Таблица', 'Table')}</th></tr></thead>
          <tbody>{chars.map((ch, i) => { const cp = ch.codePointAt(0)!, u8 = [...enc.encode(ch)]; return (
            <tr key={i} className="border-t border-slate-700">
              <td className="p-2 text-xl font-bold">{ch === ' ' ? '␣' : ch}</td><td className="p-2">{cp}</td><td className="p-2">U+{cp.toString(16).toUpperCase().padStart(4, '0')}</td>
              <td className="p-2 tracking-wider">{cp.toString(2).padStart(cp < 256 ? 8 : 16, '0')}</td>
              <td className="p-2">{u8.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')} <span className="text-xs text-slate-400">({u8.length} {t('байт', 'байт', 'B')})</span></td>
              <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs font-bold ${cp < 128 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-violet-500/20 text-violet-300'}`}>{cp < 128 ? 'ASCII' : 'Unicode'}</span></td>
            </tr>
          ); })}</tbody>
        </table>
      </div>
    </div>
  );
}
