// Checks lessons rewritten to docs/informatics-lesson-guide.md (v0.9.1): a full ҚМЖ plan, textbook pages, 4+ figures, a simulation.
// Run: node replica/unit/guide.test.mjs   (add a lesson id to GUIDE when it is brought to the guide)
import { build } from 'esbuild'; import assert from 'node:assert/strict'; import { existsSync } from 'node:fs';
const GUIDE = { 'src/lessons/sheetsLab/index.ts': ['SHEETSLAB_LESSONS_DATA', ['inf8lab-3']], 'src/lessons/sheetsLab7/index.ts': ['SHEETS7_LESSONS_DATA', ['inf7lab-4']], 'src/lessons/sheetsLab9/index.ts': ['SHEETS9_LESSONS_DATA', ['inf9db-3']] };
const KINDS = new Set(['fill', 'pct', 'insert', 'base', 'circuit', 'build', 'adder', 'code']);
const words = s => String(s || '').split(/\s+/).filter(Boolean).length;
let n = 0;
for (const [entry, [name, ids]] of Object.entries(GUIDE)) {
  const out = `/tmp/guide-${n++}.mjs`;
  await build({ entryPoints: [entry], bundle: true, format: 'esm', outfile: out, logLevel: 'error' });
  const D = (await import(out))[name];
  for (const id of ids) {
    const l = D[id], p = l.plan; assert.ok(l, id);
    for (const k of ['aim', 'diff', 'assess', 'health', 'prior', 'env', 'source']) assert.ok(p[k]?.length > 20, `${id}: plan.${k}`);
    assert.ok(p.codes?.length, `${id}: codes`);
    assert.equal(p.stages.reduce((a, s) => a + s.min, 0), 45, `${id}: stages add up to 45`);
    for (const s of p.stages) assert.ok(s.do && s.t && s.ev, `${id}: stage ${s.k} has do, t, ev`);
    const pages = l.slides.filter(s => s.kind === 'explain');
    assert.ok(pages.length >= 2, `${id}: 2+ explain pages`);
    let figs = 0;
    for (const s of pages) {
      for (const [lang, x] of [['kk', s], ['ru', s.ru], ['en', s.en]]) {
        const w = words(x.read);
        assert.ok(w >= 150 && w <= 420, `${id} «${s.title}» ${lang}: ${w} words`);
        for (const h of lang === 'kk' ? ['# Неге?', '# Қалай?', '# Мысал', '# Жиі қате'] : []) assert.ok(x.read.includes(h), `${id} «${s.title}»: ${h}`);
        assert.equal(x.figs?.length, s.figs?.length, `${id} «${s.title}» ${lang}: figs`);
      }
      assert.ok(s.bullets.length >= 2 && s.bullets.length <= 4, `${id} «${s.title}»: 2–4 «Есте сақта»`);
      for (const f of s.figs || []) { assert.ok(existsSync(`public/lec/inf8-${f.art}.svg`), `${id}: picture ${f.art}`); assert.ok(f.cap, `${id}: caption`); figs++; }
      // «1-сурет» … in the text must point at a picture that exists
      for (const m of s.read.matchAll(/(\d)-сурет/g)) assert.ok(+m[1] <= (s.figs || []).length, `${id} «${s.title}»: ${m[0]} has no picture`);
    }
    assert.ok(figs >= 4, `${id}: ${figs} figures (need 4+)`);
    const sims = l.slides.filter(s => s.widget && KINDS.has(s.widget.kind));
    assert.ok(sims.length >= 1, `${id}: a simulation`);
    console.log(`${id}: ok — ${pages.length} pages, ${figs} figures, ${sims.map(s => s.widget.kind).join(', ')}`);
  }
}
