// Informatics 7, textbook chapter 3 "Solving problems with spreadsheets" (2nd quarter): 8 lessons (3.1-3.7 and "Check yourself") in Kazakh, Russian and English.
// Built with the same DSL and lesson features as the Informatics 8 module (../sheetsLab); its pictures are drawn by the same script.
import { L1, L2 } from './a';
import { L3, L4 } from './b';
import { L5, L6 } from './c';
import { L7, L8 } from './d';
import { planData, type LabLesson } from '../sheetsLab/dsl';
import { markLesson } from '../sheetsLab/cv';

export { PICS, SOLUTIONS } from '../sheetsLab/dsl';
export const SHEETS7_LESSONS: LabLesson[] = [L1, L2, L3, L4, L5, L6, L7, L8].map(markLesson);

/** The course is created by the SQL generator when missing; one module for the second quarter. */
export const SHEETS7_COURSE = { title: 'Informatics 7th grade', subject: 'Информатика', grade: 7 };
export const SHEETS7_MODULE = { title: 'Электрондық кестелер (3-тарау)', title_kk: 'Электрондық кестелер (3-тарау)', title_ru: 'Электронные таблицы (глава 3)', position: 0, kind: 'lesson', quarter: 2, grade: 7 };

export const SHEETS7_LESSONS_DATA: Record<string, { id: string; title: string; subject: string; plan: any; terms: any[]; slides: any[] }> = Object.fromEntries(
  SHEETS7_LESSONS.map(l => [l.id, {
    id: l.id, title: l.title[0], subject: 'Информатика',
    plan: planData(l, 7),
    terms: l.terms.map(([term, kk, ru, en]) => ({ term, definition: `${kk} · ${ru} · ${en}` })),
    slides: l.slides,
  }]),
);
