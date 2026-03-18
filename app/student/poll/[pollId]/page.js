'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pollDatabase } from '../../../services/pollDatabase';

export default function StudentPollPage() {
  const { pollId } = useParams(); const router = useRouter();
  const [poll, setPoll] = useState(null); const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null); const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false); const [timeLeft, setTimeLeft] = useState(null);
  const [pollEnded, setPollEnded] = useState(false); const [error, setError] = useState(''); const [results, setResults] = useState(null);
  const timerRef = useRef(null); const unsubRef = useRef(null);
  const studentId = useRef(`student-${Math.random().toString(36).slice(2, 10)}`).current;

  useEffect(() => { loadPoll(); return () => { if (timerRef.current) clearInterval(timerRef.current); if (unsubRef.current) unsubRef.current(); }; }, [pollId]);

  const loadPoll = async () => { try { const p = await pollDatabase.getPollById(pollId); if (!p) { setError('Poll not found.'); setLoading(false); return; } setPoll(p);
    if (p.status === 'closed') { setPollEnded(true); setResults(await pollDatabase.calculateResults(pollId)); }
    else if (p.status === 'active') { startTimer(p); listenForChanges(); } else { setError('Poll has not started.'); } setLoading(false); } catch { setError('Failed to load.'); setLoading(false); } };

  const startTimer = (p) => { if (!p.timer) return; let elapsed = 0;
    if (p.startedAt) { const st = p.startedAt.seconds ? p.startedAt.seconds * 1000 : new Date(p.startedAt).getTime(); elapsed = Math.floor((Date.now() - st) / 1000); }
    let rem = Math.max(0, p.timer - elapsed); setTimeLeft(rem);
    timerRef.current = setInterval(() => { rem--; if (rem <= 0) { clearInterval(timerRef.current); setTimeLeft(0); setPollEnded(true); pollDatabase.calculateResults(pollId).then(setResults); } else setTimeLeft(rem); }, 1000); };

  const listenForChanges = () => { unsubRef.current = pollDatabase.listenToLivePoll(pollId, (data) => {
    if (!data || data.liveStatus !== 'active') { setPollEnded(true); if (timerRef.current) clearInterval(timerRef.current); pollDatabase.calculateResults(pollId).then(setResults); } }); };

  const handleSubmit = async () => { if (selectedOption === null || submitted || submitting) return; setSubmitting(true);
    try { await pollDatabase.submitResponse(pollId, studentId, 'Student', selectedOption); setSubmitted(true); }
    catch (e) { if (e.message.includes('already')) setSubmitted(true); else alert('Failed: ' + e.message); } finally { setSubmitting(false); } };

  const fmtTime = (s) => s === null ? '' : `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center p-4"><div className="text-center"><div className="text-5xl mb-4">😕</div><p className="text-gray-600 mb-6">{error}</p><button onClick={() => router.push('/student/join')} className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium">← Back</button></div></div>;

  if (pollEnded && results) return (
    <div className="min-h-screen bg-gray-50 p-4"><div className="max-w-lg mx-auto pt-8">
      <div className="text-center mb-6"><div className="text-4xl mb-2">📊</div><h1 className="text-2xl font-bold">Results</h1></div>
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">{poll.question}</h2>
        {poll.imageUrls?.length > 0 && <div className="flex gap-2 mb-4">{poll.imageUrls.map((url, i) => <img key={i} src={url} alt="" className="max-h-32 rounded-lg" />)}</div>}
        <div className="space-y-4">{results.distribution.map(opt => (
          <div key={opt.optionIndex}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center space-x-2">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${opt.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>{String.fromCharCode(65 + opt.optionIndex)}</span>
                <span className="text-sm font-medium">{opt.optionText}</span>
                {opt.isCorrect && <span className="text-green-600 text-xs">✓</span>}
                {opt.optionIndex === selectedOption && <span className="text-blue-600 text-xs">← You</span>}
              </div><span className="text-sm font-semibold">{opt.percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3"><div className={`h-full rounded-full transition-all duration-1000 ${opt.isCorrect ? 'bg-green-500' : 'bg-gray-400'}`} style={{ width: `${opt.percentage}%` }}></div></div>
          </div>
        ))}</div>
        <div className="mt-6 pt-4 border-t text-center"><p className="text-sm text-gray-500">{results.totalResponses} responses</p>
          {submitted && selectedOption !== null && <p className={`mt-2 text-sm font-semibold ${(poll.correctOptions || [poll.correctOption]).map(Number).includes(selectedOption) ? 'text-green-600' : 'text-red-600'}`}>{(poll.correctOptions || [poll.correctOption]).map(Number).includes(selectedOption) ? '🎉 Correct!' : '❌ Better luck next time!'}</p>}
        </div>
      </div>
      <div className="text-center mt-6"><button onClick={() => router.push('/student/join')} className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium">Join Another</button></div>
    </div></div>
  );

  if (submitted) return <div className="min-h-screen flex items-center justify-center p-4"><div className="text-center"><div className="text-5xl mb-4">✅</div><h2 className="text-2xl font-bold mb-2">Submitted!</h2><p className="text-gray-600">Option {String.fromCharCode(65 + selectedOption)}</p><p className="text-gray-500 text-sm mt-2">Waiting for professor...</p>{timeLeft > 0 && <div className="mt-4 text-2xl font-mono font-bold">{fmtTime(timeLeft)}</div>}</div></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {timeLeft !== null && <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-between"><span className="text-sm text-gray-500">Time</span><span className={`text-2xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500' : ''}`}>{fmtTime(timeLeft)}</span></div>
        <div className="h-1 bg-gray-100"><div className={`h-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${(timeLeft / poll.timer) * 100}%` }}></div></div>
      </div>}
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="text-center mb-2"><span className="text-xs font-semibold text-gray-400 uppercase">{poll.courseId}</span></div>
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-xl font-bold">{poll.question}</h1>
          {poll.imageUrls?.length > 0 && <div className="flex gap-2 mt-4">{poll.imageUrls.map((url, i) => <img key={i} src={url} alt="" className="max-h-40 rounded-lg" />)}</div>}
        </div>
        <div className="space-y-3 mb-8">{poll.options.map((opt, i) => (
          <button key={i} onClick={() => setSelectedOption(i)} disabled={submitting}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedOption === i ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <div className="flex items-center space-x-4">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${selectedOption === i ? 'bg-green-500 text-white' : 'bg-gray-100'}`}>{String.fromCharCode(65 + i)}</span>
              <span className={`text-base font-medium ${selectedOption === i ? 'text-green-800' : ''}`}>{opt}</span>
            </div>
          </button>
        ))}</div>
        <button onClick={handleSubmit} disabled={selectedOption === null || submitting}
          className={`w-full py-4 rounded-xl font-semibold text-lg text-white ${selectedOption === null ? 'bg-gray-300' : submitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}>
          {submitting ? 'Submitting...' : selectedOption === null ? 'Select an option' : `Submit (${String.fromCharCode(65 + selectedOption)})`}
        </button>
      </div>
    </div>
  );
}