// Draws the table pictures of the practice tasks (src/lessons/sheetsLab) into public/lec/inf8-<name>-<kk|ru|en>.svg: a sheet with column letters and row numbers,
// the data to copy and yellow "?" cells to calculate. Run after gen-sheetslab-art.mjs: node scripts/gen-sheetslab-tables.mjs
import { build } from 'esbuild'; import { writeFileSync, mkdirSync } from 'node:fs'; import { tmpdir } from 'node:os';
const OUT = new URL('../public/lec/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const bundle = `${tmpdir()}/sheetslab-pics.mjs`;
await build({ entryPoints: ['src/lessons/sheetsLab/index.ts'], bundle: true, format: 'esm', outfile: bundle, logLevel: 'error' });
const { PICS } = await import(bundle);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const L = i => String.fromCharCode(65 + i);
const LANGS = ['kk', 'ru', 'en'];
let n = 0;
for (const p of PICS) {
  const widths = p.widths || Array(p.cols).fill(110), rn = 34, hh = 28, ch = 32, x0 = 20, y0 = 62;
  const W = Math.max(520, x0 + rn + widths.reduce((a, b) => a + b, 0) + 20), H = y0 + hh + p.rows * ch + 56;
  LANGS.forEach((lang, li) => {
    let s = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="18" fill="#fff" stroke="#CBD5E1"/><text x="${x0}" y="38" font-size="20" font-weight="800" fill="#0F172A">${esc(p.title[li])}</text>`;
    let cx = x0 + rn;
    const xs = widths.map(w => { const x = cx; cx += w; return x; });
    xs.forEach((x, c) => { s += `<rect x="${x}" y="${y0}" width="${widths[c]}" height="${hh}" fill="#E2E8F0" stroke="#CBD5E1"/><text x="${x + widths[c] / 2}" y="${y0 + 19}" font-size="14" font-weight="700" fill="#64748B" text-anchor="middle">${L(c)}</text>`; });
    for (let r = 1; r <= p.rows; r++) {
      const y = y0 + hh + (r - 1) * ch;
      s += `<rect x="${x0}" y="${y}" width="${rn}" height="${ch}" fill="#E2E8F0" stroke="#CBD5E1"/><text x="${x0 + rn / 2}" y="${y + 21}" font-size="13" font-weight="700" fill="#64748B" text-anchor="middle">${r}</text>`;
      xs.forEach((x, c) => {
        const id = L(c) + r, v = p.data[id], ask = p.ask.includes(id), txt = v == null ? '' : typeof v === 'string' ? v : v[li], num = txt !== '' && !Number.isNaN(Number(txt));
        s += `<rect x="${x}" y="${y}" width="${widths[c]}" height="${ch}" fill="${ask ? '#FDE68A' : r === 1 ? '#F1F5F9' : '#fff'}" stroke="#CBD5E1"/>`;
        if (txt !== '') s += `<text x="${num || ask ? x + widths[c] - 10 : x + 10}" y="${y + 21}" font-size="${txt.length > 18 ? 13 : 15}" font-weight="${ask || r === 1 ? 800 : 500}" fill="#0F172A" text-anchor="${num || ask ? 'end' : 'start'}">${esc(txt)}</text>`;
      });
    }
    if (p.note) s += `<text x="${x0}" y="${H - 20}" font-size="14" fill="#B45309" font-weight="700">🟨 ${esc(p.note[li])}</text>`;
    writeFileSync(OUT + `inf8-${p.name}-${lang}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter,Arial,sans-serif">${s}</svg>`);
    n++;
  });
}
console.log('written', n, 'table pictures for', PICS.length, 'tasks');
