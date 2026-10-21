// ClassFlow негізгі қосымшасы: кіру, мұғалім үйі, пульт (#remote), тақта (#board), оқушы (#s)
const sb = supabase.createClient(CF.url, CF.key);
const $app = document.getElementById('app');
const STAFF = ['teacher', 'class_teacher', 'deputy', 'admin'];
let me = null, cleanup = [];

function toast(m, bad) {
  const t = document.getElementById('toast');
  t.textContent = m; t.className = 'fixed top-3 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl text-sm font-semibold ' + (bad ? 'bg-red-600' : 'bg-emerald-600');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.add('hidden'), 3500);
}
async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) { toast(error.message, 1); throw error; }
  return data;
}
const quiet = (fn, args) => sb.rpc(fn, args).then(() => {}, () => {});
const q = async p => { const { data, error } = await p; if (error) { toast(error.message, 1); throw error; } return data; };
function mount(...n) { cleanup.forEach(f => f()); cleanup = []; $app.replaceChildren(...n); }
function live(sid, tables, cb) {
  let t; const go = () => { clearTimeout(t); t = setTimeout(cb, 250); };
  const ch = sb.channel('cf-' + Math.random());
  tables.forEach(tb => ch.on('postgres_changes', { event: '*', schema: 'public', table: tb, filter: tb === 'cf_sessions' ? `id=eq.${sid}` : `session_id=eq.${sid}` }, go));
  ch.subscribe();
  const iv = setInterval(cb, 8000); // realtime үзілсе де жаңарып тұрады
  cleanup.push(() => { sb.removeChannel(ch); clearInterval(iv); clearTimeout(t); });
}

// ---------------- кіру ----------------
function loginView() {
  const u = h('input', { class: INP, placeholder: 'Логин (KeyToLife-тағыдай)', autocapitalize: 'off' });
  const p = h('input', { class: INP, type: 'password', placeholder: 'Құпиясөз' });
  const go = async () => {
    const email = u.value.includes('@') ? u.value.trim() : `${u.value.trim().toLowerCase()}@${CF.emailDomain}`;
    const { error } = await sb.auth.signInWithPassword({ email, password: p.value });
    if (error) return toast('Логин немесе құпиясөз қате', 1);
    boot();
  };
  p.addEventListener('keydown', e => e.key === 'Enter' && go());
  mount(h('div', { class: 'max-w-sm mx-auto pt-24 px-4 space-y-3' },
    h('h1', { class: 'text-4xl font-black text-center' }, 'Class', h('span', { class: 'text-blue-400' }, 'Flow')),
    h('p', { class: 'text-center text-slate-400 text-sm' }, 'KeyToLife аккаунтыңмен кір'), u, p,
    h('button', { class: BTN_P + ' w-full', onclick: go }, 'Кіру')));
}

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return loginView();
  const { data } = await sb.from('profiles').select('id,full_name,role,school_id,class_id').eq('id', session.user.id).maybeSingle();
  if (!data) { toast('Профиль табылмады', 1); await sb.auth.signOut(); return loginView(); }
  me = data; route();
}
window.addEventListener('hashchange', () => me && route());
function route() {
  const [k, id] = location.hash.slice(1).split('/');
  if (k === 'remote' && STAFF.includes(me.role)) return remoteView(id);
  if (k === 'board' && STAFF.includes(me.role)) return boardView(id);
  if (k === 's') return studentView(id);
  if (k === 'edit' && STAFF.includes(me.role)) return editorView(id);
  STAFF.includes(me.role) ? teacherHome() : studentHome();
}
const topbar = right => h('div', { class: 'flex items-center justify-between p-3 border-b border-slate-800' },
  h('a', { href: '#', class: 'font-black text-xl' }, 'Class', h('span', { class: 'text-blue-400' }, 'Flow')),
  h('div', { class: 'flex items-center gap-2 text-sm' }, right, h('span', { class: 'text-slate-400' }, me.full_name),
    h('button', { class: BTN, onclick: async () => { await sb.auth.signOut(); me = null; loginView(); } }, 'Шығу')));

// ---------------- оқушы: басты бет ----------------
async function studentHome() {
  const code = h('input', { class: INP + ' text-center text-2xl tracking-widest uppercase', placeholder: 'КОД', maxlength: 8 });
  const join = async args => { const s = await rpc('cf_join', args); location.hash = 's/' + s.id; };
  const list = h('div', { class: 'space-y-2' });
  mount(topbar(), h('div', { class: 'max-w-md mx-auto p-4 space-y-4' },
    h('h2', { class: 'text-xl font-bold' }, 'Сабаққа қосыл'), code,
    h('button', { class: BTN_P + ' w-full', onclick: () => join({ p_code: code.value.trim().toUpperCase() }) }, 'Кіру'),
    h('h3', { class: 'text-sm text-slate-400 pt-4' }, 'Сыныбыңдағы тірі сабақтар'), list));
  const rows = await rpc('cf_live_for_me');
  list.replaceChildren(...(rows.length ? rows.map(r => h('button', { class: BTN + ' w-full text-left', onclick: () => join({ p_session: r.id }) },
    `${r.title} · ${r.teacher_name} · ${r.class_name || ''}`)) : [h('p', { class: 'text-slate-500 text-sm' }, 'Қазір тірі сабақ жоқ')]));
}

// ---------------- мұғалім: басты бет ----------------
async function teacherHome() {
  const box = h('div', { class: 'max-w-3xl mx-auto p-4 space-y-4' });
  mount(topbar(h('button', { class: BTN_P, onclick: () => location.hash = 'edit/new' }, '+ Жаңа сабақ')), box);
  const [lessons, classes, liveS] = await Promise.all([
    q(sb.from('cf_lessons').select('id,title,subject,class_id').order('updated_at', { ascending: false })),
    q(sb.from('classes').select('id,name').order('name')),
    q(sb.from('cf_sessions').select('id,title,join_code').eq('teacher_id', me.id).eq('status', 'live')),
  ]);
  box.append(
    liveS.length ? h('div', {}, h('h3', { class: 'font-bold mb-2' }, '🟢 Жүріп жатқан сабақтар'),
      liveS.map(s => h('a', { href: '#remote/' + s.id, class: BTN_G + ' inline-block mr-2' }, `${s.title} · ${s.join_code}`))) : '',
    h('h3', { class: 'font-bold' }, 'Сабақтарым'),
    lessons.length ? lessons.map(l => {
      const cls = h('select', { class: INP + ' !w-auto' }, h('option', { value: '' }, 'Сынып'), classes.map(c => h('option', { value: c.id, selected: c.id === l.class_id }, c.name)));
      const gr = h('input', { class: INP + ' !w-16', type: 'number', min: 1, max: 8, value: 3, title: 'Топ саны' });
      return h('div', { class: 'p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-2' },
        h('div', { class: 'flex-1 min-w-[10rem]' }, h('div', { class: 'font-bold' }, l.title), h('div', { class: 'text-xs text-slate-400' }, l.subject || '')),
        cls, gr, h('button', { class: BTN, onclick: () => location.hash = 'edit/' + l.id }, '✏️'),
        h('button', { class: BTN_G, onclick: async () => {
          const s = await rpc('cf_start_session', { p_lesson: l.id, p_class: cls.value || null, p_groups: +gr.value || 3 });
          location.hash = 'remote/' + s.id;
        } }, '▶ Бастау'));
    }) : h('p', { class: 'text-slate-500' }, 'Әзірге сабақ жоқ — «+ Жаңа сабақ» бас.'));
}

const SAMPLE = [
  { type: 'title', title: 'Алгоритм', subtitle: '7-сынып · Информатика' },
  { type: 'content', title: 'Алгоритм деген не?', bullets: ['Әрекеттердің ретті тізбегі', 'Орындаушыға түсінікті болуы керек', 'Соңы бар (ақырлы)'], notes: 'Тұрмыстық мысал: шай қайнату' },
  { type: 'quiz', title: 'Тест', prompt: 'Қайсысы алгоритм қасиеті?', options: ['Дискреттілік', 'Түс', 'Салмақ'], answer: 0, points: 2, explanation: 'Алгоритм қадамдарға бөлінеді.' },
  { type: 'task', title: 'Қысқа жауап', prompt: 'Бағдарлама қай тілде жазылады: Python, ____ ? (бір сөз: C++)', accept: ['c++'], points: 3 },
  { type: 'code', title: 'Python', prompt: '1-ден 5-ке дейінгі сандарды шығар', starter: 'for i in range(1, 6):\n    print(i)', points: 5 },
  { type: 'logic', title: 'Логикалық вентиль', prompt: 'A және B-ні басып көр', gate: 'AND' },
  { type: 'matching', title: 'Сәйкестендір', pairs: [{ l: 'print', r: 'шығару' }, { l: 'input', r: 'енгізу' }, { l: 'len', r: 'ұзындық' }] },
  { type: 'flashcards', title: 'Терминдер', cards: [{ front: 'Алгоритм', back: 'Қадамдар тізбегі' }, { front: 'Айнымалы', back: 'Атауы бар жад ұясы' }] },
  { type: 'leaderboard', title: '🏆 Нәтиже' },
];
async function editorView(id) {
  const isNew = id === 'new';
  const l = isNew ? { title: '', subject: 'Информатика', slides: SAMPLE, terms: [{ term: 'Алгоритм', definition: 'Есепті шешу қадамдарының тізбегі' }] }
    : await q(sb.from('cf_lessons').select('*').eq('id', id).single());
  const title = h('input', { class: INP, value: l.title, placeholder: 'Сабақ тақырыбы' });
  const subj = h('input', { class: INP, value: l.subject || '' });
  const sl = h('textarea', { class: INP + ' font-mono h-96' }, JSON.stringify(l.slides, null, 1));
  const tm = h('textarea', { class: INP + ' font-mono h-28' }, JSON.stringify(l.terms || [], null, 1));
  mount(topbar(), h('div', { class: 'max-w-3xl mx-auto p-4 space-y-3' },
    h('h2', { class: 'font-bold text-xl' }, isNew ? 'Жаңа сабақ' : 'Сабақты өңдеу'), title, subj,
    h('p', { class: 'text-xs text-slate-400' }, 'Слайдтар (JSON). Түрлері: title, content, quiz, task, code, logic, matching, flashcards, leaderboard. quiz: answer = дұрыс нұсқа нөмірі (0-ден); task: accept = қабылданатын жауаптар.'), sl,
    h('p', { class: 'text-xs text-slate-400' }, 'Терминдер (JSON): [{term, definition}]'), tm,
    h('button', { class: BTN_G, onclick: async () => {
      let slides, terms;
      try { slides = JSON.parse(sl.value); terms = JSON.parse(tm.value || '[]'); if (!Array.isArray(slides)) throw 0; } catch { return toast('JSON қате', 1); }
      if (!title.value.trim()) return toast('Тақырып жаз', 1);
      const row = { title: title.value.trim(), subject: subj.value, slides, terms };
      await q(isNew ? sb.from('cf_lessons').insert({ ...row, owner_id: me.id, school_id: me.school_id, plan: {} })
        : sb.from('cf_lessons').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id));
      toast('Сақталды'); location.hash = '';
    } }, 'Сақтау')));
}

// ---------------- ортақ деректер ----------------
const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function lbTable(rows) {
  return h('table', { class: 'w-full text-lg' }, (rows || []).slice(0, 8).map((r, i) => h('tr', { class: 'border-b border-slate-800' },
    h('td', { class: 'py-1 w-10 text-slate-400' }, i + 1), h('td', {}, r.full_name), h('td', { class: 'text-slate-400 text-sm' }, r.group_no ? 'Топ ' + r.group_no : ''),
    h('td', { class: 'text-right font-black text-amber-400' }, r.points))));
}

// ---------------- мұғалім пульті (телефон) ----------------
async function remoteView(sid) {
  let S, priv = [], parts = [], task = null, subs = [], LB = [], GS = [], tab = 'class';
  const dyn = h('div', { class: 'space-y-3' });
  const msg = h('input', { class: INP, placeholder: 'Хабарлама (қалқымалы терезе үшін)' });
  const nameOf = id => (parts.find(p => p.student_id === id) || {}).full_name || '?';
  const refresh = async () => {
    [S, priv, parts, LB, GS] = await Promise.all([
      q(sb.from('cf_sessions').select('*').eq('id', sid).single()),
      q(sb.from('cf_session_private').select('slides').eq('session_id', sid).maybeSingle()).then(r => (r && r.slides) || []),
      q(sb.from('cf_participants').select('*').eq('session_id', sid).order('full_name')),
      rpc('cf_leaderboard', { p_session: sid }), rpc('cf_group_scores', { p_session: sid }),
    ]);
    task = S.active_task_id ? await q(sb.from('cf_tasks').select('*').eq('id', S.active_task_id).single()) : null;
    subs = task ? await q(sb.from('cf_submissions').select('*').eq('task_id', task.id)) : [];
    draw();
  };
  const go = i => rpc('cf_goto', { p_session: sid, p_index: Math.max(0, Math.min(S.slide_count - 1, i)) }).then(refresh);
  const draw = () => {
    const cur = priv[S.current_slide] || {};
    const isTask = ['quiz', 'task', 'code'].includes(cur.type);
    const online = parts.filter(p => p.presence === 'online').length;
    const tabBtn = (k, t) => h('button', { class: tab === k ? BTN_P : BTN, onclick: () => { tab = k; draw(); } }, t);
    dyn.replaceChildren(
      h('div', { class: 'p-3 rounded-2xl bg-slate-900 border border-slate-800' },
        h('div', { class: 'flex justify-between text-xs text-slate-400' }, h('span', {}, `Слайд ${S.current_slide + 1} / ${S.slide_count}`), h('span', {}, `Онлайн ${online}/${parts.length}`)),
        h('div', { class: 'text-lg font-bold mt-1' }, cur.title || cur.type || ''),
        cur.notes && h('div', { class: 'mt-2 p-2 rounded-xl bg-amber-950 text-amber-200 text-sm' }, '📝 ' + cur.notes),
        h('div', { class: 'grid grid-cols-2 gap-2 mt-3' },
          h('button', { class: BTN + ' py-4 text-lg', onclick: () => go(S.current_slide - 1) }, '◀ Артқа'),
          h('button', { class: BTN_P + ' py-4 text-lg', onclick: () => go(S.current_slide + 1) }, 'Алға ▶')),
        isTask && (task && task.status === 'open'
          ? h('button', { class: BTN + ' w-full mt-2 !bg-red-700', onclick: () => rpc('cf_close_task', { p_task: task.id }).then(refresh) }, `⏹ Тапсырманы жабу (${subs.length}/${parts.length} жауап)`)
          : h('button', { class: BTN_G + ' w-full mt-2', onclick: () => rpc('cf_open_task', { p_session: sid, p_index: S.current_slide }).then(refresh) }, '📝 Тапсырманы ашу'))),
      h('div', { class: 'flex gap-2 flex-wrap' }, tabBtn('class', '👥 Сынып'), tabBtn('subs', '✅ Жауаптар'), tabBtn('score', '🏆 Ұпай'), tabBtn('att', '📋 Қатысу'), tabBtn('slides', '🎞 Слайдтар')),
      tab === 'class' ? classTab() : tab === 'subs' ? subsTab() : tab === 'score' ? scoreTab() : tab === 'att' ? attBox() : h('div', { class: 'space-y-1' }, priv.map((s, i) =>
        h('button', { class: (i === S.current_slide ? BTN_P : BTN) + ' w-full text-left', onclick: () => go(i) }, `${i + 1}. ${s.title || s.type}`))));
  };
  const classTab = () => h('div', { class: 'space-y-2' },
    h('div', { class: 'flex gap-2' },
      h('button', { class: S.locked ? BTN_G : BTN + ' !bg-red-700', onclick: () => rpc('cf_lock', { p_session: sid, p_student: null, p_locked: !S.locked }).then(refresh) }, S.locked ? '🔓 Барлығын ашу' : '🔒 Барлығын бұғаттау'),
      h('button', { class: BTN + ' !bg-amber-600', onclick: () => msg.value.trim() ? rpc('cf_popup', { p_session: sid, p_student: null, p_message: msg.value.trim() }).then(() => toast('Барлығына жіберілді')) : toast('Хабарлама жаз', 1) }, '🔔 Барлығына')),
    parts.map(p => h('div', { class: 'p-2 rounded-xl bg-slate-900 border ' + (p.presence === 'away' ? 'border-red-500' : 'border-slate-800') + ' flex items-center gap-2 flex-wrap' },
      h('span', { class: 'w-2 h-2 rounded-full ' + (p.presence === 'online' ? 'bg-emerald-400' : 'bg-red-500') }),
      h('span', { class: 'font-semibold flex-1 min-w-[7rem]' }, p.full_name, p.att === 'late' && h('span', { class: 'ml-1 text-xs text-amber-400' }, 'кешікті')),
      p.away_count > 0 && h('span', { class: 'text-xs text-red-400' }, `⚠${p.away_count}× ${fmt(p.away_seconds)}`),
      p.hand && h('button', { class: BTN + ' !bg-amber-600', onclick: () => rpc('cf_clear_hand', { p_session: sid, p_student: p.student_id }).then(refresh) }, '✋'),
      h('button', { class: BTN, title: 'Бұғаттау', onclick: () => rpc('cf_lock', { p_session: sid, p_student: p.student_id, p_locked: !p.locked }).then(refresh) }, p.locked ? '🔓' : '🔒'),
      h('button', { class: BTN, title: 'Қалқымалы хабар', onclick: () => msg.value.trim() ? rpc('cf_popup', { p_session: sid, p_student: p.student_id, p_message: msg.value.trim() }).then(() => toast('Жіберілді')) : toast('Төмендегі жолға хабар жаз', 1) }, '🔔'),
      h('button', { class: BTN, onclick: () => rpc('cf_award', { p_session: sid, p_student: p.student_id, p_group: null, p_points: 1, p_reason: 'Белсенділік' }).then(refresh) }, '+1'))));
  const subsTab = () => h('div', { class: 'space-y-2' }, !task ? h('p', { class: 'text-slate-500' }, 'Белсенді тапсырма жоқ') : [
    h('p', { class: 'text-sm text-slate-400' }, task.prompt),
    subs.map(s => {
      const pts = h('input', { class: INP + ' !w-16', type: 'number', min: 0, max: task.points, value: s.points ?? '' });
      return h('div', { class: 'p-2 rounded-xl bg-slate-900 border border-slate-800' },
        h('div', { class: 'flex justify-between' }, h('b', {}, nameOf(s.student_id)), h('span', { class: s.is_correct ? 'text-emerald-400' : 'text-slate-400' }, s.points != null ? `${s.points}/${task.points}` : 'бағаланбаған')),
        h('pre', { class: 'text-sm whitespace-pre-wrap text-slate-300 mt-1' }, task.kind === 'quiz' ? (task.options || [])[+s.answer] ?? s.answer : s.answer),
        ['text', 'code', 'short'].includes(task.kind) && h('div', { class: 'flex gap-2 mt-2' }, pts,
          h('button', { class: BTN_G, onclick: () => rpc('cf_grade', { p_sub: s.id, p_points: +pts.value || 0, p_feedback: null }).then(refresh) }, 'Бағалау')));
    })]);
  const scoreTab = () => h('div', { class: 'space-y-3' },
    h('div', { class: 'grid grid-cols-2 gap-2' }, Array.from({ length: S.groups_count }, (_, i) => i + 1).map(g => {
      const pts = (GS.find(x => x.group_no === g) || {}).points || 0;
      return h('div', { class: 'p-2 rounded-xl bg-slate-900 border border-slate-800' }, h('div', { class: 'flex justify-between' }, h('b', {}, 'Топ ' + g), h('b', { class: 'text-amber-400' }, pts)),
        h('div', { class: 'flex gap-1 mt-1' }, [1, 3, 5].map(n => h('button', { class: BTN + ' flex-1', onclick: () => rpc('cf_award', { p_session: sid, p_student: null, p_group: g, p_points: n, p_reason: 'Топтық' }).then(refresh) }, '+' + n))));
    })), lbTable(LB));
  const attBox = () => { const box = h('div', { class: 'text-sm' }, 'Жүктелуде...'); rpc('cf_attendance', { p_session: sid }).then(rows => box.replaceChildren(h('table', { class: 'w-full' }, rows.map(r =>
    h('tr', { class: 'border-b border-slate-800' }, h('td', { class: 'py-1' }, r.full_name), h('td', { class: r.status === 'absent' ? 'text-red-400' : r.status === 'late' ? 'text-amber-400' : 'text-emerald-400' }, { present: 'бар', late: 'кешікті', absent: 'жоқ' }[r.status] || r.status),
      h('td', { class: 'text-slate-400' }, r.away_count ? `⚠${r.away_count}× ${fmt(r.away_seconds)}` : '')))))); return box; };

  mount(topbar(h('a', { class: BTN, href: '#board/' + sid, target: '_blank' }, '📺 Тақта')),
    h('div', { class: 'max-w-xl mx-auto p-3 pb-32 space-y-3' }, dyn),
    h('div', { class: 'fixed bottom-0 inset-x-0 bg-slate-950 border-t border-slate-800 p-2 flex gap-2 max-w-xl mx-auto' }, msg,
      h('button', { class: BTN + ' !bg-red-800 whitespace-nowrap', onclick: async () => { if (confirm('Сабақты аяқтау керек пе?')) { await rpc('cf_end_session', { p_session: sid }); location.hash = ''; } } }, '⏹ Аяқтау')));
  await refresh();
  live(sid, ['cf_sessions', 'cf_participants', 'cf_tasks', 'cf_submissions', 'cf_scores'], refresh);
}

// ---------------- тақта (проектор) ----------------
async function boardView(sid) {
  const root = h('div', { class: 'min-h-screen flex flex-col' });
  mount(root);
  let sig = '';
  const refresh = async () => {
    const [S, cur, parts, LB, GS] = await Promise.all([
      q(sb.from('cf_sessions').select('*').eq('id', sid).single()), rpc('cf_slide', { p_session: sid }),
      q(sb.from('cf_participants').select('student_id,presence').eq('session_id', sid)), rpc('cf_leaderboard', { p_session: sid }), rpc('cf_group_scores', { p_session: sid })]);
    const task = S.active_task_id ? await q(sb.from('cf_tasks').select('*').eq('id', S.active_task_id).single()) : null;
    const subs = task ? await q(sb.from('cf_submissions').select('id').eq('task_id', task.id)) : [];
    const mine = parts; const k = JSON.stringify([S.current_slide, task && task.status, S.status]);
    const side = h('div', { class: 'w-72 p-4 border-l border-slate-800 space-y-4 hidden lg:block' },
      h('div', { class: 'text-center' }, h('div', { class: 'text-xs text-slate-400' }, 'Сабаққа қосыл: classflow'), h('div', { class: 'text-5xl font-black tracking-widest text-blue-400' }, S.join_code)),
      h('div', { class: 'text-sm text-slate-400' }, `Қатысушы: ${mine.length}`),
      task && h('div', { class: 'p-3 rounded-xl ' + (task.status === 'open' ? 'bg-emerald-900' : 'bg-slate-800') }, task.status === 'open' ? `📝 Жауап: ${subs.length}` : '⏹ Тапсырма жабық'),
      h('div', {}, h('h3', { class: 'font-bold mb-1' }, '👥 Топтар'), GS.map(g => h('div', { class: 'flex justify-between text-xl' }, h('span', {}, 'Топ ' + g.group_no), h('b', { class: 'text-amber-400' }, g.points)))),
      h('div', {}, h('h3', { class: 'font-bold mb-1' }, '🏆 Үздіктер'), lbTable(LB.slice(0, 5))));
    const body = h('div', { class: 'flex-1 flex items-center' }, S.status === 'ended' ? h('h1', { class: 'text-5xl font-black mx-auto' }, 'Сабақ аяқталды') :
      renderSlide(cur.slide || {}, { mode: 'board', lb: () => lbTable(LB) }));
    // слайд қайта салынбайды (виджет күйі сақталады), бүйір панель әрқашан жаңарады
    if (k !== sig) { sig = k; root.replaceChildren(h('div', { class: 'flex flex-1' }, body, side)); }
    else root.firstChild.lastChild.replaceWith(side);
  };
  await refresh();
  live(sid, ['cf_sessions', 'cf_participants', 'cf_tasks', 'cf_submissions', 'cf_scores'], refresh);
}

// ---------------- оқушы: сабақ ----------------
async function studentView(sid) {
  let S, cur = null, task = null, mySub = null, mePart = null, LB = [], fullscreenNeeded = true, drawnSig = '', ended = false;
  const stage = h('div', { class: 'flex-1' }), taskBox = h('div', { class: 'max-w-3xl mx-auto w-full p-4' });
  const banner = h('div', { class: 'hidden bg-red-600 text-center font-bold p-2' });
  const overlay = h('div', { class: 'hidden fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center text-center p-6' });
  const dict = h('div', { class: 'hidden fixed inset-0 z-40 bg-slate-950 overflow-auto p-4' });
  const hdr = h('div', {});
  const root = h('div', { class: 'min-h-screen flex flex-col' }, banner, hdr, stage, taskBox, overlay, dict);
  mount(root);

  // --- Focus Mode ---
  let awayAt = null, warnN = 0;
  const away = () => { if (awayAt || ended) return; awayAt = Date.now(); quiet('cf_report_focus', { p_session: sid, p_kind: 'away' }); };
  const back = () => {
    if (!awayAt) return; const ms = Date.now() - awayAt; awayAt = null;
    quiet('cf_report_focus', { p_session: sid, p_kind: 'return', p_ms: ms });
    banner.textContent = `⚠ Сабақ бетінен ${Math.round(ms / 1000)} сек шықтың (${++warnN} рет). Мұғалімге белгілі.`; banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 8000);
  };
  const onVis = () => document.hidden ? away() : back(), onBlur = () => away(), onFocus = () => !document.hidden && back();
  const onFs = () => { if (!document.fullscreenElement && !fullscreenNeeded) quiet('cf_report_focus', { p_session: sid, p_kind: 'fullscreen_exit' }); };
  document.addEventListener('visibilitychange', onVis); window.addEventListener('blur', onBlur); window.addEventListener('focus', onFocus); document.addEventListener('fullscreenchange', onFs);
  const hb = setInterval(() => quiet('cf_heartbeat', { p_session: sid }), 15000);
  cleanup.push(() => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); document.removeEventListener('fullscreenchange', onFs); clearInterval(hb); });

  // --- қалқымалы хабарлар (кезек) ---
  const popups = [], seen = new Set(); let showing = null;
  const nextPopup = () => { if (showing || !popups.length) return; showing = popups.shift(); drawOverlay(); };
  const ch = sb.channel('cmd-' + sid).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cf_commands', filter: `session_id=eq.${sid}` }, e => {
    const c = e.new; if (c.kind !== 'popup' || seen.has(c.id) || (c.student_id && c.student_id !== me.id)) return;
    seen.add(c.id); popups.push(c); nextPopup();
  }).subscribe();
  cleanup.push(() => sb.removeChannel(ch));
  function drawOverlay() {
    const locked = (mePart && mePart.locked) || (S && S.locked);
    if (showing) {
      overlay.className = 'fixed inset-0 z-50 bg-amber-500 text-slate-900 flex flex-col items-center justify-center text-center p-6';
      overlay.replaceChildren(h('div', { class: 'text-6xl mb-4' }, '🔔'), h('div', { class: 'text-3xl font-black mb-8 max-w-xl' }, showing.message),
        h('button', { class: 'px-8 py-4 rounded-2xl bg-slate-900 text-white text-xl font-bold', onclick: () => { quiet('cf_ack', { p_command: showing.id }); showing = null; drawOverlay(); nextPopup(); } }, 'Түсіндім ✓'));
    } else if (locked) {
      overlay.className = 'fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-center p-6';
      overlay.replaceChildren(h('div', { class: 'text-7xl mb-4' }, '🔒'), h('div', { class: 'text-2xl font-bold' }, 'Мұғалім экранды бұғаттады'), h('div', { class: 'text-slate-400 mt-2' }, 'Тақтаға назар аудар'));
    } else overlay.className = 'hidden';
  }

  // --- жаңарту ---
  const refresh = async () => {
    S = await q(sb.from('cf_sessions').select('*').eq('id', sid).single());
    if (S.status === 'ended') { ended = true; hdr.replaceChildren(); stage.replaceChildren(h('div', { class: 'text-center pt-24' }, h('h1', { class: 'text-4xl font-black' }, 'Сабақ аяқталды'), h('a', { href: '#', class: BTN_P + ' inline-block mt-6' }, 'Басты бет'))); taskBox.replaceChildren(); return drawOverlay(); }
    const [c, parts, lb] = await Promise.all([rpc('cf_slide', { p_session: sid }), q(sb.from('cf_participants').select('*').eq('session_id', sid).eq('student_id', me.id)), rpc('cf_leaderboard', { p_session: sid })]);
    cur = c; mePart = parts[0]; LB = lb;
    task = S.active_task_id ? await q(sb.from('cf_tasks').select('*').eq('id', S.active_task_id).single()) : null;
    mySub = task ? (await q(sb.from('cf_submissions').select('*').eq('task_id', task.id).eq('student_id', me.id)))[0] : null;
    drawOverlay(); drawHeader();
    const sig = [S.current_slide, task && task.id, task && task.status, mySub && mySub.id, mySub && mySub.points].join('|');
    if (sig !== drawnSig) { drawnSig = sig; drawStage(); }
  };
  const drawHeader = () => {
    const mineRow = LB.find(r => r.student_id === me.id);
    hdr.replaceChildren(h('div', { class: 'flex items-center justify-between p-2 border-b border-slate-800 text-sm' },
      h('b', {}, S.title), h('div', { class: 'flex items-center gap-2' }, h('span', { class: 'text-amber-400 font-bold' }, `⭐ ${mineRow ? mineRow.points : 0}`),
        h('button', { class: BTN + ' !bg-amber-700', onclick: () => rpc('cf_set_hand', { p_session: sid, p_on: !(mePart && mePart.hand) }).then(refresh) }, mePart && mePart.hand ? '✋ түсірем' : '✋'),
        h('button', { class: BTN, onclick: openDict }, '📖'),
        fullscreenNeeded && h('button', { class: BTN_P, onclick: () => { fullscreenNeeded = false; document.documentElement.requestFullscreen().catch(() => {}); drawHeader(); } }, '⛶ Focus'))));
  };
  const drawStage = () => {
    const s = (cur && cur.slide) || {};
    const isTask = ['quiz', 'task', 'code'].includes(s.type);
    stage.replaceChildren(isTask ? h('div', { class: 'max-w-3xl mx-auto p-4' }, h('h2', { class: 'text-3xl font-black mb-4' }, s.title || ''), s.prompt && h('p', { class: 'text-xl whitespace-pre-wrap' }, s.prompt))
      : renderSlide(s, { mode: 'student', lb: () => lbTable(LB) }));
    taskBox.replaceChildren(...(isTask ? [taskPanel(s)] : []));
  };
  const taskPanel = s => {
    if (!task) return h('p', { class: 'text-slate-500' }, 'Тапсырма әлі ашылған жоқ...');
    if (mySub) return h('div', { class: 'p-4 rounded-2xl bg-slate-900 border border-slate-700' }, h('div', { class: 'font-bold text-emerald-400' }, '✓ Жауап жіберілді'),
      mySub.points != null && h('div', {}, `Ұпай: ${mySub.points}/${task.points}`), mySub.feedback && h('div', { class: 'text-slate-300' }, mySub.feedback), revealBox());
    if (task.status !== 'open') return h('div', { class: 'p-4 rounded-2xl bg-slate-900' }, h('div', { class: 'text-red-400 font-bold' }, '⏹ Уақыт бітті'), revealBox());
    const send = async (ans, meta) => { await rpc('cf_submit', { p_task: task.id, p_answer: ans, p_meta: meta || null }); refresh(); };
    if (task.kind === 'quiz') return h('div', { class: 'grid gap-2' }, (task.options || []).map((o, i) => h('button', { class: 'p-4 rounded-2xl bg-slate-800 hover:bg-blue-700 text-left text-lg border border-slate-600', onclick: () => send(String(i)) }, `${String.fromCharCode(65 + i)}. ${o}`)));
    if (task.kind === 'code') {
      const cb = codeBox(s.starter);
      cb.el.querySelector('textarea').addEventListener('paste', () => quiet('cf_report_focus', { p_session: sid, p_kind: 'paste' }));
      return h('div', {}, cb.el, h('button', { class: BTN_P + ' mt-2 w-full', onclick: () => send(cb.code(), { output: cb.output().slice(0, 2000) }) }, '📤 Жіберу'));
    }
    const inp = h('textarea', { class: INP + ' h-24 text-lg', placeholder: 'Жауабың...' });
    inp.addEventListener('paste', () => quiet('cf_report_focus', { p_session: sid, p_kind: 'paste' }));
    return h('div', {}, inp, h('button', { class: BTN_P + ' mt-2 w-full', onclick: () => inp.value.trim() ? send(inp.value.trim()) : toast('Жауап жаз', 1) }, '📤 Жіберу'));
  };
  const revealBox = () => {
    const r = task.reveal; if (!r) return '';
    const a = r.answer ?? r.correct;
    const txt = typeof a === 'number' && task.options ? task.options[a] : Array.isArray(a) ? a.join(' / ') : a;
    return h('div', { class: 'mt-2 p-2 rounded-xl bg-emerald-950 text-sm' }, txt != null && h('div', {}, '✔ Дұрыс жауап: ', h('b', {}, String(txt))), r.explanation && h('div', { class: 'text-slate-300' }, r.explanation));
  };

  // --- сөздік ---
  async function openDict() {
    const mine = await q(sb.from('cf_my_terms').select('*').order('created_at', { ascending: false }));
    const t = h('input', { class: INP, placeholder: 'Термин' }), d = h('input', { class: INP, placeholder: 'Анықтама' });
    const add = async (term, definition, source) => { await q(sb.from('cf_my_terms').insert({ student_id: me.id, term, definition, source })); toast('Сөздікке қосылды'); openDict(); };
    dict.className = 'fixed inset-0 z-40 bg-slate-950 overflow-auto p-4';
    dict.replaceChildren(h('div', { class: 'max-w-xl mx-auto space-y-3' },
      h('div', { class: 'flex justify-between' }, h('h2', { class: 'text-xl font-bold' }, '📖 Сөздік'), h('button', { class: BTN, onclick: () => dict.className = 'hidden' }, '✕')),
      h('h3', { class: 'text-sm text-slate-400' }, 'Осы сабақтың терминдері'),
      ((S && S.terms) || []).map(x => h('div', { class: 'p-2 rounded-xl bg-slate-900 flex items-center gap-2' }, h('div', { class: 'flex-1' }, h('b', {}, x.term), h('div', { class: 'text-sm text-slate-300' }, x.definition)),
        mine.some(m => m.term === x.term) ? h('span', { class: 'text-emerald-400' }, '✓') : h('button', { class: BTN, onclick: () => add(x.term, x.definition, S.title) }, '+ Менің сөздігіме'))),
      h('h3', { class: 'text-sm text-slate-400 pt-3' }, 'Менің сөздігім'), mine.map(m => h('div', { class: 'p-2 rounded-xl bg-slate-900' }, h('b', {}, m.term), h('div', { class: 'text-sm text-slate-300' }, m.definition))),
      t, d, h('button', { class: BTN_P, onclick: () => t.value.trim() && add(t.value.trim(), d.value.trim(), 'өзім') }, 'Қосу')));
  }

  try { await rpc('cf_join', { p_session: sid }); } catch { location.hash = ''; return; }
  await refresh();
  live(sid, ['cf_sessions', 'cf_participants', 'cf_tasks', 'cf_scores', 'cf_submissions'], refresh);
}

boot();
