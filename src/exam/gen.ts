// Variant templates: a question with {expressions}, number parameters in ranges, an answer formula (and, for a test, wrong-answer
// formulas). Generates up to 26 different variants with exact answers, offline. Formulas use only the parameters and the helpers
// below; anything else is refused before it runs (the teacher's own browser, but still no free code).
import type { Kind, Var } from './model';

export interface Param { name: string; from: number; to: number }
export interface Gen { q: string; params: Param[]; answer: string; wrong: string[]; when: string; count: number }

const tc = (n: number, bits = 8) => ((n % 2 ** bits) + 2 ** bits) % 2 ** bits;
const H: Record<string, (...a: any[]) => any> = {
  bin: (n: number) => Math.trunc(n).toString(2), oct: (n: number) => Math.trunc(n).toString(8), hex: (n: number) => Math.trunc(n).toString(16).toUpperCase(),
  dec: (s: string | number, base = 2) => parseInt(String(s), base), pad: (s: string | number, n = 8) => String(s).padStart(n, '0'),
  rev: (s: string | number) => String(s).split('').reverse().join(''), tc: (n: number, bits = 8) => tc(n, bits).toString(2).padStart(bits, '0'),
  abs: Math.abs, min: Math.min, max: Math.max, floor: Math.floor, ceil: Math.ceil, round: Math.round, sqrt: Math.sqrt, pow: Math.pow,
  gcd: (a: number, b: number): number => (b ? H.gcd(b, a % b) : Math.abs(a)), mod: (a: number, b: number) => ((a % b) + b) % b,
};
export const HELPERS = Object.keys(H);

/** Compiles one formula over the parameters; throws a readable error for anything not allowed. */
function compile(expr: string, names: string[]): (...v: number[]) => any {
  const e = expr.trim();
  if (!e) throw new Error('Формула бос');
  if (!/^[\w\s+\-*/%().,<>=!?:'"&|^]*$/.test(e) || e.replace(/[!=]==?|[<>]=/g, '').includes('=')) throw new Error(`Рұқсат етілмеген таңба: ${e}`);
  for (const id of e.replace(/'[^']*'|"[^"]*"/g, '').match(/[A-Za-z_]\w*/g) || []) if (!names.includes(id) && !Object.prototype.hasOwnProperty.call(H, id)) throw new Error(`Белгісіз атау «${id}». Параметрлер: ${names.join(', ')}; функциялар: ${HELPERS.join(', ')}`);
  // eslint-disable-next-line no-new-func
  const f = new Function(...Object.keys(H), ...names, `"use strict"; return (${e});`);
  return (...v: number[]) => f(...Object.values(H), ...v);
}

const fill = (tpl: string, names: string[], vals: number[]) => tpl.replace(/\{([^{}]+)\}/g, (_, x) => String(compile(x, names)(...vals)));

/** A tiny seeded random, so the same template gives the same variants until the teacher asks for new ones. */
const rng = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

export function generate(g: Gen, kind: Kind, seed = 1): { vars: Var[]; note: string } {
  const names = g.params.map(p => p.name.trim()).filter(Boolean);
  for (const p of g.params) { if (!/^[a-z]\w*$/i.test(p.name) || Object.prototype.hasOwnProperty.call(H, p.name)) throw new Error(`Параметр атауы қате: «${p.name}»`); if (!(p.to >= p.from)) throw new Error(`${p.name}: «дейін» мәні «бастап»-тан кіші`); }
  const ans = compile(g.answer, names), when = g.when.trim() ? compile(g.when, names) : null;
  const wrong = kind === 'quiz' ? g.wrong.filter(w => w.trim()).map(w => compile(w, names)) : [];
  if (kind === 'quiz' && wrong.length < 1) throw new Error('Тестке кемінде 1 қате жауап формуласы керек');
  const r = rng(seed), out: Var[] = [], seen = new Set<string>();
  const want = Math.max(1, Math.min(26, Math.round(g.count) || 1));
  for (let tries = 0; out.length < want && tries < want * 200; tries++) {
    const vals = g.params.map(p => p.from + Math.floor(r() * (p.to - p.from + 1)));
    if (when && !when(...vals)) continue;
    const q = fill(g.q, names, vals).trim();
    if (!q || seen.has(q)) continue;
    const a = String(ans(...vals));
    if (kind === 'quiz') {
      const opts = [...new Set([a, ...wrong.map(w => String(w(...vals)))])].filter(x => x !== '' && x !== 'NaN' && x !== 'undefined');
      if (opts.length < Math.min(4, wrong.length + 1)) continue; // a wrong answer equals the right one here: pick other numbers
      const at = out.length % opts.length, rest = opts.slice(1);
      rest.splice(at, 0, a);
      out.push({ q, options: rest, answer: at, accept: '', left: [], right: [], why: `${q} → ${a}` });
    } else out.push({ q, options: [], answer: 0, accept: a, left: [], right: [], why: '' });
    seen.add(q);
  }
  return { vars: out, note: out.length < want ? `${want} емес, ${out.length} түрлі нұсқа шықты: параметрлердің ауқымын кеңейтіңіз.` : '' };
}

export const PRESETS: { name: string; kind: Kind; g: Gen }[] = [
  { name: '10 → 2 аудару', kind: 'quiz', g: { q: '{a} санын екілік жүйеге аудар.', params: [{ name: 'a', from: 20, to: 250 }], answer: 'bin(a)', wrong: ['bin(a + 1)', 'bin(a - 2)', 'rev(bin(a))'], when: '', count: 10 } },
  { name: '2 → 10 аудару', kind: 'short', g: { q: '{bin(a)}₂ санын ондық жүйеге аудар.', params: [{ name: 'a', from: 20, to: 250 }], answer: 'a', wrong: [], when: '', count: 10 } },
  { name: '16 → 2 аудару', kind: 'quiz', g: { q: '{hex(a)}₁₆ санын екілік жүйеге аудар.', params: [{ name: 'a', from: 40, to: 250 }], answer: 'bin(a)', wrong: ['bin(a ^ 240)', 'bin(a + 1)', 'bin(mod(a, 16) * 16 + floor(a / 16))'], when: 'mod(a, 16) != floor(a / 16)', count: 10 } },
  { name: 'Теңдеу: x + a = b (екілік)', kind: 'short', g: { q: 'Теңдеуді шеш: x + {bin(a)}₂ = {bin(a + x)}₂. x-ті екілік жүйеде жаз.', params: [{ name: 'a', from: 5, to: 40 }, { name: 'x', from: 5, to: 60 }], answer: 'bin(x)', wrong: [], when: '', count: 10 } },
  { name: 'Аралас жүйелер: x = h₁₆ + o₈ − b₂', kind: 'short', g: { q: 'x₁₀ = {hex(h)}₁₆ + {oct(o)}₈ − {bin(b)}₂. x-ті ондық жүйеде тап.', params: [{ name: 'h', from: 16, to: 80 }, { name: 'o', from: 8, to: 40 }, { name: 'b', from: 3, to: 15 }], answer: 'h + o - b', wrong: [], when: '', count: 10 } },
  { name: 'Қосымша код (8 бит)', kind: 'short', g: { q: '-{a} санын 8 биттік қосымша кодпен жаз.', params: [{ name: 'a', from: 10, to: 120 }], answer: 'tc(-a, 8)', wrong: [], when: '', count: 10 } },
  { name: 'Арифметика: a · b + c', kind: 'quiz', g: { q: '{a} · {b} + {c} = ?', params: [{ name: 'a', from: 3, to: 12 }, { name: 'b', from: 3, to: 12 }, { name: 'c', from: 1, to: 20 }], answer: 'a * b + c', wrong: ['a * b - c', 'a * (b + c)', 'a + b * c'], when: '', count: 10 } },
];
export const blankGen = (): Gen => ({ q: '{a} + {b} = ?', params: [{ name: 'a', from: 1, to: 20 }, { name: 'b', from: 1, to: 20 }], answer: 'a + b', wrong: ['a + b + 1', 'a + b - 1', 'a * b'], when: '', count: 10 });
