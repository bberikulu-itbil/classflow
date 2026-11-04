// Builds the `en` block of a slide: every Kazakh text field goes through tr(); accept lists, answers, notes and ids are never touched.
const CELL = ' | ';
/** A text table (cells joined by " | "): translate cell by cell and pad again. Any other code (Python, ASCII art) is returned as is. */
export const trCode = (code, tr) => {
  if (!code.includes(CELL)) return code;
  const rows = code.split('\n').map(l => l.split(CELL).map(c => c.trim()));
  const out = rows.map(r => r.map(tr));
  const w = out[0].map((_, c) => Math.max(...out.map(r => String(r[c]).length)));
  return out.map(r => r.map((x, c) => String(x).padEnd(w[c])).join(CELL)).join('\n');
};
export function enBlock(s, tr, o = {}) {
  const e = {};
  for (const k of ['title', 'subtitle', 'prompt', 'explanation', 'hint']) if (typeof s[k] === 'string') e[k] = tr(s[k]);
  if (Array.isArray(s.bullets)) e.bullets = s.bullets.map(tr);
  if (Array.isArray(s.options)) e.options = s.options.map(tr);
  if (typeof s.code === 'string' && !o.dropCode) e.code = trCode(s.code, tr);
  if (Array.isArray(s.sections)) e.sections = s.sections.map(x => ({ ...x, ...(x.h ? { h: tr(x.h) } : {}), ...(x.text ? { text: tr(x.text) } : {}), ...(x.bullets ? { bullets: x.bullets.map(tr) } : {}) }));
  if (Array.isArray(s.levels)) e.levels = s.levels.map(l => ({ ...l, title: tr(l.title), variants: l.variants.map(v => ({ ...v, prompt: tr(v.prompt), explanation: tr(v.explanation) })) }));
  if (o.alt) e.alt = o.alt;
  return e;
}
