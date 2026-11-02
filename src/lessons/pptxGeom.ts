/**
 * Outlines of PowerPoint's preset shapes, in px of the shape's own box (formulas follow presetShapeDefinitions.xml).
 * Only the common presets are here; `presetPath` returns null for the rest and the importer says so.
 */
export type Adj = Record<string, number>;
type P = [number, number];
const f = (n: number) => (Math.round(n * 100) / 100).toString();
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const poly = (pts: P[]) => `M ${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L ')} Z`;
const ell = (cx: number, cy: number, rx: number, ry: number) =>
  rx <= 0 || ry <= 0 ? '' : `M ${f(cx - rx)} ${f(cy)} A ${f(rx)} ${f(ry)} 0 1 1 ${f(cx + rx)} ${f(cy)} A ${f(rx)} ${f(ry)} 0 1 1 ${f(cx - rx)} ${f(cy)} Z`;
/** Rectangle with a (circular) radius per corner: top-left, top-right, bottom-right, bottom-left. */
const rr = (w: number, h: number, [a, b, c, d]: number[]) => {
  const arc = (r: number, x: number, y: number) => (r > 0 ? ` A ${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y)}` : '');
  return `M ${f(a)} 0 H ${f(w - b)}${arc(b, w, b)} V ${f(h - c)}${arc(c, w - c, h)} H ${f(d)}${arc(d, 0, h - d)} V ${f(a)}${arc(a, a, 0)} Z`;
};
/** Regular star / polygon scaled so its bounding box fills the shape, like PowerPoint's hf/vf factors do. */
const fit = (pts: P[], w: number, h: number): P[] => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return pts.map(([x, y]) => [((x - x0) / (x1 - x0 || 1)) * w, ((y - y0) / (y1 - y0 || 1)) * h]);
};
const star = (n: number, inner: number, w: number, h: number) =>
  poly(fit(Array.from({ length: n * 2 }, (_, i): P => { const a = -Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? inner : 1; return [Math.cos(a) * r, Math.sin(a) * r]; }), w, h));
const ngon = (n: number, w: number, h: number) => poly(fit(Array.from({ length: n }, (_, i): P => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [Math.cos(a), Math.sin(a)]; }), w, h));
const transpose = (pts: P[]): P[] => pts.map(([x, y]) => [y, x]);

const rightArrow = (w: number, h: number, a1: number, a2: number): P[] => {
  const ss = Math.min(w, h), A1 = clamp(a1, 0, 100000), A2 = clamp(a2, 0, (100000 * w) / (ss || 1));
  const x1 = w - (ss * A2) / 100000, dy = (h * A1) / 200000, y1 = h / 2 - dy, y2 = h / 2 + dy;
  return [[0, y1], [x1, y1], [x1, 0], [w, h / 2], [x1, h], [x1, y2], [0, y2]];
};
const leftRightArrow = (w: number, h: number, a1: number, a2: number): P[] => {
  const ss = Math.min(w, h), A1 = clamp(a1, 0, 100000), A2 = clamp(a2, 0, (50000 * w) / (ss || 1));
  const dx = (ss * A2) / 100000, x2 = w - dx, dy = (h * A1) / 200000, y1 = h / 2 - dy, y2 = h / 2 + dy;
  return [[0, h / 2], [dx, 0], [dx, y1], [x2, y1], [x2, 0], [w, h / 2], [x2, h], [x2, y2], [dx, y2], [dx, h]];
};

/** Speech-bubble outline: a rectangle (optionally rounded) with a tail towards (tx, ty). */
function callout(w: number, h: number, tx: number, ty: number, r: number) {
  const dxn = (tx - w / 2) / (w || 1), dyn = (ty - h / 2) / (h || 1), vertical = Math.abs(dyn) >= Math.abs(dxn);
  const a = (m: number, lo: number, hi: number) => [m * lo, m * hi];
  const [l1, l2] = a(w, tx < w / 2 ? 2 / 12 : 7 / 12, tx < w / 2 ? 5 / 12 : 10 / 12);
  const [t1, t2] = a(h, ty < h / 2 ? 2 / 12 : 7 / 12, ty < h / 2 ? 5 / 12 : 10 / 12);
  const arc = (x: number, y: number) => (r > 0 ? ` A ${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y)}` : '');
  const top = vertical && dyn < 0 ? ` H ${f(l1)} L ${f(tx)} ${f(ty)} L ${f(l2)} 0` : '';
  const bottom = vertical && dyn >= 0 ? ` H ${f(l2)} L ${f(tx)} ${f(ty)} L ${f(l1)} ${f(h)}` : '';
  const right = !vertical && dxn >= 0 ? ` V ${f(t1)} L ${f(tx)} ${f(ty)} L ${f(w)} ${f(t2)}` : '';
  const left = !vertical && dxn < 0 ? ` V ${f(t2)} L ${f(tx)} ${f(ty)} L 0 ${f(t1)}` : '';
  return `M ${f(r)} 0${top} H ${f(w - r)}${arc(w, r)}${right} V ${f(h - r)}${arc(w - r, h)}${bottom} H ${f(r)}${arc(0, h - r)}${left} V ${f(r)}${arc(r, 0)} Z`;
}

export function presetPath(name: string, w: number, h: number, adj: Adj = {}): string | null {
  const ss = Math.min(w, h), g = (k: string, d: number) => (typeof adj[k] === 'number' ? adj[k] : d);
  switch (name) {
    case 'rect': case 'flowChartProcess': case 'flowChartInternalStorage': return `M 0 0 H ${f(w)} V ${f(h)} H 0 Z`;
    case 'roundRect': { const r = (ss * clamp(g('adj', 16667), 0, 50000)) / 100000; return rr(w, h, [r, r, r, r]); }
    case 'flowChartAlternateProcess': { const r = ss / 6; return rr(w, h, [r, r, r, r]); }
    case 'round1Rect': { const r = (ss * clamp(g('adj', 16667), 0, 50000)) / 100000; return rr(w, h, [0, r, 0, 0]); }
    case 'round2SameRect': { const a = (ss * clamp(g('adj1', 16667), 0, 50000)) / 100000, b = (ss * clamp(g('adj2', 0), 0, 50000)) / 100000; return rr(w, h, [a, a, b, b]); }
    case 'round2DiagRect': { const a = (ss * clamp(g('adj1', 16667), 0, 50000)) / 100000, b = (ss * clamp(g('adj2', 0), 0, 50000)) / 100000; return rr(w, h, [a, b, a, b]); }
    case 'snip1Rect': { const d = (ss * clamp(g('adj', 16667), 0, 50000)) / 100000; return poly([[0, 0], [w - d, 0], [w, d], [w, h], [0, h]]); }
    case 'snip2SameRect': { const a = (ss * clamp(g('adj1', 16667), 0, 50000)) / 100000, b = (ss * clamp(g('adj2', 0), 0, 50000)) / 100000; return poly([[a, 0], [w - a, 0], [w, a], [w, h - b], [w - b, h], [b, h], [0, h - b], [0, a]]); }
    case 'ellipse': case 'flowChartConnector': case 'flowChartOr': case 'flowChartSummingJunction': return ell(w / 2, h / 2, w / 2, h / 2);
    case 'triangle': case 'flowChartExtract': return poly([[name === 'triangle' ? (w * clamp(g('adj', 50000), 0, 100000)) / 100000 : w / 2, 0], [w, h], [0, h]]);
    case 'rtTriangle': return poly([[0, 0], [w, h], [0, h]]);
    case 'diamond': case 'flowChartDecision': return poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]);
    case 'parallelogram': { const x = (ss * clamp(g('adj', 25000), 0, (100000 * w) / (ss || 1))) / 100000; return poly([[x, 0], [w, 0], [w - x, h], [0, h]]); }
    case 'flowChartInputOutput': case 'flowChartData': return poly([[w / 5, 0], [w, 0], [(w * 4) / 5, h], [0, h]]);
    case 'trapezoid': { const x = (ss * clamp(g('adj', 25000), 0, (50000 * w) / (ss || 1))) / 100000; return poly([[x, 0], [w - x, 0], [w, h], [0, h]]); }
    case 'flowChartManualOperation': return poly([[0, 0], [w, 0], [(w * 4) / 5, h], [w / 5, h]]);
    case 'flowChartPreparation': case 'hexagon': {
      const x = name === 'hexagon' ? (ss * clamp(g('adj', 25000), 0, (50000 * w) / (ss || 1))) / 100000 : w / 5;
      return poly([[0, h / 2], [x, 0], [w - x, 0], [w, h / 2], [w - x, h], [x, h]]);
    }
    case 'octagon': { const x = (ss * clamp(g('adj', 29289), 0, 50000)) / 100000; return poly([[0, x], [x, 0], [w - x, 0], [w, x], [w, h - x], [w - x, h], [x, h], [0, h - x]]); }
    case 'pentagon': return ngon(5, w, h);
    case 'homePlate': { const x = w - (ss * clamp(g('adj', 50000), 0, (100000 * w) / (ss || 1))) / 100000; return poly([[0, 0], [x, 0], [w, h / 2], [x, h], [0, h]]); }
    case 'chevron': { const x1 = (ss * clamp(g('adj', 50000), 0, (100000 * w) / (ss || 1))) / 100000; return poly([[0, 0], [w - x1, 0], [w, h / 2], [w - x1, h], [0, h], [x1, h / 2]]); }
    case 'star4': return star(4, clamp(g('adj', 12500), 0, 50000) / 50000, w, h);
    case 'star5': return star(5, clamp(g('adj', 19098), 0, 50000) / 50000, w, h);
    case 'star6': return star(6, clamp(g('adj', 28868), 0, 50000) / 50000, w, h);
    case 'star8': return star(8, clamp(g('adj', 37500), 0, 50000) / 50000, w, h);
    case 'star10': return star(10, clamp(g('adj', 42533), 0, 50000) / 50000, w, h);
    case 'star12': return star(12, clamp(g('adj', 37500), 0, 50000) / 50000, w, h);
    case 'rightArrow': return poly(rightArrow(w, h, g('adj1', 50000), g('adj2', 50000)));
    case 'leftArrow': return poly(rightArrow(w, h, g('adj1', 50000), g('adj2', 50000)).map(([x, y]) => [w - x, y]));
    case 'downArrow': return poly(transpose(rightArrow(h, w, g('adj1', 50000), g('adj2', 50000))));
    case 'upArrow': return poly(transpose(rightArrow(h, w, g('adj1', 50000), g('adj2', 50000))).map(([x, y]) => [x, h - y]));
    case 'leftRightArrow': return poly(leftRightArrow(w, h, g('adj1', 50000), g('adj2', 50000)));
    case 'upDownArrow': return poly(transpose(leftRightArrow(h, w, g('adj1', 50000), g('adj2', 50000))));
    case 'plus': case 'mathPlus': { const x = (ss * clamp(g('adj', name === 'plus' ? 25000 : 23520), 0, 50000)) / 100000; return poly([[x, 0], [w - x, 0], [w - x, x], [w, x], [w, h - x], [w - x, h - x], [w - x, h], [x, h], [x, h - x], [0, h - x], [0, x], [x, x]]); }
    case 'donut': { const d = (ss * clamp(g('adj', 25000), 0, 50000)) / 100000; return ell(w / 2, h / 2, w / 2, h / 2) + ' ' + ell(w / 2, h / 2, w / 2 - d, h / 2 - d); }
    case 'frame': { const d = (ss * clamp(g('adj1', 12500), 0, 50000)) / 100000; return `M 0 0 H ${f(w)} V ${f(h)} H 0 Z M ${f(d)} ${f(d)} V ${f(h - d)} H ${f(w - d)} V ${f(d)} Z`; }
    case 'can': {
      const y = (ss * clamp(g('adj', 25000), 0, (50000 * h) / (ss || 1))) / 200000;
      return `M 0 ${f(y)} A ${f(w / 2)} ${f(y)} 0 0 1 ${f(w)} ${f(y)} V ${f(h - y)} A ${f(w / 2)} ${f(y)} 0 0 1 0 ${f(h - y)} Z M 0 ${f(y)} A ${f(w / 2)} ${f(y)} 0 0 0 ${f(w)} ${f(y)}`;
    }
    case 'flowChartTerminator': { const rx = w * 0.1609, ry = h / 2; return `M ${f(rx)} 0 H ${f(w - rx)} A ${f(rx)} ${f(ry)} 0 0 1 ${f(w - rx)} ${f(h)} H ${f(rx)} A ${f(rx)} ${f(ry)} 0 0 1 ${f(rx)} 0 Z`; }
    case 'flowChartPredefinedProcess': return `M 0 0 H ${f(w)} V ${f(h)} H 0 Z M ${f(w / 8)} 0 V ${f(h)} M ${f((w * 7) / 8)} 0 V ${f(h)}`;
    case 'wedgeRectCallout': return callout(w, h, w / 2 + (w * g('adj1', -20833)) / 100000, h / 2 + (h * g('adj2', 62500)) / 100000, 0);
    case 'wedgeRoundRectCallout': return callout(w, h, w / 2 + (w * g('adj1', -20833)) / 100000, h / 2 + (h * g('adj2', 62500)) / 100000, (ss * clamp(g('adj3', 16667), 0, 50000)) / 100000);
    case 'line': case 'straightConnector1': return `M 0 0 L ${f(w)} ${f(h)}`;
    case 'bentConnector2': return `M 0 0 H ${f(w)} V ${f(h)}`;
    case 'bentConnector3': return `M 0 0 H ${f((w * g('adj1', 50000)) / 100000)} V ${f(h)} H ${f(w)}`;
    case 'bentConnector4': return `M 0 0 H ${f((w * g('adj1', 50000)) / 100000)} V ${f((h * g('adj2', 50000)) / 100000)} H ${f(w)} V ${f(h)}`;
    case 'bentConnector5': return `M 0 0 H ${f((w * g('adj1', 50000)) / 100000)} V ${f((h * g('adj2', 50000)) / 100000)} H ${f((w * g('adj3', 50000)) / 100000)} V ${f(h)} H ${f(w)}`;
    case 'curvedConnector2': return `M 0 0 C ${f(w / 2)} 0 ${f(w)} ${f(h / 2)} ${f(w)} ${f(h)}`;
    case 'curvedConnector3': case 'curvedConnector4': case 'curvedConnector5': {
      const x2 = (w * g('adj1', 50000)) / 100000;
      return `M 0 0 C ${f(x2 / 2)} 0 ${f(x2)} ${f(h / 4)} ${f(x2)} ${f(h / 2)} C ${f(x2)} ${f((h * 3) / 4)} ${f((w + x2) / 2)} ${f(h)} ${f(w)} ${f(h)}`;
    }
    default: return null;
  }
}

/** Where text sits inside a preset (its `a:rect` in presetShapeDefinitions), as insets [left, top, right, bottom] in px. */
export function presetTextInset(name: string, w: number, h: number, adj: Adj = {}): [number, number, number, number] {
  const ss = Math.min(w, h), g = (k: string, d: number) => (typeof adj[k] === 'number' ? adj[k] : d);
  // parallelogram and hexagon share the same text-rectangle formula
  const slant = (maxAdj: number, a: number) => {
    const q1 = -maxAdj / 2, q2 = (a + q1) / maxAdj, up = q2 > 0, q5 = up ? q1 : 0, q6 = (a + q5) / q1;
    return (up ? 4 : 2) - (q6 * (up ? 3 : 2));
  };
  switch (name) {
    case 'ellipse': case 'flowChartConnector': return [w * 0.14645, h * 0.14645, w * 0.14645, h * 0.14645];
    case 'roundRect': { const i = (ss * clamp(g('adj', 16667), 0, 50000) * 0.29289) / 100000; return [i, i, i, i]; }
    case 'diamond': case 'flowChartDecision': return [w / 4, h / 4, w / 4, h / 4];
    case 'triangle': { const x1 = (w * clamp(g('adj', 50000), 0, 100000)) / 200000; return [x1, h / 2, w - (x1 + w / 2), 0]; }
    case 'parallelogram': { const m = (100000 * w) / (ss || 1), q = slant(m, clamp(g('adj', 25000), 0, m)); return [(w * q) / 24, (h * q) / 24, (w * q) / 24, (h * q) / 24]; }
    case 'hexagon': { const m = (50000 * w) / (ss || 1), q = slant(m, clamp(g('adj', 25000), 0, m)); return [(w * q) / 24, (h * q) / 24, (w * q) / 24, (h * q) / 24]; }
    case 'trapezoid': { const m = (50000 * w) / (ss || 1), a = clamp(g('adj', 25000), 0, m); return [((w / 3) * a) / m, ((h / 3) * a) / m, ((w / 3) * a) / m, 0]; }
    case 'chevron': { const x1 = (ss * clamp(g('adj', 50000), 0, (100000 * w) / (ss || 1))) / 100000; return w - x1 > x1 ? [x1, 0, x1, 0] : [0, 0, 0, 0]; }
    case 'homePlate': { const dx = (ss * clamp(g('adj', 50000), 0, (100000 * w) / (ss || 1))) / 100000; return [0, 0, dx / 2, 0]; }
    case 'octagon': { const x1 = (ss * clamp(g('adj', 29289), 0, 50000)) / 100000; return [x1 / 2, x1 / 2, x1 / 2, x1 / 2]; }
    case 'star5': return [w * 0.3, h * 0.38, w * 0.3, h * 0.2];
    default: return [0, 0, 0, 0];
  }
}

/** SVG elliptical arc for OOXML arcTo (start angle and sweep in degrees, ellipse "visual" angles). */
export function arcSeg(x0: number, y0: number, wR: number, hR: number, stDeg: number, swDeg: number) {
  const rad = (d: number) => (d * Math.PI) / 180, par = (a: number) => Math.atan2(Math.sin(rad(a)) / hR, Math.cos(rad(a)) / wR);
  const t1 = par(stDeg);
  let t2 = par(stDeg + swDeg);
  if (swDeg > 0) while (t2 <= t1) t2 += 2 * Math.PI; else while (t2 >= t1) t2 -= 2 * Math.PI;
  const cx = x0 - wR * Math.cos(t1), cy = y0 - hR * Math.sin(t1), x = cx + wR * Math.cos(t2), y = cy + hR * Math.sin(t2);
  return { rx: wR, ry: hR, large: Math.abs(t2 - t1) > Math.PI ? 1 : 0, sweep: swDeg > 0 ? 1 : 0, x, y };
}
