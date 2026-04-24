// @ts-nocheck
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { getTeacherCourses, getCoursePolls, endPoll } from '../../../lib/firestore';
import DashboardShell from '../../components/DashboardShell';
import { SkeletonList } from '../../components/SkeletonCard';

type PollWithCourse = {
  id: string; question: string; options: string[];
  timer: number; status: string; responses: Record<string, number>;
  courseId: string; courseTitle: string; courseCode: string;
};

export default function ActivePollsPage() {
  const { user, role, loading: authLoading } = useAuth() as any;
  const router = useRouter();
  const [polls, setPolls]             = useState<PollWithCourse[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [acting, setActing]           = useState<string | null>(null);

  useEffect(() => { if (!authLoading && (!user || role !== 'teacher')) router.push('/auth'); }, [user, authLoading, router, role]);

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <SkeletonList count={6} />
      </div>
    );
  }

  return (
    <DashboardShell
      role="teacher"
      user={user}
      activeMenu="Active Polls"
      headerTitle={
        <div className="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm">
          <span className="hidden sm:inline">← </span>
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-700 truncate">
            Dashboard
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-900">Active Polls</span>
        </div>
      }
      headerAction={
        active.length > 0 && (
          <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full animate-pulse border border-green-100 flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="font-medium">{active.length} live</span>
          </span>
        )
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
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

      {pageLoading ? (
        <SkeletonList count={4} />
      ) : active.length === 0 && draft.length === 0 && polls.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 md:py-16 flex flex-col items-center text-center px-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3 text-lg font-bold text-gray-400">P</div>
          <p className="text-sm font-medium text-gray-700">No polls yet</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Go to a course to create your first poll</p>
          <button onClick={() => router.push('/dashboard/courses')}
            className="bg-[#1a2744] text-white text-xs px-5 py-2.5 rounded-lg hover:bg-[#243561] shadow-sm">
            Go to My Courses
          </button>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">
          {/* Live polls */}
          {active.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Live Now
              </p>
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
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Drafts — ready to start</p>
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
    </DashboardShell>
  );
}

function PollRow({ poll, acting, onEnd, onNavigate }: {
  poll: PollWithCourse; acting: string | null;
  onEnd: () => void; onNavigate: () => void;
}) {
  const totalResponses = Object.values(poll.responses || {}).reduce((a, b) => a + b, 0);
  return (
    <div className={`bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
      poll.status === 'active' ? 'border-green-200 relative overflow-hidden' : 'border-gray-200'}`}>
      
      {poll.status === 'active' && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-green-500"></div>}
      
      <div className="flex-1 min-w-0 pl-1 md:pl-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{poll.courseCode}</span>
          <span className="text-xs text-gray-400 truncate">{poll.courseTitle}</span>
        </div>
        <p className="text-sm font-medium text-gray-900 line-clamp-2 md:truncate">{poll.question}</p>
        <p className="text-xs text-gray-400 mt-1.5 flex items-center flex-wrap gap-2">
          <span>{poll.options.length} options</span>
          <span className="text-gray-300">•</span>
          <span>⏱ {poll.timer}s</span>
          {poll.status === 'active' && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-[#1a2744] font-medium">{totalResponses} responses</span>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
        <button onClick={onNavigate}
          className="flex-1 md:flex-none text-xs border border-gray-200 text-gray-600 px-3 py-1.5 md:py-2 rounded-lg hover:border-gray-300 transition-colors text-center">
          Open Course
        </button>
        {poll.status === 'active' && (
          <button onClick={onEnd} disabled={acting === poll.id}
            className="flex-1 md:flex-none text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 md:py-2 rounded-lg hover:bg-red-100 hover:border-red-300 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors font-medium">
            {acting === poll.id
              ? <span className="w-3 h-3 border border-red-600/30 border-t-red-600 rounded-full animate-spin" />
              : '■'} End Poll
          </button>
        )}
      </div>
    </div>
  );
}