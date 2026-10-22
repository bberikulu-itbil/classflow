import React, { useEffect, useRef, useState } from 'react';
import { norm, runPy, sha256 } from '../utils/pyodide';
import { Button } from '../ui';
import type { ActivityView } from './types';

interface Row { ok: boolean; label: string; hidden: boolean; input: string; want: string | null; got: string }

export interface IdeProps {
  activity: ActivityView; initial: string; readOnly?: boolean; canSubmit: boolean;
  onEdit?: (code: string, pasted: number, typed: number) => void;
  onSubmit: (code: string, passed: number | null, total: number | null) => Promise<void>;
}

export function HomeworkIDE({ activity, initial, readOnly, canSubmit, onEdit, onSubmit }: IdeProps) {
  const [code, setCode] = useState(initial);
  const [stdin, setStdin] = useState('');
  const [cons, setCons] = useState('▶ Нәтиже осында');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [hints, setHints] = useState(0);
  const [tab, setTab] = useState<'task' | 'code' | 'out'>('code');
  const pendingPaste = useRef(0);
  const checks = activity.checks;
  const hs = activity.content.hints || [];

  useEffect(() => { setCode(initial); }, [initial]);

  const edit = (next: string) => {
    const inserted = next.length - code.length, p = Math.min(pendingPaste.current, Math.max(0, inserted));
    pendingPaste.current = 0;
    setCode(next);
    onEdit?.(next, p, Math.max(0, inserted - p));
  };

  const run = async () => {
    setBusy(true); setTab('out'); setCons('⏳ Орындалуда (алғашқыда Python жүктеледі, 10-20 секунд)...');
    const r = await runPy(code, stdin.replace(/\\n/g, '\n'));
    setCons(r.out || '(шығыс жоқ)'); setBusy(false);
  };

  const check = async (): Promise<{ passed: number; total: number } | null> => {
    if (!checks.length) { setRows(null); setSummary('Бұл тапсырмада автотест жоқ, мұғалім өзі бағалайды.'); return null; }
    setBusy(true); setTab('out'); setSummary('⏳ Тексерілуде...'); setRows(null);
    const out: Row[] = []; let passed = 0;
    for (const c of checks) {
      const r = await runPy(code, c.input);
      const ok = r.ok && (await sha256(c.s + norm(r.out))) === c.h;
      if (ok) passed++;
      out.push({ ok, label: c.label || (c.hidden ? 'Жасырын тест' : 'Тест'), hidden: c.hidden, input: c.input, want: c.out, got: norm(r.out).slice(0, 300) });
    }
    setRows(out); setSummary(passed === checks.length ? `🎉 Барлық тест өтті (${passed}/${checks.length})` : `${passed}/${checks.length} тест өтті`);
    setBusy(false);
    return { passed, total: checks.length };
  };

  const send = async () => {
    const r = await check();
    if (activity.require_pass && (!r || r.passed < r.total)) { setSummary('Тапсыру үшін барлық тест өтуі керек.'); return; }
    setBusy(true);
    try { await onSubmit(code, r ? r.passed : null, r ? r.total : null); } catch (e) { setSummary((e as Error).message); } finally { setBusy(false); }
  };

  const show = (t: typeof tab) => (tab === t ? 'flex' : 'hidden') + ' md:flex';
  const tabBtn = (t: typeof tab, label: string) => (
    <button role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
      className={`flex-1 min-h-[44px] text-sm font-semibold rounded-md cursor-pointer ${tab === t ? 'bg-accent text-on-accent' : 'bg-surface-2 text-text'}`}>{label}</button>
  );

  return (
    <div>
      <div role="tablist" className="flex gap-1 mb-2 md:hidden">{tabBtn('task', 'Тапсырма')}{tabBtn('code', 'Код')}{tabBtn('out', 'Нәтиже')}</div>
      <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] border border-border rounded-lg overflow-hidden bg-surface">
        <section aria-label="Тапсырма" className={`${show('task')} flex-col gap-3 p-4`}>
          <h2 className="text-xl font-semibold break-words">{activity.title}</h2>
          {activity.content.prompt && <p className="whitespace-pre-wrap break-words">{activity.content.prompt}</p>}
          {checks.some(c => !c.hidden && c.out != null) && (
            <div className="text-sm space-y-1">
              <div className="text-text-muted">Мысал:</div>
              {checks.filter(c => !c.hidden && c.out != null).slice(0, 2).map((c, i) => (
                <pre key={i} className="p-2 rounded-md bg-surface-2 text-xs font-mono whitespace-pre-wrap">{`Кіріс:\n${c.input || '—'}\nШығыс:\n${c.out}`}</pre>
              ))}
            </div>
          )}
          {hs.length > 0 && (
            <div className="space-y-2">
              <Button variant="secondary" disabled={hints >= hs.length} onClick={() => setHints(hints + 1)}>💡 Кеңес ({hints}/{hs.length})</Button>
              {hs.slice(0, hints).map((h, i) => <div key={i} className="p-2 rounded-md bg-info-soft text-accent text-sm">💡 {i + 1}. {h}</div>)}
            </div>
          )}
        </section>
        <section className="flex flex-col min-w-0 md:border-l border-border">
          <div className="flex gap-2 p-2 flex-wrap items-center bg-code-gutter-bg">
            <button disabled={busy} onClick={run} className="min-h-[36px] px-3 rounded-md border border-code-gutter-text text-code-text text-sm font-semibold cursor-pointer disabled:opacity-50">Іске қосу</button>
            <button disabled={busy} onClick={check} className="min-h-[36px] px-3 rounded-md border border-code-gutter-text text-code-text text-sm font-semibold cursor-pointer disabled:opacity-50">Тексеру</button>
            {!readOnly && <button disabled={busy || !canSubmit} onClick={send} className="min-h-[36px] px-3 rounded-md bg-accent text-on-accent text-sm font-semibold cursor-pointer disabled:opacity-50" title={canSubmit ? '' : 'Тапсыру мүмкін емес'}>Тексеру және тапсыру</button>}
            <span className="text-xs text-code-gutter-text ml-auto">main.py</span>
          </div>
          <div className={`${show('code')} flex-col md:flex`}>
            <label htmlFor="hw-code" className="sr-only">Python коды</label>
            <textarea id="hw-code" value={code} readOnly={readOnly} spellCheck={false} wrap="off"
              onPaste={e => { pendingPaste.current = e.clipboardData.getData('text').length; }}
              onChange={e => edit(e.target.value)}
              className="w-full min-h-[16rem] bg-code-bg text-code-text font-mono text-sm leading-6 p-3 resize-y" />
            <label htmlFor="hw-stdin" className="sr-only">stdin</label>
            <input id="hw-stdin" value={stdin} onChange={e => setStdin(e.target.value)} placeholder="stdin (input() үшін, жолдарды \n-мен бөл)"
              className="w-full px-3 py-2 bg-code-gutter-bg text-code-text text-xs font-mono placeholder:text-code-gutter-text" />
          </div>
          <div className={`${show('out')} flex-col md:flex`} aria-live="polite">
            <pre className="p-3 bg-console-bg text-console-text text-xs font-mono whitespace-pre-wrap min-h-[5rem] max-h-48 overflow-auto">{cons}</pre>
            <div className="p-2 space-y-1 text-sm">
              {summary && <div className="font-semibold">{summary}</div>}
              {rows?.map((r, i) => (
                <div key={i} className={`p-2 rounded-sm ${r.ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                  {r.ok ? '✓ ' : '✗ '}{r.label}: {r.ok ? 'өтті' : 'өтпеді'}
                  {!r.ok && !r.hidden && <pre className="text-xs mt-1 whitespace-pre-wrap font-mono">{`Кіріс: ${r.input || '—'}\nКүтілген: ${r.want}\nСенікі: ${r.got}`}</pre>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
