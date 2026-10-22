import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, EmptyState, Field, inputCls } from '../ui';

interface Cat { name: string; qs: { q: string; a: string }[] }
interface Game { id: string; title: string; cats: Cat[] }

const ROWS = 5, MAX_CATS = 6, MAX_TEAMS = 4;
const points = (row: number) => (row + 1) * 100;
const newCat = (): Cat => ({ name: '', qs: Array.from({ length: ROWS }, () => ({ q: '', a: '' })) });
const newGame = (): Game => ({ id: crypto.randomUUID(), title: '', cats: [newCat(), newCat(), newCat()] });
const filled = (g: Game) => g.cats.reduce((n, c) => n + c.qs.filter(x => x.q.trim()).length, 0);

// shortcut: games live in this browser only (localStorage, per teacher); move to a cf_ table to share between devices
const read = (key: string): Game[] => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v.filter(g => g && typeof g.id === 'string' && Array.isArray(g.cats)) : [];
  } catch { return []; }
};
const write = (key: string, games: Game[]) => { try { localStorage.setItem(key, JSON.stringify(games)); return true; } catch { return false; } };
const NO_SAVE = 'Браузер сақтауға рұқсат бермеді (құпия режимде болуы мүмкін)';

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

function Play({ game, onExit }: { game: Game; onExit: () => void }) {
  const [teams, setTeams] = useState([{ name: 'Команда 1', score: 0 }, { name: 'Команда 2', score: 0 }]);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<{ c: number; r: number } | null>(null);
  const [answer, setAnswer] = useState(false);
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (open) head.current?.focus(); }, [open]);

  const key = (c: number, r: number) => `${c}-${r}`;
  const playable = (c: number, r: number) => !!game.cats[c].qs[r].q.trim();
  const total = game.cats.reduce((n, c, ci) => n + c.qs.filter((_, ri) => playable(ci, ri)).length, 0);
  const done = used.size >= total;
  const best = Math.max(...teams.map(t => t.score));
  const bump = (i: number, d: number) => setTeams(t => t.map((x, j) => (j === i ? { ...x, score: x.score + d } : x)));
  const close = (markUsed: boolean) => {
    if (markUsed && open) setUsed(u => new Set(u).add(key(open.c, open.r)));
    setOpen(null); setAnswer(false);
  };
  const q = open && game.cats[open.c].qs[open.r];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold break-words">{game.title}</h2>
        <Button variant="secondary" onClick={onExit}>← Ойыннан шығу</Button>
      </div>

      <div aria-live="polite" className="flex flex-wrap gap-2">
        {teams.map((t, i) => (
          <Card key={i} className="flex items-center gap-2 !p-2">
            <input className={inputCls + ' !w-36'} aria-label={`${i + 1}-команда атауы`} value={t.name} onChange={e => setTeams(ts => ts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <span className="text-xl font-bold min-w-[3.5rem] text-right" aria-label={`${t.name}: ${t.score} ұпай`}>{t.score}</span>
          </Card>
        ))}
        {teams.length < MAX_TEAMS && <Button variant="secondary" onClick={() => setTeams(t => [...t, { name: `Команда ${t.length + 1}`, score: 0 }])}>+ Команда</Button>}
        {teams.length > 1 && <Button variant="secondary" onClick={() => setTeams(t => t.slice(0, -1))}>− Команда</Button>}
      </div>

      {open && q ? (
        <Card className="space-y-4">
          <h3 ref={head} tabIndex={-1} className="text-sm font-semibold text-text-secondary">{game.cats[open.c].name} · {points(open.r)}</h3>
          <p className="text-2xl sm:text-3xl font-bold break-words">{q.q}</p>
          {!answer ? <Button onClick={() => setAnswer(true)}>Жауапты көрсету</Button> : (
            <>
              <p className="text-xl rounded-md bg-success-soft text-success p-3 break-words"><span className="font-semibold">Жауап:</span> {q.a}</p>
              <ul className="space-y-2">
                {teams.map((t, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold min-w-[8rem] break-words">{t.name}</span>
                    <Button variant="success" aria-label={`${t.name}: дұрыс, +${points(open.r)}`} onClick={() => bump(i, points(open.r))}>+{points(open.r)}</Button>
                    <Button variant="danger" aria-label={`${t.name}: қате, −${points(open.r)}`} onClick={() => bump(i, -points(open.r))}>−{points(open.r)}</Button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => close(true)}>Дайын</Button>
            <Button variant="ghost" onClick={() => close(false)}>← Тақтаға қайту</Button>
          </div>
        </Card>
      ) : (
        <>
          {done && <p role="status" className="rounded-md bg-accent-soft text-on-accent-soft p-3 font-semibold">Ойын аяқталды. Жеңімпаз: {teams.filter(t => t.score === best).map(t => t.name).join(', ')} ({best})</p>}
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
                        className="w-full min-h-[64px] rounded-md bg-accent text-on-accent hover:bg-accent-hover text-2xl font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
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
    </div>
  );
}

export function Jeopardy({ meId }: { meId: string }) {
  const storeKey = 'cf_jeopardy_' + meId;
  const [games, setGames] = useState<Game[]>(() => read(storeKey));
  const [mode, setMode] = useState<{ kind: 'list' } | { kind: 'edit' | 'play'; game: Game }>({ kind: 'list' });
  const [delId, setDelId] = useState('');
  const [err, setErr] = useState('');

  const persist = (next: Game[]) => { if (!write(storeKey, next)) { setErr(NO_SAVE); return false; } setGames(next); setErr(''); return true; };
  const save = (g: Game, play: boolean) => {
    if (persist(games.some(x => x.id === g.id) ? games.map(x => (x.id === g.id ? g : x)) : [g, ...games])) setMode({ kind: play ? 'play' : 'list', game: g } as typeof mode);
  };

  if (mode.kind === 'edit') return <><Editor initial={mode.game} onSave={save} onCancel={() => setMode({ kind: 'list' })} />{err && <p role="alert" className="mt-2 text-sm text-danger">{err}</p>}</>;
  if (mode.kind === 'play') return <Play game={mode.game} onExit={() => setMode({ kind: 'list' })} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Jeopardy</h2>
        <Button onClick={() => setMode({ kind: 'edit', game: newGame() })}>+ Жаңа ойын</Button>
      </div>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      {games.length === 0 && <EmptyState icon="🎯" text="Әзірге ойын жоқ. «+ Жаңа ойын» басып тақырыптар мен сұрақтар жазыңыз." />}
      {games.map(g => (
        <Card key={g.id} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[10rem]">
            <div className="font-semibold break-words">{g.title || 'Атаусыз'}</div>
            <div className="text-sm text-text-muted">{g.cats.length} тақырып · {filled(g)} сұрақ</div>
          </div>
          <Button variant="success" disabled={filled(g) === 0} onClick={() => setMode({ kind: 'play', game: g })}>▶ Ойнау</Button>
          <Button variant="secondary" onClick={() => setMode({ kind: 'edit', game: g })}>Өңдеу</Button>
          {delId === g.id
            ? <><Button variant="danger" onClick={() => { persist(games.filter(x => x.id !== g.id)); setDelId(''); }}>Иә, жою</Button><Button variant="ghost" onClick={() => setDelId('')}>Жоқ</Button></>
            : <Button variant="ghost" aria-label={`${g.title || 'Атаусыз'} ойынын жою`} onClick={() => setDelId(g.id)}>Жою</Button>}
        </Card>
      ))}
    </div>
  );
}
