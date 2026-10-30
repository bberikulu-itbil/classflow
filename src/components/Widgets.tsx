import { rich } from '../lessons/spoil';
import React, { useState, useEffect } from 'react';
import { runPy, norm, sha256 } from '../utils/pyodide';
import { CanvasSlide } from '../lessons/canvas';

export const BTN = 'px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition cursor-pointer';
export const BTN_P = 'px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition cursor-pointer';
export const BTN_G = 'px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold transition disabled:opacity-50 cursor-pointer';
export const INP = 'w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-sm outline-none focus:border-blue-500 text-slate-100';

export const shuffle = (a: any[]) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const spaced = (c: any) => String(c || '').replace(/(.{3})(?=.)/g, '$1 ');

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function clock(task: any) {
  const [text, setText] = useState('');
  const [color, setColor] = useState('');
  useEffect(() => {
    if (!task || task.status !== 'open' || !task.opened_at) return;
    const t0 = new Date(task.opened_at).getTime(), lim = task.time_limit;
    const tick = () => {
      const sec = Math.max(0, Math.floor((Date.now() - t0) / 1000));
      setText(lim ? fmt(Math.max(0, lim - sec)) : fmt(sec));
      setColor(lim && lim - sec <= 10 ? '#B42318' : '');
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [task]);

  if (!task || task.status !== 'open' || !task.opened_at) return <span className="font-mono" />;
  return <span className="font-mono" style={{ color }}>{text}</span>;
}

export function lbTable(rows: any[], hide = false) {
  return (
    <table className="w-full text-lg">
      <tbody>
        {(rows || []).slice(0, 8).map((r, i) => (
          <tr key={i} className="border-b border-slate-800">
            <td className="py-1 w-10 text-slate-400">{i + 1}</td>
            <td>{r.full_name}</td>
            <td className="text-slate-400 text-sm">{r.group_no ? 'Топ ' + r.group_no : ''}</td>
            <td className="text-right font-black text-amber-400">{hide ? '•••' : r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Flashcards({ cards }: { cards: Array<{ front: string; back: string }> }) {
  const [flipped, setFlipped] = useState<{ [idx: number]: boolean }>({});
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {(cards || []).map((c, i) => {
        const isBack = flipped[i];
        return (
          <button
            key={i}
            onClick={() => setFlipped(p => ({ ...p, [i]: !p[i] }))}
            className={`min-h-[7rem] p-4 rounded-2xl bg-slate-800 border-2 border-slate-600 text-lg font-bold hover:border-blue-500 transition text-left cursor-pointer ${
              isBack ? 'bg-emerald-700' : ''
            }`}
          >
            {isBack ? c.back : c.front}
          </button>
        );
      })}
    </div>
  );
}

export function Matching({ pairs }: { pairs: Array<{ l: string; r: string }> }) {
  const [rights] = useState(() => shuffle((pairs || []).map((p, i) => ({ t: p.r, i }))));
  const [selL, setSelL] = useState<number | null>(null);
  const [donePairs, setDonePairs] = useState<{ [i: number]: boolean }>({});
  const [errorRight, setErrorRight] = useState<number | null>(null);

  const doneCount = Object.keys(donePairs).length;

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {(pairs || []).map((p, i) => {
            const isDone = donePairs[i];
            const isSel = selL === i;
            return (
              <button
                key={i}
                disabled={isDone}
                onClick={() => setSelL(i)}
                className={`w-full text-left p-3 rounded-xl border-2 font-semibold cursor-pointer ${
                  isDone
                    ? 'bg-emerald-700 border-emerald-600 opacity-80'
                    : isSel
                    ? 'bg-slate-800 border-blue-500'
                    : 'bg-slate-800 border-slate-600'
                }`}
              >
                {p.l}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {rights.map((r, ri) => {
            const isDone = donePairs[r.i];
            const isErr = errorRight === ri;
            return (
              <button
                key={ri}
                disabled={isDone}
                onClick={() => {
                  if (selL == null) return;
                  if (selL === r.i) {
                    setDonePairs(p => ({ ...p, [r.i]: true }));
                    setSelL(null);
                  } else {
                    setErrorRight(ri);
                    setTimeout(() => setErrorRight(null), 500);
                  }
                }}
                className={`w-full text-left p-3 rounded-xl border-2 font-semibold cursor-pointer ${
                  isDone
                    ? 'bg-emerald-700 border-emerald-600 opacity-80'
                    : isErr
                    ? 'bg-slate-800 border-red-500'
                    : 'bg-slate-800 border-slate-600'
                }`}
              >
                {r.t}
              </button>
            );
          })}
        </div>
      </div>
      <div className="text-sm text-slate-400 mt-3">
        {doneCount} / {pairs?.length || 0}
      </div>
    </div>
  );
}

export function LogicGate({ gate = 'AND' }: { gate?: string }) {
  const [g, setG] = useState(gate);
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);

  const f = (gateType: string, valA: number, valB: number) => {
    switch (gateType) {
      case 'AND': return valA & valB;
      case 'OR': return valA | valB;
      case 'XOR': return valA ^ valB;
      case 'NOT': return valA ? 0 : 1;
      default: return 0;
    }
  };

  const out = f(g, a, b);
  const rows = g === 'NOT' ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {['AND', 'OR', 'XOR', 'NOT'].map(x => (
          <button
            key={x}
            onClick={() => setG(x)}
            className={x === g ? BTN_P : BTN}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-6 text-xl font-mono">
        <button onClick={() => setA(a ? 0 : 1)} className={a ? BTN_G : BTN}>
          A={a}
        </button>
        {g !== 'NOT' && (
          <button onClick={() => setB(b ? 0 : 1)} className={b ? BTN_G : BTN}>
            B={b}
          </button>
        )}
        <div className="px-4 py-2 rounded-xl bg-indigo-900 border border-indigo-500 font-black">
          {g}
        </div>
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
            out ? 'bg-amber-400 text-black' : 'bg-slate-700 text-white'
          }`}
        >
          {out}
        </div>
      </div>
      <table className="text-center font-mono text-sm">
        <tbody>
          {rows.map((r, idx) => {
            const hit = r[0] === a && (g === 'NOT' || r[1] === b);
            return (
              <tr key={idx} className={hit ? 'bg-emerald-900' : ''}>
                {r.map((v, vi) => (
                  <td key={vi} className="px-4 py-1">{v}</td>
                ))}
                <td className="px-4 py-1 font-bold text-emerald-400">= {f(g, r[0], r[1] ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CodeIDE({ s, o = {} }: { s: any; o?: any }) {
  const [code, setCode] = useState(s.starter || '');
  const [stdin, setStdin] = useState('');
  const [cons, setCons] = useState('▶ Нәтиже осында');
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [hintN, setHintN] = useState(0);
  const [hintsShown, setHintsShown] = useState<string[]>([]);

  const checks = s.checks || s.tests || [];

  const handleRun = async () => {
    setBusy(true);
    setCons('⏳ Орындалуда (алғашқыда Python жүктеледі)...');
    const r = await runPy(code, stdin.replace(/\\n/g, '\n'));
    setCons(r.out || '(шығыс жоқ)');
    setBusy(false);
  };

  const handleCheck = async () => {
    if (!checks.length) {
      setRes(<p className="text-slate-400">Бұл тапсырмада автотест жоқ — мұғалім қолмен бағалайды.</p>);
      return null;
    }
    setBusy(true);
    setRes(<p className="text-slate-400">⏳ Тексерілуде...</p>);
    const rows = [];
    let passed = 0;
    let lastOut = '';
    for (const c of checks) {
      const r = await runPy(code, c.input);
      lastOut = r.out;
      const ok = r.ok && (await sha256(norm(r.out))) === c.h;
      if (ok) passed++;
      rows.push(
        <div
          key={Math.random()}
          className={`p-2 rounded-lg ${ok ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}
        >
          {ok ? '✓ ' : '✗ '}
          {c.label || (c.hidden ? 'Жасырын тест' : 'Тест')}
          {!ok && !c.hidden && (
            <pre className="text-xs mt-1 whitespace-pre-wrap">
              {`Кіріс: ${c.input || '—'}\nКүтілген: ${c.out}\nСенікі: ${norm(r.out).slice(0, 300)}`}
            </pre>
          )}
        </div>
      );
    }
    setRes(
      <div>
        <div className={`font-bold ${passed === checks.length ? 'text-emerald-400' : 'text-amber-400'}`}>
          {passed === checks.length ? `🎉 Барлық тест өтті (${passed}/${checks.length})` : `${passed}/${checks.length} тест өтті`}
        </div>
        {rows}
      </div>
    );
    setBusy(false);
    return { passed, total: checks.length, code, output: lastOut };
  };

  const handleSubmit = async () => {
    let meta: { passed: number | null; total: number } = { passed: null, total: checks.length };
    if (checks.length) {
      const r = await handleCheck();
      if (r) meta = { passed: r.passed, total: r.total };
    }
    if (o.onSubmit) o.onSubmit(code, meta);
  };

  return (
    <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] w-full border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 min-h-[28rem]">
      <div className="p-4 space-y-3 overflow-auto">
        <h2 className="text-2xl font-black">{s.title || ''}</h2>
        {s.prompt && <p className="whitespace-pre-wrap">{s.prompt}</p>}
        {checks.filter((c: any) => !c.hidden && c.out != null).length > 0 && (
          <div className="text-sm">
            <div className="text-slate-400 mb-1">Мысал:</div>
            {checks
              .filter((c: any) => !c.hidden && c.out != null)
              .slice(0, 2)
              .map((c: any, i: number) => (
                <pre key={i} className="p-2 mb-1 rounded-lg bg-slate-800 text-xs">
                  {`Кіріс:\n${c.input || '—'}\nШығыс:\n${c.out}`}
                </pre>
              ))}
          </div>
        )}
        {(o.terms || []).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-bold">Терминдер</div>
            <div className="flex flex-wrap gap-2">
              {(o.terms || []).map((t: any, i: number) => (
                <button
                  key={i}
                  className="text-sm bg-indigo-950 text-indigo-300 px-2.5 py-1.5 rounded-lg text-left cursor-pointer hover:bg-indigo-900"
                  title="Сөздігіме қосу"
                  onClick={() => o.onTerm && o.onTerm(t)}
                >
                  {t.term + (t.definition ? ' — ' + t.definition : '')}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-400">Терминді басып сөздігіңе қос</div>
          </div>
        )}
        {(s.hints || []).length > 0 && (
          <div>
            <button
              disabled={hintN >= s.hints.length}
              onClick={() => {
                if (hintN < s.hints.length) {
                  setHintsShown(p => [...p, s.hints[hintN]]);
                  setHintN(hintN + 1);
                }
              }}
              className={BTN}
            >
              💡 Кеңес
            </button>
            <div className="space-y-2 mt-2">
              {hintsShown.map((hTxt, hi) => (
                <div key={hi} className="p-2 rounded-lg bg-indigo-950 text-indigo-300 text-sm">
                  💡 {hi + 1}. {hTxt}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col border-l border-slate-800 min-w-0">
        <div className="flex gap-2 p-2 bg-[#111C33] flex-wrap items-center">
          <button disabled={busy} onClick={handleRun} className="px-3 py-2 rounded-xl border border-[#33415F] text-[#E2E8F5] text-sm font-semibold hover:bg-[#1E2A44] cursor-pointer disabled:opacity-50">
            Іске қосу
          </button>
          <button disabled={busy} onClick={handleCheck} className="px-3 py-2 rounded-xl bg-[#1E2A44] text-white text-sm font-semibold hover:bg-[#2A3858] cursor-pointer disabled:opacity-50">
            Тексеру
          </button>
          <button disabled={busy || !o.canSubmit} onClick={handleSubmit} className={`${BTN_P} disabled:opacity-50`}>
            Тексеру және тапсыру
          </button>
          <span className="text-xs text-slate-500 self-center">main.py</span>
        </div>
        <div className="flex flex-1 min-h-[16rem] relative">
          <textarea
            value={code}
            onChange={e => {
              setCode(e.target.value);
              if (o.onPaste && e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'insertFromPaste') {
                o.onPaste();
              }
            }}
            className="flex-1 min-h-[16rem] bg-[#0F172A] text-[#E2E8F5] font-mono text-sm p-3 outline-none resize-none leading-6 w-full"
            spellCheck="false"
            wrap="off"
          />
        </div>
        <input
          value={stdin}
          onChange={e => setStdin(e.target.value)}
          className="w-full px-2 py-1 bg-[#111C33] text-[#E2E8F5] text-xs font-mono outline-none border-t border-slate-800"
          placeholder="stdin (input() үшін, жолдарды \n-мен бөл)"
        />
        <pre className="p-3 bg-black text-xs text-[#E2E8F5] whitespace-pre-wrap min-h-[5rem] max-h-48 overflow-auto">{cons}</pre>
        <div className="p-2 bg-slate-900 border-t border-slate-800">{res}</div>
      </div>
    </div>
  );
}

/** Optional `code` (+ `lang`) on content, quiz and task slides: a monospace block for source code shown, not run. */
const codeBlock = (s: any, big: boolean) => s.code
  ? <figure key="code" className="my-4">
      {s.lang && <figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{s.lang}</figcaption>}
      <pre className={`p-3 bg-[#0F172A] rounded-xl text-[#E2E8F5] font-mono overflow-x-auto whitespace-pre ${big ? 'text-2xl' : 'text-base'}`}>{s.code}</pre>
    </figure>
  : null;

/** Optional `img` (https URL, data:image, or a picture shipped with the site under lec/) with `alt` on title, content, quiz, task, code and plain slides. Anything else is ignored. */
const imgBlock = (s: any, big: boolean) => typeof s.img === 'string' && /^(https:\/\/|data:image\/|lec\/[\w-]+\.(svg|png|webp|jpe?g)$)/.test(s.img)
  ? <figure key="img" className="my-4 flex justify-center">
      <img src={s.img} alt={s.alt || ''} className={`${big ? 'max-h-[55vh]' : 'max-h-[45vh]'} max-w-full rounded-xl bg-white object-contain`} />
    </figure>
  : null;

const tableBlock = (table: any, big: boolean) => Array.isArray(table?.headers) && Array.isArray(table?.rows)
  ? <div className="my-4 overflow-x-auto rounded-xl border border-slate-600 bg-slate-950/40">
      <table className={`w-full border-collapse ${big ? 'text-2xl' : 'text-base'}`}>
        <thead className="bg-blue-950/70 text-blue-100">
          <tr>{table.headers.map((h: any, i: number) => <th key={i} className="border-b border-slate-600 px-3 py-2 text-left font-bold">{String(h)}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row: any[], i: number) => <tr key={i} className="border-b border-slate-700 last:border-b-0">
            {(Array.isArray(row) ? row : [row]).map((cell: any, j: number) => <td key={j} className="px-3 py-2 font-mono text-slate-200">{String(cell)}</td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
  : null;

const presentationBlock = (s: any, big: boolean) => {
  const html = typeof s.html === 'string' ? s.html : '';
  const css = typeof s.css === 'string' ? s.css : '';
  const sourceUrl = typeof s.sourceUrl === 'string' ? s.sourceUrl : '';
  const remoteSource = /^https?:\/\//i.test(sourceUrl);
  const viewerUrl = remoteSource && s.sourceFormat === 'pptx'
    ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(sourceUrl)}`
    : sourceUrl;
  const openSource = sourceUrl && (
    <div className="flex flex-wrap items-center gap-2">
      <a href={viewerUrl} target="_blank" rel="noreferrer" className={BTN_P}>
        {s.sourceFormat === 'pptx' && remoteSource ? 'PowerPoint Online-да ашу' : 'Презентацияны ашу'}
      </a>
      <a href={sourceUrl} target="_blank" rel="noreferrer" className={BTN}>
        Бастапқы файл
      </a>
    </div>
  );
  if (sourceUrl && !html && typeof s.img !== 'string') {
    return <div key="presentation-source" className="my-2 overflow-hidden rounded-xl border border-slate-600 bg-slate-900 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-bold">Түпнұсқа презентация</p>
          <p className="mt-1 text-sm text-slate-300">Файл слайдтарға бөлінбеді және бастапқы күйінде сақталды: {s.sourceName || 'презентация'}</p>
        </div>
        {openSource}
      </div>
      {remoteSource && <iframe src={viewerUrl} title={s.sourceName || 'Түпнұсқа презентация'} className={`w-full border-t border-slate-700 bg-white ${big ? 'min-h-[72vh]' : 'min-h-[42rem]'}`} />}
    </div>;
  }
  if (!html && typeof s.img === 'string') {
    return <div key="presentation-image-wrap">
      {openSource && <div className="mb-2 flex justify-end">{openSource}</div>}
      <figure className="my-2 flex justify-center overflow-hidden rounded-xl bg-white"><img src={s.img} alt={s.alt || ''} className={`${big ? 'max-h-[78vh]' : 'max-h-[62vh]'} max-w-full object-contain`} /></figure>
    </div>;
  }
  if (!html) return <p className="rounded-xl border border-dashed border-slate-600 p-6 text-slate-400">Бұл презентация слайды әлі импортталмаған.</p>;
  return <figure key="presentation" className="my-2 overflow-auto rounded-xl bg-white text-black">
    {openSource && <div className="flex justify-end bg-slate-900 p-2">{openSource}</div>}
    <style dangerouslySetInnerHTML={{ __html: css }} />
    <div className="min-w-[640px]" dangerouslySetInnerHTML={{ __html: html }} />
  </figure>;
};

/** Visual language for the standard ACMP solution sections. The content stays
 * accessible text, while the card, icon and colour make the thinking path
 * visible at a glance. */
const solutionVisual = (h: unknown, hidden = false) => {
  const label = String(h || '').toLowerCase();
  if (hidden || /шешімі|решение|код/.test(label)) return { icon: '💻', bg: 'bg-slate-950/60', border: 'border-slate-600', iconBg: 'bg-slate-700', accent: 'text-slate-200' };
  if (/берілуі|условие|шарты/.test(label)) return { icon: '📌', bg: 'bg-blue-950/35', border: 'border-blue-500/50', iconBg: 'bg-blue-600/30', accent: 'text-blue-300' };
  if (/түсіндірілуі|объяснение|талдау/.test(label)) return { icon: '💡', bg: 'bg-amber-950/30', border: 'border-amber-500/50', iconBg: 'bg-amber-500/20', accent: 'text-amber-300' };
  if (/алгоритмі|алгоритм|қадам/.test(label)) return { icon: '⚙️', bg: 'bg-emerald-950/30', border: 'border-emerald-500/50', iconBg: 'bg-emerald-500/20', accent: 'text-emerald-300' };
  if (/деректер|структура/.test(label)) return { icon: '🧩', bg: 'bg-violet-950/30', border: 'border-violet-500/50', iconBg: 'bg-violet-500/20', accent: 'text-violet-300' };
  if (/псевдокод/.test(label)) return { icon: '🗺️', bg: 'bg-cyan-950/30', border: 'border-cyan-500/50', iconBg: 'bg-cyan-500/20', accent: 'text-cyan-300' };
  return { icon: '✨', bg: 'bg-slate-800/60', border: 'border-slate-600', iconBg: 'bg-slate-700', accent: 'text-blue-300' };
};

const bulletIcon = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

const visualBullets = (items: any[], big: boolean, inner: (t: string) => React.ReactNode, tone = 'blue') => {
  const toneClass = tone === 'green' ? 'border-emerald-500/30 bg-emerald-950/20' : tone === 'amber' ? 'border-amber-500/30 bg-amber-950/20' : 'border-slate-600 bg-slate-800/70';
  return <div className={`grid gap-2 ${items.length > 3 ? 'md:grid-cols-2' : ''}`}>
    {(items || []).map((b: string, i: number) => (
      <div key={i} className={`flex gap-3 rounded-xl border p-3 ${toneClass}`}>
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-lg font-black text-amber-300">{bulletIcon[i] || '•'}</span>
        <p className={`${big ? 'text-2xl' : 'text-base'} whitespace-pre-wrap leading-relaxed text-slate-200`}>{inner(b)}</p>
      </div>
    ))}
  </div>;
};

export function renderSlide(s: any, ctx: any = {}) {
  const sp = ctx.sp, R = (t: string) => rich(t, sp);
  const big = ctx.mode === 'board';
  const wrap = (...k: any[]) => <div className="cf-slide w-full max-w-5xl mx-auto p-4">{k}</div>;

  if (s.pageType === 'scroll') {
    return wrap(
      <article className="max-w-3xl mx-auto overflow-hidden rounded-2xl bg-slate-900 border border-slate-700">
        <header className="bg-emerald-950/60 px-6 py-8 md:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">🧠 Оқу картасы</p>
          <h1 className={`${big ? 'text-6xl' : 'text-4xl'} mt-3 font-black text-white`}>{s.title || 'Ұзын бет'}</h1>
          {s.subtitle && <p className="mt-3 text-lg text-slate-300">{s.subtitle}</p>}
        </header>
        <div className="space-y-8 px-6 py-8 md:px-10 md:py-10">
          {s.type === 'content' && (
            <section>
              {visualBullets(s.bullets || [], big, R, 'green')}
            </section>
          )}
          {s.prompt && <section className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4"><div className="mb-2 text-2xl">💬</div><p className={`${big ? 'text-3xl' : 'text-xl'} whitespace-pre-wrap text-slate-200`}>{s.prompt}</p></section>}
          {s.starter && <section><h2 className="mb-3 text-lg font-bold text-white">💻 Код мысалы</h2><pre className={`${big ? 'text-xl' : 'text-sm'} overflow-auto rounded-xl bg-[#0F172A] p-4 text-[#E2E8F5] font-mono`}>{s.starter}</pre></section>}
          {s.notes && <section className="rounded-xl border border-amber-500/40 bg-amber-950/50 p-4 text-amber-200"><b>⚠️ Ескертпе:</b> {s.notes}</section>}
          {!s.bullets?.length && !s.prompt && !s.starter && !s.notes && <p className="text-slate-400">Бұл бетке мазмұн қосылмаған.</p>}
        </div>
      </article>
    );
  }

  switch (s.type) {
    case 'title':
      return wrap(
        <div className="text-center py-16">
          <h1 className={`${big ? 'text-7xl' : 'text-5xl'} font-black text-white`}>{s.title}</h1>
          <p className="text-2xl text-blue-400 mt-4">{s.subtitle}</p>
          {imgBlock(s, big)}
        </div>
      );
    case 'content':
      return wrap(
        s.title && <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600/25 text-2xl">📚</span><h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black text-white`}>{s.title}</h2></div>,
        visualBullets(s.bullets || [], big, R),
        codeBlock(s, big),
        imgBlock(s, big)
      );
    case 'quiz':
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{R(s.prompt)}</p>,
        codeBlock(s, big),
        imgBlock(s, big),
        <div className="grid gap-2">
          {(s.options || []).map((o: string, i: number) => (
            <div key={i} className={`p-3 rounded-xl bg-slate-800 border border-slate-600 ${big ? 'text-2xl' : 'text-lg'} text-white`}>
              {String.fromCharCode(65 + i)}. {o}
            </div>
          ))}
        </div>
      );
    case 'task':
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{R(s.prompt)}</p>,
        codeBlock(s, big),
        imgBlock(s, big)
      );
    case 'code':
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{R(s.prompt)}</p>,
        imgBlock(s, big),
        s.starter && <pre className={`p-3 bg-[#0F172A] rounded-xl text-[#E2E8F5] font-mono ${big ? 'text-xl' : 'text-sm'}`}>{s.starter}</pre>
      );
    case 'presentation':
      return wrap(
        <div className="mb-2 flex items-center justify-between gap-2 text-sm text-slate-400"><span>{s.sourceName || 'Импортталған презентация'}</span><span>{s.slideNumber ? `${s.slideNumber}-слайд` : ''}</span></div>,
        presentationBlock(s, big)
      );
    case 'solution':
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-2 text-white`}>{s.title}</h2>,
        ...(s.sections || []).map((sec: any, i: number) => {
          const idx = sec.hide && sp ? sp.n++ : -1, closed = idx >= 0 && !sp.shown.has(idx), inner = sec.hide ? (t: string) => rich(t) : R;
          const visual = solutionVisual(sec.h, !!sec.hide);
          return (
            <section key={i} className={`mt-6 rounded-2xl border p-4 shadow-lg ${sec.variant === 'statement' ? 'border-2 border-blue-500/60 bg-blue-950/30' : `${visual.border} ${visual.bg}`}`}>
              {sec.h && <div className="mb-3 flex items-center gap-3"><span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ${visual.iconBg}`}>{visual.icon}</span><h3 className={`${big ? 'text-3xl' : 'text-xl'} font-bold ${visual.accent}`}>{sec.h}</h3></div>}
              {closed ? (
                <button type="button" onClick={() => sp.show(idx)} aria-label={`${sec.h || ''}: көрсету`} className={`${big ? 'text-2xl' : 'text-lg'} w-full cursor-pointer rounded-xl border border-dashed border-slate-500 bg-slate-800 px-4 py-3 text-left text-slate-200 hover:bg-slate-700`}>Көрсету</button>
              ) : (<>
                {sec.text && <p className={`${big ? 'text-2xl' : 'text-lg'} whitespace-pre-wrap text-slate-200`}>{inner(sec.text)}</p>}
                {Array.isArray(sec.bullets) && visualBullets(sec.bullets, big, inner, /алгоритм|қадам/i.test(String(sec.h || '')) ? 'green' : 'blue')}
                {tableBlock(sec.table, big)}
                {imgBlock(sec, big)}
                {codeBlock({ code: sec.code, lang: sec.lang }, big)}
              </>)}
            </section>
          );
        })
      );
    case 'canvas':
      return <div className="cf-slide w-full max-w-5xl mx-auto p-4"><CanvasSlide s={s} R={R} sp={sp} lang={ctx.lang} /></div>;
    case 'flashcards':
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        <Flashcards cards={s.cards} />
      );
    case 'matching':
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        <Matching pairs={s.pairs} />
      );
    case 'logic':
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{R(s.prompt)}</p>,
        <LogicGate gate={s.gate} />
      );
    case 'leaderboard':
      return wrap(
        s.title ? <h2 className={`${big ? 'text-5xl' : 'text-4xl'} font-black mb-4 text-white`}>{s.title}</h2> : <h2 className="text-4xl font-black mb-4 text-white">🏆 Жарыс кестесі</h2>,
        ctx.lb ? ctx.lb() : null
      );
    default:
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{R(s.prompt)}</p>,
        imgBlock(s, big)
      );
  }
}
