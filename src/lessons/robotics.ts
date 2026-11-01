export interface RoboticsLessonMeta {
  id: string;
  title: string;
  title_kk: string;
  title_ru: string;
  subject: string;
  start: number;
  end: number;
}

export const ROBOTICS_LESSONS: RoboticsLessonMeta[] = [
  { id: 'r0', title: 'STEM-білімге AI енгізу (Толық курс · 72 слайд)', title_kk: 'STEM-білімге AI енгізу (Толық курс)', title_ru: 'Внедрение ИИ в STEM-образование (Полный курс)', subject: 'Робототехника', start: 0, end: 72 },
  { id: 'r1', title: 'USTEM Foundation', title_kk: 'USTEM Foundation', title_ru: 'USTEM Foundation', subject: 'Робототехника', start: 0, end: 18 },
  { id: 'r2', title: 'FIRST және алдыңғы маусымдар', title_kk: 'FIRST және алдыңғы маусымдар', title_ru: 'FIRST и предыдущие сезоны', subject: 'Робототехника', start: 18, end: 29 },
  { id: 'r3', title: 'Canopy маусымы', title_kk: 'Canopy маусымы', title_ru: 'Сезон Canopy', subject: 'Робототехника', start: 29, end: 36 },
  { id: 'r4', title: 'FLL', title_kk: 'FLL', title_ru: 'FLL', subject: 'Робототехника', start: 36, end: 51 },
  { id: 'r5', title: 'FLL future edition', title_kk: 'FLL future edition', title_ru: 'FLL future edition', subject: 'Робототехника', start: 51, end: 64 },
  { id: 'r6', title: 'FTC', title_kk: 'FTC', title_ru: 'FTC', subject: 'Робототехника', start: 64, end: 69 },
  { id: 'r7', title: 'Social Media Challenge & Stemshop', title_kk: 'Social Media Challenge & Stemshop', title_ru: 'Social Media Challenge и Stemshop', subject: 'Робототехника', start: 69, end: 72 },
];

let cachedDeck: any[] | null = null;

export async function fetchRoboticsDeck(): Promise<any[]> {
  if (cachedDeck) return cachedDeck;
  try {
    const base = (import.meta as any).env?.BASE_URL || '/';
    const url = `${base.replace(/\/$/, '')}/data/robotics-bilingual.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch robotics deck: ' + res.statusText);
    cachedDeck = await res.json();
    return cachedDeck!;
  } catch (err) {
    console.error('Error loading robotics deck:', err);
    return [];
  }
}

export async function loadRoboticsLesson(id: string): Promise<{ id: string; title: string; subject: string; slides: any[] } | null> {
  const meta = ROBOTICS_LESSONS.find(m => m.id === id);
  if (!meta) return null;
  const deck = await fetchRoboticsDeck();
  const slides = deck.slice(meta.start, meta.end);
  return {
    id: meta.id,
    title: meta.title,
    subject: meta.subject,
    slides,
  };
}

export function isRoboticsLessonId(id: string): boolean {
  return ROBOTICS_LESSONS.some(m => m.id === id);
}
