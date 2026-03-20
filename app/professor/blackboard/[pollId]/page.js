'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { pollDatabase } from '../../../services/pollDatabase';

export default function BlackboardView() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [responseCount, setResponseCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [pollEnded, setPollEnded] = useState(false);
  const timerRef = useRef(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    loadPoll();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, [pollId]);

  const loadPoll = async () => {
    const p = await pollDatabase.getPollById(pollId);
    if (!p) return;
    setPoll(p);

    if (p.status === 'closed') {
      setPollEnded(true);
      setResults(await pollDatabase.calculateResults(pollId));
    } else if (p.status === 'active') {
      startTimer(p);
      listenForResponses();
    }
  };

  const startTimer = (p) => {
    if (!p.timer) return;
    let elapsed = 0;
    if (p.startedAt) {
      const st = p.startedAt.seconds ? p.startedAt.seconds * 1000 : new Date(p.startedAt).getTime();
      elapsed = Math.floor((Date.now() - st) / 1000);
    }
    let rem = Math.max(0, p.timer - elapsed);
    setTimeLeft(rem);
    timerRef.current = setInterval(() => {
      rem--;
      if (rem <= 0) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
        setPollEnded(true);
        pollDatabase.calculateResults(pollId).then(setResults);
      } else setTimeLeft(rem);
    }, 1000);
  };

  const listenForResponses = () => {
    unsubRef.current = pollDatabase.listenToLiveResponses(pollId, (responses) => {
      const count = Object.keys(responses).length;
      setResponseCount(count);

      // Build live distribution
      if (poll) {
        const n = poll.options?.length || 4;
        const counts = {}; for (let i = 0; i < n; i++) counts[i] = 0;
        Object.values(responses).forEach(r => { const idx = r.response ?? r.responses?.[0]; if (counts[idx] !== undefined) counts[idx]++; });
        const pcts = {}; for (let i = 0; i < n; i++) pcts[i] = count > 0 ? Math.round((counts[i] / count) * 100) : 0;
        setResults({
          totalResponses: count,
          distribution: poll.options.map((t, i) => ({ optionIndex: i, optionText: t, count: counts[i], percentage: pcts[i], isCorrect: (poll.correctOptions || [poll.correctOption]).map(Number).includes(i) })),
        });
      }
    });
  };

  const fmtTime = (s) => s === null ? '' : `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const barColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (!poll) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">{poll.courseId} — {poll.courseName}</div>
          <h1 className="text-4xl font-bold leading-tight">{poll.question}</h1>
          {poll.imageUrls?.length > 0 && (
            <div className="flex gap-4 mt-4">
              {poll.imageUrls.map((url, i) => (
                <img key={i} src={url} alt={`Image ${i + 1}`} className="max-h-48 rounded-lg border border-gray-700" />
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0 ml-8">
          {timeLeft !== null && timeLeft > 0 && (
            <div className={`text-6xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {fmtTime(timeLeft)}
            </div>
          )}
          {pollEnded && <div className="text-3xl font-bold text-red-500">POLL ENDED</div>}
          <div className="text-2xl font-semibold text-blue-400 mt-2">{responseCount || results?.totalResponses || 0} responses</div>
        </div>
      </div>

      {/* Results bars — large for projector */}
      <div className="flex-1 flex flex-col justify-center space-y-6">
        {(results?.distribution || poll.options?.map((t, i) => ({ optionIndex: i, optionText: t, count: 0, percentage: 0 }))).map((opt, i) => (
          <div key={i} className="flex items-center space-x-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 ${
              pollEnded && opt.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-800 text-gray-300'
            }`}>
              {String.fromCharCode(65 + i)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xl font-medium">{opt.optionText}</span>
                <span className="text-2xl font-bold">{opt.percentage || 0}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${opt.percentage || 0}%`, backgroundColor: pollEnded && opt.isCorrect ? '#10B981' : barColors[i % barColors.length] }}
                ></div>
              </div>
              <div className="text-sm text-gray-500 mt-1">{opt.count || 0} votes</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-800 flex justify-between text-sm text-gray-500">
        <span>ClassNGazer — Blackboard View</span>
        <span>Poll ID: {pollId}</span>
      </div>
    </div>
  );
}