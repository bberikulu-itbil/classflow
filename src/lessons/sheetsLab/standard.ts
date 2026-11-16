// Brings a lesson written before the lesson standard to it without rewriting its pages: a 45-minute plan, a stage on every slide
// (pages are regrouped in stage order), warm-up questions, a teacher note at the start of each stage, the expected results of every sheet task,
// a harder ★ problem for fast students and the wrap-up page. The lesson standard: replica/unit/lesson-standard.mjs.
import { quiz, tag, type LabLesson, type T } from './dsl';
import { reflect, shortTask } from '../sheetsLab7/lib';

type Stage = 'warmup' | 'together' | 'example' | 'practice' | 'check';
const ORDER: Stage[] = ['warmup', 'together', 'example', 'practice', 'check'];
const DEFAULT: [Stage, number][] = [['warmup', 5], ['together', 8], ['example', 10], ['practice', 15], ['check', 7]];

const DO: Record<Stage, T> = {
  warmup: ['Өткен тақырып бойынша қысқа сұрақтарға жауап береді', 'Отвечает на короткие вопросы по прошлой теме', 'Answers short questions on the previous topic'],
  together: ['Жаңа ұғымдарды мұғаліммен бірге талдайды', 'Разбирает новые понятия вместе с учителем', 'Works through the new ideas with the teacher'],
  example: ['Мұғаліммен бірге мысал есепті қадамдап шығарады', 'Вместе с учителем по шагам решает задачу-пример', 'Solves the example problem step by step with the teacher'],
  practice: ['Кестедегі тапсырмаларды өзі орындайды; үлгерген оқушы ★ есепті шығарады', 'Сам выполняет задания в таблице; кто успел — задачу ★', 'Does the sheet tasks alone; fast students take the ★ problem'],
  check: ['Қысқа тест тапсырып, не үйренгенін айтады', 'Проходит короткий тест и говорит, что узнал', 'Takes a short test and says what was learned'],
};
const NOTE = (k: Stage, min: number): T => (({
  warmup: [`${min} минут. Сұрақтар өткен тақырыпты еске түсіреді. Қате жауап көп болса, жаңа тақырыпқа өтпес бұрын бір минут түсіндіріңіз.`, `${min} минут. Вопросы напоминают прошлую тему. Если ошибок много, объясните минуту, прежде чем идти дальше.`, `${min} minutes. The questions bring back the previous topic. If many answers are wrong, explain for a minute before moving on.`],
  together: [`${min} минут. Әр слайдта бір ұғым. Формулаларды тақтада қалдырыңыз: практикада оқушылар соларға қарап жұмыс істейді.`, `${min} минут. На каждом слайде одно понятие. Оставьте формулы на доске: на практике ученики работают по ним.`, `${min} minutes. One idea per slide. Keep the formulas on the board: students use them in the practice.`],
  example: [`${min} минут. Мысалды тақтада оқушылармен бірге шығарыңыз, шешімін соңында ғана ашыңыз.`, `${min} минут. Решите пример на доске вместе с классом, решение откройте только в конце.`, `${min} minutes. Solve the example on the board with the class and reveal the solution last.`],
  practice: [`${min} минут. Оқушылар өз бетімен жұмыс істейді. Келесі слайдқа өтпес бұрын «Әлі тапсырмаған» тізімін қараңыз.`, `${min} минут. Ученики работают самостоятельно. Прежде чем перейти дальше, посмотрите список «Ещё не сдали».`, `${min} minutes. Students work alone. Check the “Not submitted yet” list before moving on.`],
  check: [`${min} минут: тест және қорытынды. Қате жауап көп болған сұрақты келесі сабақтың басында қайталаңыз.`, `${min} минут: тест и итог. Вопрос с большим числом ошибок повторите в начале следующего урока.`, `${min} minutes: the test and the wrap-up. Revisit the question with many wrong answers at the start of the next lesson.`],
} as Record<Stage, T>)[k]);
const ENV: T = ['ClassFlow кестесі (Excel және Google Sheets-ке ұқсас). Функция аргументтерін «;» немесе «,» бөліп жазуға болады. Әр оқушыға бір құрылғы және интернет қажет.', 'Таблица ClassFlow (как Excel и Google Sheets). Аргументы функций можно разделять «;» или «,». Каждому ученику нужны устройство и интернет.', 'The ClassFlow sheet (like Excel and Google Sheets). Function arguments may be separated with “;” or “,”. One device per student and the internet.'];
const SOURCE: T = ['Информатика 8-сынып оқулығы, 3-тарау «Электрондық кестелер». Бет нөмірін мұғалім өзі нақтылайды. Барлық формулалар кестеде орындалып тексерілген, деректер оқу үшін құрастырылған.', 'Учебник информатики 8 класса, глава 3 «Электронные таблицы». Номера страниц учитель уточняет сам. Все формулы проверены выполнением в таблице, данные учебные.', 'Informatics Grade 8 textbook, chapter 3 “Spreadsheets”. The teacher adds the page numbers. Every formula was run in a sheet; the data are made for the classroom.'];

/** The values a correct sheet shows, read from the task's own marking scheme (so the note cannot disagree with the check). */
const expected = (s: any): T => {
  const list = s.criteria.map((c: any) => `${c.cell} = ${c.accept[0]}`).join(', ');
  return [`Күтілетін нәтиже: ${list}.`, `Ожидаемый результат: ${list}.`, `Expected: ${list}.`];
};
const join = (a: T, b: T): T => [`${a[0]} ${b[0]}`, `${a[1]} ${b[1]}`, `${a[2]} ${b[2]}`];

export type Q = { t: T; q: T; options: T[]; answer: number; why: T };
export const standard = (l: LabLesson, o: {
  prior: T; warm?: Q[]; /** how many of the lesson's own first quizzes open the lesson instead of closing it */ warmOwn?: number;
  star: { t: T; q: T; accept: string[]; why: T }; stages?: [Stage, number][]; terms?: LabLesson['terms']; wrapUp?: boolean;
}): LabLesson => {
  const stages = o.stages ?? DEFAULT, [title, ...rest] = l.slides as any[];
  const lastTask = rest.map(s => s.type).lastIndexOf('task');
  let own = o.warmOwn ?? 0;
  const placed: { k: Stage; s: any }[] = rest.map((s, i) => {
    if (s.type === 'quiz') return { k: own-- > 0 ? 'warmup' : 'check', s };
    if (s.kind === 'practice') return { k: 'practice', s };
    if (s.kind === 'example' || s.kind === 'exampletask') return { k: 'example', s };
    return i > lastTask ? { k: 'check', s: { ...s, kind: 'check' } } : { k: 'together', s }; // a closing page after the last task belongs to the wrap-up
  });
  for (const w of o.warm ?? []) placed.push({ k: 'warmup', s: quiz(w.t, w.q, w.options, w.answer, w.why) });
  placed.push({ k: 'practice', s: shortTask(o.star.t, o.star.q, o.star.accept, 3, o.star.why) });
  const slides: any[] = [title];
  for (const [k, min] of stages) {
    placed.filter(p => p.k === k).forEach((p, n) => {
      const sheet = Array.isArray(p.s.criteria), first = n === 0 && !p.s.notes;
      const note = first && sheet ? join(NOTE(k, min), expected(p.s)) : first ? NOTE(k, min) : sheet && !p.s.notes ? expected(p.s) : undefined;
      slides.push(tag(p.s, k, note));
    });
  }
  if (placed.some(p => !stages.some(([k]) => k === p.k))) throw new Error(`${l.id}: a page falls into a stage the plan does not have`);
  if (o.wrapUp !== false) slides.push(reflect());
  return {
    ...l, terms: [...l.terms, ...(o.terms ?? [])], slides,
    plan: { prior: o.prior, env: ENV, source: SOURCE, stages: stages.map(([k, min]) => ({ k, min, do: DO[k] })) },
  };
};
export { ORDER };
