/** A student's quiz variant letter on a slide with n variants; the server checks the same (cf_qvariant, migration 069). */
export const qvariantOf = (uid: string, slide: number, n: number) =>
  String.fromCharCode(65 + ((parseInt(uid.replace(/-/g, '').slice(0, 8), 16) + slide * 7) % Math.max(n, 1)));
