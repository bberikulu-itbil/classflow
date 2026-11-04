// Writes public/lec/ch2-*.svg (10 сынып, 2-тарау) and supabase/049_informatics_10_ch2_images.sql. Run: node scripts/gen-ch2-img.mjs
// Original schematic drawings. The 049 update is idempotent: sets slide.img/alt by lesson number and slide title.
import { writeFileSync, mkdirSync } from 'node:fs';

const C = { bg: '#f8fafc', ink: '#1e293b', mut: '#475569', line: '#cbd5e1', blue: '#2563eb', navy: '#1e40af', org: '#f97316', grn: '#16a34a', red: '#dc2626', pur: '#7c3aed', yel: '#facc15', gray: '#94a3b8', lb: '#dbeafe' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${o.s || 26}" font-weight="${o.b ? 700 : 400}" fill="${o.c || C.ink}" text-anchor="${o.a || 'start'}">${esc(s)}</text>`;
const R = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 0}" fill="${o.f || 'none'}" stroke="${o.k || 'none'}" stroke-width="${o.w || 0}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}/>`;
const E = (cx, cy, rx, ry, o = {}) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${o.f || 'none'}" stroke="${o.k || 'none'}" stroke-width="${o.w || 0}"/>`;
const L = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.k || C.ink}" stroke-width="${o.w || 4}" stroke-linecap="round"${o.arrow ? ' marker-end="url(#ar)"' : ''}/>`;
const P = (d, o = {}) => `<path d="${d}" fill="${o.f || 'none'}" stroke="${o.k || C.ink}" stroke-width="${o.w || 4}" stroke-linejoin="round" stroke-linecap="round"/>`;
const DEFS = `<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.mut}"/></marker></defs>`;
const svg = (name, w, h, title, desc, body) => {
  mkdirSync('public/lec', { recursive: true });
  writeFileSync(`public/lec/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d"><title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>${DEFS}${R(0, 0, w, h, { f: C.bg, r: 24 })}${body}</svg>\n`);
};
const chip = (x, y, w, s, f = C.blue) => R(x, y, w, 52, { f, r: 12 }) + T(x + w / 2, y + 35, s, { c: '#fff', b: 1, a: 'middle', s: 25 });

// ---- 2.1 binary place values + lamps: 10101000 = 168
{
  const bits = [1, 0, 1, 0, 1, 0, 0, 0], pw = [128, 64, 32, 16, 8, 4, 2, 1], x0 = 130, cw = 120;
  const sum = bits.reduce((a, b, i) => a + b * pw[i], 0);
  if (sum !== 168) throw new Error('binary sum');
  svg('ch2-binary', 1200, 440, 'Екілік сан разрядтары', '8 разряд: 128, 64, 32, 16, 8, 4, 2, 1. 10101000 саны үшінші, бесінші және жетінші разрядтардағы бірліктерден жиналады: 128 + 32 + 8 = 168.', [
    ...bits.map((b, i) => {
      const x = x0 + i * cw;
      return E(x + 50, 80, 32, 32, { f: b ? C.yel : '#e2e8f0', k: b ? C.org : C.gray, w: 4 }) + T(x + 50, 90, '', {}) +
        R(x, 140, 100, 70, { f: b ? C.lb : '#fff', k: b ? C.blue : C.line, w: 3, r: 12 }) + T(x + 50, 190, b, { a: 'middle', b: 1, s: 44, c: b ? C.navy : C.gray }) +
        T(x + 50, 245, pw[i], { a: 'middle', b: 1, s: 30, c: b ? C.ink : C.gray }) + T(x + 50, 275, '2' + '⁷⁶⁵⁴³²¹⁰'[i], { a: 'middle', s: 24, c: C.mut });
    }),
    T(60, 90, 'ON', { s: 22, c: C.org, b: 1 }), T(60, 190, 'бит', { s: 22, c: C.mut }), T(40, 245, 'салмағы', { s: 22, c: C.mut }),
    R(130, 320, 940, 90, { f: '#fff', k: C.blue, w: 3, r: 16 }),
    T(600, 380, '128 + 32 + 8 = 168', { a: 'middle', b: 1, s: 44, c: C.navy }),
  ].join(''));
}

// ---- 2.1 one number in four systems: 167
svg('ch2-bases', 1200, 400, '167 саны төрт жүйеде', 'Бір сан: ондық 167, екілік 10100111, сегіздік 247, он алтылық A7.', [
  ...[['Ондық', '10', '167', '0–9', C.blue], ['Екілік', '2', '10100111', '0, 1', C.pur], ['Сегіздік', '8', '247', '0–7', C.grn], ['Он алтылық', '16', 'A7', '0–9, A–F', C.org]].map(([n, b, v, dg, col], i) => {
    const x = 40 + i * 285;
    return R(x, 60, 255, 280, { f: '#fff', k: col, w: 4, r: 20 }) + R(x, 60, 255, 62, { f: col, r: 20 }) + R(x, 100, 255, 22, { f: col }) +
      T(x + 127, 102, n, { a: 'middle', b: 1, c: '#fff', s: 30 }) +
      T(x + 127, 205, v, { a: 'middle', b: 1, s: v.length > 5 ? 36 : 56 }) +
      T(x + 127, 265, 'негізі ' + b, { a: 'middle', c: C.mut, s: 26 }) + T(x + 127, 308, 'цифрлар: ' + dg, { a: 'middle', c: C.mut, s: 24 });
  }),
  T(600, 385, 'Бір сан — төрт жазылу', { a: 'middle', c: C.mut, s: 24 }),
].join(''));

// ---- 2.2 four addition cases with carry
{
  const cs = [['0', '0', '0', '0'], ['0', '1', '1', '0'], ['1', '0', '1', '0'], ['1', '1', '0', '1']];
  svg('ch2-carry', 1200, 420, 'Екілік қосудың төрт жағдайы', '0+0=0, 0+1=1, 1+0=1. 1+1=10: қосынды разрядына 0 жазылады, 1 келесі разрядқа тасымалданады.', [
    ...cs.map(([a, b, s, c], i) => {
      const x = 40 + i * 285, hot = c === '1', col = hot ? C.org : C.blue;
      return R(x, 50, 255, 300, { f: hot ? '#fff7ed' : '#fff', k: col, w: 4, r: 20 }) +
        T(x + 127, 115, a + ' + ' + b, { a: 'middle', b: 1, s: 48 }) + L(x + 40, 140, x + 215, 140, { k: C.gray, w: 3 }) +
        T(x + 127, 205, '= ' + s, { a: 'middle', b: 1, s: 52, c: col }) +
        R(x + 30, 240, 195, 62, { f: hot ? C.org : '#e2e8f0', r: 12 }) + T(x + 127, 282, 'тасымал ' + c, { a: 'middle', b: 1, s: 28, c: hot ? '#fff' : C.mut }) +
        T(x + 127, 335, '', {});
    }),
    T(1000, 395, '1 + 1 = 10: 0 жазамыз, 1 — келесі разрядқа', { a: 'end', b: 1, c: C.org, s: 26 }),
  ].join(''));
}

// ---- 2.3 switch circuits: AND (series), OR (parallel), NOT (switch bypasses the lamp)
const lamp = (cx, cy, on) => E(cx, cy, 44, 44, { f: on ? C.yel : '#e2e8f0', k: on ? C.org : C.gray, w: 5 }) + L(cx - 28, cy - 28, cx + 28, cy + 28, { k: on ? C.org : C.gray }) + L(cx + 28, cy - 28, cx - 28, cy + 28, { k: on ? C.org : C.gray }) +
  (on ? [[-1, 0], [1, 0], [-.7, -.7], [.7, -.7]].map(([dx, dy]) => L(cx + dx * 62, cy + dy * 62, cx + dx * 78, cy + dy * 78, { k: C.org })).join('') : '');
// battery on a vertical wire at x, plates between y1 and y2 (wire runs from y0 to y3)
const battery = (x, y0, y3) => { const m = (y0 + y3) / 2; return L(x, y0, x, m - 22) + L(x - 36, m - 22, x + 36, m - 22, { w: 8 }) + L(x - 20, m + 14, x + 20, m + 14, { w: 8 }) + L(x, m + 14, x, y3) + T(x - 52, m - 14, '+', { s: 30, b: 1, c: C.red, a: 'end' }); };
const dot = (x, y) => E(x, y, 7, 7, { f: C.ink });
const swH = (x, y, lab, closed) => dot(x, y) + dot(x + 90, y) + (closed ? L(x, y, x + 90, y, { w: 7, k: C.grn }) : L(x, y, x + 78, y - 40, { w: 7, k: C.red })) + T(x + 45, y - (closed ? 26 : 56), lab, { a: 'middle', b: 1, s: 28 });
const swV = (x, y, lab, closed) => dot(x, y) + dot(x, y + 90) + (closed ? L(x, y, x, y + 90, { w: 7, k: C.grn }) : L(x, y, x + 44, y + 74, { w: 7, k: C.red })) + T(x + 62, y + 52, lab, { a: 'start', b: 1, s: 28 });

svg('ch2-sw-and', 1200, 440, 'AND: тізбектей қосылған ажыратқыштар', 'Екі ажыратқыш бір сымда бірінен кейін бірі тұр. Шам тек екеуі де жабық болғанда жанады.', [
  battery(140, 140, 330), P('M140 140 H300'), swH(300, 140, 'A', true), P('M390 140 H560'), swH(560, 140, 'B', true), P('M650 140 H920 V196'),
  lamp(920, 240, true), P('M920 284 V330 H140'), T(920, 372, 'шам', { a: 'middle', c: C.mut, s: 24 }),
  chip(190, 368, 560, 'A және B жабық → шам жанады', C.grn),
].join(''));

svg('ch2-sw-or', 1200, 480, 'OR: параллель қосылған ажыратқыштар', 'Екі ажыратқыш екі параллель сымда тұр. Біреуі жабық болса да шам жанады.', [
  battery(140, 130, 380), P('M140 130 H330'), swH(330, 130, 'A', true), P('M420 130 H920 V196'),
  P('M260 130 V250 H330'), swH(330, 250, 'B', false), P('M420 250 H760 V130'), dot(260, 130), dot(760, 130),
  lamp(920, 240, true), P('M920 284 V380 H140'), T(920, 422, 'шам', { a: 'middle', c: C.mut, s: 24 }),
  chip(190, 405, 560, 'A жабық, B ашық → шам жанады', C.grn),
].join(''));

const notPanel = (ox, closed) => [
  battery(ox + 60, 110, 330), P(`M${ox + 60} 110 H${ox + 120}`), R(ox + 120, 92, 70, 36, { f: '#fff', k: C.ink, w: 4, r: 4 }), T(ox + 155, 118, 'R', { a: 'middle', s: 22, b: 1 }), T(ox + 155, 156, 'резистор', { a: 'middle', s: 20, c: C.mut }),
  P(`M${ox + 190} 110 H${ox + 450} V170`), P(`M${ox + 300} 110 V186`), dot(ox + 300, 110),
  lamp(ox + 300, 230, !closed), P(`M${ox + 300} 274 V330`), swV(ox + 450, 170, 'P', closed), P(`M${ox + 450} 260 V330 H${ox + 60}`),
  chip(ox + 20, 360, 520, closed ? 'P жабық (1) → шам өшеді (0)' : 'P ашық (0) → шам жанады (1)', closed ? C.red : C.grn),
].join('');
svg('ch2-sw-not', 1200, 440, 'NOT: ажыратқыш шамды «айналып өтеді»', 'Ажыратқыш шамға параллель қосылған. Ажыратқыш жабық болса, ток шамның жанынан өтеді де, шам өшеді. Ажыратқыш ашық болса, шам жанады.', notPanel(20, false) + L(600, 70, 600, 340, { k: C.line, w: 3 }) + notPanel(620, true));

// ---- 2.4 how many rows: 2, 4, 8, 16
svg('ch2-rows', 1200, 420, 'Ақиқаттық кестенің жол саны', 'Айнымалы санына қарай жол саны екі есе өседі: 1 айнымалы — 2 жол, 2 — 4, 3 — 8, 4 — 16.', [
  ...[1, 2, 3, 4].map((n, i) => {
    const x = 40 + i * 285, rows = 2 ** n, cols = rows > 8 ? 4 : rows > 4 ? 4 : rows > 2 ? 2 : 1;
    const per = Math.ceil(rows / cols), s = 34, gx = 8, gridW = cols * s + (cols - 1) * gx, ox = x + (255 - gridW) / 2;
    let sq = '';
    for (let k = 0; k < rows; k++) { const cx = Math.floor(k / per), cy = k % per; sq += R(ox + cx * (s + gx), 150 + cy * (s + 8) - (per <= 2 ? -40 : 0), s, s, { f: C.blue, r: 6 }); }
    return R(x, 50, 255, 340, { f: '#fff', k: C.blue, w: 3, r: 20 }) + T(x + 127, 100, n + ' айнымалы', { a: 'middle', b: 1, s: 30 }) + sq +
      T(x + 127, 372, `2${'¹²³⁴'[n - 1]} = ${rows} жол`, { a: 'middle', b: 1, s: 32, c: C.navy });
  }),
].join(''));

// ---- 2.5 gate symbols
const GW = { NOT: 110, AND: 125, OR: 130, XOR: 146 };
const gateBody = (k, x, y, on) => {
  const f = on ? '#dcfce7' : C.lb, st = { f, k: C.ink, w: 5 };
  if (k === 'AND') return P(`M${x} ${y} H${x + 70} A55 55 0 0 1 ${x + 70} ${y + 110} H${x} Z`, st);
  if (k === 'OR') return P(`M${x} ${y} Q${x + 70} ${y} ${x + 130} ${y + 55} Q${x + 70} ${y + 110} ${x} ${y + 110} Q${x + 36} ${y + 55} ${x} ${y} Z`, st);
  if (k === 'XOR') return P(`M${x + 16} ${y} Q${x + 86} ${y} ${x + 146} ${y + 55} Q${x + 86} ${y + 110} ${x + 16} ${y + 110} Q${x + 52} ${y + 55} ${x + 16} ${y} Z`, st) + P(`M${x} ${y} Q${x + 36} ${y + 55} ${x} ${y + 110}`);
  return P(`M${x} ${y} L${x + 100} ${y + 55} L${x} ${y + 110} Z`, st) + E(x + 110, y + 55, 10, 10, { f: '#fff', k: C.ink, w: 5 });
};
const bit = (x, y, v) => R(x, y, 50, 50, { f: v ? C.grn : '#fff', k: v ? C.grn : C.gray, w: 3, r: 10 }) + T(x + 25, y + 37, v, { a: 'middle', b: 1, s: 30, c: v ? '#fff' : C.ink });
const gatePic = (name, k, ins, out, rule, title, desc) => {
  const x = 520, y = 80, w = GW[k], two = ins.length === 2, ox = x + w;
  const inY = two ? [y + 28, y + 82] : [y + 55], inEnd = k === 'OR' ? x + 14 : k === 'XOR' ? x + 14 : x;
  svg(name, 1200, 330, title, desc, [
    ...inY.map((yy, i) => L(340, yy, inEnd, yy, { w: 5 }) + bit(270, yy - 25, ins[i]) + T(250, yy + 9, two ? 'AB'[i] : 'A', { a: 'end', b: 1, s: 30, c: C.mut })),
    gateBody(k, x, y, out), L(ox + (k === 'NOT' ? 20 : 0), y + 55, ox + 150, y + 55, { w: 5 }), bit(ox + 150, y + 30, out), T(ox + 225, y + 65, 'Q', { b: 1, s: 30, c: C.mut }),
    T(x + (k === 'NOT' ? 36 : w / 2), y + 66, k, { a: 'middle', b: 1, s: k === 'NOT' ? 22 : 28, c: C.navy }),
    chip(300, 240, 600, rule, out ? C.grn : C.mut),
  ].join(''));
};
gatePic('ch2-g-not', 'NOT', [1], 0, 'NOT: шығыс — кірістің кері мәні', 'NOT вентилі', 'NOT вентилінің бір кірісі бар: кіріс 1 болса, шығыс 0.');
gatePic('ch2-g-and', 'AND', [1, 1], 1, 'AND: екеуі де 1 болса ғана шығыс 1', 'AND вентилі', 'AND вентилінің екі кірісі 1 болғанда шығыс 1.');
gatePic('ch2-g-or', 'OR', [0, 1], 1, 'OR: біреуі 1 болса, шығыс 1', 'OR вентилі', 'OR вентилінің бір кірісі 1 болғанда шығыс 1.');
gatePic('ch2-g-xor', 'XOR', [1, 1], 0, 'XOR: кірістер бірдей болса, шығыс 0', 'XOR вентилі', 'XOR вентилінің екі кірісі де 1 болғанда шығыс 0, кірістер әртүрлі болғанда 1.');

// ---- 2.5 circuit (S1 AND S2) OR S3
{
  const a = 330, ay = 80, o = 700, oy = 150;
  svg('ch2-circuit', 1200, 420, '(S1 AND S2) OR S3 схемасы', 'S1 және S2 AND вентиліне кіреді, AND шығысы мен S3 OR вентиліне кіреді, OR шығысы шамды басқарады.', [
    chip(40, 85, 120, 'S1'), chip(40, 175, 120, 'S2', C.pur), chip(40, 305, 120, 'S3', C.org),
    L(160, 111, a + 0, ay + 28, { w: 5 }), L(160, 201, a, ay + 82, { w: 5 }),
    gateBody('AND', a, ay, 0), T(a + 55, ay + 66, 'AND', { a: 'middle', b: 1, s: 24, c: C.navy }),
    P(`M${a + 125} ${ay + 55} H520 V${oy + 28} H${o + 14}`, {}), T(560, ay + 40, 'S1 AND S2', { c: C.mut, s: 22 }),
    P(`M160 331 H600 V${oy + 82} H${o + 14}`, { k: C.org }),
    gateBody('OR', o, oy, 0), T(o + 62, oy + 66, 'OR', { a: 'middle', b: 1, s: 24, c: C.navy }),
    L(o + 130, oy + 55, 980, oy + 55, { w: 5 }), lamp(1060, oy + 55, false), T(1060, oy + 135, 'Шам', { a: 'middle', c: C.mut, s: 24 }),
    T(600, 395, 'Солдан оңға оқимыз: алдымен AND, содан кейін OR', { a: 'middle', c: C.mut, s: 25 }),
  ].join(''));
}

// ---- map: [lesson number, slide title, picture, alt, 1 = drop the text table/code the picture replaces]
export const IMG = [
  ['2.1', 'Екілік жүйе (binary)', 'ch2-binary', 'Екілік разрядтар 128, 64, 32, 16, 8, 4, 2, 1; 10101000 = 128 + 32 + 8 = 168', 1],
  ['2.1', 'Сегіздік және он алтылық жүйе', 'ch2-bases', '167 саны ондық, екілік, сегіздік және он алтылық жүйеде', 1],
  ['2.2', 'Қосудың төрт ережесі', 'ch2-carry', 'Екілік қосудың төрт жағдайы және 1 + 1 кезіндегі тасымал', 1],
  ['2.3', 'AND: «және»', 'ch2-sw-and', 'Тізбектей қосылған екі ажыратқыш: шам екеуі де жабық болғанда жанады', 0],
  ['2.3', 'OR: «немесе»', 'ch2-sw-or', 'Параллель қосылған екі ажыратқыш: біреуі жабық болса шам жанады', 0],
  ['2.3', 'NOT: «емес»', 'ch2-sw-not', 'Шамға параллель ажыратқыш: жабық болса шам өшеді, ашық болса жанады', 0],
  ['2.4', 'Кестеде неше жол болады?', 'ch2-rows', 'Жол саны 1, 2, 3, 4 айнымалыда 2, 4, 8, 16', 1],
  ['2.5', 'NOT: инвертор', 'ch2-g-not', 'NOT вентилінің белгісі: кіріс 1, шығыс 0', 0],
  ['2.5', 'AND: екеуі де 1', 'ch2-g-and', 'AND вентилінің белгісі: кірістер 1 және 1, шығыс 1', 0],
  ['2.5', 'OR: біреуі 1 жеткілікті', 'ch2-g-or', 'OR вентилінің белгісі: кірістер 0 және 1, шығыс 1', 0],
  ['2.5', 'XOR: кірістер әртүрлі', 'ch2-g-xor', 'XOR вентилінің белгісі: кірістер 1 және 1, шығыс 0', 0],
  ['2.5', 'Схеманы оқу: шам қашан жанады?', 'ch2-circuit', '(S1 AND S2) OR S3 схемасы: AND, содан кейін OR, шығыста шам', 1],
];

const q = s => { if (/\$sl\$/.test(s)) throw new Error('quote'); return `$sl$${s}$sl$`; };
writeFileSync('supabase/049_informatics_10_ch2_images.sql', `-- Migration 049: pictures (public/lec/ch2-*.svg) on the 10 сынып informatics chapter 2 slides of 046. Idempotent: sets slide.img/alt by lesson number and slide title.
-- GENERATED by scripts/gen-ch2-img.mjs. Deploy the SVGs (push to main) BEFORE applying this.

do $ch2img$
declare r record; n int := 0; m uuid;
begin
  select cm.id into m from public.cf_curr_modules cm join public.cf_curr_courses cc on cc.id = cm.course_id
   where cc.subject = 'Информатика' and cc.grade = 10 and cm.title like '2-тарау.%';
  if m is null then raise exception 'chapter 2 module not found'; end if;
  for r in select * from (values
${IMG.map(([pref, st, pic, alt, drop]) => `    (${q(pref)}, ${q(st)}, ${q('lec/' + pic + '.svg')}, ${q(alt)}, ${drop ? 'true' : 'false'})`).join(',\n')}
  ) as t(pref, stitle, img, alt, dropcode)
  loop
    update public.cf_lessons l set updated_at = now(), slides = (
      select jsonb_agg(case when s->>'title' = r.stitle then (case when r.dropcode then s - 'code' - 'lang' else s end) || jsonb_build_object('img', r.img, 'alt', r.alt) else s end order by o)
      from jsonb_array_elements(l.slides) with ordinality a(s, o))
    where l.id in (select lesson_id from public.cf_curr_lessons where module_id = m) and l.title like r.pref || ' %';
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'lesson % updated % rows', r.pref, n; end if;
  end loop;
end;
$ch2img$;
`);
console.log('ch2 pictures', IMG.length);
