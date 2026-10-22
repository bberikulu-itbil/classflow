import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Link2, Maximize, Minimize, Play as PlayIcon, Save, SlidersHorizontal, Target, Unlink } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Button, Card, EmptyState, ErrorBox, Field, Skeleton, inputCls, useLoad } from '../ui';
import { JeopardyPanel } from './JeopardyPanel';
import { MAX_TEAMS, addRun, applyScore, newTeam, penalty, useSetup } from './jeopardyStore';
import type { Ctx, Me, Setup } from './jeopardyStore';

interface Cat { name: string; qs: { q: string; a: string }[] }
interface Game { id: string; title: string; cats: Cat[] }

const ROWS = 5, MAX_CATS = 6;
const points = (row: number) => (row + 1) * 100;
const newCat = (): Cat => ({ name: '', qs: Array.from({ length: ROWS }, () => ({ q: '', a: '' })) });
const newGame = (): Game => ({ id: crypto.randomUUID(), title: '', cats: [newCat(), newCat(), newCat()] });
const filled = (g: Game) => g.cats.reduce((n, c) => n + c.qs.filter(x => x.q.trim()).length, 0);

// Games are rows of cf_jeopardy (supabase/006_jeopardy.sql). Until that table exists (and in ?demo) they stay in this browser.
const read = (key: string): Game[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v.filter(g => g && typeof g.id === 'string' && Array.isArray(g.cats)) : [];
  } catch { return []; }
};
const write = (key: string, games: Game[]) => { try { localStorage.setItem(key, JSON.stringify(games)); return true; } catch { return false; } };
const NO_SAVE = 'Браузер сақтауға рұқсат бермеді (құпия режимде болуы мүмкін)';
const localKey = (me: Me) => 'cf_jeopardy_' + me.id;
let noTable = !!DEMO; // flips to true on the first "table does not exist" answer
const missing = (e: { code?: string }) => e.code === 'PGRST205' || e.code === '42P01';

async function listGames(me: Me): Promise<{ games: Game[]; local: boolean }> {
  if (!noTable) {
    const { data, error } = await sb.from('cf_jeopardy').select('id,title,data').order('updated_at', { ascending: false });
    if (!error) return { games: (data || []).map((r: any) => ({ id: r.id, title: r.title, cats: r.data })), local: false };
    if (!missing(error)) throw new Error(error.message);
    noTable = true;
  }
  return { games: read(localKey(me)), local: true };
}
async function saveGame(me: Me, g: Game) {
  if (!noTable) {
    const { error } = await sb.from('cf_jeopardy').upsert({ id: g.id, school_id: me.school_id, owner_id: me.id, title: g.title, data: g.cats });
    if (!error) return;
    if (!missing(error)) throw new Error(error.message);
    noTable = true;
  }
  const all = read(localKey(me));
  if (!write(localKey(me), all.some(x => x.id === g.id) ? all.map(x => (x.id === g.id ? g : x)) : [g, ...all])) throw new Error(NO_SAVE);
}
async function removeGame(me: Me, id: string) {
  if (!noTable) {
    const { error } = await sb.from('cf_jeopardy').delete().eq('id', id);
    if (!error) return;
    if (!missing(error)) throw new Error(error.message);
    noTable = true;
  }
  if (!write(localKey(me), read(localKey(me)).filter(x => x.id !== id))) throw new Error(NO_SAVE);
}

// The whole game travels inside the link (deflate + base64url), so no server is needed.
// shortcut: the link is a snapshot (later edits need a new link) and grows with the text; move to a database row if links get too long.
const pipe = async (data: Uint8Array, s: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(s)).arrayBuffer());
const toB64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0));
export async function encodeGame(g: Game) {
  const json = JSON.stringify({ t: g.title, c: g.cats.map(c => [c.name, c.qs.map(x => [x.q, x.a])]) });
  return toB64(await pipe(new TextEncoder().encode(json), new CompressionStream('deflate-raw')));
}
export async function decodeGame(payload: string): Promise<Game> {
  if (!payload || payload.length > 20000) throw new Error('bad');
  const d = JSON.parse(new TextDecoder().decode(await pipe(fromB64(payload), new DecompressionStream('deflate-raw'))));
  const str = (v: unknown) => { if (typeof v !== 'string') throw new Error('bad'); return v; };
  if (!Array.isArray(d.c) || d.c.length < 1) throw new Error('bad');
  return {
    id: crypto.randomUUID(), title: str(d.t),
    cats: d.c.slice(0, MAX_CATS).map((c: unknown[]) => {
      const qs = (Array.isArray(c[1]) ? c[1] : []).slice(0, ROWS).map((x: unknown[]) => ({ q: str(x[0]), a: str(x[1]) }));
      while (qs.length < ROWS) qs.push({ q: '', a: '' });
      return { name: str(c[0]), qs };
    }),
  };
}

const problem = (g: Game) =>
  !g.title.trim() ? 'Ойынға атау беріңіз.'
  : g.cats.some(c => !c.name.trim()) ? 'Әр тақырыптың атауы болуы керек (қажетсізін өшіріңіз).'
  : g.cats.some(c => c.qs.some(x => x.q.trim() && !x.a.trim())) ? 'Жауабы жоқ сұрақ бар.'
  : filled(g) === 0 ? 'Кемінде бір сұрақ жазыңыз.' : '';

function Editor({ initial, onSave, onCancel }: { initial: Game; onSave: (g: Game, play: boolean) => void; onCancel: () => void }) {
  const [g, setG] = useState(initial);
  const [shown, setShown] = useState(false);
  const set = (fn: (g: Game) => void) => setG(p => { const n = structuredClone(p); fn(n); return n; });
  const msg = problem(g);
  const submit = (play: boolean) => { if (msg) setShown(true); else onSave({ ...g, title: g.title.trim() }, play); };
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Jeopardy құрастыру</h2>
      <Field label="Ойын атауы">{id => <input id={id} className={inputCls} value={g.title} onChange={e => set(x => { x.title = e.target.value; })} placeholder="Мысалы: Python негіздері" />}</Field>
      {g.cats.map((c, ci) => (
        <Card key={ci} className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1"><Field label={`${ci + 1}-тақырып атауы`}>{id => <input id={id} className={inputCls} value={c.name} onChange={e => set(x => { x.cats[ci].name = e.target.value; })} />}</Field></div>
            {g.cats.length > 1 && <Button variant="secondary" aria-label={`${ci + 1}-тақырыпты өшіру`} onClick={() => set(x => { x.cats.splice(ci, 1); })}>Өшіру</Button>}
          </div>
          {c.qs.map((q, ri) => (
            <div key={ri} className="grid gap-2 sm:grid-cols-[5rem_1fr_1fr] sm:items-center">
              <span className="text-sm font-semibold text-text-secondary">{points(ri)} ұпай</span>
              <input className={inputCls} aria-label={`${c.name || ci + 1 + '-тақырып'}, ${points(ri)}: сұрақ`} placeholder="Сұрақ" value={q.q} onChange={e => set(x => { x.cats[ci].qs[ri].q = e.target.value; })} />
              <input className={inputCls} aria-label={`${c.name || ci + 1 + '-тақырып'}, ${points(ri)}: жауап`} placeholder="Жауап" value={q.a} onChange={e => set(x => { x.cats[ci].qs[ri].a = e.target.value; })} />
            </div>
          ))}
        </Card>
      ))}
      {g.cats.length < MAX_CATS && <Button variant="secondary" onClick={() => set(x => { x.cats.push(newCat()); })}>+ Тақырып қосу</Button>}
      {shown && msg && <p role="alert" className="text-sm text-danger">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => submit(false)}>Сақтау</Button>
        <Button variant="success" onClick={() => submit(true)}>Сақтап ойнау</Button>
        <Button variant="ghost" onClick={onCancel}>Болдырмау</Button>
      </div>
    </div>
  );
}

type SetupState = readonly [Setup, (fn: (p: Setup) => Setup) => void];

function PanelButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return <Button variant="secondary" aria-expanded={open} onClick={onClick}><SlidersHorizontal size={16} aria-hidden="true" />Параметрлер</Button>;
}

function Play({ game, onExit, ctx, state }: { game: Game; onExit: () => void; ctx: Ctx; state: SetupState }) {
  const [setup, update] = state;
  const { teams, rules } = setup;
  const setTeams = (fn: (t: Setup['teams']) => Setup['teams']) => update(p => ({ ...p, teams: fn(p.teams) }));
  const [panel, setPanel] = useState(false);
  const [saved, setSaved] = useState('');
  const autoSaved = useRef(false);
  useEffect(() => { setTeams(t => t.map(x => ({ ...x, score: 0 }))); }, []); // every game starts from zero
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ c: number; r: number } | null>(null);
  const [answer, setAnswer] = useState(false);
  const head = useRef<HTMLHeadingElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [fs, setFs] = useState(false);
  useEffect(() => { if (open) head.current?.focus(); }, [open]);
  useEffect(() => {
    const h = () => setFs(document.fullscreenElement === root.current);
    document.addEventListener('fullscreenchange', h);
    return () => { document.removeEventListener('fullscreenchange', h); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, []);
  const toggleFs = () => (fs ? document.exitFullscreen() : root.current?.requestFullscreen())?.catch(() => {});

  const key = (c: number, r: number) => `${c}-${r}`;
  const playable = (c: number, r: number) => !!game.cats[c].qs[r].q.trim();
  const total = game.cats.reduce((n, c, ci) => n + c.qs.filter((_, ri) => playable(ci, ri)).length, 0);
  const done = used.size >= total;
  const best = Math.max(...teams.map(t => t.score));
  const bump = (i: number, d: number) => setTeams(t => t.map((x, j) => (j === i ? { ...x, score: applyScore(x.score, d, rules) } : x)));
  const saveRun = async () => {
    try { await addRun(ctx, { id: crypto.randomUUID(), title: game.title, at: new Date().toISOString(), teams, rules }); setSaved('ok'); }
    catch (e) { setSaved((e as Error).message || 'Қате'); }
  };
  useEffect(() => { if (done && total > 0 && !autoSaved.current) { autoSaved.current = true; saveRun(); } }, [done]);
  const close = (markUsed: boolean) => {
    if (markUsed && open) setUsed(u => new Set(u).add(key(open.c, open.r)));
    setOpen(null); setAnswer(false);
  };
  const q = open && game.cats[open.c].qs[open.r];

  return (
    <div ref={root} className={`space-y-4 ${fs ? 'bg-bg text-text p-6 overflow-auto' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold break-words">{game.title}</h2>
        <div className="flex flex-wrap gap-2">
          <PanelButton open={panel} onClick={() => setPanel(p => !p)} />
          {document.fullscreenEnabled && <Button variant="secondary" onClick={toggleFs}>{fs ? <><Minimize size={16} aria-hidden="true" />Толық экраннан шығу</> : <><Maximize size={16} aria-hidden="true" />Толық экран</>}</Button>}
          {!fs && <Button variant="secondary" onClick={onExit}><ArrowLeft size={16} aria-hidden="true" />Ойыннан шығу</Button>}
        </div>
      </div>

      {(rules.penaltyPct !== 100 || !rules.allowNegative || rules.note) && (
        <p className="text-sm text-text-secondary">Қате жауап: −{rules.penaltyPct}% ұпай{rules.allowNegative ? '' : ' (нөлден төмен түспейді)'}.{rules.note && ` ${rules.note}`}</p>
      )}

      <div aria-live="polite" className="flex flex-wrap gap-2">
        {teams.map((t, i) => (
          <Card key={i} className="!p-2">
            <div className="flex items-center gap-2">
              <input className={inputCls + ' !w-36'} aria-label={`${i + 1}-команда атауы`} value={t.name} onChange={e => setTeams(ts => ts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <span className="text-xl font-bold min-w-[3.5rem] text-right" aria-label={`${t.name}: ${t.score} ұпай`}>{t.score}</span>
            </div>
            {t.members.length > 0 && <div className="mt-1 max-w-[16rem] text-sm text-text-secondary break-words">{t.members.join(', ')}</div>}
          </Card>
        ))}
        {teams.length < MAX_TEAMS && <Button variant="secondary" onClick={() => setTeams(t => [...t, newTeam(t.length + 1)])}>+ Команда</Button>}
        {teams.length > 1 && <Button variant="secondary" onClick={() => setTeams(t => t.slice(0, -1))}>− Команда</Button>}
      </div>

      {open && q ? (
        <Card className="space-y-4">
          <h3 ref={head} tabIndex={-1} className="text-sm font-semibold text-text-secondary">{game.cats[open.c].name} · {points(open.r)}</h3>
          <p className={`font-bold break-words ${fs ? 'text-5xl' : 'text-2xl sm:text-3xl'}`}>{q.q}</p>
          {!answer ? <Button onClick={() => setAnswer(true)}>Жауапты көрсету</Button> : (
            <>
              <p className={`rounded-md bg-success-soft text-success p-3 break-words ${fs ? 'text-3xl' : 'text-xl'}`}><span className="font-semibold">Жауап:</span> {q.a}</p>
              <ul className="space-y-2">
                {teams.map((t, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold min-w-[8rem] break-words">{t.name}</span>
                    <Button variant="success" aria-label={`${t.name}: дұрыс, +${points(open.r)}`} onClick={() => bump(i, points(open.r))}>+{points(open.r)}</Button>
                    <Button variant="danger" aria-label={`${t.name}: қате, −${penalty(points(open.r), rules)}`} onClick={() => bump(i, -penalty(points(open.r), rules))}>−{penalty(points(open.r), rules)}</Button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => close(true)}>Дайын</Button>
            <Button variant="ghost" onClick={() => close(false)}><ArrowLeft size={16} aria-hidden="true" />Тақтаға қайту</Button>
          </div>
        </Card>
      ) : (
        <>
          {done && <p role="status" className="rounded-md bg-accent-soft text-on-accent-soft p-3 font-semibold">Ойын аяқталды. Жеңімпаз: {teams.filter(t => t.score === best).map(t => t.name).join(', ')} ({best})</p>}
          <div className="flex flex-wrap items-center gap-3">
            {saved === 'ok' ? <p role="status" className="text-sm font-semibold text-success">Нәтиже тарихқа сақталды.</p>
              : !done && <Button variant="secondary" onClick={saveRun}><Save size={16} aria-hidden="true" />Нәтижені сақтау</Button>}
            {saved && saved !== 'ok' && <p role="alert" className="text-sm text-danger">{saved}</p>}
          </div>
          <div className="overflow-x-auto">
            <div className="grid gap-2 min-w-[36rem]" style={{ gridTemplateColumns: `repeat(${game.cats.length}, minmax(0, 1fr))` }}>
              {game.cats.map((c, ci) => (
                <section key={ci} aria-label={c.name} className="space-y-2">
                  <h3 className="min-h-[56px] grid place-items-center text-center font-bold rounded-md bg-surface-2 px-2 break-words">{c.name}</h3>
                  {c.qs.map((_, ri) => {
                    const off = used.has(key(ci, ri)) || !playable(ci, ri);
                    return (
                      <button key={ri} type="button" disabled={off} aria-label={`${c.name}, ${points(ri)}${used.has(key(ci, ri)) ? ', өтті' : ''}`}
                        onClick={() => setOpen({ c: ci, r: ri })}
                        className={`w-full rounded-md bg-accent text-on-accent hover:bg-accent-hover font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${fs ? 'min-h-[11vh] text-5xl' : 'min-h-[64px] text-2xl'}`}>
                        {points(ri)}
                      </button>
                    );
                  })}
                </section>
              ))}
            </div>
          </div>
        </>
      )}
      {panel && <JeopardyPanel ctx={ctx} setup={setup} update={update} onClose={() => setPanel(false)} />}
    </div>
  );
}

export function Jeopardy({ me }: { me: Me }) {
  const { data, error, loading, reload } = useLoad(() => listGames(me), [me.id]);
  const [mode, setMode] = useState<{ kind: 'list' } | { kind: 'edit' | 'play'; game: Game }>({ kind: 'list' });
  const ctx: Ctx = { me, staff: true };
  const state = useSetup(me);
  const [panel, setPanel] = useState(false);
  const [delId, setDelId] = useState('');
  const [err, setErr] = useState('');
  const [link, setLink] = useState<{ id: string; play: string; edit: string; copied: '' | 'play' | 'edit' | 'fail' } | null>(null);
  const games = data?.games || [];
  const stuck = data && !data.local ? read(localKey(me)).length : 0; // games made in this browser before the table existed

  const run = async (fn: () => Promise<void>) => {
    try { await fn(); setErr(''); reload(); return true; } catch (e) { setErr((e as Error).message || 'Қате'); return false; }
  };
  const save = async (g: Game, play: boolean) => { if (await run(() => saveGame(me, g))) setMode(play ? { kind: 'play', game: g } : { kind: 'list' }); };
  const moveUp = () => run(async () => { for (const g of read(localKey(me))) await saveGame(me, g); write(localKey(me), []); });
  const copy = async (kind: 'play' | 'edit') => { if (link) setLink({ ...link, copied: await navigator.clipboard.writeText(link[kind]).then(() => kind, () => 'fail' as const) }); };
  const share = async (g: Game) => {
    try {
      const base = `${location.origin}${location.pathname}#`, packed = await encodeGame(g);
      setLink({ id: g.id, play: `${base}jeopardy/${packed}`, edit: `${base}jeopardy-edit/${packed}`, copied: '' });
    } catch { setErr('Сілтеме жасау мүмкін болмады'); }
  };

  if (mode.kind === 'edit') return <><Editor initial={mode.game} onSave={save} onCancel={() => setMode({ kind: 'list' })} />{err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}</>;
  if (mode.kind === 'play') return <Play game={mode.game} ctx={ctx} state={state} onExit={() => setMode({ kind: 'list' })} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Jeopardy</h2>
        <div className="flex gap-2">
          <PanelButton open={panel} onClick={() => setPanel(p => !p)} />
          <Button onClick={() => setMode({ kind: 'edit', game: newGame() })}>+ Жаңа ойын</Button>
        </div>
      </div>
      {data?.local && !DEMO && <p role="status" className="rounded-md bg-warning-soft text-warning p-3 text-sm">Ойындар серверге әлі қосылмаған, сондықтан тек осы браузерде сақталады (006_jeopardy.sql жүргізілмеген).</p>}
      {stuck > 0 && (
        <div className="rounded-md bg-accent-soft text-on-accent-soft p-3 flex flex-wrap items-center gap-3">
          <span className="flex-1 min-w-[12rem] text-sm font-semibold">Осы браузерде {stuck} ойын бар, ол басқа құрылғыда көрінбейді.</span>
          <Button onClick={moveUp}>Аккаунтқа көшіру</Button>
        </div>
      )}
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      {loading && !data && <Skeleton />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {data && games.length === 0 && <EmptyState icon={<Target size={32} />} text="Әзірге ойын жоқ. «+ Жаңа ойын» басып тақырыптар мен сұрақтар жазыңыз." />}
      {games.map(g => (
        <React.Fragment key={g.id}>
        <Card className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[10rem]">
            <div className="font-semibold break-words">{g.title || 'Атаусыз'}</div>
            <div className="text-sm text-text-muted">{g.cats.length} тақырып · {filled(g)} сұрақ</div>
          </div>
          <Button variant="success" disabled={filled(g) === 0} onClick={() => setMode({ kind: 'play', game: g })}><PlayIcon size={16} aria-hidden="true" />Ойнау</Button>
          <Button variant="secondary" onClick={() => setMode({ kind: 'edit', game: g })}>Өңдеу</Button>
          <Button variant="secondary" aria-label={`${g.title || 'Атаусыз'}: бөлісу сілтемесі`} onClick={() => share(g)}><Link2 size={16} aria-hidden="true" />Сілтеме</Button>
          {delId === g.id
            ? <><Button variant="danger" onClick={() => { run(() => removeGame(me, g.id)); setDelId(''); }}>Иә, жою</Button><Button variant="ghost" onClick={() => setDelId('')}>Жоқ</Button></>
            : <Button variant="ghost" aria-label={`${g.title || 'Атаусыз'} ойынын жою`} onClick={() => setDelId(g.id)}>Жою</Button>}
        </Card>
        {link?.id === g.id && (
          <div className="rounded-md bg-accent-soft p-3 space-y-3">
            {([['play', 'Орындауға арналған сілтеме', 'ашқан адам ойынды ойнайды (оқушыларға)'], ['edit', 'Өңдеуге арналған сілтеме', 'ашқан мұғалім ойынды өңдеп, өз аккаунтына сақтайды']] as const).map(([k, title, hint]) => (
              <div key={k} className="space-y-1">
                <label htmlFor={`share-${k}`} className="block text-sm font-semibold text-on-accent-soft">{title} <span className="font-normal">— {hint}</span></label>
                <div className="flex gap-2">
                  <input id={`share-${k}`} readOnly className={inputCls} value={link[k]} onFocus={e => e.currentTarget.select()} />
                  <Button variant="secondary" aria-label={`${title}: көшіру`} onClick={() => copy(k)}>Көшіру</Button>
                </div>
              </div>
            ))}
            <p role="status" className="text-sm font-semibold text-on-accent-soft">{link.copied === 'play' ? 'Орындауға арналған сілтеме көшірілді.' : link.copied === 'edit' ? 'Өңдеуге арналған сілтеме көшірілді.' : link.copied === 'fail' ? 'Көшіру мүмкін болмады, сілтемені өзіңіз көшіріңіз.' : ''}</p>
            <p className="text-sm text-on-accent-soft">Екі сілтемеде де сұрақтар мен жауаптар бар, оны тек білетін адамға жіберіңіз. Сілтеме ойынның сол кездегі көшірмесі: кейін өзгертсеңіз, жаңа сілтеме жасаңыз. Өңдеу сілтемесі сіздің ойыныңызды өзгертпейді, әріптес өз көшірмесін сақтайды.</p>
          </div>
        )}
        </React.Fragment>
      ))}
      {panel && <JeopardyPanel ctx={ctx} setup={state[0]} update={state[1]} onClose={() => setPanel(false)} />}
    </div>
  );
}

/** Opens a game from a share link: play it right away, and teachers can keep a copy. */
export function SharedGame({ payload, me, canSave }: { payload: string; me: Me; canSave: boolean }) {
  const [state, setState] = useState<{ game?: Game; bad?: boolean }>({});
  const setup = useSetup(me);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { decodeGame(payload).then(game => setState({ game }), () => setState({ bad: true })); }, [payload]);
  const keep = () => state.game && saveGame(me, state.game).then(() => setSaved(true), e => setErr(e.message || 'Қате'));
  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      {state.bad && <EmptyState icon={<Unlink size={32} />} text="Сілтеме бүлінген немесе толық емес. Жібергеннен жаңасын сұраңыз." action={<a className="text-accent underline" href="#">Басты бетке</a>} />}
      {state.game && (
        <>
          {canSave && (saved
            ? <p role="status" className="text-sm font-semibold text-success">Ойын «Тапсырмалар › Jeopardy» тізіміне сақталды.</p>
            : <Button variant="secondary" onClick={keep}>Менің ойындарыма сақтау</Button>)}
          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          <Play game={state.game} ctx={{ me, staff: canSave }} state={setup} onExit={() => { window.location.hash = canSave ? 'tasks/jeopardy' : ''; }} />
        </>
      )}
    </main>
  );
}

/** Opens a game from an edit link: the teacher edits a copy and keeps it in their own list (the sender's game never changes). */
export function SharedEdit({ payload, me, canSave }: { payload: string; me: Me; canSave: boolean }) {
  const [state, setState] = useState<{ game?: Game; bad?: boolean }>({});
  const [err, setErr] = useState('');
  useEffect(() => { decodeGame(payload).then(game => setState({ game }), () => setState({ bad: true })); }, [payload]);
  const save = async (g: Game, play: boolean) => {
    try { await saveGame(me, g); window.location.hash = play ? 'jeopardy/' + await encodeGame(g) : 'tasks/jeopardy'; }
    catch (e) { setErr((e as Error).message || 'Қате'); }
  };
  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      {!canSave && <EmptyState icon={<Unlink size={32} />} text="Өңдеу сілтемесі мұғалімдерге арналған. Ойнау үшін орындауға арналған сілтемені сұраңыз." action={<a className="text-accent underline" href="#">Басты бетке</a>} />}
      {canSave && state.bad && <EmptyState icon={<Unlink size={32} />} text="Сілтеме бүлінген немесе толық емес. Жібергеннен жаңасын сұраңыз." action={<a className="text-accent underline" href="#">Басты бетке</a>} />}
      {canSave && state.game && (
        <>
          <p role="status" className="rounded-md bg-accent-soft text-on-accent-soft p-3 text-sm font-semibold">Бұл — алынған ойынның көшірмесі. «Сақтау» басқанда ол «Тапсырмалар › Jeopardy» тізіміне түседі, жіберушінің ойыны өзгермейді.</p>
          <Editor initial={state.game} onSave={save} onCancel={() => { window.location.hash = 'tasks/jeopardy'; }} />
          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
        </>
      )}
    </main>
  );
}
