import React from 'react';
import * as st from './store';
import type { App, Contest, Data } from './store';

export const MONTHS = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];
export const dmy = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1].toLowerCase()}${y === new Date().getFullYear() ? '' : ' ' + y}`; };
export const range = (c: Contest) => !c.starts_on ? 'Күні белгісіз' : !c.ends_on || c.ends_on === c.starts_on ? dmy(c.starts_on) : `${dmy(c.starts_on)} – ${dmy(c.ends_on)}`;
export const monthKey = (c: Contest) => (c.starts_on ? c.starts_on.slice(0, 7) : '');
export const monthLabel = (k: string) => (k ? `${MONTHS[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}` : 'Күні белгісіз');
export const age = (c: Contest) => c.age_min != null && c.age_max != null ? `${c.age_min}–${c.age_max} жас` : c.age_min != null ? `${c.age_min}+ жас` : c.age_max != null ? `${c.age_max} жасқа дейін` : '';
export const catName = (d: Data, id?: string | null) => d.categories.find(x => x.id === id)?.name ?? '';
export const canEdit = (me: st.Me, c: Contest) => c.author_id === me.id || me.role === 'deputy' || me.role === 'admin';
/** Whole days from today to an ISO date (negative: passed). */
export const daysTo = (iso: string) => Math.round((Date.parse(iso + 'T00:00:00') - Date.parse(st.todayIso() + 'T00:00:00')) / 86400000);

export const Chip = ({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'accent' | 'ok' | 'warn' }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone === 'accent' ? 'bg-accent-soft text-on-accent-soft' : tone === 'ok' ? 'bg-success-soft text-success' : tone === 'warn' ? 'bg-warning-soft text-warning' : 'bg-surface-2 text-text-secondary'}`}>{children}</span>
);
export const AppChip = ({ s }: { s: App['status'] }) => <Chip tone={s === 'approved' ? 'ok' : s === 'pending' ? 'warn' : 'plain'}>{st.APP_NAMES[s]}</Chip>;
