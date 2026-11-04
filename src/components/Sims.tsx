import React, { useState } from 'react';
import { pick, type Lang } from '../lessons/lang';

// Interactive explanation widgets for slides of type 'sim' ({ type:'sim', sim:'bits'|'adder'|'circuit'|'truth', formula? }) and the question box of 'logic' slides ({ ask:true }).
// Questions are made up in the browser and checked there: nothing is sent anywhere, nothing is graded. Texts: Kazakh, English (Russian shows Kazakh).
const B = 'px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition cursor-pointer';
const BP = 'px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition cursor-pointer';
const INPUT = 'w-56 px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-lg font-mono outline-none focus:border-blue-500 text-slate-100';
const PW = [128, 64, 32, 16, 8, 4, 2, 1];
const flip = (a: number[], i: number) => a.map((v, k) => (k === i ? 1 - v : v));
const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const t = (lang: Lang, kk: string, en: string) => pick(lang, kk, undefined as unknown as string, en);
/** What a student types, made comparable: no spaces, no leading zeros, no subscript mark, lower case. */
const clean = (v: string) => v.replace(/[\s₂₁₀]/g, '').toLowerCase().replace(/^0+(?=.)/, '');

/** A question with a place to write the answer, a check and the next question. `check` gets the cleaned text. */
function Ask({ q, check, lang, onNext, onRight }: { q: React.ReactNode; check: (v: string) => boolean; lang: Lang; onNext: () => void; onRight: () => void }) {
  const [v, setV] = useState('');
  const [res, setRes] = useState<boolean | null>(null);
  const [counted, setCounted] = useState(false);
  const submit = () => {
    if (!v.trim()) return;
    const ok = check(clean(v));
    setRes(ok);
    if (ok && !counted) { setCounted(true); onRight(); }
  };
  return (
    <div className="space-y-3 rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
      <div className="text-xl font-bold text-text">✍️ {q}</div>
      <div className="flex flex-wrap items-center gap-2">
        <input value={v} onChange={e => { setV(e.target.value); setRes(null); }} onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          aria-label={t(lang, 'Жауабың', 'Your answer')} placeholder={t(lang, 'Жауабыңды жаз', 'Write your answer')} autoComplete="off" spellCheck={false} className={INPUT} />
        <button className={BP} onClick={submit}>{t(lang, 'Тексеру', 'Check')}</button>
        <button className={B} onClick={onNext}>{t(lang, 'Басқа сұрақ', 'Another question')}</button>
      </div>
      {res !== null && (
        <p role="status" className={`text-lg font-black ${res ? 'text-emerald-400' : 'text-red-400'}`}>
          {res ? '✓ ' + t(lang, 'Дұрыс!', 'Correct!') : '✗ ' + t(lang, 'Қайта ойланып көр', 'Think again')}
        </p>
      )}
    </div>
  );
}

/** Keeps the current question and the number of right answers for an Ask. */
function useQuiz<T>(make: () => T) {
  const [round, setRound] = useState(0);
  const [q, setQ] = useState<T>(make);
  const [right, setRight] = useState(0);
  return { q, round, right, next: () => { setQ(make()); setRound(r => r + 1); }, hit: () => setRight(n => n + 1) };
}

/** 2.1: switch eight bits, see the sum; then convert a given number and write the answer. */
function BitsSim({ lang }: { lang: Lang }) {
  const [bits, setBits] = useState<number[]>(Array(8).fill(0));
  const sum = bits.reduce((a, b, i) => a + b * PW[i], 0);
  const on = PW.filter((_, i) => bits[i]);
  const Q = useQuiz(() => { const n = rnd(1, 255); return { n, toBin: Math.random() < 0.5 }; });
  return (
    <div className="space-y-4">
      <div className="grid max-w-3xl grid-cols-8 gap-2">
        {bits.map((b, i) => (
          <button key={i} aria-pressed={!!b} aria-label={`${PW[i]}: ${b}`} onClick={() => setBits(flip(bits, i))}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-2 transition ${b ? 'border-blue-400 bg-blue-900/50' : 'border-slate-600 bg-slate-800 hover:border-slate-400'}`}>
            <span className={`h-9 w-9 rounded-full ${b ? 'bg-amber-400 shadow-[0_0_18px_#fbbf24]' : 'bg-slate-700'}`} />
            <span className="font-mono text-3xl font-black text-text">{b}</span>
            <span className="text-sm font-bold text-slate-300">{PW[i]}</span>
          </button>
        ))}
      </div>
      <div className="font-mono text-3xl font-black text-text">{on.length ? on.join(' + ') : '0'} = <span className="text-amber-300">{sum}</span></div>
      <div className="font-mono text-slate-300">{bits.join('')}₂ = {sum}₁₀</div>
      <button className={B} onClick={() => setBits(Array(8).fill(0))}>{t(lang, 'Тазалау', 'Clear')}</button>
      <Ask key={Q.round} lang={lang} onNext={Q.next} onRight={Q.hit}
        q={Q.q.toBin ? <>{t(lang, 'Ондық', 'Decimal')} <span className="font-mono text-amber-300">{Q.q.n}</span> {t(lang, 'санын екілік жүйеде жаз', 'in binary = ?')}</> : <><span className="font-mono text-amber-300">{Q.q.n.toString(2)}₂</span> {t(lang, 'санын ондық жүйеде жаз', 'in decimal = ?')}</>}
        check={v => v === (Q.q.toBin ? Q.q.n.toString(2) : String(Q.q.n))} />
      {Q.right > 0 && <p className="text-slate-300">{t(lang, 'Дұрыс жауап', 'Correct answers')}: {Q.right}</p>}
    </div>
  );
}

/** 2.2: two 4-bit numbers, column addition with visible carries; then a sum to write. */
function AdderSim({ lang }: { lang: Lang }) {
  const [a, setA] = useState([0, 1, 0, 1]);
  const [b, setB] = useState([0, 1, 1, 1]);
  const carry = [0, 0, 0, 0, 0]; // carry[j]: carry into column j counted from the right
  const sum = [0, 0, 0, 0, 0];
  for (let j = 0; j < 4; j++) { const s = a[3 - j] + b[3 - j] + carry[j]; sum[j] = s % 2; carry[j + 1] = s > 1 ? 1 : 0; }
  sum[4] = carry[4];
  const num = (x: number[]) => x.reduce((p, v) => p * 2 + v, 0);
  const A = num(a), Bn = num(b), S = num(sum.slice().reverse());
  const Q = useQuiz(() => ({ x: rnd(1, 15), y: rnd(1, 15) }));
  const cell = 'flex h-14 w-14 items-center justify-center rounded-xl font-mono text-3xl font-black';
  const cols = [4, 3, 2, 1, 0]; // left to right
  const bit = (arr: number[], set: (x: number[]) => void, j: number, nm: string) => j > 3
    ? <div key={j} className={cell} />
    : <button key={j} aria-label={`${nm}: ${arr[3 - j]}`} onClick={() => set(flip(arr, 3 - j))}
        className={`${cell} cursor-pointer border-2 transition ${arr[3 - j] ? 'border-blue-400 bg-blue-900/50 text-text' : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-400'}`}>{arr[3 - j]}</button>;
  const carries = carry.slice(1).filter(Boolean).length;
  const p4 = (n: number) => n.toString(2).padStart(4, '0');
  return (
    <div className="space-y-4">
      <div className="inline-grid grid-cols-[2.5rem_repeat(5,3.5rem)] items-center gap-2">
        <div className="text-sm text-slate-400">{t(lang, 'тасымал', 'carry')}</div>
        {cols.map(j => <div key={j} className={`${cell} ${j > 0 && carry[j] ? 'bg-orange-500 text-white' : 'text-transparent'}`}>{j > 0 ? carry[j] : ''}</div>)}
        <div />
        {cols.map(j => bit(a, setA, j, 'A'))}
        <div className="text-3xl font-black text-slate-300">+</div>
        {cols.map(j => bit(b, setB, j, 'B'))}
        <div className="col-span-6 my-1 h-1 rounded bg-slate-500" />
        <div className="text-3xl font-black text-slate-300">=</div>
        {cols.map(j => <div key={j} className={`${cell} bg-emerald-900/50 text-emerald-300`}>{sum[j]}</div>)}
      </div>
      <div className="font-mono text-2xl font-black text-text">{A} + {Bn} = <span className="text-emerald-300">{S}</span> <span className="text-base font-normal text-slate-400">({t(lang, 'ондық жүйеде', 'in decimal')})</span></div>
      <p className="text-slate-300" role="status">{carries
        ? t(lang, `Тасымал саны: ${carries}. 1 + 1 = 10: 0 жазамыз, 1 келесі разрядқа өтеді.`, `Carries: ${carries}. 1 + 1 = 10: write 0, and 1 moves to the next place.`)
        : t(lang, 'Тасымал жоқ: әр разряд өз алдына қосылады.', 'No carry: every place is added on its own.')}</p>
      <button className={B} onClick={() => { setA([0, 0, 0, 0]); setB([0, 0, 0, 0]); }}>{t(lang, 'Тазалау', 'Clear')}</button>
      <Ask key={Q.round} lang={lang} onNext={Q.next} onRight={Q.hit}
        q={<><span className="font-mono text-amber-300">{p4(Q.q.x)} + {p4(Q.q.y)}</span> = ? <span className="text-base font-normal text-slate-300">({t(lang, 'екілік жүйеде жаз', 'write it in binary')})</span></>}
        check={v => v === (Q.q.x + Q.q.y).toString(2)} />
      {Q.right > 0 && <p className="text-slate-300">{t(lang, 'Дұрыс жауап', 'Correct answers')}: {Q.right}</p>}
    </div>
  );
}

/** 2.5: (S1 AND S2) OR S3 with three switches and a lamp; then a state to answer. */
function CircuitSim({ lang }: { lang: Lang }) {
  const [s, setS] = useState([0, 0, 0]);
  const x = s[0] & s[1], out = x | s[2];
  const Q = useQuiz(() => [rnd(0, 1), rnd(0, 1), rnd(0, 1)]);
  const w = (on: number) => (on ? '#34d399' : '#64748b');
  const sw = (i: number, y: number) => (
    <g key={i} role="button" tabIndex={0} aria-pressed={!!s[i]} aria-label={`S${i + 1} = ${s[i]}`} style={{ cursor: 'pointer' }}
      onClick={() => setS(flip(s, i))} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setS(flip(s, i)); } }}>
      <rect x="20" y={y - 24} width="120" height="48" rx="12" fill={s[i] ? '#059669' : '#334155'} stroke={s[i] ? '#34d399' : '#64748b'} strokeWidth="3" />
      <text x="80" y={y + 9} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="26" fontWeight="700" fill="#fff">{`S${i + 1} = ${s[i]}`}</text>
    </g>
  );
  const line = (d: string, on: number) => <path d={d} fill="none" stroke={w(on)} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <div className="space-y-3">
      <svg viewBox="0 0 780 300" className="w-full max-w-3xl" role="img" aria-label="(S1 AND S2) OR S3">
        {line('M140 77 H250', s[0])}{line('M140 123 H250', s[1])}
        {line('M345 100 H430 V137 H512', x)}{line('M140 240 H450 V183 H512', s[2])}
        <path d="M250 55 H300 A45 45 0 0 1 300 145 H250 Z" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="4" />
        <text x="285" y="106" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700" fill="#fff">AND</text>
        <path d="M500 115 Q550 115 595 160 Q550 205 500 205 Q530 160 500 115 Z" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="4" />
        <text x="540" y="167" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700" fill="#fff">OR</text>
        {line('M595 160 H662', out)}
        <circle cx="700" cy="160" r="36" fill={out ? '#fbbf24' : '#334155'} stroke={out ? '#f59e0b' : '#64748b'} strokeWidth="5" style={out ? { filter: 'drop-shadow(0 0 14px #fbbf24)' } : undefined} />
        <path d="M675 135 L725 185 M725 135 L675 185" stroke={out ? '#92400e' : '#64748b'} strokeWidth="5" strokeLinecap="round" />
        <text x="362" y="72" textAnchor="start" fontFamily="Arial, sans-serif" fontSize="20" fill="#94a3b8">{`S1 AND S2 = ${x}`}</text>
        {sw(0, 77)}{sw(1, 123)}{sw(2, 240)}
      </svg>
      <p className="text-lg font-bold text-text" role="status">{out ? '💡 ' + t(lang, 'Шам жанды', 'The lamp is on') : '○ ' + t(lang, 'Шам өшулі', 'The lamp is off')}: ({s[0]} AND {s[1]}) OR {s[2]} = {out}</p>
      <button className={B} onClick={() => setS([0, 0, 0])}>{t(lang, 'Тазалау', 'Clear')}</button>
      <Ask key={Q.round} lang={lang} onNext={Q.next} onRight={Q.hit}
        q={<><span className="font-mono text-amber-300">S1={Q.q[0]}, S2={Q.q[1]}, S3={Q.q[2]}</span>. {t(lang, 'Шам жана ма? (1 — жанады, 0 — жанбайды)', 'Does the lamp light up? (1 = on, 0 = off)')}</>}
        check={v => v === String((Q.q[0] & Q.q[1]) | Q.q[2])} />
      {Q.right > 0 && <p className="text-slate-300">{t(lang, 'Дұрыс жауап', 'Correct answers')}: {Q.right}</p>}
    </div>
  );
}

const FORMULAS: Record<string, { text: string; vars: string[]; f: (v: number[]) => number }> = {
  pnq: { text: 'p AND NOT q', vars: ['p', 'q'], f: v => v[0] & (v[1] ? 0 : 1) },
  bca: { text: '(A OR B) AND C', vars: ['A', 'B', 'C'], f: v => (v[0] | v[1]) & v[2] },
  nand: { text: 'NOT (p AND q)', vars: ['p', 'q'], f: v => ((v[0] & v[1]) ? 0 : 1) },
  xor: { text: 'p XOR q', vars: ['p', 'q'], f: v => v[0] ^ v[1] },
};

/** 2.4: fill the result column of a truth table by clicking, then check. */
function TruthSim({ formula = 'pnq', lang }: { formula?: string; lang: Lang }) {
  const F = FORMULAS[formula] || FORMULAS.pnq;
  const n = F.vars.length, rows = 2 ** n;
  const input = (i: number) => F.vars.map((_, k) => (i >> (n - 1 - k)) & 1);
  const [g, setG] = useState<(number | null)[]>(Array(rows).fill(null));
  const [checked, setChecked] = useState(false);
  const right = g.filter((v, i) => v === F.f(input(i))).length;
  const reset = () => { setG(Array(rows).fill(null)); setChecked(false); };
  const click = (i: number) => { setChecked(false); setG(g.map((v, k) => (k === i ? (v === null ? 0 : 1 - v) : v))); };
  const th = 'px-5 py-2 text-lg font-bold text-slate-300';
  return (
    <div className="space-y-4">
      <div className="text-2xl font-black text-text">{t(lang, 'Өрнек', 'Expression')}: <span className="font-mono text-amber-300">{F.text}</span></div>
      <table className="border-separate border-spacing-y-1 text-center font-mono text-2xl">
        <thead><tr>{F.vars.map(v => <th key={v} className={th}>{v}</th>)}<th className={th}>{t(lang, 'Нәтиже', 'Result')}</th></tr></thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => {
            const v = g[i], good = v === F.f(input(i));
            return (
              <tr key={i}>
                {input(i).map((b, k) => <td key={k} className="bg-slate-800 px-5 py-2 first:rounded-l-xl">{b}</td>)}
                <td className="rounded-r-xl bg-slate-800 p-1">
                  <button aria-label={`${i + 1}: ${v === null ? '?' : v}`} onClick={() => click(i)}
                    className={`h-11 w-20 cursor-pointer rounded-lg border-2 font-black transition ${checked && v !== null ? (good ? 'border-emerald-400 bg-emerald-900/60 text-emerald-300' : 'border-red-400 bg-red-900/60 text-red-300') : 'border-slate-500 bg-slate-700 text-text hover:border-slate-300'}`}>
                    {v === null ? '?' : v}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3">
        <button className={BP} onClick={() => setChecked(true)}>{t(lang, 'Тексеру', 'Check')}</button>
        <button className={B} onClick={reset}>{t(lang, 'Қайта бастау', 'Start over')}</button>
        {checked && <span className={`text-xl font-black ${right === rows ? 'text-emerald-400' : 'text-text'}`} role="status">{right === rows ? '✓ ' + t(lang, 'Бәрі дұрыс!', 'All correct!') : `${right} / ${rows} ${t(lang, 'дұрыс. Қызыл жолды қайта есепте.', 'correct. Recalculate the red rows.')}`}</span>}
      </div>
      <p className="text-sm text-slate-400">{t(lang, 'Нәтиже ұяшығын бас: ? → 0 → 1 → 0. Алдымен жақшаны, содан кейін NOT-ты, соңында AND/OR-ды есепте.', 'Click a result cell: ? → 0 → 1 → 0. Calculate the brackets first, then NOT, and AND/OR last.')}</p>
    </div>
  );
}

/** Question box under a 'logic' slide ({ ask:true }): a random gate and inputs, the student writes the output. */
export function GateAsk({ gate = 'AND', lang }: { gate?: string; lang: Lang }) {
  const pool = gate === 'XOR' ? ['AND', 'OR', 'XOR', 'NOT'] : ['AND', 'OR', 'NOT'];
  const f = (g: string, a: number, b: number) => (g === 'AND' ? a & b : g === 'OR' ? a | b : g === 'XOR' ? a ^ b : a ? 0 : 1);
  const Q = useQuiz(() => ({ g: pool[rnd(0, pool.length - 1)], a: rnd(0, 1), b: rnd(0, 1) }));
  return (
    <div className="space-y-2">
      <Ask key={Q.round} lang={lang} onNext={Q.next} onRight={Q.hit}
        q={<><span className="font-mono text-amber-300">{Q.q.g}</span>, <span className="font-mono">A = {Q.q.a}{Q.q.g === 'NOT' ? '' : `, B = ${Q.q.b}`}</span>. {t(lang, 'Шығыс қандай? (0 немесе 1)', 'What is the output? (0 or 1)')}</>}
        check={v => v === String(f(Q.q.g, Q.q.a, Q.q.b))} />
      {Q.right > 0 && <p className="text-slate-300">{t(lang, 'Дұрыс жауап', 'Correct answers')}: {Q.right}</p>}
    </div>
  );
}

export function Sim({ kind, formula, lang = 'kk' }: { kind?: string; formula?: string; lang?: Lang }) {
  switch (kind) {
    case 'bits': return <BitsSim lang={lang} />;
    case 'adder': return <AdderSim lang={lang} />;
    case 'circuit': return <CircuitSim lang={lang} />;
    case 'truth': return <TruthSim formula={formula} lang={lang} />;
    default: return <p className="text-slate-400">{String(kind)}</p>;
  }
}
