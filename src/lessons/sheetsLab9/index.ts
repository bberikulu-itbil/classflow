// Informatics 9, textbook chapter 2 "Databases" (2nd quarter): 8 lessons (2.1-2.7 and "Check yourself") in Kazakh, Russian and English.
// Every topic is done in the ClassFlow sheet and in SQL side by side (SQL editor: src/sql). Built with the DSL of the Informatics 8 module (../sheetsLab).
import { L1, L2, L3, L4 } from './a';
import { L5, L6, L7, L8 } from './b';
import { planData, type LabLesson } from '../sheetsLab/dsl';
import { markLesson } from '../sheetsLab/cv';

export { PICS, SOLUTIONS } from '../sheetsLab/dsl';
export { SQL_SOLUTIONS } from './lib';
export const SHEETS9_LESSONS: LabLesson[] = [L1, L2, L3, L4, L5, L6, L7, L8].map(markLesson);

/** The course is created by the SQL generator when missing; one module for the second quarter. */
export const SHEETS9_COURSE = { title: 'Informatics 9th grade', subject: 'Информатика', grade: 9 };
export const SHEETS9_MODULE = { title: 'Деректер қоры (2-тарау)', title_kk: 'Деректер қоры (2-тарау)', title_ru: 'Базы данных (глава 2)', position: 1, kind: 'lesson', quarter: 2, grade: 9 };

export const SHEETS9_LESSONS_DATA: Record<string, { id: string; title: string; subject: string; plan: any; terms: any[]; slides: any[] }> = Object.fromEntries(
  SHEETS9_LESSONS.map(l => [l.id, {
    id: l.id, title: l.title[0], subject: 'Информатика',
    plan: planData(l, 9),
    terms: l.terms.map(([term, kk, ru, en]) => ({ term, definition: `${kk} · ${ru} · ${en}` })),
    slides: l.slides,
  }]),
);
