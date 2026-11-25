// The teacher's demo run of an exam: the same paper a student gets (one variant per task, as cf_exam_get builds it),
// scored in the browser the way cf_exam_submit scores it. Nothing is sent or saved.
const LANGS = ['ru', 'en'] as const;
const KEYS = ['answer', 'notes', 'explanation', 'accept', 'qvariants', 'xvariants'];

/** A random variant letter index per variant task (so each demo run shows another combination). */
export function demoPick(slides: any[]) {
  return slides.map(s => { const n = Math.max(s.qvariants?.length || 0, s.xtext?.length || 0); return n > 1 ? Math.floor(Math.random() * n) : 0; });
}

/** The paper: keys stripped, each task's text taken from its variant. */
export function demoPaper(slides: any[], pick: number[]) {
  return slides.map((s, i) => {
    const q: any = { ...s }; for (const k of KEYS) delete q[k];
    const vi = pick[i] ?? 0;
    if (s.qvariants?.length) {
      Object.assign(q, { prompt: s.qvariants[vi].prompt, options: s.qvariants[vi].options, variant: String.fromCharCode(65 + vi) });
      for (const l of LANGS) if (s[l]?.qtext) q[l] = { ...s[l], prompt: s[l].qtext[vi]?.prompt, options: s[l].qtext[vi]?.options };
    }
    if (s.xtext?.length) {
      Object.assign(q, s.xtext[vi], { variant: String.fromCharCode(65 + vi) });
      for (const l of LANGS) if (s[l]?.xtext) { const { xtext, ...rest } = s[l]; q[l] = { ...rest, ...xtext[vi] }; }
    }
    delete q.qtext; delete q.xtext;
    return q;
  });
}

const norm = (x: string) => x.trim().toLowerCase().replace(/\s/g, '');

/** Score like cf_exam_submit: tests by option, short answers by the accepted list, matching with part points. */
export function demoScore(slides: any[], pick: number[], answers: Record<string, string>) {
  let points = 0, max = 0;
  slides.forEach((s, i) => {
    const pts = s.points ?? 1, a = (answers[String(i)] ?? '').trim(), vi = pick[i] ?? 0;
    let ok: boolean | null = null, part = 0;
    if (s.type === 'quiz') {
      const key = s.qvariants?.length ? s.qvariants[vi].answer : s.answer;
      if (key != null) ok = a === String(key);
    } else if (s.type === 'task' && s.xvariants?.length) {
      const acc: string[] = s.xvariants[vi].accept || [];
      ok = acc.some(x => norm(x) === norm(a));
      if (s.partial && !ok && acc[0]) {
        const key = acc[0].toUpperCase(), mine = a.replace(/\s/g, '').toUpperCase();
        let hit = 0; for (let j = 0; j < key.length; j++) if (mine[j] === key[j]) hit++;
        part = Math.floor((pts * hit) / key.length);
      }
    } else if (s.type === 'task' && s.accept?.length) {
      ok = s.accept.some((x: string) => x.trim().toLowerCase() === a.toLowerCase());
    }
    if (ok !== null) { max += pts; points += ok ? pts : part; }
  });
  return { points, max };
}
