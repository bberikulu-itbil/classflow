// shortcut: the school's zone is fixed UTC+5 (Asia/Qostanay has no daylight saving); read schools.tz when a second school joins
const TZ = 'Asia/Qostanay';
export const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleString('kk-KZ', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Мерзімсіз';
export const isPast = (iso: string | null) => !!iso && new Date(iso).getTime() < Date.now();
/** datetime-local value (school time) -> ISO string */
export const fromLocalInput = (v: string) => v ? new Date(v + ':00+05:00').toISOString() : null;
