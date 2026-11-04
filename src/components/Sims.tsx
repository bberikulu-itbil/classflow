import React, { useState } from 'react';

// Interactive explanation widgets for slides of type 'sim' ({ type:'sim', sim:'bits'|'adder'|'circuit'|'truth', formula? }).
// State lives in the viewer's browser only: nothing is sent anywhere, nothing is graded.
const B = 'px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition cursor-pointer';
const BP = 'px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition cursor-pointer';
const PW = [128, 64, 32, 16, 8, 4, 2, 1];
const flip = (a: number[], i: number) => a.map((v, k) => (k === i ? 1 - v : v));

/** 2.1: switch eight bits, see the sum; or get a target number and build it. */
function BitsSim() {
  const zero = () => Array(8).fill(0) as number[];
  const [bits, setBits] = useState<number[]>(zero);
  const [target, setTarget] = useState<number | null>(null);
  const sum = bits.reduce((a, b, i) => a + b * PW[i], 0);
  const on = PW.filter((_, i) => bits[i]);
  const ok = target !== null && sum === target;
  return (
    <div className="space-y-4">
      <div className="grid max-w-3xl grid-cols-8 gap-2">
        {bits.map((b, i) => (
          <button key={i} aria-pressed={!!b} aria-label={`${PW[i]} разряды: ${b}`} onClick={() => setBits(flip(bits, i))}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-2 transition ${b ? 'border-blue-400 bg-blue-900/50' : 'border-slate-600 bg-slate-800 hover:border-slate-400'}`}>
            <span className={`h-9 w-9 rounded-full ${b ? 'bg-amber-400 shadow-[0_0_18px_#fbbf24]' : 'bg-slate-700'}`} />
            <span className="font-mono text-3xl font-black text-text">{b}</span>
            <span className="text-sm font-bold text-slate-300">{PW[i]}</span>
          </button>
        ))}
      </div>
      <div className="font-mono text-3xl font-black text-text">{on.length ? on.join(' + ') : '0'} = <span className="text-amber-300">{sum}</span></div>
      <div className="font-mono text-slate-300">{bits.join('')}₂ = {sum}₁₀</div>
      <div className="flex flex-wrap items-center gap-3">
        <button className={BP} onClick={() => { setTarget(1 + Math.floor(Math.random() * 255)); setBits(zero()); }}>🎯 Тапсырма</button>
        <button className={B} onClick={() => { setBits(zero()); setTarget(null); }}>Тазалау</button>
        {target !== null && (
          <span className={`text-2xl font-black ${ok ? 'text-emerald-400' : 'text-text'}`} role="status">
            {ok ? `✓ Дұрыс! ${target} = ${bits.join('')}₂` : `Осы санды жина: ${target}`}
          </span>
        )}
      </div>
    </div>
  );
}

/** 2.2: two 4-bit numbers, column addition with visible carries. */
function AdderSim() {
  const [a, setA] = useState([0, 1, 0, 1]);
  const [b, setB] = useState([0, 1, 1, 1]);
  const carry = [0, 0, 0, 0, 0]; // carry[j]: carry into column j counted from the right
  const sum = [0, 0, 0, 0, 0];
  for (let j = 0; j < 4; j++) { const s = a[3 - j] + b[3 - j] + carry[j]; sum[j] = s % 2; carry[j + 1] = s > 1 ? 1 : 0; }
  sum[4] = carry[4];
  const num = (x: number[]) => x.reduce((p, v) => p * 2 + v, 0);
  const A = num(a), Bn = num(b), S = num(sum.slice().reverse());
  const cell = 'flex h-14 w-14 items-center justify-center rounded-xl font-mono text-3xl font-black';
  const cols = [4, 3, 2, 1, 0]; // left to right
  const bit = (arr: number[], set: (x: number[]) => void, j: number, nm: string) => j > 3
    ? <div key={j} className={cell} />
    : <button key={j} aria-label={`${nm}: ${j}-разряд, қазір ${arr[3 - j]}`} onClick={() => set(flip(arr, 3 - j))}
        className={`${cell} cursor-pointer border-2 transition ${arr[3 - j] ? 'border-blue-400 bg-blue-900/50 text-text' : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-400'}`}>{arr[3 - j]}</button>;
  const carries = carry.slice(1).filter(Boolean).length;
  return (
    <div className="space-y-4">
      <div className="inline-grid grid-cols-[2.5rem_repeat(5,3.5rem)] items-center gap-2">
        <div className="text-sm text-slate-400">тасымал</div>
        {cols.map(j => <div key={j} className={`${cell} ${j > 0 && carry[j] ? 'bg-orange-500 text-white' : 'text-transparent'}`}>{j > 0 ? carry[j] : ''}</div>)}
        <div />
        {cols.map(j => bit(a, setA, j, 'A'))}
        <div className="text-3xl font-black text-slate-300">+</div>
        {cols.map(j => bit(b, setB, j, 'B'))}
        <div className="col-span-6 my-1 h-1 rounded bg-slate-500" />
        <div className="text-3xl font-black text-slate-300">=</div>
        {cols.map(j => <div key={j} className={`${cell} bg-emerald-900/50 text-emerald-300`}>{sum[j]}</div>)}
      </div>
      <div className="font-mono text-2xl font-black text-text">{A} + {Bn} = <span className="text-emerald-300">{S}</span> <span className="text-base font-normal text-slate-400">(ондық жүйеде)</span></div>
      <p className="text-slate-300" role="status">{carries ? `Тасымал саны: ${carries}. 1 + 1 = 10: 0 жазамыз, 1 келесі разрядқа өтеді.` : 'Тасымал жоқ: әр разряд өз алдына қосылады.'}</p>
      <button className={B} onClick={() => { setA([0, 0, 0, 0]); setB([0, 0, 0, 0]); }}>Тазалау</button>
    </div>
  );
}

/** 2.5: (S1 AND S2) OR S3 with three switches and a lamp. */
function CircuitSim() {
  const [s, setS] = useState([0, 0, 0]);
  const x = s[0] & s[1], out = x | s[2];
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
      <svg viewBox="0 0 780 300" className="w-full max-w-3xl" role="img" aria-label="(S1 AND S2) OR S3 схемасы">
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
      <p className="text-lg font-bold text-text" role="status">{out ? '💡 Шам жанды' : '○ Шам өшулі'}: ({s[0]} AND {s[1]}) OR {s[2]} = {out}</p>
      <button className={B} onClick={() => setS([0, 0, 0])}>Тазалау</button>
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
function TruthSim({ formula = 'pnq' }: { formula?: string }) {
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
      <div className="text-2xl font-black text-text">Өрнек: <span className="font-mono text-amber-300">{F.text}</span></div>
      <table className="border-separate border-spacing-y-1 text-center font-mono text-2xl">
        <thead><tr>{F.vars.map(v => <th key={v} className={th}>{v}</th>)}<th className={th}>Нәтиже</th></tr></thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => {
            const v = g[i], good = v === F.f(input(i));
            return (
              <tr key={i}>
                {input(i).map((b, k) => <td key={k} className="bg-slate-800 px-5 py-2 first:rounded-l-xl">{b}</td>)}
                <td className="rounded-r-xl bg-slate-800 p-1">
                  <button aria-label={`${i + 1}-жол нәтижесі: ${v === null ? 'белгісіз' : v}`} onClick={() => click(i)}
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
        <button className={BP} onClick={() => setChecked(true)}>Тексеру</button>
        <button className={B} onClick={reset}>Қайта бастау</button>
        {checked && <span className={`text-xl font-black ${right === rows ? 'text-emerald-400' : 'text-text'}`} role="status">{right === rows ? '✓ Бәрі дұрыс!' : `${right} / ${rows} дұрыс. Қызыл жолды қайта есепте.`}</span>}
      </div>
      <p className="text-sm text-slate-400">Нәтиже ұяшығын бас: ? → 0 → 1 → 0. Алдымен жақшаны, содан кейін NOT-ты, соңында AND/OR-ды есепте.</p>
    </div>
  );
}

export function Sim({ kind, formula }: { kind?: string; formula?: string }) {
  switch (kind) {
    case 'bits': return <BitsSim />;
    case 'adder': return <AdderSim />;
    case 'circuit': return <CircuitSim />;
    case 'truth': return <TruthSim formula={formula} />;
    default: return <p className="text-slate-400">Симулятор табылмады: {String(kind)}</p>;
  }
}
