'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { quizDatabase } from '../../services/quizDatabase';
import AddQuizModal from './AddQuizModal';
import QuizAttemptModal from './QuizAttemptModal';
import QuizResultsModal from './QuizResultsModal';

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
      if (ref.current) ref.current.innerHTML = segs.map(s => {
        if (s.t==='text') return `<span>${s.c.replace(/\n/g,'<br/>')}</span>`;
        try { return katex.default.renderToString(s.c, { displayMode:s.t==='block', throwOnError:false, strict:false }); }
        catch { return `<span>${s.c}</span>`; }
      }).join('');
    }).catch(() => { if (ref.current) ref.current.textContent = text; });
  }, [text]);
  return <span ref={ref}>{text}</span>;
}

const fmt = s => `${Math.floor((s||0)/60)}:${String((s||0)%60).padStart(2,'0')}`;

/**
 * QuizView — Quiz management UI for a specific course.
 * Props: user, courseId, courseName, courseCode
 */
export default function QuizView({ user, courseId, courseName, courseCode }) {
  const role        = user?.role || 'student';
  const isProfessor = role === 'professor';
  const studentId   = useMemo(() => user?.uid || `anon-${Math.random().toString(36).slice(2,8)}`, [user?.uid]);
  const studentName = user?.name || user?.displayName || 'Anonymous';

  const [quizzes,         setQuizzes]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showAddQuiz,     setShowAddQuiz]      = useState(false);
  const [editQuiz,        setEditQuiz]         = useState(null);
  const [attemptQuiz,     setAttemptQuiz]      = useState(null);    // quiz student is attempting
  const [resultsQuiz,     setResultsQuiz]      = useState(null);    // quiz whose results professor is viewing
  const [studentResponses,setStudentResponses] = useState({});      // quizId → response (for students)
  const [liveSubmissions, setLiveSubmissions]  = useState({});      // quizId → count (for professors)
  const [toast,           setToast]            = useState(null);
  const [quizTimeLeft,    setQuizTimeLeft]     = useState(null);   // live countdown for professor
  const liveUnsubRef  = useRef(null);
  const quizTimerRef  = useRef(null);
  const quizUnsubRef  = useRef(null);
  const quizTargetMsRef = useRef(null);

  const showToast = (msg, type='info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch quizzes ──
  const fetchQuizzes = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const all = await quizDatabase.getQuizzesByCourse(courseId);
      setQuizzes(all.sort((a,b) => (b.createdAtMs||0) - (a.createdAtMs||0)));

      // For students: check which ones they've already answered
      if (!isProfessor && user?.uid) {
        const pending = all.filter(q => q.status !== 'draft');
        const resMap = {};
        await Promise.all(pending.map(async q => {
          const res = await quizDatabase.getStudentResponse(q.id, user.uid);
          if (res) resMap[q.id] = res;
        }));
        setStudentResponses(resMap);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuizzes();
    // Listen for live quiz status changes
    liveUnsubRef.current = quizDatabase.listenToLiveQuizzes((liveData) => {
      // Update submission counts for professors
      const counts = {};
      Object.entries(liveData).forEach(([qid, d]) => {
        if (d?.submissionCount) counts[qid] = d.submissionCount;
      });
      setLiveSubmissions(counts);
      fetchQuizzes(true);
    });
    return () => { if (liveUnsubRef.current) liveUnsubRef.current(); };
  }, [courseId]);  // eslint-disable-line

  // ── Categorise ──
  const activeQuizzes   = quizzes.filter(q => q.status === 'active');
  const draftQuizzes    = quizzes.filter(q => q.status === 'draft');
  const closedQuizzes   = quizzes.filter(q => q.status === 'closed');

  // ── Quiz live countdown for professor ──
  useEffect(() => {
    const aq = activeQuizzes[0];
    if (!isProfessor || !aq) {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
      if (quizUnsubRef.current) { quizUnsubRef.current(); quizUnsubRef.current = null; }
      setQuizTimeLeft(null);
      return;
    }

    // Compute remaining time from Firestore startedAt
    const initTimer = async () => {
      try {
        const full = await quizDatabase.getQuizById(aq.id);
        if (!full || full.status !== 'active') return;
        const startMs = full.startedAt
          ? (full.startedAt.seconds ? full.startedAt.seconds * 1000 : new Date(full.startedAt).getTime())
          : Date.now();
        const timerSecs = full.timer || aq.timer || 0;
        if (!timerSecs) { setQuizTimeLeft(null); return; }
        
        quizTargetMsRef.current = startMs + timerSecs * 1000;

        const tick = () => {
          if (!quizTargetMsRef.current) return;
          const rem = Math.max(0, Math.floor((quizTargetMsRef.current - Date.now()) / 1000));
          setQuizTimeLeft(rem);
          if (rem <= 0) clearInterval(quizTimerRef.current);
        };
        tick();
        quizTimerRef.current = setInterval(tick, 1000);
      } catch (e) { console.error('Quiz timer init:', e); }
    };
    initTimer();

    return () => {
      if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    };
  }, [activeQuizzes[0]?.id, isProfessor]); // eslint-disable-line

  const handleAddQuizTime = async (quizId) => {
    try {
      await quizDatabase.addTime(quizId, 30);
      if (quizTargetMsRef.current) {
        quizTargetMsRef.current += 30000;
      }
      setQuizTimeLeft(prev => (prev !== null ? prev + 30 : null));
      showToast('+30 seconds added', 'success');
    } catch (e) { showToast(e.message || 'Failed to add time', 'error'); }
  };

  // ── CRUD handlers ──
  const handleCreate = async (data) => {
    try {
      await quizDatabase.createQuiz({
        ...data,
        courseId, courseName,
        professorId:   user?.uid || '',
        professorName: user?.name || user?.displayName || 'Professor',
      });
      showToast('Quiz saved as draft', 'success');
      fetchQuizzes();
      setShowAddQuiz(false);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleEdit = async (quizId, data) => {
    try {
      const totalMarks = (data.questions||[]).reduce((s,q) => s+(Number(q.marks)||0), 0);
      await quizDatabase.updateQuiz(quizId, { ...data, totalMarks });
      showToast('Quiz updated', 'success');
      fetchQuizzes();
      setEditQuiz(null);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleStart = async (quizId) => {
    try {
      await quizDatabase.updateQuizStatus(quizId, 'active');
      showToast('Quiz is now live 🚀', 'success');
      fetchQuizzes();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleEnd = async (quizId) => {
    if (!confirm('End this quiz? Students will no longer be able to submit.')) return;
    try {
      await quizDatabase.updateQuizStatus(quizId, 'closed');
      showToast('Quiz closed', 'success');
      fetchQuizzes();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDelete = async (quizId) => {
    if (!confirm('Delete this quiz and all student responses?')) return;
    try {
      await quizDatabase.deleteQuiz(quizId);
      showToast('Quiz deleted', 'success');
      fetchQuizzes();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleExport = async (quiz) => {
    try {
      await quizDatabase.downloadQuizCSV(quiz.id, quiz.title);
      showToast('CSV downloaded', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };


  // ─────────────────────────────────── RENDER ─────────────────────────────────
  return (
    <div style={{ flex:1, minWidth:0 }}>
      <div style={S.content}>

        {/* ── LIVE QUIZ BANNER ── */}
        {activeQuizzes.length > 0 && (() => {
          const aq    = activeQuizzes[0];
          const count = liveSubmissions[aq.id] || aq.totalSubmissions || 0;
          const urgent = quizTimeLeft !== null && quizTimeLeft <= 60;
          return (
            <div style={S.banner}>
              <div style={S.bannerLeft}>
                <div style={S.pulseWrap}><div style={S.pulseDot}/><div style={S.pulseRing}/></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={S.bannerTitle}>Live Quiz Active</div>
                  <div style={S.bannerQ}>{aq.title}</div>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', marginTop:'2px' }}>
                    {aq.questions?.length} questions · {fmt(aq.timer)} total · {aq.totalMarks} marks
                    {aq.negativeMarking && ` · Negative marking`}
                  </div>
                </div>
              </div>
              <div style={S.bannerRight}>
                {/* Live countdown — professor only */}
                {isProfessor && quizTimeLeft !== null && (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', minWidth:'80px' }}>
                    <span style={{
                      fontSize:'28px', fontWeight:800, fontFamily:'DM Mono, monospace',
                      color: urgent ? '#FCA5A5' : 'white',
                      animation: urgent ? 'pulse 1s ease-out infinite' : 'none',
                      lineHeight:1
                    }}>{fmt(quizTimeLeft)}</span>
                    <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.08em' }}>remaining</span>
                  </div>
                )}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                  <span style={{ fontSize:'22px', fontWeight:800, color:'white' }}>{count}</span>
                  <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.6)' }}>submitted</span>
                </div>
                {isProfessor ? (
                  <>
                    <button style={{ ...S.bannerBtn, background:'rgba(255,255,255,0.15)', color:'white' }} onClick={() => setAttemptQuiz({ ...aq, isPreview: true })}>👀 View Quiz</button>
                    {/* +30s add time */}
                    <button
                      style={{ ...S.bannerBtn, background:'rgba(59,130,246,0.8)', color:'white', padding:'10px 14px', fontSize:'12px' }}
                      onClick={() => handleAddQuizTime(aq.id)}
                      title="Add 30 seconds to the quiz timer">
                      +30s
                    </button>
                    <button style={S.bannerBtn} onClick={() => handleEnd(aq.id)}>⏹ End Quiz</button>
                    <button style={{ ...S.bannerBtn, background:'rgba(255,255,255,0.15)' }} onClick={() => setResultsQuiz(aq)}>📊 Live Results</button>
                  </>
                ) : (
                  <button style={S.bannerBtn} onClick={() => setAttemptQuiz(aq)}>
                    {studentResponses[aq.id] 
                      ? '📋 View My Result' 
                      : (typeof localStorage !== 'undefined' && localStorage.getItem(`quiz-draft-${aq.id}-${studentId}`))
                        ? '📝 Resume Incomplete Quiz'
                        : '🚀 Attempt Quiz →'}
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── PROFESSOR: DRAFT QUIZZES ── */}
        {isProfessor && draftQuizzes.length > 0 && (
          <div style={{ marginBottom:'28px' }}>
            <div style={S.secHeader}>
              <div><h2 style={S.secTitle}>Drafts</h2><p style={S.secSub}>{draftQuizzes.length} ready to launch</p></div>
            </div>
            <div style={S.grid}>
              {draftQuizzes.map(q => (
                <div key={q.id} style={{ ...S.card, borderColor:'var(--orange-dim)', borderStyle:'dashed' }}>
                  <div style={S.cardTop}>
                    {q.questions?.length > 0 ? <span style={S.tagDraft}>DRAFT</span> : <span style={{ ...S.tagDraft, background:'#FEE2E2', color:'#B91C1C' }}>INCOMPLETE</span>}
                    <span style={{ fontSize:'11px', color:'var(--gray-400)', fontFamily:'DM Mono' }}>
                      {q.questions?.length||0} Qs · {fmt(q.timer)}
                    </span>
                  </div>
                  <div style={S.cardTitle}>{q.title}</div>
                  <div style={S.cardMeta}>
                    {q.totalMarks} marks · {q.negativeMarking ? 'Negative marking' : 'No penalty'}
                    {q.shuffleQuestions && ' · Shuffle ✓'}
                  </div>
                  <div style={{ display:'flex', gap:'8px' }} onClick={e => e.stopPropagation()}>
                    {q.questions?.length > 0 && <button onClick={() => handleStart(q.id)} style={S.startBtn}>▶ Launch</button>}
                    <button onClick={() => setEditQuiz(q)} style={S.iconBtn}>✏️</button>
                    <button onClick={() => handleDelete(q.id)} style={{ ...S.iconBtn, background:'var(--red-pale)', color:'var(--red)' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PAST QUIZZES ── */}
        <div style={S.secHeader}>
          <div>
            <h2 style={S.secTitle}>{isProfessor ? 'Past Quizzes' : 'Quizzes'}</h2>
            <p style={S.secSub}>{closedQuizzes.length} completed</p>
          </div>
          {isProfessor && (
            <button style={S.addBtn} onClick={() => setShowAddQuiz(true)}>+ Create Quiz</button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'60px' }}>
            <div style={{ display:'inline-block', width:'36px', height:'36px', border:'3px solid var(--gray-200)', borderTopColor:'var(--orange)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <div style={S.grid}>
            {closedQuizzes.map((q, idx) => {
              const myRes   = studentResponses[q.id];
              const pct     = q.totalMarks > 0 && myRes ? Math.round((myRes.score / q.totalMarks) * 100) : null;
              const scoreColor = pct == null ? 'var(--gray-400)' : pct >= 70 ? '#15803D' : pct >= 40 ? '#92400E' : 'var(--red)';
              const scoreBg    = pct == null ? 'var(--gray-50)' : pct >= 70 ? '#F0FDF4' : pct >= 40 ? '#FFFBEB' : '#FEF2F2';

              return (
                <div key={q.id} style={{ ...S.card, cursor: isProfessor || myRes ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (isProfessor) setResultsQuiz(q);
                    else if (myRes)  setAttemptQuiz(q);
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='var(--shadow-sm)'; }}>

                  <div style={S.cardTop}>
                    <span style={{ fontSize:'11px', fontWeight:700, color:'var(--gray-500)', background:'var(--gray-100)', padding:'2px 8px', borderRadius:'99px' }}>
                      {q.questions?.length||0} Qs
                    </span>
                    <span style={{ fontSize:'11px', color:'var(--gray-400)', fontFamily:'DM Mono' }}>
                      ⏱ {fmt(q.timer)}
                    </span>
                  </div>

                  <div style={S.cardTitle}>{q.title}</div>
                  <div style={S.cardMeta}>
                    {q.totalMarks} marks
                    {q.negativeMarking && ` · Negative marking`}
                    {q.shuffleQuestions && ' · Shuffled'}
                  </div>

                  {/* Student score chip */}
                  {!isProfessor && (
                    <div style={{ padding:'10px 12px', borderRadius:'var(--radius-sm)', background:scoreBg, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      {myRes ? (
                        <>
                          <span style={{ fontSize:'12px', fontWeight:600, color:scoreColor }}>
                            {pct >= 70 ? '🎉' : pct >= 40 ? '📝' : '😔'} Your score
                          </span>
                          <span style={{ fontSize:'18px', fontWeight:900, color:scoreColor, fontFamily:'DM Mono' }}>
                            {myRes.score}/{q.totalMarks}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize:'12px', color:'var(--gray-400)' }}>Not attempted</span>
                      )}
                    </div>
                  )}

                  {/* Professor stats row */}
                  {isProfessor && (
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', paddingTop:'10px', borderTop:'1px solid var(--gray-100)' }}>
                      <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
                        <span style={{ fontSize:'18px', fontWeight:800, lineHeight:1, color:'var(--orange)' }}>{q.totalSubmissions || 0}</span>
                        <span style={{ fontSize:'10px', color:'var(--gray-400)', fontWeight:600 }}>submissions</span>
                      </div>
                      <div style={{ display:'flex', gap:'4px' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setResultsQuiz(q)} title="View Results"
                          style={{ ...S.iconBtn, background:'var(--blue-pale)', color:'#1D4ED8', border:'1px solid #BFDBFE' }}>📊</button>
                        <button onClick={() => handleExport(q)} title="Export CSV"
                          style={{ ...S.iconBtn, background:'var(--green-pale)', color:'#15803D', border:'1px solid #86EFAC' }}>📥</button>
                        <button onClick={() => handleDelete(q.id)} title="Delete"
                          style={{ ...S.iconBtn, background:'var(--red-pale)', color:'var(--red)' }}>🗑</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty state */}
            {closedQuizzes.length === 0 && !loading && (
              <>
                {isProfessor ? (
                  <div style={{ background:'var(--gray-50)', borderRadius:'var(--radius-lg)', border:'2px dashed var(--gray-200)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px', minHeight:'180px', gridColumn:'1/-1' }}
                    onClick={() => setShowAddQuiz(true)}>
                    <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'var(--white)', border:'2px solid var(--gray-200)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>📝</div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:'var(--gray-400)' }}>Create your first quiz</div>
                    <div style={{ fontSize:'11px', color:'var(--gray-400)' }}>Click + Create Quiz to get started</div>
                  </div>
                ) : (
                  <p style={{ color:'var(--gray-400)', padding:'40px 20px', gridColumn:'1/-1', textAlign:'center', fontSize:'14px' }}>
                    {activeQuizzes.length > 0 ? '' : '📭 No quizzes available in this course yet.'}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showAddQuiz && (
        <AddQuizModal
          onClose={() => setShowAddQuiz(false)}
          onAdd={handleCreate}
        />
      )}
      {editQuiz && (
        <AddQuizModal
          onClose={() => setEditQuiz(null)}
          onEdit={handleEdit}
          initialData={editQuiz}
        />
      )}
      {attemptQuiz && (
        <QuizAttemptModal
          quiz={attemptQuiz}
          onClose={() => { setAttemptQuiz(null); fetchQuizzes(true); }}
          onSubmitted={() => { fetchQuizzes(true); }}
          studentId={studentId}
          studentName={studentName}
          existingResponse={studentResponses[attemptQuiz.id] || null}
          isPreview={attemptQuiz.isPreview}
        />
      )}
      {resultsQuiz && (
        <QuizResultsModal
          quiz={resultsQuiz}
          onClose={() => setResultsQuiz(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
          padding:'12px 20px', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:600,
          boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:9999, display:'flex', alignItems:'center', gap:'8px',
          background: toast.type==='success'?'#F0FDF4':toast.type==='error'?'#FEF2F2':'var(--white)',
          color:      toast.type==='success'?'#15803D':toast.type==='error'?'#B91C1C':'var(--ink)',
          border:     `1px solid ${toast.type==='success'?'#86EFAC':toast.type==='error'?'#FECACA':'var(--gray-200)'}`,
          animation:'slideUp 0.2s ease',
        }}>
          <span>{toast.type==='success'?'✓':toast.type==='error'?'✕':'ℹ'}</span>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  );
}

// ── Style constants ──
const S = {
  content:   { flex:1, padding:'28px 32px', minWidth:0 },
  banner:    { background:'linear-gradient(135deg, #7C3AED, #A855F7)', borderRadius:'var(--radius-lg)', padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'28px', boxShadow:'0 8px 24px rgba(124,58,237,0.25)', gap:'16px' },
  bannerLeft:{ display:'flex', alignItems:'center', gap:'16px', flex:1, minWidth:0 },
  pulseWrap: { position:'relative', width:'14px', height:'14px', flexShrink:0 },
  pulseDot:  { position:'absolute', inset:0, background:'white', borderRadius:'50%' },
  pulseRing: { position:'absolute', inset:'-4px', border:'2px solid rgba(255,255,255,0.6)', borderRadius:'50%', animation:'pulse 1.5s ease-out infinite' },
  bannerTitle:{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.08em' },
  bannerQ:   { fontSize:'16px', fontWeight:800, color:'white', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  bannerRight:{ display:'flex', alignItems:'center', gap:'12px', flexShrink:0 },
  bannerBtn: { background:'white', color:'#7C3AED', padding:'10px 18px', borderRadius:'var(--radius-sm)', fontSize:'13px', fontWeight:700, boxShadow:'var(--shadow-md)', border:'none', cursor:'pointer' },
  secHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'20px' },
  secTitle:  { fontSize:'20px', fontWeight:800, color:'var(--ink)' },
  secSub:    { fontSize:'13px', color:'var(--gray-400)', marginTop:'2px' },
  addBtn:    { background:'#7C3AED', color:'white', padding:'10px 20px', borderRadius:'var(--radius-md)', fontSize:'13px', fontWeight:700, boxShadow:'0 8px 24px rgba(124,58,237,0.25)', border:'none', cursor:'pointer' },
  grid:      { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'16px' },
  card:      { background:'var(--white)', borderRadius:'var(--radius-lg)', padding:'18px', border:'2px solid var(--gray-100)', transition:'transform 0.2s, box-shadow 0.2s', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', gap:'12px' },
  cardTop:   { display:'flex', justifyContent:'space-between', alignItems:'center' },
  cardTitle: { fontSize:'15px', fontWeight:700, color:'var(--ink)', lineHeight:1.35 },
  cardMeta:  { fontSize:'11px', color:'var(--gray-400)', fontWeight:600 },
  tagDraft:  { fontSize:'11px', fontWeight:700, color:'#92400E', background:'#FEF3C7', padding:'2px 8px', borderRadius:'99px' },
  startBtn:  { flex:1, padding:'8px', background:'#7C3AED', color:'white', borderRadius:'var(--radius-sm)', fontSize:'13px', fontWeight:700, border:'none', cursor:'pointer' },
  iconBtn:   { width:'34px', height:'34px', borderRadius:'8px', background:'var(--gray-50)', border:'1px solid var(--gray-100)', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' },
};
