import React from 'react';
import { BookOpen, Settings } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { BTN } from './Widgets';
import { STAFF } from '../config';

export function TopBar({ right, me }: { right?: React.ReactNode; me: any; onLogout?: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900 text-slate-100">
      <a href="#" className="font-black text-xl"><Logo /></a>
      <div className="flex items-center gap-2 text-sm">
        {right}
        <a href={STAFF.includes(me?.role) ? '#assign' : '#hw'} className={BTN}>
          <BookOpen size={16} aria-hidden="true" className="mr-1.5 inline" />Үй тапсырмасы
        </a>
        <a href="#profile" className={BTN}>
          <Settings size={16} aria-hidden="true" className="mr-1.5 inline" />{me?.full_name}
        </a>
      </div>
    </div>
  );
}
