'use client';
import { useState, useEffect, useRef } from 'react';
import { pollDatabase } from '../services/pollDatabase';
import { db } from '../../lib/firebase/init';
import { collection, query, where, getDocs } from 'firebase/firestore';

// ── Inline LaTeX renderer ──
function LatexInline({ text }) {
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
  return <span ref={ref}>{text}</span>;
}

export default function PollDetailModal({ poll, onClose, role, onClosePoll, user, onEdit }) {
  // Real user ID for duplicate prevention
  const studentId = user?.uid || `anon-${typeof window !== 'undefined' ? (sessionStorage.getItem('cng-sid') || (() => { const id = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('cng-sid', id); return id; })()) : 'unknown'}`;
  const studentName = user?.name || user?.displayName || 'Anonymous';

  const [selectedOptions, setSelectedOptions] = useState(() => {
    if (typeof localStorage !== 'undefined' && role === 'student') {
      const saved = localStorage.getItem(`poll-draft-${poll.id}-${studentId}`);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);
  const [liveCount, setLiveCount] = useState(poll.totalResponses || 0);
  const [livePoll, setLivePoll] = useState(poll);
  const [pollClosed, setPollClosed] = useState(poll.status === 'closed');
  const [studentResponse, setStudentResponse] = useState(null);
  const [showPieChart, setShowPieChart] = useState(false);
  const timerRef = useRef(null);

  const multipleCorrect = (livePoll.correctOptions?.length || 1) > 1;
  const isActive = livePoll.status === 'active' && !expired && !pollClosed;

  // ── CONTROLLED RESULT VISIBILITY ──
  const showResults = pollClosed && poll.status !== 'draft';
  const showCorrect = pollClosed; // correct answer only visible after poll ends
  const showStudentFeedback = role === 'student' && pollClosed && submitted;

  // ── Auto-save draft ──
  useEffect(() => {
    if (role === 'student' && typeof localStorage !== 'undefined') {
      if (submitted) {
        localStorage.removeItem(`poll-draft-${poll.id}-${studentId}`);
      } else {
        localStorage.setItem(`poll-draft-${poll.id}-${studentId}`, JSON.stringify(selectedOptions));
      }
    }
  }, [selectedOptions, poll.id, studentId, submitted, role]);

  // ── Check Firestore for past submission ──
  useEffect(() => {
    if (role !== 'student' || !user?.uid || poll.status === 'draft') return;
    (async () => {
      try {
        const q = query(
          collection(db, 'responses'),
          where('pollId', '==', poll.id),
          where('studentId', '==', user.uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setSubmitted(true);
          const resp = snap.docs[0].data();
          const r = resp.response; // Could be array or number
          const idxs = Array.isArray(r) ? r : [r];
          setStudentResponse(idxs);
          const selIds = idxs.map(i => poll.options[i]?.id).filter(Boolean);
          setSelectedOptions(selIds);
        }
      } catch (e) { console.error('Error checking past response:', e); }
    })();
  }, [poll.id, user?.uid, role]);

  // ── Timer countdown ──
  const targetEndRef = useRef(null);
  useEffect(() => {
    if (poll.status !== 'active' || !poll.timeLimit) return;
    let isActive = true;

    const startTimer = async () => {
      try {
        const fb = await pollDatabase.getPollById(poll.id);
        if (!isActive) return;
        if (!fb || fb.status !== 'active') { setExpired(true); setPollClosed(true); return; }

        let startMs = Date.now();
        if (fb.startedAt) {
          startMs = fb.startedAt.seconds ? fb.startedAt.seconds * 1000 : new Date(fb.startedAt).getTime();
        }
        
        const limitMs = (fb.timer || poll.timeLimit) * 1000;
        targetEndRef.current = startMs + limitMs;

        const updateTick = () => {
          if (!targetEndRef.current) return;
          const rem = Math.floor((targetEndRef.current - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(timerRef.current);
            setTimeLeft(0); setExpired(true); setPollClosed(true);
            if (role === 'professor' && onClosePoll) onClosePoll(poll.id);
          } else {
            setTimeLeft(rem);
          }
        };

        updateTick(); // Initial tick
        timerRef.current = setInterval(updateTick, 1000);
      } catch (e) { console.error(e); }
    };

    startTimer();

    return () => { 
      isActive = false;
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [poll.id]);

  // ── Live response listener ──
  useEffect(() => {
    if (poll.status !== 'active') return;
    const unsub = pollDatabase.listenToLiveResponses(poll.id, (responses) => {
      const count = Object.keys(responses).length;
      setLiveCount(count);
      if (responses[studentId]) setSubmitted(true);
      const opts = poll.options.map((o, i) => {
        let v = 0;
        Object.values(responses).forEach(r => {
          // response can be a number (single) or array (multi-select)
          const idxs = Array.isArray(r.response) ? r.response : [r.response];
          if (idxs.includes(i)) v++;
        });
        return { ...o, votes: v };
      });
      setLivePoll(prev => ({ ...prev, options: opts, totalResponses: count }));
    });
    return () => unsub && unsub();
  }, [poll.id]);

  // ── Detect when professor closes poll ──
  useEffect(() => {
    if (poll.status !== 'active') return;
    const unsub = pollDatabase.listenToLivePoll(poll.id, (data) => {
      if (!data || data.liveStatus !== 'active') {
        setExpired(true); setPollClosed(true);
        if (timerRef.current) clearInterval(timerRef.current);
        pollDatabase.getPollById(poll.id).then(fbPoll => {
          if (fbPoll) {
            const correctSet = new Set((fbPoll.correctOptions || [fbPoll.correctOption]).map(Number));
            const opts = (fbPoll.options || []).map((text, i) => ({
              ...livePoll.options[i],
              text: typeof text === 'string' ? text : text.text,
              image: typeof text === 'string' ? null : text.image,
              votes: fbPoll.count?.[String(i)] || livePoll.options[i]?.votes || 0,
              isCorrect: correctSet.has(i),
            }));
            setLivePoll(prev => ({ ...prev, options: opts, totalResponses: fbPoll.totalResponses || prev.totalResponses, status: 'closed' }));
          }
        });
      } else if (data.timer && data.liveStartedAt) {
        // Deterministic recompute: every client calculates same remaining time.
        const elapsed = Math.floor((Date.now() - data.liveStartedAt) / 1000);
        const newRemaining = Math.max(0, data.timer - elapsed);
        if (targetEndRef.current && newRemaining > timeLeft) {
          targetEndRef.current = Date.now() + (newRemaining * 1000);
          setTimeLeft(newRemaining);
        }
      }
    });
    return () => unsub && unsub();
  }, [poll.id]);

  const fmt = (s) => s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const timerPct = (poll.timeLimit && timeLeft != null) ? (timeLeft / poll.timeLimit) * 100 : 100;
  const urgent = timeLeft != null && timeLeft <= 10;

  const toggleOption = (id) => {
    if (role !== 'student' || !isActive) return;
    if (multipleCorrect) {
      setSelectedOptions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelectedOptions([id]);
    }
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const idxs = selectedOptions.map(id => livePoll.options.findIndex(o => o.id === id));
      const payload = multipleCorrect ? idxs : idxs[0];
      await pollDatabase.submitResponse(poll.id, studentId, studentName, payload);
      setSubmitted(true);
      setStudentResponse(idxs);
    } catch (e) {
      if (e.message.includes('already')) setSubmitted(true);
      else alert(e.message);
    }
    setSubmitting(false);
  };

  const handleAddTime = async () => {
    try {
      await pollDatabase.addTime(poll.id, 30);
    } catch (e) { alert(e.message); }
  };

  // Feedback calculation
  let feedbackStatus = null; // 'correct', 'partial', 'wrong'
  if (showStudentFeedback && studentResponse) {
    const correctIndices = new Set((livePoll.correctOptions || [livePoll.correctOption]).map(Number));
    const userIndices = new Set((Array.isArray(studentResponse) ? studentResponse : [studentResponse]).map(Number));

    let hasWrong = false;
    let correctCount = 0;

    userIndices.forEach(idx => {
      if (correctIndices.has(idx)) correctCount++;
      else hasWrong = true;
    });

    if (hasWrong) {
      feedbackStatus = 'wrong';
    } else if (correctCount === correctIndices.size) {
      feedbackStatus = 'correct';
    } else {
      feedbackStatus = 'partial'; // correct options chosen but not all
    }
  }

  return (
    <div style={S.ov} onClick={onClose}><div style={S.card} onClick={e => e.stopPropagation()}>

      {/* ── Header ── */}
      <div style={S.hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={S.topic}>{poll.topic}</span>
          {poll.status !== 'draft' && (
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px',
            ...(isActive ? { background: '#DCFCE7', color: '#15803D' }
              : pollClosed ? { background: 'var(--gray-100)', color: 'var(--gray-600)' }
              : { background: 'var(--red-pale)', color: 'var(--red)' })
          }}>
            {isActive ? '● Live' : pollClosed ? '✓ Closed' : 'Time Up'}
          </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showResults && role === 'professor' && (
            <button
              onClick={() => setShowPieChart(!showPieChart)}
              style={{ fontSize: '11px', fontWeight: 600, padding: '6px 12px', borderRadius: '6px', background: 'var(--gray-100)', color: 'var(--gray-600)', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-200)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--gray-100)'}
            >
              {showPieChart ? 'Bar Chart' : 'Pie Chart'}
            </button>
          )}
          <button style={S.close} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* ── Timer bar ── */}
      {poll.status === 'active' && timeLeft != null && (
        <div style={{ padding: '0 24px', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: urgent ? 'var(--red)' : 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {expired || pollClosed ? 'Poll ended' : 'Time remaining'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {role === 'professor' && !expired && !pollClosed && (
                <button onClick={(e) => { e.stopPropagation(); handleAddTime(); }} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--blue-pale)', color: '#1D4ED8', border: '1px solid #BFDBFE', cursor: 'pointer', fontWeight: 700 }} title="Add 30 seconds">+30s</button>
              )}
              <span style={{ fontSize: '20px', fontWeight: 800, color: urgent ? 'var(--red)' : 'var(--orange)', fontFamily: 'DM Mono' }}>
                {expired || pollClosed ? '0:00' : fmt(timeLeft)}
              </span>
            </div>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--gray-100)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '99px', width: `${expired || pollClosed ? 0 : timerPct}%`, background: urgent ? 'var(--red)' : 'var(--orange)', transition: 'width 1s linear' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: 'var(--gray-400)' }}>
            {liveCount} response{liveCount !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ── Question ── */}
      <div style={{ padding: '16px 24px 20px', borderBottom: '1px solid var(--gray-100)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.4, color: 'var(--ink)' }}>
          <LatexInline text={livePoll.question} />
        </h2>
        {livePoll.questionImage && (
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src={livePoll.questionImage} alt="Question Context" style={{ maxHeight: '350px', maxWidth: '100%', borderRadius: '8px' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '12px', color: 'var(--gray-400)' }}>
          {poll.status !== 'draft' && <><span>{liveCount} responses</span><span>·</span><span>{poll.createdAt}</span></>}
          {poll.timeLimit && <><span>·</span><span>⏱ {poll.timeLimit}s</span></>}
          {multipleCorrect && <span style={{ fontWeight: 700, color: 'var(--orange)' }}>· Multi-select allowed</span>}
        </div>
      </div>

      {/* ── Options ── */}
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {showPieChart && showResults && role === 'professor' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '16px 0' }}>
            <div style={{
              width: '180px', height: '180px', borderRadius: '50%',
              background: (() => {
                let currentPercent = 0;
                const slices = livePoll.options.map((o, i) => {
                  const total = livePoll.totalResponses || liveCount || 1;
                  const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
                  const color = showCorrect && o.isCorrect ? '#4ADE80' : ['#FF6B2B', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'][i % 6];
                  const start = currentPercent;
                  currentPercent += pct;
                  return `${color} ${start}% ${currentPercent}%`;
                });
                if (currentPercent < 100) slices.push(`transparent ${currentPercent}% 100%`);
                return `conic-gradient(${slices.join(', ')})`;
              })(),
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              border: '4px solid var(--gray-50)'
            }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {livePoll.options.map((o, i) => {
                const total = livePoll.totalResponses || liveCount || 1;
                const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
                const color = showCorrect && o.isCorrect ? '#4ADE80' : ['#FF6B2B', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'][i % 6];
                return (
                  <div key={o.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{o.label}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                        {o.text && <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}><LatexInline text={o.text} /></span>}
                        {o.image && (
                          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <img src={o.image} style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '4px' }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: showCorrect && o.isCorrect ? '#15803D' : 'var(--gray-600)' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          livePoll.options.map(o => {
            const total = livePoll.totalResponses || liveCount || 1;
            const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
            const sel = selectedOptions.includes(o.id);
            const canClick = role === 'student' && isActive && !expired && !pollClosed;

            // Only show correct highlighting AFTER poll is closed
            let bdr = 'var(--gray-100)', bg = 'var(--gray-50)';
            if (showCorrect && o.isCorrect) { bdr = '#86EFAC'; bg = '#F0FDF4'; }
            else if (sel && !showResults) { bdr = 'var(--orange)'; bg = 'var(--orange-pale)'; }
            else if (role === 'student' && submitted && !pollClosed && sel) { bdr = 'var(--orange)'; bg = 'var(--orange-pale)'; }

            let lBg = 'var(--white)', lBdr = 'var(--gray-200)', lC = 'var(--gray-600)';
            if (showCorrect && o.isCorrect) { lBg = '#DCFCE7'; lBdr = '#4ADE80'; lC = '#15803D'; }
            else if (sel) { lBg = 'var(--orange-pale)'; lBdr = 'var(--orange)'; lC = 'var(--orange)'; }

            return (
              <div key={o.id} onClick={() => toggleOption(o.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: `2px solid ${bdr}`, background: bg, cursor: canClick ? 'pointer' : 'default', opacity: (expired || pollClosed) && !showResults ? 0.5 : 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: lBg, border: `2px solid ${lBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: lC, flexShrink: 0 }}>{o.label}</span>
                    {o.text && <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}><LatexInline text={o.text} /></span>}
                    {/* Correct tag — ONLY when poll is closed */}
                    {showCorrect && o.isCorrect && <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '2px 8px', borderRadius: '99px' }}>✓ Correct</span>}
                    {/* "Your answer" tag — while poll still active after submit */}
                    {role === 'student' && submitted && !pollClosed && sel && <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', background: 'var(--orange)', padding: '2px 8px', borderRadius: '99px' }}>Your answer</span>}
                  </div>
                  {o.image && (
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <img src={o.image} style={{ maxHeight: '250px', maxWidth: '100%', borderRadius: '8px' }} />
                    </div>
                  )}
                </div>
                {/* Percentage bars — ONLY when poll is closed */}
                {showResults && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: o.isCorrect ? '#15803D' : 'var(--gray-600)', minWidth: '34px', textAlign: 'right' }}>{pct}%</span>
                    <div style={{ width: '70px', height: '6px', background: 'var(--gray-100)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: o.isCorrect ? '#4ADE80' : 'var(--gray-300)', transition: 'width 0.6s' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Solution ── */}
      {(pollClosed || (poll.status === 'draft' && role === 'professor')) && (poll.solution || poll.solutionImage) && (
        <div style={{ margin: '0 24px 20px', padding: '16px 18px', borderRadius: 'var(--radius-md)', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Solution</div>
          {poll.solution && <div style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}><LatexInline text={poll.solution} /></div>}
          {poll.solutionImage && (
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <img src={poll.solutionImage} style={{ maxHeight: '300px', maxWidth: '100%', borderRadius: '6px' }} />
            </div>
          )}
        </div>
      )}

      {/* ── Student: Submit button ── */}
      {role === 'student' && isActive && !pollClosed && (
        <div style={{ padding: '0 24px 24px' }}>
          <button disabled={selectedOptions.length === 0 || submitting} onClick={handleSubmit}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 700, border: 'none', background: selectedOptions.length > 0 ? 'var(--orange)' : 'var(--gray-200)', color: selectedOptions.length > 0 ? 'white' : 'var(--gray-400)', boxShadow: selectedOptions.length > 0 ? 'var(--shadow-orange)' : 'none' }}>
            {submitting ? 'Submitting...' : submitted ? 'Update Answer' : 'Submit Answer'}
          </button>
        </div>
      )}

      {/* ── Student: Waiting for results ── */}
      {role === 'student' && submitted && !pollClosed && (
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ padding: '16px 18px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, textAlign: 'center', background: 'var(--blue-pale)', color: '#1D4ED8', border: '1px solid #93C5FD' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>✓</div>
            Response recorded!
            <div style={{ fontSize: '12px', fontWeight: 400, color: '#3B82F6', marginTop: '4px' }}>
              Results will be shown after the professor ends the poll. You can change your answer until then.
            </div>
          </div>
        </div>
      )}

      {/* ── Student: Time expired ── */}
      {role === 'student' && (expired || pollClosed) && !submitted && (
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, textAlign: 'center', background: 'var(--red-pale)', color: 'var(--red)' }}>
            ⏱ Time expired! You didn't submit an answer.
          </div>
        </div>
      )}

      {/* ── Student: Poll closed + submitted feedback ── */}
      {showStudentFeedback && (
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{
            padding: '14px 18px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, textAlign: 'center',
            ...(feedbackStatus === 'correct'
              ? { background: 'var(--green-pale)', color: '#15803D' }
              : feedbackStatus === 'partial'
              ? { background: '#FEF3C7', color: '#92400E' }
              : { background: 'var(--red-pale)', color: '#B91C1C' })
          }}>
            {feedbackStatus === 'correct'
              ? 'Correct! Well done.'
              : feedbackStatus === 'partial'
              ? 'Partially correct. You got some right, but missed others.'
              : `✗ Incorrect.`}
            {feedbackStatus !== 'correct' && (
              <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 400 }}>
                The correct answer was: {livePoll.options.filter(o => o.isCorrect).map(o => o.label).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Professor footer ── */}
      {role === 'professor' && (
        <div style={{ padding: '16px 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--gray-100)' }}>
        <div>
          {poll.status !== 'draft' && <>
            <div style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>Responses</div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--orange)' }}>
              {liveCount}
            </div>
          </>}
        </div>
          {isActive && !expired && !pollClosed && onClosePoll && (
            <button onClick={() => { onClosePoll(poll.id); setPollClosed(true); }}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'var(--red-pale)', color: 'var(--red)', fontSize: '13px', fontWeight: 700, border: 'none' }}>
              End Poll
            </button>
          )}
          {poll.status === 'draft' && onEdit && (
            <button onClick={() => onEdit(poll)}
              style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'var(--gray-100)', color: 'var(--gray-700)', fontSize: '13px', fontWeight: 700, border: 'none' }}>
              Edit Poll
            </button>
          )}
          {(expired || pollClosed) && <span style={{ fontSize: '13px', color: 'var(--gray-400)', fontWeight: 600 }}>Poll ended</span>}
        </div>
      )}

    </div></div>
  );
}

const S = {
  ov: { position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  card: { background: 'var(--white)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '580px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' },
  hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' },
  topic: { fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)' },
  close: { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' },
};
