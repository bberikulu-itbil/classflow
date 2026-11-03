// Mini spreadsheet engine for in-lesson tables: A1 references ($ allowed), ranges, + - * / ^ & comparisons, and the functions the
// 8th-grade course uses. No dependencies. Function arguments may be separated by ";" (the textbook) or ",".
export type Cells = Record<string, string>; // 'A1' -> what the student typed
export type Val = number | string | boolean;
type Node = { t: 'n'; v: number } | { t: 's'; v: string } | { t: 'ref'; r: string } | { t: 'rng'; a: string; b: string }
  | { t: 'bin'; op: string; l: Node; r: Node } | { t: 'neg'; e: Node } | { t: 'pct'; e: Node } | { t: 'fn'; name: string; args: Node[] };

export const colName = (c: number) => { let s = ''; for (c++; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s; return s; };
export const colIndex = (s: string) => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
export const addr = (r: number, c: number) => colName(c) + (r + 1); // zero-based
export const parseAddr = (a: string): [number, number] | null => { const m = /^\$?([A-Z]{1,2})\$?(\d{1,3})$/.exec(a.toUpperCase()); return m ? [+m[2] - 1, colIndex(m[1])] : null; };

const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|"([^"]*)"|(\$?[A-Za-z]{1,2}\$?\d+)(?![\w(])|([A-Za-z][A-Za-z0-9.]*)\s*\(|(<=|>=|<>|[-+*/^&=<>(),;:%]))/y;
function parse(src: string): Node {
  const toks: { k: string; v: string }[] = []; TOKEN.lastIndex = 0;
  for (let m: RegExpExecArray | null; TOKEN.lastIndex < src.length && (m = TOKEN.exec(src));) {
    toks.push(m[1] != null ? { k: 'n', v: m[1] } : m[2] != null ? { k: 's', v: m[2] } : m[3] ? { k: 'ref', v: m[3] } : m[4] ? { k: 'fn', v: m[4] } : { k: 'op', v: m[5] });
  }
  if (src.slice(TOKEN.lastIndex).trim()) throw new Error('#ERROR!');
  let i = 0;
  const peek = () => toks[i], op = (v: string) => peek()?.k === 'op' && peek().v === v;
  const eat = (v: string) => { if (!op(v)) throw new Error('#ERROR!'); i++; };
  const level = (ops: string[], next: () => Node) => () => { let l = next(); while (peek()?.k === 'op' && ops.includes(peek().v)) { const o = toks[i++].v; l = { t: 'bin', op: o, l, r: next() }; } return l; };
  const primary = (): Node => {
    const t = toks[i++]; if (!t) throw new Error('#ERROR!');
    if (t.k === 'n') return { t: 'n', v: +t.v };
    if (t.k === 's') return { t: 's', v: t.v };
    if (t.k === 'ref') { if (op(':')) { i++; const b = toks[i++]; if (!b || b.k !== 'ref') throw new Error('#ERROR!'); return { t: 'rng', a: t.v, b: b.v }; } return { t: 'ref', r: t.v }; }
    if (t.k === 'fn') { const args: Node[] = []; if (!op(')')) { do { args.push(cmp()); } while ((op(',') || op(';')) && ++i); } eat(')'); return { t: 'fn', name: t.v.toUpperCase(), args }; }
    if (t.v === '(') { const e = cmp(); eat(')'); return e; }
    throw new Error('#ERROR!');
  };
  const postfix = (): Node => { let e = primary(); while (op('%')) { i++; e = { t: 'pct', e }; } return e; };
  const unary = (): Node => { if (op('-')) { i++; return { t: 'neg', e: unary() }; } if (op('+')) { i++; return unary(); } return postfix(); };
  const power = level(['^'], unary), mul = level(['*', '/'], power), add = level(['+', '-'], mul), cat = level(['&'], add);
  const cmp: () => Node = level(['=', '<>', '<', '>', '<=', '>='], cat);
  const root = cmp(); if (i < toks.length) throw new Error('#ERROR!'); return root;
}

const isErr = (v: unknown): v is string => typeof v === 'string' && /^#[A-Z/0!?]+[!?]?$/.test(v) && v.startsWith('#');
const fail = (e: string): never => { throw new Error(e); };
/** What a typed text means: a number (dot or comma decimals), TRUE/FALSE, or plain text. */
export function literal(raw: string): Val {
  const t = raw.trim();
  if (/^-?\d+([.,]\d+)?$/.test(t)) return parseFloat(t.replace(',', '.'));
  const d = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t); // 17.09.2016 is a date: stored as days since 1899-12-30
  if (d && +d[2] >= 1 && +d[2] <= 12 && +d[1] >= 1 && +d[1] <= 31) return Math.round((Date.UTC(+d[3], +d[2] - 1, +d[1]) - Date.UTC(1899, 11, 30)) / 864e5);
  if (/^%$/.test(t)) return t;
  if (/^-?\d+([.,]\d+)?%$/.test(t)) return parseFloat(t.replace(',', '.')) / 100;
  return raw;
}
export function show(v: Val): string { return typeof v === 'number' ? String(+v.toPrecision(12)) : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : v; }

/** Evaluates every cell on demand; returns a getter for the displayed value ('' for an empty cell, '#DIV/0!' etc. for errors). */
export function evaluator(cells: Cells) {
  const memo = new Map<string, Val>(), busy = new Set<string>(), asts = new Map<string, Node>();
  const norm = (a: string) => a.replace(/\$/g, '').toUpperCase();
  const cell = (a: string): Val => {
    a = norm(a); if (!parseAddr(a)) return fail('#REF!');
    if (memo.has(a)) return memo.get(a)!;
    if (busy.has(a)) return fail('#CIRC!');
    const raw = cells[a] ?? ''; busy.add(a);
    try {
      let v: Val = '';
      if (raw.startsWith('=')) { let n = asts.get(raw); if (!n) { n = parse(raw.slice(1)); asts.set(raw, n); } const r = run(n); v = Array.isArray(r) ? (r[0] ?? '') : r; if (v === '') v = 0; /* =Z9 of an empty cell shows 0 */ } else v = literal(raw);
      memo.set(a, v); return v;
    } finally { busy.delete(a); }
  };
  const range = (a: string, b: string): Val[] => {
    const p = parseAddr(a), q = parseAddr(b); if (!p || !q) return fail('#REF!');
    const out: Val[] = [];
    for (let r = Math.min(p[0], q[0]); r <= Math.max(p[0], q[0]); r++) for (let c = Math.min(p[1], q[1]); c <= Math.max(p[1], q[1]); c++) out.push(cell(addr(r, c)));
    return out;
  };
  const num = (v: Val | Val[]): number => {
    const x = Array.isArray(v) ? v[0] : v;
    if (typeof x === 'number') return x; if (typeof x === 'boolean') return +x; if (x === '') return 0;
    const n = typeof x === 'string' && /^-?\d+([.,]\d+)?$/.test(x.trim()) ? parseFloat(x.replace(',', '.')) : NaN; return Number.isNaN(n) ? fail('#VALUE!') : n;
  };
  const nums = (args: Node[]): number[] => args.flatMap(a => { const r = run(a); return Array.isArray(r) ? r.filter((x): x is number => typeof x === 'number') : [num(r)]; });
  const matches = (v: Val, crit: Val): boolean => {
    const m = typeof crit === 'string' ? /^(<=|>=|<>|<|>|=)?(.*)$/.exec(crit) : null;
    const o = m ? m[1] || '=' : '=', want = m ? literal(m[2]) : crit;
    const eq = typeof v === 'string' || typeof want === 'string' ? String(v).toLowerCase() === String(want).toLowerCase() : v === want;
    if (o === '=') return eq; if (o === '<>') return !eq;
    if (typeof v !== 'number' || typeof want !== 'number') return false;
    return o === '<' ? v < want : o === '>' ? v > want : o === '<=' ? v <= want : v >= want;
  };
  const rangeOf = (n: Node): Val[] => { const r = run(n); return Array.isArray(r) ? r : [r]; };
  const FN: Record<string, (a: Node[]) => Val> = {
    SUM: a => nums(a).reduce((x, y) => x + y, 0),
    AVERAGE: a => { const n = nums(a); return n.length ? n.reduce((x, y) => x + y, 0) / n.length : fail('#DIV/0!'); },
    COUNT: a => nums(a).length,
    MAX: a => { const n = nums(a); return n.length ? Math.max(...n) : 0; },
    MIN: a => { const n = nums(a); return n.length ? Math.min(...n) : 0; },
    MEDIAN: a => { const n = nums(a).sort((x, y) => x - y), m = n.length >> 1; return n.length ? (n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2) : fail('#NUM!'); },
    MODE: a => { const n = nums(a), c = new Map<number, number>(); n.forEach(x => c.set(x, (c.get(x) || 0) + 1)); let best = NaN, k = 1; for (const x of n) if (c.get(x)! > k) { best = x; k = c.get(x)!; } return Number.isNaN(best) ? fail('#N/A') : best; },
    COUNTA: a => a.flatMap(x => { const r = run(x); return Array.isArray(r) ? r : [r]; }).filter(v => v !== '' && v != null).length,
    LARGE: a => { const n = nums([a[0]]).sort((x, y) => y - x), k = num(run(a[1])); return k >= 1 && k <= n.length ? n[k - 1] : fail('#NUM!'); },
    SMALL: a => { const n = nums([a[0]]).sort((x, y) => x - y), k = num(run(a[1])); return k >= 1 && k <= n.length ? n[k - 1] : fail('#NUM!'); },
    AVERAGEIF: a => { const r = rangeOf(a[0]), c = num2(a[1]), s = a[2] ? rangeOf(a[2]) : r; const xs = r.flatMap((v, i) => (matches(v, c) && typeof s[i] === 'number' ? [s[i] as number] : [])); return xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : fail('#DIV/0!'); },
    SUMIF: a => { const r = rangeOf(a[0]), c = num2(a[1]), s = a[2] ? rangeOf(a[2]) : r; return r.reduce<number>((t, v, i) => t + (matches(v, c) && typeof s[i] === 'number' ? (s[i] as number) : 0), 0); },
    COUNTIF: a => { const r = rangeOf(a[0]), c = num2(a[1]); return r.filter(v => matches(v, c)).length; },
    SUMPRODUCT: a => { const L = a.map(rangeOf); return L[0].reduce<number>((t, _, i) => t + L.reduce((p, l) => p * (typeof l[i] === 'number' ? (l[i] as number) : 0), 1), 0); },
    IF: a => (truthy(run(a[0])) ? val(a[1]) : a[2] ? val(a[2]) : false),
    AND: a => a.every(x => truthy(run(x))), OR: a => a.some(x => truthy(run(x))), NOT: a => !truthy(run(a[0])),
    ABS: a => Math.abs(num(run(a[0]))), SQRT: a => { const x = num(run(a[0])); return x < 0 ? fail('#NUM!') : Math.sqrt(x); },
    INT: a => Math.floor(num(run(a[0]))), MOD: a => { const d = num(run(a[1])); return d === 0 ? fail('#DIV/0!') : num(run(a[0])) - d * Math.floor(num(run(a[0])) / d); },
    POWER: a => Math.pow(num(run(a[0])), num(run(a[1]))),
    ROUND: a => { const k = 10 ** (a[1] ? num(run(a[1])) : 0); return Math.round(num(run(a[0])) * k) / k; },
    CEILING: a => { const s = a[1] ? num(run(a[1])) : 1; return s === 0 ? 0 : Math.ceil(num(run(a[0])) / s) * s; },
    FLOOR: a => { const s = a[1] ? num(run(a[1])) : 1; return s === 0 ? 0 : Math.floor(num(run(a[0])) / s) * s; },
  };
  const num2 = (n: Node): Val => val(n);
  const truthy = (v: Val | Val[]) => { const x = Array.isArray(v) ? v[0] : v; return typeof x === 'string' ? x.toUpperCase() === 'TRUE' : !!x; };
  const val = (n: Node): Val => { const r = run(n); return Array.isArray(r) ? r[0] ?? '' : r; };
  function run(n: Node): Val | Val[] {
    switch (n.t) {
      case 'n': case 's': return n.v;
      case 'ref': return cell(n.r);
      case 'rng': return range(n.a, n.b);
      case 'neg': return -num(run(n.e));
      case 'pct': return num(run(n.e)) / 100;
      case 'fn': { const f = FN[n.name]; return f ? f(n.args) : fail('#NAME?'); }
      case 'bin': {
        const l = val(n.l), r = val(n.r);
        switch (n.op) {
          case '+': return num(l) + num(r); case '-': return num(l) - num(r); case '*': return num(l) * num(r);
          case '/': return num(r) === 0 ? fail('#DIV/0!') : num(l) / num(r);
          case '^': return Math.pow(num(l), num(r));
          case '&': return show(l) + show(r);
          default: { const a = typeof l === 'string' || typeof r === 'string' ? String(l).toLowerCase() : l, b = typeof l === 'string' || typeof r === 'string' ? String(r).toLowerCase() : r;
            return n.op === '=' ? a === b : n.op === '<>' ? a !== b : n.op === '<' ? a < b : n.op === '>' ? a > b : n.op === '<=' ? a <= b : a >= b; }
        }
      }
    }
  }
  return (a: string): string => {
    try { const v = cell(a); return v === '' ? '' : show(v); } catch (e) { const m = e instanceof Error ? e.message : '#ERROR!'; return isErr(m) ? m : '#ERROR!'; }
  };
}

/** Moves the relative parts of A1 references in a formula by (dr, dc); $-fixed parts stay. Used for copy-paste and fill. */
export function shiftFormula(f: string, dr: number, dc: number): string {
  if (!f.startsWith('=')) return f;
  return f.split(/("[^"]*")/).map(part => part.startsWith('"') ? part : part.replace(/(\$?)([A-Za-z]{1,2})(\$?)(\d+)(?![\w(])/g, (_, d1, col, d2, row) => {
    const c = d1 ? colIndex(col.toUpperCase()) : colIndex(col.toUpperCase()) + dc, r = d2 ? +row - 1 : +row - 1 + dr;
    return c < 0 || r < 0 ? '#REF!' : `${d1}${colName(c)}${d2}${r + 1}`;
  })).join('');
}

/** Fill `cells` from the source block (rows r0..r1, cols c0..c1) down/right to the target edge. Two numbers in a line continue as a series. */
export function fill(cells: Cells, r0: number, c0: number, r1: number, c1: number, toR: number, toC: number): Cells {
  const out = { ...cells }, down = toR > r1, right = toC > c1; if (!down && !right) return out;
  const nlines = down ? c1 - c0 + 1 : r1 - r0 + 1, len = down ? r1 - r0 + 1 : c1 - c0 + 1, end = down ? toR : toC, start = down ? r1 : c1;
  for (let k = 0; k < nlines; k++) {
    const at = (i: number) => (down ? addr(r0 + i, c0 + k) : addr(r0 + k, c0 + i));
    const raws = Array.from({ length: len }, (_, i) => cells[at(i)] ?? '');
    const series = len >= 2 && raws.slice(-2).every(x => /^-?\d+(\.\d+)?$/.test(x.trim())) && !raws.some(x => x.startsWith('='));
    const step = series ? parseFloat(raws[len - 1]) - parseFloat(raws[len - 2]) : 0;
    for (let p = start + 1; p <= end; p++) {
      const i = p - start - 1, srcIdx = i % len, src = raws[srcIdx];
      const to = down ? addr(p, c0 + k) : addr(r0 + k, p);
      const delta = p - (down ? r0 : c0) - srcIdx; // distance from the source cell
      out[to] = series ? String(+(parseFloat(raws[len - 1]) + step * (i + 1)).toPrecision(12)) : src.startsWith('=') ? shiftFormula(src, down ? delta : 0, down ? 0 : delta) : src;
      if (out[to] === '') delete out[to];
    }
  }
  return out;
}
