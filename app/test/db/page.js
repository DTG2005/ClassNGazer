'use client';
import { useEffect, useState } from 'react';
import { pollDatabase, PollStatus, createTestPolls, initializeDatabase, validatePollData, exportService } from '../../services/pollDatabase';

export default function TestDBPage() {
  const [polls, setPolls] = useState([]); const [loading, setLoading] = useState(false); const [logs, setLogs] = useState([]);
  useEffect(() => { load(); }, []);
  const log = (m, t = 'info') => setLogs(p => [{ m, t, ts: new Date().toLocaleTimeString() }, ...p.slice(0, 49)]);
  const load = async () => { setLoading(true); try { const p = await pollDatabase.getAllPolls(); setPolls(p); log(`Loaded ${p.length} polls`, 'success'); } catch (e) { log(e.message, 'error'); } setLoading(false); };
  const logColor = t => t === 'success' ? 'text-green-700 bg-green-50' : t === 'error' ? 'text-red-700 bg-red-50' : t === 'warning' ? 'text-yellow-700 bg-yellow-50' : 'text-blue-700 bg-blue-50';
  const sColor = s => s === 'active' ? 'bg-green-100 text-green-800' : s === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

  return (
    <div className="min-h-screen bg-gray-50 p-8"><div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Firebase Database Test</h1><p className="text-gray-600 mb-6">CRUD, state transitions, validation, analytics, export</p>
      <div className="bg-white rounded-xl shadow p-6 mb-6"><div className="flex flex-wrap gap-3">
        <button onClick={async () => { setLoading(true); await initializeDatabase(); log('DB initialized', 'success'); await load(); setLoading(false); }} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:bg-gray-400">Init DB</button>
        <button onClick={async () => { setLoading(true); const r = await createTestPolls(3); log(`Created ${r.filter(x=>x.success).length} polls`, 'success'); await load(); setLoading(false); }} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:bg-gray-400">Create 3 Test Polls</button>
        <button onClick={async () => { try { await pollDatabase.createPoll({ question: '', options: ['x'], correctOption: 9, courseId: '' }); } catch (e) { log(`Blocked: ${e.message}`, 'success'); } }} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Test Validation</button>
        <button onClick={load} disabled={loading} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:bg-gray-400">Reload</button>
        <button onClick={() => setLogs([])} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium">Clear Logs</button>
      </div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div><h2 className="text-xl font-semibold mb-4">Polls: {polls.length}</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">{polls.map(p => (<div key={p.id} className="p-4 border rounded-xl bg-white shadow-sm">
            <div className="flex justify-between mb-2"><h3 className="font-medium flex-1 mr-2">{p.question}</h3><span className={`px-2 py-1 rounded-full text-xs font-medium ${sColor(p.status)}`}>{p.status}</span></div>
            <p className="text-xs text-gray-500 mb-2">ID: {p.id} · {p.courseId} · {p.timer}s · {p.totalResponses || 0} resp · Correct: {(p.correctOptions || [p.correctOption]).join(',')}{p.imageUrls?.length ? ` · ${p.imageUrls.length} img` : ''}</p>
            <div className="flex flex-wrap gap-2">
              {p.status === 'draft' && <button onClick={async () => { try { await pollDatabase.updatePollStatus(p.id, 'active'); log(`→ active`, 'success'); await load(); } catch (e) { log(e.message, 'error'); } }} className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-medium">▶ Start</button>}
              {p.status === 'active' && <><button onClick={async () => { try { await pollDatabase.updatePollStatus(p.id, 'closed'); log(`→ closed`, 'success'); await load(); } catch (e) { log(e.message, 'error'); } }} className="bg-red-100 text-red-800 px-3 py-1 rounded text-xs">■ Close</button>
                <button onClick={async () => { try { await pollDatabase.submitResponse(p.id, `s-${Date.now()}`, 'Test', Math.floor(Math.random()*4)); log('Vote submitted', 'success'); await load(); } catch (e) { log(e.message, 'error'); } }} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs">Fake Vote</button></>}
              {p.status !== 'active' && <button onClick={async () => { try { await pollDatabase.deletePoll(p.id); log('Deleted', 'success'); await load(); } catch (e) { log(e.message, 'error'); } }} className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs">🗑 Del</button>}
              <button onClick={async () => { const s = await pollDatabase.getPollStats(p.id); log(s ? `Resp: ${s.totalResponses}, Correct: ${s.correctPercentage}%` : 'No stats', s ? 'info' : 'warning'); }} className="bg-purple-100 text-purple-800 px-3 py-1 rounded text-xs">Stats</button>
              {p.status === 'closed' && <><button onClick={() => exportService.downloadCSV(p.id)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs">📥 CSV</button>
                <button onClick={() => exportService.downloadJSON(p.id)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs">📥 JSON</button></>}
            </div>
          </div>))}{polls.length === 0 && <p className="text-gray-400 text-center py-8">No polls. Click Create.</p>}</div>
        </div>
        <div><h2 className="text-xl font-semibold mb-4">Activity Log</h2>
          <div className="bg-white rounded-xl shadow p-4 max-h-[600px] overflow-y-auto space-y-2">
            {logs.length === 0 ? <p className="text-gray-400 text-sm text-center py-4">No activity.</p> : logs.map((l, i) => (<div key={i} className={`px-3 py-2 rounded-lg text-sm ${logColor(l.t)}`}><span className="font-mono text-xs opacity-60">{l.ts}</span> {l.m}</div>))}
          </div>
        </div>
      </div>
    </div></div>
  );
}