import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { sb } from '../config';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU'); // 04.11.2026, as in the school journal

type Row = { session_id: string; lesson_id: string; class_id: string | null; class_name: string | null; started_at: string; student_id: string; full_name: string; points: number; max_points: number; done: number; tasks: number };
type Col = { key: string; session_id: string; lesson_id: string; started_at: string; max: number; tasks: number };

/** Saved results of one module (cf_module_results, migration 066): per class, students × lessons taught, points / max; a past session can be deleted. */
export function ModuleResults({ moduleId, titleOf, onDeleted }: { moduleId: string; titleOf: (lessonId: string) => string; onDeleted?: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const [cls, setCls] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    const { data, error } = await sb.rpc('cf_module_results', { p_module: moduleId });
    if (error) { setErr(/cf_module_results/.test(error.message) ? 'Нәтижелер базада әлі қосылмаған (066 миграциясы керек).' : error.message); setRows([]); return; }
    setErr(''); setRows((data || []) as Row[]);
  };
  useEffect(() => { void load(); }, [moduleId]);

  const del = async (c: Col) => {
    if (!window.confirm(`«${titleOf(c.lesson_id)}» (${fmtDate(c.started_at)}) сабағын өшіресіз бе?\nОсы сабақтағы барлық тапсырма, жауап және ұпай біржола жойылады.`)) return;
    setBusy(c.session_id);
    const { error } = await sb.rpc('cf_delete_session', { p_session: c.session_id });
    setBusy('');
    if (error) { setErr(error.message); return; }
    await load(); onDeleted?.();
  };

  if (!rows) return <p className="text-xs text-text-muted">Жүктелуде…</p>;
  if (err) return <p role="alert" className="text-xs text-danger">{err}</p>;
  if (!rows.length) return <p className="text-xs text-text-muted">Бұл модуль бойынша аяқталған сабақ әлі жоқ.</p>;

  const classes = [...new Map(rows.map(r => [r.class_id || '-', r.class_name || 'Сыныпсыз'])).entries()];
  const cur = cls && classes.some(([k]) => k === cls) ? cls : classes[0][0];
  const mine = rows.filter(r => (r.class_id || '-') === cur);
  const cols: Col[] = [...new Map(mine.map(r => [`${r.session_id}:${r.lesson_id}`, { key: `${r.session_id}:${r.lesson_id}`, session_id: r.session_id, lesson_id: r.lesson_id, started_at: r.started_at, max: r.max_points, tasks: r.tasks }])).values()];
  const students = [...new Map(mine.map(r => [r.student_id, r.full_name])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'kk'));
  const cell = new Map(mine.map(r => [`${r.student_id}|${r.session_id}:${r.lesson_id}`, r]));
  const maxAll = cols.reduce((n, c) => n + c.max, 0);

  return (
    <div className="space-y-2" data-testid={`module-results-${moduleId}`}>
      {classes.length > 1 && (
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Сынып">
          {classes.map(([k, name]) => (
            <button key={k} type="button" role="tab" aria-selected={k === cur} onClick={() => setCls(k)}
              className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold cursor-pointer ${k === cur ? 'bg-accent text-on-accent' : 'bg-surface-2 text-text-secondary hover:text-text'}`}>{name}</button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-text-secondary align-bottom">
              <th className="sticky left-0 bg-surface py-2 pr-3 font-semibold">Оқушы</th>
              {cols.map(c => (
                <th key={c.key} className="min-w-[7rem] py-2 pr-2 font-semibold">
                  <div className="line-clamp-2" title={titleOf(c.lesson_id)}>{titleOf(c.lesson_id)}</div>
                  <div className="flex items-center gap-1 font-normal text-text-muted">
                    {fmtDate(c.started_at)} · {c.tasks} тапс.
                    <button type="button" onClick={() => del(c)} disabled={busy === c.session_id} aria-label={`Сабақты өшіру: ${titleOf(c.lesson_id)}, ${fmtDate(c.started_at)}`}
                      title="Сабақты өшіру" className="ml-auto grid h-7 w-7 place-items-center rounded-md text-danger hover:bg-danger-soft cursor-pointer disabled:opacity-50"><Trash2 size={14} aria-hidden="true" /></button>
                  </div>
                </th>
              ))}
              <th className="py-2 pl-2 font-semibold">Барлығы</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {students.map(([id, name]) => {
              const total = cols.reduce((n, c) => n + (cell.get(`${id}|${c.key}`)?.points || 0), 0);
              return (
                <tr key={id}>
                  <td className="sticky left-0 bg-surface py-2 pr-3 font-medium text-text whitespace-nowrap">{name}</td>
                  {cols.map(c => {
                    const r = cell.get(`${id}|${c.key}`);
                    return <td key={c.key} className="py-2 pr-2 tabular-nums">{r ? <><b className="text-text">{r.points}</b><span className="text-text-muted"> / {r.max_points}</span>{r.tasks > 0 && <span className="ml-1 text-[11px] text-text-muted">({r.done}/{r.tasks})</span>}</> : <span className="text-text-muted">қатыспады</span>}</td>;
                  })}
                  <td className="py-2 pl-2 font-bold tabular-nums text-text">{total} / {maxAll}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted">Ұпай / ең көп ұпай, жақшада — орындалған тапсырма саны. Сабақ аяқталғаннан кейін нәтиже осында сақталады.</p>
    </div>
  );
}
