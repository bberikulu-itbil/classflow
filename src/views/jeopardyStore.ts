import { useEffect, useState } from 'react';
import { sb, DEMO } from '../config';

export interface Me { id: string; school_id: string }
export interface Team { name: string; members: string[]; score: number }
export interface Rules { penaltyPct: number; allowNegative: boolean; note: string }
/** Who plays and by which rules. Lives in this browser (per teacher), like the theme. */
export interface Setup { roster: string[]; teams: Team[]; rules: Rules }
export interface Run { id: string; title: string; at: string; teams: Team[]; rules: Rules }
/** `staff` decides where results go: teachers' rows are in the database, a student who opened a shared link keeps them in the browser. */
export interface Ctx { me: Me; staff: boolean }

export const MAX_TEAMS = 8, MAX_ROSTER = 60, MAX_RUNS = 50;
export const DEFAULT_RULES: Rules = { penaltyPct: 100, allowNegative: true, note: '' };
export const newTeam = (i: number, members: string[] = []): Team => ({ name: `Команда ${i}`, members, score: 0 });
/** Points lost for a wrong answer under the rules. */
export const penalty = (pts: number, r: Rules) => Math.round((pts * r.penaltyPct) / 100);
export const applyScore = (score: number, delta: number, r: Rules) => (r.allowNegative ? score + delta : Math.max(0, score + delta));

const rnd = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n; // modulo bias is negligible for n <= 60
/** Shuffles the list and deals it round-robin, so team sizes differ by at most one. */
export function splitTeams(names: string[], n: number): Team[] {
  const a = [...names];
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  const teams = Array.from({ length: n }, (_, i) => newTeam(i + 1));
  a.forEach((m, i) => teams[i % n].members.push(m));
  return teams;
}
/** Adds names (one per line / comma) to the list, skipping repeats, up to the cap. */
export function addNames(roster: string[], text: string): string[] {
  const seen = new Set(roster.map(x => x.toLowerCase()));
  const out = [...roster];
  for (const raw of text.split(/[\n,;]+/)) {
    const n = raw.trim().slice(0, 40);
    if (n && !seen.has(n.toLowerCase()) && out.length < MAX_ROSTER) { seen.add(n.toLowerCase()); out.push(n); }
  }
  return out;
}

const json = (key: string): any => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const put = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } };
const strs = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max) : []);
const cleanTeams = (v: unknown): Team[] =>
  (Array.isArray(v) ? v : []).slice(0, MAX_TEAMS).filter(t => t && typeof t.name === 'string')
    .map(t => ({ name: t.name.slice(0, 40), members: strs(t.members, MAX_ROSTER), score: Number.isFinite(t.score) ? t.score : 0 }));
const cleanRules = (v: any): Rules => ({
  penaltyPct: Number.isFinite(v?.penaltyPct) ? Math.min(100, Math.max(0, Math.round(v.penaltyPct))) : DEFAULT_RULES.penaltyPct,
  allowNegative: typeof v?.allowNegative === 'boolean' ? v.allowNegative : DEFAULT_RULES.allowNegative,
  note: typeof v?.note === 'string' ? v.note.slice(0, 200) : '',
});

const setupKey = (me: Me) => 'cf_jeopardy_setup_' + me.id;
function readSetup(me: Me): Setup {
  const v = json(setupKey(me));
  const teams = cleanTeams(v?.teams);
  return { roster: strs(v?.roster, MAX_ROSTER), teams: teams.length ? teams : [newTeam(1), newTeam(2)], rules: cleanRules(v?.rules) };
}
export function useSetup(me: Me) {
  const [s, set] = useState<Setup>(() => readSetup(me));
  useEffect(() => { put(setupKey(me), s); }, [me.id, s]);
  return [s, (fn: (p: Setup) => Setup) => set(fn)] as const;
}

// Results are rows of cf_jeopardy_runs (supabase/006_jeopardy.sql); without the table, and for students, they stay in this browser.
// shortcut: results saved in the browser before the table existed are not moved up (games are); add the same "move" card if teachers ask.
let noRuns = !!DEMO;
const missing = (e: { code?: string }) => e.code === 'PGRST205' || e.code === '42P01';
const runsKey = (me: Me) => 'cf_jeopardy_runs_' + me.id;
const localRuns = (me: Me): Run[] =>
  (json(runsKey(me)) || []).filter((r: any) => r && typeof r.id === 'string' && typeof r.title === 'string' && typeof r.at === 'string')
    .map((r: any) => ({ id: r.id, title: r.title, at: r.at, teams: cleanTeams(r.teams), rules: cleanRules(r.rules) }));
const NO_SAVE = 'Браузер сақтауға рұқсат бермеді (құпия режимде болуы мүмкін)';

export async function listRuns({ me, staff }: Ctx): Promise<{ runs: Run[]; local: boolean }> {
  if (staff && !noRuns) {
    const { data, error } = await sb.from('cf_jeopardy_runs').select('id,game_title,played_at,teams,rules').order('played_at', { ascending: false }).limit(MAX_RUNS);
    if (!error) return { runs: (data || []).map((r: any) => ({ id: r.id, title: r.game_title, at: r.played_at, teams: cleanTeams(r.teams), rules: cleanRules(r.rules) })), local: false };
    if (!missing(error)) throw new Error(error.message);
    noRuns = true;
  }
  return { runs: localRuns(me), local: true };
}
export async function addRun({ me, staff }: Ctx, run: Run) {
  if (staff && !noRuns) {
    const { error } = await sb.from('cf_jeopardy_runs').insert({ id: run.id, school_id: me.school_id, owner_id: me.id, game_title: run.title.trim() || 'Атаусыз', played_at: run.at, teams: run.teams, rules: run.rules });
    if (!error) return;
    if (!missing(error)) throw new Error(error.message);
    noRuns = true;
  }
  if (!put(runsKey(me), [run, ...localRuns(me)].slice(0, MAX_RUNS))) throw new Error(NO_SAVE);
}
export async function removeRun({ me, staff }: Ctx, id: string) {
  if (staff && !noRuns) {
    const { error } = await sb.from('cf_jeopardy_runs').delete().eq('id', id);
    if (!error) return;
    if (!missing(error)) throw new Error(error.message);
    noRuns = true;
  }
  if (!put(runsKey(me), localRuns(me).filter(r => r.id !== id))) throw new Error(NO_SAVE);
}
