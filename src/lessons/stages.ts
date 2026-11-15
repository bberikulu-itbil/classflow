// Lesson stages (the order of a typical lesson) for the "Сабақ жоспары" panel, the page labels and the preview.
export const STAGES = [
  { k: 'warmup', kk: 'Қайталау', ru: 'Повторение', en: 'Review' },
  { k: 'explain', kk: 'Түсіндіру', ru: 'Объяснение', en: 'Explain' },
  { k: 'together', kk: 'Бірге орындау', ru: 'Делаем вместе', en: 'Do together' },
  { k: 'example', kk: 'Үлгі бойынша', ru: 'По образцу', en: 'By example' },
  { k: 'practice', kk: 'Өздік жұмыс', ru: 'Самостоятельная работа', en: 'Independent work' },
  { k: 'check', kk: 'Тексеру', ru: 'Проверка', en: 'Check' },
  { k: 'reflect', kk: 'Рефлексия', ru: 'Рефлексия', en: 'Reflection' },
] as const;

export interface PlanStage { k: string; min: number; do: string }

export const stageName = (k: string | undefined, lang: 'kk' | 'ru' | 'en' = 'kk') => STAGES.find(s => s.k === k)?.[lang] || '';
export const totalMin = (st: PlanStage[]) => st.reduce((n, x) => n + (Number(x.min) || 0), 0);
/** "45 минут" -> 45 */
export const durationMin = (d: string) => parseInt(d, 10) || 0;
/** The ready 45-minute shape: 5 + 8 + 10 + 15 + 7. */
export const TEMPLATE_45: PlanStage[] = [
  { k: 'warmup', min: 5, do: 'Бастапқы білімін тексереді' },
  { k: 'together', min: 8, do: 'Мұғаліммен бірге үлгі тапсырманы орындайды' },
  { k: 'example', min: 10, do: 'Үлгі бойынша өзі орындап көреді' },
  { k: 'practice', min: 15, do: 'Практикалық тапсырманы өздігінен орындайды' },
  { k: 'check', min: 7, do: 'Нәтижесін тексеріп, қысқа тест тапсырады' },
];
