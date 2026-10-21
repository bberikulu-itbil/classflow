const WORKER_SRC = `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
let py, out = [];
onmessage = async (e) => {
  const lines = String(e.data.stdin || '').split('\\n'); if (lines[lines.length-1] === '') lines.pop();
  try {
    if (!py) { py = await loadPyodide(); py.setStdout({ batched: s => out.push(s) }); py.setStderr({ batched: s => out.push(s) }); }
    out = [];
    py.setStdin({ stdin: () => (lines.length ? lines.shift() : undefined) });
    await py.runPythonAsync(e.data.code, { globals: py.toPy({ __name__: '__main__' }) });
    postMessage({ ok: true, out: out.join('\\n') });
  } catch (err) {
    postMessage({ ok: false, out: out.join('\\n') + '\\n' + String(err.message || err).split('\\n').slice(-4).join('\\n') });
  }
};`;

let pyW: Worker | null = null;
let pyReady = false;

export function runPy(code: string, stdin = ''): Promise<{ ok: boolean; out: string }> {
  return new Promise(res => {
    if (!pyW) {
      pyW = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
      pyReady = false;
    }
    const w = pyW;
    const t = setTimeout(() => {
      w.terminate();
      if (pyW === w) pyW = null;
      res({ ok: false, out: '⏱ Уақыт бітті (шексіз цикл болуы мүмкін)' });
    }, pyReady ? 6000 : 40000);

    w.onmessage = e => {
      clearTimeout(t);
      pyReady = true;
      res(e.data);
    };
    w.onerror = e => {
      clearTimeout(t);
      res({ ok: false, out: 'Қате: ' + e.message });
    };
    w.postMessage({ code, stdin });
  });
}

export const norm = (x: any) => String(x || '').replace(/\r/g, '').replace(/[ \t]+(?=\n|$)/g, '').replace(/^[ \n\t]+|[ \n\t]+$/g, '');

export async function sha256(x: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x));
  return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
