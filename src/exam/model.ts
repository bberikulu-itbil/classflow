// An exam (БЖБ/ТЖБ) as the builder edits it, and its slides: tests become `qvariants` (069), short answers and matching
// become `xvariants` + `xtext` (073). Each task has 1–4 variants; a student gets one per task (cf_qvariant).
// The builder's own copy lives in cf_lessons.plan.exam, so the teacher can reopen and edit it.

export type Kind = 'quiz' | 'short' | 'match';
export interface Var { q: string; options: string[]; answer: number; accept: string; left: string[]; right: string[]; why: string; /** a picture-widget from a code-built exam (a circuit): kept, not edited */ widget?: object }
export interface Task { kind: Kind; title: string; points: number; vars: Var[]; /** the variant template, kept to make new variants later */ gen?: import('./gen').Gen }
export interface Exam { title: string; minutes: number; tasks: Task[] }

export const KIND: Record<Kind, string> = { quiz: 'Тест (бір жауап)', short: 'Қысқа жауап', match: 'Сәйкестендіру' };
export const blankVar = (k: Kind): Var => ({ q: '', options: k === 'quiz' ? ['', '', '', ''] : [], answer: 0, accept: '', left: k === 'match' ? ['', '', ''] : [], right: k === 'match' ? ['', '', ''] : [], why: '' });
export const blankTask = (k: Kind, n: number): Task => ({ kind: k, title: `${n}-тапсырма`, points: k === 'match' ? 3 : k === 'short' ? 2 : 1, vars: [blankVar(k)] });
/** How many different papers the variants make (product over the tasks). */
export const papers = (e: Exam) => e.tasks.reduce((a, t) => a * Math.max(1, t.vars.length), 1);
/** The chance that two of n students get the very same paper. */
export const clash = (e: Exam, n: number) => { const P = papers(e); let ok = 1; for (let k = 1; k < n; k++) ok *= Math.max(0, 1 - k / P); return 1 - ok; };
export const total = (e: Exam) => e.tasks.reduce((a, t) => a + (Number(t.points) || 0), 0);
const L = (i: number) => String.fromCharCode(65 + i);

/** The right column a student sees: rotated by one more place in each variant, so the key is never 'ABC'. */
export const shuffled = (right: string[], vi: number) => right.map((_, j) => right[(j + vi + 1) % right.length]);
const keyOf = (right: string[], vi: number) => { const r = shuffled(right, vi); return right.map((_, i) => L(r.indexOf(right[i]))).join(''); };

/** What is missing, task by task; empty = ready to save. */
export function problems(e: Exam): string[] {
  const out: string[] = [];
  if (!e.title.trim()) out.push('Емтиханның атауы жоқ');
  if (!e.tasks.length) out.push('Бірде-бір тапсырма жоқ');
  e.tasks.forEach((t, i) => t.vars.forEach((v, j) => {
    const at = `${i + 1}-тапсырма, ${L(j)} нұсқа`;
    if (!v.q.trim()) out.push(`${at}: сұрақ жазылмаған`);
    if (t.kind === 'quiz') {
      const o = v.options.map(x => x.trim()).filter(Boolean);
      if (o.length < 2) out.push(`${at}: кемінде 2 жауап нұсқасы керек`);
      else if (new Set(o).size !== o.length) out.push(`${at}: жауап нұсқалары қайталанады`);
      if (!v.options[v.answer]?.trim()) out.push(`${at}: дұрыс жауап белгіленбеген`);
    }
    if (t.kind === 'short' && !v.accept.trim()) out.push(`${at}: дұрыс жауап жазылмаған`);
    if (t.kind === 'match') {
      const n = v.left.filter((x, k) => x.trim() && v.right[k]?.trim()).length;
      if (n < 2) out.push(`${at}: кемінде 2 толық жұп керек`);
      if (new Set(v.right.map(x => x.trim()).filter(Boolean)).size !== v.right.filter(x => x.trim()).length) out.push(`${at}: оң жақтағы мәндер қайталанбауы керек`);
    }
  }));
  return out;
}

export function toSlides(e: Exam): any[] {
  return e.tasks.map(t => {
    const base = { pageType: 'interactive', kind: 'check', title: t.title.trim() || 'Тапсырма', prompt: '', points: Math.max(1, Math.round(Number(t.points) || 1)) };
    if (t.kind === 'quiz') {
      const vs = t.vars.map(v => { const o = v.options.map(x => x.trim()); const keep = o.map((x, i) => (x ? i : -1)).filter(i => i >= 0);
        return { prompt: v.q.trim(), options: keep.map(i => o[i]), answer: Math.max(0, keep.indexOf(v.answer)), explanation: v.why.trim() }; });
      return { ...base, type: 'quiz', templateId: 'single-choice', qvariants: vs, qtext: vs.map(v => ({ prompt: v.prompt, options: v.options })), explanation: vs[0].explanation };
    }
    if (t.kind === 'short') {
      return { ...base, type: 'task', templateId: 'short', xvariants: t.vars.map(v => ({ accept: v.accept.split(/[;\n]/).map(x => x.trim()).filter(Boolean), explanation: v.why.trim() })), xtext: t.vars.map(v => ({ prompt: v.q.trim(), ...(v.widget ? { widget: v.widget } : {}) })) };
    }
    const pairs = t.vars.map(v => v.left.map((l, k) => [l.trim(), (v.right[k] || '').trim()]).filter(([l, r]) => l && r));
    return {
      ...base, type: 'task', templateId: 'matching', partial: true,
      xvariants: pairs.map((p, vi) => ({ accept: [keyOf(p.map(x => x[1]), vi)], explanation: t.vars[vi].why.trim() || p.map(([l, r]) => `${l} → ${r}`).join('; ') })),
      xtext: pairs.map((p, vi) => ({ prompt: t.vars[vi].q.trim(), match: { left: p.map(x => x[0]), right: shuffled(p.map(x => x[1]), vi) } })),
    };
  });
}

/** Back from slides (an exam built in code or before the builder): tests, short answers and matching; other pages are skipped. */
export function fromSlides(title: string, slides: any[], minutes = 40): Exam {
  const tasks: Task[] = [];
  for (const s of slides || []) {
    const v0 = (q: string): Var => ({ ...blankVar('short'), q });
    if (s?.type === 'quiz') {
      const qv = Array.isArray(s.qvariants) && s.qvariants.length ? s.qvariants : [{ prompt: s.prompt, options: s.options || [], answer: s.answer ?? 0, explanation: s.explanation }];
      tasks.push({ kind: 'quiz', title: s.title || '', points: s.points || 1, vars: qv.map((v: any) => ({ ...v0(v.prompt || ''), options: [...(v.options || [])], answer: v.answer ?? 0, why: v.explanation || '' })) });
    } else if (s?.type === 'task' && Array.isArray(s.xvariants)) {
      const m = s.xtext?.[0]?.match;
      tasks.push({
        kind: m ? 'match' : 'short', title: s.title || '', points: s.points || 1,
        vars: s.xvariants.map((xv: any, i: number) => {
          const tx = s.xtext?.[i] || {}, v = { ...v0(tx.prompt || ''), ...(tx.widget ? { widget: tx.widget } : {}) };
          if (!tx.match) return { ...v, accept: (xv.accept || []).join('; '), why: xv.explanation || '' };
          const key: string = xv.accept?.[0] || '';
          return { ...v, left: [...tx.match.left], right: tx.match.left.map((_: string, k: number) => tx.match.right[key.charCodeAt(k) - 65] ?? ''), why: xv.explanation || '' };
        }),
      });
    }
  }
  return { title, minutes, tasks };
}
