'use client';
import { useEffect, useState } from 'react';
import {
  pollDatabase,
  PollStatus,
  createTestPolls,
  initializeDatabase,
  validatePollData,
  formatPollForDisplay,
} from '../../services/pollDatabase';

export default function TestDBPage() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => { loadPolls(); }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [{ message, type, timestamp }, ...prev.slice(0, 49)]);
  };

  const loadPolls = async () => {
    setLoading(true);
    try {
      const allPolls = await pollDatabase.getAllPolls();
      setPolls(allPolls);
      addLog(`Loaded ${allPolls.length} polls from Firestore`, 'success');
    } catch (error) {
      console.error('Error loading polls:', error);
      addLog(`Error loading polls: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  const handleCreateTest = async () => {
    setLoading(true);
    try {
      const results = await createTestPolls(3);
      const successCount = results.filter((r) => r.success).length;
      alert(`✅ ${successCount} test polls created!`);
      addLog(`Created ${successCount} test polls`, 'success');
      await loadPolls();
    } catch (error) {
      alert('❌ Error: ' + error.message);
      addLog(`Create test polls failed: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  const handleInitDB = async () => {
    setLoading(true);
    try {
      await initializeDatabase();
      addLog('Database initialized successfully', 'success');
      await loadPolls();
    } catch (error) { addLog(`Init failed: ${error.message}`, 'error'); }
    setLoading(false);
  };

  const handleCreateSingle = async () => {
    setLoading(true);
    try {
      const pollData = {
        question: `Test Poll — ${new Date().toLocaleTimeString()}`,
        options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
        correctOption: 1, timer: 60,
        courseId: 'CS310', courseName: 'Software Engineering',
        professorId: 'demo-professor-123', professorName: 'Demo Professor',
      };
      const validation = validatePollData(pollData);
      addLog(`Validation: ${validation.isValid ? 'PASSED' : 'FAILED — ' + validation.errors.join(', ')}`, validation.isValid ? 'success' : 'error');
      const pollId = await pollDatabase.createPoll(pollData);
      addLog(`Poll created → ID: ${pollId}`, 'success');
      await loadPolls();
    } catch (error) { addLog(`Create failed: ${error.message}`, 'error'); }
    setLoading(false);
  };

  const handleTestValidation = async () => {
    try {
      const badData = { question: '', options: ['Only one'], correctOption: 5, courseId: '' };
      const validation = validatePollData(badData);
      addLog(`Validation result: ${JSON.stringify(validation)}`, validation.isValid ? 'success' : 'warning');
      await pollDatabase.createPoll(badData);
      addLog('Should not reach here', 'error');
    } catch (error) { addLog(`Validation correctly blocked: ${error.message}`, 'success'); }
  };

  const handleStart = async (pollId) => {
    try {
      await pollDatabase.updatePollStatus(pollId, PollStatus.ACTIVE);
      addLog(`Poll ${pollId.slice(0, 8)}… → active`, 'success');
      await loadPolls();
    } catch (error) { addLog(`Start failed: ${error.message}`, 'error'); }
  };

  const handleClose = async (pollId) => {
    try {
      await pollDatabase.updatePollStatus(pollId, PollStatus.CLOSED);
      addLog(`Poll ${pollId.slice(0, 8)}… → closed`, 'success');
      await loadPolls();
    } catch (error) { addLog(`Close failed: ${error.message}`, 'error'); }
  };

  const handleDelete = async (pollId) => {
    try {
      await pollDatabase.deletePoll(pollId);
      addLog(`Poll ${pollId.slice(0, 8)}… deleted`, 'success');
      await loadPolls();
    } catch (error) { addLog(`Delete failed: ${error.message}`, 'error'); }
  };

  const handleViewStats = async (pollId) => {
    try {
      const stats = await pollDatabase.getPollStats(pollId);
      if (stats) addLog(`Stats → Responses: ${stats.totalResponses}, Correct: ${stats.correctPercentage}%`, 'info');
      else addLog(`No stats found`, 'warning');
    } catch (error) { addLog(`Stats error: ${error.message}`, 'error'); }
  };

  const handleCalcResults = async (pollId) => {
    try {
      const results = await pollDatabase.calculateResults(pollId);
      if (results) {
        const dist = results.distribution.map((d) => `${d.optionText}: ${d.percentage}%`).join(', ');
        addLog(`Results → ${dist}`, 'info');
      } else addLog(`No results`, 'warning');
    } catch (error) { addLog(`Results error: ${error.message}`, 'error'); }
  };

  const handleTestFilters = async () => {
    try {
      const byCourse = await pollDatabase.getPollsByCourse('CS310');
      addLog(`Polls in CS310: ${byCourse.length}`, 'info');
      const drafts = await pollDatabase.getPollsByStatus(PollStatus.DRAFT);
      addLog(`Draft polls: ${drafts.length}`, 'info');
      const active = await pollDatabase.getActivePollByCourse('CS310');
      addLog(`Active poll in CS310: ${active ? active.id.slice(0, 8) + '…' : 'none'}`, 'info');
      const history = await pollDatabase.getPollHistory('CS310');
      addLog(`Closed polls in CS310: ${history.length}`, 'info');
      const search = await pollDatabase.searchPolls('Sample');
      addLog(`Search "Sample": ${search.length} results`, 'info');
    } catch (error) { addLog(`Filter test error: ${error.message}`, 'error'); }
  };

  const handleFakeResponse = async (pollId) => {
    try {
      const fakeId = `student-${Date.now()}`;
      await pollDatabase.submitResponse(pollId, fakeId, 'Test Student', Math.floor(Math.random() * 4));
      addLog(`Response submitted by ${fakeId.slice(0, 16)}…`, 'success');
      await loadPolls();
    } catch (error) { addLog(`Response failed: ${error.message}`, 'error'); }
  };

  const handleTestFormat = (poll) => {
    const f = formatPollForDisplay(poll);
    addLog(`Formatted: created=${f.createdAtFormatted}, started=${f.startedAtFormatted}`, 'info');
  };

  const getStatusColor = (s) => {
    if (s === 'active') return 'bg-green-100 text-green-800 border-green-300';
    if (s === 'draft') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (s === 'closed') return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getLogColor = (t) => {
    if (t === 'success') return 'text-green-700 bg-green-50';
    if (t === 'error') return 'text-red-700 bg-red-50';
    if (t === 'warning') return 'text-yellow-700 bg-yellow-50';
    return 'text-blue-700 bg-blue-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Firebase Database Test</h1>
          <p className="text-gray-600 mt-1">Test all pollDatabase functions — CRUD, state transitions, validation, analytics</p>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleInitDB} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:bg-gray-400">Initialize DB</button>
            <button onClick={handleCreateTest} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:bg-gray-400">Create 3 Test Polls</button>
            <button onClick={handleCreateSingle} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:bg-gray-400">Create Single Poll</button>
            <button onClick={handleTestValidation} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Test Validation (Bad Data)</button>
            <button onClick={handleTestFilters} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Test Filters &amp; Search</button>
            <button onClick={loadPolls} disabled={loading} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:bg-gray-400">Reload Polls</button>
            <button onClick={() => setLogs([])} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium">Clear Logs</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Polls List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Polls in Database: {polls.length}</h2>
            {loading && polls.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl shadow">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-3 text-gray-500">Loading...</p>
              </div>
            ) : polls.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-xl shadow">
                <p className="text-gray-500">No polls found. Click &quot;Create 3 Test Polls&quot; above.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {polls.map((poll) => (
                  <div key={poll.id} className="p-4 border rounded-xl bg-white shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 flex-1 mr-2">{poll.question}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(poll.status)}`}>{poll.status}</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1 mb-3">
                      <p>Course: <span className="font-medium">{poll.courseId}</span> · Timer: {poll.timer}s · Responses: {poll.totalResponses || 0}</p>
                      <p>Options: {poll.options?.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join(' | ')}</p>
                      <p>Correct: <span className="font-medium text-green-700">Option {String.fromCharCode(65 + poll.correctOption)}</span></p>
                      <p className="font-mono text-xs text-gray-400">ID: {poll.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {poll.status === 'draft' && <button onClick={() => handleStart(poll.id)} className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded text-xs font-medium">▶ Start</button>}
                      {poll.status === 'active' && (
                        <>
                          <button onClick={() => handleClose(poll.id)} className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-xs font-medium">■ Close</button>
                          <button onClick={() => handleFakeResponse(poll.id)} className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs font-medium">Submit Fake Response</button>
                        </>
                      )}
                      {poll.status !== 'active' && <button onClick={() => handleDelete(poll.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-xs font-medium">🗑 Delete</button>}
                      <button onClick={() => handleViewStats(poll.id)} className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1 rounded text-xs font-medium">Stats</button>
                      <button onClick={() => handleCalcResults(poll.id)} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 px-3 py-1 rounded text-xs font-medium">Results</button>
                      <button onClick={() => handleTestFormat(poll)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-medium">Format</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
            <div className="bg-white rounded-xl shadow p-4 max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No activity yet. Try clicking some buttons!</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div key={idx} className={`px-3 py-2 rounded-lg text-sm ${getLogColor(log.type)}`}>
                      <span className="font-mono text-xs opacity-60">{log.timestamp}</span>{' '}{log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-3">Testing Workflow</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>1.</strong> Click <strong>Create 3 Test Polls</strong> → creates sample polls in &quot;draft&quot; status</p>
            <p><strong>2.</strong> Click <strong>▶ Start</strong> on a draft poll → transitions to &quot;active&quot; (copies to Realtime DB)</p>
            <p><strong>3.</strong> Click <strong>Submit Fake Response</strong> on an active poll → simulates a student vote</p>
            <p><strong>4.</strong> Click <strong>■ Close</strong> → transitions to &quot;closed&quot; (removes from Realtime DB)</p>
            <p><strong>5.</strong> Click <strong>Stats</strong> or <strong>Results</strong> → view response analytics</p>
            <p><strong>6.</strong> Click <strong>🗑 Delete</strong> on draft/closed polls (cannot delete active polls)</p>
            <p><strong>7.</strong> Click <strong>Test Validation</strong> → sends bad data to verify validation catches it</p>
            <p><strong>8.</strong> Click <strong>Test Filters</strong> → runs all query functions and shows results in log</p>
          </div>
        </div>
      </div>
    </div>
  );
}