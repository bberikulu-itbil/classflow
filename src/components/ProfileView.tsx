import React, { useEffect, useState } from 'react';
import { sb } from '../config';
import { ROLE_NAMES } from '../nav/config';
import { Button, Card, Field, inputCls } from '../ui';

/** Profile, password change and sign out. Rendered inside the app shell (route #profile and Settings > Profile). */
export function ProfileCard({ me, onLogout }: { me: any; onLogout: () => void }) {
  const [className, setClassName] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);

  useEffect(() => {
    if (me.class_id) sb.from('classes').select('name').eq('id', me.class_id).maybeSingle().then(({ data }) => setClassName(data?.name || ''));
  }, [me.class_id]);

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
    <div className="space-y-4 max-w-md">
      <Card>
        {row('Аты-жөні', me.full_name)}
        {row('Рөл', ROLE_NAMES[me.role] || me.role)}
        {me.role === 'student' && row('Сынып', className)}
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Құпиясөзді өзгерту</h2>
        <Field label="Жаңа құпиясөз">{id => <input id={id} className={inputCls} type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} />}</Field>
        <Field label="Қайталаңыз">{id => <input id={id} className={inputCls} type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} />}</Field>
        {msg && <p role={msg.bad ? 'alert' : 'status'} className={'text-sm ' + (msg.bad ? 'text-danger' : 'text-success')}>{msg.t}</p>}
        <Button onClick={changePw}>Сақтау</Button>
      </Card>
      <Button variant="danger" onClick={async () => { await sb.auth.signOut(); onLogout(); window.location.hash = ''; }}>Шығу</Button>
    </div>
  );
}
