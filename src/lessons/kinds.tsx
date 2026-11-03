import React from 'react';
import type { Lang } from './lang';

/** What a slide is for in the lesson. A slide carries it as `kind`; slides without one show no badge. */
export const KINDS: Record<string, { kk: string; ru: string; en: string; icon: string; cls: string }> = {
  explain: { kk: 'Түсіндіру', ru: 'Объяснение', en: 'Explanation', icon: '📖', cls: 'bg-[#DBEAFE] text-[#1E3A8A] border-[#93C5FD]' },
  example: { kk: 'Мысал', ru: 'Пример', en: 'Example', icon: '💡', cls: 'bg-[#EDE9FE] text-[#4C1D95] border-[#C4B5FD]' },
  exampletask: { kk: 'Мысал тапсырма', ru: 'Задача с разбором', en: 'Worked example', icon: '🧩', cls: 'bg-[#CCFBF1] text-[#134E4A] border-[#5EEAD4]' },
  practice: { kk: 'Практикалық тапсырма', ru: 'Практическое задание', en: 'Practice task', icon: '🛠️', cls: 'bg-[#FFEDD5] text-[#7C2D12] border-[#FDBA74]' },
  video: { kk: 'Видео', ru: 'Видео', en: 'Video', icon: '🎬', cls: 'bg-[#FFE4E6] text-[#881337] border-[#FDA4AF]' },
  check: { kk: 'Тексеру', ru: 'Проверка', en: 'Check', icon: '✅', cls: 'bg-[#D1FAE5] text-[#064E3B] border-[#6EE7B7]' },
};

export const kindLabel = (kind: string | undefined, lang: Lang = 'kk') => (kind && KINDS[kind] ? KINDS[kind][lang] : '');

export function KindBadge({ kind, lang = 'kk', className = '' }: { kind?: string; lang?: Lang; className?: string }) {
  const k = kind && KINDS[kind];
  if (!k) return null;
  return <span data-testid="kind-badge" data-kind={kind} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${k.cls} ${className}`}><span aria-hidden="true">{k.icon}</span>{k[lang]}</span>;
}
