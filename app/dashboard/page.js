'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { createCourse, getTeacherCourses, getStudentCourses, joinCourseByJoinCode } from '../../lib/firestore';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4 text-2xl">✅</div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Course Created!</h2>
        <p className="text-xs text-gray-400 mb-5">Share this join code with your students</p>
        <p className="text-xs text-gray-500 mb-2">"{courseTitle}"</p>
        <div className="bg-[#1a2744] rounded-xl px-6 py-5 mb-4">
          <p className="text-xs text-white/50 mb-1 uppercase tracking-widest">Join Code</p>
          <p className="text-4xl font-bold text-[#F5A623] tracking-[0.3em] font-mono">{joinCode}</p>
        </div>
        <button onClick={handleCopy}
          className={`w-full text-sm px-4 py-2.5 rounded-lg mb-3 transition-colors font-medium ${
            copied ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
  const [code, setCode]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
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
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
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

// ─── Teacher Dashboard ───────────────────────────────────────────
function TeacherDashboard({ user, role }) {
  const router = useRouter();
  const [showModal, setShowModal]       = useState(false);
  const [joinCodeData, setJoinCodeData] = useState(null);
  const [courses, setCourses]           = useState([]);
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

  const handleLogout = async () => { await signOut(auth); router.push('/'); };

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

      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">

        {/* Sidebar */}
        <aside className="w-56 bg-[#1a2744] flex flex-col flex-shrink-0">
          <div className="px-5 py-5 border-b border-white/10">
            <p className="text-white text-lg font-medium tracking-tight">
              <span className="text-[#F5A623]">●</span> ClassNGazer
            </p>
            <p className="text-white/40 text-xs mt-0.5">Teacher Portal</p>
          </div>
          <nav className="flex-1 px-2.5 py-3">
            <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-3 mb-1.5">Menu</p>
            <NavItem label="Dashboard"    active />
            <NavItem label="My Courses"   onClick={() => router.push('/dashboard/courses')} />
            <NavItem label="Active Polls" onClick={() => router.push('/dashboard/polls')} />
            <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-4 mb-1.5">Manage</p>
            <NavItem label="Create Course" onClick={() => setShowModal(true)} />
            <NavItem label="Results"       onClick={() => router.push('/dashboard/results')} />
          </nav>
          <div className="px-2.5 py-3.5 border-t border-white/10">
            <button onClick={handleLogout}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white/45 text-sm hover:text-red-400 w-full text-left transition-colors">
              Log out
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 flex-shrink-0">
            <div>
              <p className="text-sm font-medium text-gray-900">Good morning, {firstName}</p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1a2744] flex items-center justify-center text-[#F5A623] text-xs font-medium">
                {firstName[0]}
              </div>
              <span className="text-sm font-medium text-gray-900">{firstName}</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <StatCard value={courses.length}  label="Active courses" tag="This semester" tagColor="blue" />
              <StatCard value={totalStudents}    label="Total students"  tag="Enrolled"      tagColor="teal" />
              <StatCard value={activePollsCount} label="Polls running"   tag="Live now"      tagColor="amber" />
            </div>

            {/* Course list */}
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Your Courses</p>

            {coursesLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#1a2744] rounded-full animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl py-14 flex flex-col items-center justify-center text-center mb-6">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-lg">📚</div>
                <p className="text-sm font-medium text-gray-700">No courses yet</p>
                <p className="text-xs text-gray-400 mt-1">Click "Create Course" to add your first one</p>
                <button onClick={() => setShowModal(true)}
                  className="mt-4 bg-[#1a2744] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#243561] transition-colors">
                  + Create Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {courses.map((course, i) => (
                  <div key={course.id}
                    onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                    className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 transition-colors relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ background: ACCENTS[i % ACCENTS.length] }} />
                    <div className="pl-3">
                      <p className="text-sm font-medium text-gray-900">{course.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{course.code}</p>

                      {/* Join code row */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[9px] text-gray-400 uppercase tracking-widest">Join:</span>
                        <span className="text-xs font-bold font-mono text-[#1a2744] tracking-widest">
                          {course.joinCode ?? '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
                        <span className="text-xs text-gray-500">{course.students?.length ?? 0} students</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                          No active poll
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button onClick={() => setShowModal(true)}
                className="bg-[#1a2744] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#243561] transition-colors">
                + Create new course
              </button>
              <button onClick={() => router.push('/dashboard/courses')}
                className="bg-white text-gray-800 text-sm px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                View all courses
              </button>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Student Dashboard ───────────────────────────────────────────
function StudentDashboard({ user }) {
  const router = useRouter();
  const [courses, setCourses]           = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showJoinModal, setShowJoinModal]   = useState(false);

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

  const handleLogout = async () => { await signOut(auth); router.push('/'); };

  return (
    <>
      {showJoinModal && (
        <JoinCourseModal
          studentId={user.uid}
          onClose={() => setShowJoinModal(false)}
          onJoined={loadCourses}
        />
      )}

      <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">

        {/* Sidebar */}
        <aside className="w-56 bg-[#1a2744] flex flex-col flex-shrink-0">
          <div className="px-5 py-5 border-b border-white/10">
            <p className="text-white text-lg font-medium tracking-tight">
              <span className="text-[#F5A623]">●</span> ClassNGazer
            </p>
            <p className="text-white/40 text-xs mt-0.5">Student Portal</p>
          </div>
          <nav className="flex-1 px-2.5 py-3">
            <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-3 mb-1.5">Menu</p>
            <NavItem label="My Courses" active />
            <NavItem label="Join Course" onClick={() => setShowJoinModal(true)} />
          </nav>
          <div className="px-2.5 py-3.5 border-t border-white/10">
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-[#F5A623] flex items-center justify-center text-[#1a2744] text-xs font-bold">
                {firstName[0]}
              </div>
              <div>
                <p className="text-white text-xs font-medium">{firstName}</p>
                <p className="text-white/40 text-[10px]">{user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white/45 text-sm hover:text-red-400 w-full text-left transition-colors">
              Log out
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 flex-shrink-0">
            <div>
              <p className="text-sm font-medium text-gray-900">Welcome back, {firstName} 👋</p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button onClick={() => setShowJoinModal(true)}
              className="bg-[#1a2744] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#243561] transition-colors flex items-center gap-2">
              + Join Course
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <StatCard value={courses.length} label="Enrolled courses" tag="Active" tagColor="blue" />
              <StatCard value={0} label="Active polls" tag="Live now" tagColor="amber" />
            </div>

            <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Your Courses</p>

            {coursesLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#1a2744] rounded-full animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-xl py-14 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-lg">📚</div>
                <p className="text-sm font-medium text-gray-700">No courses yet</p>
                <p className="text-xs text-gray-400 mt-1">Ask your professor for a join code to get started</p>
                <button onClick={() => setShowJoinModal(true)}
                  className="mt-4 bg-[#1a2744] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#243561] transition-colors">
                  + Join Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {courses.map((course, i) => (
                  <div key={course.id}
                    onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                    className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ background: ACCENTS[i % ACCENTS.length] }} />
                    <div className="pl-3">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-[#1a2744] transition-colors">{course.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{course.code}</p>
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
                        <span className="text-xs text-gray-400">{course.students?.length ?? 0} students</span>
                        <span className="text-xs text-[#1a2744] font-medium group-hover:underline">Open →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Reusable pieces ─────────────────────────────────────────────
function NavItem({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm w-full text-left mb-0.5 transition-colors ${
        active ? 'bg-[#F5A623] text-[#1a2744] font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white/90'
      }`}>
      {label}
    </button>
  );
}

const tagStyles = {
  blue:  'bg-blue-50  text-blue-700',
  teal:  'bg-teal-50  text-teal-700',
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

// ─── Root page ────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (role === 'teacher') return <TeacherDashboard user={user} role={role} />;

  return <StudentDashboard user={user} />;
}