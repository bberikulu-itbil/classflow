import React from 'react';
import { sb, CF } from '../config';
import { BTN } from './Widgets';

export function TopBar({ right, me, onLogout }: { right?: React.ReactNode; me: any; onLogout: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900 text-white">
      <a href="#" className="font-black text-xl">
        Class<span className="text-blue-400">Flow</span>
      </a>
      <div className="flex items-center gap-2 text-sm">
        {right}
        <span className="text-slate-400">{me?.full_name}</span>
        <button
          className={BTN}
          onClick={async () => {
            await sb.auth.signOut();
            onLogout();
          }}
        >
          Шығу
        </button>
      </div>
    </div>
  );
}
