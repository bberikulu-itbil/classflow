import React, { useState, useEffect } from 'react';
import { sb, STAFF, DEMO } from './config';
import { LoginView } from './components/LoginView';
import { RemoteView } from './components/RemoteView';
import { BoardView } from './components/BoardView';
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
import { activeSection } from './nav/config';
import type { Role } from './nav/config';
import { TeacherHomeView } from './views/TeacherHomeView';
import { StudentHomeView } from './views/StudentHomeView';
import { SharedEdit, SharedGame } from './views/Jeopardy';
import { LessonDetail } from './lessons/LessonDetail';

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
    const { data } = await sb.from('profiles').select('id,full_name,role,school_id,class_id').eq('id', session.user.id).maybeSingle();
    if (!data) {
      alert('Профиль табылмады');
      await sb.auth.signOut();
      setMe(null);
      setLoading(false);
      return;
    }
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
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Жүктелуде...</div>;
  }

  if (!me) {
    return <LoginView onLogin={boot} />;
  }

  if (routeKey === 'join') {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Сабаққа қосылуда...</div>;
  }

  const isStaff = STAFF.includes(me.role);
  const role: Role = isStaff ? 'teacher' : 'student';
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
  if (routeKey === 'lesson' && isStaff) return framed('5xl', <LessonDetail key={routeId} id={routeId} me={me} />);
  if (routeKey === 'plans' && isStaff) return framed('5xl', <PlansView />);
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
  if (routeKey === 's') {
    return <StudentSessionView sid={routeId} me={me} />;
  }
  if (routeKey === 'plan' && isStaff) {
    return <PlanEditorView id={routeId} me={me} onLogout={logout} />;
  }
  if (routeKey === 'edit' && isStaff) {
    return <LessonEditorView id={routeId} me={me} onLogout={logout} />;
  }

  const section = activeSection(role, routeKey);
  if (section && routeKey !== '' && section.key === routeKey) {
    return shell(<SectionPage role={role} section={section} subKey={routeId} me={me} onLogout={logout} />);
  }
  return shell(isStaff ? <TeacherHomeView me={me} /> : <StudentHomeView me={me} />);
}
