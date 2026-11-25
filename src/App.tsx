import { adoptAccountPrefs } from './prefs';
import React, { useState, useEffect } from 'react';
import { LessonPreview } from './lessons/Preview';
import { ModulesView } from './curriculum/Views';
import { sb, STAFF, DEMO } from './config';
import { LoginView } from './components/LoginView';
import { RemoteView } from './components/RemoteView';
import { BoardView } from './components/BoardView';
import { ExamPage } from './curriculum/ExamPage';
import { PublicBoard } from './components/PublicBoard';
import { StudentSessionView } from './components/StudentSessionView';
import { PlansView } from './components/PlansView';
import { PlanEditorView } from './components/PlanEditorView';
import { ProfileCard } from './components/ProfileView';
import { LessonEditorView } from './components/LessonEditorView';
import { HomeworkList } from './hw/HomeworkList';
import { HomeworkSolve } from './hw/HomeworkSolve';
import { AssignView } from './hw/AssignView';
import { ReviewView } from './hw/ReviewView';
import { hw } from './hw/types';
import { makeSupaApi } from './hw/supaApi';
import { makeFakeApi, DEMO_STUDENT, DEMO_TEACHER } from './hw/fakeApi';
import { AppShell } from './nav/AppShell';
import { SectionFrame, SectionPage } from './nav/SectionPage';
import { activeSection, hasDuty, setDuties } from './nav/config';
import type { Role } from './nav/config';
import { TeacherHomeView } from './views/TeacherHomeView';
import { Loading } from './ui/Loading';
import { StudentHomeView } from './views/StudentHomeView';
import { SharedEdit, SharedGame } from './views/Jeopardy';
import { LessonDetail } from './lessons/LessonDetail';
import { CourseDetailView } from './curriculum/CourseDetailView';
import { KmjView } from './kmj/KmjView';
import { ExamBuilder } from './exam/ExamBuilder';
import { ContestForm } from './contests/Form';

let demoApi: ReturnType<typeof makeFakeApi> | undefined;

export default function App() {
  const [me, setMe] = useState<any>(DEMO ? (DEMO === 'student' ? DEMO_STUDENT : DEMO_TEACHER) : null);
  const [loading, setLoading] = useState(!DEMO);
  const meRef = React.useRef(me);
  meRef.current = me;
  const [routeKey, setRouteKey] = useState('');
  const [routeId, setRouteId] = useState('');

  const parseRoute = () => {
    const [k, id] = window.location.hash.slice(1).split('/');
    setRouteKey(k || '');
    setRouteId(id || '');
  };

  const boot = async () => {
    setLoading(true);
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      setMe(null);
      setLoading(false);
      return;
    }
    const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (data && (data as any).prefs) adoptAccountPrefs((data as any).prefs);
    if (!data) {
      alert('Профиль табылмады');
      await sb.auth.signOut();
      setMe(null);
      setLoading(false);
      return;
    }
    if (data.role === 'student') { // duties a teacher gave (course author, room helper) open extra screens
      const du = await sb.from('cf_duties').select('duty').eq('student_id', data.id);
      setDuties((du.data || []).map((x: any) => x.duty));
    } else setDuties([]);
    setMe(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!DEMO) boot();
    parseRoute();
    const handleHash = () => parseRoute();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    if (routeKey === 'join') {
      const code = String(routeId || '').replace(/\s/g, '').toUpperCase();
      sb.rpc('cf_join', { p_code: code }).then(({ data, error }) => {
        if (error) {
          alert(error.message);
          window.location.hash = '';
        } else if (data) {
          window.location.hash = 's/' + data.id;
        }
      }, () => {
        window.location.hash = '';
      });
    }
  }, [routeKey, routeId]);

  if (loading) {
    return <Loading />;
  }

  if (routeKey === 'b' && routeId) return <PublicBoard key={routeId} token={routeId} />;

  if (!me) {
    return <LoginView onLogin={boot} />;
  }

  if (routeKey === 'join') {
    return <div data-theme="dark" className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Сабаққа қосылуда...</div>;
  }

  const isStaff = STAFF.includes(me.role);
  const role: Role = isStaff ? 'teacher' : 'student';
  const canAuthor = isStaff || hasDuty('author');
  const logout = () => setMe(null);
  hw.api = DEMO ? (demoApi ||= makeFakeApi(() => meRef.current)) : makeSupaApi(me);
  const shell = (el: React.ReactNode) => (
    <AppShell me={me} role={role} routeKey={routeKey}>
      {el}
      {DEMO && (
        <button className="fixed bottom-3 right-3 z-50 min-h-[44px] px-4 rounded-full bg-text text-surface text-sm font-semibold cursor-pointer shadow-pop"
          onClick={() => { setMe(isStaff ? DEMO_STUDENT : DEMO_TEACHER); window.location.hash = isStaff ? 'hw' : 'assign'; }}>
          Демо: {isStaff ? 'мұғалім' : 'оқушы'} → {isStaff ? 'оқушы' : 'мұғалім'}
        </button>
      )}
    </AppShell>
  );
  const framed = (w: '3xl' | '5xl', el: React.ReactNode) => shell(<SectionFrame role={role} routeKey={routeKey} routeId={routeId} width={w}>{el}</SectionFrame>);

  if (routeKey === 'hw' || (!isStaff && routeKey === 'tasks')) return shell(routeKey === 'hw' && routeId ? <HomeworkSolve key={routeId} id={routeId} /> : <HomeworkList />);
  if (routeKey === 'assign' && isStaff) return framed('3xl', <AssignView />);
  if (routeKey === 'review' && isStaff) return framed('3xl', <ReviewView id={routeId} />);
  if (routeKey === 'lesson' && canAuthor) return framed('5xl', <LessonDetail key={routeId} id={routeId} me={me} />);
  if (routeKey === 'course' && canAuthor) return framed('5xl', <CourseDetailView key={routeId} courseId={routeId} me={me} />);
  if (routeKey === 'exam' && canAuthor) return framed('5xl', <ExamBuilder key={routeId} id={routeId} me={me as any} />);
  if (routeKey === 'kmj' && canAuthor) return framed('5xl', <KmjView key={routeId} lessonId={routeId} me={me as any} />);
  if (routeKey === 'preview' && canAuthor) return framed('5xl', <LessonPreview key={routeId} id={routeId} />);
  if (routeKey === 'plans' && isStaff) return framed('5xl', <PlansView />);
  if (routeKey === 'contest' && isStaff) return framed('3xl', <ContestForm key={routeId} me={me} id={routeId || 'new'} />);
  if (routeKey === 'jeopardy-edit') return shell(<SharedEdit key={routeId} payload={routeId} me={me} canSave={isStaff} />);
  if (routeKey === 'jeopardy') return shell(<SharedGame key={routeId} payload={routeId} me={me} canSave={isStaff} />);
  if (routeKey === 'profile') {
    return shell(
      <main className="max-w-5xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">Профиль</h1>
        <ProfileCard me={me} onLogout={logout} />
      </main>,
    );
  }

  if (routeKey === 'remote' && isStaff) {
    return <RemoteView sid={routeId} me={me} onLogout={logout} />;
  }
  if (routeKey === 'board' && isStaff) {
    return <BoardView sid={routeId} />;
  }
  if (routeKey === 'exam-take' && me.role === 'student') { // the exam page: full screen, no menus (087)
    return <ExamPage lessonId={routeId} me={me} />;
  }
  if (routeKey === 'exam-try' && isStaff) { // the teacher takes the exam as a demo student: nothing is saved
    return <ExamPage lessonId={routeId} me={me} demo />;
  }
  if (routeKey === 's') {
    return <StudentSessionView sid={routeId} me={me} />;
  }
  if (routeKey === 'plan' && canAuthor) {
    return <PlanEditorView id={routeId} me={me} onLogout={logout} />;
  }
  if (routeKey === 'edit' && canAuthor) {
    return <LessonEditorView id={routeId} me={me} onLogout={logout} />;
  }

  const section = activeSection(role, routeKey);
  if (section && routeKey !== '' && section.key === routeKey) {
    return shell(<SectionPage role={role} section={section} subKey={routeId} me={me} onLogout={logout} />);
  }
  return shell(isStaff ? <TeacherHomeView me={me} /> : <StudentHomeView me={me} />);
}
