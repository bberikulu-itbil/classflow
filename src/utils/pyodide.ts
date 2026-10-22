const WORKER_SRC = `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
let py, out = [];
const ready = loadPyodide().then(p => { py = p; py.setStdout({ batched: s => out.push(s) }); py.setStderr({ batched: s => out.push(s) }); postMessage({ ready: true }); })
  .catch(err => postMessage({ loadFailed: String(err.message || err) }));
onmessage = async (e) => {
  await ready;
  if (!py) { postMessage({ ok: false, out: 'Python жүктелмеді' }); return; }
  const lines = String(e.data.stdin || '').split('\\n'); if (lines[lines.length-1] === '') lines.pop();
  try {
    out = [];
    py.setStdin({ stdin: () => (lines.length ? lines.shift() : undefined) });
    await py.runPythonAsync(e.data.code, { globals: py.toPy({ __name__: '__main__' }) });
    postMessage({ ok: true, out: out.join('\\n') });
  } catch (err) {
    postMessage({ ok: false, out: out.join('\\n') + '\\n' + String(err.message || err).split('\\n').slice(-4).join('\\n') });
  }
};`;

// The worker loads Python once; the 6 s run limit starts only after it is ready, so a killed infinite loop costs 6 s, not 40.
type Cur = { w: Worker; ready: Promise<void> };
let cur: Cur | null = null;

function spawn(): Cur {
  const w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
  const ready = new Promise<void>((ok, no) => {
    const t = setTimeout(() => no(new Error('load timeout')), 60000);
    w.onmessage = e => { if (e.data.ready) { clearTimeout(t); ok(); } else if (e.data.loadFailed) { clearTimeout(t); no(new Error(e.data.loadFailed)); } };
    w.onerror = e => { clearTimeout(t); no(new Error(e.message)); };
  });
  ready.catch(() => {});
  return { w, ready };
}

/** Start loading Python in the background (call when a code screen opens). */
export function warmPy() { if (!cur) cur = spawn(); }

export async function runPy(code: string, stdin = ''): Promise<{ ok: boolean; out: string; timedOut?: boolean }> {
  if (!cur) cur = spawn();
  const me = cur;
  try { await me.ready; } catch {
    me.w.terminate(); if (cur === me) cur = null;
    return { ok: false, out: 'Python жүктелмеді. Интернетті тексеріп, қайта көр.' };
  }
  return new Promise(res => {
    const w = me.w;
    const t = setTimeout(() => {
      w.terminate(); if (cur === me) cur = null;
      warmPy();
      res({ ok: false, out: '⏱ Уақыт бітті (шексіз цикл болуы мүмкін)', timedOut: true });
    }, 6000);
    w.onmessage = e => { clearTimeout(t); res(e.data); };
    w.onerror = e => { clearTimeout(t); res({ ok: false, out: 'Қате: ' + e.message }); };
    w.postMessage({ code, stdin });
  });
}

export const norm = (x: any) => String(x || '').replace(/\r/g, '').replace(/[ \t]+(?=\n|$)/g, '').replace(/^[ \n\t]+|[ \n\t]+$/g, '');

export async function sha256(x: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x));
  return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
