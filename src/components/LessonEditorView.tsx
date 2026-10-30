import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Download, FileText, Lightbulb, Pencil, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { sb, DEMO } from '../config';
import { Button, Card, ErrorBox, Field, inputCls } from '../ui';
import { TopBar } from './TopBar';
import { ai } from './AiPanel';
import * as curriculum from '../curriculum/store';
import { isPdf, isPptx, presentationSource, type PresentationSlide, type PresentationVariant } from '../lessons/presentationImport';
import { uploadPresentationSource, uploadSlideImage } from '../lessons/media';
import { parsePptx, pptxSlideToCanvas } from '../lessons/pptx';
import { downloadPptx, exportClassFlowPptx } from '../lessons/pptxExport';
import { CanvasEditor } from '../lessons/CanvasEditor';

type Mode = 'manual' | 'ai';
type PageType = 'slide' | 'scroll' | 'interactive' | 'presentation';
type Slide = Record<string, any> & { pageType?: PageType; templateId?: string };
type Term = { term: string; definition: string };

const SAMPLE: Slide[] = [
  { type: 'title', pageType: 'slide', templateId: 'title', title: 'Жаңа дәріс', subtitle: '7-сынып · Информатика олимпиадасы' },
  { type: 'content', pageType: 'scroll', templateId: 'theory', title: 'Негізгі түсінік', bullets: ['Анықтаманы түсіндір', 'Қарапайым мысал келтір'], notes: '' },
  { type: 'code', pageType: 'slide', templateId: 'code-example', title: 'Код мысалы', prompt: 'Есептің шартын осында жазыңыз.', starter: '', hints: [], tests: [] },
  { type: 'task', pageType: 'interactive', templateId: 'code-task', title: 'Практика', prompt: 'Оқушы орындайтын тапсырма.', accept: [], points: 5 },
];

const TYPES = ['title', 'content', 'code', 'canvas', 'quiz', 'task', 'matching', 'flashcards', 'presentation'];
const typeLabel: Record<string, string> = {
  title: 'Кіріспе', content: 'Түсіндірме', code: 'Код', canvas: 'Өңделетін слайд', quiz: 'Тест', task: 'Тапсырма', matching: 'Сәйкестендіру', flashcards: 'Карточкалар', presentation: 'Түпнұсқа презентация',
};

const PAGE_TYPES: Array<{ id: PageType; label: string; description: string }> = [
  { id: 'slide', label: 'Слайд беті', description: '16:9 кадр, презентацияға арналған' },
  { id: 'scroll', label: 'Ұзын бет', description: 'Төмен сырғитын оқу беті' },
  { id: 'interactive', label: 'Интерактивті бет', description: 'Жауап, тапсырма және нәтиже' },
  { id: 'presentation', label: 'Түпнұсқа презентация', description: 'PPTX/PDF файлын өзгертпей ашу' },
];

const PAGE_TEMPLATES: Record<PageType, Array<{ id: string; label: string; description: string; blockType: string }>> = {
  slide: [
    { id: 'title', label: 'Титул', description: 'Тақырып және кіріспе', blockType: 'title' },
    { id: 'explanation', label: 'Түсіндіру', description: 'Негізгі ұғымды қысқа беру', blockType: 'content' },
    { id: 'code-example', label: 'Код мысалы', description: 'Код және қысқа түсіндірме', blockType: 'code' },
    { id: 'comparison', label: 'Салыстыру', description: 'Екі ұғымды қатар көрсету', blockType: 'content' },
    { id: 'canvas-blank', label: 'Бос кенеп', description: 'Мәтін мен суретті еркін орналастыру', blockType: 'canvas' },
    { id: 'canvas-two-col', label: 'Екі баған (кенеп)', description: 'Кенептегі екі бағанды макет', blockType: 'canvas' },
  ],
  scroll: [
    { id: 'theory', label: 'Теориялық түсіндіру', description: 'Мәтін, код және шағын бөлімдер', blockType: 'content' },
    { id: 'worked-example', label: 'Қадамдық мысал', description: 'Есепті шешу жолын көрсету', blockType: 'content' },
    { id: 'code-guide', label: 'Код + түсіндірме', description: 'Кодты секциялармен ашу', blockType: 'code' },
    { id: 'summary', label: 'Қорытынды', description: 'Негізгі ойлар мен келесі қадам', blockType: 'content' },
  ],
  interactive: [
    { id: 'single-choice', label: 'Бір жауап', description: 'Бір дұрыс нұсқаны таңдау', blockType: 'quiz' },
    { id: 'short-answer', label: 'Қысқа жауап', description: 'Оқушы жауапты өзі енгізеді', blockType: 'task' },
    { id: 'code-task', label: 'Код тапсырмасы', description: 'Кодты орындау және тексеру', blockType: 'code' },
    { id: 'reflection', label: 'Рефлексия', description: 'Сабақ соңындағы өзіндік бағалау', blockType: 'task' },
  ],
  presentation: [
    { id: 'presentation', label: 'Түпнұсқа файл', description: 'Презентацияны бастапқы күйінде ашу', blockType: 'presentation' },
  ],
};

function inferPageType(slide: Slide): PageType {
  if (slide.type === 'presentation' || slide.pageType === 'presentation') return 'presentation';
  if (slide.pageType === 'scroll' || slide.pageType === 'interactive' || slide.pageType === 'slide') return slide.pageType;
  if (['quiz', 'task', 'matching', 'flashcards'].includes(slide.type)) return 'interactive';
  return 'slide';
}

function inferTemplateId(slide: Slide, pageType: PageType): string {
  const templates = PAGE_TEMPLATES[pageType];
  if (slide.templateId && templates.some(template => template.id === slide.templateId)) return slide.templateId;
  if (pageType === 'slide' && slide.type === 'title') return 'title';
  if (pageType === 'slide' && slide.type === 'code') return 'code-example';
  if (pageType === 'interactive' && slide.type === 'code') return 'code-task';
  if (pageType === 'interactive' && slide.type === 'quiz') return 'single-choice';
  if (pageType === 'interactive' && slide.type === 'task') return 'short-answer';
  if (pageType === 'presentation' && slide.type === 'presentation') return 'presentation';
  return templates[0].id;
}

function normalizePage(slide: Slide): Slide {
  const pageType = inferPageType(slide);
  return { ...slide, pageType, templateId: inferTemplateId(slide, pageType) };
}

function pageFromTemplate(pageType: PageType, templateId: string): Slide {
  const template = PAGE_TEMPLATES[pageType].find(item => item.id === templateId) || PAGE_TEMPLATES[pageType][0];
  const base: Slide = { type: template.blockType, pageType, templateId: template.id, title: template.label };
  if (template.blockType === 'canvas') return { ...base, bg: '#FFFFFF', blocks: [] };
  if (template.blockType === 'title') return { ...base, subtitle: '' };
  if (template.blockType === 'content') return { ...base, bullets: [], notes: '' };
  if (template.blockType === 'code') return { ...base, prompt: '', starter: '', hints: [], tests: [] };
  if (template.blockType === 'quiz') return { ...base, prompt: '', options: [], answer: 0, points: 1 };
  if (template.blockType === 'presentation') return { ...base, sourceFormat: 'pptx', html: '', css: '' };
  return { ...base, prompt: '', accept: [], points: 1 };
}

function decodeRouteId(id: string) {
  const [lessonId, query] = id.split('?');
  const params = new URLSearchParams(query || '');
  return { lessonId, moduleId: params.get('module') || '' };
}

function parseSlides(value: unknown): Slide[] {
  return Array.isArray(value) ? value.filter(x => x && typeof x === 'object').map(x => normalizePage(x as Slide)) : [];
}

function parseTerms(value: unknown): Term[] {
  return Array.isArray(value) ? value.filter(x => x && typeof x.term === 'string').map(x => ({ term: String(x.term), definition: String(x.definition || '') })) : [];
}

function displaySlideText(slide: Slide) {
  const text = slide.sourceName ? `${slide.sourceName} · ${slide.title || `Слайд ${slide.slideNumber || ''}`}` : slide.prompt || slide.notes || (Array.isArray(slide.bullets) ? slide.bullets.join(' · ') : '') || slide.subtitle || '';
  return String(text).replace(/\s+/g, ' ').trim();
}

export function LessonEditorView({ id, me, onLogout }: { id: string; me: any; onLogout: () => void }) {
  const route = decodeRouteId(id);
  const isNew = route.lessonId === 'new';
  const [mode, setMode] = useState<Mode>('manual');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Информатика олимпиадасы');
  const [grade, setGrade] = useState('7');
  const [duration, setDuration] = useState('90 минут');
  const [summary, setSummary] = useState('');
  const [objectives, setObjectives] = useState('');
  const [slides, setSlides] = useState<Slide[]>(SAMPLE);
  const slidesRef = useRef<Slide[]>(SAMPLE);
  const [terms, setTerms] = useState<Term[]>([]);
  const [rawSlides, setRawSlides] = useState('');
  const [rawTerms, setRawTerms] = useState('');
  const [rawOpen, setRawOpen] = useState(false);
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const [newPageType, setNewPageType] = useState<PageType>('slide');
  const [newPageTemplate, setNewPageTemplate] = useState('title');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiObjective, setAiObjective] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [presentationBusy, setPresentationBusy] = useState(false);
  const [presentationMeta, setPresentationMeta] = useState<any>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [canvasEditorIndex, setCanvasEditorIndex] = useState<number | null>(null);
  const [presentationVariant, setPresentationVariant] = useState<PresentationVariant>('kk');
  const presentationFile = useRef<HTMLInputElement>(null);

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  useEffect(() => {
    if (isNew) {
      setTitle('');
      setSubject('Информатика олимпиадасы');
      setGrade('7');
      setDuration('90 минут');
      setSummary('');
      setObjectives('');
      setSlides(SAMPLE);
      setTerms([]);
      setPresentationMeta(null);
      setCanvasEditorIndex(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    sb.from('cf_lessons').select('*').eq('id', route.lessonId).single().then(({ data, error: readError }) => {
      if (readError) setError(readError.message);
      if (data) {
        setTitle(data.title || '');
        setSubject(data.subject || '');
        setSlides(parseSlides(data.slides));
        setTerms(parseTerms(data.terms));
        setSummary(data.plan?.summary || '');
        setObjectives(Array.isArray(data.plan?.objectives) ? data.plan.objectives.join('\n') : '');
        setGrade(String(data.plan?.grade || '7'));
        setDuration(data.plan?.duration || '90 минут');
        setPresentationMeta(data.plan?.presentation || null);
      }
      setLoading(false);
    });
  }, [isNew, route.lessonId]);

  const updateSlide = (index: number, patch: Slide) => setSlides(items => items.map((item, i) => i === index ? normalizePage({ ...item, ...patch }) : item));
  const changePageType = (index: number, pageType: PageType) => {
    const template = PAGE_TEMPLATES[pageType][0];
    setSlides(items => items.map((item, i) => i === index ? { ...item, pageType, templateId: template.id, type: template.blockType } : item));
  };
  const changeTemplate = (index: number, templateId: string) => {
    const page = slides[index];
    const template = PAGE_TEMPLATES[inferPageType(page)].find(item => item.id === templateId);
    setSlides(items => items.map((item, i) => i === index ? { ...item, templateId, type: template?.blockType || item.type } : item));
  };
  const moveSlide = (index: number, direction: -1 | 1) => setSlides(items => {
    const next = index + direction;
    if (next < 0 || next >= items.length) return items;
    const copy = [...items];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    return copy;
  });
  const openPagePicker = () => {
    setNewPageType('slide');
    setNewPageTemplate(PAGE_TEMPLATES.slide[0].id);
    setPagePickerOpen(true);
  };
  const createPage = () => {
    setSlides(items => [...items, pageFromTemplate(newPageType, newPageTemplate)]);
    setPagePickerOpen(false);
  };

  const importSource = async (file: File | undefined) => {
    if (!file) return;
    if (!isPptx(file) && !isPdf(file)) return setError('Тек .pptx немесе .pdf файлын импорттауға болады.');
    setError(''); setMessage(''); setPresentationBusy(true);
    try {
      const deck = isPptx(file) ? await parsePptx(file) : null;
      const sourceUrl = DEMO
        ? URL.createObjectURL(file)
        : await uploadPresentationSource(file, me?.school_id || '');
      const importId = crypto.randomUUID();
      const source = { ...presentationSource(file, sourceUrl), presentationImportId: importId, ...(deck ? { presentationWidth: deck.width, presentationHeight: deck.height } : {}) };
      const imageSources: Record<string, string> = {};
      if (deck && !DEMO) {
        const images = deck.slides.flatMap(slide => slide.blocks.filter(block => block.kind === 'image'));
        for (const image of images) {
          if (!/^image\/(png|jpeg|webp|gif)$/.test(image.mime) || imageSources[image.name]) continue;
          imageSources[image.name] = await uploadSlideImage(new File([image.bytes.buffer as ArrayBuffer], image.name, { type: image.mime }), me?.school_id || '');
        }
      }
      if (presentationVariant === 'kk') {
        const converted: Slide[] = deck ? deck.slides.map(slide => pptxSlideToCanvas(slide, { sourceUrl, sourceName: file.name, importId, imageSources: DEMO ? undefined : imageSources })) as Slide[] : [];
        setSlides(items => {
          const emptySeed = isNew && slidesRef.current === SAMPLE;
          return [...(emptySeed ? [] : items), source, ...converted];
        });
        setTitle(prev => prev.trim() || file.name.replace(/\.(pptx|pdf)$/i, ''));
        setSummary(prev => prev || (deck ? 'PPTX слайдтары ClassFlow элементтеріне айналдырылды және түпнұсқа файл сақталды.' : 'Түпнұсқа презентация файл ретінде сақталды.'));
        setPresentationMeta((prev: any) => ({ ...(prev || {}), kk: { fileName: file.name, importId, width: deck?.width, height: deck?.height, slideCount: deck?.slides.length || 0, plainText: deck?.plainText || '' } }));
        setMessage(deck ? `${deck.slides.length} слайд оқылды: мәтін, сурет және өлшемдер ClassFlow-дың өңделетін беттеріне айналды. Түпнұсқа өзгермеді.` : 'PDF түпнұсқа файл ретінде қосылды. PDF-ті ClassFlow элементтеріне бөлу әзірге қолжетімсіз.');
      } else {
        const currentBase = slidesRef.current.filter(item => inferPageType(item) === 'presentation') as unknown as PresentationSlide[];
        if (!currentBase.length) throw new Error('Орысша нұсқаны қосу үшін алдымен қазақша PPTX/PDF слайдтарын импорттаңыз.');
        const target = currentBase.find(item => item.presentationImportId) || currentBase[currentBase.length - 1];
        const baseImportId = target.presentationImportId || importId;
        const languageSource = { ...source, presentationImportId: baseImportId };
        const converted: Slide[] = deck ? deck.slides.map(slide => pptxSlideToCanvas(slide, { sourceUrl, sourceName: file.name, importId: baseImportId, imageSources: DEMO ? undefined : imageSources })) as Slide[] : [];
        const kkPages = slidesRef.current.filter(item => item.type === 'canvas' && item.presentationImportId === baseImportId).sort((a, b) => (a.slideNumber || 0) - (b.slideNumber || 0));
        setSlides(items => {
          if (converted.length && converted.length === kkPages.length) return items.map(slide => {
            if (slide === target) return { ...slide, ru: languageSource };
            const index = kkPages.indexOf(slide);
            return index >= 0 ? { ...slide, ru: converted[index] } : slide;
          });
          return items.map(slide => slide === target ? { ...slide, ru: languageSource } : slide);
        });
        setPresentationMeta((prev: any) => ({ ...(prev || {}), ru: { fileName: file.name, importId: baseImportId, width: deck?.width, height: deck?.height, slideCount: deck?.slides.length || 0, plainText: deck?.plainText || '' } }));
        setMessage(converted.length && converted.length === kkPages.length ? 'Орысша PPTX түпнұсқа ретінде сақталды және сәйкес ClassFlow беттеріне тілдік нұсқа болып қосылды.' : 'Орысша түпнұсқа тілдік нұсқа ретінде сақталды. Слайд саны сәйкес болмағандықтан, өңделетін тілдік беттер қосылмады.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Презентацияны импорттау мүмкін болмады.');
    } finally {
      setPresentationBusy(false);
    }
  };

  const generateWithAi = async () => {
    if (!aiTopic.trim()) return setError('ЖИ арқылы жасау үшін дәріс тақырыбын жазыңыз.');
    setError(''); setMessage(''); setAiBusy(true);
    try {
      const result = await ai('slides', {
        topic: aiTopic.trim(),
        grade,
        count: 10,
        subject,
        duration,
        objective: aiObjective.trim(),
        extra: aiInstruction.trim(),
        language: 'kk',
      });
      if (!result || !Array.isArray(result.slides)) throw new Error('ЖИ бос немесе жарамсыз нәтиже қайтарды.');
      setTitle(prev => prev.trim() || aiTopic.trim());
      setSummary(prev => prev || `${aiTopic.trim()} тақырыбы бойынша ${grade}-сыныпқа арналған дәріс.`);
      setSlides(parseSlides(result.slides));
      setTerms(parseTerms(result.terms));
      setMode('manual');
      setMessage('ЖИ нобайы дайын. Енді мазмұнды тексеріп, қолмен түзете аласыз.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ЖИ нобайын жасау мүмкін болмады.');
    } finally {
      setAiBusy(false);
    }
  };

  const exportEditedPptx = async () => {
    setError(''); setMessage(''); setExportBusy(true);
    try {
      const blob = await exportClassFlowPptx(slides, title || 'classflow');
      downloadPptx(blob, title || 'classflow');
      setMessage('Өңделген оқу слайдтары жаңа PPTX файлы ретінде жүктелді. Интерактивті беттер экспортқа кірмеді.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PPTX экспорттау мүмкін болмады.');
    } finally {
      setExportBusy(false);
    }
  };

  const save = async () => {
    if (!title.trim()) return setError('Дәрістің атауын жазыңыз.');
    setError(''); setMessage(''); setSaving(true);
    const plan = { summary: summary.trim(), objectives: objectives.split('\n').map(x => x.trim()).filter(Boolean), grade: +grade || 7, duration, ...(presentationMeta ? { presentation: presentationMeta } : {}) };
    const row = { title: title.trim(), subject: subject.trim() || null, slides, terms, plan };
    try {
      let lessonId = route.lessonId;
      if (DEMO) {
        lessonId = lessonId === 'new' ? `demo-${Date.now()}` : lessonId;
        const key = 'cf_demo_created_lessons';
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        const next = [...current.filter((x: any) => x.id !== lessonId), { id: lessonId, ...row }];
        localStorage.setItem(key, JSON.stringify(next));
      } else if (isNew) {
        const result = await sb.from('cf_lessons').insert({ ...row, owner_id: me.id, school_id: me.school_id }).select('id').single();
        if (result.error) throw new Error(result.error.message);
        lessonId = result.data.id;
      } else {
        const result = await sb.from('cf_lessons').update({ ...row, updated_at: new Date().toISOString() }).eq('id', route.lessonId);
        if (result.error) throw new Error(result.error.message);
      }
      // Existing module lessons are already placed in the curriculum. Re-loading
      // the whole curriculum after every edit is unnecessary and can make a
      // successful lesson save look like a failure when that secondary request
      // is unavailable. Only place a newly created lesson here.
      if (route.moduleId && lessonId && isNew) {
        const current = await curriculum.loadCurr(me);
        await curriculum.placeLesson(me, lessonId, route.moduleId, curriculum.nextPosition(current.places.filter(p => p.module_id === route.moduleId)));
      }
      setMessage('Дәріс сақталды.');
      setTimeout(() => { window.location.hash = route.moduleId ? 'lessons/modules' : 'lessons/mine'; }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Дәрісті сақтау мүмкін болмады.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-bg text-text grid place-items-center">Дәріс жүктелуде...</div>;

  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar me={me} onLogout={onLogout} />
      <main className="mx-auto max-w-5xl space-y-4 p-4 pb-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-accent">ClassFlow · Дәріс конструкторы</p><h1 className="mt-1 text-2xl font-bold">{isNew ? 'Жаңа дәріс' : 'Дәрісті өңдеу'}</h1><p className="mt-1 text-sm text-text-secondary">Негізгі мазмұнды оңай толтырыңыз, толық құрылымды кейін ашыңыз.</p></div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => { window.location.hash = route.moduleId ? 'lessons/modules' : 'lessons/mine'; }}>Болдырмау</Button><Button loading={saving} onClick={save}>Сақтау</Button></div>
        </div>

        {(error || message) && (error ? <ErrorBox message={error} /> : <p role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">{message}</p>)}

        <div className="flex gap-1 rounded-lg bg-surface-2 p-1" role="tablist" aria-label="Дәріс жасау режимі">
          <button type="button" role="tab" aria-selected={mode === 'manual'} onClick={() => setMode('manual')} className={`min-h-[44px] flex-1 rounded-md px-3 text-sm font-semibold ${mode === 'manual' ? 'bg-surface text-text shadow-card' : 'text-text-secondary hover:text-text'}`}><FileText size={16} className="mr-2 inline" aria-hidden="true" />Қолмен жасау</button>
          <button type="button" role="tab" aria-selected={mode === 'ai'} onClick={() => setMode('ai')} className={`min-h-[44px] flex-1 rounded-md px-3 text-sm font-semibold ${mode === 'ai' ? 'bg-surface text-text shadow-card' : 'text-text-secondary hover:text-text'}`}><Sparkles size={16} className="mr-2 inline" aria-hidden="true" />ЖИ арқылы жасау</button>
        </div>

        {mode === 'ai' && (
          <Card className="space-y-4 border-accent/30">
            <div><h2 className="font-semibold">ЖИ-ге тапсырма беріңіз</h2><p className="mt-1 text-sm text-text-secondary">ЖИ алдымен дәріс нобайын жасайды. Ол автоматты түрде жарияланбайды.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Дәріс тақырыбы">{inputId => <input id={inputId} className={inputCls} value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Мысалы: prefix sum" />}</Field>
              <Field label="Сынып">{inputId => <select id={inputId} className={inputCls} value={grade} onChange={e => setGrade(e.target.value)}><option value="7">7-сынып</option><option value="8">8-сынып</option><option value="9">9-сынып</option></select>}</Field>
              <Field label="Ұзақтығы">{inputId => <select id={inputId} className={inputCls} value={duration} onChange={e => setDuration(e.target.value)}><option>45 минут</option><option>90 минут</option><option>120 минут</option></select>}</Field>
              <Field label="Пән">{inputId => <input id={inputId} className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} />}</Field>
              <Field label="Негізгі оқу мақсаты">{inputId => <textarea id={inputId} className={inputCls + ' min-h-[88px] py-2'} value={aiObjective} onChange={e => setAiObjective(e.target.value)} placeholder="Оқушы дәріс соңында нені білуі керек?" />}</Field>
              <Field label="Мұғалімнің арнайы нұсқауы">{inputId => <textarea id={inputId} className={inputCls + ' min-h-[88px] py-2'} value={aiInstruction} onChange={e => setAiInstruction(e.target.value)} placeholder="Мысалы: C++17, индекстер 0-ден басталсын" />}</Field>
            </div>
            <div className="flex flex-wrap items-center gap-3"><Button loading={aiBusy} onClick={generateWithAi}><Sparkles size={16} aria-hidden="true" />ЖИ нобайын жасау</Button><span className="text-xs text-text-secondary">Нәтижені міндетті түрде мұғалім тексереді.</span></div>
          </Card>
        )}

        <Card className="space-y-4">
          <div><h2 className="font-semibold">Негізгі ақпарат</h2><p className="mt-1 text-sm text-text-secondary">Бұл өрістер дәріс картасында және КТП-да көрсетіледі.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Дәріс атауы">{inputId => <input id={inputId} className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Мысалы: prefix sum" />}</Field>
            <Field label="Пән">{inputId => <input id={inputId} className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} />}</Field>
            <Field label="Сынып">{inputId => <select id={inputId} className={inputCls} value={grade} onChange={e => setGrade(e.target.value)}><option value="7">7-сынып</option><option value="8">8-сынып</option><option value="9">9-сынып</option></select>}</Field>
            <Field label="Ұзақтығы">{inputId => <select id={inputId} className={inputCls} value={duration} onChange={e => setDuration(e.target.value)}><option>45 минут</option><option>90 минут</option><option>120 минут</option></select>}</Field>
            <Field label="Қысқаша сипаттама">{inputId => <textarea id={inputId} className={inputCls + ' min-h-[88px] py-2'} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Дәріс соңында оқушы нені меңгереді?" />}</Field>
            <Field label="Оқу мақсаттары">{inputId => <textarea id={inputId} className={inputCls + ' min-h-[88px] py-2'} value={objectives} onChange={e => setObjectives(e.target.value)} placeholder="Әр мақсатты жаңа жолдан жазыңыз" />}</Field>
          </div>
        </Card>

        {pagePickerOpen && (
          <Card className="space-y-4 border-accent/30">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Жаңа бет қосу</h2><p className="mt-1 text-sm text-text-secondary">Алдымен бет типін, содан кейін сол типке арналған үлгіні таңдаңыз.</p></div><Button variant="secondary" onClick={() => setPagePickerOpen(false)}>Жабу</Button></div>
            <div className="grid gap-2 md:grid-cols-3">
              {PAGE_TYPES.map(pageType => (
                <button key={pageType.id} type="button" aria-pressed={newPageType === pageType.id} onClick={() => { setNewPageType(pageType.id); setNewPageTemplate(PAGE_TEMPLATES[pageType.id][0].id); }} className={`rounded-lg border p-3 text-left transition ${newPageType === pageType.id ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface-2'}`}>
                  <span className="font-semibold">{pageType.label}</span><span className="mt-1 block text-xs text-text-secondary">{pageType.description}</span>
                </button>
              ))}
            </div>
            <div><h3 className="mb-2 text-sm font-semibold">Бет үлгісі</h3><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PAGE_TEMPLATES[newPageType].map(template => (
                <button key={template.id} type="button" aria-pressed={newPageTemplate === template.id} onClick={() => setNewPageTemplate(template.id)} className={`rounded-lg border p-3 text-left transition ${newPageTemplate === template.id ? 'border-accent bg-accent-soft' : 'border-border hover:bg-surface-2'}`}>
                  <span className="block text-sm font-semibold">{template.label}</span><span className="mt-1 block text-xs text-text-secondary">{template.description}</span>
                </button>
              ))}
            </div></div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2 p-3"><p className="text-sm text-text-secondary">Таңдалғаны: <b className="text-text">{PAGE_TYPES.find(item => item.id === newPageType)?.label}</b> · {PAGE_TEMPLATES[newPageType].find(item => item.id === newPageTemplate)?.label}</p><Button onClick={createPage}><Plus size={16} aria-hidden="true" />Бетті жасау</Button></div>
          </Card>
        )}

        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold">Дәріс беттері</h2><p className="mt-1 text-sm text-text-secondary">PPTX түпнұсқасы өзгермей сақталады, ал оның мәтіні, суреті және өлшемі өңделетін ClassFlow беттеріне бөлінеді. Орысша PPTX сәйкес беттерге тілдік нұсқа болады.</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Импорт тілін таңдау" className={inputCls + ' !w-auto'} value={presentationVariant} onChange={e => setPresentationVariant(e.target.value as PresentationVariant)}>
                <option value="kk">Қазақша слайдтар</option><option value="ru">Орысша нұсқа</option>
              </select>
              <Button variant="secondary" loading={presentationBusy} onClick={() => presentationFile.current?.click()}><Upload size={16} aria-hidden="true" />PPTX/PDF импорттау</Button>
              <Button variant="secondary" loading={exportBusy} onClick={exportEditedPptx}><Download size={16} aria-hidden="true" />Өңделген PPTX жүктеу</Button>
              <input ref={presentationFile} type="file" className="sr-only" accept=".pptx,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf" onChange={e => { importSource(e.target.files?.[0]); e.target.value = ''; }} />
              <Button variant="secondary" onClick={openPagePicker}><Plus size={16} aria-hidden="true" />Бет қосу</Button>
            </div>
          </div>
          <div className="space-y-2">
            {slides.map((slide, index) => (
              <div key={index} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent-soft text-sm font-bold text-accent">{index + 1}</span><select aria-label={`Бет ${index + 1}: типі`} className={inputCls + ' !w-auto min-w-[9rem]'} value={inferPageType(slide)} onChange={e => changePageType(index, e.target.value as PageType)}>{PAGE_TYPES.map(pageType => <option key={pageType.id} value={pageType.id}>{pageType.label}</option>)}</select><select aria-label={`Бет ${index + 1}: үлгісі`} className={inputCls + ' !w-auto min-w-[10rem]'} value={inferTemplateId(slide, inferPageType(slide))} onChange={e => changeTemplate(index, e.target.value)}>{PAGE_TEMPLATES[inferPageType(slide)].map(template => <option key={template.id} value={template.id}>{template.label}</option>)}</select><select aria-label={`Блок ${index + 1}: түрі`} className={inputCls + ' !w-auto min-w-[9rem]'} value={slide.type || 'content'} onChange={e => updateSlide(index, { type: e.target.value })}>{TYPES.map(type => <option key={type} value={type}>{typeLabel[type]}</option>)}</select><input aria-label={`Бет ${index + 1}: атауы`} className={inputCls + ' min-w-[12rem] flex-1'} value={slide.title || ''} onChange={e => updateSlide(index, { title: e.target.value })} placeholder="Бет атауы" />{slide.type === 'canvas' && <button type="button" className="inline-flex items-center gap-1 rounded-md border border-accent px-2 py-1 text-sm font-semibold text-accent hover:bg-accent-soft" onClick={() => setCanvasEditorIndex(index)}><Pencil size={15} aria-hidden="true" />Кенепте өңдеу</button>}<button type="button" className="rounded-md p-2 text-text-secondary hover:bg-surface-2 disabled:opacity-30" disabled={index === 0} onClick={() => moveSlide(index, -1)} aria-label="Жоғары жылжыту"><ArrowUp size={16} aria-hidden="true" /></button><button type="button" className="rounded-md p-2 text-text-secondary hover:bg-surface-2 disabled:opacity-30" disabled={index === slides.length - 1} onClick={() => moveSlide(index, 1)} aria-label="Төмен жылжыту"><ArrowDown size={16} aria-hidden="true" /></button><button type="button" className="rounded-md p-2 text-danger hover:bg-danger-soft" onClick={() => setSlides(items => items.filter((_, i) => i !== index))} aria-label="Бетті өшіру"><Trash2 size={16} aria-hidden="true" /></button></div>
                <p className="mt-2 pl-10 text-xs text-text-secondary"><span className="font-semibold text-text">{PAGE_TYPES.find(item => item.id === inferPageType(slide))?.label}</span> · {PAGE_TEMPLATES[inferPageType(slide)].find(item => item.id === inferTemplateId(slide, inferPageType(slide)))?.label} · {displaySlideText(slide) || 'Бет мазмұны толық құрылымда толтырылады.'}</p>
              </div>
            ))}
          </div>
          <button type="button" className="flex w-full items-center justify-between rounded-md border border-border px-3 py-3 text-left text-sm font-semibold text-text-secondary hover:bg-surface-2" onClick={() => setRawOpen(v => !v)} aria-expanded={rawOpen}><span><Lightbulb size={16} className="mr-2 inline text-warning" aria-hidden="true" />Толық құрылым және техникалық өрістер</span><ChevronDown size={16} className={rawOpen ? 'rotate-180' : ''} aria-hidden="true" /></button>
          {rawOpen && <div className="grid gap-3 sm:grid-cols-2"><Field label="Беттер мен блоктар JSON">{inputId => <textarea id={inputId} className={inputCls + ' min-h-[260px] py-2 font-mono text-xs'} value={rawSlides || JSON.stringify(slides, null, 2)} onChange={e => setRawSlides(e.target.value)} onBlur={() => { try { setSlides(parseSlides(JSON.parse(rawSlides))); setError(''); } catch { setError('Беттер JSON форматы дұрыс емес.'); } }} />}</Field><Field label="Терминдер JSON">{inputId => <textarea id={inputId} className={inputCls + ' min-h-[260px] py-2 font-mono text-xs'} value={rawTerms || JSON.stringify(terms, null, 2)} onChange={e => setRawTerms(e.target.value)} onBlur={() => { try { setTerms(parseTerms(JSON.parse(rawTerms))); setError(''); } catch { setError('Терминдер JSON форматы дұрыс емес.'); } }} />}</Field></div>}
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-secondary">Нобай сақталады. Жарияламас бұрын код, тест жауаптары және тапсырмалар тексеріледі.</p><Button loading={saving} onClick={save}>Сақтау және шығу</Button></div>
        {canvasEditorIndex !== null && <CanvasEditor
          pages={slides}
          cur={Math.min(canvasEditorIndex, Math.max(0, slides.length - 1))}
          schoolId={me?.school_id || ''}
          title={title}
          status={saving ? 'Сақталуда…' : 'Нобай'}
          saved={message}
          previewHref={!isNew && route.lessonId ? `#preview/${route.lessonId}` : undefined}
          onTitle={setTitle}
          onChange={slide => setSlides(items => items.map((item, index) => index === canvasEditorIndex ? normalizePage(slide) : item))}
          onSelect={index => setCanvasEditorIndex(index)}
          onAdd={() => { setCanvasEditorIndex(null); openPagePicker(); }}
          onReorder={(from, to) => setSlides(items => { const next = [...items]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next; })}
          onSave={save}
          onClose={() => setCanvasEditorIndex(null)}
        />}
      </main>
    </div>
  );
}
