import React from 'react';
import type { Lang } from './lang';

/** What a slide is for in the lesson. A slide carries it as `kind`; slides without one show no badge. */
export const KINDS: Record<string, { kk: string; ru: string; icon: string; cls: string }> = {
  explain: { kk: 'Түсіндіру', ru: 'Объяснение', icon: '📖', cls: 'bg-blue-500/20 text-blue-200 border-blue-400/50' },
  example: { kk: 'Мысал', ru: 'Пример', icon: '💡', cls: 'bg-violet-500/20 text-violet-200 border-violet-400/50' },
  exampletask: { kk: 'Мысал тапсырма', ru: 'Задача с разбором', icon: '🧩', cls: 'bg-teal-500/20 text-teal-200 border-teal-400/50' },
  practice: { kk: 'Практикалық тапсырма', ru: 'Практическое задание', icon: '🛠️', cls: 'bg-orange-500/20 text-orange-200 border-orange-400/50' },
  video: { kk: 'Видео', ru: 'Видео', icon: '🎬', cls: 'bg-rose-500/20 text-rose-200 border-rose-400/50' },
  check: { kk: 'Тексеру', ru: 'Проверка', icon: '✅', cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50' },
};

export const kindLabel = (kind: string | undefined, lang: Lang = 'kk') => (kind && KINDS[kind] ? KINDS[kind][lang] : '');

export function KindBadge({ kind, lang = 'kk', className = '' }: { kind?: string; lang?: Lang; className?: string }) {
  const k = kind && KINDS[kind];
  if (!k) return null;
  return <span data-testid="kind-badge" data-kind={kind} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${k.cls} ${className}`}><span aria-hidden="true">{k.icon}</span>{k[lang]}</span>;
}
