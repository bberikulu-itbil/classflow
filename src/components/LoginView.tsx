import React, { useState } from 'react';
import { sb, CF } from '../config';
import { BTN_P, INP } from './Widgets';

export function LoginView({ onLogin }: { onLogin: () => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const go = async () => {
    setError('');
    const email = user.includes('@') ? user.trim() : `${user.trim().toLowerCase()}@${CF.emailDomain}`;
    const { error: err } = await sb.auth.signInWithPassword({ email, password: pass });
    if (err) {
      setError('Логин немесе құпиясөз қате');
      return;
    }
    onLogin();
  };

  return (
    <div className="max-w-sm mx-auto pt-24 px-4 space-y-3 text-text">
      <h1 className="text-4xl font-black text-center">
        Class<span className="text-blue-400">Flow</span>
      </h1>
      <p className="text-center text-slate-400 text-sm">KeyToLife аккаунтыңмен кір</p>
      {error && <div className="p-2 bg-danger-soft text-danger text-sm rounded-xl text-center">{error}</div>}
      <input
        className={INP}
        placeholder="Логин (KeyToLife-тағыдай)"
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
      <button className={`${BTN_P} w-full`} onClick={go}>
        Кіру
      </button>
    </div>
  );
}
