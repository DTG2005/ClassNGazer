// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { getTeacherCourses, getCoursePolls } from '../../../lib/firestore';

type PollResult = {
  id: string; question: string; options: string[];
  responses: Record<string, number>; status: string;
  courseId: string; courseTitle: string; courseCode: string;
};

export default function ResultsPage() {
  const { user, loading: authLoading } = useAuth() as any;
  const router = useRouter();
  const [results, setResults]         = useState<PollResult[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [selected, setSelected]       = useState<string | null>(null);

  useEffect(() => { if (!authLoading && !user) router.push('/auth'); }, [user, authLoading, router]);

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
          <NavItem label="Active Polls" onClick={() => router.push('/dashboard/polls')} />
          <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-4 mb-1.5">Manage</p>
          <NavItem label="Create Course" onClick={() => router.push('/dashboard/courses')} />
          <NavItem label="Results" active />
        </nav>
        <div className="px-2.5 py-3.5 border-t border-white/10">
          <button onClick={async () => { await signOut(auth); router.push('/'); }}
            className="px-2.5 py-2 rounded-lg text-white/45 text-sm hover:text-red-400 w-full text-left">Log out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {results.length === 0 ? (
          <div className="flex-1 flex flex-col">
            <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 flex-shrink-0 gap-3">
              <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</button>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-medium text-gray-900">Results</span>
            </header>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-3xl mb-3">📊</div>
              <p className="text-sm font-medium text-gray-700">No results yet</p>
              <p className="text-xs text-gray-400 mt-1">Results appear here once you end a poll</p>
              <button onClick={() => router.push('/dashboard/polls')}
                className="mt-4 bg-[#1a2744] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#243561]">
                View Active Polls
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Left panel — poll list */}
            <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
              <div className="px-4 py-4 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-900">Completed Polls</p>
                <p className="text-xs text-gray-400 mt-0.5">{results.length} total</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {results.map(r => (
                  <button key={r.id} onClick={() => setSelected(r.id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-gray-50 transition-colors ${
                      selected === r.id ? 'bg-[#1a2744]/5 border-l-2 border-l-[#1a2744]' : 'hover:bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{r.courseCode}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-800 line-clamp-2">{r.question}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {Object.values(r.responses || {}).reduce((a, b) => a + b, 0)} responses
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel — result detail */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <header className="bg-white border-b border-gray-200 h-14 flex items-center px-6 flex-shrink-0 gap-3">
                <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</button>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-gray-900">Results</span>
              </header>

              {activePoll && (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{activePoll.courseCode}</span>
                    <span className="text-xs text-gray-400">{activePoll.courseTitle}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">{activePoll.question}</h2>

                  {/* Bar chart */}
                  <ResultChart poll={activePoll} />

                  {/* Summary */}
                  <div className="mt-6 bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-600 mb-3">Summary</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xl font-medium text-gray-900">
                          {Object.values(activePoll.responses || {}).reduce((a, b) => a + b, 0)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Total responses</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xl font-medium text-gray-900">
                          {activePoll.options.length}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Answer options</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultChart({ poll }: { poll: PollResult }) {
  const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const COLORS = ['#1a2744', '#F5A623', '#1D9E75', '#378ADD', '#7F77DD', '#D85A30'];
  const total  = Object.values(poll.responses || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      {poll.options.map((opt, i) => {
        const count = poll.responses?.[i] ?? 0;
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
        const isTop = count === Math.max(...Object.values(poll.responses || { 0: 0 })) && count > 0;

        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}>
                  {LABELS[i]}
                </span>
                <span className="text-sm text-gray-700">{opt}</span>
                {isTop && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Top answer</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{count} votes</span>
                <span className="font-medium text-gray-900 w-8 text-right">{pct}%</span>
              </div>
            </div>
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: COLORS[i % COLORS.length], opacity: 0.85 }} />
            </div>
          </div>
        );
      })}
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