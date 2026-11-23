import React, { useEffect, useState } from 'react';
import { CalendarDays, FastForward, Hand, History, LogOut, MessageCircleQuestion, Palette, Send, ShieldCheck, UserRound, X, Zap, Languages } from 'lucide-react';
import { LangSwitch } from '../i18n/LangSwitch';
import { givenName } from '../ui/names';
import { FontPicker, ThemePicker } from '../ui/ThemePicker';
import { CF, DEMO, sb } from '../config';
import { ROLE_NAMES } from '../nav/config';
import { Button, Card, Field, inputCls } from '../ui';
import { DEFAULT_PREFS, getPrefs, quartersError, resetPrefs, setPrefs } from '../prefs';
import type { Prefs, Span } from '../prefs';

// <input type="date"> needs a year; the stored value is only month-day, so any non-leap year works.
const toDate = (md: string) => (md ? `${+md.slice(0, 2) >= 9 ? 2001 : 2002}-${md}` : '');
const Msg = ({ m }: { m: { t: string; bad?: boolean } | null }) => (m ? <p role={m.bad ? 'alert' : 'status'} className={'text-sm ' + (m.bad ? 'text-danger' : 'text-success')}>{m.t}</p> : null);

const RULE_LIST: [keyof Prefs['rules'], string, typeof Hand][] = [['ask', 'Сұрақ қою', MessageCircleQuestion], ['hand', 'Қол көтеру', Hand], ['ahead', 'Алға өту', FastForward], ['nav', 'Өз бетімен жылжу', History], ['auto', 'Авто-тапсырма', Zap], ['lang', 'Тілді ауыстыру', Languages]];

/** Teaching defaults: the quarter calendar (drives the quarter filters and the schedule) and two start values. Stored on this device. */
function TeachingSettings() {
  const [p, setP] = useState<Prefs>(() => getPrefs());
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const span = (i: number, k: keyof Span, v: string) => { setMsg(null); setP(o => ({ ...o, quarters: o.quarters.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })); };
  const num = (k: 'groups' | 'kbMax', v: string) => { setMsg(null); setP(o => ({ ...o, [k]: v === '' ? NaN : Number(v) })); };
  const save = () => {
    const e = (Number.isInteger(p.examMin) && p.examMin >= 5 && p.examMin <= 240 ? '' : 'Емтихан уақыты 5 пен 240 минут аралығында болуы керек') || quartersError(p.quarters) || (Number.isInteger(p.groups) && p.groups >= 1 && p.groups <= 8 ? '' : 'Топ саны 1 мен 8 аралығында болуы керек') || (Number.isInteger(p.kbMax) && p.kbMax >= 1 && p.kbMax <= 100 ? '' : 'ҚБ ең жоғары ұпайы 1 мен 100 аралығында болуы керек');
    if (e) return setMsg({ t: e, bad: true });
    try { setPrefs(p); } catch (x) { return setMsg({ t: (x as Error).message, bad: true }); }
    if (DEMO) return setMsg({ t: 'Осы құрылғыда сақталды' });
    sb.rpc('cf_save_my_prefs', { p_prefs: getPrefs() }).then(({ error }) => setMsg(error ? { t: 'Осы құрылғыда сақталды, аккаунтқа сақталмады: ' + error.message, bad: true } : { t: 'Баптаулар сақталды: енді кез келген құрылғыда бірдей' }));
  };
  const reset = () => { resetPrefs(); setP(DEFAULT_PREFS); setMsg({ t: 'Әдепкі мәндер қайтарылды. Аккаунтқа жазу үшін «Сақтау» басыңыз' }); };
  const rule = (k: keyof Prefs['rules']) => { setMsg(null); setP(o => ({ ...o, rules: { ...o.rules, [k]: !o.rules[k] } })); };
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Оқыту баптаулары</h2>
        <p className="text-sm text-text-secondary">Аккаунтта сақталады. Тоқсан күндері «Сабақтар» мен «Журнал» сүзгілерін және КТП ұяшықтарын құру аралығын анықтайды. Жыл есепке алынбайды: күндер әр оқу жылында қайталанады.</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text-secondary">Тоқсан күндері (демалыстар аралықта қалады)</legend>
        {p.quarters.map((x, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)]">
            <span className="col-span-2 text-sm font-medium sm:col-span-1 sm:pb-3">{i + 1}-тоқсан</span>
            <Field label="Басталуы">{id => <input id={id} type="date" className={inputCls} value={toDate(x.from)} onChange={e => span(i, 'from', e.target.value.slice(5))} />}</Field>
            <Field label="Аяқталуы">{id => <input id={id} type="date" className={inputCls} value={toDate(x.to)} onChange={e => span(i, 'to', e.target.value.slice(5))} />}</Field>
          </div>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Сабақты бастағандағы топ саны (1–8)">{id => <input id={id} inputMode="numeric" className={inputCls} value={Number.isNaN(p.groups) ? '' : p.groups} onChange={e => num('groups', e.target.value)} />}</Field>
        <Field label="ҚБ бағанының ең жоғары ұпайы (1–100)">{id => <input id={id} inputMode="numeric" className={inputCls} value={Number.isNaN(p.kbMax) ? '' : p.kbMax} onChange={e => num('kbMax', e.target.value)} />}</Field>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Жаңа сабақтың әдепкі ережелері</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {RULE_LIST.map(([k, name, Icon]) => { const on = p.rules[k]; return (
            <button key={k} type="button" role="switch" aria-checked={on} onClick={() => rule(k)} className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-3 text-left ${on ? 'border-success/40 bg-success-soft' : 'border-border bg-surface hover:bg-surface-2'}`}>
              <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${on ? 'bg-success text-white' : 'bg-surface-2 text-text-secondary'}`}><Icon size={16} /></span>
              <span className="flex-1 text-sm font-semibold">{name}</span>
              <span aria-hidden="true" className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 ${on ? 'justify-end bg-success' : 'justify-start bg-text-muted'}`}><span className="h-5 w-5 rounded-full bg-white" /></span>
            </button>); })}
        </div>
      </div>
      <Field label="Жаңа емтиханның уақыты, мин (5–240)">{id => <input id={id} inputMode="numeric" className={inputCls} value={Number.isNaN(p.examMin) ? '' : p.examMin} onChange={e => { setMsg(null); setP(o => ({ ...o, examMin: e.target.value === '' ? NaN : Number(e.target.value) })); }} />}</Field>
      <Msg m={msg} />
      <div className="flex flex-wrap gap-2"><Button onClick={save}>Баптауларды сақтау</Button><Button variant="secondary" onClick={reset}>Әдепкіге қайтару</Button></div>
    </Card>
  );
}

const initials = (full: string) => { const w = (full || '?').trim().split(/\s+/); return ((w[0]?.[0] || '') + (w[1]?.[0] || '')).toUpperCase() || '?'; };
const Chip = ({ children, tone = 'bg-surface-2 text-text-secondary' }: { children: React.ReactNode; tone?: string }) => <span className={`inline-flex min-h-[28px] items-center rounded-full px-2.5 text-xs font-semibold ${tone}`}>{children}</span>;
const Stat = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="rounded-xl bg-surface-2 px-3.5 py-2.5"><p className="text-xs font-semibold text-text-muted">{k}</p><p className="text-2xl font-extrabold">{v}</p></div>;

/** Name, subjects, Telegram and the default room (staff). */
function MeSection({ me }: { me: any }) {
  const w = (me.full_name || '').trim().split(/\s+/);
  const [sur, setSur] = useState(w[0] || ''), [given, setGiven] = useState(w[1] || ''), [father, setFather] = useState(w.slice(2).join(' '));
  const [subjects, setSubjects] = useState<string[]>(() => String(me.subject || '').split(',').map((x: string) => x.trim()).filter(Boolean));
  const [add, setAdd] = useState('');
  const [room, setRoom] = useState(getPrefs().room);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [tg, setTg] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (DEMO) return;
    sb.from('cf_rooms').select('id,name').eq('school_id', me.school_id).order('name').then(({ data }) => setRooms((data || []) as any), () => {});
    sb.rpc('cf_my_telegram').then(({ data, error }) => setTg(error ? null : !!data), () => {});
  }, [me.id]);
  const save = async () => {
    setMsg(null);
    const full = [sur, given, father].map(x => x.trim()).filter(Boolean).join(' ');
    if (!sur.trim() || !given.trim()) return setMsg({ t: 'Тегі мен аты міндетті', bad: true });
    if (DEMO) return setMsg({ t: 'Демо режимде сақталмайды', bad: true });
    setBusy(true);
    const r1 = await sb.rpc('cf_save_my_profile', { p_full_name: full, p_subject: subjects.join(', ') });
    try { setPrefs({ ...getPrefs(), room }); } catch { /* still saved on the account below */ }
    const r2 = await sb.rpc('cf_save_my_prefs', { p_prefs: { ...getPrefs(), room } });
    setBusy(false);
    if (r1.error || r2.error) return setMsg({ t: (r1.error || r2.error)!.message, bad: true });
    setMsg({ t: 'Сақталды' });
    if (full !== me.full_name) setTimeout(() => window.location.reload(), 600); // the name is shown all over the app
  };
  const linkTg = async () => {
    setMsg(null);
    const { data, error } = await sb.functions.invoke('telegram', { body: { action: 'link_url' } });
    if (error || !data?.url) return setMsg({ t: data?.error || 'Telegram сілтемесі жасалмады', bad: true });
    window.open(data.url, '_blank', 'noopener');
    setMsg({ t: 'Telegram-да «Start» басыңыз, сосын осы бетті жаңартыңыз' });
  };
  const inp = inputCls;
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-bold">Жеке мәліметтер</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Тегі">{id => <input id={id} className={inp} value={sur} onChange={e => setSur(e.target.value)} autoComplete="family-name" />}</Field>
        <Field label="Аты">{id => <input id={id} className={inp} value={given} onChange={e => setGiven(e.target.value)} autoComplete="given-name" />}</Field>
        <Field label="Әкесінің аты">{id => <input id={id} className={inp} value={father} onChange={e => setFather(e.target.value)} />}</Field>
      </div>
      <p className="text-sm text-text-secondary">Сәлемдесуде «Аты» қолданылады: «Сәлеметсіз бе, {given.trim() || givenName(me.full_name) || '…'}!»</p>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Пәндерім</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {subjects.map(x => (
            <span key={x} className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-accent-soft pl-3 pr-1 text-sm font-semibold text-on-accent-soft">{x}
              <button type="button" aria-label={`${x}: алып тастау`} onClick={() => setSubjects(subjects.filter(y => y !== x))} className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface"><X size={14} /></button></span>))}
          <form onSubmit={e => { e.preventDefault(); const v = add.trim(); if (v && !subjects.includes(v) && subjects.length < 8) setSubjects([...subjects, v]); setAdd(''); }} className="flex items-center gap-1">
            <input aria-label="Жаңа пән" className={inp + ' !min-h-[34px] !w-40 !py-1 text-sm'} placeholder="+ Пән қосу" value={add} maxLength={40} onChange={e => setAdd(e.target.value)} />
          </form>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-info-soft text-on-accent-soft"><Send size={19} /></span>
          <span className="min-w-0 flex-1"><b className="block text-sm">Telegram</b><span className="text-xs text-text-secondary">{tg ? 'Байланысқан: хабарламалар келеді' : 'Сабақ, бронь, емтихан хабарламалары'}</span></span>
          {tg ? <Chip tone="bg-success-soft text-success">✓ Қосулы</Chip> : <Button className="!min-h-[38px] text-sm" onClick={linkTg}>Байланыстыру</Button>}
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-text-secondary"><CalendarDays size={19} /></span>
          <label className="min-w-0 flex-1"><b className="block text-sm">Кабинетім</b><span className="text-xs text-text-secondary">Сабақ кестесінде әдепкі кабинет</span>
            <select className={inp + ' mt-1 !min-h-[38px] text-sm'} value={room} onChange={e => setRoom(e.target.value)}><option value="">—</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        </div>
      </div>
      <Msg m={msg} />
      <Button onClick={save} loading={busy}>Сақтау</Button>
    </Card>
  );
}

function Security({ onLogout }: { onLogout: () => void }) {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const changePw = async () => {
    if (pw.length < 6) return setMsg({ t: 'Құпиясөз кемінде 6 таңба болуы керек', bad: true });
    if (pw !== pw2) return setMsg({ t: 'Құпиясөздер сәйкес емес', bad: true });
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) return setMsg({ t: error.message, bad: true });
    setPw(''); setPw2(''); setMsg({ t: 'Құпиясөз өзгертілді' });
  };
  const everywhere = async () => {
    if (!window.confirm('Барлық құрылғыдағы кіру (телефон, басқа компьютер) жабылады. Жалғастырасыз ба?')) return;
    await sb.auth.signOut({ scope: 'global' }); onLogout(); window.location.hash = '';
  };
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">Қауіпсіздік</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Жаңа құпиясөз">{id => <input id={id} className={inputCls} type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} />}</Field>
        <Field label="Қайталаңыз">{id => <input id={id} className={inputCls} type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} />}</Field>
      </div>
      <Msg m={msg} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={changePw}>Құпиясөзді өзгерту</Button>
        <Button variant="secondary" className="!text-danger" onClick={everywhere}>Барлық құрылғыдан шығу</Button>
      </div>
    </Card>
  );
}

const Look = () => (
  <div className="space-y-4">
    <Card className="space-y-2"><h2 className="font-semibold">Интерфейс тілі</h2><LangSwitch /></Card>
    <ThemePicker />
    <FontPicker />
  </div>
);

/** Profile page: a header (photo, name, roles, numbers) and sections — Профиль, Сабақ баптаулары, Көрініс және тіл, Қауіпсіздік. Students get a short one-column page. */
export function ProfileCard({ me, onLogout }: { me: any; onLogout: () => void }) {
  const staff = me.role !== 'student';
  const [tab, setTab] = useState<'me' | 'teach' | 'look' | 'safe'>('me');
  const [info, setInfo] = useState<{ school: string; login: string; cls: string; homeroom: string[]; stats: [string, React.ReactNode][] }>({ school: '', login: '', cls: '', homeroom: [], stats: [] });
  useEffect(() => {
    if (DEMO) return;
    (async () => {
      const ok = (r: any) => (r && !r.error ? r : { data: null, count: null });
      const [sc, user, cls, home] = await Promise.all([
        sb.from('schools').select('name').eq('id', me.school_id).maybeSingle().then(ok, () => ({})),
        sb.auth.getUser(),
        me.class_id ? sb.from('classes').select('name').eq('id', me.class_id).maybeSingle().then(ok, () => ({})) : Promise.resolve({}),
        staff ? sb.from('classes').select('name').eq('teacher_id', me.id).then(ok, () => ({})) : Promise.resolve({}),
      ]) as any[];
      const e = user?.data?.user?.email || '';
      let stats: [string, React.ReactNode][] = [];
      if (staff) {
        const c = (q: any) => q.then((r: any) => r.count ?? '—', () => '—');
        const [ses, crs, kmj, tt] = await Promise.all([
          c(sb.from('cf_sessions').select('id', { count: 'exact', head: true }).eq('teacher_id', me.id).neq('mode', 'demo')),
          c(sb.from('cf_curr_courses').select('id', { count: 'exact', head: true }).eq('owner_id', me.id)),
          c(sb.from('cf_kmj').select('id', { count: 'exact', head: true }).eq('ready', true)),
          sb.from('cf_timetable').select('class_id').eq('owner_id', me.id).then((r: any) => new Set((r.data || []).map((x: any) => x.class_id).filter(Boolean)).size, () => '—'),
        ]);
        stats = [['Өткен сабақ', ses], ['Курс', crs], ['Сынып', tt], ['ҚМЖ дайын', kmj]];
      }
      setInfo({ school: sc?.data?.name || '', login: e.endsWith('@' + CF.emailDomain) ? e.split('@')[0] : e, cls: cls?.data?.name || '', homeroom: (home?.data || []).map((x: any) => x.name), stats });
    })();
  }, [me.id]);

  const NAV: [typeof tab, string, typeof UserRound][] = [['me', 'Профиль', UserRound], ['teach', 'Сабақ баптаулары', CalendarDays], ['look', 'Көрініс және тіл', Palette], ['safe', 'Қауіпсіздік', ShieldCheck]];
  const logout = async () => { await sb.auth.signOut(); onLogout(); window.location.hash = ''; };
  const subjects = String(me.subject || '').split(',').map((x: string) => x.trim()).filter(Boolean);

  const header = (
    <Card className="!p-0 overflow-hidden">
      <div aria-hidden="true" className="h-20 bg-gradient-to-r from-blue-100 to-violet-100" />
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 pb-5">
        <div className="relative -mt-12 shrink-0">
          {me.photo ? <img src={me.photo} alt="" className="h-24 w-24 rounded-full border-4 border-surface object-cover" />
            : <span aria-hidden="true" className="grid h-24 w-24 place-items-center rounded-full border-4 border-surface bg-accent text-3xl font-extrabold text-on-accent">{initials(me.full_name)}</span>}
        </div>
        <div className="min-w-0 flex-[1_1_260px] pt-3">
          <h1 className="break-words text-2xl font-extrabold">{me.full_name}</h1>
          <p className="text-sm text-text-secondary">{[info.school, info.login && `логин ${info.login}`].filter(Boolean).join(' · ')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="bg-accent-soft text-on-accent-soft">{ROLE_NAMES[me.role] || me.role}</Chip>
            {!staff && info.cls && <Chip tone="bg-success-soft text-success">{info.cls} сынып</Chip>}
            {info.homeroom.map(c => <Chip key={c} tone="bg-success-soft text-success">{c} сынып жетекшісі</Chip>)}
            {subjects.map(x => <Chip key={x}>{x}</Chip>)}
          </div>
        </div>
        {info.stats.length > 0 && <div className="grid flex-[1_1_420px] grid-cols-2 gap-2 pt-3 sm:grid-cols-4">{info.stats.map(([k, v]) => <Stat key={k} k={k} v={v} />)}</div>}
      </div>
    </Card>
  );

  if (!staff) return (
    <div className="max-w-2xl space-y-4">
      {header}
      <Look />
      <Security onLogout={onLogout} />
      <p className="text-center text-sm text-text-secondary">Аты-жөнің қате болса, сынып жетекшіңе айт.</p>
      <Button variant="danger" onClick={logout}><LogOut size={16} aria-hidden="true" />Шығу</Button>
    </div>
  );

  return (
    <div className="max-w-6xl space-y-4">
      {header}
      <div className="flex flex-wrap items-start gap-4">
        <nav aria-label="Профиль бөлімдері" className="w-full space-y-0.5 rounded-2xl border border-border bg-surface p-2 sm:w-60 sm:shrink-0">
          {NAV.map(([k, label, Icon]) => (
            <button key={k} type="button" aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}
              className={`flex min-h-[46px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold ${tab === k ? 'bg-accent-soft text-on-accent-soft' : 'text-text hover:bg-surface-2'}`}>
              <Icon size={18} aria-hidden="true" />{label}</button>))}
          <div className="my-1.5 border-t border-border" />
          <button type="button" onClick={logout} className="flex min-h-[46px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-bold text-danger hover:bg-danger-soft"><LogOut size={18} aria-hidden="true" />Шығу</button>
        </nav>
        <div className="min-w-0 flex-[999_1_520px]">
          {tab === 'me' && <MeSection me={me} />}
          {tab === 'teach' && <TeachingSettings />}
          {tab === 'look' && <Look />}
          {tab === 'safe' && <Security onLogout={onLogout} />}
        </div>
      </div>
    </div>
  );
}
