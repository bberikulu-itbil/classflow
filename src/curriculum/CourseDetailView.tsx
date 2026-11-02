import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  GraduationCap,
  Image as ImageIcon,
  Info,
  Languages,
  Layers,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Save,
  Share2,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { coverOf } from '../ui/cover';
import { sb, DEMO } from '../config';
import { Button, Card, EmptyState, ErrorBox, Field, LinkButton, Skeleton, inputCls, useLoad } from '../ui';
import { Chips } from '../ui/Chips';
import { loadClasses } from '../journal/store';
import { getPrefs } from '../prefs';
import { startSession } from '../views/session';
import * as st from './store';
import type { Course, Kind, Me, Mod, Place } from './store';
import { useLang } from '../lessons/lang';
import { courseTitle, lessonTitle, moduleTitle } from './display';
import { fmtDate } from '../hw/format';

export const PRESET_COVERS = [
  {
    id: 'cs',
    title: 'Информатика',
    url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    color: '#2563EB',
  },
  {
    id: 'robotics',
    title: 'Робототехника',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    color: '#059669',
  },
  {
    id: 'code',
    title: 'Бағдарламалау',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    color: '#7C3AED',
  },
  {
    id: 'design',
    title: 'Дизайн және UI/UX',
    url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80',
    color: '#EA580C',
  },
  {
    id: 'data',
    title: 'Кестелер мен Деректер',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    color: '#0284C7',
  },
  {
    id: 'science',
    title: 'Ғылым және Зерттеу',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
    color: '#DC2626',
  },
];

const KIND_LABEL: Record<Kind, string> = { lesson: 'Сабақ', course: 'Курс' };
const qLabel = (q: number | null) => (q ? `${q}-тоқсан` : 'Тоқсансыз');

export function CourseCardPreview({
  title,
  description,
  subject,
  grade,
  instructor,
  level,
  coverUrl,
  modulesCount,
  lessonsCount,
  className = '',
}: {
  title: string;
  description?: string | null;
  subject?: string | null;
  grade?: number | null;
  instructor?: string | null;
  level?: string | null;
  coverUrl?: string | null;
  modulesCount?: number;
  lessonsCount?: number;
  className?: string;
}) {
  return (
    <article className={`overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:shadow-md ${className}`}>
      {/* Cover Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-4 text-center text-white">
            <GraduationCap size={44} className="mb-2 opacity-80" />
            <span className="text-xs font-semibold uppercase tracking-widest opacity-75">{subject || 'Курс'}</span>
          </div>
        )}

        {/* Category Pill Tag */}
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
          {subject && (
            <span className="rounded-full bg-surface/90 px-3 py-1 text-xs font-bold text-accent shadow-sm backdrop-blur-md">
              {subject}
            </span>
          )}
          {grade && (
            <span className="rounded-full bg-surface-2/90 px-2.5 py-1 text-xs font-semibold text-text shadow-sm backdrop-blur-md">
              {grade}-сынып
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2.5 p-4 sm:p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-text sm:text-xl">
          {title || 'Курс атауы'}
        </h3>

        {description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary sm:text-sm">
            {description}
          </p>
        )}

        <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-text-secondary">
          <div className="flex items-center gap-1.5 min-w-0">
            <User size={14} className="shrink-0 text-text-muted" />
            <span className="truncate">
              {instructor ? `Оқытушы: ${instructor}` : 'Мұғалім'}
            </span>
          </div>
          {level && (
            <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 font-medium text-text-secondary">
              {level}
            </span>
          )}
        </div>

        {(modulesCount !== undefined || lessonsCount !== undefined) && (
          <div className="flex items-center gap-3 text-xs text-text-muted">
            {modulesCount !== undefined && <span>{modulesCount} модуль</span>}
            {lessonsCount !== undefined && <span>· {lessonsCount} дәріс</span>}
          </div>
        )}
      </div>
    </article>
  );
}

function ModuleMenu({
  mod,
  index,
  total,
  isEditing,
  onToggleEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  mod: Mod;
  index: number;
  total: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', out);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const item = 'flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium text-text hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`${mod.title}: қосымша әрекеттер`}
        title="Әрекеттер"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-text-secondary transition-colors hover:border-border hover:bg-surface-2 hover:text-text ${
          open ? 'border-border bg-surface-2 text-text shadow-sm' : ''
        }`}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>

      {open && (
        <ul className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100" role="menu">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                setOpen(false);
                onToggleEdit();
              }}
            >
              <Pencil size={15} className="text-text-secondary" aria-hidden="true" />
              <span>{isEditing ? 'Өңдеуді аяқтау' : 'Өңдеу'}</span>
            </button>
          </li>
          {index > 0 && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => {
                  setOpen(false);
                  onMoveUp();
                }}
              >
                <ArrowUp size={15} className="text-text-secondary" aria-hidden="true" />
                <span>Жоғары жылжыту</span>
              </button>
            </li>
          )}
          {index < total - 1 && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className={item}
                onClick={() => {
                  setOpen(false);
                  onMoveDown();
                }}
              >
                <ArrowDown size={15} className="text-text-secondary" aria-hidden="true" />
                <span>Төмен жылжыту</span>
              </button>
            </li>
          )}
          <li role="separator" className="my-1 border-t border-border" />
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className={`${item} text-danger hover:!bg-danger-soft`}
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>Модульді өшіру</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

export type CourseTab = 'syllabus' | 'info' | 'analysis';

export function CourseDetailView({ courseId, me }: { courseId: string; me: Me }) {
  const [lang, flipLang] = useLang();
  const [tab, setTab] = useState<CourseTab>('syllabus');
  const { data, error, loading, reload } = useLoad(() => st.loadCurr(me), [me.id]);

  const course = data?.courses.find(c => c.id === courseId);
  const modules = data ? data.modules.filter(m => m.course_id === courseId) : [];
  const placed = new Set(data?.places.map(p => p.lesson_id));
  const free = (data?.lessons || []).filter(l => !placed.has(l.id));
  const lesson = (id: string) => data!.lessons.find(l => l.id === id);
  const inModule = (m: Mod): Place[] => (data?.places || []).filter(p => p.module_id === m.id).filter(p => lesson(p.lesson_id));

  // State for form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [instructor, setInstructor] = useState('');
  const [level, setLevel] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Module state
  const [openId, setOpenId] = useState('');
  const [editId, setEditId] = useState('');
  const [newModOpen, setNewModOpen] = useState(false);
  const [newModTitle, setNewModTitle] = useState('');
  const [newModKind, setNewModKind] = useState<Kind>('lesson');
  const [newModQuarter, setNewModQuarter] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [busyStart, setBusyStart] = useState('');
  const [startErr, setStartErr] = useState('');
  const [askMod, setAskMod] = useState<Mod | null>(null);

  // Classes for starting session
  const classes = useLoad(loadClasses, []);
  const [cls, setCls] = useState(st.selectedClass());
  const clsName = classes.data?.find(c => c.id === cls)?.name || '';

  // Past sessions for analysis
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setSubject(course.subject || '');
      setGrade(course.grade ? String(course.grade) : '');
      setInstructor(course.instructor || '');
      setLevel(course.level || '');
      setCoverUrl(course.cover_url || '');
    }
  }, [course]);

  // Load past sessions for analysis
  useEffect(() => {
    if (!course || DEMO) return;
    setLoadingSessions(true);
    (async () => {
      try {
        const [sessRes, classRes] = await Promise.all([
          sb.from('cf_sessions').select('*').eq('teacher_id', me.id).neq('status', 'live').order('started_at', { ascending: false }),
          sb.from('classes').select('id,name'),
        ]);
        const classNames = new Map((classRes.data || []).map((c: any) => [c.id, c.name]));
        const courseLessonIds = new Set(
          (data?.places || [])
            .filter(p => modules.some(m => m.id === p.module_id))
            .map(p => p.lesson_id)
        );
        const filtered = (sessRes.data || [])
          .filter((s: any) => courseLessonIds.has(s.lesson_id))
          .map((s: any) => ({
            ...s,
            className: classNames.get(s.class_id) || 'Сыныпсыз',
          }));
        setSessions(filtered);
      } catch (err) {
        console.error('Failed to load past sessions', err);
      } finally {
        setLoadingSessions(false);
      }
    })();
  }, [course?.id, data?.places]);

  const handleSaveInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!course) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await st.updateCourse(me, course.id, {
        title: title.trim() || course.title,
        description: description.trim() || null,
        subject: subject.trim() || null,
        grade: grade ? +grade : null,
        instructor: instructor.trim() || null,
        level: level.trim() || null,
        cover_url: coverUrl.trim() || null,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      reload();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModTitle.trim() || !course) return;
    await st.addModule(me, course.id, newModTitle.trim(), st.nextPosition(modules), {
      kind: newModKind,
      quarter: newModKind === 'lesson' && newModQuarter ? +newModQuarter : null,
      grade: grade ? +grade : null,
    });
    setNewModTitle('');
    setNewModOpen(false);
    reload();
  };

  const start = async (lessonId: string) => {
    if (DEMO) { setStartErr('Демо режимде сабақ басталмайды'); return; }
    setBusyStart(lessonId); setStartErr('');
    try {
      await startSession(lessonId, cls, getPrefs().groups);
    } catch (e) {
      setStartErr((e as Error).message || 'Сабақты бастау мүмкін болмады');
      setBusyStart('');
    }
  };

  const shareLesson = async (lessonId: string, lTitle: string) => {
    const url = `${window.location.origin}${window.location.pathname}#preview/${lessonId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: lTitle, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(lessonId);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(lessonId);
      setTimeout(() => setCopiedId(''), 2000);
    }
  };

  if (loading && !data) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <Skeleton />
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <a href="#lessons/courses" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
          <ArrowLeft size={16} /> Курстарға оралу
        </a>
        <EmptyState
          text="Курс табылмады немесе өшірілген."
          action={<LinkButton href="#lessons/courses" variant="primary">Курстар тізіміне өту</LinkButton>}
        />
      </main>
    );
  }

  const totalLessons = modules.reduce((sum, m) => sum + inModule(m).length, 0);

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4">
      {/* Back link & breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="#lessons/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-accent transition-colors">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Барлық курстар</span>
        </a>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={flipLang}
            aria-label="Тілді ауыстыру"
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold hover:bg-surface-2"
          >
            <Languages size={15} aria-hidden="true" />
            <span>{lang === 'ru' ? 'ҚАЗ' : 'РУС'}</span>
          </button>
        </div>
      </div>

      {/* Course Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            {/* Thumbnail preview */}
            <div className="hidden sm:block h-20 w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-inner">
              {coverUrl ? (
                <img src={coverUrl} alt={courseTitle(course, lang)} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-900 text-white">
                  <GraduationCap size={28} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {course.subject && (
                  <span className="rounded-full bg-accent/15 px-3 py-0.5 text-xs font-bold text-accent">
                    {course.subject}
                  </span>
                )}
                {course.grade && (
                  <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                    {course.grade}-сынып
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text break-words">
                {courseTitle(course, lang)}
              </h1>
              {course.description && (
                <p className="text-sm text-text-secondary line-clamp-2 max-w-2xl">
                  {course.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-border bg-surface-2/60 px-3 py-1.5 text-xs font-medium text-text-secondary">
              {modules.length} модуль · {totalLessons} дәріс
            </span>
          </div>
        </div>

        {/* 3 Main Tabs */}
        <nav aria-label="Курс бөлімдері" className="mt-6 flex border-b border-border/80">
          <button
            type="button"
            onClick={() => setTab('syllabus')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === 'syllabus'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            <BookOpen size={17} aria-hidden="true" />
            <span>Силлабус (Syllabus)</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-secondary font-normal">
              {modules.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('info')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === 'info'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            <Info size={17} aria-hidden="true" />
            <span>Ақпарат (Information)</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('analysis')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === 'analysis'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text'
            }`}
          >
            <BarChart3 size={17} aria-hidden="true" />
            <span>Талдау (Analysis)</span>
          </button>
        </nav>
      </section>

      {startErr && <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">{startErr}</p>}

      {/* TAB 1: SYLLABUS */}
      {tab === 'syllabus' && (
        <section aria-label="Курс силлабусы" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Оқу жоспары мен модульдер</h2>
              <p className="text-xs text-text-secondary">
                Модульдер құрамындағы дәрістерді басқару, бастау және өңдеу
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {classes.data && classes.data.length > 0 && (
                <select
                  aria-label="Сынып (бастау үшін)"
                  className="min-h-[38px] rounded-lg border border-border-input bg-surface px-3 text-xs font-medium text-text"
                  value={cls}
                  onChange={(e) => {
                    setCls(e.target.value);
                    st.selectClass(e.target.value);
                  }}
                >
                  <option value="">Сынып таңдалмаған</option>
                  {classes.data.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}

              <Button
                variant="primary"
                className="!min-h-[38px] gap-1.5 text-xs sm:text-sm font-semibold shadow-sm"
                onClick={() => setNewModOpen(true)}
              >
                <Plus size={16} aria-hidden="true" />
                <span>Модуль қосу</span>
              </Button>
            </div>
          </div>

          {newModOpen && (
            <Card className="space-y-3" aria-label="Жаңа модуль">
              <h3 className="font-semibold text-sm">Жаңа модуль жасау</h3>
              <form onSubmit={handleAddModule} className="space-y-3">
                <Field label="Модуль атауы">
                  {id => (
                    <input
                      id={id}
                      className={inputCls}
                      value={newModTitle}
                      placeholder="Мысалы: Кіріспе және негізгі түсініктер"
                      onChange={e => setNewModTitle(e.target.value)}
                      required
                    />
                  )}
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Түрі">
                    {id => (
                      <select id={id} className={inputCls} value={newModKind} onChange={e => setNewModKind(e.target.value as Kind)}>
                        <option value="lesson">Сабақ модулі (тоқсанмен)</option>
                        <option value="course">Курс модулі (тоқсансыз)</option>
                      </select>
                    )}
                  </Field>
                  {newModKind === 'lesson' && (
                    <Field label="Тоқсан">
                      {id => (
                        <select id={id} className={inputCls} value={newModQuarter} onChange={e => setNewModQuarter(e.target.value)}>
                          <option value="">Барлық тоқсан</option>
                          {[1, 2, 3, 4].map(q => <option key={q} value={q}>{q}-тоқсан</option>)}
                        </select>
                      )}
                    </Field>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Сақтау</Button>
                  <Button variant="secondary" onClick={() => setNewModOpen(false)}>Болдырмау</Button>
                </div>
              </form>
            </Card>
          )}

          {modules.length === 0 ? (
            <EmptyState
              text="Бұл курста әлі модуль жоқ. «Модуль қосу» батырмасымен алғашқы модульді қосыңыз."
              action={<Button variant="primary" onClick={() => setNewModOpen(true)}>Модуль қосу</Button>}
            />
          ) : (
            <div className="space-y-3">
              {modules.map((m, mi) => {
                const ps = inModule(m);
                const editing = editId === m.id, open = editing || openId === m.id;
                const info1 = [KIND_LABEL[m.kind], m.kind === 'lesson' ? qLabel(m.quarter) : null, m.grade && `${m.grade}-сынып`, `${ps.length} дәріс`].filter(Boolean).join(' · ');

                return (
                  <section key={m.id} aria-label={moduleTitle(m, lang)} className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm transition-all hover:border-slate-400/40">
                    <div className="flex items-center gap-1 pr-2">
                      <h3 className="min-w-0 flex-1">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setOpenId(openId === m.id ? '' : m.id)}
                          className="flex min-h-[58px] w-full items-center gap-3.5 rounded-lg p-2.5 text-left hover:bg-surface-2/60 transition-colors"
                        >
                          <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                            style={{ background: coverOf(m.kind === 'course' ? 3 : mi) }}
                          >
                            <Layers size={20} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words font-semibold text-text text-base">{moduleTitle(m, lang)}</span>
                            <span className="block text-xs font-normal text-text-secondary mt-0.5">{info1}</span>
                          </span>
                          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                        </button>
                      </h3>

                      <ModuleMenu
                        mod={m}
                        index={mi}
                        total={modules.length}
                        isEditing={editing}
                        onToggleEdit={() => {
                          setOpenId(m.id);
                          setEditId(editing ? '' : m.id);
                        }}
                        onMoveUp={async () => {
                          await st.swapModules(me, m, modules[mi - 1]);
                          reload();
                        }}
                        onMoveDown={async () => {
                          await st.swapModules(me, m, modules[mi + 1]);
                          reload();
                        }}
                        onDelete={() => setAskMod(m)}
                      />
                    </div>

                    {open && (
                      <div className="space-y-3 border-t border-border bg-surface-2/20 p-3 sm:p-4">
                        {editing && (
                          <div className="rounded-xl border border-border bg-surface p-3 sm:p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-text">Модуль параметрлерін өңдеу</h4>
                              <Button variant="secondary" className="!min-h-[34px] text-xs font-semibold px-3" onClick={() => setEditId('')}>Дайын</Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                aria-label="Модуль атауы"
                                defaultValue={m.title}
                                key={m.title}
                                maxLength={80}
                                placeholder="Модуль атауы"
                                onBlur={async e => {
                                  const v = e.target.value.trim();
                                  if (v && v !== m.title) {
                                    await st.renameModule(me, m.id, v);
                                    reload();
                                  }
                                }}
                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                className="min-h-[40px] min-w-0 flex-1 rounded-md border border-border-input bg-surface px-3 font-semibold text-sm"
                              />
                            </div>
                          </div>
                        )}

                        {!editing && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                            <Button
                              variant="secondary"
                              className="!min-h-[38px] gap-1.5 text-xs sm:text-sm font-semibold shadow-sm"
                              onClick={() => { window.location.hash = 'edit/new?module=' + encodeURIComponent(m.id); }}
                            >
                              <Plus size={16} aria-hidden="true" />
                              <span>Дәріс жасау</span>
                            </Button>
                            {free.length > 0 && <span className="text-xs text-text-muted">немесе дайын дәрісті қосыңыз</span>}
                          </div>
                        )}

                        {ps.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-text-muted bg-surface/40">
                            Бұл модульде әзірге дәріс жоқ.
                          </div>
                        ) : (
                          <ol className="space-y-2">
                            {ps.map((p, i) => {
                              const l = lesson(p.lesson_id)!;
                              return (
                                <li key={p.lesson_id} className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface p-2.5 sm:p-3 transition-all hover:border-accent/40 hover:bg-surface-2/60 hover:shadow-sm">
                                  <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-bold text-text-secondary group-hover:bg-accent group-hover:text-on-accent transition-colors">
                                      {i + 1}
                                    </span>
                                    <a href={'#edit/' + l.id} className="min-w-0 font-medium text-text hover:text-accent transition-colors break-words text-sm sm:text-base leading-snug">
                                      {lessonTitle(l, lang)}
                                    </a>
                                  </div>

                                  {!editing && (
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                      <Button
                                        variant="success"
                                        className="!min-h-[38px] px-3.5 gap-1.5 text-xs sm:text-sm font-semibold shadow-sm"
                                        disabled={!!DEMO}
                                        title={!clsName ? 'Сынып таңдалмаса да жалпы сабақ ретінде басталады' : DEMO ? 'Демо режимде сабақ басталмайды' : undefined}
                                        loading={busyStart === l.id}
                                        onClick={() => start(l.id)}
                                        aria-label={`${lessonTitle(l, lang)}: бастау`}
                                      >
                                        <Play size={14} className="fill-current" aria-hidden="true" />
                                        <span>Бастау</span>
                                      </Button>

                                      <LinkButton
                                        href={'#edit/' + l.id}
                                        variant="secondary"
                                        className="!min-h-[38px] px-3 gap-1.5 text-xs sm:text-sm font-medium"
                                        aria-label={`${lessonTitle(l, lang)}: өңдеу`}
                                      >
                                        <Pencil size={14} aria-hidden="true" />
                                        <span>Өңдеу</span>
                                      </LinkButton>

                                      <button
                                        type="button"
                                        onClick={() => shareLesson(l.id, lessonTitle(l, lang))}
                                        title={copiedId === l.id ? 'Сілтеме көшірілді!' : 'Сілтемені бөлісу'}
                                        aria-label={`${lessonTitle(l, lang)}: бөлісу`}
                                        className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-md border px-3 text-xs sm:text-sm font-medium transition-colors ${
                                          copiedId === l.id
                                            ? 'border-success/40 bg-success-soft text-success'
                                            : 'border-border bg-surface text-text hover:bg-surface-2'
                                        }`}
                                      >
                                        {copiedId === l.id ? (
                                          <>
                                            <Check size={14} className="text-success" aria-hidden="true" />
                                            <span className="font-semibold text-success">Көшірілді!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Share2 size={14} className="text-text-secondary" aria-hidden="true" />
                                            <span>Бөлісу</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}

                                  {editing && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        disabled={i === 0}
                                        onClick={async () => {
                                          await st.swapLessons(me, p, ps[i - 1]);
                                          reload();
                                        }}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-2 disabled:opacity-30"
                                      >
                                        <ArrowUp size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={i === ps.length - 1}
                                        onClick={async () => {
                                          await st.swapLessons(me, p, ps[i + 1]);
                                          reload();
                                        }}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-2 disabled:opacity-30"
                                      >
                                        <ArrowDown size={16} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await st.unplaceLesson(me, l.id);
                                          reload();
                                        }}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-danger hover:bg-danger-soft"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {askMod && (
            <div role="alertdialog" className="flex flex-wrap items-center gap-3 rounded-xl bg-danger-soft p-4 text-sm text-danger border border-danger/30">
              <span className="flex-1 font-medium">
                «{askMod.title}» модулі өшіріледі. Ішіндегі дәрістер сақталады, тек модульден шығады.
              </span>
              <Button
                variant="danger"
                onClick={async () => {
                  const m = askMod;
                  setAskMod(null);
                  await st.delModule(me, m.id);
                  reload();
                }}
              >
                Өшіру
              </Button>
              <Button variant="secondary" onClick={() => setAskMod(null)}>Болдырмау</Button>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: INFORMATION */}
      {tab === 'info' && (
        <section aria-label="Курс ақпараты және мұқабасы" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-bold">Курс баптаулары мен мұқабасы</h2>
              <p className="text-xs text-text-secondary">
                Курс карточкасын, мұқаба суретін, сипаттамасы мен мақсаттарын өңдеңіз
              </p>
            </div>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-success animate-in fade-in">
                  <Check size={16} /> Сақталды!
                </span>
              )}
              <Button
                variant="primary"
                loading={saving}
                onClick={() => handleSaveInfo()}
                className="gap-2 font-semibold shadow-sm"
              >
                <Save size={16} aria-hidden="true" />
                <span>Сақтау</span>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
            {/* Left Column: Live Course Card Preview */}
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-sm text-text">Course Card Preview</h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Курс карточкасының оқушылар мен мұғалімдерге көрінісі
                </p>
              </div>

              <div className="sticky top-6">
                <CourseCardPreview
                  title={title || course.title}
                  description={description}
                  subject={subject || course.subject}
                  grade={grade ? +grade : course.grade}
                  instructor={instructor || 'Мұғалім'}
                  level={level || 'Орташа деңгей'}
                  coverUrl={coverUrl}
                  modulesCount={modules.length}
                  lessonsCount={totalLessons}
                />
              </div>
            </div>

            {/* Right Column: Settings & Details Form */}
            <form onSubmit={handleSaveInfo} className="space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm">
              <Field label="Курс атауы (Title)">
                {id => (
                  <input
                    id={id}
                    className={inputCls}
                    value={title}
                    maxLength={100}
                    placeholder="Мысалы: Бағдарламалау негіздері: Python & C++"
                    onChange={e => setTitle(e.target.value)}
                    required
                  />
                )}
              </Field>

              <Field label="Сипаттамасы мен оқу мақсаты (Description)">
                {id => (
                  <textarea
                    id={id}
                    rows={4}
                    className={`${inputCls} resize-y min-h-[96px]`}
                    value={description}
                    placeholder="Курстың негізгі мақсаты, оқушылар не үйренеді және қандай тақырыптар қамтылған..."
                    onChange={e => setDescription(e.target.value)}
                  />
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Бағыты немесе Пән (Course Category)">
                  {id => (
                    <input
                      id={id}
                      className={inputCls}
                      value={subject}
                      placeholder="Мысалы: Информатика, UI/UX, Робототехника"
                      onChange={e => setSubject(e.target.value)}
                    />
                  )}
                </Field>

                <Field label="Жауапты оқытушы (Assigned Instructor)">
                  {id => (
                    <input
                      id={id}
                      className={inputCls}
                      value={instructor}
                      placeholder="Мысалы: Бағдәулет Әбдікәрім"
                      onChange={e => setInstructor(e.target.value)}
                    />
                  )}
                </Field>
              </div>

              {/* Course Thumbnail section */}
              <div className="space-y-3 rounded-xl border border-border/80 bg-surface-2/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-text">Курс мұқабасы (Course Thumbnail)</label>
                  {coverUrl && (
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      className="text-xs text-danger hover:underline"
                    >
                      Суретті өшіру
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    type="url"
                    className={`${inputCls} flex-1 min-w-[14rem]`}
                    value={coverUrl}
                    placeholder="Суреттің тікелей URL сілтемесін енгізіңіз (https://...)"
                    onChange={e => setCoverUrl(e.target.value)}
                  />
                </div>

                {/* Preset Cover Palettes */}
                <div>
                  <span className="text-xs font-medium text-text-muted">Дайын сапалы мұқабалар:</span>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESET_COVERS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setCoverUrl(p.url)}
                        className={`group relative flex h-20 w-full overflow-hidden rounded-xl border text-left transition-all ${
                          coverUrl === p.url
                            ? 'border-accent ring-2 ring-accent shadow-md'
                            : 'border-border hover:border-accent/50'
                        }`}
                      >
                        <img src={p.url} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 flex items-end">
                          <span className="text-[11px] font-bold text-white leading-tight drop-shadow">{p.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Сынып параллелі (Grade)">
                  {id => (
                    <select id={id} className={inputCls} value={grade} onChange={e => setGrade(e.target.value)}>
                      <option value="">Көрсетілмейді</option>
                      {Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1}-сынып</option>)}
                    </select>
                  )}
                </Field>

                <Field label="Күрделілік деңгейі (Level)">
                  {id => (
                    <select id={id} className={inputCls} value={level} onChange={e => setLevel(e.target.value)}>
                      <option value="">Таңдалмаған</option>
                      <option value="Бастапқы (Beginner)">Бастапқы (Beginner)</option>
                      <option value="Орташа (Intermediate)">Орташа (Intermediate)</option>
                      <option value="Тереңдетілген (Advanced)">Тереңдетілген (Advanced)</option>
                    </select>
                  )}
                </Field>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-text-muted">Өзгерістер бірден сақталады.</span>
                <Button type="submit" variant="primary" loading={saving} className="gap-2 font-semibold">
                  <Save size={16} />
                  <span>Сақтау</span>
                </Button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* TAB 3: ANALYSIS */}
      {tab === 'analysis' && (
        <section aria-label="Өтілген сабақтар жайлы анализ" className="space-y-5">
          <div>
            <h2 className="text-xl font-bold">Курс бойынша талдау және мониторинг</h2>
            <p className="text-xs text-text-secondary">
              Курс дәрістерінің өткізілу барысы, оқушылар белсенділігі мен нәтижелері
            </p>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <span className="text-xs text-text-secondary font-medium">Өткізілген сабақтар</span>
              <p className="mt-1 text-2xl font-black text-text">{sessions.length}</p>
              <span className="text-[11px] text-text-muted">тікелей сессиялар</span>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <span className="text-xs text-text-secondary font-medium">Бағдарлама көлемі</span>
              <p className="mt-1 text-2xl font-black text-accent">{totalLessons}</p>
              <span className="text-[11px] text-text-muted">жалпы дәріс саны</span>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <span className="text-xs text-text-secondary font-medium">Қамтылған сыныптар</span>
              <p className="mt-1 text-2xl font-black text-success">
                {new Set(sessions.map(s => s.className).filter(c => c && c !== 'Сыныпсыз')).size || '—'}
              </p>
              <span className="text-[11px] text-text-muted">параллельдер</span>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <span className="text-xs text-text-secondary font-medium">Модульдер</span>
              <p className="mt-1 text-2xl font-black text-purple-400">{modules.length}</p>
              <span className="text-[11px] text-text-muted">бөлімдер</span>
            </div>
          </div>

          {/* Lessons Progress Map */}
          <Card className="space-y-4">
            <h3 className="font-bold text-sm text-text">Дәрістер бойынша өтілу картасы</h3>
            <div className="space-y-2">
              {modules.map(m => {
                const ps = inModule(m);
                return (
                  <div key={m.id} className="rounded-xl border border-border/80 bg-surface-2/30 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                      <span>{moduleTitle(m, lang)}</span>
                      <span>{ps.length} дәріс</span>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {ps.map(p => {
                        const l = lesson(p.lesson_id);
                        if (!l) return null;
                        const taughtCount = sessions.filter(s => s.lesson_id === l.id).length;
                        return (
                          <div
                            key={p.lesson_id}
                            className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors ${
                              taughtCount > 0
                                ? 'border-success/30 bg-success-soft/30 text-text'
                                : 'border-border/60 bg-surface text-text-secondary'
                            }`}
                          >
                            <span className="truncate font-medium pr-2">{lessonTitle(l, lang)}</span>
                            {taughtCount > 0 ? (
                              <span className="shrink-0 rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-bold text-success">
                                ✓ {taughtCount} рет өтілді
                              </span>
                            ) : (
                              <span className="shrink-0 text-text-muted text-[11px]">
                                Өтілмеген
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent sessions list */}
          <Card className="space-y-3">
            <h3 className="font-bold text-sm text-text">Өтілген сабақтар журналы</h3>
            {loadingSessions ? (
              <Skeleton />
            ) : sessions.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">
                Бұл курс бойынша әлі сабақ өткізілмеген. Силлабус бөлімінен «Бастау» батырмасын басып алғашқы сабақты бастаңыз.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-secondary">
                      <th className="py-2 pr-3 font-semibold">Уақыты</th>
                      <th className="py-2 pr-3 font-semibold">Сабақ тақырыбы</th>
                      <th className="py-2 pr-3 font-semibold">Сынып</th>
                      <th className="py-2 pr-3 font-semibold">Слайдтар</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {sessions.map(s => (
                      <tr key={s.id} className="hover:bg-surface-2/40">
                        <td className="py-2.5 pr-3 text-text-muted whitespace-nowrap">
                          {s.started_at ? fmtDate(s.started_at) : '—'}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-text break-words">
                          {s.title}
                        </td>
                        <td className="py-2.5 pr-3 text-text-secondary">
                          <span className="rounded-md bg-surface-2 px-2 py-0.5 font-medium">
                            {s.className}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-text-muted">
                          {s.slide_count || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      )}
    </main>
  );
}
