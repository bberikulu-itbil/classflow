/** Seconds spent in each lesson stage, from the board's slide log (cf_sessions.slide_log: [{i, t}] with t in unix seconds).
 *  A slide without a stage (the title page) counts to the stage before it, the leading ones to the first stage. */
export function stageTimes(log: { i: number; t: number }[], start: number, now: number, stageOf: (i: number) => string | undefined, first: string): Record<string, number> {
  // a log that begins on slide 0 was reset by a lesson switch: its first entry is the start, not the session's start
  const pts = log.length && log[0].i === 0 ? log : [{ i: 0, t: start }, ...log];
  const stage = (i: number) => { for (let j = i; j >= 0; j--) { const s = stageOf(j); if (s) return s; } return first; };
  const out: Record<string, number> = {};
  pts.forEach((p, n) => {
    const end = n + 1 < pts.length ? pts[n + 1].t : now, k = stage(p.i);
    out[k] = (out[k] || 0) + Math.max(0, end - p.t);
  });
  return out;
}
