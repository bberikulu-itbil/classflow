import React, { useState } from 'react';
import { KeyRound, Printer } from 'lucide-react';
import { sb } from '../config';
import { Button, Card, ErrorBox } from '../ui';

interface Row { student_id: string; full_name: string; login: string | null; password: string | null }

/** The school-issued logins and passwords of one class (cf_class_logins, staff of the school only). Closed until asked for: passwords must not sit on a screen the class can see. */
export function ClassLogins({ classId, className }: { classId: string; className: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  React.useEffect(() => { setRows(null); setErr(''); }, [classId]); // another class: hide the previous one

  const open = async () => {
    setBusy(true); setErr('');
    const { data, error } = await sb.rpc('cf_class_logins', { p_class: classId });
    setBusy(false);
    if (error) setErr(error.message); else setRows((data || []) as Row[]);
  };
  const print = () => {
    const w = window.open('', '_blank');
    if (!w || !rows) return;
    const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
    w.document.write(`<title>${esc(className)}: логиндер</title><style>body{font-family:Arial,sans-serif}td,th{border:1px solid #999;padding:6px 10px;text-align:left}table{border-collapse:collapse}td.m{font-family:monospace;font-size:15px}</style><h2>${esc(className)}: логин және құпия сөз</h2><table><tr><th>№</th><th>Аты-жөні</th><th>Логин</th><th>Құпия сөз</th></tr>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.full_name)}</td><td class="m">${esc(r.login || '—')}</td><td class="m">${esc(r.password || '—')}</td></tr>`).join('')}</table>`);
    w.document.close(); w.print();
  };

  return (
    <Card className="space-y-3" aria-label="Сыныптың логиндері">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Логин және құпия сөз · {className}</h2>
        {rows ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={print}><Printer size={16} aria-hidden="true" />Басып шығару</Button>
            <Button variant="secondary" onClick={() => setRows(null)}>Жасыру</Button>
          </div>
        ) : <Button variant="secondary" disabled={busy} onClick={open}><KeyRound size={16} aria-hidden="true" />{busy ? 'Жүктелуде…' : 'Көрсету'}</Button>}
      </div>
      {!rows && !err && <p className="text-sm text-text-secondary">Құпия сөздер жасырын тұр. Экраныңыз оқушыларға көрінбейтін кезде ғана ашыңыз.</p>}
      {err && <ErrorBox message={err} onRetry={open} />}
      {rows && (rows.length === 0 ? <p className="text-sm text-text-muted">Бұл сыныпта оқушы жоқ.</p> : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table data-testid="class-logins" className="w-full text-sm">
            <caption className="sr-only">{className} сыныбының логиндері мен құпия сөздері</caption>
            <thead><tr className="bg-surface-2 text-left"><th scope="col" className="px-3 py-2">№</th><th scope="col" className="px-3 py-2">Аты-жөні</th><th scope="col" className="px-3 py-2">Логин</th><th scope="col" className="px-3 py-2">Құпия сөз</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.student_id} className="border-t border-border">
                <td className="px-3 py-2 tabular-nums text-text-secondary">{i + 1}</td>
                <td className="px-3 py-2">{r.full_name}</td>
                <td className="px-3 py-2 font-mono">{r.login || <span className="font-sans text-text-muted">берілмеген</span>}</td>
                <td className="px-3 py-2 font-mono">{r.password || <span className="font-sans text-text-muted">оқушы өзі қойған</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
    </Card>
  );
}
