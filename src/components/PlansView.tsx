import React, { useState, useEffect } from 'react';
import { sb } from '../config';
import { TopBar } from './TopBar';
import { BTN_P } from './Widgets';

export function PlansView({ me, onLogout }: { me: any; onLogout: () => void }) {
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    sb.from('cf_plans')
      .select('id,kind,title,quarter,updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) setPlans(data);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-white">
      <TopBar
        me={me}
        onLogout={onLogout}
        right={
          <button className={BTN_P} onClick={() => (window.location.hash = 'plan/new')}>
            + Жаңа жоспар
          </button>
        }
      />
      <div className="max-w-3xl mx-auto p-4 space-y-3">
        <h2 className="font-bold text-xl text-black">🗓 Жоспарлар</h2>
        {plans.length ? (
          plans.map(r => (
            <a
              key={r.id}
              href={'#plan/' + r.id}
              className="block p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500 transition"
            >
              <b>{r.title}</b>
              <span className="ml-2 text-xs text-slate-400">
                {r.kind === 'quarter' ? `Тоқсандық · ${r.quarter || ''}-тоқсан` : 'Сабақ жоспары'}
              </span>
            </a>
          ))
        ) : (
          <p className="text-slate-500">Жоспар жоқ.</p>
        )}
      </div>
    </div>
  );
}
