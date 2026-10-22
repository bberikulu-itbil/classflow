import React from 'react';
import { BTN } from './Widgets';

export function TopBar({ right, me }: { right?: React.ReactNode; me: any; onLogout?: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900 text-slate-100">
      <a href="#" className="font-black text-xl">
        Class<span className="text-blue-400">Flow</span>
      </a>
      <div className="flex items-center gap-2 text-sm">
        {right}
        <a href="#profile" className={BTN}>
          ⚙ {me?.full_name}
        </a>
      </div>
    </div>
  );
}
