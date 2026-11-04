// Writes public/lec/gd-*.svg: schematic illustrations for the Graphic Design lessons (original drawings, not screenshots of Figma).
// Also exports IMG, the map "lesson prefix -> slide title -> picture" that gen-gd.mjs applies. Run: node scripts/gen-gd-img.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const C = { bg: '#f8fafc', ink: '#1e293b', mut: '#475569', line: '#cbd5e1', blue: '#2563eb', navy: '#1e40af', org: '#f97316', grn: '#16a34a', red: '#dc2626', pur: '#7c3aed', yel: '#facc15', pink: '#ec4899', gray: '#94a3b8' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${o.s || 26}" font-weight="${o.b ? 700 : 400}" fill="${o.c || C.ink}" text-anchor="${o.a || 'start'}">${esc(s)}</text>`;
const R = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 0}" fill="${o.f || 'none'}" stroke="${o.k || 'none'}" stroke-width="${o.w || 0}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
const E = (cx, cy, rx, ry, o = {}) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${o.f || 'none'}" stroke="${o.k || 'none'}" stroke-width="${o.w || 0}"${o.op ? ` opacity="${o.op}"` : ''}/>`;
const L = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.k || C.mut}" stroke-width="${o.w || 3}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}${o.arrow ? ' marker-end="url(#ar)"' : ''}/>`;
const DEFS = `<defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.mut}"/></marker></defs>`;
const svg = (name, w, h, title, desc, body) => {
  mkdirSync('public/lec', { recursive: true });
  writeFileSync(`public/lec/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d"><title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>${DEFS}${R(0, 0, w, h, { f: C.bg, r: 24 })}${body}</svg>\n`);
};
const chip = (x, y, w, s, f = C.blue) => R(x, y, w, 52, { f, r: 12 }) + T(x + w / 2, y + 35, s, { c: '#fff', b: 1, a: 'middle', s: 25 });

// 1. Figma window layout
svg('gd-figma-layout', 1200, 420, 'Figma терезесінің құрылымы', 'Сол жақта Layers, ортада Frame бар жұмыс алаңы, оң жақта Design панелі, жоғарыда құралдар.', [
  R(40, 30, 1120, 360, { f: '#fff', k: C.line, w: 3, r: 16 }),
  R(40, 30, 1120, 62, { f: '#e2e8f0', r: 16 }), R(40, 70, 1120, 22, { f: '#e2e8f0' }),
  ...['V', 'F', 'R', 'O', 'T', 'P'].map((k, i) => E(100 + i * 70, 61, 24, 24, { f: '#fff', k: C.blue, w: 3 }) + T(100 + i * 70, 70, k, { a: 'middle', b: 1, c: C.blue, s: 24 })),
  T(560, 69, '← құралдар (перне)', { c: C.mut, s: 24 }),
  R(40, 92, 270, 298, { f: '#f8fafc', k: C.line, w: 2 }), T(60, 130, 'Layers', { b: 1, s: 28 }), T(60, 160, 'қабаттар тізімі', { c: C.mut, s: 22 }),
  R(60, 180, 230, 40, { f: '#dbeafe', r: 8 }), T(76, 208, '▢ Алғашқы_фрейм', { s: 23 }),
  T(92, 248, '▫ Мәтін', { s: 23 }), T(92, 284, '○ Фигура', { s: 23 }),
  R(330, 112, 530, 258, { f: '#eef2f7', r: 8 }),
  R(400, 150, 390, 180, { f: '#fff', k: C.blue, w: 3 }), T(400, 140, 'Frame (F)', { c: C.blue, b: 1, s: 24 }),
  T(595, 250, 'жұмыс алаңы', { a: 'middle', c: C.mut, s: 26 }),
  R(880, 92, 280, 298, { f: '#f8fafc', k: C.line, w: 2 }), T(900, 130, 'Design', { b: 1, s: 28 }), T(900, 160, 'өлшем, түс, контур', { c: C.mut, s: 22 }),
  T(900, 204, 'W   H', { s: 24 }), R(900, 214, 110, 34, { f: '#fff', k: C.line, w: 2, r: 6 }), R(1030, 214, 110, 34, { f: '#fff', k: C.line, w: 2, r: 6 }),
  T(900, 290, 'Fill', { s: 24 }), R(950, 270, 40, 28, { f: C.blue, r: 6 }),
  T(900, 340, 'Stroke', { s: 24 }), R(990, 320, 40, 28, { f: '#fff', k: C.ink, w: 3, r: 6 }),
].join(''));

// 2. Tools: robot from shapes
svg('gd-tools-robot', 1200, 420, 'Фигуралардан жиналған робот', 'Rectangle денені және аузды, Ellipse көзді, Text есімді жасайды.', [
  R(470, 120, 260, 200, { f: '#93c5fd', k: C.navy, w: 4, r: 20 }),
  E(540, 190, 28, 28, { f: '#fff', k: C.navy, w: 4 }), E(660, 190, 28, 28, { f: '#fff', k: C.navy, w: 4 }), E(540, 190, 10, 10, { f: C.ink }), E(660, 190, 10, 10, { f: C.ink }),
  R(550, 262, 100, 16, { f: C.org, r: 8 }),
  L(600, 120, 600, 90, { w: 4 }), E(600, 80, 12, 12, { f: C.red }),
  T(600, 372, 'ROBO', { a: 'middle', b: 1, s: 40 }),
  L(470, 220, 342, 150, { arrow: 1 }), chip(30, 120, 310, 'Rectangle (R) — дене'),
  L(540, 190, 342, 245, { arrow: 1 }), chip(30, 220, 310, 'Ellipse (O) — көз', C.pur),
  L(650, 270, 858, 225, { arrow: 1 }), chip(860, 195, 310, 'Rectangle — ауыз', C.org),
  L(660, 372, 858, 330, { arrow: 1 }), chip(860, 300, 310, 'Text (T) — есім', C.grn),
  chip(860, 90, 310, 'Ctrl+G — топтау', C.mut), L(730, 150, 858, 118, { arrow: 1 }),
].join(''));

// 3. Raster vs vector, same circle, zoomed
{
  const n = 12, cell = 22, ox = 130, oy = 90;
  let px = '';
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const d = Math.hypot(i + 0.5 - n / 2, j + 0.5 - n / 2);
    const f = d < n / 2 - 0.3 ? C.blue : d < n / 2 + 0.4 ? '#93c5fd' : null;
    if (f) px += R(ox + i * cell, oy + j * cell, cell, cell, { f });
  }
  svg('gd-raster-vector', 1200, 420, 'Растр және вектор үлкейткенде', 'Сол жақта дөңгелек пиксельдерден тұрады, шеті сатылы. Оң жақта вектор дөңгелектің шеті тегіс.', [
    T(260, 62, 'Растр (PNG, JPG)', { a: 'middle', b: 1, s: 32 }), px, T(260, 395, 'үлкейткенде пиксельдер көрінеді', { a: 'middle', c: C.red, s: 25 }),
    L(600, 70, 600, 380, { k: C.line, d: '10 8' }),
    T(900, 62, 'Вектор (SVG)', { a: 'middle', b: 1, s: 32 }), E(900, 220, 132, 132, { f: C.blue }), T(900, 395, 'шеті тегіс, анық қалады', { a: 'middle', c: C.grn, s: 25 }),
    E(1120, 116, 30, 30, { k: C.mut, w: 5 }), L(1142, 138, 1170, 168, { w: 7 }), T(1120, 124, '×8', { a: 'middle', b: 1, s: 22 }),
  ].join(''));
}

// 4. Pen tool: straight and curve points, handles
svg('gd-pen', 1200, 420, 'Pen tool: нүктелер мен тұтқалар', 'Бір рет басу түзу нүкте қояды, басып сүйреу қисық нүкте мен тұтқа жасайды.', [
  `<path d="M120 320 L330 320" stroke="${C.blue}" stroke-width="7" fill="none"/>`,
  `<path d="M330 320 C 470 320, 470 120, 640 120 S 860 320, 1040 200" stroke="${C.blue}" stroke-width="7" fill="none"/>`,
  L(470, 320, 330, 320, { k: C.org, w: 3 }), L(640, 120, 470, 120, { k: C.org, w: 3 }), L(640, 120, 810, 120, { k: C.org, w: 3 }),
  E(470, 320, 10, 10, { f: C.org }), E(470, 120, 10, 10, { f: C.org }), E(810, 120, 10, 10, { f: C.org }),
  R(106, 306, 28, 28, { f: '#fff', k: C.ink, w: 4 }), R(316, 306, 28, 28, { f: '#fff', k: C.ink, w: 4 }), R(626, 106, 28, 28, { f: '#fff', k: C.ink, w: 4 }), R(1026, 186, 28, 28, { f: '#fff', k: C.ink, w: 4 }),
  chip(30, 356, 360, 'бір рет бас → түзу нүкте'), chip(405, 356, 390, 'басып сүйре → қисық нүкте', C.pur),
  chip(810, 356, 370, 'жабу: бірінші нүктеге бас', C.grn),
  T(660, 70, '● тұтқа (handle) қисықтың иілуін басқарады', { a: 'middle', c: C.org, b: 1, s: 26 }),
].join(''));

// 5. Boolean operations
{
  const op = (cx, name, body) => `<g transform="translate(${cx} 0)">${body}${T(0, 372, name, { a: 'middle', b: 1, s: 28 })}</g>`;
  const A = (f) => E(-40, 190, 90, 90, { f }), B = (f) => E(40, 190, 90, 90, { f });
  const m = (id, inner) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="-200" y="60" width="400" height="260"><rect x="-200" y="60" width="400" height="260" fill="#fff"/>${inner}</mask>`;
  svg('gd-boolean', 1200, 420, 'Boolean амалдары', 'Union біріктіреді, Subtract үстіңгі фигураны алып тастайды, Intersect қиылысты қалдырады, Exclude қиылыспағанды қалдырады.', [
    `<defs>${''}</defs>`,
    op(165, 'Union', A(C.blue) + B(C.blue)),
    op(465, 'Subtract', `<defs>${m('sb', E(40, 190, 90, 90, { f: '#000' }))}</defs><g mask="url(#sb)">${A(C.blue)}</g>${E(40, 190, 90, 90, { k: C.gray, w: 3 }).replace('stroke-width="3"', 'stroke-width="3" stroke-dasharray="8 6"')}`),
    op(765, 'Intersect', `<defs><clipPath id="ci"><ellipse cx="40" cy="190" rx="90" ry="90"/></clipPath></defs><g clip-path="url(#ci)">${A(C.blue)}</g>${E(-40, 190, 90, 90, { k: C.gray, w: 3 })}${E(40, 190, 90, 90, { k: C.gray, w: 3 })}`),
    op(1050, 'Exclude', `<defs>${m('xa', E(40, 190, 90, 90, { f: '#000' }))}${m('xb', E(-40, 190, 90, 90, { f: '#000' }))}</defs><g mask="url(#xa)">${A(C.blue)}</g><g mask="url(#xb)">${B(C.blue)}</g>`),
    T(600, 50, 'Екі фигураны таңда → жоғарғы тақтада Boolean түймесі', { a: 'middle', c: C.mut, s: 26 }),
  ].join(''));
}

// 6. Prompt formula
{
  const parts = [['Кім / не', 'қызыл мысық', C.blue], ['Не істейді', 'қуанып тұр, көзілдірік киген', C.pur], ['Стиль', 'flat стикер, қалың контур', C.org], ['Түс', '3 түс', C.grn], ['Фон', 'ақ фон', C.pink]];
  let b = '';
  parts.forEach(([h, ex, c], i) => { const x = 40 + i * 226; b += R(x, 80, 206, 56, { f: c, r: 12 }) + T(x + 103, 117, h, { a: 'middle', c: '#fff', b: 1, s: 26 }) + R(x, 150, 206, 118, { f: '#fff', k: c, w: 3, r: 12 }); ex.split(', ').forEach((ln, k) => { b += T(x + 103, 192 + k * 34, ln, { a: 'middle', s: 24 }); }); if (i < 4) b += T(x + 216, 118, '+', { a: 'middle', b: 1, s: 34, c: C.mut }); });
  svg('gd-prompt', 1200, 420, 'Жақсы prompt формуласы', 'Prompt бес бөліктен тұрады: кім, не істейді, стиль, түс, фон.', b +
    T(600, 52, 'Prompt = 5 бөлік', { a: 'middle', b: 1, s: 32 }) +
    L(600, 280, 600, 318, { arrow: 1 }) + R(60, 322, 1080, 70, { f: '#ecfdf5', k: C.grn, w: 3, r: 14 }) +
    T(600, 366, '«Көзілдірік киген қуанышты қызыл мысық, flat стикер стилі, қалың контур, 3 түс, ақ фон»', { a: 'middle', s: 25 }));
}

// 7. Trace method (kalka)
{
  const cat = (x, y, s, o) => `<g transform="translate(${x} ${y}) scale(${s})">${E(0, 0, 70, 62, o.body)}<path d="M-56 -36 L-48 -86 L-14 -52z M56 -36 L48 -86 L14 -52z" ${o.ear}/>${E(-24, -8, 9, 9, o.eye)}${E(24, -8, 9, 9, o.eye)}<path d="M-16 20 Q0 36 16 20" ${o.mouth}/></g>`;
  const ras = { body: { f: '#bfdbfe', op: 0.9 }, ear: 'fill="#bfdbfe"', eye: { f: '#64748b' }, mouth: 'fill="none" stroke="#64748b" stroke-width="5"' };
  const vec = { body: { f: C.org, k: '#fff', w: 8 }, ear: `fill="${C.org}" stroke="#fff" stroke-width="8" stroke-linejoin="round"`, eye: { f: C.ink }, mouth: `fill="none" stroke="${C.ink}" stroke-width="5"` };
  const out = { body: { k: C.red, w: 4 }, ear: `fill="none" stroke="${C.red}" stroke-width="4"`, eye: { f: C.red }, mouth: `fill="none" stroke="${C.red}" stroke-width="4"` };
  svg('gd-trace', 1200, 420, 'Растрды векторлау: калька әдісі', 'Үш қадам: растрды 50% мөлдір етіп құлыптау, үстінен Pen-мен контур сызу, растрды жасырып вектор алу.', [
    cat(200, 190, 1.35, ras), T(200, 340, 'растр', { a: 'middle', b: 1, s: 28 }), T(200, 376, 'Opacity 50% + Lock', { a: 'middle', c: C.mut, s: 24 }),
    T(200, 52, '1', { a: 'middle', b: 1, s: 40, c: C.blue }), L(330, 190, 410, 190, { arrow: 1 }),
    cat(600, 190, 1.35, ras), cat(600, 190, 1.35, out), T(600, 340, 'Pen-мен контур', { a: 'middle', b: 1, s: 28 }), T(600, 376, 'аз нүкте, әр бөлік бөлек пішін', { a: 'middle', c: C.mut, s: 24 }),
    T(600, 52, '2', { a: 'middle', b: 1, s: 40, c: C.blue }), L(730, 190, 810, 190, { arrow: 1 }),
    cat(1000, 190, 1.35, vec), T(1000, 340, 'вектор', { a: 'middle', b: 1, s: 28 }), T(1000, 376, 'растрды жасырдық, түстер бөлек', { a: 'middle', c: C.mut, s: 24 }),
    T(1000, 52, '3', { a: 'middle', b: 1, s: 40, c: C.blue }),
  ].join(''));
}

// 8. Sticker pack grid with white stroke
{
  const face = (cx, cy, mood, col) => {
    const mouth = { smile: `<path d="M-22 18 Q0 40 22 18" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`, sad: `<path d="M-22 30 Q0 8 22 30" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`, wave: `<path d="M-22 18 Q0 40 22 18" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/><circle cx="74" cy="-40" r="20" fill="${col}" stroke="#fff" stroke-width="8"/>`, thanks: `<path d="M-16 20 H16 Q16 40 0 40 Q-16 40 -16 20z" fill="${C.red}"/>` }[mood];
    return `<g transform="translate(${cx} ${cy})"><circle r="62" fill="${col}" stroke="#fff" stroke-width="12"/><circle cx="-22" cy="-10" r="8" fill="${C.ink}"/><circle cx="22" cy="-10" r="8" fill="${C.ink}"/>${mouth}</g>`;
  };
  svg('gd-sticker-grid', 1200, 420, 'Стикерпак торы', '2 по 2 тор: төрт стикердің өлшемі мен аралығы бірдей, әрқайсысында ақ шет бар.', [
    R(120, 40, 440, 340, { f: '#e2e8f0', r: 16 }),
    face(235, 135, 'smile', C.yel), face(445, 135, 'wave', C.yel), face(235, 290, 'sad', C.yel), face(445, 290, 'thanks', C.yel),
    L(120, 24, 560, 24, { k: C.mut, w: 3 }), T(340, 20, 'Frame', { a: 'middle', c: C.mut, s: 22 }),
    chip(620, 60, 520, '1  Бір өлшем: 512 × 512 px', C.blue), chip(620, 130, 520, '2  Бірдей аралық: gap 32', C.pur),
    chip(620, 200, 520, '3  Ақ шет: Stroke Outside, 6–8', C.org), chip(620, 270, 520, '4  Export: SVG және PNG 2x', C.grn),
    T(880, 360, 'атаулары: стикер_1 … стикер_4', { a: 'middle', c: C.mut, s: 24 }),
  ].join(''));
}

// 9. UX vs UI
svg('gd-ux-ui', 1200, 420, 'UI және UX', 'UI экранның көрінісі, UX қолданудың ыңғайлылығы: мақсатқа аз қадаммен жету.', [
  R(40, 40, 520, 340, { f: '#fff', k: C.blue, w: 4, r: 18 }), T(300, 90, 'UI — қалай көрінеді', { a: 'middle', b: 1, s: 32, c: C.blue }),
  R(80, 120, 440, 40, { f: '#dbeafe', r: 8 }), R(80, 180, 200, 100, { f: C.blue, r: 14 }), R(300, 180, 220, 100, { f: C.org, r: 14 }),
  chip(130, 292, 340, 'Түс · қаріп · батырма', C.blue), T(300, 368, 'сыртқы көрінісі', { a: 'middle', c: C.mut, s: 24 }),
  R(640, 40, 520, 340, { f: '#fff', k: C.grn, w: 4, r: 18 }), T(900, 90, 'UX — қалай жұмыс істейді', { a: 'middle', b: 1, s: 32, c: C.grn }),
  E(700, 175, 24, 24, { f: C.grn }), T(700, 183, '▶', { a: 'middle', c: '#fff', s: 22 }), T(740, 183, 'мақсат', { s: 24 }),
  R(690, 220, 70, 46, { f: '#dcfce7', k: C.grn, w: 3, r: 8 }), T(725, 252, '1', { a: 'middle', b: 1, s: 26 }), L(762, 243, 800, 243, { arrow: 1 }),
  R(802, 220, 70, 46, { f: '#dcfce7', k: C.grn, w: 3, r: 8 }), T(837, 252, '2', { a: 'middle', b: 1, s: 26 }), L(874, 243, 912, 243, { arrow: 1 }),
  R(914, 220, 70, 46, { f: '#dcfce7', k: C.grn, w: 3, r: 8 }), T(949, 252, '3', { a: 'middle', b: 1, s: 26 }), T(1010, 252, '✓ нәтиже', { s: 24, c: C.grn, b: 1 }),
  chip(700, 292, 400, 'Қиналмай мақсатқа жету', C.grn), T(900, 368, 'қадам аз, түсінікті', { a: 'middle', c: C.mut, s: 24 }),
].join(''));

// 10. Card anatomy (9.2)
svg('gd-card-anatomy', 1200, 420, 'Карточка мен батырма құрылымы', 'Карточкада сурет орны, тақырып, екі жол мәтін және батырма бар. Батырма 160 на 48, радиус 12.', [
  R(60, 40, 340, 340, { f: '#fff', k: C.line, w: 3, r: 24 }),
  R(80, 60, 300, 130, { f: '#e2e8f0', r: 14 }), T(230, 133, 'сурет', { a: 'middle', c: C.mut, s: 26 }),
  R(80, 205, 180, 24, { f: C.ink, r: 6 }), R(80, 244, 300, 14, { f: C.gray, r: 6 }), R(80, 268, 240, 14, { f: C.gray, r: 6 }),
  R(80, 308, 160, 48, { f: C.blue, r: 12 }), T(160, 340, 'Батырма', { a: 'middle', c: '#fff', b: 1, s: 24 }),
  L(400, 130, 480, 130, { arrow: 1 }), T(490, 138, 'сурет орны', { s: 26 }),
  L(260, 216, 480, 200, { arrow: 1 }), T(490, 208, 'тақырып', { s: 26 }),
  L(380, 270, 480, 270, { arrow: 1 }), T(490, 278, '2 жол мәтін', { s: 26 }),
  L(240, 332, 480, 332, { arrow: 1 }), T(490, 340, 'батырма: 160 × 48, радиус 12', { s: 26 }),
  chip(800, 110, 340, 'Auto layout: Shift+A', C.pur), chip(800, 180, 340, 'Corner radius: 12', C.org), chip(800, 250, 340, 'Қабаттарға ат бер', C.grn),
].join(''));

// 11. Auto layout: padding, gap, direction
svg('gd-autolayout', 1200, 420, 'Auto layout: padding, gap, direction', 'Тік Auto layout: ішкі шет padding 16, элементтер арасы gap 12.', [
  R(120, 40, 460, 340, { f: '#fff', k: C.pur, w: 4, r: 14, d: '10 6' }),
  R(150, 70, 400, 80, { f: '#ddd6fe', r: 10 }), T(350, 118, 'Элемент 1', { a: 'middle', s: 26 }),
  R(150, 162, 400, 80, { f: '#ddd6fe', r: 10 }), T(350, 210, 'Элемент 2', { a: 'middle', s: 26 }),
  R(150, 254, 400, 80, { f: '#ddd6fe', r: 10 }), T(350, 302, 'Элемент 3', { a: 'middle', s: 26 }),
  R(120, 150, 30, 40, { f: C.org, op: 0.8 }), R(150, 40, 100, 30, { f: C.org, op: 0.8 }), R(300, 150, 100, 12, { f: C.red, op: 0.9 }),
  chip(640, 50, 480, 'padding — ішкі шет (16)', C.org),
  chip(640, 130, 480, 'gap — элементтер арасы (12)', C.red),
  chip(640, 210, 480, 'direction — тік немесе көлденең ↓ →', C.pur),
  chip(640, 290, 480, 'Shift+A — қосу', C.blue),
].join(''));

// 12. Resizing: Hug / Fill / Fixed
{
  const row = (y, name, color, short, long) => R(40, y, 190, 100, { f: color, r: 14 }) + T(135, y + 60, name, { a: 'middle', c: '#fff', b: 1, s: 28 }) +
    R(250, y, 440, 100, { f: '#fff', k: C.line, w: 2, r: 10, d: '8 6' }) + short + R(710, y, 440, 100, { f: '#fff', k: C.line, w: 2, r: 10, d: '8 6' }) + long;
  svg('gd-resizing', 1200, 420, 'Hug, Fill, Fixed', 'Мәтін ұзарғанда Hug қорап өседі, Fill алаңды толтырады, Fixed өлшемін сақтайды.', [
    T(470, 36, 'мәтін қысқа', { a: 'middle', c: C.mut, s: 25 }), T(930, 36, 'мәтін ұзын', { a: 'middle', c: C.mut, s: 25 }),
    row(60, 'Hug', C.blue,
      R(270, 80, 130, 60, { f: '#bfdbfe', r: 10 }) + T(335, 118, 'Сәлем', { a: 'middle', s: 24 }),
      R(730, 80, 360, 60, { f: '#bfdbfe', r: 10 }) + T(910, 118, 'Сәлем, бүгінгі сабаққа', { a: 'middle', s: 24 })),
    row(180, 'Fill', C.grn,
      R(260, 190, 420, 80, { f: '#bbf7d0', r: 10 }) + T(470, 238, 'Сәлем', { a: 'middle', s: 24 }),
      R(720, 190, 420, 80, { f: '#bbf7d0', r: 10 }) + T(930, 238, 'Сәлем, бүгінгі сабаққа', { a: 'middle', s: 24 })),
    row(300, 'Fixed', C.org,
      R(270, 320, 220, 60, { f: '#fed7aa', r: 10 }) + T(380, 358, 'Сәлем', { a: 'middle', s: 24 }),
      R(730, 320, 220, 60, { f: '#fed7aa', r: 10 }) + T(830, 358, 'Сәлем, бүгінгі сабаққа', { a: 'start', s: 24, c: C.red }).replace('x="830"', 'x="738"').replace('font-size="24"', 'font-size="20"') + T(1050, 358, '← сыймайды', { a: 'middle', c: C.red, s: 22 })),
  ].join(''));
}

// 13. Responsive: phone and desktop
svg('gd-responsive', 1200, 420, 'Телефон және компьютер макеті', 'Телефонда карточкалар бір бағанда, компьютерде үш бағанда орналасады.', [
  R(60, 40, 190, 340, { f: '#fff', k: C.ink, w: 5, r: 26 }),
  R(78, 66, 154, 28, { f: C.blue, r: 6 }), R(78, 106, 154, 72, { f: '#dbeafe', r: 8 }), R(78, 188, 154, 72, { f: '#dbeafe', r: 8 }), R(78, 270, 154, 72, { f: '#dbeafe', r: 8 }),
  T(155, 400, '390 px · 1 баған', { a: 'middle', b: 1, s: 24 }),
  R(330, 70, 810, 290, { f: '#fff', k: C.ink, w: 5, r: 14 }), R(330, 70, 810, 30, { f: '#e2e8f0', r: 14 }),
  R(350, 116, 770, 36, { f: C.blue, r: 6 }), R(350, 170, 245, 160, { f: '#dbeafe', r: 8 }), R(612, 170, 245, 160, { f: '#dbeafe', r: 8 }), R(875, 170, 245, 160, { f: '#dbeafe', r: 8 }),
  T(735, 400, '1440 px · 3 баған', { a: 'middle', b: 1, s: 24 }),
  L(270, 210, 322, 210, { arrow: 1, k: C.org, w: 5 }), T(296, 190, 'Fill', { a: 'middle', c: C.org, b: 1, s: 22 }),
].join(''));

// 14. Component + variants
svg('gd-variants', 1200, 420, 'Component және Variants', 'Бір component set ішінде батырманың үш жағдайы: Default, Hover, Disabled, олардан instance-тар жасалады.', [
  R(40, 30, 1120, 190, { f: '#fff', k: C.pur, w: 4, r: 16, d: '10 6' }), T(70, 70, 'Component set · property State', { b: 1, s: 28, c: C.pur }),
  R(80, 100, 270, 80, { f: C.blue, r: 14 }), T(215, 150, 'Default', { a: 'middle', c: '#fff', b: 1, s: 30 }),
  R(465, 100, 270, 80, { f: C.navy, r: 14 }), T(600, 150, 'Hover', { a: 'middle', c: '#fff', b: 1, s: 30 }),
  R(850, 100, 270, 80, { f: '#cbd5e1', r: 14 }), T(985, 150, 'Disabled', { a: 'middle', c: '#64748b', b: 1, s: 30 }),
  L(215, 222, 215, 270, { arrow: 1 }), L(600, 222, 600, 270, { arrow: 1 }), L(985, 222, 985, 270, { arrow: 1 }),
  R(115, 276, 200, 56, { f: C.blue, r: 12 }), T(215, 314, 'Instance', { a: 'middle', c: '#fff', b: 1, s: 26 }),
  R(500, 276, 200, 56, { f: C.blue, r: 12 }), T(600, 314, 'Instance', { a: 'middle', c: '#fff', b: 1, s: 26 }),
  R(885, 276, 200, 56, { f: C.navy, r: 12 }), T(985, 314, 'Instance', { a: 'middle', c: '#fff', b: 1, s: 26 }),
  T(600, 385, 'Main component өзгерсе — барлық instance өзгереді · Ctrl+Alt+K', { a: 'middle', c: C.mut, s: 26 }),
].join(''));

// 15. UX problem card
{
  const rows = [['Экран', 'скриншот', C.blue], ['Мәселе', 'нақты не қиын', C.red], ['Ереже', 'қай эвристика бұзылған', C.pur], ['Әсер', 'қолданушыға не болады', C.org], ['Маңыздылық', '1 · 2 · 3', C.grn], ['Ұсыныс', 'қалай түзетуге болады', C.pink]];
  let b = R(150, 30, 900, 360, { f: '#fff', k: C.line, w: 3, r: 18 });
  rows.forEach(([h, ex, c], i) => { const y = 50 + i * 56; b += R(170, y, 220, 44, { f: c, r: 10 }) + T(280, y + 31, h, { a: 'middle', c: '#fff', b: 1, s: 25 }) + R(400, y, 630, 44, { f: '#f1f5f9', r: 10 }) + T(420, y + 31, ex, { c: C.mut, s: 25 }); });
  svg('gd-ux-card', 1200, 420, 'Мәселе карточкасы', 'Карточкада экран, мәселе, ереже, әсер, маңыздылық және ұсыныс болады.', b);
}

// 16. Before / after
svg('gd-before-after', 1200, 420, 'Дейін және кейін', 'Сол жақта шатасқан, оқуға қиын экран, оң жақта таза, түсінікті экран.', [
  T(290, 40, 'Дейін', { a: 'middle', b: 1, s: 32, c: C.red }), T(910, 40, 'Кейін', { a: 'middle', b: 1, s: 32, c: C.grn }),
  R(110, 60, 360, 300, { f: '#fff', k: C.red, w: 4, r: 18 }),
  ...[0, 1, 2, 3, 4, 5].map(i => R(130 + (i % 3) * 112, 80 + Math.floor(i / 3) * 56, 104, 46, { f: ['#fde68a', '#fecaca', '#bbf7d0', '#fbcfe8', '#c7d2fe', '#fed7aa'][i], r: 6 })),
  T(130, 230, 'мәтін оқылмайды, тым ұсақ ...', { s: 17, c: '#d1d5db' }), T(130, 254, 'батырма қайда?', { s: 16, c: '#e5e7eb' }),
  R(300, 310, 60, 24, { f: '#e5e7eb', r: 6 }),
  L(500, 225, 700, 225, { arrow: 1, w: 6 }),
  R(730, 60, 360, 300, { f: '#fff', k: C.grn, w: 4, r: 18 }),
  R(760, 90, 300, 30, { f: C.ink, r: 6 }), R(760, 140, 300, 14, { f: C.gray, r: 6 }), R(760, 164, 240, 14, { f: C.gray, r: 6 }),
  R(760, 200, 140, 90, { f: '#dbeafe', r: 12 }), R(920, 200, 140, 90, { f: '#dbeafe', r: 12 }),
  R(760, 304, 300, 38, { f: C.blue, r: 12 }), T(910, 331, 'Негізгі әрекет', { a: 'middle', c: '#fff', b: 1, s: 22 }),
  T(910, 396, 'контраст ≥ 4.5 : 1, бір басты батырма', { a: 'middle', c: C.mut, s: 22 }),
].join(''));

// ---- slide -> picture map used by gen-gd.mjs and by the prod UPDATE (048) ----
export const IMG = [
  ['7.1', 'Figma қалай құрылған', 'gd-figma-layout', 'Figma терезесі: сол жақта Layers, ортада Frame, оң жақта Design панелі', 1],
  ['7.2', 'Негізгі құралдар', 'gd-tools-robot', 'Rectangle, Ellipse және Text құралдарынан жиналған робот', 0],
  ['7.3', 'Вектор (vector)', 'gd-raster-vector', 'Растр дөңгелегінің шеті сатылы, вектор дөңгелегінің шеті тегіс', 0],
  ['7.4', 'Pen tool (P)', 'gd-pen', 'Pen tool: түзу және қисық нүктелер, тұтқалар', 0],
  ['7.4', 'Boolean амалдары', 'gd-boolean', 'Union, Subtract, Intersect, Exclude нәтижелері', 0],
  ['7.5', 'Жақсы prompt', 'gd-prompt', 'Prompt-тың бес бөлігі: кім, не істейді, стиль, түс, фон', 0],
  ['7.6', 'Калька әдісі', 'gd-trace', 'Растр 50% мөлдір, үстінен контур, соңында вектор', 0],
  ['7.7', 'Жинау және Export', 'gd-sticker-grid', 'Төрт стикер 2 по 2 торда, ақ шетімен', 0],
  ['9.1', 'UX және UI', 'gd-ux-ui', 'UI экранның көрінісі, UX мақсатқа аз қадаммен жету', 0],
  ['9.2', 'Тапсырма шарты', 'gd-card-anatomy', 'Карточка құрылымы: сурет, тақырып, мәтін, батырма', 1],
  ['9.3', 'Auto layout параметрлері', 'gd-autolayout', 'Auto layout: padding, gap, direction', 0],
  ['9.3', 'Resizing: Hug, Fill, Fixed', 'gd-resizing', 'Мәтін ұзарғанда Hug, Fill және Fixed қалай өзгереді', 0],
  ['9.4', 'Екі өлшем', 'gd-responsive', 'Телефон 390 px бір баған, компьютер 1440 px үш баған', 1],
  ['9.5', 'Variants', 'gd-variants', 'Component set: Default, Hover, Disabled және instance-тар', 0],
  ['9.6', 'Мәселе карточкасы', 'gd-ux-card', 'Мәселе карточкасының алты бөлігі', 0],
  ['9.7', 'Қайта дизайндау жолы', 'gd-before-after', 'Шатасқан экран мен таза экранды салыстыру', 0],
]; // [lesson prefix, slide title, picture, alt, 1 = drop the ASCII `code` the picture replaces]
console.log('pictures', IMG.length);
