import * as st from './store';
import type { El, Wall } from './store';

// Pure geometry shared by the 2D plan and the 3D view. Everything is in cm; y grows downwards, like on the plan.
export interface Pt { x: number; y: number }
export interface HSL { h: number; s: number; l: number }
export interface Piece { poly: Pt[]; z0: number; z1: number; c: HSL; op?: number }

export function parseHex(c?: string): HSL | null {
  if (!c || !/^#[0-9a-f]{6}$/i.test(c)) return null;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}
export const hsl = (c: HSL, dl = 0, s = c.s) => `hsl(${Math.round(c.h)} ${Math.round(s)}% ${Math.round(Math.min(97, Math.max(6, c.l + dl)))}%)`;
export const elColor = (e: Pick<El, 't' | 'c'>): HSL => parseHex(e.c) ?? { h: st.EL_TYPES[e.t].hue, s: 55, l: 62 };
export const wallColor = (w: Wall): HSL => parseHex(w.c) ?? { h: 40, s: 8, l: 82 };
export const opColor = (o: st.Opening): HSL => parseHex(o.c) ?? (o.k === 'door' ? { h: 28, s: 55, l: 48 } : { h: 210, s: 15, l: 93 });
const GLASS: HSL = { h: 200, s: 70, l: 80 };

/** Wall as a thick line: quad(s0, s1, t) is the footprint of the part from s0 to s1 cm along the wall, t cm thick. */
export function wallGeo(w: Wall) {
  const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1), dx = (w.x2 - w.x1) / L, dy = (w.y2 - w.y1) / L;
  const at = (s: number, side: number, t: number): Pt => ({ x: w.x1 + dx * s - dy * t * side / 2, y: w.y1 + dy * s + dx * t * side / 2 });
  return { L, quad: (s0: number, s1: number, t = st.thOf(w)): Pt[] => [at(s0, -1, t), at(s1, -1, t), at(s1, 1, t), at(s0, 1, t)], mid: { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 } };
}

/** 3D boxes of one wall: solid chunks (<=100 cm, so depth sorting stays right), the wall above/below openings, frames, glass, door leaves. cap = cut-away height. */
export function wallPieces(w: Wall, cap?: number): Piece[] {
  const g = wallGeo(w), z = Math.min(st.wzOf(w), cap ?? 1e9), wc = wallColor(w), out: Piece[] = [];
  const box = (s0: number, s1: number, z0: number, z1: number, c: HSL, t?: number, op?: number) => { if (s1 > s0 && z1 > z0 && z0 < z) out.push({ poly: g.quad(s0, s1, t), z0, z1: Math.min(z1, z), c, op }); };
  const solid = (s0: number, s1: number) => { const n = Math.max(1, Math.ceil((s1 - s0) / 100)); for (let i = 0; i < n; i++) box(s0 + (s1 - s0) * i / n, s0 + (s1 - s0) * (i + 1) / n, 0, 1e9, wc); };
  let s = 0;
  for (const o of [...(w.ops ?? [])].sort((p, q) => p.at - q.at)) {
    solid(s, o.at); s = o.at + o.wd;
    const sill = st.opSill(o), top = sill + st.opH(o), oc = opColor(o), e = o.at + o.wd;
    box(o.at, e, 0, sill, wc); box(o.at, e, top, 1e9, wc);
    if (cap) continue; // cut-away walls are only a low plinth
    if (o.k === 'door') box(o.at + 3, e - 3, sill, top - 2, oc, 4);
    else {
      box(o.at, o.at + 4, sill, top, oc, 8); box(e - 4, e, sill, top, oc, 8); box(o.at, e, sill, sill + 4, oc, 8); box(o.at, e, top - 4, top, oc, 8);
      box(o.at + 4, e - 4, sill + 4, top - 4, GLASS, 3, 0.45);
    }
  }
  solid(s, g.L);
  return out;
}

const rotN = (r: number, x: number, y: number): [number, number] => (r === 0 ? [x, y] : r === 1 ? [-y, x] : r === 2 ? [-x, -y] : [y, -x]);
/** Simple 3D models. Local frame: x across, y from the back (0) to the front (depth); r turns the front clockwise on the plan. */
export function elParts(e: El): Piece[] {
  const r = (e.r ?? 0) % 4, swap = r % 2 === 1, lw = swap ? e.h : e.w, ld = swap ? e.w : e.h, z = st.zOf(e), main = elColor(e), cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  const dark = { ...main, l: main.l - 18 }, light: HSL = { h: main.h, s: 10, l: 93 };
  const out: Piece[] = [];
  const rot = (lx: number, ly: number): Pt => { const [x, y] = rotN(r, lx - lw / 2, ly - ld / 2); return { x: cx + x, y: cy + y }; };
  const b = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, c: HSL = main, op?: number) => out.push({ poly: [rot(x0, y0), rot(x1, y0), rot(x1, y1), rot(x0, y1)], z0, z1, c, op });
  const legs = (top: number, t = Math.min(5, lw / 4, ld / 4)) => { for (const x of [0, lw - t]) for (const y of [0, ld - t]) b(x, y, x + t, y + t, 0, top, dark); };
  switch (e.t) {
    case 'desk': case 'table': legs(z - 4); b(0, 0, lw, ld, z - 4, z); break;
    case 'pc': { const top = Math.max(z - 35, 20); legs(top - 4); b(0, 0, lw, ld, top - 4, top); b(lw * 0.3, ld * 0.12, lw * 0.7, ld * 0.12 + 4, top, top + 28, dark); b(lw * 0.46, ld * 0.12, lw * 0.54, ld * 0.12 + 9, top, top + 3, dark); b(lw * 0.3, ld * 0.55, lw * 0.7, ld * 0.85, top, top + 2, light); break; }
    case 'chair': { const seat = z * 0.5, t = Math.min(4, lw / 6); legs(seat - 4, t); b(0, 0, lw, ld, seat - 4, seat); b(0, 0, lw, Math.max(4, ld * 0.1), seat, z); break; }
    case 'shelf': b(0, 0, lw, ld, 0, z); b(lw * 0.03, ld, lw * 0.49, ld + 1.5, 4, z - 4, dark); b(lw * 0.51, ld, lw * 0.97, ld + 1.5, 4, z - 4, dark); break;
    case 'board': { const zb = Math.max(z - 110, 20), t = Math.min(ld, 6); b(0, 0, lw, t, zb - 3, z + 3, dark); b(2, 0, lw - 2, t + 2, zb, z, light); break; }
    case 'door': { const m = ld / 2; b(0, m - 4, 5, m + 4, 0, z, dark); b(lw - 5, m - 4, lw, m + 4, 0, z, dark); b(0, m - 4, lw, m + 4, z - 5, z, dark); b(5, m - 2, lw - 5, m + 2, 0, z - 5); break; }
    case 'window': { const m = ld / 2, zs = Math.max(z - 120, 10); b(0, m - 8, lw, m + 8, zs - 3, zs); b(0, m - 3, 4, m + 3, zs, z); b(lw - 4, m - 3, lw, m + 3, zs, z); b(0, m - 3, lw, m + 3, z - 4, z); b(4, m - 1.5, lw - 4, m + 1.5, zs, z - 4, GLASS, 0.45); break; }
    case 'printer': b(0, 0, lw, ld, 0, z * 0.2, dark); b(lw * 0.08, ld * 0.08, lw * 0.92, ld * 0.92, z * 0.2, z * 0.8); b(0, 0, lw, ld, z * 0.8, z, dark); break;
    default: b(0, 0, lw, ld, 0, z);
  }
  return out;
}
export const front = (e: El): [number, number] => rotN((e.r ?? 0) % 4, 0, 1);

/** Quick combos of openings, spread evenly along a wall of length len. Returns null if they do not fit. */
export function spread(kinds: ('door' | 'window')[], len: number, wid = () => Math.random().toString(36).slice(2, 8)): st.Opening[] | null {
  const total = kinds.reduce((a, k) => a + st.OP_W[k], 0), gap = (len - total) / (kinds.length + 1);
  if (gap < 10) return null;
  let at = gap;
  return kinds.map(k => { const o = { id: wid(), k, at: Math.round(at), wd: st.OP_W[k] }; at += st.OP_W[k] + gap; return o; });
}
/** First free place for one more opening, or null. */
export function freeSpot(w: Wall, k: 'door' | 'window'): number | null {
  const len = st.wallLen(w), wd = st.OP_W[k], ops = [...(w.ops ?? [])].sort((p, q) => p.at - q.at);
  let s = 20;
  for (const o of ops) { if (o.at - s >= wd + 10) return s; s = o.at + o.wd + 10; }
  return len - s >= wd + 10 ? s : null;
}
