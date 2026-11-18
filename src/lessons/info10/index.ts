// Informatics 10, chapter 2 "Data representation" (2nd quarter): three lessons and "Check yourself", in Kazakh, Russian and English.
// Interactive pieces: src/components/LabWidgets.tsx; test variants: migration 069. The former seven lessons stay in the library, out of the module.
import { L1 } from './a';
import { L2 } from './b';
import { L3, L4 } from './c';
import type { LabLesson } from '../sheetsLab/dsl';
import { markLesson } from '../sheetsLab/cv';

export const INFO10_LESSONS: LabLesson[] = [L1, L2, L3, L4].map(markLesson);
/** The teacher's own course and module (found by title by the SQL generator). */
export const INFO10_COURSE = { title: 'informatics 10th', grade: 10 };
export const INFO10_MODULE = { title: '2-тарау. Деректерді көрсету' };

export const INFO10_LESSONS_DATA = INFO10_LESSONS.map(l => ({
  id: l.id, title: l.title[0], subject: 'Информатика',
  plan: {
    gen: l.id, summary: l.summary[0], objectives: l.objectives.map(o => o[0]), grade: 10, duration: '45 минут',
    ...(l.plan ? { prior: l.plan.prior[0], env: l.plan.env[0], source: l.plan.source[0], stages: l.plan.stages.map(x => ({ k: x.k, min: x.min, do: x.do[0] })) } : {}),
    ru: { summary: l.summary[1], objectives: l.objectives.map(o => o[1]), ...(l.plan ? { prior: l.plan.prior[1], env: l.plan.env[1], source: l.plan.source[1], stages: l.plan.stages.map(x => x.do[1]) } : {}) },
    en: { summary: l.summary[2], objectives: l.objectives.map(o => o[2]), ...(l.plan ? { prior: l.plan.prior[2], env: l.plan.env[2], source: l.plan.source[2], stages: l.plan.stages.map(x => x.do[2]) } : {}) },
  },
  terms: l.terms.map(([term, kk, ru, en]) => ({ term, definition: `${kk} · ${ru} · ${en}` })),
  slides: l.slides,
}));
