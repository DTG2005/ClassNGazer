'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pollDatabase } from '../../services/pollDatabase';

export default function StudentJoinPage() {
  const router = useRouter();
  const [courseId, setCourseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const code = courseId.trim().toUpperCase();
    if (!code) {
      setError('Please enter a course code');
      setLoading(false);
      return;
    }

    try {
      // Look for an active poll in this course
      const activePoll = await pollDatabase.getActivePollByCourse(code);

      if (activePoll) {
        // Found an active poll — go to it
        router.push(`/student/poll/${activePoll.id}`);
      } else {
        setError(`No active poll found for course "${code}". Ask your professor to start a poll.`);
      }
    } catch (err) {
      console.error('Error joining:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Direct join by poll ID
  const handleJoinByPollId = async () => {
    const pollId = prompt('Enter Poll ID (from your professor):');
    if (!pollId?.trim()) return;

    setLoading(true);
    setError('');

    try {
      const poll = await pollDatabase.getPollById(pollId.trim());
      if (!poll) {
        setError('Poll not found. Check the ID and try again.');
      } else if (poll.status !== 'active') {
        setError('This poll is not active right now.');
      } else {
        router.push(`/student/poll/${poll.id}`);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📱</div>
          <h1 className="text-3xl font-bold text-gray-900">Join a Poll</h1>
          <p className="text-gray-600 mt-2">Enter your course code to participate</p>
        </div>

        {/* Join Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Code
              </label>
              <input
                type="text"
                value={courseId}
                onChange={(e) => { setCourseId(e.target.value); setError(''); }}
                placeholder="e.g. CS310"
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-center text-2xl font-bold tracking-widest uppercase focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                autoFocus
                disabled={loading}
                maxLength={10}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Join Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-semibold text-lg text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Looking for poll...
                </span>
              ) : (
                'Join Poll'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Join by Poll ID */}
          <button
            onClick={handleJoinByPollId}
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium text-gray-700 border-2 border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Enter Poll ID directly
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Your professor will share the course code or poll ID.</p>
          <p className="mt-1">Make sure the poll is active before joining.</p>
        </div>
      </div>
    </div>
  );
}