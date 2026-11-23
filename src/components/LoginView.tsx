import React, { useEffect, useState } from 'react';
import { Logo } from '../ui/Logo';
import { LangSwitch } from '../i18n/LangSwitch';
import { sb, CF } from '../config';
import { GlassBackdrop, LiquidButton } from '../ui/Liquid';

/** Inputs on the glass card */
const INP = 'glass-field w-full min-h-[50px] rounded-2xl px-4 text-base text-text placeholder:text-text-muted focus:outline focus:outline-2 focus:outline-accent';

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
    <div className="relative min-h-screen px-4 pb-10 pt-6 text-text">
      <GlassBackdrop />
      <div className="mx-auto flex max-w-md justify-between items-center gap-3">
        <span className="text-2xl font-black"><Logo size={36} /></span>
        <div className="glass rounded-full p-1"><LangSwitch /></div>
      </div>
      <main className="glass mx-auto mt-10 max-w-md space-y-4 rounded-[2rem] p-7 sm:p-9">
      <div className="space-y-1 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">{mode === 'in' ? 'Қош келдіңіз' : 'Тіркелу'}</h1>
        <p className="text-sm text-text-secondary">{mode === 'in' ? 'KeyToLife аккаунтыңызбен кіріңіз' : 'KeyToLife-та тіркеліңіз'}</p>
      </div>
      {error && <div data-testid="login-error" className="p-2 bg-danger-soft text-danger text-sm rounded-xl text-center">{error}</div>}
      {info && <div data-testid="login-info" className="p-2 bg-success-soft text-success text-sm rounded-xl text-center">{info}</div>}

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
          <LiquidButton size="xl" className="w-full" onClick={go}>Кіру</LiquidButton>
          <p className="text-center text-sm text-text-secondary">Аккаунтыңыз жоқ па?{' '}
            <button data-testid="to-register" className="min-h-[44px] font-bold text-accent hover:underline cursor-pointer" onClick={() => { setMode('up'); setError(''); setInfo(''); }}>Тіркеліңіз</button></p>
        </>
      ) : (
        <>
          <div className="glass-field grid grid-cols-2 gap-1 rounded-2xl p-1" role="group" aria-label="Кім тіркеледі">
            {(['student', 'teacher'] as const).map(r => (
              <button key={r} data-testid={`role-${r}`} aria-pressed={role === r} onClick={() => setRole(r)}
                className={`min-h-[44px] rounded-xl text-sm font-semibold cursor-pointer ${role === r ? 'liquid bg-surface text-text' : 'text-text-secondary'}`}>
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
          <LiquidButton data-testid="register" size="xl" className="w-full" disabled={busy} onClick={register}>
            {busy ? 'Жіберілуде…' : 'Өтініш жіберу'}
          </LiquidButton>
          <button className="w-full min-h-[44px] text-sm font-bold text-accent hover:underline cursor-pointer" onClick={() => { setMode('in'); setError(''); }}>
            Аккаунтым бар, кіру
          </button>
        </>
      )}
      </main>
    </div>
  );
}
