// Informatics 8, textbook chapter 3 "Spreadsheets": 8 lessons (3.1-3.7 and "Check yourself") in Kazakh, Russian and English.
// They use the lesson features of migrations 038 and 041: slide kinds, practice with a picture and a marking scheme, and pair mode.
import { L1 } from './lesson1';
import { L2, L3, L4 } from './lessons1to4';
import { L5, L6, L7, L8 } from './lessons5to8';
import type { LabLesson } from './dsl';
import { markLesson } from './cv';

export { PICS, SOLUTIONS } from './dsl';
export const SHEETSLAB_LESSONS: LabLesson[] = [L1, L2, L3, L4, L5, L6, L7, L8].map(markLesson);

/** Same course as the textbook-copy module (crs-inf8); this is a second module next to it. */
export const SHEETSLAB_MODULE = {
  id: 'mod-sheets-lab', course_id: 'crs-inf8', title: 'Электрондық кестелер (3-тарау)', title_kk: 'Электрондық кестелер (3-тарау)', title_ru: 'Электронные таблицы (глава 3)',
  position: 1, kind: 'lesson', quarter: 2, grade: 8,
};

export const SHEETSLAB_LESSONS_META = SHEETSLAB_LESSONS.map(l => ({
  id: l.id, title: l.title[0], title_kk: l.title[0], title_ru: l.title[1], subject: 'Информатика',
}));

export const SHEETSLAB_LESSONS_DATA: Record<string, { id: string; title: string; subject: string; plan: any; terms: any[]; slides: any[] }> = Object.fromEntries(
  SHEETSLAB_LESSONS.map(l => [l.id, {
    id: l.id, title: l.title[0], subject: 'Информатика',
    plan: {
      summary: l.summary[0], objectives: l.objectives.map(o => o[0]), grade: 8, duration: '45 минут',
      ru: { summary: l.summary[1], objectives: l.objectives.map(o => o[1]) }, en: { summary: l.summary[2], objectives: l.objectives.map(o => o[2]) },
    },
    terms: l.terms.map(([term, kk, ru, en]) => ({ term, definition: `${kk} · ${ru} · ${en}` })),
    slides: l.slides,
  }]),
);
