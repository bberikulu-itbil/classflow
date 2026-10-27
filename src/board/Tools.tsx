import React, { useEffect, useRef, useState } from 'react';
import { Dice5, Pause, Play, RotateCcw } from 'lucide-react';
import { Button, inputCls } from '../ui';
import { fmt } from '../components/Widgets';

function beep() {
  try {
    const A = window.AudioContext || (window as any).webkitAudioContext, a = new A();
    [0, 0.35, 0.7].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.2); });
    setTimeout(() => a.close(), 1500);
  } catch { /* no audio, the flashing digits still say it */ }
}

/** Lives in the board, not in the window, so closing the window does not stop the count. */
export function useTimer() {
  const [total, setTotal] = useState(300), [left, setLeft] = useState(300), [end, setEnd] = useState<number | null>(null), [done, setDone] = useState(false);
  useEffect(() => {
    if (end == null) return;
    const tick = () => { const l = Math.max(0, Math.ceil((end - Date.now()) / 1000)); setLeft(l); if (l === 0) { setEnd(null); setDone(true); beep(); } };
    tick(); const iv = setInterval(tick, 250); return () => clearInterval(iv);
  }, [end]);
  return {
    total, left, done, running: end != null,
    set: (s: number) => { setEnd(null); setTotal(s); setLeft(s); setDone(false); },
    start: () => { if (left > 0) { setDone(false); setEnd(Date.now() + left * 1000); } },
    pause: () => setEnd(null),
    reset: () => { setEnd(null); setLeft(total); setDone(false); },
  };
}
export type Timer = ReturnType<typeof useTimer>;

export function TimerBody({ t }: { t: Timer }) {
  return (
    <div className="space-y-3 text-center">
      <div role="timer" aria-label="Қалған уақыт" className={`font-mono text-6xl font-black ${t.done ? 'animate-pulse text-danger motion-reduce:animate-none' : 'text-accent'}`}>{fmt(t.left)}</div>
      {t.done && <p role="status" className="font-semibold text-danger">Уақыт бітті!</p>}
      <div className="flex justify-center gap-2">
        {t.running ? <Button variant="secondary" onClick={t.pause}><Pause size={18} aria-hidden="true" />Тоқтату</Button> : <Button onClick={t.start} disabled={t.left === 0}><Play size={18} aria-hidden="true" />Бастау</Button>}
        <Button variant="secondary" onClick={t.reset}><RotateCcw size={18} aria-hidden="true" />Қайта</Button>
      </div>
      <div role="group" aria-label="Дайын уақыт" className="flex flex-wrap justify-center gap-2">
        {[1, 3, 5, 10].map(m => <Button key={m} variant={t.total === m * 60 ? 'primary' : 'secondary'} aria-pressed={t.total === m * 60} onClick={() => t.set(m * 60)}>{m} мин</Button>)}
      </div>
      <label className="flex items-center justify-center gap-2 text-sm text-text-secondary">Өз уақытың, мин
        <input type="number" min={1} max={180} className={`${inputCls} !w-24`} value={Math.round(t.total / 60)} onChange={e => { const v = parseInt(e.target.value, 10); if (v >= 1 && v <= 180) t.set(v * 60); }} />
      </label>
    </div>
  );
}

export function RandomBody({ people }: { people: { name: string; online: boolean }[] }) {
  const [only, setOnly] = useState(true), [norep, setNorep] = useState(true), [seen, setSeen] = useState<string[]>([]), [shown, setShown] = useState(''), [final, setFinal] = useState(''), [spin, setSpin] = useState(false);
  const iv = useRef<any>(undefined);
  useEffect(() => () => clearInterval(iv.current), []);
  const base = people.filter(p => !only || p.online).map(p => p.name), pool = norep ? base.filter(n => !seen.includes(n)) : base;
  const pick = () => {
    if (!pool.length || spin) return;
    const win = pool[Math.floor(Math.random() * pool.length)];
    const fin = () => { setShown(win); setFinal(win); setSeen(s => [...s, win]); setSpin(false); };
    if (pool.length === 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return fin();
    setSpin(true); let n = 0;
    iv.current = setInterval(() => { setShown(pool[Math.floor(Math.random() * pool.length)]); if (++n >= 14) { clearInterval(iv.current); fin(); } }, 80);
  };
  const why = !people.length ? 'Әзірге қатысушы жоқ.' : !pool.length ? (norep && base.length ? 'Бәрі таңдалды — «Қайта бастау» басыңыз.' : 'Онлайн оқушы жоқ — «Тек онлайн» белгісін алыңыз.') : '';
  const chk = 'flex min-h-[44px] items-center gap-2 text-sm';
  return (
    <div className="space-y-3">
      <div aria-hidden="true" className={`flex min-h-[96px] items-center justify-center break-words rounded-xl bg-surface-2 p-4 text-center text-3xl font-black ${spin ? 'text-text-secondary' : 'text-accent'}`}>{shown || '—'}</div>
      <p role="status" className="sr-only">{final && !spin ? `Таңдалды: ${final}` : ''}</p>
      {why && <p className="text-sm text-text-secondary">{why}</p>}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={pick} disabled={!pool.length || spin}><Dice5 size={18} aria-hidden="true" />Таңдау</Button>
        <Button variant="secondary" onClick={() => { setSeen([]); setShown(''); setFinal(''); }}><RotateCcw size={18} aria-hidden="true" />Қайта бастау</Button>
      </div>
      <label className={chk}><input type="checkbox" className="h-5 w-5" checked={only} onChange={e => setOnly(e.target.checked)} />Тек онлайн оқушылар</label>
      <label className={chk}><input type="checkbox" className="h-5 w-5" checked={norep} onChange={e => setNorep(e.target.checked)} />Қайталамау{norep && ` (қалды: ${pool.length})`}</label>
    </div>
  );
}

const BASES = [
  { k: 'dec', n: 10, p: '', l: 'Ондық (10)', re: /^\d+$/ }, { k: 'bin', n: 2, p: '0b', l: 'Екілік (2)', re: /^[01]+$/ },
  { k: 'oct', n: 8, p: '0o', l: 'Сегіздік (8)', re: /^[0-7]+$/ }, { k: 'hex', n: 16, p: '0x', l: 'Он алтылық (16)', re: /^[0-9a-f]+$/i },
];
const EMPTY: Record<string, string> = { dec: '', bin: '', oct: '', hex: '' };

export function ConvBody() {
  const [raw, setRaw] = useState(EMPTY), [bad, setBad] = useState('');
  const edit = (b: typeof BASES[number], s: string) => {
    s = s.trim();
    if (!s) { setRaw(EMPTY); setBad(''); return; }
    if (!b.re.test(s) || s.length > 40) { setRaw(r => ({ ...r, [b.k]: s })); setBad(b.k); return; }
    const v = BigInt(b.p + s);
    setRaw({ dec: v.toString(10), bin: v.toString(2), oct: v.toString(8), hex: v.toString(16).toUpperCase(), [b.k]: s }); setBad('');
  };
  const v = !bad && raw.dec ? BigInt(raw.dec) : null;
  return (
    <div className="space-y-3">
      {BASES.map(b => (
        <label key={b.k} className="block text-sm font-medium text-text-secondary">{b.l}
          <input className={`${inputCls} mt-1 font-mono text-lg`} value={raw[b.k]} spellCheck={false} autoComplete="off" aria-invalid={bad === b.k || undefined} aria-describedby={bad === b.k ? 'conv-err' : undefined} onChange={e => edit(b, e.target.value)} />
        </label>
      ))}
      {bad && <p id="conv-err" role="alert" className="text-sm text-danger">Бұл санау жүйесінде мұндай таңба болмайды (немесе сан тым ұзын).</p>}
      {v != null && <p className="text-sm text-text-secondary">Биттер: {raw.bin.length}{v >= 32n && v <= 126n && <> · ASCII таңбасы: <b className="font-mono text-text">{String.fromCharCode(Number(v))}</b></>}</p>}
      <p className="text-xs text-text-muted">Тек теріс емес бүтін сандар.</p>
    </div>
  );
}
