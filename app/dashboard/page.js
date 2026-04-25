'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { createCourse, getTeacherCourses, getStudentCourses, joinCourseByJoinCode } from '../../lib/firestore';
import DashboardShell from '../components/DashboardShell';
import { SkeletonGrid } from '../components/SkeletonCard';

const ACCENTS = ['#F5A623', '#1D9E75', '#378ADD', '#7F77DD', '#D85A30', '#D4537E'];

// ─── Join Code Modal ─────────────────────────────────────────────
function JoinCodeModal({
  joinCode, courseTitle, onClose,
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 text-2xl">✅</div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Course Created!</h2>
        <p className="text-xs text-gray-400 mb-5">Share this join code with your students</p>
        <p className="text-xs text-gray-500 mb-2">&quot;{courseTitle}&quot;</p>
        <div className="bg-[#1a2744] rounded-xl px-6 py-5 mb-4">
          <p className="text-xs text-white/50 mb-1 uppercase tracking-widest">Join Code</p>
          <p className="text-4xl font-bold text-[#F5A623] tracking-[0.3em] font-mono">{joinCode}</p>
        </div>
        <button onClick={handleCopy}
          className={`w-full text-sm px-4 py-2.5 rounded-lg mb-3 transition-colors font-medium ${copied ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
          {copied ? '✓ Copied!' : 'Copy Code'}
        </button>
        <p className="text-[10px] text-gray-400 mb-4">Students enter this code in their dashboard to join</p>
        <button onClick={onClose} className="w-full bg-[#1a2744] text-white text-sm px-4 py-2.5 rounded-lg hover:bg-[#243561]">
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Create Course Modal ─────────────────────────────────────────
function CreateCourseModal({
  onClose, onCreated, teacherId, teacherName,
}) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim() || !code.trim()) { setError('Both fields are required.'); return; }
    setLoading(true);
    try {
      const result = await createCourse({ title: title.trim(), code: code.trim(), teacherId, teacherName });
      onCreated(result.joinCode, title.trim());
    } catch {
      setError('Failed to create course. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Create a new course</h2>
            <p className="text-xs text-gray-400 mt-0.5">A join code will be generated automatically</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Course Title</label>
            <input type="text" placeholder="e.g. Data Structures & Algorithms" value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1a2744] focus:ring-1 focus:ring-[#1a2744] transition" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Course Code</label>
            <input type="text" placeholder="e.g. CS301" value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1a2744] focus:ring-1 focus:ring-[#1a2744] transition font-mono" />
            <p className="text-[10px] text-gray-400 mt-1">Students will use the auto-generated join code — not this.</p>
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#1a2744] text-white text-sm px-4 py-2.5 rounded-lg hover:bg-[#243561] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</>
                : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Join Course Modal (for students) ────────────────────────────
function JoinCourseModal({ onClose, onJoined, studentId }) {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!joinCode.trim()) { setError('Please enter a join code.'); return; }
    setLoading(true);
    try {
      await joinCourseByJoinCode(joinCode.trim().toUpperCase(), studentId);
      onJoined();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to join course.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Join a Course</h2>
            <p className="text-xs text-gray-400 mt-0.5">Enter the code provided by your professor</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 text-sm">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Join Code</label>
            <input type="text" placeholder="e.g. X7K2M9" value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full border border-gray-200 rounded-lg px-3 py-4 text-2xl text-center text-gray-900 placeholder-gray-300 focus:outline-none focus:border-[#1a2744] focus:ring-1 focus:ring-[#1a2744] transition font-mono tracking-[0.3em] uppercase" />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#1a2744] text-white text-sm px-4 py-2.5 rounded-lg hover:bg-[#243561] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Joining...</>
                : 'Join Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const tagStyles = {
  blue: 'bg-blue-50  text-blue-700',
  teal: 'bg-teal-50  text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
};

function StatCard({ value, label, tag, tagColor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3.5">
      <p className="text-2xl font-medium text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      <span className={`text-[10px] px-2 py-0.5 rounded-full mt-2 inline-block ${tagStyles[tagColor]}`}>{tag}</span>
    </div>
  );
}


// ─── Teacher Dashboard ───────────────────────────────────────────
function TeacherDashboard({ user, role }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [joinCodeData, setJoinCodeData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const firstName = user.displayName?.split(' ')[0] || 'Teacher';

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const data = await getTeacherCourses(user.uid);
      setCourses(data);
    } catch (e) {
      console.error('Failed to load courses:', e);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => { loadCourses(); }, [user.uid]);

  const totalStudents = courses.reduce((sum, c) => sum + (c.students?.length ?? 0), 0);
  const activePollsCount = 0;

  return (
    <>
      {showModal && (
        <CreateCourseModal
          teacherId={user.uid}
          teacherName={user.displayName || user.email || 'Teacher'}
          onClose={() => setShowModal(false)}
          onCreated={(joinCode, title) => {
            loadCourses();
            setShowModal(false);
            setJoinCodeData({ code: joinCode, title });
          }}
        />
      )}
      {joinCodeData && (
        <JoinCodeModal
          joinCode={joinCodeData.code}
          courseTitle={joinCodeData.title}
          onClose={() => setJoinCodeData(null)}
        />
      )}

      <DashboardShell
        role={role}
        user={user}
        activeMenu="Dashboard"
        onCreateCourse={() => setShowModal(true)}
        headerTitle={`Good morning, ${firstName}`}
        headerSubtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      >
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatCard value={courses.length} label="Active courses" tag="This semester" tagColor="blue" />
          <StatCard value={totalStudents} label="Total students" tag="Enrolled" tagColor="teal" />
          <StatCard value={activePollsCount} label="Polls running" tag="Live now" tagColor="amber" />
        </div>

        {/* Course list */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wider text-gray-400">Your Courses</p>
          <button onClick={() => router.push('/dashboard/courses')} className="text-xs font-medium text-[#1a2744] hover:underline">View all →</button>
        </div>

        {coursesLoading ? (
          <SkeletonGrid count={3} />
        ) : courses.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 md:py-16 flex flex-col items-center justify-center text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4 text-xl">📚</div>
            <p className="text-sm font-medium text-gray-700">No courses yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px] mb-5">Click &quot;Create Course&quot; to add your first one and get a join code for students</p>
            <button onClick={() => setShowModal(true)}
              className="bg-[#1a2744] text-white text-xs px-5 py-2.5 rounded-lg hover:bg-[#243561] transition-colors shadow-sm">
              + Create Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
            {courses.slice(0, 4).map((course, i) => (
              <div key={course.id}
                onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all group relative overflow-hidden flex flex-col h-[130px]">
                <div className="absolute top-0 left-0 bottom-0 w-[4px]"
                  style={{ background: ACCENTS[i % ACCENTS.length] }} />
                <div className="pl-3 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-[#1a2744] transition-colors line-clamp-1">{course.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mb-2">{course.code}</p>

                  {/* Join code row */}
                  <div className="flex items-center gap-1.5 mt-auto">
                    <span className="text-[9px] bg-gray-50 px-2 py-0.5 rounded border border-gray-100 text-gray-400 uppercase tracking-widest font-medium">Join</span>
                    <span className="text-xs font-bold font-mono text-[#1a2744] tracking-widest">
                      {course.joinCode ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardShell>
    </>
  );
}

// ─── Student Dashboard ───────────────────────────────────────────
function StudentDashboard({ user }) {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const firstName = user.displayName?.split(' ')[0] || 'Student';

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const data = await getStudentCourses(user.uid);
      setCourses(data);
    } catch (e) {
      console.error('Failed to load courses:', e);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => { loadCourses(); }, [user.uid]);

  return (
    <>
      {showJoinModal && (
        <JoinCourseModal
          studentId={user.uid}
          onClose={() => setShowJoinModal(false)}
          onJoined={loadCourses}
        />
      )}

      <DashboardShell
        role="student"
        user={user}
        activeMenu="My Courses"
        onJoinCourse={() => setShowJoinModal(true)}
        headerTitle={`Welcome back, ${firstName} 👋`}
        headerSubtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        headerAction={
          <button onClick={() => setShowJoinModal(true)}
            className="bg-[#1a2744] text-white text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#243561] transition-colors flex items-center gap-2">
            <span className="hidden sm:inline">+ Join Course</span>
            <span className="sm:hidden">+ Join</span>
          </button>
        }
      >
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
          <StatCard value={courses.length} label="Enrolled courses" tag="Active" tagColor="blue" />
          <StatCard value={0} label="Active polls" tag="Live now" tagColor="amber" />
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Your Courses</p>

        {coursesLoading ? (
          <SkeletonGrid count={4} />
        ) : courses.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl px-4 py-12 md:py-16 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4 text-xl">🎓</div>
            <p className="text-sm font-medium text-gray-700">No courses yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px] mb-5">Ask your professor for a join code to get started</p>
            <button onClick={() => setShowJoinModal(true)}
              className="mt-2 bg-[#1a2744] text-white text-xs px-5 py-2.5 rounded-lg hover:bg-[#243561] transition-colors shadow-sm">
              + Join Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {courses.map((course, i) => (
              <div key={course.id}
                onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-[4px]"
                  style={{ background: ACCENTS[i % ACCENTS.length] }} />
                <div className="pl-3 flex flex-col h-full">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-[#1a2744] transition-colors truncate">{course.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono mb-4">{course.code}</p>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{course.teachers ? 'Active' : 'Enrolled'}</span>
                    <span className="text-xs text-[#1a2744] font-medium group-hover:underline flex items-center gap-1">
                      Open <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardShell>
    </>
  );
}

// ─── Root page ────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <SkeletonGrid count={6} />
      </div>
    );
  }

  if (role === 'teacher') return <TeacherDashboard user={user} role={role} />;

  return <StudentDashboard user={user} />;
}