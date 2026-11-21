// Names are stored "Тегі Аты [Әкесінің аты]" (surname first): a greeting uses the given name.
const PATRONYMIC = /(ұлы|улы|қызы|кызы|ович|евич|овна|евна|ична)$/i;
export function givenName(full: string | null | undefined): string {
  const w = (full || '').trim().split(/\s+/).filter(Boolean);
  if (w.length < 2) return w[0] || '';
  const rest = PATRONYMIC.test(w[w.length - 1]) && w.length > 2 ? w.slice(1, -1) : w.slice(1);
  return rest.join(' ');
}
