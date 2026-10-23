import type { LucideIcon } from 'lucide-react';
import { Award, BookOpen, ClipboardCheck, FolderKanban, Gamepad2, GraduationCap, House, Inbox, Layers, Library, NotebookText, PencilRuler, Presentation, Scale, Send, ShieldCheck, SlidersHorizontal, Sparkles, Swords, Trophy } from 'lucide-react';

export type Role = 'teacher' | 'student';

/** `to` = hash route of a screen that exists. No `to` = planned ("Жақында"), `items` says what it will hold. */
export interface Sub { key: string; label: string; icon?: LucideIcon; to?: string; items?: string[]; also?: string[] /* other route keys that belong to this tab */ }
export interface Section {
  key: string; label: string; icon: LucideIcon;
  routes: string[];          // hash route keys that light this section up in the menu
  subs: Sub[];
  to?: string;               // overrides the default link of the section
  hidden?: boolean;          // not in the menu list; reached from the profile block at the bottom
}

export const ROLE_NAMES: Record<string, string> = {
  teacher: 'Мұғалім', class_teacher: 'Сынып жетекшісі', deputy: 'Директор орынбасары', admin: 'Әкімші', student: 'Оқушы',
};

export const TEACHER: Section[] = [
  { key: 'home', label: 'Басты бет', icon: House, routes: [''], subs: [] },
  { key: 'lessons', label: 'Сабақтар', icon: Presentation, routes: ['lessons', 'lesson', 'edit', 'plans', 'plan'], subs: [
    { key: 'modules', label: 'Сабақтар', to: 'lessons/modules' },
    { key: 'courses', label: 'Курстар', to: 'lessons/courses' },
    { key: 'mine', label: 'Менің сабақтарым', to: 'lessons/mine', also: ['lesson'] },
    { key: 'schedule', label: 'КТП (кесте)', to: 'lessons/schedule' },
    { key: 'editor', label: 'Сабақ редакторы', to: 'edit/new' },
    { key: 'plans', label: 'Жоспарлар', to: 'plans' },
    { key: 'gallery', label: 'Ортақ галерея', items: ['Дайын сабақтар', 'Әріптестердің сабақтары'] },
  ] },
  { key: 'tasks', label: 'Тапсырмалар', icon: ClipboardCheck, routes: ['tasks', 'assign', 'review'], to: 'assign', subs: [
    { key: 'assigned', label: 'Күнделікті тапсырмалар', icon: Send, to: 'assign' },
    { key: 'projects', label: 'Жобалар', icon: FolderKanban, items: ['Ұзақмерзімді жұмыстарды бақылау'] },
    { key: 'jeopardy', label: 'Jeopardy', icon: Gamepad2, to: 'tasks/jeopardy' },
    { key: 'bank', label: 'Тапсырмалар банкі', icon: Library, items: ['Түрі, сыныбы, оқу мақсаты бойынша іздеу'] },
    { key: 'builder', label: 'Конструктор', icon: PencilRuler, items: ['Жеке, жұптық және топтық тапсырмалар'] },
    { key: 'queue', label: 'Тексеру кезегі', icon: Inbox, to: 'tasks/queue' },
    { key: 'grading', label: 'Бағалау жүйесі', icon: Scale, items: ['Баллдық, пайыздық және критериалды бағалау', 'Максималды балл және рубрикалар', 'Автоматты, AI және қолмен тексеру'] },
  ] },
  { key: 'exams', label: 'Сынақтар мен сайыстар', icon: GraduationCap, routes: ['exams', 'contests'], subs: [
    { key: 'summative', label: 'БЖБ / ТЖБ', items: ['Бөлім және тоқсан бойынша жиынтық бағалау'] },
    { key: 'proctoring', label: 'Прокторинг', icon: ShieldCheck, items: ['Емтихан кезіндегі академиялық адалдық'] },
    { key: 'settings', label: 'Емтихан баптаулары', items: ['Уақытты шектеу', 'Сұрақтар ретін араластыру', 'Нәтижені автоматты жариялау'] },
    { key: 'variants', label: 'Нұсқалар', items: ['Бір сыныпқа 6-7 нұсқаға дейін'] },
    { key: 'hackathon', label: 'Хакатон және код дуэлі', icon: Swords, items: ['Информатика мен бағдарламалау жарыстары'] },
    { key: 'tournament', label: 'Турнирлер', icon: Trophy, items: ['Сыныптар аралық және мектеп ішілік зияткерлік сайыстар'] },
  ] },
  { key: 'journal', label: 'Журнал', icon: NotebookText, routes: ['journal'], subs: [
    { key: 'lessons', label: 'Сабақ журналы', to: 'journal/lessons' },
    { key: 'grid', label: 'Сынып журналы', to: 'journal/grid' },
    { key: 'classes', label: 'Сыныптар', to: 'journal/classes' },
    { key: 'reports', label: 'Есептер және топтар', items: ['Сынып және оқушы есептері', 'Сақталған жұптар мен топтар', 'Сынып жетекшісіне арналған көрініс'] },
  ] },
  { key: 'edustudio', label: 'EduStudio', icon: Sparkles, routes: ['edustudio'], subs: [
    { key: 'materials', label: 'Материал жасау', items: ['Модуль немесе тақырып бойынша конспект'] },
    { key: 'tests', label: 'Тест генерациясы', items: ['Сұрақтар, интерактив және сабақтар', 'Бірнеше тест нұсқасын автоматты құрастыру'] },
  ] },
  { key: 'vocab', label: 'Сөздігім', icon: BookOpen, routes: ['vocab'], subs: [
    { key: 'base', label: 'Терминдер базасы', to: 'vocab/base' },
    { key: 'link', label: 'Тақырыпқа байлау', to: 'vocab/link' },
    { key: 'test', label: 'Сөздік тесті', to: 'vocab/test' },
    { key: 'share', label: 'Тарату', to: 'vocab/share' },
  ] },
  { key: 'settings', label: 'Профиль және баптаулар', icon: SlidersHorizontal, routes: ['settings', 'profile'], hidden: true, subs: [
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
    { key: 'cards', label: 'Карточкалар', to: 'vocab/cards' },
    { key: 'test', label: 'Өзін-өзі тексеру', to: 'vocab/test' },
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
  return s.subs.find(x => x.to === full) ?? s.subs.find(x => x.to === routeKey) ?? s.subs.find(x => x.also?.includes(routeKey))
    ?? (routeKey === s.key ? s.subs.find(x => x.key === routeId) : undefined);
}
