import type { LucideIcon } from 'lucide-react';
import { Award, BookOpen, ClipboardCheck, Gamepad2, GraduationCap, House, Inbox, Layers, Library, PencilRuler, Presentation, Send, SlidersHorizontal, Trophy, Users } from 'lucide-react';

export type Role = 'teacher' | 'student';

/** `to` = hash route of a screen that exists. No `to` = planned ("Жақында"), `items` says what it will hold. */
export interface Sub { key: string; label: string; icon?: LucideIcon; to?: string; items?: string[] }
export interface Section {
  key: string; label: string; icon: LucideIcon;
  routes: string[];          // hash route keys that light this section up in the menu
  subs: Sub[];
  to?: string;               // overrides the default link of the section
}

export const ROLE_NAMES: Record<string, string> = {
  teacher: 'Мұғалім', class_teacher: 'Сынып жетекшісі', deputy: 'Директор орынбасары', admin: 'Әкімші', student: 'Оқушы',
};

export const TEACHER: Section[] = [
  { key: 'home', label: 'Басты бет', icon: House, routes: [''], subs: [] },
  { key: 'lessons', label: 'Сабақтар', icon: Presentation, routes: ['lessons', 'edit', 'plans', 'plan'], subs: [
    { key: 'mine', label: 'Менің сабақтарым', to: 'lessons/mine' },
    { key: 'gallery', label: 'Галерея', items: ['Дайын сабақтар', 'Әріптестердің сабақтары'] },
    { key: 'editor', label: 'Сабақ редакторы', to: 'edit/new' },
    { key: 'plans', label: 'Жоспарлар', to: 'plans' },
    { key: 'journal', label: 'Өткен сабақтар', to: 'lessons/journal' },
  ] },
  { key: 'courses', label: 'Курстар', icon: Layers, routes: ['courses'], subs: [
    { key: 'structure', label: 'Курс құрылымы', items: ['Бөлім → тақырып → сабақ/тапсырма'] },
    { key: 'assign', label: 'Тағайындау', items: ['Сыныпқа тағайындау', 'Мерзімдер'] },
    { key: 'progress', label: 'Прогресс және журнал', items: ['Прогресс', 'Баға журналы', 'CSV жүктеу'] },
  ] },
  { key: 'tasks', label: 'Тапсырмалар', icon: ClipboardCheck, routes: ['tasks', 'assign', 'review'], to: 'assign', subs: [
    { key: 'bank', label: 'Тапсырмалар банкі', icon: Library, items: ['Түрі, сыныбы, оқу мақсаты бойынша іздеу'] },
    { key: 'builder', label: 'Конструктор', icon: PencilRuler, items: ['Жеке, жұптық және топтық тапсырмалар'] },
    { key: 'jeopardy', label: 'Jeopardy', icon: Gamepad2, to: 'tasks/jeopardy' },
    { key: 'assigned', label: 'Берілген тапсырмалар', icon: Send, to: 'assign' },
    { key: 'queue', label: 'Тексеру кезегі', icon: Inbox, to: 'tasks/queue' },
    { key: 'exams', label: 'БЖБ/ТЖБ', icon: GraduationCap, items: ['Емтихан нұсқалары', 'Прокторинг'] },
  ] },
  { key: 'contests', label: 'Сайыстар', icon: Trophy, routes: ['contests'], subs: [
    { key: 'quiz', label: 'Live викторина', items: ['Сабақ кезінде сыныппен ойнау'] },
    { key: 'coding', label: 'Кодтау жарысы', items: ['Уақытқа жарыс', 'Автотест арқылы бағалау'] },
    { key: 'tournament', label: 'Турнир', items: ['Сынып пен параллель арасында'] },
    { key: 'season', label: 'Маусым рейтингі', items: ['Жалпы рейтинг'] },
  ] },
  { key: 'classes', label: 'Сыныптар', icon: Users, routes: ['classes'], subs: [
    { key: 'list', label: 'Сыныптар', to: 'classes/list' },
    { key: 'groups', label: 'Жұптар мен топтар', items: ['Сақталған жұптар мен топтар'] },
    { key: 'journals', label: 'Журналдар', items: ['Қатысу журналы', 'Баға журналы', 'Focus журналы'] },
    { key: 'reports', label: 'Есептер', items: ['Сынып және оқушы есептері'] },
    { key: 'tutor', label: 'Сынып жетекшісі', items: ['7B сыныбының жетекшісіне арналған көрініс'] },
  ] },
  { key: 'vocab', label: 'Сөздігім', icon: BookOpen, routes: ['vocab'], subs: [
    { key: 'base', label: 'Терминдер базасы', items: ['Үш тілдегі терминдер'] },
    { key: 'link', label: 'Тақырыпқа байлау', items: ['Терминді сабақ тақырыбына байлау'] },
    { key: 'test', label: 'Сөздік тесті', items: ['Сөздік бойынша тест жасау'] },
    { key: 'share', label: 'Тарату', items: ['Терминдерді оқушыларға тарату'] },
  ] },
  { key: 'settings', label: 'Баптаулар', icon: SlidersHorizontal, routes: ['settings', 'profile'], subs: [
    { key: 'profile', label: 'Профиль және аккаунт', to: 'settings/profile' },
    { key: 'lang', label: 'Интерфейс тілі', items: ['Қазақша, орысша, ағылшынша'] },
    { key: 'focus', label: 'Focus ережелері', items: ['Сабақ кезіндегі Focus режимінің ережелері'] },
  ] },
];

export const STUDENT: Section[] = [
  { key: 'home', label: 'Басты бет', icon: House, routes: [''], subs: [] },
  { key: 'tasks', label: 'Тапсырмалар', icon: ClipboardCheck, routes: ['tasks', 'hw'], to: 'hw', subs: [] },
  { key: 'courses', label: 'Курстарым', icon: Layers, routes: ['courses'], subs: [
    { key: 'card', label: 'Курс картасы', items: ['Менің курстарым'] },
    { key: 'pace', label: 'Өз қарқынымен оқу', items: ['Сабақтарды өз уақытында орындау'] },
    { key: 'replay', label: 'Өткен слайдтар', items: ['Өткен слайдтарды қайта қарау'] },
    { key: 'progress', label: 'Прогресс', items: ['Курс бойынша прогресс'] },
  ] },
  { key: 'contests', label: 'Сайыстар', icon: Trophy, routes: ['contests'], subs: [
    { key: 'active', label: 'Белсенді сайыс', items: ['Белсенді сайысқа кіру'] },
    { key: 'upcoming', label: 'Алдағы сайыстар', items: ['Күнтізбе'] },
    { key: 'results', label: 'Нәтижелер', items: ['Өткен сайыстар нәтижесі'] },
    { key: 'rating', label: 'Рейтинг', items: ['Сынып, параллель, лицей бойынша'] },
  ] },
  { key: 'grades', label: 'Бағаларым', icon: Award, routes: ['grades'], subs: [
    { key: 'quarter', label: 'Тоқсандық бағалар', items: ['Әр пән бойынша тоқсан бағасы'] },
    { key: 'exams', label: 'БЖБ/ТЖБ', items: ['Бөлім және тоқсан бойынша жиынтық бағалау'] },
    { key: 'attendance', label: 'Қатысу', items: ['Сабаққа қатысу'] },
    { key: 'focus', label: 'Focus ескертулерім', items: ['Сабақ кезіндегі өз ескертулерім'] },
    { key: 'feedback', label: 'Мұғалім пікірлері', to: 'grades/feedback' },
  ] },
  { key: 'vocab', label: 'Сөздігім', icon: BookOpen, routes: ['vocab'], subs: [
    { key: 'mine', label: 'Терминдерім', to: 'vocab/mine' },
    { key: 'own', label: 'Өз сөздерім', items: ['Өзім қосқан сөздер'] },
    { key: 'cards', label: 'Карточкалар', items: ['Терминдерді карточкамен үйрену'] },
    { key: 'test', label: 'Өзін-өзі тексеру', items: ['Сөздік бойынша тест'] },
  ] },
];

export const sectionsFor = (role: Role) => (role === 'teacher' ? TEACHER : STUDENT);

/** First screen that really exists inside a section (undefined = the whole section is still planned). */
export const firstReady = (s: Section) => s.subs.find(x => x.to);

/** Where the menu link of a section goes. */
export const sectionTo = (s: Section) => s.to ?? firstReady(s)?.to ?? s.key;

export function activeSection(role: Role, routeKey: string) {
  return sectionsFor(role).find(s => s.routes.includes(routeKey));
}

/** The sub-tab a hash route belongs to ("assign" -> tasks/assigned, "lessons/journal" -> lessons/journal). */
export function activeSub(s: Section, routeKey: string, routeId: string) {
  const full = routeId ? `${routeKey}/${routeId}` : routeKey;
  return s.subs.find(x => x.to === full) ?? s.subs.find(x => x.to === routeKey)
    ?? (routeKey === s.key ? s.subs.find(x => x.key === routeId) : undefined);
}
