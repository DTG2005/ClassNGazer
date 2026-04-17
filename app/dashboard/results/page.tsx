// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { getTeacherCourses, getCoursePolls } from '../../../lib/firestore';
import DashboardShell from '../../components/DashboardShell';
import { SkeletonList, SkeletonGrid } from '../../components/SkeletonCard';

type PollResult = {
  id: string; question: string; options: string[];
  responses: Record<string, number>; status: string;
  courseId: string; courseTitle: string; courseCode: string;
};

export default function ResultsPage() {
  const { user, role, loading: authLoading } = useAuth() as any;
  const router = useRouter();
  const [results, setResults]         = useState<PollResult[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selected, setSelected]       = useState<string | null>(null);

  useEffect(() => { if (!authLoading && (!user || role !== 'teacher')) router.push('/auth'); }, [user, authLoading, router, role]);

  const loadResults = async () => {
    if (!user) return;
    setPageLoading(true);
    try {
      const courses = await getTeacherCourses(user.uid);
      const all: PollResult[] = [];
      await Promise.all(
        courses.map(async (course) => {
          const polls = await getCoursePolls(course.id);
          polls
            .filter(p => p.status === 'ended')
            .forEach(p => all.push({
              ...p, courseId: course.id,
              courseTitle: course.title, courseCode: course.code,
            }));
        })
      );
      setResults(all);
      if (all.length > 0) setSelected(all[0].id);
    } catch (e) { console.error(e); }
    finally { setPageLoading(false); }
  };

  useEffect(() => { if (user) loadResults(); }, [user]);

  const activePoll = results.find(r => r.id === selected);

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
      activeMenu="Results"
      headerTitle={
        <div className="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm">
          <span className="hidden sm:inline">← </span>
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-700 truncate">
            Dashboard
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-900">Results</span>
        </div>
      }
    >
      <div className="flex flex-col md:flex-row h-full -mx-4 md:-mx-6 -mt-4 md:-mt-6">
        {pageLoading ? (
           <div className="p-6 w-full">
               <SkeletonGrid count={3} />
               <div className="mt-8"></div>
               <SkeletonList count={4} />
           </div>
        ) : results.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center w-full">
            <div className="text-3xl mb-3">📊</div>
            <p className="text-sm font-medium text-gray-700">No results yet</p>
            <p className="text-xs text-gray-400 mt-1">Results appear here once you end a poll</p>
            <button onClick={() => router.push('/dashboard/polls')}
              className="mt-6 bg-[#1a2744] text-white text-xs px-5 py-2.5 rounded-lg hover:bg-[#243561] shadow-sm">
              View Active Polls
            </button>
          </div>
        ) : (
          <>
            {/* Left panel — poll list */}
            <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col flex-shrink-0 flex-none max-h-[35vh] md:max-h-none overflow-hidden">
              <div className="px-4 md:px-5 py-4 border-b border-gray-100 bg-gray-50/50 md:bg-white shrink-0">
                <p className="text-xs font-medium text-gray-900 uppercase tracking-widest">Completed Polls</p>
                <p className="text-xs text-gray-400 mt-0.5">{results.length} total history</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {results.map(r => (
                  <button key={r.id} onClick={() => setSelected(r.id)}
                    className={`w-full text-left px-4 md:px-5 py-3.5 border-b border-gray-50 transition-colors ${
                      selected === r.id ? 'bg-[#1a2744]/5 border-l-[3px] md:border-l-[4px] border-l-[#1a2744]' : 'border-l-[3px] border-l-transparent hover:bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{r.courseCode}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 pr-2">{r.question}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                      {Object.values(r.responses || {}).reduce((a, b) => a + b, 0)} responses
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel — result detail */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#FAFAF8]">
              {activePoll ? (
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                  <div className="max-w-3xl mx-auto">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-mono bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded">{activePoll.courseCode}</span>
                      <span className="text-xs text-gray-400 font-medium">{activePoll.courseTitle}</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6 md:mb-8 leading-snug">{activePoll.question}</h2>

                    {/* Bar chart */}
                    <div className="shadow-sm">
                      <ResultChart poll={activePoll} />
                    </div>

                    {/* Summary */}
                    <div className="mt-6 md:mt-8 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <p className="text-xs font-medium text-gray-600 mb-4 uppercase tracking-wider">Poll Summary</p>
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                          <p className="text-2xl md:text-3xl font-semibold text-[#1a2744]">
                            {Object.values(activePoll.responses || {}).reduce((a, b) => a + b, 0)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Total responses</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                          <p className="text-2xl md:text-3xl font-semibold text-gray-700">
                            {activePoll.options.length}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Answer options</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Select a poll to view results.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function ResultChart({ poll }: { poll: PollResult }) {
  const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const COLORS = ['#1a2744', '#F5A623', '#1D9E75', '#378ADD', '#7F77DD', '#D85A30'];
  const total  = Object.values(poll.responses || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4">
      {poll.options.map((opt, i) => {
        const count = poll.responses?.[i] ?? 0;
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
        const isTop = count === Math.max(...Object.values(poll.responses || { 0: 0 })) && count > 0;

        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 flex-1 pr-4">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 shadow-sm"
                  style={{ background: COLORS[i % COLORS.length] }}>
                  {LABELS[i]}
                </span>
                <span className="text-sm font-medium text-gray-800 leading-tight">{opt}</span>
                {isTop && <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest bg-amber-50 border border-amber-200/50 text-[#F5A623] px-2 py-0.5 rounded shadow-sm">Top answer</span>}
              </div>
              <div className="flex items-center gap-3 text-xs md:text-sm text-gray-500 shrink-0">
                <span className="tabular-nums font-medium">{count} votes</span>
                <span className="font-bold text-[#1a2744] w-10 text-right tabular-nums">{pct}%</span>
              </div>
            </div>
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden shadow-inner flex">
              {pct > 0 ? (
                <div className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-2 shadow-sm"
                  style={{ width: `${Math.max(pct, 2)}%`, background: COLORS[i % COLORS.length] }} />
              ) : null}
            </div>
            {isTop && <span className="sm:hidden inline-block mt-2 text-[10px] uppercase font-bold tracking-widest bg-amber-50 border border-amber-200/50 text-[#F5A623] px-2 py-0.5 rounded shadow-sm">Top answer</span>}
          </div>
        );
      })}
    </div>
  );
}