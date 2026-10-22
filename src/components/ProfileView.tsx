import React, { useEffect, useState } from 'react';
import { sb } from '../config';
import { BTN, BTN_P, INP } from './Widgets';
import { TopBar } from './TopBar';

const ROLES: Record<string, string> = {
  teacher: 'Мұғалім', class_teacher: 'Сынып жетекшісі', deputy: 'Директор орынбасары', admin: 'Әкімші', student: 'Оқушы',
};

export function ProfileView({ me, onLogout }: { me: any; onLogout: () => void }) {
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
    <div className="flex justify-between py-2 border-b border-slate-800 text-sm">
      <span className="text-slate-400">{k}</span><b>{v || '—'}</b>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopBar me={me} />
      <div className="max-w-md mx-auto p-4 space-y-5">
        <h1 className="text-2xl font-bold">Профиль</h1>
        <section className="bg-slate-900 rounded-2xl p-4">
          {row('Аты-жөні', me.full_name)}
          {row('Рөл', ROLES[me.role] || me.role)}
          {row('Сынып', className)}
        </section>
        <section className="bg-slate-900 rounded-2xl p-4 space-y-2">
          <h2 className="font-bold">Құпиясөзді өзгерту</h2>
          <input className={INP} type="password" placeholder="Жаңа құпиясөз" value={pw} onChange={e => setPw(e.target.value)} />
          <input className={INP} type="password" placeholder="Қайталаңыз" value={pw2} onChange={e => setPw2(e.target.value)} />
          {msg && <p className={'text-sm ' + (msg.bad ? 'text-red-400' : 'text-emerald-400')}>{msg.t}</p>}
          <button className={BTN_P} onClick={changePw}>Сақтау</button>
        </section>
        <div className="flex gap-2">
          <a href="#" className={BTN}>← Артқа</a>
          <button className={BTN + ' !bg-red-700 !text-white'} onClick={async () => { await sb.auth.signOut(); onLogout(); window.location.hash = ''; }}>Шығу</button>
        </div>
      </div>
    </div>
  );
}
