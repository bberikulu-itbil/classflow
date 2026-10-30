import { canvasPage } from './canvas';

/** Page types and templates (editor level only: the players still read the old slide `type`, so pageType/templateId are extra fields on a legacy slide). */
export type PageType = 'slide' | 'scroll' | 'interactive' | 'presentation';
export const PAGE_TYPES: { id: PageType; label: string; hint: string }[] = [
  { id: 'slide', label: 'Слайд беті', hint: 'Презентацияға арналған кадр' },
  { id: 'scroll', label: 'Ұзын бет', hint: 'Төмен қарай тізілген оқу беті' },
  { id: 'interactive', label: 'Интерактивті бет', hint: 'Оқушыдан жауап алады' },
  { id: 'presentation', label: 'Түпнұсқа презентация', hint: 'PPTX/PDF файлын өзгертпей ашу' },
];

type Tpl = { id: string; label: string; hint: string; make: (title: string) => any };
const sec = (h: string, extra: object = { bullets: ['…'] }) => ({ h, ...extra });
const content = (bullets: string[]) => (title: string) => ({ type: 'content', title, bullets });
const stack = (...s: any[]) => (title: string) => ({ type: 'solution', title, sections: s });

// scroll pages reuse the stacked `solution` slide until the real scroll renderer exists; multi-choice and reflection are left out because the players cannot take them yet
export const TEMPLATES: Record<PageType, Tpl[]> = {
  slide: [
    { id: 'title', label: 'Титул', hint: 'Тақырып, ішкі тақырып', make: t => ({ type: 'title', title: t, subtitle: '' }) },
    { id: 'explanation', label: 'Түсіндіру', hint: 'Мәтін және негізгі ойлар', make: content(['Негізгі ой', 'Мысал']) },
    { id: 'code-example', label: 'Код мысалы', hint: 'Код және түсіндірме', make: stack(sec('Код', { code: '', lang: 'cpp' }), sec('Түсіндірме')) },
    { id: 'comparison', label: 'Салыстыру', hint: 'Екі ұғымды қатар көрсету', make: stack(sec('A'), sec('B')) },
    { id: 'image-text', label: 'Мәтін + сурет', hint: 'Сурет қосу — төмендегі «Сурет қосу» арқылы', make: content(['Сурет туралы негізгі ой']) },
    { id: 'practice', label: 'Практика', hint: 'Тапсырмаға кіріспе', make: content(['Тапсырма шарты', 'Не істеу керек']) },
    { id: 'summary', label: 'Қорытынды', hint: 'Негізгі ойлар және келесі қадам', make: content(['Негізгі ой', 'Келесі қадам']) },
    { id: 'canvas-blank', label: 'Бос кенеп', hint: 'Мәтін, сурет, код, фигураны еркін орналастыру', make: t => canvasPage(t) },
    { id: 'canvas-two-col', label: 'Екі баған (кенеп)', hint: 'Тақырып және екі мәтін бағаны', make: t => canvasPage(t, 'two-col') },
  ],
  scroll: [
    { id: 'theory', label: 'Теориялық түсіндіру', hint: 'Ұғым, анықтама, мысал', make: stack(sec('Ұғым'), sec('Анықтама'), sec('Мысал')) },
    { id: 'worked-example', label: 'Қадамдық мысал', hint: 'Есепті шешу жолы', make: stack(sec('Шарты'), sec('Алгоритм'), sec('Шешімі', { hide: true, bullets: ['…'] })) },
    { id: 'code-guide', label: 'Код + түсіндірме', hint: 'Кодты секциялармен ашу', make: stack(sec('Код', { code: '', lang: 'cpp' }), sec('Түсіндірме')) },
    { id: 'case-study', label: 'Мысал арқылы оқу', hint: 'Бір есепті толық талдау', make: stack(sec('Есеп'), sec('Талдау'), sec('Қорытынды')) },
    { id: 'task-flow', label: 'Тапсырмаға апаратын бет', hint: 'Түсіндіру → әрекет', make: stack(sec('Түсіндіру'), sec('Енді өзің жаса')) },
    { id: 'summary', label: 'Қорытынды', hint: 'Қысқаша қайталау', make: stack(sec('Қысқаша қайталау')) },
  ],
  interactive: [
    { id: 'single-choice', label: 'Бір жауап', hint: 'Бір дұрыс нұсқа', make: t => ({ type: 'quiz', title: t, prompt: 'Сұрақ?', options: ['Нұсқа 1', 'Нұсқа 2', 'Нұсқа 3'], answer: 0, points: 2, time: 20, explanation: '' }) },
    { id: 'short-answer', label: 'Қысқа жауап', hint: 'Мәтіндік жауап', make: t => ({ type: 'task', title: t, prompt: 'Сұрақ?', accept: ['жауап'], points: 3 }) },
    { id: 'code-task', label: 'Код тапсырмасы', hint: 'Кодты орындау және тексеру', make: t => ({ type: 'code', title: t, prompt: 'Есеп шарты', starter: '', hints: [], tests: [{ input: '', out: '', label: 'Мысал 1' }], points: 5 }) },
    { id: 'matching', label: 'Сәйкестендіру', hint: 'Екі бағанды сәйкестендіру', make: t => ({ type: 'matching', title: t, pairs: [{ l: 'A', r: '1' }, { l: 'B', r: '2' }] }) },
  ],
  presentation: [
    { id: 'presentation', label: 'Түпнұсқа файл', hint: 'Бастапқы PPTX/PDF файлын ашу', make: t => ({ type: 'presentation', title: t, sourceFormat: 'pptx', html: '', css: '' }) },
  ],
};

export const typeLabel = (t: PageType) => PAGE_TYPES.find(x => x.id === t)!.label;
export const tplLabel = (t: PageType, id?: string) => TEMPLATES[t].find(x => x.id === id)?.label || '';

/** Old slides carry no pageType: read it from the slide kind, never write it back until the teacher edits the page. */
export function pageOf(s: any): { pageType: PageType; templateId: string } {
  const legacy: Record<string, [PageType, string]> = {
    title: ['slide', 'title'], content: ['slide', 'explanation'], solution: ['scroll', 'theory'],
    quiz: ['interactive', 'single-choice'], task: ['interactive', 'short-answer'], code: ['interactive', 'code-task'], matching: ['interactive', 'matching'],
    flashcards: ['interactive', ''], logic: ['interactive', ''], leaderboard: ['slide', 'summary'], canvas: ['slide', 'canvas-blank'], presentation: ['presentation', 'presentation'],
  };
  const [t, id] = legacy[s?.type] || ['slide', ''];
  return { pageType: PAGE_TYPES.some(p => p.id === s?.pageType) ? s.pageType : t, templateId: typeof s?.templateId === 'string' ? s.templateId : id };
}

export function newPage(pageType: PageType, templateId: string, title: string) {
  const tpl = TEMPLATES[pageType].find(x => x.id === templateId) || TEMPLATES[pageType][0];
  return { ...tpl.make(title.trim()), pageType, templateId: tpl.id };
}
