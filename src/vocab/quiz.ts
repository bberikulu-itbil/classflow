// Pure quiz maker for vocabulary: multiple choice built from the terms themselves. No network, rng can be injected for tests.
export interface VT { kk: string; ru?: string | null; en?: string | null; definition?: string | null }
export type QKind = 'def' | 'ru' | 'en';
export interface Q { kind: QKind; term: string; prompt: string; options: string[]; answer: number }
export const KINDS: { k: QKind; label: string }[] = [
  { k: 'def', label: 'Анықтама → термин' },
  { k: 'ru', label: 'Қазақша → орысша' },
  { k: 'en', label: 'Қазақша → ағылшынша' },
];
const clean = (s?: string | null) => (s || '').trim();
/** The value a question of this kind asks for (the right answer). */
const key = (t: VT, k: QKind) => clean(k === 'def' ? t.kk : k === 'ru' ? t.ru : t.en);
/** What the question shows. */
const shown = (t: VT, k: QKind) => clean(k === 'def' ? t.definition : t.kk);
const text = (k: QKind, s: string) =>
  k === 'def' ? `«${s}» — бұл қай термин?` : `«${s}» терминінің ${k === 'ru' ? 'орысша' : 'ағылшынша'} баламасы қайсы?`;

function shuffle<T>(a: T[], rnd: () => number): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
/** Up to `count` questions, each term asked as few times as possible. A kind needs the field filled and at least two different answers in the set. */
export function makeQuiz(terms: VT[], opts: { count: number; kinds: QKind[] }, rnd: () => number = Math.random): Q[] {
  const pool = (k: QKind) => [...new Set(terms.map(t => key(t, k)).filter(Boolean).map(s => s.toLowerCase()))];
  const ok = opts.kinds.filter(k => pool(k).length >= 2);
  const pairs = shuffle(terms.flatMap(t => ok.filter(k => key(t, k) && shown(t, k)).map(k => ({ t, k }))), rnd);
  const used = new Set<string>(), picked: typeof pairs = [];
  for (const p of pairs) if (picked.length < opts.count && !used.has(p.t.kk)) { used.add(p.t.kk); picked.push(p); }   // first one question per term
  for (const p of pairs) if (picked.length < opts.count && !picked.includes(p)) picked.push(p);                          // then repeat terms with another kind
  return shuffle(picked, rnd).map(({ t, k }) => {
    const right = key(t, k);
    const others = shuffle(pool(k).filter(v => v !== right.toLowerCase()), rnd).slice(0, 3);
    const labels = new Map(terms.map(x => [key(x, k).toLowerCase(), key(x, k)]));
    const options = shuffle([right, ...others.map(v => labels.get(v)!)], rnd);
    return { kind: k, term: t.kk, prompt: text(k, shown(t, k)), options, answer: options.indexOf(right) };
  });
}
