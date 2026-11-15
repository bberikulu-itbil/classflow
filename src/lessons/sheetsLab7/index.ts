// Informatics 7, textbook chapter 3 "Solving problems with spreadsheets" (2nd quarter): 8 lessons (3.1-3.7 and "Check yourself") in Kazakh, Russian and English.
// Built with the same DSL and lesson features as the Informatics 8 module (../sheetsLab); its pictures are drawn by the same script.
import { L1, L2 } from './a';
import { L3, L4 } from './b';
import { L5, L6 } from './c';
import { L7, L8 } from './d';
import type { LabLesson } from '../sheetsLab/dsl';
import { markLesson } from '../sheetsLab/cv';

export { PICS, SOLUTIONS } from '../sheetsLab/dsl';
export const SHEETS7_LESSONS: LabLesson[] = [L1, L2, L3, L4, L5, L6, L7, L8].map(markLesson);

/** The course is created by the SQL generator when missing; one module for the second quarter. */
export const SHEETS7_COURSE = { title: 'Informatics 7th grade', subject: 'Информатика', grade: 7 };
export const SHEETS7_MODULE = { title: 'Электрондық кестелер (3-тарау)', title_kk: 'Электрондық кестелер (3-тарау)', title_ru: 'Электронные таблицы (глава 3)', position: 0, kind: 'lesson', quarter: 2, grade: 7 };

export const SHEETS7_LESSONS_DATA: Record<string, { id: string; title: string; subject: string; plan: any; terms: any[]; slides: any[] }> = Object.fromEntries(
  SHEETS7_LESSONS.map(l => [l.id, {
    id: l.id, title: l.title[0], subject: 'Информатика',
    plan: {
      summary: l.summary[0], objectives: l.objectives.map(o => o[0]), grade: 7, duration: '45 минут',
      ...(l.plan ? { prior: l.plan.prior[0], env: l.plan.env[0], source: l.plan.source[0], stages: l.plan.stages.map(x => ({ k: x.k, min: x.min, do: x.do[0] })) } : {}),
      ru: { summary: l.summary[1], objectives: l.objectives.map(o => o[1]), ...(l.plan ? { prior: l.plan.prior[1], env: l.plan.env[1], source: l.plan.source[1], stages: l.plan.stages.map(x => x.do[1]) } : {}) },
      en: { summary: l.summary[2], objectives: l.objectives.map(o => o[2]), ...(l.plan ? { prior: l.plan.prior[2], env: l.plan.env[2], source: l.plan.source[2], stages: l.plan.stages.map(x => x.do[2]) } : {}) },
    },
    terms: l.terms.map(([term, kk, ru, en]) => ({ term, definition: `${kk} · ${ru} · ${en}` })),
    slides: l.slides,
  }]),
);
