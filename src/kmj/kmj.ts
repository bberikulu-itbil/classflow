// ҚМЖ (short-term lesson plan) data: filled from the lecture's plan and slides, the КТП slot and the course; saved in cf_kmj (077);
// downloaded as a Word file built here (plain WordprocessingML zipped with fflate, no template needed).
import { strToU8, zipSync } from 'fflate';
import { sb } from '../config';
import { STAGES, TEMPLATE_45 } from '../lessons/stages';

export interface Stage { name: string; min: number; teacher: string; student: string; assess: string; res: string }
export interface Kmj {
  section: string; teacher: string; date: string; cls: string; topic: string; goals: string; aim: string;
  stages: Stage[]; diff: string; assess: string; health: string; reflection: string;
}

const TEACHER_DO: Record<string, string> = {
  warmup: 'Өткен тақырып бойынша сұрақ қояды', explain: 'Жаңа тақырыпты түсіндіреді, мысал көрсетеді', together: 'Үлгі тапсырманы оқушылармен бірге орындайды',
  example: 'Үлгіні көрсетіп, бағыт береді', practice: 'Тапсырма ашады, орындалуын бақылайды', check: 'Тест ашады, нәтижені талдайды', reflect: 'Рефлексия жүргізеді',
};
const ASSESS: Record<string, string> = { practice: 'Автотексеру, балл', check: 'Тест нәтижесі', together: 'Ауызша кері байланыс', example: 'Ауызша кері байланыс', warmup: 'Ауызша', explain: 'Сұрақ-жауап', reflect: 'Өзін-өзі бағалау' };
const name = (k: string) => STAGES.find(s => s.k === k)?.kk || k;

/** Slide numbers of each stage, as "Слайд 2–5". */
function slidesOf(slides: any[], k: string) {
  const at = slides.map((s, i) => (s?.stage === k ? i + 1 : 0)).filter(Boolean);
  return !at.length ? '' : at.length === 1 ? `Слайд ${at[0]}` : `Слайд ${at[0]}–${at[at.length - 1]}`;
}

export function autofill(p: { topic: string; section: string; teacher: string; cls: string; date: string; plan: any; slides: any[] }): Kmj {
  const plan = p.plan && typeof p.plan === 'object' ? p.plan : {};
  const st: { k: string; min: number; do: string; t?: string; ev?: string }[] = Array.isArray(plan.stages) && plan.stages.length ? plan.stages : TEMPLATE_45;
  const obj = Array.isArray(plan.objectives) ? plan.objectives : [], codes: string[] = Array.isArray(plan.codes) ? plan.codes : [];
  const goals = obj.map((o: string, i: number) => (codes[i] ? `${codes[i]} ${o}` : o)).join('\n');
  return {
    section: p.section, teacher: p.teacher, date: p.date, cls: p.cls, topic: p.topic, goals,
    aim: plan.aim ? String(plan.aim) : plan.summary ? String(plan.summary) : '',
    stages: st.map(s => ({ name: name(s.k), min: Number(s.min) || 0, teacher: s.t || TEACHER_DO[s.k] || '', student: String(s.do || ''), assess: s.ev || ASSESS[s.k] || '', res: slidesOf(p.slides, s.k) || 'ClassFlow' })),
    diff: plan.diff || 'L1–L3 деңгейлі тапсырмалар: әр оқушы өз деңгейінен бастайды', assess: plan.assess || 'Тапсырмалар критерийлері бойынша, балл журналға түседі',
    health: plan.health || 'Сергіту сәті, компьютермен жұмыс қауіпсіздігі ережесі', reflection: '',
  };
}

export async function loadKmj(lessonId: string): Promise<{ data: Kmj; ready: boolean } | null> {
  const { data, error } = await sb.from('cf_kmj').select('data,ready').eq('lesson_id', lessonId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { data: data.data as Kmj, ready: !!data.ready } : null;
}
export async function saveKmj(ownerId: string, lessonId: string, data: Kmj, ready: boolean) {
  const { error } = await sb.from('cf_kmj').upsert({ owner_id: ownerId, lesson_id: lessonId, data, ready, updated_at: new Date().toISOString() }, { onConflict: 'owner_id,lesson_id' });
  if (error) throw new Error(error.message);
}

// ---- Word (.docx) ----
const x = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const run = (t: string, b = false) => t.split('\n').map((line, i) => `${i ? '<w:r><w:br/></w:r>' : ''}<w:r><w:rPr>${b ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${x(line)}</w:t></w:r>`).join('');
const par = (t: string, o: { b?: boolean; center?: boolean } = {}) => `<w:p><w:pPr>${o.center ? '<w:jc w:val="center"/>' : ''}<w:spacing w:after="60"/></w:pPr>${run(t, o.b)}</w:p>`;
const cell = (t: string, w: number, b = false, span = 1) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}</w:tcPr>${par(t, { b })}</w:tc>`;
const table = (widths: number[], rows: string[]) => `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="single" w:sz="4" w:color="000000"/>`).join('')}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
const tr = (cells: string) => `<w:tr>${cells}</w:tr>`;

export function docx(k: Kmj): Uint8Array {
  const W = 9900, A = 3300, B = W - A;
  const head = table([A, B], [
    ['Бөлім:', k.section], ['Педагогтің аты-жөні:', k.teacher], ['Күні:', k.date], ['Сынып:', `${k.cls}    Қатысқандар саны:      Қатыспағандар саны:`],
    ['Сабақтың тақырыбы:', k.topic], ['Оқу бағдарламасына сәйкес оқу мақсаттары:', k.goals], ['Сабақтың мақсаты:', k.aim],
  ].map(([a, b]) => tr(cell(a, A, true) + cell(b, B))));
  const sw = [1700, 2300, 2300, 1700, 1900];
  const flow = table(sw, [
    tr(['Сабақтың кезеңі / уақыт', 'Педагогтің әрекеті', 'Оқушының әрекеті', 'Бағалау', 'Ресурстар'].map((t, i) => cell(t, sw[i], true)).join('')),
    ...k.stages.map(s => tr(cell(`${s.name}\n${s.min} мин`, sw[0], false) + cell(s.teacher, sw[1]) + cell(s.student, sw[2]) + cell(s.assess, sw[3]) + cell(s.res, sw[4]))),
  ]);
  const tw = [3300, 3300, 3300];
  const tail = table(tw, [tr(['Саралау', 'Бағалау', 'Денсаулық және қауіпсіздік'].map((t, i) => cell(t, tw[i], true)).join('')), tr(cell(k.diff, 3300) + cell(k.assess, 3300) + cell(k.health, 3300)),
    tr(cell('Рефлексия', 9900, true, 3)), tr(cell(k.reflection || ' ', 9900, false, 3))]);
  const body = par('Қысқа мерзімді жоспар', { b: true, center: true }) + head + par('') + par('Сабақтың барысы', { b: true, center: true }) + flow + par('') + tail;
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="22"/><w:lang w:val="kk-KZ"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`;
  return zipSync({
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    'word/_rels/document.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'word/document.xml': strToU8(doc), 'word/styles.xml': strToU8(styles),
  });
}

export function download(bytes: Uint8Array, file: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
  const a = document.createElement('a'); a.href = url; a.download = file; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
