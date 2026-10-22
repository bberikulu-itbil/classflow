import React, { useState, useEffect } from 'react';
import { sb, STAFF } from './config';
import { LoginView } from './components/LoginView';
import { StudentHome } from './components/StudentHome';
import { TeacherHome } from './components/TeacherHome';
import { RemoteView } from './components/RemoteView';
import { BoardView } from './components/BoardView';
import { StudentSessionView } from './components/StudentSessionView';
import { PlansView } from './components/PlansView';
import { PlanEditorView } from './components/PlanEditorView';
import { ProfileView } from './components/ProfileView';
import { LessonEditorView } from './components/LessonEditorView';

export default function App() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
    boot();
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

  if (routeKey === 'profile') {
    return <ProfileView me={me} onLogout={() => setMe(null)} />;
  }

  if (routeKey === 'remote' && isStaff) {
    return <RemoteView sid={routeId} me={me} onLogout={() => setMe(null)} />;
  }
  if (routeKey === 'board' && isStaff) {
    return <BoardView sid={routeId} />;
  }
  if (routeKey === 's') {
    return <StudentSessionView sid={routeId} me={me} />;
  }
  if (routeKey === 'plans' && isStaff) {
    return <PlansView me={me} onLogout={() => setMe(null)} />;
  }
  if (routeKey === 'plan' && isStaff) {
    return <PlanEditorView id={routeId} me={me} onLogout={() => setMe(null)} />;
  }
  if (routeKey === 'edit' && isStaff) {
    return <LessonEditorView id={routeId} me={me} onLogout={() => setMe(null)} />;
  }

  return isStaff ? <TeacherHome me={me} onLogout={() => setMe(null)} /> : <StudentHome me={me} onLogout={() => setMe(null)} />;
}
