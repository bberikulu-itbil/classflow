import React from 'react';
import { Atom, BookOpen, Bot, Brain, Calculator, Code2, Cpu, Dna, FlaskConical, Globe, GraduationCap, Landmark, Languages, Leaf, Medal, Palette, Rocket, Trophy } from 'lucide-react';
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

/** One icon family for every contest: a line icon on a tinted square. The key comes from the icon field, else from the field (сала). */
export const ICONS: Record<string, { Icon: React.ElementType; hue: number; label: string }> = {
  trophy: { Icon: Trophy, hue: 42, label: 'Кубок' }, robot: { Icon: Bot, hue: 215, label: 'Робот' }, code: { Icon: Code2, hue: 255, label: 'Код' },
  brain: { Icon: Brain, hue: 285, label: 'Жасанды интеллект' }, atom: { Icon: Atom, hue: 190, label: 'Физика' }, cpu: { Icon: Cpu, hue: 200, label: 'Технология' },
  math: { Icon: Calculator, hue: 235, label: 'Математика' }, flask: { Icon: FlaskConical, hue: 165, label: 'Химия' }, dna: { Icon: Dna, hue: 145, label: 'Биология' },
  leaf: { Icon: Leaf, hue: 120, label: 'Экология' }, rocket: { Icon: Rocket, hue: 18, label: 'Стартап' }, palette: { Icon: Palette, hue: 330, label: 'Өнер' },
  languages: { Icon: Languages, hue: 175, label: 'Тілдер' }, book: { Icon: BookOpen, hue: 28, label: 'Гуманитарлық' }, medal: { Icon: Medal, hue: 8, label: 'Спорт' },
  cap: { Icon: GraduationCap, hue: 250, label: 'Мұғалімдер' }, globe: { Icon: Globe, hue: 205, label: 'Халықаралық' }, landmark: { Icon: Landmark, hue: 35, label: 'Экономика' },
};
const FIELD_ICON: Record<string, string> = { general: 'trophy', robotics: 'robot', informatics: 'code', programming: 'code', ai: 'brain', stem: 'cpu', math: 'math', physics: 'atom', chemistry: 'flask', biology: 'dna', ecology: 'leaf', startup: 'rocket', art: 'palette', languages: 'languages', humanities: 'book', sport: 'medal', teachers: 'cap' };
export const iconKey = (c: Pick<Contest, 'icon' | 'field'>) => (c.icon && ICONS[c.icon] ? c.icon : FIELD_ICON[c.field] ?? 'trophy');
/** size: 'sm' tile for lists, 'lg' banner when there is no cover. Light tint + dark glyph keeps AA contrast on every theme. */
export function ContestIcon({ c, size = 'sm' }: { c: Pick<Contest, 'icon' | 'field'>; size?: 'sm' | 'lg' }) {
  const { Icon, hue } = ICONS[iconKey(c)];
  if (size === 'lg') return <div aria-hidden="true" className="grid h-full w-full place-items-center" style={{ background: `linear-gradient(135deg, hsl(${hue} 80% 94%), hsl(${hue} 70% 84%))`, color: `hsl(${hue} 60% 28%)` }}><Icon size={56} strokeWidth={1.5} /></div>;
  return <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-card" style={{ background: `hsl(${hue} 80% 92%)`, color: `hsl(${hue} 60% 28%)` }}><Icon size={22} /></span>;
}

/** First and last known date of a contest (own dates and stage dates). hasOpenStage: a stage without a date means it is not over. */
export function span(c: Contest, stages: { on_date: string | null }[]) {
  const ds = [c.starts_on, c.ends_on, ...stages.map(s => s.on_date)].filter((x): x is string => !!x).sort();
  return { from: ds[0] ?? null, to: ds[ds.length - 1] ?? null, openStage: stages.some(s => !s.on_date) };
}
/** Past = every known date is before today and no stage is still without a date. No dates at all: stays active. */
export const isPast = (c: Contest, stages: { on_date: string | null }[]) => { const s = span(c, stages); return !!s.to && !s.openStage && s.to < st.todayIso(); };
