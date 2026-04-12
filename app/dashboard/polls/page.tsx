// @ts-nocheck
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { getTeacherCourses, getCoursePolls, endPoll } from '../../../lib/firestore';

type PollWithCourse = {
  id: string; question: string; options: string[];
  timer: number; status: string; responses: Record<string, number>;
  courseId: string; courseTitle: string; courseCode: string;
};

export default function ActivePollsPage() {
  const { user, loading: authLoading } = useAuth() as any;
  const router = useRouter();
  const [polls, setPolls]             = useState<PollWithCourse[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [acting, setActing]           = useState<string | null>(null);

  useEffect(() => { if (!authLoading && !user) router.push('/auth'); }, [user, authLoading, router]);

  const loadPolls = useCallback(async () => {
    if (!user) return;
    setPageLoading(true);
    try {
      const courses = await getTeacherCourses(user.uid);
      const all: PollWithCourse[] = [];
      await Promise.all(
        courses.map(async (course) => {
          const polls = await getCoursePolls(course.id) as any[];
          polls.forEach(p => all.push({
            ...p, courseId: course.id,
            courseTitle: course.title, courseCode: course.code,
          }));
        })
      );
      // Sort: active first, then draft, then ended
      all.sort((a, b) => {
        const order = { active: 0, draft: 1, ended: 2 };
        return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
      });
      setPolls(all);
    } catch (e) { console.error(e); }
    finally { setPageLoading(false); }
  }, [user]);

  useEffect(() => { if (user) loadPolls(); }, [user, loadPolls]);

  const handleEnd = async (courseId: string, pollId: string) => {
    setActing(pollId);
    try { await endPoll(courseId, pollId); await loadPolls(); }
    finally { setActing(null); }
  };

  const active = polls.filter(p => p.status === 'active');
  const draft  = polls.filter(p => p.status === 'draft');

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1a2744] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-white text-lg font-medium">i<span className="text-[#F5A623]">●</span>Clicker</p>
          <p className="text-white/40 text-xs mt-0.5">Teacher Portal</p>
        </div>
        <nav className="flex-1 px-2.5 py-3">
          <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-3 mb-1.5">Menu</p>
          <NavItem label="Dashboard"    onClick={() => router.push('/dashboard')} />
          <NavItem label="My Courses"   onClick={() => router.push('/dashboard/courses')} />
          <NavItem label="Active Polls" active />
          <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-4 mb-1.5">Manage</p>
          <NavItem label="Create Course" onClick={() => router.push('/dashboard/courses')} />
          <NavItem label="Results"       onClick={() => router.push('/dashboard/results')} />
        </nav>
        <div className="px-2.5 py-3.5 border-t border-white/10">
          <button onClick={async () => { await signOut(auth); router.push('/'); }}
            className="px-2.5 py-2 rounded-lg text-white/45 text-sm hover:text-red-400 w-full text-left">Log out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</button>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900">Active Polls</span>
            {active.length > 0 && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full animate-pulse">
                {active.length} live
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-2xl font-medium text-green-600">{active.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Live right now</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-2xl font-medium text-gray-500">{draft.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Drafts ready</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-2xl font-medium text-gray-900">{polls.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total polls</p>
            </div>
          </div>

          {active.length === 0 && draft.length === 0 && polls.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 flex flex-col items-center">
              <div className="text-3xl mb-3">🗳️</div>
              <p className="text-sm font-medium text-gray-700">No polls yet</p>
              <p className="text-xs text-gray-400 mt-1">Go to a course to create your first poll</p>
              <button onClick={() => router.push('/dashboard/courses')}
                className="mt-4 bg-[#1a2744] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#243561]">
                Go to My Courses
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Live polls */}
              {active.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">🟢 Live Now</p>
                  <div className="space-y-3">
                    {active.map(poll => (
                      <PollRow key={poll.id} poll={poll} acting={acting}
                        onEnd={() => handleEnd(poll.courseId, poll.id)}
                        onNavigate={() => router.push(`/dashboard/courses/${poll.courseId}`)} />
                    ))}
                  </div>
                </div>
              )}
              {/* Draft polls */}
              {draft.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">📋 Drafts — ready to start</p>
                  <div className="space-y-3">
                    {draft.map(poll => (
                      <PollRow key={poll.id} poll={poll} acting={acting}
                        onEnd={() => handleEnd(poll.courseId, poll.id)}
                        onNavigate={() => router.push(`/dashboard/courses/${poll.courseId}`)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PollRow({ poll, acting, onEnd, onNavigate }: {
  poll: PollWithCourse; acting: string | null;
  onEnd: () => void; onNavigate: () => void;
}) {
  const totalResponses = Object.values(poll.responses || {}).reduce((a, b) => a + b, 0);
  return (
    <div className={`bg-white border rounded-xl p-4 flex items-start justify-between gap-4 ${
      poll.status === 'active' ? 'border-green-200' : 'border-gray-200'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{poll.courseCode}</span>
          <span className="text-xs text-gray-400 truncate">{poll.courseTitle}</span>
        </div>
        <p className="text-sm font-medium text-gray-900 truncate">{poll.question}</p>
        <p className="text-xs text-gray-400 mt-1">
          {poll.options.length} options · ⏱ {poll.timer}s
          {poll.status === 'active' && ` · ${totalResponses} responses`}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onNavigate}
          className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:border-gray-300 transition-colors">
          Open Course
        </button>
        {poll.status === 'active' && (
          <button onClick={onEnd} disabled={acting === poll.id}
            className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1.5">
            {acting === poll.id
              ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              : '■'} End
          </button>
        )}
      </div>
    </div>
  );
}

function NavItem({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center px-2.5 py-2 rounded-lg text-sm w-full text-left mb-0.5 transition-colors ${
        active ? 'bg-[#F5A623] text-[#1a2744] font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white/90'
      }`}>
      {label}
    </button>
  );
}