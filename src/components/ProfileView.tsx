import React, { useEffect, useState } from 'react';
import { FontPicker, ThemePicker } from '../ui/ThemePicker';
import { CF, DEMO, sb } from '../config';
import { ROLE_NAMES } from '../nav/config';
import { Button, Card, Field, inputCls } from '../ui';
import { DEFAULT_PREFS, getPrefs, quartersError, resetPrefs, setPrefs } from '../prefs';
import type { Prefs, Span } from '../prefs';

// <input type="date"> needs a year; the stored value is only month-day, so any non-leap year works.
const toDate = (md: string) => (md ? `${+md.slice(0, 2) >= 9 ? 2001 : 2002}-${md}` : '');
const Msg = ({ m }: { m: { t: string; bad?: boolean } | null }) => (m ? <p role={m.bad ? 'alert' : 'status'} className={'text-sm ' + (m.bad ? 'text-danger' : 'text-success')}>{m.t}</p> : null);

/** Teaching defaults: the quarter calendar (drives the quarter filters and the schedule) and two start values. Stored on this device. */
function TeachingSettings() {
  const [p, setP] = useState<Prefs>(() => getPrefs());
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const span = (i: number, k: keyof Span, v: string) => { setMsg(null); setP(o => ({ ...o, quarters: o.quarters.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })); };
  const num = (k: 'groups' | 'kbMax', v: string) => { setMsg(null); setP(o => ({ ...o, [k]: v === '' ? NaN : Number(v) })); };
  const save = () => {
    const e = quartersError(p.quarters) || (Number.isInteger(p.groups) && p.groups >= 1 && p.groups <= 8 ? '' : 'Топ саны 1 мен 8 аралығында болуы керек') || (Number.isInteger(p.kbMax) && p.kbMax >= 1 && p.kbMax <= 100 ? '' : 'ҚБ ең жоғары ұпайы 1 мен 100 аралығында болуы керек');
    if (e) return setMsg({ t: e, bad: true });
    try { setPrefs(p); setMsg({ t: 'Баптаулар сақталды' }); } catch (x) { setMsg({ t: (x as Error).message, bad: true }); }
  };
  const reset = () => { resetPrefs(); setP(DEFAULT_PREFS); setMsg({ t: 'Әдепкі мәндер қайтарылды' }); };
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Оқыту баптаулары</h2>
        <p className="text-sm text-text-secondary">Осы құрылғыда сақталады. Тоқсан күндері «Сабақтар» мен «Журнал» сүзгілерін және КТП ұяшықтарын құру аралығын анықтайды. Жыл есепке алынбайды: күндер әр оқу жылында қайталанады.</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text-secondary">Тоқсан күндері (демалыстар аралықта қалады)</legend>
        {p.quarters.map((x, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)]">
            <span className="col-span-2 text-sm font-medium sm:col-span-1 sm:pb-3">{i + 1}-тоқсан</span>
            <Field label="Басталуы">{id => <input id={id} type="date" className={inputCls} value={toDate(x.from)} onChange={e => span(i, 'from', e.target.value.slice(5))} />}</Field>
            <Field label="Аяқталуы">{id => <input id={id} type="date" className={inputCls} value={toDate(x.to)} onChange={e => span(i, 'to', e.target.value.slice(5))} />}</Field>
          </div>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Сабақты бастағандағы топ саны (1–8)">{id => <input id={id} inputMode="numeric" className={inputCls} value={Number.isNaN(p.groups) ? '' : p.groups} onChange={e => num('groups', e.target.value)} />}</Field>
        <Field label="ҚБ бағанының ең жоғары ұпайы (1–100)">{id => <input id={id} inputMode="numeric" className={inputCls} value={Number.isNaN(p.kbMax) ? '' : p.kbMax} onChange={e => num('kbMax', e.target.value)} />}</Field>
      </div>
      <Msg m={msg} />
      <div className="flex flex-wrap gap-2"><Button onClick={save}>Баптауларды сақтау</Button><Button variant="secondary" onClick={reset}>Әдепкіге қайтару</Button></div>
    </Card>
  );
}

/** Profile, appearance, teaching settings, password change and sign out. Rendered inside the app shell (route #profile and Settings > Profile). */
export function ProfileCard({ me, onLogout }: { me: any; onLogout: () => void }) {
  const [className, setClassName] = useState('');
  const [school, setSchool] = useState('');
  const [login, setLogin] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const staff = me.role !== 'student';

  useEffect(() => {
    if (me.class_id) sb.from('classes').select('name').eq('id', me.class_id).maybeSingle().then(({ data }) => setClassName(data?.name || ''));
  }, [me.class_id]);
  useEffect(() => {
    if (DEMO) return;
    // both are nice-to-have: a missing column or table just leaves the row as "—"
    sb.from('schools').select('name').eq('id', me.school_id).maybeSingle().then(({ data }) => setSchool((data as any)?.name || ''), () => {});
    sb.auth.getUser().then(({ data }) => { const e = data.user?.email || ''; setLogin(e.endsWith('@' + CF.emailDomain) ? e.split('@')[0] : e); }, () => {});
  }, [me.school_id]);

  const changePw = async () => {
    if (pw.length < 8) return setMsg({ t: 'Құпиясөз кемінде 8 таңба болуы керек', bad: true });
    if (pw !== pw2) return setMsg({ t: 'Құпиясөздер сәйкес емес', bad: true });
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return setMsg({ t: error.message, bad: true });
    setPw(''); setPw2(''); setMsg({ t: 'Құпиясөз өзгертілді' });
  };

  const row = (k: string, v: string) => (
    <div className="flex justify-between gap-3 py-2 border-b border-border last:border-0 text-sm">
      <span className="text-text-muted">{k}</span><b className="text-right break-words">{v || '—'}</b>
    </div>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <div className="mb-2 flex items-center gap-3">
          <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-xl font-bold text-on-accent">{(me.full_name || '?').trim().charAt(0).toUpperCase()}</span>
          <div className="min-w-0"><p className="text-lg font-semibold break-words">{me.full_name}</p><p className="text-sm text-text-secondary">{ROLE_NAMES[me.role] || me.role}</p></div>
        </div>
        {row('Аты-жөні', me.full_name)}
        {login && row('Логин', login)}
        {school && row('Мектеп', school)}
        {me.role === 'student' && row('Сынып', className)}
      </Card>
      {staff && <TeachingSettings />}
      <ThemePicker />
      <FontPicker />
      <Card className="space-y-3">
        <h2 className="font-semibold">Құпиясөзді өзгерту</h2>
        <Field label="Жаңа құпиясөз">{id => <input id={id} className={inputCls} type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} />}</Field>
        <Field label="Қайталаңыз">{id => <input id={id} className={inputCls} type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} />}</Field>
        <Msg m={msg} />
        <Button onClick={changePw}>Сақтау</Button>
      </Card>
      <Button variant="danger" onClick={async () => { await sb.auth.signOut(); onLogout(); window.location.hash = ''; }}>Шығу</Button>
    </div>
  );
}
