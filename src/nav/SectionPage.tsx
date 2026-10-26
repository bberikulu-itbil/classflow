import React, { useEffect } from 'react';
import { SoonChip, SoonCard } from '../ui';
import { activeSection, activeSub, firstReady } from './config';
import type { Role, Section } from './config';
import { Jeopardy } from '../views/Jeopardy';
import { ClassesView } from '../views/ClassesView';
import { ReviewQueue } from '../views/ReviewQueue';
import { Projects } from '../views/Projects';
import { PastSessions } from '../views/lessons';
import { LessonsGallery } from '../lessons/LessonsGallery';
import { Gradebook } from '../journal/Gradebook';
import { CoursesView, ModulesView } from '../curriculum/Views';
import { ScheduleView } from '../schedule/View';
import { StudentFeedback } from '../views/student';
import { VocabBase, VocabLink, VocabTest, VocabShare } from '../vocab/Teacher';
import { StudentVocab, StudentCards, StudentQuiz } from '../vocab/Student';
import { ProfileCard } from '../components/ProfileView';

export function SectionTabs({ section, active }: { section: Section; active: string }) {
  return (
    <nav aria-label={`${section.label} бөлімдері`} className="border-b border-border overflow-x-auto overscroll-x-contain">
      <ul className="flex gap-1 min-w-max pb-1">
        {section.subs.map(s => (
          <li key={s.key}>
            <a href={'#' + (s.to ?? `${section.key}/${s.key}`)} aria-current={s.key === active ? 'page' : undefined}
              className={`flex items-center gap-2 min-h-[44px] px-3 text-sm whitespace-nowrap border-b-2 ${s.key === active ? 'border-accent text-on-accent-soft bg-accent-soft font-semibold rounded-t-lg' : 'border-transparent text-text-secondary hover:text-text hover:bg-surface-2 rounded-t-lg'}`}>
              {s.icon && <s.icon size={18} aria-hidden="true" className="shrink-0" />}{s.label}{!s.to && <SoonChip />}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Puts the section's tab strip above an older screen (assign, review, plans) so it sits inside the new menu. */
export function SectionFrame({ role, routeKey, routeId, width = '5xl', children }: { role: Role; routeKey: string; routeId: string; width?: '3xl' | '5xl'; children: React.ReactNode }) {
  const s = activeSection(role, routeKey);
  const sub = s && activeSub(s, routeKey, routeId);
  return (
    <>
      {s && s.subs.length > 0 && (
        <div className={`${width === '3xl' ? 'max-w-3xl' : 'max-w-5xl'} mx-auto px-4 pt-4`}>
          <SectionTabs section={s} active={sub?.key || ''} />
        </div>
      )}
      {children}
    </>
  );
}

interface Ctx { me: any; onLogout: () => void }
const VIEWS: Record<string, (c: Ctx) => React.ReactNode> = {
  'teacher:lessons:mine': c => <LessonsGallery me={c.me} />,
  'teacher:journal:lessons': c => <PastSessions meId={c.me.id} />,
  'teacher:tasks:queue': () => <ReviewQueue />,
  'teacher:tasks:projects': c => <Projects me={c.me} />,
  'teacher:tasks:jeopardy': c => <Jeopardy me={c.me} />,
  'teacher:lessons:courses': c => <CoursesView me={c.me} />,
  'teacher:lessons:modules': c => <ModulesView me={c.me} />,
  'teacher:lessons:schedule': c => <ScheduleView me={c.me} />,
  'teacher:journal:grid': c => <Gradebook me={c.me} />,
  'teacher:journal:classes': () => <ClassesView />,
  'teacher:settings:profile': c => <ProfileCard me={c.me} onLogout={c.onLogout} />,
  'teacher:vocab:base': c => <VocabBase me={c.me} />,
  'teacher:vocab:link': c => <VocabLink me={c.me} />,
  'teacher:vocab:test': c => <VocabTest me={c.me} />,
  'teacher:vocab:share': c => <VocabShare me={c.me} />,
  'student:grades:feedback': () => <StudentFeedback />,
  'student:vocab:mine': c => <StudentVocab me={c.me} />,
  'student:vocab:cards': c => <StudentCards me={c.me} />,
  'student:vocab:test': c => <StudentQuiz me={c.me} />,
};

export function SectionPage({ role, section, subKey, me, onLogout }: { role: Role; section: Section; subKey: string; me: any; onLogout: () => void }) {
  const ready = firstReady(section);
  const sub = section.subs.find(s => s.key === subKey) ?? ready;
  // a tab that points at an older, separate screen (plans, assign, editor): go there
  const away = sub?.to && sub.to !== `${section.key}/${sub.key}` ? sub.to : '';
  useEffect(() => { if (away) window.location.replace('#' + away); }, [away]);

  if (!ready) {
    return (
      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">{section.label}</h1>
        <p className="text-text-secondary">Бұл бөлім әзірленуде. Төменде ішінде не болатыны көрсетілген.</p>
        <div className="grid gap-3 sm:grid-cols-2">{section.subs.map(s => <SoonCard key={s.key} title={s.label} items={s.items} />)}</div>
      </main>
    );
  }
  if (!sub || away) return null;
  const view = VIEWS[`${role}:${section.key}:${sub.key}`];
  return (
    <main className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">{section.label}</h1>
      <SectionTabs section={section} active={sub.key} />
      {view ? view({ me, onLogout }) : <SoonCard title={sub.label} items={sub.items} />}
    </main>
  );
}
