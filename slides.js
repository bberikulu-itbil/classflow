// ClassFlow: DOM helper, слайд рендері және кіріктірілген виджеттер (Python, логикалық вентильдер, сәйкестендіру, карточкалар)
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(9).forEach(c => c != null && c !== false && e.append(c.nodeType ? c : document.createTextNode(String(c))));
  return e;
}

const BTN = 'px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm font-semibold transition';
const BTN_P = 'px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition';
const BTN_G = 'px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold transition disabled:opacity-50';
const INP = 'w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-sm outline-none focus:border-blue-500';

const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- Python (Pyodide) веб-воркерде: шексіз цикл бетті қатырмайды, 6 с-тан кейін тоқтатылады ----------
const WORKER_SRC = `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
let py, out = [];
onmessage = async (e) => {
  try {
    if (!py) { py = await loadPyodide(); py.setStdout({ batched: s => out.push(s) }); py.setStderr({ batched: s => out.push(s) }); }
    out = [];
    await py.runPythonAsync(e.data);
    postMessage({ ok: true, out: out.join('\\n') });
  } catch (err) {
    postMessage({ ok: false, out: out.join('\\n') + '\\n' + String(err.message || err).split('\\n').slice(-4).join('\\n') });
  }
};`;
let pyW = null, pyReady = false;
function runPy(code) {
  return new Promise(res => {
    if (!pyW) { pyW = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }))); pyReady = false; }
    const w = pyW;
    const t = setTimeout(() => { w.terminate(); if (pyW === w) pyW = null; res({ ok: false, out: '⏱ Уақыт бітті (шексіз цикл болуы мүмкін)' }); }, pyReady ? 6000 : 40000);
    w.onmessage = e => { clearTimeout(t); pyReady = true; res(e.data); };
    w.onerror = e => { clearTimeout(t); res({ ok: false, out: 'Қате: ' + e.message }); };
    w.postMessage(code);
  });
}

function codeBox(starter) {
  const ta = h('textarea', { class: 'w-full h-48 bg-slate-950 text-emerald-300 font-mono text-sm p-3 rounded-xl outline-none', spellcheck: 'false' }, starter || '');
  ta.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('    ', s, ta.selectionEnd, 'end'); }
  });
  const out = h('pre', { class: 'mt-2 p-3 bg-black rounded-xl text-xs text-slate-200 whitespace-pre-wrap min-h-[3rem]' }, '▶ Нәтиже осында шығады (input() қолдамайды)');
  const btn = h('button', { class: BTN_G + ' mt-2', onclick: async () => {
    btn.disabled = true; out.textContent = '⏳ Орындалуда (алғашқы рет Python жүктеледі)...';
    const r = await runPy(ta.value); out.textContent = r.out || '(шығыс жоқ)'; btn.disabled = false;
  } }, '▶ Іске қосу');
  return { el: h('div', {}, ta, btn, out), code: () => ta.value, output: () => out.textContent };
}

// ---------- виджеттер ----------
function flashcards(cards) {
  return h('div', { class: 'grid grid-cols-2 md:grid-cols-3 gap-3' }, (cards || []).map(c => {
    let back = false;
    const b = h('button', { class: 'min-h-[7rem] p-4 rounded-2xl bg-slate-800 border-2 border-slate-600 text-lg font-bold hover:border-blue-500 transition', onclick: () => {
      back = !back; b.textContent = back ? c.back : c.front; b.classList.toggle('bg-emerald-700', back);
    } }, c.front);
    return b;
  }));
}

function matching(pairs) {
  pairs = pairs || [];
  const rights = shuffle(pairs.map((p, i) => ({ t: p.r, i })));
  let selL = null, done = 0;
  const status = h('div', { class: 'text-sm text-slate-400 mt-3' }, `0 / ${pairs.length}`);
  const mk = (it, side) => {
    const b = h('button', { class: 'w-full text-left p-3 rounded-xl bg-slate-800 border-2 border-slate-600 font-semibold', onclick: () => {
      if (b.dataset.done) return;
      if (side === 'l') { if (selL) selL.classList.remove('border-blue-500'); selL = b; b.classList.add('border-blue-500'); return; }
      if (!selL) return;
      if (+selL.dataset.i === it.i) {
        [selL, b].forEach(x => { x.dataset.done = 1; x.className = 'w-full text-left p-3 rounded-xl bg-emerald-700 font-semibold opacity-80'; });
        selL = null; status.textContent = `${++done} / ${pairs.length}`;
      } else { b.classList.add('border-red-500'); setTimeout(() => b.classList.remove('border-red-500'), 500); }
    } }, it.t);
    b.dataset.i = it.i; return b;
  };
  return h('div', {}, h('div', { class: 'grid grid-cols-2 gap-4' },
    h('div', { class: 'space-y-2' }, pairs.map((p, i) => mk({ t: p.l, i }, 'l'))),
    h('div', { class: 'space-y-2' }, rights.map(r => mk(r, 'r')))), status);
}

function logicGate(initial) {
  let g = initial || 'AND', a = 0, b = 0;
  const f = (g, a, b) => ({ AND: a & b, OR: a | b, XOR: a ^ b, NOT: a ? 0 : 1 })[g];
  const root = h('div', { class: 'space-y-3' });
  const draw = () => {
    const out = f(g, a, b), rows = g === 'NOT' ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
    root.replaceChildren(
      h('div', { class: 'flex gap-2' }, ['AND', 'OR', 'XOR', 'NOT'].map(x => h('button', { class: x === g ? BTN_P : BTN, onclick: () => { g = x; draw(); } }, x))),
      h('div', { class: 'flex items-center gap-6 text-xl font-mono' },
        h('button', { class: a ? BTN_G : BTN, onclick: () => { a ^= 1; draw(); } }, 'A=' + a),
        g !== 'NOT' && h('button', { class: b ? BTN_G : BTN, onclick: () => { b ^= 1; draw(); } }, 'B=' + b),
        h('div', { class: 'px-4 py-2 rounded-xl bg-indigo-900 border border-indigo-500 font-black' }, g),
        h('div', { class: 'w-14 h-14 rounded-full flex items-center justify-center text-2xl ' + (out ? 'bg-amber-400 text-slate-900' : 'bg-slate-700') }, out)),
      h('table', { class: 'text-center font-mono text-sm' }, rows.map(r => {
        const hit = r[0] === a && (g === 'NOT' || r[1] === b);
        return h('tr', { class: hit ? 'bg-emerald-900' : '' }, r.map(v => h('td', { class: 'px-4 py-1' }, v)), h('td', { class: 'px-4 py-1 font-bold text-emerald-400' }, '= ' + f(g, ...r)));
      })));
  };
  draw(); return root;
}

// ---------- слайд рендері: ctx = {mode:'board'|'student'|'preview', lb:()=>Element} ----------
function renderSlide(s, ctx = {}) {
  const big = ctx.mode === 'board';
  const title = s.title && h('h2', { class: (big ? 'text-5xl' : 'text-3xl') + ' font-black mb-5' }, s.title);
  const prompt = s.prompt && h('p', { class: (big ? 'text-3xl' : 'text-xl') + ' mb-4 whitespace-pre-wrap' }, s.prompt);
  const wrap = (...k) => h('div', { class: 'w-full max-w-5xl mx-auto p-4' }, k);
  switch (s.type) {
    case 'title':
      return wrap(h('div', { class: 'text-center py-16' }, h('h1', { class: (big ? 'text-7xl' : 'text-5xl') + ' font-black' }, s.title), h('p', { class: 'text-2xl text-blue-400 mt-4' }, s.subtitle)));
    case 'content':
      return wrap(title, h('ul', { class: (big ? 'text-3xl space-y-4' : 'text-xl space-y-2') + ' list-disc pl-6' }, (s.bullets || []).map(b => h('li', {}, b))));
    case 'quiz':
      return wrap(title, prompt, h('div', { class: 'grid gap-2' }, (s.options || []).map((o, i) => h('div', { class: 'p-3 rounded-xl bg-slate-800 border border-slate-600 ' + (big ? 'text-2xl' : 'text-lg') }, `${String.fromCharCode(65 + i)}. ${o}`))));
    case 'task':
      return wrap(title, prompt);
    case 'code':
      return wrap(title, prompt, s.starter && h('pre', { class: 'p-3 bg-slate-950 rounded-xl text-emerald-300 font-mono ' + (big ? 'text-xl' : 'text-sm') }, s.starter));
    case 'flashcards': return wrap(title, flashcards(s.cards));
    case 'matching': return wrap(title, matching(s.pairs));
    case 'logic': return wrap(title, prompt, logicGate(s.gate));
    case 'leaderboard': return wrap(title || h('h2', { class: 'text-4xl font-black mb-4' }, '🏆 Жарыс кестесі'), ctx.lb ? ctx.lb() : '');
    default: return wrap(title, prompt);
  }
}

if (typeof module !== 'undefined') module.exports = { h, renderSlide, shuffle };
