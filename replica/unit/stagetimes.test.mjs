// Checks src/utils/stageTimes.ts. Run: node replica/unit/stagetimes.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/utils/stageTimes.ts'], bundle: true, format: 'esm', outfile: '/tmp/stagetimes.mjs', logLevel: 'error' });
const { stageTimes } = await import('/tmp/stagetimes.mjs');
const st = [undefined, 'warmup', 'warmup', 'together', 'practice'], of = i => st[i];
// title (no stage) counts to the first stage; back-and-forth adds up
assert.deepEqual(stageTimes([{ i: 1, t: 160 }, { i: 3, t: 400 }, { i: 1, t: 500 }, { i: 4, t: 560 }], 100, 1000, of, 'warmup'), { warmup: 60 + 240 + 60, together: 100, practice: 440 });
// no moves yet: all the time is on the first slide
assert.deepEqual(stageTimes([], 100, 130, of, 'warmup'), { warmup: 30 });
// a lesson switch resets the log to slide 0: the session start is ignored
assert.deepEqual(stageTimes([{ i: 0, t: 900 }, { i: 3, t: 960 }], 100, 1000, of, 'warmup'), { warmup: 60, together: 40 });
console.log('stageTimes ok');
