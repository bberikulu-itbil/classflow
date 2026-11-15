import React, { useEffect, useRef, useState } from 'react';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { answerOf, type Row } from './canon';
import { pick, type Lang } from '../lessons/lang';

export interface SqlCfg { setup: string; start?: string; probe?: string; ordered?: boolean; rows?: number }
export interface SqlResult { answer: string; sql: string }

let engine: Promise<SqlJsStatic> | undefined;
const load = () => (engine ??= initSqlJs({ locateFile: () => wasmUrl }));

/** SQL editor of a slide: SQLite in the browser. Every run starts from the slide's own tables (`setup`), so a query can be tried any number of times.
 *  `probe` is a query run after the student's statements (for INSERT / CREATE tasks, which return no table themselves): its result is what is shown and compared. */
export default function SqlBox({ cfg, lang, storageKey, onResult }: { cfg: SqlCfg; lang: Lang; storageKey?: string; onResult?: (r: SqlResult | null) => void }) {
  const saved = () => { try { return storageKey ? localStorage.getItem(storageKey) : null; } catch { return null; } };
  const [sql, setSql] = useState(() => saved() ?? cfg.start ?? '');
  const [out, setOut] = useState<{ columns: string[]; values: Row[] } | null>(null);
  const [err, setErr] = useState('');
  const [tables, setTables] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const SQL = useRef<SqlJsStatic | null>(null);

  const fresh = (): Database => { const db = new SQL.current!.Database(); if (cfg.setup) db.run(cfg.setup); return db; };
  useEffect(() => {
    let alive = true;
    load().then(s => {
      if (!alive) return;
      SQL.current = s;
      const db = fresh();
      const names = (db.exec("select name from sqlite_master where type = 'table' order by rowid")[0]?.values || []).map(r => String(r[0]));
      setTables(names.map(n => `${n} (${(db.exec(`select name from pragma_table_info('${n}')`)[0]?.values || []).map(r => r[0]).join(', ')})`));
      db.close();
      setReady(true);
    }, e => setErr(String(e?.message || e)));
    return () => { alive = false; };
  }, [cfg.setup]);

  const run = () => {
    if (!SQL.current) return;
    try { if (storageKey) localStorage.setItem(storageKey, sql); } catch { /* private window: the query just is not remembered */ }
    const db = fresh();
    try {
      const res = db.exec(sql);
      const shown = cfg.probe ? db.exec(cfg.probe)[0] : res[res.length - 1];
      const table = shown ? { columns: shown.columns, values: shown.values as Row[] } : { columns: [], values: [] };
      setOut(table); setErr('');
      onResult?.({ answer: answerOf(table.values, cfg.ordered), sql });
    } catch (e: any) {
      setOut(null); setErr(String(e?.message || e)); onResult?.(null);
    } finally { db.close(); }
  };

  return (
    <div data-testid="sql-box" className="space-y-2 rounded-2xl border border-border bg-surface p-3 text-text">
      {tables.length > 0 && <p className="text-sm text-text-secondary"><b className="text-text">{pick(lang, 'Кестелер', 'Таблицы', 'Tables')}:</b> <span className="font-mono">{tables.join(' · ')}</span></p>}
      <label className="sr-only" htmlFor={`sql-${storageKey || 'box'}`}>{pick(lang, 'SQL сұранысы', 'SQL-запрос', 'SQL query')}</label>
      <textarea id={`sql-${storageKey || 'box'}`} data-testid="sql-input" value={sql} spellCheck={false} onChange={e => setSql(e.target.value)}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } }}
        className="h-28 w-full resize-y rounded-xl border border-border bg-bg p-3 font-mono text-base leading-snug text-text outline-none focus:border-accent" placeholder="SELECT * FROM ..." />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" data-testid="sql-run" disabled={!ready} onClick={run} className="min-h-[44px] rounded-xl bg-accent px-4 text-sm font-bold text-on-accent cursor-pointer disabled:opacity-50">{ready ? pick(lang, 'Орындау', 'Выполнить', 'Run') : pick(lang, 'Жүктелуде…', 'Загрузка…', 'Loading…')}</button>
        <button type="button" onClick={() => { setSql(cfg.start ?? ''); setOut(null); setErr(''); onResult?.(null); }} className="min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold cursor-pointer hover:bg-surface-2">{pick(lang, 'Бастапқы күйге', 'Сбросить', 'Reset')}</button>
        <span className="text-xs text-text-secondary">Ctrl + Enter{cfg.rows != null ? ` · ${pick(lang, 'күтілетін нәтиже', 'ожидается', 'expected')}: ${cfg.rows} ${pick(lang, 'жол', 'строк', 'rows')}` : ''}</span>
      </div>
      {err && <p role="alert" data-testid="sql-error" className="rounded-xl bg-danger-soft p-3 font-mono text-sm text-danger">{pick(lang, 'Қате', 'Ошибка', 'Error')}: {err}</p>}
      {out && (out.columns.length === 0 ? <p className="text-sm text-text-secondary">{pick(lang, 'Орындалды. Нәтиже кестесі жоқ.', 'Выполнено. Таблицы результата нет.', 'Done. No result table.')}</p> : (
        <div className="overflow-x-auto">
          <table data-testid="sql-result" className="w-full border-collapse text-sm">
            <caption className="pb-1 text-left text-xs text-text-secondary">{cfg.probe ? pick(lang, 'Кесте қазір', 'Таблица сейчас', 'The table now') : pick(lang, 'Нәтиже', 'Результат', 'Result')}: {out.values.length} {pick(lang, 'жол', 'строк', 'rows')}</caption>
            <thead><tr>{out.columns.map((c, i) => <th key={i} scope="col" className="border border-border bg-surface-2 px-2 py-1 text-left font-semibold">{c}</th>)}</tr></thead>
            <tbody>{out.values.slice(0, 50).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="border border-border px-2 py-1">{v == null ? 'NULL' : String(v)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
