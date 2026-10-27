import React, { useState, useEffect } from 'react';
import { runPy, norm, sha256 } from '../utils/pyodide';

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

export function lbTable(rows: any[]) {
  return (
    <table className="w-full text-lg">
      <tbody>
        {(rows || []).slice(0, 8).map((r, i) => (
          <tr key={i} className="border-b border-slate-800">
            <td className="py-1 w-10 text-slate-400">{i + 1}</td>
            <td>{r.full_name}</td>
            <td className="text-slate-400 text-sm">{r.group_no ? 'Топ ' + r.group_no : ''}</td>
            <td className="text-right font-black text-amber-400">{r.points}</td>
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

export function renderSlide(s: any, ctx: any = {}) {
  const big = ctx.mode === 'board';
  const wrap = (...k: any[]) => <div className="w-full max-w-5xl mx-auto p-4">{k}</div>;

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
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        <ul className={`${big ? 'text-3xl space-y-4' : 'text-xl space-y-2'} list-disc pl-6 text-slate-200`}>
          {(s.bullets || []).map((b: string, i: number) => (
            <li key={i}>{b}</li>
          ))}
        </ul>,
        codeBlock(s, big),
        imgBlock(s, big)
      );
    case 'quiz':
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{s.prompt}</p>,
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
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{s.prompt}</p>,
        codeBlock(s, big),
        imgBlock(s, big)
      );
    case 'code':
      return wrap(
        s.title && <h2 className={`${big ? 'text-5xl' : 'text-3xl'} font-black mb-5 text-white`}>{s.title}</h2>,
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{s.prompt}</p>,
        imgBlock(s, big),
        s.starter && <pre className={`p-3 bg-[#0F172A] rounded-xl text-[#E2E8F5] font-mono ${big ? 'text-xl' : 'text-sm'}`}>{s.starter}</pre>
      );
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
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{s.prompt}</p>,
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
        s.prompt && <p className={`${big ? 'text-3xl' : 'text-xl'} mb-4 whitespace-pre-wrap text-slate-200`}>{s.prompt}</p>,
        imgBlock(s, big)
      );
  }
}
