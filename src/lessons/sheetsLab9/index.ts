// Informatics 9, textbook chapter 2 "Databases" (2nd quarter): 8 lessons (2.1-2.7 and "Check yourself") in Kazakh, Russian and English.
// Every topic is done in the ClassFlow sheet and in SQL side by side (SQL editor: src/sql). Built with the DSL of the Informatics 8 module (../sheetsLab).
import { L1, L2, L3, L4 } from './a';
import { L5, L6, L7, L8 } from './b';
import type { LabLesson } from '../sheetsLab/dsl';
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
    plan: {
      summary: l.summary[0], objectives: l.objectives.map(o => o[0]), grade: 9, duration: '45 минут',
      ...(l.plan ? { prior: l.plan.prior[0], env: l.plan.env[0], source: l.plan.source[0], stages: l.plan.stages.map(x => ({ k: x.k, min: x.min, do: x.do[0] })) } : {}),
      ru: { summary: l.summary[1], objectives: l.objectives.map(o => o[1]), ...(l.plan ? { prior: l.plan.prior[1], env: l.plan.env[1], source: l.plan.source[1], stages: l.plan.stages.map(x => x.do[1]) } : {}) },
      en: { summary: l.summary[2], objectives: l.objectives.map(o => o[2]), ...(l.plan ? { prior: l.plan.prior[2], env: l.plan.env[2], source: l.plan.source[2], stages: l.plan.stages.map(x => x.do[2]) } : {}) },
    },
    terms: l.terms.map(([term, kk, ru, en]) => ({ term, definition: `${kk} · ${ru} · ${en}` })),
    slides: l.slides,
  }]),
);
