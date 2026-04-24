'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pollDatabase } from '../../services/pollDatabase';
import { useAuth } from '../../../context/AuthContext';

// ── Inline LaTeX renderer (for blackboard) ──
function LatexBB({ text, style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !text) return;
    import('katex').then(katex => {
      const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([^)]+?\\\))/g;
      const segments = [];
      let last = 0, match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > last) segments.push({ type: 'text', content: text.slice(last, match.index) });
        const raw = match[1];
        const isBlock = raw.startsWith('$$') || raw.startsWith('\\[');
        const inner = raw.startsWith('$$') ? raw.slice(2, -2) : raw.startsWith('\\[') ? raw.slice(2, -2) : raw.startsWith('\\(') ? raw.slice(2, -2) : raw.slice(1, -1);
        segments.push({ type: isBlock ? 'block' : 'inline', content: inner.trim() });
        last = match.index + raw.length;
      }
      if (last < text.length) segments.push({ type: 'text', content: text.slice(last) });
      ref.current.innerHTML = segments.map(seg => {
        if (seg.type === 'text') return `<span>${seg.content.replace(/\n/g, '<br/>')}</span>`;
        try { return katex.default.renderToString(seg.content, { displayMode: seg.type === 'block', throwOnError: false, strict: false }); }
        catch { return `<span style="color:#e53e3e">${seg.content}</span>`; }
      }).join('');
    }).catch(() => { if (ref.current) ref.current.textContent = text; });
  }, [text]);
  return <span ref={ref} style={style}>{text}</span>;
}

export default function BlackboardView() {
  const { pollId } = useParams();
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [poll, setPoll] = useState(null);
  const [results, setResults] = useState(null);
  const [responseCount, setResponseCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [ended, setEnded] = useState(false);
  const [ending, setEnding] = useState(false);
  const [showPieChart, setShowPieChart] = useState(false);
  const timerRef = useRef(null);
  const unsubRef = useRef(null);
  const unsubPollRef = useRef(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'teacher')) {
      router.push('/auth');
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (user && role === 'teacher') {
      loadPoll();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (unsubRef.current) unsubRef.current();
      if (unsubPollRef.current) unsubPollRef.current();
    };
  }, [pollId, user, role]);

  const loadPoll = async () => {
    const p = await pollDatabase.getPollById(pollId);
    if (!p) return;
    setPoll(p);
    if (p.status === 'closed') { setEnded(true); setResults(await pollDatabase.calculateResults(pollId)); }
    else if (p.status === 'active') { startTimer(p); listen(p); }
  };

  const remRef = useRef(null);

  const startTimer = (p) => {
    if (!p.timer) return;
    let elapsed = 0;
    if (p.startedAt) { const st = p.startedAt.seconds ? p.startedAt.seconds * 1000 : new Date(p.startedAt).getTime(); elapsed = Math.floor((Date.now() - st) / 1000); }
    remRef.current = Math.max(0, p.timer - elapsed);
    if (remRef.current <= 0) { setEnded(true); setTimeLeft(0); pollDatabase.calculateResults(pollId).then(setResults); return; }
    setTimeLeft(remRef.current);
    timerRef.current = setInterval(() => { 
      remRef.current--; 
      if (remRef.current <= 0) { clearInterval(timerRef.current); setTimeLeft(0); setEnded(true); pollDatabase.calculateResults(pollId).then(setResults); } 
      else setTimeLeft(remRef.current); 
    }, 1000);
  };

  const handlePollEnded = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    setEnded(true);
    pollDatabase.calculateResults(pollId).then(setResults);
  };

  const handleAddTime = async () => {
    try {
      await pollDatabase.addTime(pollId, 30);
    } catch (e) {
      console.error('Error adding time:', e);
    }
  };

  const handleEndPoll = async () => {
    setEnding(true);
    try {
      await pollDatabase.updatePollStatus(pollId, 'closed');
      handlePollEnded();
    } catch (e) {
      if (e.message?.includes('Cannot close')) handlePollEnded();
      else console.error(e);
    }
    setEnding(false);
  };

  const listen = (pollData) => {
    // Listen to responses for live bar updates
    unsubRef.current = pollDatabase.listenToLiveResponses(pollId, (responses) => {
      const count = Object.keys(responses).length;
      setResponseCount(count);
      const p = pollData;
      const n = p.options?.length || 4;
      const counts = {}; for (let i = 0; i < n; i++) counts[i] = 0;
      Object.values(responses).forEach(r => { const idx = r.response ?? r.responses?.[0]; if (counts[idx] !== undefined) counts[idx]++; });
      const pcts = {}; for (let i = 0; i < n; i++) pcts[i] = count > 0 ? Math.round((counts[i] / count) * 100) : 0;
      setResults({
        totalResponses: count,
        distribution: p.options.map((optData, i) => ({ 
          optionIndex: i, 
          optionText: typeof optData === 'string' ? optData : optData.text, 
          optionImage: typeof optData === 'string' ? null : optData.image,
          count: counts[i], 
          percentage: pcts[i], 
          isCorrect: (p.correctOptions || [p.correctOption]).map(Number).includes(i) 
        })),
      });
    });

    // Listen to the poll node itself — when it becomes null, professor manually closed it
    unsubPollRef.current = pollDatabase.listenToLivePoll(pollId, (data) => {
      if (data === null) handlePollEnded();
      else if (data.timer && data.liveStartedAt) {
        // Deterministic: same calc on every client, no doubling
        const elapsed = Math.floor((Date.now() - data.liveStartedAt) / 1000);
        const newRemaining = Math.max(0, data.timer - elapsed);
        if (remRef.current !== null && newRemaining > remRef.current) {
          remRef.current = newRemaining;
          setTimeLeft(newRemaining);
          setPoll(prev => prev ? { ...prev, timer: data.timer } : prev);
        }
      }
    });
  };

  const fmt = (s) => s === null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const bars = ['#FF6B2B', '#3B82F6', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899'];

  const getPieChartStyle = () => {
    let currentPercent = 0;
    const slices = (results?.distribution || []).map((opt, i) => {
      const color = ended && opt.isCorrect ? '#22C55E' : bars[i % bars.length];
      const start = currentPercent;
      currentPercent += (opt.percentage || 0);
      return `${color} ${start}% ${currentPercent}%`;
    });
    // In case total percentage < 100 or empty, fill rest with empty color
    if (currentPercent < 100) {
      slices.push(`transparent ${currentPercent}% 100%`);
    }
    return `conic-gradient(${slices.join(', ')})`;
  };

  if (authLoading || !user || role !== 'teacher' || !poll) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '48px', height: '48px', border: '4px solid #333', borderTopColor: '#FF6B2B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', padding: '40px', display: 'flex', flexDirection: 'column', fontFamily: 'Sora, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{poll.courseId} · {poll.courseName}</div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1.2 }}><LatexBB text={poll.question} /></h1>
          {poll.questionImage && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <img src={poll.questionImage} alt="Question context" style={{ maxHeight: '400px', maxWidth: '100%', borderRadius: '12px', border: '2px solid #333' }} />
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', marginLeft: '40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
          {timeLeft !== null && timeLeft > 0 && (
            <div style={{ fontSize: '56px', fontWeight: 800, fontFamily: 'DM Mono, monospace', color: timeLeft <= 10 ? '#EF4444' : 'white', animation: timeLeft <= 10 ? 'pulse 1s ease-out infinite' : 'none' }}>{fmt(timeLeft)}</div>
          )}
          {ended && <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444' }}>POLL ENDED</div>}
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FF6B2B', marginTop: '4px' }}>{responseCount || results?.totalResponses || 0} responses</div>

          {/* ── Active Poll Controls ── */}
          {!ended && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={handleAddTime}
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(59,130,246,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.35)'; }}
                title="Add 30 seconds"
              >
                +30s
              </button>
              <button
                onClick={handleEndPoll}
                disabled={ending}
                style={{
                  padding: '14px 28px',
                  flex: 1,
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 800,
                  background: ending ? '#333' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                  color: 'white',
                  border: 'none',
                  cursor: ending ? 'not-allowed' : 'pointer',
                  boxShadow: ending ? 'none' : '0 8px 24px rgba(239,68,68,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!ending) { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(239,68,68,0.45)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(239,68,68,0.35)'; }}
              >
                {ending ? (
                  <><span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />Ending...</>
                ) : (
                  <>■ End Poll</>
                )}
              </button>
            </div>
          )}

          {/* ── Pie Chart Toggle (only after poll ends) ── */}
          {ended && (
            <button
              onClick={() => setShowPieChart(!showPieChart)}
              style={{
                marginTop: '8px',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                background: '#222',
                color: 'white',
                border: '1px solid #444',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#333'}
              onMouseLeave={e => e.currentTarget.style.background = '#222'}
            >
              {showPieChart ? 'View as Bar Chart' : 'View as Pie Chart'}
            </button>
          )}

          <button
            onClick={() => window.close()}
            style={{ marginTop: '8px', padding: '10px 20px', borderRadius: '12px', background: '#111', color: '#888', fontSize: '14px', fontWeight: 600, border: '1px solid #333', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#222'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#888' }}
          >
            ✕ Close Window
          </button>
        </div>
      </div>

      {/* Timer bar */}
      {timeLeft !== null && poll.timer && (
        <div style={{ height: '6px', background: '#222', borderRadius: '99px', marginBottom: '32px', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '99px', background: timeLeft <= 10 ? '#EF4444' : '#FF6B2B', width: `${ended ? 0 : (timeLeft / poll.timer) * 100}%`, transition: 'width 1s linear' }} />
        </div>
      )}

      {/* Results bars — CORRECT OPTION ONLY SHOWN AFTER POLL ENDS */}
      {showPieChart && ended ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '40px' }}>
          <div style={{
            width: '320px', height: '320px', borderRadius: '50%',
            background: getPieChartStyle(),
            boxShadow: '0 0 50px rgba(0,0,0,0.5)',
            border: '8px solid #1a1a1a'
          }} />
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {(results?.distribution || []).map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#111', padding: '12px 20px', borderRadius: '12px', border: '1px solid #333' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: ended && opt.isCorrect ? '#22C55E' : bars[i % bars.length] }} />
                <span style={{ fontSize: '16px', fontWeight: 600 }}>{String.fromCharCode(65 + i)}: <LatexBB text={opt.optionText} /> <span style={{ opacity: 0.6 }}>({opt.percentage || 0}%)</span></span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: '40px', paddingTop: '40px', paddingBottom: '20px' }}>
          {(results?.distribution || poll.options?.map((t, i) => ({ optionIndex: i, optionText: typeof t === 'string' ? t : t.text, optionImage: typeof t === 'string' ? null : t.image, count: 0, percentage: 0, isCorrect: false }))).map((opt, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', flex: 1, maxWidth: '140px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{opt.percentage || 0}%</div>
              
              {/* Vertical Bar */}
              <div style={{ height: '300px', width: '60px', background: '#1a1a1a', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
                <div style={{
                  width: '100%', borderRadius: '16px',
                  height: `${opt.percentage || 0}%`,
                  background: ended && opt.isCorrect ? '#22C55E' : bars[i % bars.length],
                  transition: 'height 0.7s ease',
                }} />
              </div>
              
              {/* Label Circle */}
              <div style={{
                width: '60px', height: '60px', borderRadius: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 800,
                background: ended && opt.isCorrect ? '#22C55E' : '#1a1a1a',
                color: ended && opt.isCorrect ? 'white' : '#888',
                flexShrink: 0,
                border: ended && opt.isCorrect ? 'none' : '2px solid #333'
              }}>
                {ended && opt.isCorrect ? '✓' : String.fromCharCode(65 + i)}
              </div>
              
              <div style={{ fontSize: '16px', fontWeight: 600, textAlign: 'center', minHeight: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', wordBreak: 'break-word', width: '100%', gap: '8px' }}>
                {opt.optionText && <LatexBB text={opt.optionText} />}
                {opt.optionImage && (
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <img src={opt.optionImage} style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', border: '1px solid #333' }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: '14px', color: '#555' }}>{opt.count || 0} votes</div>
            </div>
          ))}
        </div>
      )}

      {/* Solution — only shown after poll ends */}
      {ended && (poll.solution || poll.solutionImage) && (
        <div style={{ marginTop: '32px', padding: '20px 24px', borderRadius: '16px', background: '#1a1500', border: '1px solid #3a2e00' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#CA8A04', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Solution</div>
          {poll.solution && <div style={{ fontSize: '18px', color: '#FEF08A', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}><LatexBB text={poll.solution} /></div>}
          {poll.solutionImage && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <img src={poll.solutionImage} style={{ maxHeight: '350px', maxWidth: '100%', borderRadius: '12px', border: '1px solid #3a2e00' }} />
            </div>
          )}
        </div>
      )}

      {/* Correct answer announcement — only after ended */}
      {ended && results?.distribution && (
        <div style={{ marginTop: '20px', padding: '16px 24px', borderRadius: '16px', background: '#052e16', border: '1px solid #166534' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ADE80', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Correct Answer: {results.distribution.filter(d => d.isCorrect).map(d => `${String.fromCharCode(65 + d.optionIndex)} — ${d.optionText}`).join(', ')}
          </div>
        </div>
      )}

      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#444' }}>
        <span>ClassNGazer · Blackboard View</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>{pollId}</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }`}</style>
    </div>
  );
}