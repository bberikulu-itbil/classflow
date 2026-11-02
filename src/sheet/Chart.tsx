import React from 'react';
import { parseAddr, addr, literal } from './engine';
import type { ChartCfg } from './format';

const COLORS = ['#2563eb', '#f97316', '#10b981', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899'];
/** Bar / line / pie chart of a range: first column = labels, the other columns = series, a text first row = series names. */
export function ChartView({ cfg, get, onDelete }: { cfg: ChartCfg; get: (a: string) => string; onDelete?: () => void }) {
  const [a, b] = cfg.range.split(':').map(parseAddr);
  if (!a || !b) return null;
  const r0 = Math.min(a[0], b[0]), r1 = Math.max(a[0], b[0]), c0 = Math.min(a[1], b[1]), c1 = Math.max(a[1], b[1]);
  const isNum = (r: number, c: number) => typeof literal(get(addr(r, c))) === 'number' && get(addr(r, c)) !== '';
  const multi = c1 > c0, head = multi && !isNum(r0, c1) && r1 > r0, first = head ? r0 + 1 : r0;
  const labelCol = multi ? c0 : -1, sc = multi ? Array.from({ length: c1 - c0 }, (_, k) => c0 + 1 + k) : [c0];
  const labels = Array.from({ length: r1 - first + 1 }, (_, i) => (labelCol >= 0 ? get(addr(first + i, labelCol)) : String(i + 1)));
  const series = sc.map(c => ({ name: head ? get(addr(r0, c)) : '', v: labels.map((_, i) => Number(get(addr(first + i, c))) || 0) }));
  const W = 420, H = 240, pad = 34, max = Math.max(1, ...series.flatMap(s => s.v)), bw = (W - pad * 1.5) / Math.max(1, labels.length);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 1.6);
  let body: React.ReactNode;
  if (cfg.type === 'pie') {
    const v = series[0]?.v.map(x => Math.max(0, x)) || [], tot = v.reduce((x, z) => x + z, 0) || 1; let ang = -Math.PI / 2;
    body = v.map((x, i) => { const a2 = ang + (x / tot) * 2 * Math.PI, big = a2 - ang > Math.PI ? 1 : 0, cx = 130, cy = 120, R = 90;
      const d = x / tot > 0.9999 ? `M${cx - R},${cy}a${R},${R} 0 1,0 ${2 * R},0a${R},${R} 0 1,0 ${-2 * R},0` : `M${cx},${cy}L${cx + R * Math.cos(ang)},${cy + R * Math.sin(ang)}A${R},${R} 0 ${big} 1 ${cx + R * Math.cos(a2)},${cy + R * Math.sin(a2)}Z`; ang = a2;
      return <g key={i}><path d={d} fill={COLORS[i % 8]} stroke="#fff" /><rect x={250} y={24 + i * 18} width={10} height={10} fill={COLORS[i % 8]} /><text x={266} y={33 + i * 18} fontSize={11} fill="#0f172a">{labels[i]} · {Math.round((x / tot) * 100)}%</text></g>; });
  } else {
    body = <>
      <line x1={pad} y1={H - pad} x2={W - 8} y2={H - pad} stroke="#64748b" /><line x1={pad} y1={14} x2={pad} y2={H - pad} stroke="#64748b" />
      {[0, 0.5, 1].map(t => <text key={t} x={pad - 4} y={y(max * t) + 4} fontSize={10} textAnchor="end" fill="#475569">{+(max * t).toPrecision(3)}</text>)}
      {labels.map((l, i) => <text key={i} x={pad + bw * (i + 0.5)} y={H - pad + 14} fontSize={10} textAnchor="middle" fill="#475569">{l.slice(0, 8)}</text>)}
      {cfg.type === 'bar' ? series.map((s, k) => s.v.map((v, i) => <rect key={k + '-' + i} x={pad + bw * i + (bw * 0.12) + (k * bw * 0.76) / series.length} y={y(v)} width={(bw * 0.76) / series.length} height={H - pad - y(v)} fill={COLORS[k % 8]} />))
        : series.map((s, k) => <g key={k}><polyline fill="none" stroke={COLORS[k % 8]} strokeWidth={2.5} points={s.v.map((v, i) => `${pad + bw * (i + 0.5)},${y(v)}`).join(' ')} />{s.v.map((v, i) => <circle key={i} cx={pad + bw * (i + 0.5)} cy={y(v)} r={3.5} fill={COLORS[k % 8]} />)}</g>)}
      {series.some(s => s.name) && series.map((s, k) => <g key={k}><rect x={W - 110} y={6 + k * 14} width={9} height={9} fill={COLORS[k % 8]} /><text x={W - 96} y={14 + k * 14} fontSize={10} fill="#0f172a">{s.name}</text></g>)}
    </>;
  }
  return (
    <figure data-testid="sheet-chart" data-type={cfg.type} className="relative rounded-xl bg-white p-2">
      <svg viewBox={`0 0 ${cfg.type === 'pie' ? 420 : W} ${H}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label={`${cfg.type} chart ${cfg.range}`}>{body}</svg>
      <figcaption className="text-center text-xs text-slate-500">{cfg.type} · {cfg.range}</figcaption>
      {onDelete && <button type="button" aria-label="Диаграмманы өшіру" className="absolute right-2 top-2 rounded bg-slate-200 px-2 text-slate-700 hover:bg-red-200" onClick={onDelete}>✕</button>}
    </figure>
  );
}
