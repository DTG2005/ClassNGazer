// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../../../lib/firebase';
import { useAuth } from '../../../../context/AuthContext';
import { getCourse } from '../../../../lib/firestore';
import ClassroomView from '../../../components/ClassroomView';
import QuizView from '../../../components/quiz/QuizView';

// ─── Main Page ───────────────────────────────────────────────────
export default function CoursePage() {
  const { user, role, loading: authLoading } = useAuth();
  const router       = useRouter();
  const params       = useParams();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'polls'|'quizzes'>(
    (searchParams?.get('tab') as 'polls'|'quizzes') || 'polls'
  );
  const courseId = params.id;

  const [course, setCourse]           = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && courseId) {
      getCourse(courseId).then(c => {
        setCourse(c);
        setPageLoading(false);
      }).catch(() => setPageLoading(false));
    }
  }, [user, courseId]);

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-3">Course not found.</p>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-[#1a2744] underline">Back to dashboard</button>
        </div>
      </div>
    );
  }

  // Build user object with the role field that ClassroomView expects
  // AuthContext maps professor→teacher, but ClassroomView expects 'professor'
  const classroomUser = user ? {
    uid: user.uid,
    name: user.displayName || user.name || 'User',
    displayName: user.displayName || user.name || 'User',
    email: user.email,
    role: role === 'teacher' ? 'professor' : (role || 'student'),
  } : null;

  const firstName = user?.displayName?.split(' ')[0] || 'User';
  const isTeacher = role === 'teacher';

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1a2744] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-white text-lg font-medium tracking-tight">
            <span className="text-[#F5A623]">●</span> ClassNGazer
          </p>
          <p className="text-white/40 text-xs mt-0.5">{isTeacher ? 'Teacher Portal' : 'Student Portal'}</p>
        </div>
        <nav className="flex-1 px-2.5 py-3">
          <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-3 mb-1.5">Menu</p>
          <NavItem label="Dashboard" onClick={() => router.push('/dashboard')} />
          <NavItem label={course.title || course.courseName || 'Course'} active />
          {isTeacher && (
            <>
              <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-4 mb-1.5">Manage</p>
              <NavItem label="Active Polls" onClick={() => router.push('/dashboard/polls')} />
              <NavItem label="Results" onClick={() => router.push('/dashboard/results')} />
            </>
          )}
        </nav>
        <div className="px-2.5 py-3.5 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[#F5A623] flex items-center justify-center text-[#1a2744] text-xs font-bold">
              {firstName[0]}
            </div>
            <div>
              <p className="text-white text-xs font-medium">{firstName}</p>
              <p className="text-white/40 text-[10px]">{isTeacher ? 'Teacher' : 'Student'}</p>
            </div>
          </div>
          <button onClick={async () => { await signOut(auth); router.push('/'); }}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white/45 text-sm hover:text-red-400 w-full text-left transition-colors">
            Log out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')}
              className="text-gray-400 hover:text-gray-700 transition-colors text-sm">← Dashboard</button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900">{course.title || course.courseName}</span>
            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{course.code || course.courseCode}</span>
            {course.joinCode && (
              <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Join: {course.joinCode}</span>
            )}
          </div>
        </header>

        {/* Polls / Quizzes tab bar */}
        <div style={{ display:'flex', borderBottom:'2px solid #EDEDEA', background:'#F7F6F4', flexShrink:0 }}>
          {[
            { key:'polls',   label:'📊 Polls',  accent:'#FF6B2B' },
            { key:'quizzes', label:'🧠 Quizzes', accent:'#7C3AED' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key as 'polls'|'quizzes');
                router.replace(`/dashboard/courses/${courseId}?tab=${t.key}`, { scroll:false });
              }}
              style={{
                padding:'10px 24px',
                fontSize:'13px',
                fontWeight:700,
                border:'none',
                background:'transparent',
                cursor:'pointer',
                transition:'all 0.15s',
                color:         activeTab===t.key ? t.accent : '#9B9A94',
                borderBottom:  `3px solid ${activeTab===t.key ? t.accent : 'transparent'}`,
                marginBottom: '-2px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content area — swaps between Polls and Quizzes */}
        <main className="flex-1 overflow-y-auto">
          {classroomUser && activeTab === 'polls' && (
            <ClassroomView
              user={classroomUser}
              courseId={courseId}
              courseName={course.title || course.courseName || ''}
              courseCode={course.code || course.courseCode || ''}
              joinCode={course.joinCode || ''}
            />
          )}
          {classroomUser && activeTab === 'quizzes' && (
            <QuizView
              user={classroomUser}
              courseId={courseId}
              courseName={course.title || course.courseName || ''}
              courseCode={course.code || course.courseCode || ''}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── NavItem ─────────────────────────────────────────────────────
function NavItem({ label, active, highlight, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm w-full text-left mb-0.5 transition-colors ${
        active    ? 'bg-[#F5A623] text-[#1a2744] font-medium' :
        highlight ? 'bg-white/10 text-white font-medium' :
                    'text-white/60 hover:bg-white/10 hover:text-white/90'
      }`}>
      {label}
    </button>
  );
}