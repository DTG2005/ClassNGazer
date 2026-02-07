'use client';
import { useEffect, useState } from 'react';
import { pollDatabase } from '../../services/pollDatabase';
import { useRouter } from 'next/navigation';

export default function ViewPollsPage() {
  const router = useRouter();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, active, draft, closed

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const allPolls = await pollDatabase.getAllPolls();
      setPolls(allPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      alert('Failed to load polls: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPolls = polls.filter(poll => {
    if (filter === 'all') return true;
    return poll.status === filter;
  });

  const handleStartPoll = async (pollId) => {
    if (!confirm('Start this poll? Students will be able to answer.')) return;
    
    try {
      await pollDatabase.updatePollStatus(pollId, 'active');
      alert('✅ Poll started!');
      fetchPolls(); // Refresh
    } catch (error) {
      alert('❌ Failed to start poll: ' + error.message);
    }
  };

  const handleClosePoll = async (pollId) => {
    if (!confirm('Close this poll?')) return;
    
    try {
      await pollDatabase.updatePollStatus(pollId, 'closed');
      alert('✅ Poll closed!');
      fetchPolls(); // Refresh
    } catch (error) {
      alert('❌ Failed to close poll: ' + error.message);
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    
    try {
      await pollDatabase.deletePoll(pollId);
      alert('🗑️ Poll deleted!');
      fetchPolls(); // Refresh
    } catch (error) {
      alert('❌ Failed to delete poll: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Manage Polls</h1>
              <p className="text-gray-600 mt-2">Create, start, and monitor classroom polls</p>
            </div>
            <button
              onClick={() => router.push('/professor/create-poll')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              + Create New Poll
            </button>
          </div>
        </div>

        {/* Stats & Filters */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{polls.length}</div>
                <div className="text-sm text-gray-500">Total Polls</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {polls.filter(p => p.status === 'active').length}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {polls.filter(p => p.status === 'draft').length}
                </div>
                <div className="text-sm text-gray-500">Draft</div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg ${filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg ${filter === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('draft')}
                className={`px-4 py-2 rounded-lg ${filter === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}
              >
                Draft
              </button>
              <button
                onClick={() => setFilter('closed')}
                className={`px-4 py-2 rounded-lg ${filter === 'closed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
              >
                Closed
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading polls...</p>
          </div>
        ) : filteredPolls.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No polls found</h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? 'Create your first poll to get started!' 
                : `No ${filter} polls found. Try a different filter.`
              }
            </p>
            <button
              onClick={() => router.push('/professor/create-poll')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              Create Your First Poll
            </button>
          </div>
        ) : (
          /* Polls Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPolls.map((poll) => (
              <div key={poll.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                {/* Poll Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(poll.status)}`}>
                      {poll.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {poll.timer}s
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                    {poll.question}
                  </h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Course: <span className="font-medium">{poll.courseId}</span></p>
                    {poll.createdAt && (
                      <p className="mt-1">Created: {new Date(poll.createdAt.seconds * 1000).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {/* Options Preview */}
                <div className="p-6 border-b border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Options:</h4>
                  <ul className="space-y-2">
                    {poll.options?.slice(0, 3).map((option, idx) => (
                      <li key={idx} className="flex items-center">
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mr-2 ${
                          idx === poll.correctOption 
                            ? 'bg-green-100 text-green-800 font-bold' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm truncate">{option}</span>
                        {idx === poll.correctOption && (
                          <span className="ml-2 text-green-600 text-xs">✓ Correct</span>
                        )}
                      </li>
                    ))}
                    {poll.options?.length > 3 && (
                      <li className="text-sm text-gray-500 pl-8">
                        +{poll.options.length - 3} more options
                      </li>
                    )}
                  </ul>
                </div>

                {/* Actions */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3">
                    {poll.status === 'draft' && (
                      <button
                        onClick={() => handleStartPoll(poll.id)}
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        Start Poll
                      </button>
                    )}
                    
                    {poll.status === 'active' && (
                      <button
                        onClick={() => handleClosePoll(poll.id)}
                        className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                      >
                        Close Poll
                      </button>
                    )}

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(poll.id);
                        alert('Poll ID copied to clipboard!');
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Copy ID
                    </button>

                    <button
                      onClick={() => router.push(`/professor/polls/${poll.id}`)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      View Details
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeletePoll(poll.id)}
                    className="w-full mt-3 text-red-600 hover:text-red-800 text-sm font-medium py-2 border border-red-200 hover:border-red-300 rounded-lg transition-colors"
                  >
                    Delete Poll
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Database Info */}
        <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-3">📊 Firebase Database Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{polls.length}</div>
              <div className="text-sm text-blue-700">Total Polls</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {polls.filter(p => p.status === 'active').length}
              </div>
              <div className="text-sm text-green-700">Active</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-yellow-600">
                {polls.filter(p => p.status === 'draft').length}
              </div>
              <div className="text-sm text-yellow-700">Draft</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-red-600">
                {polls.filter(p => p.status === 'closed').length}
              </div>
              <div className="text-sm text-red-700">Closed</div>
            </div>
          </div>
          <p className="text-sm text-blue-700 mt-4">
            Check Firebase Console to see your data in real-time.
          </p>
        </div>
      </div>
    </div>
  );
}