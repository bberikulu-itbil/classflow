/** Form fields of one page, derived from the legacy slide JSON (so the teacher never has to open raw JSON for ordinary edits). */
export type Chip = 'Мәтін' | 'Код' | 'Интерактив' | 'Ескертпе';
export type Field = { id: string; label: string; chip: Chip; kind: 'text' | 'area' | 'lines' | 'code' | 'number' | 'bool' | 'answer'; value: any; set: (v: any) => any };

const lines = (v: any) => (Array.isArray(v) ? v : []).join('\n');
const unlines = (v: string) => v.split('\n').map(x => x.trimEnd()).filter(x => x.trim());

export function fieldsOf(s: any): Field[] {
  const f = (id: string, label: string, chip: Chip, kind: Field['kind'], key: string, toV: (x: any) => any = x => x ?? '', fromV: (v: any) => any = v => v): Field =>
    ({ id, label, chip, kind, value: toV(s[key]), set: v => ({ ...s, [key]: fromV(v) }) });
  const L = (id: string, label: string, chip: Chip, key: string) => f(id, label, chip, 'lines', key, lines, unlines);
  const out: Field[] = [];
  switch (s?.type) {
    case 'title': out.push(f('title', 'Тақырып', 'Мәтін', 'text', 'title'), f('subtitle', 'Ішкі тақырып', 'Мәтін', 'text', 'subtitle')); break;
    case 'content': out.push(f('title', 'Тақырып', 'Мәтін', 'text', 'title'), L('bullets', 'Негізгі ойлар (әр жол — бір тармақ)', 'Мәтін', 'bullets')); break;
    case 'solution':
      out.push(f('title', 'Тақырып', 'Мәтін', 'text', 'title'));
      (s.sections || []).forEach((sec: any, i: number) => {
        const up = (patch: any) => ({ ...s, sections: s.sections.map((x: any, k: number) => (k === i ? { ...x, ...patch } : x)) });
        out.push({ id: `h${i}`, label: `${i + 1}-бөлім: атауы`, chip: 'Мәтін', kind: 'text', value: sec.h ?? '', set: v => up({ h: v }) });
        if (Array.isArray(sec.bullets)) out.push({ id: `b${i}`, label: `${i + 1}-бөлім: тармақтар`, chip: 'Мәтін', kind: 'lines', value: lines(sec.bullets), set: v => up({ bullets: unlines(v) }) });
        else out.push({ id: `t${i}`, label: `${i + 1}-бөлім: мәтін`, chip: 'Мәтін', kind: 'area', value: sec.text ?? '', set: v => up({ text: v }) });
        if (typeof sec.code === 'string') out.push({ id: `c${i}`, label: `${i + 1}-бөлім: код`, chip: 'Код', kind: 'code', value: sec.code, set: v => up({ code: v }) });
        out.push({ id: `x${i}`, label: `${i + 1}-бөлім: «Көрсету» басқанша жасырын`, chip: 'Мәтін', kind: 'bool', value: !!sec.hide, set: v => up({ hide: !!v }) });
      });
      break;
    case 'quiz':
      out.push(f('prompt', 'Сұрақ', 'Интерактив', 'area', 'prompt'), L('options', 'Нұсқалар (әр жол — бір нұсқа)', 'Интерактив', 'options'),
        { id: 'answer', label: 'Дұрыс жауап', chip: 'Интерактив', kind: 'answer', value: Number.isInteger(s.answer) ? s.answer : -1, set: v => ({ ...s, answer: +v }) },
        f('points', 'Ұпай', 'Интерактив', 'number', 'points', x => x ?? 1, v => Math.max(0, Math.min(100, +v || 0))), f('explanation', 'Түсіндірме (жауаптан кейін көрінеді)', 'Мәтін', 'area', 'explanation'));
      break;
    case 'task': out.push(f('prompt', 'Сұрақ', 'Интерактив', 'area', 'prompt'), L('accept', 'Қабылданатын жауаптар (әр жол — бір нұсқа)', 'Интерактив', 'accept'), f('points', 'Ұпай', 'Интерактив', 'number', 'points', x => x ?? 1, v => Math.max(0, Math.min(100, +v || 0)))); break;
    case 'code': out.push(f('prompt', 'Есеп шарты', 'Мәтін', 'area', 'prompt'), f('starter', 'Бастапқы код', 'Код', 'code', 'starter'), L('hints', 'Кеңестер (әр жол — бір кеңес)', 'Мәтін', 'hints'), f('points', 'Ұпай', 'Интерактив', 'number', 'points', x => x ?? 1, v => Math.max(0, Math.min(100, +v || 0)))); break;
    case 'matching':
      out.push(f('title', 'Тақырып', 'Мәтін', 'text', 'title'),
        { id: 'pairs', label: 'Жұптар (әр жол: сол жағы = оң жағы)', chip: 'Интерактив', kind: 'lines', value: (s.pairs || []).map((p: any) => `${p.l} = ${p.r}`).join('\n'), set: v => ({ ...s, pairs: unlines(v).map(x => { const k = x.indexOf('='); return k < 0 ? { l: x.trim(), r: '' } : { l: x.slice(0, k).trim(), r: x.slice(k + 1).trim() }; }) }) });
      break;
    case 'flashcards':
      out.push(f('title', 'Тақырып', 'Мәтін', 'text', 'title'),
        { id: 'cards', label: 'Карточкалар (әр жол: алды | арты)', chip: 'Интерактив', kind: 'lines', value: (s.cards || []).map((c: any) => `${c.front} | ${c.back}`).join('\n'), set: v => ({ ...s, cards: unlines(v).map(x => { const k = x.indexOf('|'); return k < 0 ? { front: x.trim(), back: '' } : { front: x.slice(0, k).trim(), back: x.slice(k + 1).trim() }; }) }) });
      break;
    default: if (s?.title !== undefined) out.push(f('title', 'Тақырып', 'Мәтін', 'text', 'title'));
  }
  if (s?.type && s.type !== 'solution' && s.type !== 'title') out.push(f('notes', 'Мұғалімге ескертпе (оқушыға көрінбейді)', 'Ескертпе', 'area', 'notes'));
  return out;
}

/** Problems the teacher should fix before class: the same things the player would silently get wrong. */
export function checkPages(pages: any[]): string[] {
  const bad: string[] = [];
  pages.forEach((s, i) => {
    const n = `${i + 1}-бет`;
    if (s.type === 'quiz') {
      const o = Array.isArray(s.options) ? s.options.length : 0;
      if (o < 2) bad.push(`${n}: тестте кемінде 2 нұсқа керек`);
      if (!Number.isInteger(s.answer) || s.answer < 0 || s.answer >= o) bad.push(`${n}: дұрыс жауап таңдалмаған`);
    }
    if (s.type === 'task' && !(Array.isArray(s.accept) ? s.accept : []).length) bad.push(`${n}: қабылданатын жауап жоқ`);
    if (s.type === 'code' && !(Array.isArray(s.tests) ? s.tests : []).length) bad.push(`${n}: код есебінде тест жоқ`);
    if (!s.title && !s.prompt) bad.push(`${n}: атауы жоқ`);
  });
  return bad;
}
