'use client';
import { useEffect, useState } from 'react';
import { pollDatabase, createTestPolls } from '../../services/pollDatabase';

export default function TestDBPage() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    setLoading(true);
    try {
      const allPolls = await pollDatabase.getAllPolls();
      setPolls(allPolls);
    } catch (error) {
      console.error("Error loading polls:", error);
    }
    setLoading(false);
  };

  const handleCreateTest = async () => {
    setLoading(true);
    try {
      await createTestPolls();
      alert(" Test polls created!");
      await loadPolls();
    } catch (error) {
      alert(" Error: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Database Test</h1>
      
      <div className="space-x-4 mb-6">
        <button 
          onClick={handleCreateTest}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? 'Creating...' : 'Create Test Polls'}
        </button>
        <button 
          onClick={loadPolls}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          Reload Polls
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Total Polls in Database: {polls.length}
          </h2>
          
          {polls.length === 0 ? (
            <p className="text-gray-500">No polls found. Click "Create Test Polls" above.</p>
          ) : (
            <div className="space-y-4">
              {polls.map((poll) => (
                <div key={poll.id} className="p-4 border rounded-lg bg-white shadow">
                  <h3 className="font-medium text-lg">{poll.question}</h3>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Status: 
                      <span className={`ml-2 px-2 py-1 rounded ${
                        poll.status === 'active' ? 'bg-green-100 text-green-800' :
                        poll.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {poll.status}
                      </span>
                    </p>
                    <p>Options: {poll.options?.join(', ')}</p>
                    <p>Correct Answer: Option {poll.correctOption + 1}</p>
                    <p>Poll ID: <code className="bg-gray-100 p-1 rounded">{poll.id}</code></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Click "Create Test Polls" to add sample data</li>
          <li>Check Firebase Console to verify data is saved</li>
          <li>Click "Reload Polls" to refresh the list</li>
        </ol>
      </div>
    </div>
  );
}