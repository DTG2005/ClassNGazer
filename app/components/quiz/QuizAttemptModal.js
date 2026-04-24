'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { quizDatabase } from '../../services/quizDatabase';

// ── LaTeX renderer ──
function LatexInline({ text }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !text) return;
    import('katex').then(katex => {
      const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([^)]+?\\\))/g;
      const segs = []; let last = 0, m;
      while ((m = regex.exec(text)) !== null) {
        if (m.index > last) segs.push({ t:'text', c:text.slice(last, m.index) });
        const raw = m[1];
        const isBlk = raw.startsWith('$$') || raw.startsWith('\\[');
        const inner = raw.startsWith('$$')?raw.slice(2,-2):raw.startsWith('\\[')?raw.slice(2,-2):raw.startsWith('\\(')?raw.slice(2,-2):raw.slice(1,-1);
        segs.push({ t:isBlk?'block':'inline', c:inner.trim() });
        last = m.index + raw.length;
      }
      if (last < text.length) segs.push({ t:'text', c:text.slice(last) });
      ref.current.innerHTML = segs.map(s => {
        if (s.t==='text') return `<span>${s.c.replace(/\n/g,'<br/>')}</span>`;
        try { return katex.default.renderToString(s.c, { displayMode:s.t==='block', throwOnError:false, strict:false }); }
        catch { return `<span style="color:#e53e3e">${s.c}</span>`; }
      }).join('');
    }).catch(() => { if (ref.current) ref.current.textContent = text; });
  }, [text]);
  return <span ref={ref}>{text}</span>;
}

// ── Shuffle utility ──
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Quiz Attempt Modal ──
export default function QuizAttemptModal({ quiz, onClose, onSubmitted, studentId, studentName, existingResponse, isPreview = false }) {
  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  // ── Build question order (shuffled if enabled) ──
  const [questionOrder] = useState(() => {
    const indices = quiz.questions.map((_, i) => i);
    return quiz.shuffleQuestions ? shuffleArray(indices) : indices;
  });

  // ── Build option order per question (shuffled if enabled) ──
  const [optionOrders] = useState(() => {
    return quiz.questions.map(q => {
      const indices = q.options.map((_, i) => i);
      return quiz.shuffleOptions ? shuffleArray(indices) : indices;
    });
  });

  // answers[originalQuestionIndex] = [selectedOriginalOptionIndex, ...]
  const [answers, setAnswers]         = useState(() => {
    // Restore from localStorage if available
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(`quiz-draft-${quiz.id}-${studentId}`);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return quiz.questions.map(() => []);
  });

  const [submitted,     setSubmitted]     = useState(false);
  const [result,        setResult]        = useState(existingResponse || null);
  const [submitting,    setSubmitting]    = useState(false);
  const [timeLeft,      setTimeLeft]      = useState(null);
  const [timeExpired,   setTimeExpired]   = useState(false);
  const [activeQ,       setActiveQ]       = useState(0); // index into questionOrder
  const timerRef                           = useRef(null);
  const submittingRef                      = useRef(false);

  const [isQuizEnded, setIsQuizEnded] = useState(quiz.status === 'closed');

  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const handleSubmit = useCallback(async (auto = false) => {
    if (isPreview) {
      onClose();
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    try {
      const res = await quizDatabase.submitQuizResponse(quiz.id, studentId, studentName, answersRef.current, quiz);
      setResult(res);
      setSubmitted(true);
      if (onSubmitted) onSubmitted(res);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`quiz-draft-${quiz.id}-${studentId}`);
      }
    } catch (e) {
      if (e.message === 'already_submitted') {
        const existing = await quizDatabase.getStudentResponse(quiz.id, studentId);
        if (existing) { setResult(existing); setSubmitted(true); }
      } else {
        alert(`Error submitting: ${e.message}`);
      }
    }
    submittingRef.current = false;
    setSubmitting(false);
  }, [quiz, studentId, studentName, isPreview, onClose, onSubmitted]);

  const handleAutoSubmit = useCallback(() => {
    if (submittingRef.current || submitted) return;
    setTimeExpired(true);
    handleSubmit(true);
  }, [submitted, handleSubmit]);

  // ── Sticky Timer & Live Status ──
  const targetEndRef = useRef(null);
  useEffect(() => {
    // Subscribe to Realtime DB for live state
    const unsub = quizDatabase.listenToLiveQuiz(quiz.id, (data) => {
      if (!data || data.liveStatus !== 'active') {
        setIsQuizEnded(true);
        // Quiz closed by professor
        if (!submittingRef.current && !submitted && !isPreview) handleAutoSubmit();
        return;
      }
      
      setIsQuizEnded(false);
      
      if (result || submitted || isPreview) return; // already submitted — no timer needed
      
      const startMs = data.liveStartedAt || Date.now();
      const limitMs = (data.timer || quiz.timer) * 1000;
      targetEndRef.current = startMs + limitMs;

      if (!timerRef.current) {
        const updateTick = () => {
          if (!targetEndRef.current) return;
          const rem = Math.floor((targetEndRef.current - Date.now()) / 1000);
          if (rem <= 0) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            handleAutoSubmit();
          } else {
            setTimeLeft(rem);
          }
        };

        updateTick(); // Evaluate instantly
        timerRef.current = setInterval(updateTick, 1000);
      }
    });

    return () => { 
      unsub(); 
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [quiz.id, result, submitted, isPreview, handleAutoSubmit]);

  // ── Auto-save to localStorage on every answer change ──
  useEffect(() => {
    if (submitted || result) return;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`quiz-draft-${quiz.id}-${studentId}`, JSON.stringify(answers));
    }
  }, [answers]);

  // ── Select / deselect an option ──
  const toggleOption = useCallback((origQIdx, origOptIdx) => {
    if (submitted || result || timeExpired) return;
    const isMulti = quiz.questions[origQIdx].correctOptions.map(Number).length > 1;
    setAnswers(prev => {
      const next = prev.map(a => [...a]);
      const cur  = next[origQIdx];
      if (isMulti) {
        const pos = cur.indexOf(origOptIdx);
        if (pos >= 0) cur.splice(pos, 1); else cur.push(origOptIdx);
      } else {
        next[origQIdx] = cur.includes(origOptIdx) ? [] : [origOptIdx];
      }
      return next;
    });
  }, [submitted, result, timeExpired, quiz.questions]);


  const answeredCount  = answers.filter(a => a.length > 0).length;
  const totalQ         = quiz.questions.length;
  const timerUrgent    = timeLeft !== null && timeLeft <= 30;
  const showResultView = submitted || !!result || !!existingResponse;

  // ── RESULT VIEW (after submit) ──
  if (showResultView) {
    if (!isQuizEnded && !isPreview) {
      return (
        <div style={S.ov} onClick={onClose}>
          <div style={{ ...S.card, maxWidth:'500px', textAlign:'center', padding:'40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:'48px', marginBottom:'16px' }}>⏳</div>
            <h2 style={{ fontSize:'24px', fontWeight:800, marginBottom:'8px', color:'var(--ink)' }}>Quiz Submitted Successfully!</h2>
            <p style={{ fontSize:'14px', color:'var(--gray-500)', lineHeight:1.5, marginBottom:'24px' }}>
              Your response has been recorded. The results and solutions will be available here once the professor ends the quiz for everyone.
            </p>
            <button onClick={onClose} style={{ padding:'12px 24px', borderRadius:'var(--radius-md)', background:'var(--gray-100)', color:'var(--ink)', fontSize:'14px', fontWeight:700, border:'none', cursor:'pointer' }}>
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    const res         = result || existingResponse;
    const totalScore  = res?.score ?? res?.totalScore ?? 0;
    const perQ        = res?.perQuestion || [];
    const totalMarks  = quiz.totalMarks || quiz.questions.reduce((s,q) => s+(q.marks||0), 0);
    const pct         = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

    return (
      <div style={S.ov} onClick={onClose}>
        <div style={{ ...S.card, maxWidth:'600px' }} onClick={e => e.stopPropagation()}>
          {/* Result Header */}
          <div style={{ background:'linear-gradient(135deg, #1a2744, #243561)', padding:'28px 28px 22px', color:'white' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'4px' }}>Quiz Complete</div>
                <div style={{ fontSize:'20px', fontWeight:800 }}>{quiz.title}</div>
              </div>
              <button style={{ ...S.close, background:'rgba(255,255,255,0.1)', color:'white' }} onClick={onClose}>✕</button>
            </div>

            {/* Score big display */}
            <div style={{ display:'flex', alignItems:'flex-end', gap:'16px', marginTop:'20px' }}>
              <div>
                <div style={{ fontSize:'56px', fontWeight:900, fontFamily:'DM Mono', lineHeight:1, color: pct>=70?'#4ADE80': pct>=40?'#FCD34D':'#F87171' }}>
                  {totalScore > 0 ? `+${totalScore}` : totalScore}
                </div>
                <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', marginTop:'2px' }}>out of {totalMarks}</div>
              </div>
              <div style={{ flex:1 }}>
                {/* Circular-ish progress bar */}
                <div style={{ fontSize:'32px', fontWeight:800, color:pct>=70?'#4ADE80':pct>=40?'#FCD34D':'#F87171' }}>{pct}%</div>
                <div style={{ width:'100%', height:'6px', background:'rgba(255,255,255,0.15)', borderRadius:'99px', marginTop:'6px', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:'99px', width:`${pct}%`, background: pct>=70?'#4ADE80':pct>=40?'#FCD34D':'#F87171', transition:'width 1s ease' }} />
                </div>
                <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'4px' }}>
                  {perQ.filter(p=>p.isCorrect).length}/{totalQ} correct
                  {quiz.negativeMarking && ` · ${perQ.filter(p=>p.marksAwarded<0).length} penalised`}
                </div>
              </div>
            </div>
          </div>

          {/* Per-question breakdown */}
          <div style={{ overflowY:'auto', maxHeight:'55vh', padding:'16px 24px' }}>
            {questionOrder.map((origQIdx, displayIdx) => {
              const q    = quiz.questions[origQIdx];
              const pq   = perQ[origQIdx];
              const opts = optionOrders[origQIdx].map(oi => q.options[oi]);

              const statusColor = !pq ? 'var(--gray-400)' : pq.isCorrect ? '#15803D' : pq.marksAwarded < 0 ? '#B91C1C' : 'var(--gray-600)';
              const statusBg    = !pq ? 'var(--gray-50)' : pq.isCorrect ? '#F0FDF4' : pq.marksAwarded < 0 ? '#FEF2F2' : 'var(--gray-50)';
              const statusIcon  = !pq?.answered?.length ? '—' : pq.isCorrect ? '✓' : '✗';

              return (
                <div key={origQIdx} style={{ marginBottom:'14px', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'12px 14px', background:statusBg }}>
                    <div style={{ flex:1, marginRight:'12px' }}>
                      <div style={{ fontSize:'10px', fontWeight:700, color:'var(--gray-400)', textTransform:'uppercase', marginBottom:'3px' }}>Q{displayIdx+1}</div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:'var(--ink)' }}><LatexInline text={q.text} /></div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px', flexShrink:0 }}>
                      <span style={{ fontSize:'18px', fontWeight:800, color:statusColor }}>{statusIcon}</span>
                      <span style={{ fontSize:'11px', fontWeight:700, color:statusColor, fontFamily:'DM Mono' }}>
                        {pq && pq.marksAwarded >= 0 ? `+${pq.marksAwarded}` : (pq?.marksAwarded ?? 0)} pts
                      </span>
                    </div>
                  </div>
                  <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:'5px' }}>
                    {opts.map((o, displayOptIdx) => {
                      const origOptIdx = optionOrders[origQIdx][displayOptIdx];
                      const isCorrect  = (q.correctOptions || []).map(Number).includes(origOptIdx);
                      const wasChosen  = (pq?.answered || []).map(Number).includes(origOptIdx);
                      let bg = 'transparent', border = '1px solid transparent';
                      if (isCorrect)       { bg = '#F0FDF4'; border = '1px solid #86EFAC'; }
                      if (wasChosen && !isCorrect) { bg = '#FEF2F2'; border = '1px solid #FECACA'; }

                      return (
                        <div key={origOptIdx} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 10px', borderRadius:'7px', background:bg, border }}>
                          <span style={{ width:'20px', height:'20px', borderRadius:'5px', background: isCorrect?'#DCFCE7':wasChosen?'#FECACA':'var(--gray-100)', border:`1px solid ${isCorrect?'#4ADE80':wasChosen?'#FCA5A5':'var(--gray-200)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:700, color:isCorrect?'#15803D':wasChosen?'#B91C1C':'var(--gray-600)', flexShrink:0 }}>
                            {String.fromCharCode(65+displayOptIdx)}
                          </span>
                          <span style={{ fontSize:'12px', color:'var(--ink)', flex:1 }}><LatexInline text={o.text} /></span>
                          {isCorrect && <span style={{ fontSize:'10px', fontWeight:700, color:'#15803D', background:'#DCFCE7', padding:'2px 6px', borderRadius:'99px' }}>Correct</span>}
                          {wasChosen && !isCorrect && <span style={{ fontSize:'10px', fontWeight:700, color:'#B91C1C', background:'#FEE2E2', padding:'2px 6px', borderRadius:'99px' }}>Your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                  {(q.solution || q.solutionImage) && (
                    <div style={{ margin:'0 14px 12px', padding:'10px 12px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:'8px' }}>
                      <div style={{ fontSize:'10px', fontWeight:700, color:'#92400E', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'5px' }}>💡 Solution</div>
                      {q.solution && <div style={{ fontSize:'12px', color:'#78350F', lineHeight:1.5 }}><LatexInline text={q.solution} /></div>}
                      {q.solutionImage && (
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                          <img src={q.solutionImage} style={{ maxHeight:'300px', maxWidth: '100%', borderRadius:'6px' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ padding:'14px 24px', borderTop:'1px solid var(--gray-100)', display:'flex', justifyContent:'flex-end' }}>
            <button onClick={onClose} style={{ padding:'10px 24px', borderRadius:'var(--radius-md)', background:'var(--ink)', color:'white', fontSize:'13px', fontWeight:700, border:'none', cursor:'pointer' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ATTEMPT VIEW ──
  return (
    <div style={S.ov}>
      <div style={{ ...S.card, maxWidth:'760px', display:'flex', flexDirection:'column', maxHeight:'96vh' }} onClick={e => e.stopPropagation()}>

        {/* ── Sticky timer header ── */}
        <div style={{ background:'linear-gradient(135deg, #1a2744, #243561)', padding:'14px 24px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:'12px', fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{quiz.courseCode || quiz.courseName}</div>
              <div style={{ fontSize:'16px', fontWeight:800, color:'white' }}>{quiz.title}</div>
            </div>
            {/* Timer */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'2px' }}>
              <div style={{ fontSize:'32px', fontWeight:900, fontFamily:'DM Mono', color: timerUrgent ? '#F87171' : '#4ADE80', lineHeight:1, animation: timerUrgent ? 'pulse 1s ease infinite' : 'none' }}>
                {timeLeft !== null ? fmt(timeLeft) : '—:——'}
              </div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.4)', fontWeight:600 }}>remaining</div>
              {timeLeft !== null && (
                <div style={{ width:'80px', height:'3px', background:'rgba(255,255,255,0.15)', borderRadius:'99px', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:'99px', width:`${(timeLeft / quiz.timer)*100}%`, background: timerUrgent?'#F87171':'#4ADE80', transition:'width 1s linear' }} />
                </div>
              )}
            </div>
          </div>

          {/* Progress & question navigator */}
          <div style={{ marginTop:'12px' }}>
            <div style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)', marginBottom:'6px' }}>
              {answeredCount}/{totalQ} answered
            </div>
            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
              {questionOrder.map((origQIdx, displayIdx) => {
                const isAnswered = answers[origQIdx]?.length > 0;
                const isActive   = activeQ === displayIdx;
                return (
                  <button key={origQIdx} onClick={() => setActiveQ(displayIdx)}
                    style={{ width:'28px', height:'28px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'10px', fontWeight:700, transition:'all 0.15s',
                      background: isActive ? '#F5A623' : isAnswered ? '#4ADE80' : 'rgba(255,255,255,0.1)',
                      color:       isActive ? '#1a2744' : isAnswered ? '#1a2744' : 'rgba(255,255,255,0.6)',
                    }}>
                    {displayIdx+1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Active Question ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column' }}>
          {(() => {
            const displayIdx = activeQ;
            const origQIdx   = questionOrder[displayIdx];
            const q        = quiz.questions[origQIdx];
            const curAns   = answers[origQIdx] || [];
            const isMulti  = q.correctOptions.length > 1;

            return (
              <div key={origQIdx}>
                {/* Question header */}
                <div style={{ display:'flex', gap:'12px', padding:'14px 16px', background:'var(--gray-50)', alignItems:'flex-start', border:'1px solid var(--gray-100)', borderBottom:'none', borderTopLeftRadius:'var(--radius-md)', borderTopRightRadius:'var(--radius-md)' }}>
                  <span style={{ width:'26px', height:'26px', borderRadius:'7px', background:'var(--orange)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:800, flexShrink:0 }}>
                    {displayIdx+1}
                  </span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'15px', fontWeight:600, color:'var(--ink)', lineHeight:1.5 }}><LatexInline text={q.text} /></div>
                    {q.questionImage && (
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <img src={q.questionImage} style={{ maxHeight:'350px', maxWidth: '100%', borderRadius:'8px' }} />
                      </div>
                    )}
                    <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
                      <span style={{ fontSize:'10px', fontWeight:700, color:'var(--orange)', background:'var(--orange-pale)', padding:'2px 8px', borderRadius:'99px' }}>{q.marks} mark{q.marks!==1?'s':''}</span>
                      {isMulti && <span style={{ fontSize:'10px', fontWeight:700, color:'#1D4ED8', background:'#DBEAFE', padding:'2px 8px', borderRadius:'99px' }}>Multi-select</span>}
                      {quiz.negativeMarking && (q.negativeMarks > 0) && <span style={{ fontSize:'10px', fontWeight:700, color:'#B91C1C', background:'#FEE2E2', padding:'2px 8px', borderRadius:'99px' }}>−{q.negativeMarks} wrong</span>}
                      {curAns.length > 0 && <span style={{ fontSize:'10px', fontWeight:700, color:'#15803D', background:'#DCFCE7', padding:'2px 8px', borderRadius:'99px' }}>✓ Answered</span>}
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'10px', border:'1px solid var(--gray-100)', borderBottomLeftRadius:'var(--radius-md)', borderBottomRightRadius:'var(--radius-md)' }}>
                  {optionOrders[origQIdx].map((origOptIdx, displayOptIdx) => {
                    const o      = q.options[origOptIdx];
                    const isSel  = curAns.includes(origOptIdx);
                    return (
                      <div key={origOptIdx}
                        onClick={() => toggleOption(origQIdx, origOptIdx)}
                        style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px', borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'all 0.15s',
                          border:`2px solid ${isSel ? 'var(--orange)' : 'var(--gray-100)'}`,
                          background: isSel ? 'var(--orange-pale)' : 'var(--white)',
                        }}
                        onMouseEnter={e => { if(!isSel) e.currentTarget.style.borderColor='var(--orange-dim)'; }}
                        onMouseLeave={e => { if(!isSel) e.currentTarget.style.borderColor='var(--gray-100)'; }}>
                        <span style={{ width:'24px', height:'24px', borderRadius: isMulti ? '5px' : '50%', border:`2px solid ${isSel ? 'var(--orange)' : 'var(--gray-200)'}`, background: isSel ? 'var(--orange)' : 'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, color: isSel ? 'white' : 'var(--gray-500)', flexShrink:0, transition:'all 0.15s' }}>
                          {isSel ? '✓' : String.fromCharCode(65+displayOptIdx)}
                        </span>
                        <div style={{ flex:1 }}>
                          {o.text && <span style={{ fontSize:'14px', fontWeight:500, color:'var(--ink)' }}><LatexInline text={o.text} /></span>}
                          {o.image && (
                            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                              <img src={o.image} style={{ maxHeight:'250px', maxWidth: '100%', borderRadius:'8px' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--gray-100)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'var(--white)' }}>
          <div style={{ display:'flex', gap:'8px' }}>
            <button
              onClick={() => setActiveQ(p => Math.max(0, p - 1))}
              disabled={activeQ === 0}
              style={{ padding:'10px 18px', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:700, border:'none', cursor: activeQ === 0 ? 'not-allowed' : 'pointer', background: activeQ === 0 ? 'transparent' : 'var(--gray-100)', color: activeQ === 0 ? 'var(--gray-300)' : 'var(--ink)', transition:'all 0.2s' }}>
              ← Prev
            </button>
            <button
              onClick={() => setActiveQ(p => Math.min(totalQ - 1, p + 1))}
              disabled={activeQ === totalQ - 1}
              style={{ padding:'10px 18px', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:700, border:'none', cursor: activeQ === totalQ - 1 ? 'not-allowed' : 'pointer', background: activeQ === totalQ - 1 ? 'transparent' : 'var(--gray-100)', color: activeQ === totalQ - 1 ? 'var(--gray-300)' : 'var(--ink)', transition:'all 0.2s' }}>
              Next →
            </button>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
            <div style={{ fontSize:'12px', color:'var(--gray-400)', fontWeight:600, textAlign:'right' }}>
              {answeredCount} / {totalQ} done
              {answeredCount < totalQ && <div style={{ color:'var(--orange)', fontSize:'10px' }}>{totalQ - answeredCount} skipped</div>}
            </div>
            <button
              disabled={submitting}
              onClick={() => {
                if (isPreview) { handleSubmit(false); return; }
                if (answeredCount < totalQ && !confirm(`You haven't answered ${totalQ - answeredCount} question(s). Submit anyway?`)) return;
                handleSubmit(false);
              }}
              style={{ padding:'12px 28px', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:800, border:'none', cursor: submitting ? 'not-allowed' : 'pointer',
                background:'var(--orange)', color:'white', boxShadow:'var(--shadow-orange)', opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Submitting...' : isPreview ? 'Close Preview' : 'Submit Quiz →'}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}

const S = {
  ov:    { position:'fixed', inset:0, background:'rgba(26,25,23,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'12px' },
  card:  { background:'var(--white)', borderRadius:'var(--radius-xl)', width:'100%', boxShadow:'var(--shadow-lg)', overflow:'hidden' },
  close: { width:'30px', height:'30px', borderRadius:'50%', background:'var(--gray-100)', color:'var(--gray-600)', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', flexShrink:0 },
};
