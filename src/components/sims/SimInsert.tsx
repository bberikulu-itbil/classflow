// INSERT INTO step by step (Informatics 9, lesson 2.3): the values of VALUES (…) are matched to the fields one at a time,
// every value is checked against its field's type (text in quotes, numbers without, NULL = no value), and the last step adds the row.
// w = { kind: 'insert', table: 'books', fields: [['id','INTEGER'], …], rows: [[1, 'Абай жолы', …]], value: "(3, 'Көшпенділер', …)", presets?: [{ label: [kk, ru, en], v }] }
import { useMemo, useState } from 'react';
import { pick, type Lang } from '../../lessons/lang';
import { BTN, Controls, Say, box, inp, tr, usePlayer } from './kit';

type Tok = { raw: string; kind: 'text' | 'num' | 'null' | 'bare' | 'open' };
const INK = ['#0284C7', '#DB2777', '#D97706', '#059669', '#7C3AED', '#EA580C', '#0D9488', '#C026D3']; // readable on the dark and the light theme

/** Splits "(3, 'a, b', NULL)" into values; a comma inside quotes does not split, '' is a quote inside a text. */
export function tokens(src: string): Tok[] {
  const s = src.trim().replace(/^\(/, '').replace(/\);?\s*$/, '');
  const out: Tok[] = []; let i = 0;
  while (i < s.length) {
    while (s[i] === ' ' || s[i] === ',') i++;
    if (i >= s.length) break;
    if (s[i] === "'") {
      let j = i + 1;
      for (;;) { const k = s.indexOf("'", j); if (k < 0) { out.push({ raw: s.slice(i), kind: 'open' }); return out; } if (s[k + 1] === "'") { j = k + 2; continue; } j = k + 1; break; }
      out.push({ raw: s.slice(i, j), kind: 'text' }); i = j;
    } else {
      let j = s.indexOf(',', i); if (j < 0) j = s.length;
      const raw = s.slice(i, j).trim();
      out.push({ raw, kind: /^-?\d+(\.\d+)?$/.test(raw) ? 'num' : /^null$/i.test(raw) ? 'null' : 'bare' }); i = j;
    }
  }
  return out;
}
const value = (k: Tok) => (k.kind === 'text' ? k.raw.slice(1, -1).replace(/''/g, "'") : k.kind === 'num' ? Number(k.raw) : null);

export function SimInsert({ w, lang }: { w: any; lang: Lang }) {
  const t = (kk: string, ru: string, en: string) => pick(lang, kk, ru, en);
  const fields: [string, string][] = w.fields || [];
  const [src, setSrc] = useState<string>(w.value || '()');
  const toks = useMemo(() => tokens(src), [src]);
  const max = fields.length + 1;
  const p = usePlayer(max);
  /** verdict of the i-th field: bad stops the INSERT, warn lets it through */
  const check = (i: number): { tone: 'ok' | 'warn' | 'bad'; msg: string } => {
    const [name, type] = fields[i], k = toks[i], num = /INT|REAL|NUM/i.test(type);
    if (!k) return { tone: 'bad', msg: t(`${name} өрісіне мән жетпеді: ${fields.length} өріс бар, ал мән ${toks.length}.`, `Для поля ${name} не хватило значения: полей ${fields.length}, значений ${toks.length}.`, `No value left for ${name}: ${fields.length} fields, ${toks.length} values.`) };
    if (k.kind === 'open') return { tone: 'bad', msg: t(`${k.raw} — тырнақша жабылмаған. SQL мәтіннің қай жерде біткенін білмейді.`, `${k.raw} — кавычка не закрыта. SQL не знает, где кончается текст.`, `${k.raw}: the quote is never closed, so SQL cannot tell where the text ends.`) };
    if (k.kind === 'bare') return { tone: 'bad', msg: t(`${k.raw} — тырнақшасыз мәтін. SQL оны өріс атауы деп ойлап, қате береді.`, `${k.raw} — текст без кавычек. SQL примет его за имя поля и выдаст ошибку.`, `${k.raw} is text without quotes: SQL takes it for a field name and fails.`) };
    if (k.kind === 'null') return { tone: 'ok', msg: t(`${name} ← NULL: бұл өрісте мән жоқ (0 емес, бос мәтін де емес).`, `${name} ← NULL: в этом поле нет значения (это не 0 и не пустой текст).`, `${name} ← NULL: the field has no value (not 0, not an empty text).`) };
    if (num && k.kind === 'text') return { tone: 'warn', msg: t(`${name} — ${type}, бірақ ${k.raw} тырнақшада. Сан тырнақшасыз жазылады.`, `${name} — ${type}, но ${k.raw} в кавычках. Число пишут без кавычек.`, `${name} is ${type}, but ${k.raw} is in quotes. Numbers go without quotes.`) };
    if (!num && k.kind === 'num') return { tone: 'warn', msg: t(`${name} — мәтін (${type}), ал мұнда сан ${k.raw}. Мәндердің реті ауысқан жоқ па?`, `${name} — текст (${type}), а здесь число ${k.raw}. Не перепутан ли порядок значений?`, `${name} is text (${type}) but gets the number ${k.raw}. Is the order of the values mixed up?`) };
    return { tone: 'ok', msg: t(`${name} (${type}) ← ${k.raw}: түрі сәйкес.`, `${name} (${type}) ← ${k.raw}: тип подходит.`, `${name} (${type}) ← ${k.raw}: the type fits.`) };
  };
  const verdicts = fields.map((_, i) => check(i));
  const extra = toks.length > fields.length;
  const failed = verdicts.some(v => v.tone === 'bad') || extra;
  const added = p.n === max && !failed;
  const shownUpTo = Math.min(p.n, fields.length);
  const say = p.n === 0 ? { tone: 'info' as const, msg: t('«Қадам» бас: мәндер өрістерге бір-бірден, ретімен беріледі.', 'Нажми «Шаг»: значения раздаются полям по одному, по порядку.', 'Press “Step”: the values go to the fields one by one, in order.') }
    : p.n <= fields.length ? verdicts[p.n - 1]
    : failed ? { tone: 'bad' as const, msg: extra ? t(`Мән артық: ${toks.length} мән, ал өріс ${fields.length}. Жазба қосылмады.`, `Лишнее значение: значений ${toks.length}, полей ${fields.length}. Запись не добавлена.`, `Too many values: ${toks.length} values for ${fields.length} fields. Nothing was added.`) : t('Қате бар, сондықтан жазба қосылмады. Қызыл өрісті түзет.', 'Есть ошибка, поэтому запись не добавлена. Исправь красное поле.', 'There is an error, so nothing was added. Fix the red field.') }
    : { tone: 'ok' as const, msg: t(`Жазба қосылды: ${w.table} кестесінде енді ${(w.rows || []).length + 1} жазба.`, `Запись добавлена: в таблице ${w.table} теперь ${(w.rows || []).length + 1} записи.`, `Record added: ${w.table} now has ${(w.rows || []).length + 1} records.`) };
  const cell = (v: any) => (v === null ? <i className="text-slate-500">NULL</i> : String(v));

  return (
    <div className="space-y-3">
      <div className={`${box} space-y-3`}>
        <div className="font-mono text-lg leading-relaxed"><span className="text-blue-400">INSERT INTO</span> <span className="text-slate-100">{w.table}</span> <span className="text-blue-400">VALUES</span>
          <span className="ml-1">({toks.map((k, i) => <span key={i}>{i ? ', ' : ''}<b style={{ color: i < fields.length ? INK[i % INK.length] : '#DC2626' }} className={i < shownUpTo ? 'underline decoration-2 underline-offset-4' : ''}>{k.raw}</b></span>)});</span></div>
        <label className="flex flex-col gap-1 text-xs text-slate-400">VALUES
          <input aria-label="VALUES" value={src} onChange={e => { setSrc(e.target.value); p.reset(); }} className={`${inp} w-full`} spellCheck={false} /></label>
        {Array.isArray(w.presets) && <div className="flex flex-wrap gap-2">{w.presets.map((x: any, i: number) => (
          <button key={i} type="button" onClick={() => { setSrc(x.v); p.reset(); }} className={`${BTN} ${x.v === src ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>{tr(lang, x.label)}</button>))}</div>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-600">
        <table className="w-full border-collapse text-left text-sm md:text-base">
          <thead><tr>{fields.map(([n, ty], i) => { const v = i < shownUpTo ? verdicts[i].tone : null;
            return <th key={n} className={`border-b-4 px-3 py-2 ${v === 'bad' ? 'bg-danger-soft' : v === 'warn' ? 'bg-warning-soft' : v === 'ok' ? 'bg-success-soft' : 'bg-slate-800'}`} style={{ borderColor: INK[i % INK.length] }}>
              <div className="font-mono font-black" style={{ color: INK[i % INK.length] }}>{n}</div><div className="text-xs font-semibold text-slate-400">{ty}</div></th>; })}</tr></thead>
          <tbody>
            {(w.rows || []).map((r: any[], j: number) => <tr key={j} className="bg-slate-950">{fields.map((_, i) => <td key={i} className="border-t border-slate-700 px-3 py-1.5 text-slate-300">{cell(r[i])}</td>)}</tr>)}
            <tr className={added ? 'bg-success-soft' : 'bg-slate-900'}>{fields.map((_, i) => <td key={i} className={`border-t-2 border-dashed border-slate-600 px-3 py-1.5 font-semibold ${i < shownUpTo ? 'text-slate-100' : 'text-slate-600'}`}>
              {i < shownUpTo && toks[i] ? (toks[i].kind === 'bare' || toks[i].kind === 'open' ? <span className="text-red-300">✗ {toks[i].raw}</span> : cell(value(toks[i]))) : i < shownUpTo ? <span className="text-red-300">✗</span> : '…'}</td>)}</tr>
          </tbody>
        </table>
      </div>

      <Controls p={p} max={max} lang={lang} />
      <Say tone={say.tone === 'warn' ? 'warn' : say.tone}>{say.msg}</Say>
    </div>
  );
}
