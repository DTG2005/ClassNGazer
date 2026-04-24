'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { pollDatabase } from '../../services/pollDatabase';

export default function BlackboardView() {
  const { pollId } = useParams();
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [responseCount, setResponseCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [ended, setEnded] = useState(false);
  const timerRef = useRef(null);
  const unsubRef = useRef(null);

  const unsubPollRef = useRef(null);

  useEffect(() => {
    loadPoll();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (unsubRef.current) unsubRef.current();
      if (unsubPollRef.current) unsubPollRef.current();
    };
  }, [pollId]);

  const loadPoll = async () => {
    const p = await pollDatabase.getPollById(pollId);
    if (!p) return;
    setPoll(p);
    if (p.status === 'closed') { setEnded(true); setResults(await pollDatabase.calculateResults(pollId)); }
    else if (p.status === 'active') { startTimer(p); listen(); }
  };

  const startTimer = (p) => {
    if (!p.timer) return;
    let elapsed = 0;
    if (p.startedAt) { const st = p.startedAt.seconds ? p.startedAt.seconds * 1000 : new Date(p.startedAt).getTime(); elapsed = Math.floor((Date.now() - st) / 1000); }
    let rem = Math.max(0, p.timer - elapsed);
    setTimeLeft(rem);
    timerRef.current = setInterval(() => { rem--; if (rem <= 0) { clearInterval(timerRef.current); setTimeLeft(0); setEnded(true); pollDatabase.calculateResults(pollId).then(setResults); } else setTimeLeft(rem); }, 1000);
  };

  const handlePollEnded = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    setEnded(true);
    pollDatabase.calculateResults(pollId).then(setResults);
  };

  const listen = () => {
    // Listen to responses for live bar updates
    unsubRef.current = pollDatabase.listenToLiveResponses(pollId, (responses) => {
      const count = Object.keys(responses).length;
      setResponseCount(count);
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

    // Listen to the poll node itself — when it becomes null, professor manually closed it
    unsubPollRef.current = pollDatabase.listenToLivePoll(pollId, (data) => {
      if (data === null) handlePollEnded();
    });
  };

  const fmt = (s) => s === null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const bars = ['#FF6B2B', '#3B82F6', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899'];

  if (!poll) return <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '48px', height: '48px', border: '4px solid #333', borderTopColor: '#FF6B2B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', padding: '40px', display: 'flex', flexDirection: 'column', fontFamily: 'Sora, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{poll.courseId} · {poll.courseName}</div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1.2 }}>{poll.question}</h1>
        </div>
        <div style={{ textAlign: 'right', marginLeft: '40px' }}>
          {timeLeft !== null && timeLeft > 0 && (
            <div style={{ fontSize: '56px', fontWeight: 800, fontFamily: 'DM Mono, monospace', color: timeLeft <= 10 ? '#EF4444' : 'white', animation: timeLeft <= 10 ? 'pulse 1s ease-out infinite' : 'none' }}>{fmt(timeLeft)}</div>
          )}
          {ended && <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444' }}>POLL ENDED</div>}
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FF6B2B', marginTop: '4px' }}>{responseCount || results?.totalResponses || 0} responses</div>
        </div>
      </div>

      {/* Timer bar */}
      {timeLeft !== null && poll.timer && (
        <div style={{ height: '6px', background: '#222', borderRadius: '99px', marginBottom: '32px', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '99px', background: timeLeft <= 10 ? '#EF4444' : '#FF6B2B', width: `${ended ? 0 : (timeLeft / poll.timer) * 100}%`, transition: 'width 1s linear' }} />
        </div>
      )}

      {/* Results bars */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' }}>
        {(results?.distribution || poll.options?.map((t, i) => ({ optionIndex: i, optionText: t, count: 0, percentage: 0 }))).map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, background: ended && opt.isCorrect ? '#22C55E' : '#1a1a1a', color: ended && opt.isCorrect ? 'white' : '#888', flexShrink: 0 }}>{String.fromCharCode(65 + i)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 600 }}>{opt.optionText}</span>
                <span style={{ fontSize: '22px', fontWeight: 800 }}>{opt.percentage || 0}%</span>
              </div>
              <div style={{ height: '32px', background: '#1a1a1a', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: '12px', width: `${opt.percentage || 0}%`, background: ended && opt.isCorrect ? '#22C55E' : bars[i % bars.length], transition: 'width 0.7s ease' }} />
              </div>
              <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{opt.count || 0} votes</div>
            </div>
          </div>
        ))}
      </div>

      {/* Solution */}
      {ended && poll.solution && (
        <div style={{ marginTop: '32px', padding: '20px 24px', borderRadius: '16px', background: '#1a1500', border: '1px solid #3a2e00' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#CA8A04', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>💡 Solution</div>
          <div style={{ fontSize: '18px', color: '#FEF08A', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{poll.solution}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#444' }}>
        <span>ClassNGazer · Blackboard View</span><span>{pollId}</span>
      </div>
    </div>
  );
}