import type { Lang } from '../lessons/lang';
import type { Course, Les, Mod } from './store';

/** Built-in ACMP curriculum labels. Stored values remain Russian for backwards compatibility. */
const MODULE_KK: Record<string, string> = {
  'Введение': 'Кіріспе',
  'Условный оператор': 'Шартты оператор',
  'Операторы цикла': 'Цикл операторлары',
  'Строковые типы данных': 'Жолдық деректер типтері',
  'Массивы': 'Массивтер',
  'Функции': 'Функциялар',
  'Сортировка': 'Сұрыптау',
  'Двумерные массивы': 'Екіөлшемді массивтер',
  'Рекурсия': 'Рекурсия',
};

const COURSE_KK: Record<string, string> = {
  'ACMP: Язык программирования C++': 'ACMP: C++ бағдарламалау тілі',
};

export const courseTitle = (course: Course, lang: Lang) =>
  lang === 'kk' ? COURSE_KK[course.title] || course.title : course.title;

export const moduleTitle = (module: Mod, lang: Lang) =>
  lang === 'kk' ? MODULE_KK[module.title] || module.title : module.title;

export const lessonTitle = (lesson: Les, lang: Lang) =>
  lang === 'ru' ? lesson.title_ru || lesson.title : lesson.title_kk || lesson.title;
