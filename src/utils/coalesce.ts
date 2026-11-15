/** Turns a burst of calls into one `fn()` call after `ms` (+ a random 0..jitter, so 23 phones do not all ask the server in the same moment). */
export const coalesce = (fn: () => void, ms: number, jitter = 0) => {
  let t: ReturnType<typeof setTimeout> | undefined;
  return () => { if (!t) t = setTimeout(() => { t = undefined; fn(); }, ms + Math.random() * jitter); };
};
