import type { Lang } from '../lessons/lang';
import type { Course, Les, Mod } from './store';

/** Built-in curriculum module labels in Kazakh. */
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
  'Spreadsheets': 'Электрондық кестелер',
  'Database basics': 'Деректер қорының негіздері',
  'Data representation': 'Деректердің берілуі',
  'Programming': 'Бағдарламалау',
};

const MODULE_RU: Record<string, string> = {
  'Spreadsheets': 'Электронные таблицы',
  'Database basics': 'Основы баз данных',
  'Data representation': 'Представление данных',
  'Programming': 'Программирование',
};

const MODULE_EN: Record<string, string> = {
  'Введение': 'Introduction',
  'Условный оператор': 'Conditional statements',
  'Операторы цикла': 'Loops',
  'Строковые типы данных': 'Strings',
  'Массивы': 'Arrays',
  'Функции': 'Functions',
  'Сортировка': 'Sorting',
  'Двумерные массивы': '2D Arrays',
  'Рекурсия': 'Recursion',
  'Spreadsheets': 'Spreadsheets',
  'Database basics': 'Database basics',
  'Data representation': 'Data representation',
  'Programming': 'Programming',
};

const COURSE_KK: Record<string, string> = {
  'ACMP: Язык программирования C++': 'ACMP: C++ бағдарламалау тілі',
  'Informatics 8th grade': 'Информатика 8-сынып',
  'Informatics 9th grade': 'Информатика 9-сынып',
  'Informatics 10th grade': 'Информатика 10-сынып',
};

const COURSE_RU: Record<string, string> = {
  'ACMP: Язык программирования C++': 'ACMP: Язык программирования C++',
  'Informatics 8th grade': 'Информатика 8 класс',
  'Informatics 9th grade': 'Информатика 9 класс',
  'Informatics 10th grade': 'Информатика 10 класс',
};

const COURSE_EN: Record<string, string> = {
  'ACMP: Язык программирования C++': 'ACMP: C++ Programming',
  'Informatics 8th grade': 'Informatics 8th grade',
  'Informatics 9th grade': 'Informatics 9th grade',
  'Informatics 10th grade': 'Informatics 10th grade',
};

export const courseTitle = (course: Course, lang: Lang) => {
  if (lang === 'kk') return COURSE_KK[course.title] || course.title;
  if (lang === 'en') return COURSE_EN[course.title] || course.title;
  return COURSE_RU[course.title] || course.title;
};

export const moduleTitle = (module: Mod, lang: Lang) => {
  if (lang === 'kk') return MODULE_KK[module.title] || module.title;
  if (lang === 'en') return MODULE_EN[module.title] || module.title;
  return MODULE_RU[module.title] || module.title;
};

export const lessonTitle = (lesson: Les, lang: Lang) => {
  if (lang === 'en') return (lesson as any).title_en || lesson.title;
  if (lang === 'ru') return lesson.title_ru || lesson.title;
  return lesson.title_kk || lesson.title;
};
