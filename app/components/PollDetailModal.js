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
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);
  const [liveCount, setLiveCount] = useState(poll.totalResponses || 0);
  const [livePoll, setLivePoll] = useState(poll);
  const [pollClosed, setPollClosed] = useState(poll.status === 'closed');
  const [studentResponse, setStudentResponse] = useState(null);
  const timerRef = useRef(null);

  const correctOption = livePoll.options.find(o => o.isCorrect);
  const isActive = livePoll.status === 'active' && !expired && !pollClosed;

  // ── CONTROLLED RESULT VISIBILITY ──
  // NEVER show correct option until poll is CLOSED
  // Professor: sees vote counts while active, correct answer ONLY after closed
  // Student: ONLY after poll closes
  const showResults = pollClosed && poll.status !== 'draft';
  const showCorrect = pollClosed; // correct answer only visible after poll ends
  const showStudentFeedback = role === 'student' && pollClosed && submitted;

  // Real user ID for duplicate prevention
  const studentId = user?.uid || `anon-${typeof window !== 'undefined' ? (sessionStorage.getItem('cng-sid') || (() => { const id = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('cng-sid', id); return id; })()) : 'unknown'}`;
  const studentName = user?.name || user?.displayName || 'Anonymous';

  // ── Check Firestore for past submission (critical for closed polls) ──
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
          // Map the response index back to option id
          const idx = resp.response;
          if (idx !== undefined && poll.options[idx]) {
            setSelectedOption(poll.options[idx].id);
            setStudentResponse(idx);
          }
        }
      } catch (e) { console.error('Error checking past response:', e); }
    })();
  }, [poll.id, user?.uid, role]);

  // ── Timer countdown ──
  useEffect(() => {
    if (poll.status !== 'active' || !poll.timeLimit) return;
    (async () => {
      try {
        const fb = await pollDatabase.getPollById(poll.id);
        if (!fb || fb.status !== 'active') { setExpired(true); setPollClosed(true); return; }
        let elapsed = 0;
        if (fb.startedAt) {
          const ms = fb.startedAt.seconds ? fb.startedAt.seconds * 1000 : new Date(fb.startedAt).getTime();
          elapsed = Math.floor((Date.now() - ms) / 1000);
        }
        let rem = Math.max(0, (fb.timer || poll.timeLimit) - elapsed);
        setTimeLeft(rem);
        timerRef.current = setInterval(() => {
          rem--;
          if (rem <= 0) {
            clearInterval(timerRef.current); setTimeLeft(0); setExpired(true); setPollClosed(true);
            if (role === 'professor' && onClosePoll) onClosePoll(poll.id);
          } else setTimeLeft(rem);
        }, 1000);
      } catch (e) { console.error(e); }
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [poll.id]);

  // ── Live response listener ──
  useEffect(() => {
    if (poll.status !== 'active') return;
    const unsub = pollDatabase.listenToLiveResponses(poll.id, (responses) => {
      const count = Object.keys(responses).length;
      setLiveCount(count);
      // Check if this student already submitted
      if (responses[studentId]) setSubmitted(true);
      // Update vote counts
      const opts = poll.options.map((o, i) => {
        let v = 0;
        Object.values(responses).forEach(r => { if (r.response === i) v++; });
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
        // Reload final results from Firestore
        pollDatabase.getPollById(poll.id).then(fbPoll => {
          if (fbPoll) {
            const opts = (fbPoll.options || []).map((text, i) => ({
              ...livePoll.options[i], text,
              votes: fbPoll.count?.[String(i)] || livePoll.options[i]?.votes || 0,
            }));
            setLivePoll(prev => ({ ...prev, options: opts, totalResponses: fbPoll.totalResponses || prev.totalResponses, status: 'closed' }));
          }
        });
      }
    });
    return () => unsub && unsub();
  }, [poll.id]);

  const fmt = (s) => s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const timerPct = (poll.timeLimit && timeLeft != null) ? (timeLeft / poll.timeLimit) * 100 : 100;
  const urgent = timeLeft != null && timeLeft <= 10;

  const handleSubmit = async () => {
    if (!selectedOption || submitting) return;
    setSubmitting(true);
    try {
      const idx = livePoll.options.findIndex(o => o.id === selectedOption);
      await pollDatabase.submitResponse(poll.id, studentId, studentName, idx);
      setSubmitted(true);
    } catch (e) {
      if (e.message.includes('already')) setSubmitted(true);
      else alert(e.message);
    }
    setSubmitting(false);
  };

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
            {isActive ? '● Live' : pollClosed ? '✓ Closed' : '⏱ Time Up'}
          </span>
          )}
        </div>
        <button style={S.close} onClick={onClose}>✕</button>
      </div>

      {/* ── Timer bar ── */}
      {poll.status === 'active' && timeLeft != null && (
        <div style={{ padding: '0 24px', marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: urgent ? 'var(--red)' : 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {expired || pollClosed ? 'Poll ended' : 'Time remaining'}
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: urgent ? 'var(--red)' : 'var(--orange)', fontFamily: 'DM Mono' }}>
              {expired || pollClosed ? '0:00' : fmt(timeLeft)}
            </span>
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
        <h2 style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.4, color: 'var(--ink)' }}><LatexInline text={livePoll.question} /></h2>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', fontSize: '12px', color: 'var(--gray-400)' }}>
          {poll.status !== 'draft' && <><span>{liveCount} responses</span><span>·</span><span>{poll.createdAt}</span></>}
          {poll.timeLimit && <><span>·</span><span>⏱ {poll.timeLimit}s</span></>}
        </div>
      </div>

      {/* ── Options ── */}
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {livePoll.options.map(o => {
          const total = livePoll.totalResponses || liveCount || 1;
          const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
          const sel = selectedOption === o.id;
          const canClick = role === 'student' && isActive && !submitted && !expired && !pollClosed;

          // Only show correct highlighting AFTER poll is closed
          let bdr = 'var(--gray-100)', bg = 'var(--gray-50)';
          if (showCorrect && o.isCorrect) { bdr = '#86EFAC'; bg = '#F0FDF4'; }
          else if (sel && !showResults) { bdr = 'var(--orange)'; bg = 'var(--orange-pale)'; }
          else if (role === 'student' && submitted && !pollClosed && sel) { bdr = 'var(--gray-400)'; bg = 'var(--gray-100)'; }

          let lBg = 'var(--white)', lBdr = 'var(--gray-200)', lC = 'var(--gray-600)';
          if (showCorrect && o.isCorrect) { lBg = '#DCFCE7'; lBdr = '#4ADE80'; lC = '#15803D'; }
          else if (sel) { lBg = 'var(--orange-pale)'; lBdr = 'var(--orange)'; lC = 'var(--orange)'; }

          return (
            <div key={o.id} onClick={() => canClick && setSelectedOption(o.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: `2px solid ${bdr}`, background: bg, cursor: canClick ? 'pointer' : 'default', opacity: (expired || pollClosed) && !showResults ? 0.5 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: lBg, border: `2px solid ${lBdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: lC, flexShrink: 0 }}>{o.label}</span>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)' }}><LatexInline text={o.text} /></span>
                {/* Correct tag — ONLY when poll is closed */}
                {showCorrect && o.isCorrect && <span style={{ fontSize: '11px', fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '2px 8px', borderRadius: '99px' }}>✓ Correct</span>}
                {/* "Your answer" tag — while poll still active after submit */}
                {role === 'student' && submitted && !pollClosed && sel && <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-600)', background: 'var(--gray-200)', padding: '2px 8px', borderRadius: '99px' }}>Your answer</span>}
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
        })}
      </div>

      {/* ── Solution (shown when poll is closed, OR for drafts in professor view) ── */}
      {(pollClosed || (poll.status === 'draft' && role === 'professor')) && poll.solution && (
        <div style={{ margin: '0 24px 20px', padding: '16px 18px', borderRadius: 'var(--radius-md)', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>💡 Solution</div>
          <div style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}><LatexInline text={poll.solution} /></div>
        </div>
      )}

      {/* ── Student: Submit button (active, not yet submitted) ── */}
      {role === 'student' && isActive && !submitted && !pollClosed && (
        <div style={{ padding: '0 24px 24px' }}>
          <button disabled={!selectedOption || submitting} onClick={handleSubmit}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 700, border: 'none', background: selectedOption ? 'var(--orange)' : 'var(--gray-200)', color: selectedOption ? 'white' : 'var(--gray-400)', boxShadow: selectedOption ? 'var(--shadow-orange)' : 'none' }}>
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      )}

      {/* ── Student: Waiting for results (submitted, poll still active) ── */}
      {role === 'student' && submitted && !pollClosed && (
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ padding: '16px 18px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, textAlign: 'center', background: 'var(--blue-pale)', color: '#1D4ED8', border: '1px solid #93C5FD' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>✅</div>
            Response recorded!
            <div style={{ fontSize: '12px', fontWeight: 400, color: '#3B82F6', marginTop: '4px' }}>
              Results will be shown after the professor ends the poll.
            </div>
          </div>
        </div>
      )}

      {/* ── Student: Time expired, never submitted ── */}
      {role === 'student' && (expired || pollClosed) && !submitted && (
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, textAlign: 'center', background: 'var(--red-pale)', color: 'var(--red)' }}>
            ⏱ Time expired! You didn't submit an answer.
          </div>
        </div>
      )}

      {/* ── Student: Poll closed + submitted → correct/incorrect feedback ── */}
      {showStudentFeedback && (
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{
            padding: '14px 18px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, textAlign: 'center',
            ...(selectedOption === correctOption?.id
              ? { background: 'var(--green-pale)', color: '#15803D' }
              : { background: 'var(--red-pale)', color: '#B91C1C' })
          }}>
            {selectedOption === correctOption?.id
              ? '🎉 Correct! Well done.'
              : `✗ Incorrect. The correct answer was ${correctOption?.label}: ${correctOption?.text}`}
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
              ✏️ Edit Poll
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
  close: { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
