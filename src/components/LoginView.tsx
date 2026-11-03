import React, { useEffect, useState } from 'react';
import { Logo } from '../ui/Logo';
import { sb, CF } from '../config';
import { BTN_P, INP } from './Widgets';

type School = { id: string; name: string };
type Klass = { id: string; name: string; school_id: string };

// Sign-up is KeyToLife's own: the `admin-users` function creates the account and a pending request,
// and the class teacher or an admin approves it inside KeyToLife (decide_registration).
async function callUsers(body: Record<string, string>) {
  const r = await fetch(`${CF.url}/functions/v1/admin-users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: CF.key, Authorization: `Bearer ${CF.key}` },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Қате шықты, қайталап көр');
  return j;
}

export function LoginView({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Klass[]>([]);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [name, setName] = useState('');
  const [iin, setIin] = useState('');
  const [pass2, setPass2] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (mode !== 'up' || schools.length) return;
    callUsers({ action: 'schools' })
      .then(j => {
        setSchools(j.schools || []);
        setClasses(j.classes || []);
        if ((j.schools || []).length === 1) setSchoolId(j.schools[0].id);
      })
      .catch(e => setError(e.message));
  }, [mode]);

  const go = async () => {
    setError('');
    setInfo('');
    const email = user.includes('@') ? user.trim() : `${user.trim().toLowerCase()}@${CF.emailDomain}`;
    const { data, error: err } = await sb.auth.signInWithPassword({ email, password: pass });
    if (err || !data.user) {
      setError('Логин немесе құпиясөз қате');
      return;
    }
    const { data: prof } = await sb.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
    if (!prof) {
      // account exists but is not approved yet (or was rejected)
      const { data: reg } = await sb.from('registrations').select('status,note').eq('user_id', data.user.id).maybeSingle();
      await sb.auth.signOut();
      setError(reg?.status === 'rejected'
        ? `Өтінішің қабылданбады${reg.note ? ': ' + reg.note : ''}`
        : 'Өтінішің әлі қаралған жоқ. KeyToLife ішінде растағаннан кейін кіре аласың.');
      return;
    }
    onLogin();
  };

  const register = async () => {
    setError('');
    if (!/^\d{12}$/.test(iin)) return setError('ЖСН 12 саннан тұруы керек');
    if (name.trim().length < 2) return setError('Аты-жөнін толық жаз');
    if (pass2.length < 6) return setError('Құпиясөз кемінде 6 таңба');
    if (!schoolId) return setError('Мектепті таңда');
    if (role === 'student' && !classId) return setError('Сыныпты таңда');
    setBusy(true);
    try {
      await callUsers({
        action: 'register', iin, password: pass2, full_name: name.trim(), role, school_id: schoolId,
        class_id: role === 'student' ? classId : '', title: role === 'teacher' ? title : '',
      });
      setMode('in');
      setUser(iin);
      setPass('');
      setInfo('Өтініш жіберілді. Сынып жетекшісі немесе әкімші KeyToLife ішінде растайды — содан кейін ЖСН және құпиясөзбен кіре аласың.');
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const myClasses = classes.filter(c => c.school_id === schoolId);

  return (
    <div className="max-w-sm mx-auto pt-16 px-4 space-y-3 text-text pb-10">
      <h1 className="text-4xl font-black text-center"><Logo size={44} /></h1>
      <p className="text-center text-slate-400 text-sm">{mode === 'in' ? 'KeyToLife аккаунтыңмен кір' : 'KeyToLife-та тіркел'}</p>
      {error && <div data-testid="login-error" className="p-2 bg-danger-soft text-danger text-sm rounded-xl text-center">{error}</div>}
      {info && <div data-testid="login-info" className="p-2 bg-emerald-900/40 text-emerald-300 text-sm rounded-xl text-center">{info}</div>}

      {mode === 'in' ? (
        <>
          <input
            className={INP}
            placeholder="Логин (ЖСН)"
            autoCapitalize="off"
            value={user}
            onChange={e => setUser(e.target.value)}
          />
          <input
            className={INP}
            type="password"
            placeholder="Құпиясөз"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && go()}
          />
          <button className={`${BTN_P} w-full`} onClick={go}>Кіру</button>
          <button data-testid="to-register" className="w-full text-sm text-blue-400 underline" onClick={() => { setMode('up'); setError(''); setInfo(''); }}>
            Аккаунтың жоқ па? Тіркел
          </button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(['student', 'teacher'] as const).map(r => (
              <button key={r} data-testid={`role-${r}`} onClick={() => setRole(r)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border ${role === r ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600 text-slate-300'}`}>
                {r === 'student' ? 'Оқушы' : 'Мұғалім'}
              </button>
            ))}
          </div>
          <input className={INP} placeholder="Аты-жөні" value={name} onChange={e => setName(e.target.value)} />
          <input className={INP} placeholder="ЖСН (12 сан)" inputMode="numeric" maxLength={12} value={iin}
            onChange={e => setIin(e.target.value.replace(/\D/g, ''))} />
          <input className={INP} type="password" placeholder="Құпиясөз (кемінде 6 таңба)" value={pass2} onChange={e => setPass2(e.target.value)} />
          <select data-testid="school" className={INP} value={schoolId} onChange={e => { setSchoolId(e.target.value); setClassId(''); }}>
            <option value="">Мектеп</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {role === 'student' ? (
            <select data-testid="class" className={INP} value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Сынып</option>
              {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <input className={INP} placeholder="Қызметі, пәні (мысалы, Информатика)" value={title} onChange={e => setTitle(e.target.value)} />
          )}
          <button data-testid="register" className={`${BTN_P} w-full`} disabled={busy} onClick={register}>
            {busy ? 'Жіберілуде…' : 'Өтініш жіберу'}
          </button>
          <button className="w-full text-sm text-blue-400 underline" onClick={() => { setMode('in'); setError(''); }}>
            Аккаунтым бар, кіру
          </button>
        </>
      )}
    </div>
  );
}
