'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pollDatabase } from '../../services/pollDatabase';

export default function StudentJoinPage() {
  const router = useRouter();
  const [courseId, setCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => { e.preventDefault(); setLoading(true); setError('');
    const code = courseId.trim().toUpperCase(); if (!code) { setError('Enter a course code'); setLoading(false); return; }
    try { const poll = await pollDatabase.getActivePollByCourse(code); if (poll) router.push(`/student/poll/${poll.id}`); else setError(`No active poll for "${code}".`); }
    catch { setError('Something went wrong.'); } finally { setLoading(false); } };

  const handleJoinById = async () => { const id = prompt('Enter Poll ID:'); if (!id?.trim()) return; setLoading(true); setError('');
    try { const poll = await pollDatabase.getPollById(id.trim()); if (!poll) setError('Poll not found.'); else if (poll.status !== 'active') setError('Poll is not active.'); else router.push(`/student/poll/${poll.id}`); }
    catch { setError('Something went wrong.'); } finally { setLoading(false); } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4"><div className="w-full max-w-md">
      <div className="text-center mb-8"><div className="text-5xl mb-4">📱</div><h1 className="text-3xl font-bold">Join a Poll</h1><p className="text-gray-600 mt-2">Enter your course code</p></div>
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <form onSubmit={handleJoin} className="space-y-6">
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Course Code</label>
            <input type="text" value={courseId} onChange={(e) => { setCourseId(e.target.value); setError(''); }} placeholder="e.g. CS310" className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-widest uppercase focus:ring-2 focus:ring-green-500" autoFocus disabled={loading} maxLength={10} /></div>
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">{error}</p></div>}
          <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl font-semibold text-lg text-white ${loading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>{loading ? 'Looking...' : 'Join Poll'}</button>
        </form>
        <div className="flex items-center my-6"><div className="flex-1 border-t"></div><span className="px-4 text-sm text-gray-400">or</span><div className="flex-1 border-t"></div></div>
        <button onClick={handleJoinById} disabled={loading} className="w-full py-3 rounded-xl font-medium text-gray-700 border-2 border-gray-200 hover:bg-gray-50">Enter Poll ID directly</button>
      </div>
    </div></div>
  );
}