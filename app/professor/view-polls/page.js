'use client';
import { useEffect, useState } from 'react';
import { pollDatabase, exportService } from '../../services/pollDatabase';
import { useRouter } from 'next/navigation';

export default function ViewPollsPage() {
  const router = useRouter();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchPolls(); }, []);
  const fetchPolls = async () => { setLoading(true); try { setPolls(await pollDatabase.getAllPolls()); } catch (e) { alert('Failed: ' + e.message); } setLoading(false); };
  const filtered = polls.filter(p => filter === 'all' || p.status === filter);
  const count = (s) => polls.filter(p => p.status === s).length;

  const handleStart = async (id) => { if (!confirm('Start this poll?')) return; try { await pollDatabase.updatePollStatus(id, 'active'); alert('✅ Started!'); fetchPolls(); } catch (e) { alert('❌ ' + e.message); } };
  const handleClose = async (id) => { if (!confirm('Close this poll?')) return; try { await pollDatabase.updatePollStatus(id, 'closed'); alert('✅ Closed!'); fetchPolls(); } catch (e) { alert('❌ ' + e.message); } };
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; try { await pollDatabase.deletePoll(id); alert('🗑️ Deleted!'); fetchPolls(); } catch (e) { alert('❌ ' + e.message); } };
  const statusColor = (s) => s === 'active' ? 'bg-green-100 text-green-800' : s === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
  const fmtDate = (ts) => { if (!ts) return ''; if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString(); return new Date(ts).toLocaleDateString(); };

  return (
    <div className="min-h-screen bg-gray-50 py-8"><div className="max-w-7xl mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <div><h1 className="text-3xl font-bold text-gray-900">Manage Polls</h1></div>
        <button onClick={() => router.push('/professor/create-poll')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">+ Create New Poll</button>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex space-x-6">
            {[['Total', polls.length, 'text-blue-600'], ['Active', count('active'), 'text-green-600'], ['Draft', count('draft'), 'text-yellow-600'], ['Closed', count('closed'), 'text-red-600']].map(([l, n, c]) => (
              <div key={l} className="text-center"><div className={`text-2xl font-bold ${c}`}>{n}</div><div className="text-sm text-gray-500">{l}</div></div>
            ))}
          </div>
          <div className="flex space-x-2">
            {['all', 'active', 'draft', 'closed'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg capitalize text-sm font-medium ${filter === f ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div></div>
      : filtered.length === 0 ? <div className="text-center py-12 bg-white rounded-xl shadow"><div className="text-5xl mb-4">📝</div><h3 className="text-xl font-semibold text-gray-700 mb-2">No polls found</h3><button onClick={() => router.push('/professor/create-poll')} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg">Create Poll</button></div>
      : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(poll => (
            <div key={poll.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(poll.status)}`}>{poll.status.toUpperCase()}</span>
                  <span className="text-sm text-gray-500">{poll.timer}s</span>
                </div>
                <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">{poll.question}</h3>
                {poll.imageUrls?.length > 0 && <p className="text-xs text-blue-600 mt-1">📷 {poll.imageUrls.length} image(s) attached</p>}
                {(poll.correctOptions?.length > 1) && <p className="text-xs text-purple-600 mt-1">Multiple correct answers</p>}
                <div className="mt-2 text-sm text-gray-600">
                  <p>Course: <span className="font-medium">{poll.courseId}</span></p>
                  {poll.totalResponses > 0 && <p>Responses: <span className="font-medium">{poll.totalResponses}</span></p>}
                  {poll.createdAt && <p>Created: {fmtDate(poll.createdAt)}</p>}
                </div>
              </div>
              <div className="p-6 border-b border-gray-100">
                <ul className="space-y-1.5">
                  {poll.options?.slice(0, 4).map((opt, i) => {
                    const isCorrect = (poll.correctOptions || [poll.correctOption]).map(Number).includes(i);
                    return (<li key={i} className="flex items-center text-sm">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${isCorrect ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-100 text-gray-600'}`}>{String.fromCharCode(65 + i)}</span>
                      <span className="truncate">{opt}</span>{isCorrect && <span className="ml-1 text-green-600 text-xs">✓</span>}
                    </li>);
                  })}
                </ul>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-2">
                  {poll.status === 'draft' && <button onClick={() => handleStart(poll.id)} className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium">▶ Start</button>}
                  {poll.status === 'active' && <>
                    <button onClick={() => handleClose(poll.id)} className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">■ Close</button>
                    {/* Blackboard View — Use Case Diagram (iii), Sequence Diagram (vii) */}
                    <button onClick={() => window.open(`/professor/blackboard/${poll.id}`, '_blank')} className="bg-gray-800 hover:bg-gray-900 text-white py-2 rounded-lg text-sm font-medium">📺 Blackboard</button>
                  </>}
                  <button onClick={() => { navigator.clipboard.writeText(poll.id); alert('Copied!'); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg text-sm font-medium">Copy ID</button>
                  {poll.status === 'closed' && <>
                    <button onClick={async () => { const s = await pollDatabase.getPollStats(poll.id); if (s) alert(`Responses: ${s.totalResponses}\nCorrect: ${s.correctPercentage}%`); }} className="bg-purple-100 hover:bg-purple-200 text-purple-700 py-2 rounded-lg text-sm font-medium">Results</button>
                    {/* Export — Sequence Diagram (ix) */}
                    <button onClick={() => exportService.downloadCSV(poll.id)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg text-sm font-medium">📥 CSV</button>
                    <button onClick={() => exportService.downloadJSON(poll.id)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg text-sm font-medium">📥 JSON</button>
                  </>}
                </div>
                {poll.status !== 'active' && <button onClick={() => handleDelete(poll.id)} className="w-full mt-2 text-red-600 hover:text-red-800 text-sm font-medium py-2 border border-red-200 rounded-lg">Delete</button>}
              </div>
            </div>
          ))}
        </div>}
    </div></div>
  );
}