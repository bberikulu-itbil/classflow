// How an SQL answer is compared: by the table it returns, not by the text of the query.
// The rows are written in a canonical form and hashed; a lesson stores the hash of the expected table in `accept`
// and the student's browser sends the hash of its own result (the server compares the two strings like any short answer).

export type Row = (string | number | null | Uint8Array)[];

const cell = (v: Row[number]) => v == null ? '' : typeof v === 'number' ? String(+v.toFixed(2)) : v instanceof Uint8Array ? '[blob]' : String(v).trim().toLowerCase();

/** Rows in a canonical text. Without `ordered` the row order does not matter (a SELECT without ORDER BY has none). Column names are ignored. */
export const canon = (rows: Row[], ordered = false) => {
  const lines = rows.map(r => r.map(cell).join('|'));
  return (ordered ? lines : [...lines].sort()).join('\n');
};

/** FNV-1a, 32 bits, as 8 hex digits: short, lower-case and the same in the browser and in Node. */
export const fnv = (s: string) => {
  let h = 0x811c9dc5;
  for (const ch of new TextEncoder().encode(s)) { h ^= ch; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
};

export const answerOf = (rows: Row[], ordered = false) => fnv(canon(rows, ordered));
