// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { auth } from '../../../../lib/firebase';
import { useAuth } from '../../../../context/AuthContext';
import { getCourse } from '../../../../lib/firestore';
import ClassroomView from '../../../components/ClassroomView';
import QuizView from '../../../components/quiz/QuizView';
import DashboardShell from '../../../components/DashboardShell';
import { SkeletonGrid } from '../../../components/SkeletonCard';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <SkeletonGrid count={6} />
      </div>
    );
  }

  if (!course) {
    return (
      <DashboardShell
        role={role}
        user={user}
        activeMenu="My Courses"
        headerTitle="Course Not Found"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500 mb-3">Course not found.</p>
            <button onClick={() => router.push('/dashboard')} className="text-sm text-[#1a2744] underline">Back to dashboard</button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // Enforce access control
  const isTeacher = role === 'teacher' || role === 'professor';
  const hasAccess = isTeacher 
    ? course.professorId === user?.uid 
    : course.students?.includes(user?.uid);

  if (!hasAccess) {
    return (
      <DashboardShell
        role={role}
        user={user}
        activeMenu="Access Denied"
        headerTitle="Access Denied"
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-500 mb-3">You do not have access to this course.</p>
            <button onClick={() => router.push(isTeacher ? '/dashboard/courses' : '/dashboard')} className="text-sm text-[#1a2744] underline">Back to dashboard</button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // Build user object with the role field that ClassroomView expects
  const classroomUser = user ? {
    uid: user.uid,
    name: user.displayName || user.name || 'User',
    displayName: user.displayName || user.name || 'User',
    email: user.email,
    role: role === 'teacher' ? 'professor' : (role || 'student'),
  } : null;

  return (
    <DashboardShell
      role={role}
      user={user}
      activeMenu={course.title || course.courseName || 'Course'}
      headerTitle={
        <div className="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm">
          <span className="hidden sm:inline">← </span>
          <button onClick={() => router.push(role === 'teacher' ? '/dashboard/courses' : '/dashboard')} className="text-gray-400 hover:text-gray-700 truncate max-w-[80px] md:max-w-none">
            <span className="sm:hidden">Courses</span>
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-900 truncate max-w-[120px] md:max-w-xs">{course.title || course.courseName}</span>
          <span className="hidden md:inline-block text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded ml-1">{course.code || course.courseCode}</span>
        </div>
      }
      headerAction={
        course.joinCode && role === 'teacher' ? (
          <div className="text-xs font-mono bg-blue-50 text-blue-600 px-3 py-1 rounded ml-2 shrink-0">
            <span className="hidden sm:inline">Join: </span>
            <span className="font-bold">{course.joinCode}</span>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col h-full -mx-4 md:-mx-6 -mt-4 md:-mt-6">
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
                padding:'12px 20px',
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
              className="md:px-6"
            >
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(' ')[0]} {t.label.split(' ')[1]}</span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
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
        </div>
      </div>
    </DashboardShell>
  );
}