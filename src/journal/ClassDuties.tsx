import { useState } from 'react';
import { UserCog } from 'lucide-react';
import { sb } from '../config';
import { Button, Card } from '../ui';
import { byName } from '../views/session';

type Duty = { student_id: string; duty: 'author' | 'room'; room_id: string | null };

/** Student duties of one class (cf_duties, migration 067): course author, room helper. Changes go through cf_set_duty (staff only). */
export function ClassDuties({ classId }: { classId: string }) {
  const [d, setD] = useState<{ students: { id: string; full_name: string }[]; duties: Duty[]; rooms: { id: string; name: string }[] } | null>(null);
  const [err, setErr] = useState(''), [busy, setBusy] = useState('');

  const load = async () => {
    setErr('');
    const st = await sb.from('profiles').select('id,full_name').eq('role', 'student').eq('class_id', classId).is('removed_at', null);
    const ids = (st.data || []).map((s: any) => s.id);
    const [du, rm] = await Promise.all([
      ids.length ? sb.from('cf_duties').select('student_id,duty,room_id').in('student_id', ids) : Promise.resolve({ data: [], error: null } as any),
      sb.from('cf_rooms').select('id,name').order('name'),
    ]);
    if (st.error || du.error) { setErr((st.error || du.error)!.message); return; }
    setD({ students: ((st.data || []) as any[]).sort((a, b) => byName(a.full_name, b.full_name)), duties: (du.data || []) as Duty[], rooms: (rm.data || []) as any[] });
  };
  const set = async (student: string, duty: 'author' | 'room', room: string | null, on: boolean) => {
    setBusy(student); setErr('');
    const { error } = await sb.rpc('cf_set_duty', { p_student: student, p_duty: duty, p_room: room, p_on: on });
    setBusy('');
    if (error) setErr(error.message); else await load();
  };

  if (!d) return (
    <Card className="flex flex-wrap items-center gap-3" aria-label="Оқушы міндеттері">
      <UserCog size={18} aria-hidden="true" className="text-accent" />
      <div className="min-w-0 flex-1"><h2 className="font-semibold">Оқушы міндеттері</h2><p className="text-sm text-text-secondary">Курс авторы, кабинет көмекшісі</p></div>
      <Button variant="secondary" onClick={load}>Ашу</Button>
      {err && <p role="alert" className="w-full text-sm text-danger">{err}</p>}
    </Card>
  );
  const roomOf = (id: string) => d.duties.filter(x => x.student_id === id && x.duty === 'room').map(x => x.room_id!);
  return (
    <Card className="space-y-3" aria-label="Оқушы міндеттері">
      <div className="flex items-center gap-2"><UserCog size={18} aria-hidden="true" className="text-accent" /><h2 className="flex-1 font-semibold">Оқушы міндеттері</h2>
        <Button variant="secondary" onClick={() => setD(null)}>Жабу</Button></div>
      <p className="text-sm text-text-secondary"><b>Курс авторы</b> — өз курсын, модулін, дәрісін жасайды (басқа мұғалімдердің дәрістерін көрмейді). <b>Кабинет көмекшісі</b> — сол кабинетте жауапты мұғаліммен бірдей құқық.</p>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-text-secondary"><th className="py-2 font-semibold">Оқушы</th><th className="font-semibold">Курс авторы</th><th className="font-semibold">Кабинет көмекшісі</th></tr></thead>
          <tbody className="divide-y divide-border/60">
            {d.students.map(s => {
              const author = d.duties.some(x => x.student_id === s.id && x.duty === 'author'), rooms = roomOf(s.id);
              return (
                <tr key={s.id}>
                  <td className="py-2 pr-2">{s.full_name}</td>
                  <td><input type="checkbox" className="h-5 w-5 cursor-pointer accent-[var(--color-accent)]" aria-label={`${s.full_name}: курс авторы`} checked={author} disabled={busy === s.id} onChange={e => set(s.id, 'author', null, e.target.checked)} /></td>
                  <td className="py-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {rooms.map(r => <span key={r} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-xs">{d.rooms.find(x => x.id === r)?.name || 'кабинет'}
                        <button type="button" aria-label="Алып тастау" disabled={busy === s.id} onClick={() => set(s.id, 'room', r, false)} className="cursor-pointer text-danger">×</button></span>)}
                      <select aria-label={`${s.full_name}: кабинет қосу`} value="" disabled={busy === s.id || !d.rooms.length} onChange={e => e.target.value && set(s.id, 'room', e.target.value, true)}
                        className="h-9 rounded-lg border border-border-input bg-surface px-2 text-xs">
                        <option value="">{d.rooms.length ? '+ кабинет' : 'кабинет жоқ'}</option>
                        {d.rooms.filter(r => !rooms.includes(r.id)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
