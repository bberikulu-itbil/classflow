// Informatics 8, "Spreadsheets lab": 8 bilingual lessons built on textbook chapter 2 (pp. 23-38) that use the lesson
// features of migration 038: slide kinds, practice levels L1-L3 with A/B variants, and pair mode.
import { L1, L2, L3, L4 } from './lessons1to4';
import { L5, L6, L7, L8 } from './lessons5to8';
import type { LabLesson } from './dsl';
import { markLesson } from './cv';

export const SHEETSLAB_LESSONS: LabLesson[] = [L1, L2, L3, L4, L5, L6, L7, L8].map(markLesson);

/** Same course as the textbook-copy module (crs-inf8); this is a second module next to it. */
export const SHEETSLAB_MODULE = {
  id: 'mod-sheets-lab', course_id: 'crs-inf8', title: 'Электрондық кестелер: практикум', title_kk: 'Электрондық кестелер: практикум', title_ru: 'Электронные таблицы: практикум',
  position: 1, kind: 'lesson', quarter: 2, grade: 8,
};

export const SHEETSLAB_LESSONS_META = SHEETSLAB_LESSONS.map(l => ({
  id: l.id, title: l.title[0], title_kk: l.title[0], title_ru: l.title[1], subject: 'Информатика',
}));

export const SHEETSLAB_LESSONS_DATA: Record<string, { id: string; title: string; subject: string; plan: any; terms: any[]; slides: any[] }> = Object.fromEntries(
  SHEETSLAB_LESSONS.map(l => [l.id, {
    id: l.id, title: l.title[0], subject: 'Информатика',
    plan: { summary: l.summary[0], objectives: l.objectives.map(o => o[0]), grade: 8, duration: '45 минут', ru: { summary: l.summary[1], objectives: l.objectives.map(o => o[1]) } },
    terms: l.terms.map(([term, kk, ru]) => ({ term, definition: `${kk} · ${ru}` })),
    slides: l.slides,
  }]),
);
