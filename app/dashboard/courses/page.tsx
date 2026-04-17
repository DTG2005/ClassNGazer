// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useAuth } from '../../../context/AuthContext';
import { getTeacherCourses, createCourse, deleteCourse } from '../../../lib/firestore';
import DashboardShell from '../../components/DashboardShell';
import { SkeletonGrid } from '../../components/SkeletonCard';

const ACCENTS = ['#F5A623', '#1D9E75', '#378ADD', '#7F77DD', '#D85A30', '#D4537E'];

// ── Create Course Modal ──────────────────────────────────────────
function CreateCourseModal({
  onClose, onCreated, teacherId, teacherName,
}: {
  onClose: () => void;
  onCreated: (joinCode: string, title: string) => void;
  teacherId: string;
  teacherName: string;
}) {
  const [title, setTitle]     = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) { setError('Both fields are required.'); return; }
    setLoading(true);
    try {
      const result = await createCourse({ title: title.trim(), code: code.trim(), teacherId, teacherName });
      onCreated(result.joinCode, title.trim());
    } catch { setError('Failed to create course. Try again.'); }
    finally { setLoading(false); }
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a2744] focus:ring-1 focus:ring-[#1a2744]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Course Code</label>
            <input type="text" placeholder="e.g. CS301" value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-[#1a2744] focus:ring-1 focus:ring-[#1a2744]" />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#1a2744] text-white text-sm px-4 py-2.5 rounded-lg hover:bg-[#243561] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Join Code Success Modal ──────────────────────────────────────
function JoinCodeModal({
  joinCode, courseTitle, onClose,
}: {
  joinCode: string; courseTitle: string; onClose: () => void;
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

        <p className="text-xs text-gray-500 mb-2">"{courseTitle}"</p>

        {/* Big join code display */}
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

        <p className="text-[10px] text-gray-400 mb-4">
          Students enter this code in their dashboard to join the course
        </p>
        <button onClick={onClose} className="w-full bg-[#1a2744] text-white text-sm px-4 py-2.5 rounded-lg hover:bg-[#243561]">
          Done
        </button>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ─────────────────────────────────────────
function DeleteModal({
  course, onClose, onDeleted,
}: {
  course: { id: string; title: string; code: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteCourse(course.id);
      onDeleted();
      onClose();
    } catch { setError('Failed to delete. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 text-xl">🗑️</div>
        <h2 className="text-base font-semibold text-gray-900 text-center mb-1">Delete Course?</h2>
        <p className="text-xs text-gray-400 text-center mb-1">You are about to delete</p>
        <p className="text-sm font-medium text-gray-800 text-center mb-1">"{course.title}"</p>
        <p className="text-xs font-mono text-gray-400 text-center mb-5">{course.code}</p>
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 mb-5">
          <p className="text-xs text-red-600 text-center">
            ⚠️ This will permanently delete the course and all its polls. This cannot be undone.
          </p>
        </div>
        {error && <p className="text-xs text-red-500 text-center mb-3">{error}</p>}
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-700 text-sm px-4 py-2.5 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={handleDelete} disabled={loading}
            className="flex-1 bg-red-500 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</> : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function CoursesPage() {
  const { user, role, loading: authLoading } = useAuth() as any;
  const router = useRouter();
  const [courses, setCourses]           = useState<any[]>([]);
  const [pageLoading, setPageLoading]   = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [joinCodeData, setJoinCodeData] = useState<{ code: string; title: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [search, setSearch]             = useState('');
  const [copiedId, setCopiedId]         = useState<string | null>(null);

  useEffect(() => { if (!authLoading && (!user || role !== 'teacher')) router.push('/auth'); }, [user, authLoading, router, role]);

  const loadCourses = async () => {
    if (!user) return;
    setPageLoading(true);
    try { setCourses(await getTeacherCourses(user.uid)); }
    catch (e) { console.error(e); }
    finally { setPageLoading(false); }
  };

  useEffect(() => { if (user) loadCourses(); }, [user]);

  const handleCreated = (joinCode: string, title: string) => {
    loadCourses();
    setJoinCodeData({ code: joinCode, title });
  };

  const handleCopyCode = (e: React.MouseEvent, joinCode: string, courseId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(joinCode);
    setCopiedId(courseId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <>
      {showCreate && user && (
        <CreateCourseModal
          teacherId={user.uid}
          teacherName={user.displayName || user.email || 'Teacher'}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {joinCodeData && (
        <JoinCodeModal
          joinCode={joinCodeData.code}
          courseTitle={joinCodeData.title}
          onClose={() => setJoinCodeData(null)}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          course={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={loadCourses}
        />
      )}

      <DashboardShell
        role="teacher"
        user={user}
        activeMenu="My Courses"
        onCreateCourse={() => setShowCreate(true)}
        headerTitle={
          <div className="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm">
            <span className="hidden sm:inline">← </span>
            <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-gray-700 truncate max-w-[80px] md:max-w-none">
              <span className="sm:hidden">Overview</span>
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-900 truncate">My Courses</span>
          </div>
        }
        headerAction={
          <button onClick={() => setShowCreate(true)}
            className="bg-[#1a2744] text-white text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg hover:bg-[#243561] shrink-0">
            <span className="hidden sm:inline">+ New Course</span>
            <span className="sm:hidden">+ New</span>
          </button>
        }
      >
        <div className="mb-4 md:mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <input type="text" placeholder="Search by title or code..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full md:max-w-sm border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a2744] focus:ring-1 focus:ring-[#1a2744]" />
            <span className="hidden md:inline-flex text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full self-start">Total: {courses.length} courses</span>
        </div>

        {pageLoading ? (
          <SkeletonGrid count={6} />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 md:py-16 flex flex-col items-center px-4 text-center">
            <div className="text-3xl mb-3">📚</div>
            <p className="text-sm font-medium text-gray-700">
              {search ? 'No courses match your search' : 'No courses yet'}
            </p>
            {!search && (
              <button onClick={() => setShowCreate(true)}
                className="mt-4 bg-[#1a2744] text-white text-xs px-5 py-2.5 rounded-lg hover:bg-[#243561] shadow-sm">
                + Create Course
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filtered.map((course, i) => (
              <div key={course.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group relative flex flex-col">

                {/* Accent bar */}
                <div className="h-1 w-full" style={{ background: ACCENTS[i % ACCENTS.length] }} />

                <div className="p-4 md:p-5 flex flex-col flex-1">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/dashboard/courses/${course.id}`)}>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-[#1a2744] transition-colors line-clamp-1">{course.title}</p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">{course.code}</p>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(course); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Delete course">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 2h4a1 1 0 011 1v1H5V3a1 1 0 011-1zM3 5h10l-1 9H4L3 5zm3 2v5h1V7H6zm3 0v5h1V7H9z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Join code pill */}
                  <div className="bg-[#1a2744]/5 rounded-lg px-3 py-2.5 flex items-center justify-between mb-3 mt-auto">
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Student Join Code</p>
                      <p className="text-base font-bold text-[#1a2744] tracking-[0.2em] font-mono">{course.joinCode}</p>
                    </div>
                    <button
                      onClick={e => handleCopyCode(e, course.joinCode, course.id)}
                      className={`text-[10px] px-2.5 py-1.5 rounded-md transition-colors font-medium cursor-pointer ${
                        copiedId === course.id
                          ? 'bg-green-50 text-green-600'
                          : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {copiedId === course.id ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-500 font-medium">{course.students?.length ?? 0} students</span>
                    <button
                      onClick={() => router.push(`/dashboard/courses/${course.id}`)}
                      className="text-xs text-[#1a2744] font-medium hover:underline flex items-center gap-1">
                      View polls 
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
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