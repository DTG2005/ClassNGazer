'use client';
import { useState, useEffect, useRef } from 'react';
import { pollDatabase } from '../services/pollDatabase';
import { authService } from '../services/authService';
import { useRouter } from 'next/navigation';
import PollDetailModal from './PollDetailModal';
import AddPollModal from './AddPollModal';
import CourseModal from './CourseModal';
import ExportModal from './ExportModal';
import AnalyticsPanel from './AnalyticsPanel';
import QRCode from './QRCode';
import { useScheduleChecker, timeUntil } from './ScheduleChecker';

export default function ClassroomView({ user }) {
  const router = useRouter();
  const role = user?.role || 'student';
  const [polls, setPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [editPoll, setEditPoll] = useState(null);
  const [showCourse, setShowCourse] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [exportPoll, setExportPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courseId] = useState('CS310');
  const [bannerTimeLeft, setBannerTimeLeft] = useState(null);
  const bannerTimerRef = useRef(null);
  const bannerPollIdRef = useRef(null);
  const closingRef = useRef(false);
  const [toast, setToast] = useState(null); // { msg, type: 'success'|'error'|'info' }

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const liveUnsubRef = useRef(null);
  const livePollsInitRef = useRef(false);

  useEffect(() => {
    fetchPolls();

    // Subscribe to livePolls node — fires instantly when any poll goes active or ends
    liveUnsubRef.current = pollDatabase.listenToLivePolls((liveData) => {
      // Skip the first fire (initial value) — already handled by fetchPolls() above
      if (!livePollsInitRef.current) { livePollsInitRef.current = true; return; }
      // Silently re-fetch when a poll starts or ends (no loading spinner)
      fetchPolls(true);
    });

    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
      if (liveUnsubRef.current) liveUnsubRef.current();
      bannerPollIdRef.current = null;
    };
  }, [courseId]);

  const fetchPolls = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const all = await pollDatabase.getAllPolls();
      const converted = all.map(toUI);
      setPolls(converted);
      const active = converted.find(p => p.status === 'active');
      if (active) startBannerTimer(active);
      else { if (bannerTimerRef.current) clearInterval(bannerTimerRef.current); setBannerTimeLeft(null); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Auto-start scheduled polls when their time arrives
  useScheduleChecker(polls, fetchPolls);

  const toUI = (p) => ({
    id: p.id, question: p.question || '', status: p.status || 'draft',
    createdAt: p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
    totalResponses: p.totalResponses || 0, topic: p.courseName || p.courseId || 'General',
    timeLimit: p.timer || 60, startedAt: p.startedAt || null,
    scheduledFor: p.scheduledFor || null,
    solution: p.solution || '',
    options: (p.options || []).map((text, i) => ({
      id: String.fromCharCode(97 + i), label: String.fromCharCode(65 + i), text,
      votes: p.count?.[String(i)] || 0,
      isCorrect: (p.correctOptions || [p.correctOption]).map(Number).includes(i),
    })),
  });

  const startBannerTimer = (ap) => {
    if (bannerPollIdRef.current === ap.id) return; // already running for this poll
    if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    bannerPollIdRef.current = ap.id;
    closingRef.current = false;
    if (!ap.timeLimit) return;
    let elapsed = 0;
    if (ap.startedAt) { const ms = ap.startedAt.seconds ? ap.startedAt.seconds * 1000 : new Date(ap.startedAt).getTime(); elapsed = Math.floor((Date.now() - ms) / 1000); }
    let rem = Math.max(0, ap.timeLimit - elapsed);
    setBannerTimeLeft(rem);
    bannerTimerRef.current = setInterval(() => {
      rem--;
      if (rem <= 0) {
        clearInterval(bannerTimerRef.current);
        bannerPollIdRef.current = null;
        setBannerTimeLeft(0);
        if (!closingRef.current) {
          closingRef.current = true;
          pollDatabase.updatePollStatus(ap.id, 'closed').then(fetchPolls).catch(() => {});
        }
      } else setBannerTimeLeft(rem);
    }, 1000);
  };

  const fmt = (s) => s == null ? '' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const activePolls = polls.filter(p => p.status === 'active');
  const pastPolls = polls.filter(p => p.status === 'closed');
  const draftPolls = polls.filter(p => p.status === 'draft');
  const scheduledPolls = polls.filter(p => p.status === 'scheduled');
  const isProfessor = role === 'professor';

  const handleClose = async (id) => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    bannerPollIdRef.current = null;
    setBannerTimeLeft(null);
    try {
      await pollDatabase.updatePollStatus(id, 'closed');
      showToast('Poll closed', 'success');
      fetchPolls();
    } catch (e) {
      closingRef.current = false;
      if (!e.message?.includes('Cannot close')) showToast(e.message, 'error');
    }
  };

  const handleStart = async (id) => {
    try {
      const poll = await pollDatabase.getPollById(id);
      if (poll?.status === 'scheduled') {
        await pollDatabase.updatePoll(id, { status: 'draft' });
      }
      await pollDatabase.updatePollStatus(id, 'active');
      showToast('Poll is now live', 'success');
      fetchPolls();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this poll?')) return;
    try { await pollDatabase.deletePoll(id); showToast('Poll deleted', 'success'); fetchPolls(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleAdd = async (d) => {
    try {
      const id = await pollDatabase.createPoll({
        question: d.question, options: d.options.map(o => o.text),
        correctOption: d.options.findIndex(o => o.isCorrect),
        correctOptions: d.options.map((o, i) => o.isCorrect ? i : -1).filter(i => i >= 0),
        timer: d.timer || 60, courseId, courseName: 'Software Engineering',
        professorId: user?.uid || 'demo', professorName: user?.name || 'Professor',
        solution: d.solution || '',
      });

      if (d.mode === 'live') {
        await pollDatabase.updatePollStatus(id, 'active');
        showToast('Poll is now live', 'success');
      } else if (d.mode === 'schedule') {
        await pollDatabase.updatePoll(id, { status: 'scheduled', scheduledFor: d.scheduledFor });
        showToast('Poll scheduled', 'success');
      } else {
        showToast('Draft saved', 'info');
      }

      fetchPolls();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleEdit = async (pollId, d) => {
    try {
      await pollDatabase.updatePoll(pollId, {
        question: d.question,
        options: d.options.map(o => o.text),
        correctOption: d.options.findIndex(o => o.isCorrect),
        correctOptions: d.options.map((o, i) => o.isCorrect ? i : -1).filter(i => i >= 0),
        timer: d.timer || 60,
        solution: d.solution || '',
      });
      showToast('Poll updated', 'success');
      fetchPolls();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleSignOut = async () => { await authService.signOut(); router.replace('/auth'); };
  const bannerUrgent = bannerTimeLeft !== null && bannerTimeLeft <= 10;
  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div style={S.page}>
      {/* ── TOPBAR ── */}
      <header style={S.topbar}>
        <div style={S.topbarLeft}>
          <div style={S.logo}><span style={S.logoDot}>●</span>ClassNGazer</div>
          <div style={S.divider} />
          <div><div style={S.className}>CS-310: Software Engineering</div><div style={S.classMeta}>Spring 2026 · IITI</div></div>
        </div>
        <div style={S.topbarRight}>
          <div style={S.codeChip} onClick={() => isProfessor && setShowQR(true)} title={isProfessor ? 'Show QR' : ''}>
            <span style={S.codeLabel}>Code</span><span style={S.codeValue}>{courseId}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={S.avatar}>{initials}</div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: '10px', color: 'var(--gray-400)', textTransform: 'capitalize' }}>{role}</div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--gray-100)', fontSize: '11px', fontWeight: 600, color: 'var(--gray-600)' }}>Sign Out</button>
        </div>
      </header>

      <div style={S.layout}>
        {/* ── SIDEBAR ── */}
        <aside style={S.sidebar}>
          <div style={S.sideCard}><div style={S.sideIcon}>{isProfessor ? '👨‍🏫' : '🎓'}</div><div style={S.sideTitle}>{user?.name || 'User'}</div><div style={S.sideSub}>{isProfessor ? 'Instructor' : 'Student'}</div></div>
          <div style={S.sideCard}><div style={S.sideIcon}>📊</div><div style={S.sideTitle}>{polls.length}</div><div style={S.sideSub}>Polls total</div></div>
          <button onClick={() => setShowCourse(true)} style={S.sideBtn}>📚 Courses</button>
          {isProfessor && <button onClick={() => setShowAnalytics(true)} style={S.sideBtn}>📈 Analytics</button>}
          {isProfessor && <button onClick={() => setShowQR(true)} style={S.sideBtn}>📱 QR Code</button>}
          <div style={S.sideStats}><div style={S.sideStatsTitle}>Accuracy</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pastPolls.slice(0, 3).map(p => {
                const c = p.options.find(o => o.isCorrect);
                const pct = c && p.totalResponses > 0 ? Math.round((c.votes / p.totalResponses) * 100) : 0;
                return (<div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ flex: 1, height: '6px', background: 'var(--orange-dim)', borderRadius: '99px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: 'var(--orange)', borderRadius: '99px' }} /></div><span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', width: '30px', textAlign: 'right' }}>{pct}%</span></div>);
              })}
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={S.content}>

          {/* ── LIVE POLL BANNER ── */}
          {activePolls.length > 0 && (
            <div style={S.activeBanner}>
              <div style={S.bannerLeft}>
                <div style={S.pulseWrap}><div style={S.pulseDot} /><div style={S.pulseRing} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.bannerTitle}>Live Poll Active</div>
                  <div style={S.bannerQ}>{activePolls[0].question}</div>
                </div>
              </div>
              <div style={S.bannerRight}>
                {bannerTimeLeft !== null && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: 'white', fontFamily: 'DM Mono', animation: bannerUrgent ? 'pulse 1s ease-out infinite' : 'none' }}>{fmt(bannerTimeLeft)}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)' }}>remaining</span>
                    <div style={{ width: '50px', height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '99px', marginTop: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '99px', background: bannerUrgent ? '#FCA5A5' : 'white', width: `${activePolls[0].timeLimit ? (bannerTimeLeft / activePolls[0].timeLimit) * 100 : 100}%`, transition: 'width 1s linear' }} />
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{activePolls[0].totalResponses}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>responses</span>
                </div>
                <button style={S.viewLiveBtn} onClick={() => setSelectedPoll(activePolls[0])}>
                  {isProfessor ? 'View Results' : 'Answer Now'} →
                </button>
                {isProfessor && <button style={{ ...S.viewLiveBtn, background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={() => window.open(`/blackboard/${activePolls[0].id}`, '_blank')}>📺</button>}
              </div>
            </div>
          )}

          {/* ── SCHEDULED POLLS (professor only) ── */}
          {isProfessor && scheduledPolls.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={S.secHeader}><div><h2 style={S.secTitle}>Scheduled</h2><p style={S.secSub}>{scheduledPolls.length} upcoming</p></div></div>
              <div style={S.pollGrid}>
                {scheduledPolls.map(p => (
                  <div key={p.id} style={{ ...S.pollCard, borderColor: '#93C5FD', background: '#EFF6FF' }}>
                    <div style={S.cardTop}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#1D4ED8', background: '#DBEAFE', padding: '2px 8px', borderRadius: '99px' }}>📅 SCHEDULED</span>
                      <span style={{ fontSize: '11px', color: '#3B82F6', fontFamily: 'DM Mono', fontWeight: 700 }}>⏱ {p.timeLimit}s</span>
                    </div>
                    <div style={S.cardQ}>{p.question}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1D4ED8' }}>
                      {new Date(p.scheduledFor).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '11px', color: '#3B82F6', fontWeight: 600 }}>
                      Starts {timeUntil(p.scheduledFor)}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleStart(p.id)} style={{ flex: 1, padding: '8px', background: 'var(--green)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}>▶ Start Now</button>
                      <button onClick={() => setEditPoll(p)} style={{ padding: '8px 12px', background: 'var(--gray-100)', color: 'var(--gray-700)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}>✏️</button>
                      <button onClick={() => handleDelete(p.id)} style={{ padding: '8px 12px', background: 'var(--red-pale)', color: 'var(--red)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DRAFT POLLS (professor only) ── */}
          {isProfessor && draftPolls.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={S.secHeader}><div><h2 style={S.secTitle}>Drafts</h2><p style={S.secSub}>{draftPolls.length} ready</p></div></div>
              <div style={S.pollGrid}>{draftPolls.map(p => (
                <div key={p.id} style={{ ...S.pollCard, borderColor: 'var(--orange-dim)', borderStyle: 'dashed', cursor: 'pointer' }} onClick={() => setSelectedPoll(p)}>
                  <div style={S.cardTop}><span style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: '99px' }}>DRAFT</span><span style={{ fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'DM Mono' }}>⏱ {p.timeLimit}s</span></div>
                  <div style={S.cardQ}>{p.question}</div>
                  <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleStart(p.id)} style={{ flex: 1, padding: '8px', background: 'var(--green)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}>▶ Start</button>
                    <button onClick={() => setEditPoll(p)} style={{ padding: '8px 12px', background: 'var(--gray-100)', color: 'var(--gray-700)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}>✏️</button>
                    <button onClick={() => handleDelete(p.id)} style={{ padding: '8px 12px', background: 'var(--red-pale)', color: 'var(--red)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700 }}>🗑</button>
                  </div>
                </div>
              ))}</div>
            </div>
          )}

          {/* ── PAST POLLS ── */}
          <div style={S.secHeader}>
            <div><h2 style={S.secTitle}>Past Polls</h2><p style={S.secSub}>{pastPolls.length} completed</p></div>
            {isProfessor && <button style={S.addBtn} onClick={() => setShowAddPoll(true)}>+ New Poll</button>}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid var(--gray-200)', borderTopColor: 'var(--orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={S.pollGrid}>
              {pastPolls.map((p, idx) => {
                const correct = p.options.find(o => o.isCorrect);
                const pct = correct && p.totalResponses > 0 ? Math.round((correct.votes / p.totalResponses) * 100) : 0;
                return (
                  <div key={p.id} style={S.pollCard} onClick={() => setSelectedPoll(p)}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
                    <div style={S.cardTop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', background: 'var(--orange-pale)', padding: '2px 8px', borderRadius: '99px' }}>Q{idx + 1}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gray-400)' }}>{p.topic}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'DM Mono' }}>⏱{p.timeLimit}s · {p.createdAt}</span>
                    </div>
                    <div style={S.cardQ}>{p.question}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {p.options.slice(0, 3).map(o => (
                        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: o.isCorrect ? '#F0FDF4' : 'var(--gray-50)' }}>
                          <span style={{ width: '20px', height: '20px', borderRadius: '5px', background: o.isCorrect ? '#4ADE80' : 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: o.isCorrect ? 'white' : 'var(--gray-600)', flexShrink: 0 }}>{o.label}</span>
                          <span style={{ fontSize: '12px', color: 'var(--gray-600)' }}>{o.text}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '12px', borderTop: '1px solid var(--gray-100)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1 }}>{p.totalResponses}</span><span style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: 600 }}>responses</span></div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1, color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--orange)' : 'var(--red)' }}>{pct}%</span><span style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: 600 }}>correct</span></div>
                      {isProfessor && <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                        <button onClick={(e) => { e.stopPropagation(); setExportPoll(p); }} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--gray-50)', border: '1px solid var(--gray-100)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Export">📥</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--gray-50)', border: '1px solid var(--gray-100)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete">🗑</button>
                      </div>}
                    </div>
                  </div>
                );
              })}
              {isProfessor && (
                <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--gray-200)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '200px' }} onClick={() => setShowAddPoll(true)}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--white)', border: '2px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: 'var(--gray-400)' }}>+</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-400)' }}>Add New Poll</div>
                </div>
              )}
              {pastPolls.length === 0 && !loading && <p style={{ color: 'var(--gray-400)', padding: '20px', gridColumn: '1/-1' }}>No past polls yet.</p>}
            </div>
          )}
        </main>
      </div>

      {/* ── MODALS ── */}
      {selectedPoll && <PollDetailModal poll={selectedPoll} onClose={() => { setSelectedPoll(null); fetchPolls(); }} role={role} onClosePoll={handleClose} user={user} onEdit={(p) => { setSelectedPoll(null); setEditPoll(p); }} />}
      {showAddPoll && <AddPollModal onClose={() => setShowAddPoll(false)} onAdd={handleAdd} />}
      {editPoll && <AddPollModal onClose={() => setEditPoll(null)} onEdit={handleEdit} initialData={editPoll} />}
      {showCourse && <CourseModal onClose={() => setShowCourse(false)} user={user} onCourseChange={fetchPolls} />}
      {showAnalytics && <AnalyticsPanel onClose={() => setShowAnalytics(false)} courseId={courseId} />}
      {showQR && <QRCode value={courseId} onClose={() => setShowQR(false)} />}
      {exportPoll && <ExportModal poll={exportPoll} onClose={() => setExportPoll(null)} />}

      {/* ── Toast notifications ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          padding: '12px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px',
          background: toast.type === 'success' ? '#F0FDF4' : toast.type === 'error' ? '#FEF2F2' : 'var(--white)',
          color: toast.type === 'success' ? '#15803D' : toast.type === 'error' ? '#B91C1C' : 'var(--ink)',
          border: `1px solid ${toast.type === 'success' ? '#86EFAC' : toast.type === 'error' ? '#FECACA' : 'var(--gray-200)'}`,
          animation: 'slideUp 0.2s ease',
        }}>
          <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}

const S = {
  page: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--off-white)' },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', height: '64px', background: 'var(--white)', borderBottom: '1px solid var(--gray-100)', position: 'sticky', top: 0, zIndex: 100, boxShadow: 'var(--shadow-sm)' },
  topbarLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  logo: { fontSize: '18px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' },
  logoDot: { color: 'var(--orange)', marginRight: '2px' },
  divider: { width: '1px', height: '28px', background: 'var(--gray-100)' },
  className: { fontSize: '14px', fontWeight: 700, color: 'var(--ink)' },
  classMeta: { fontSize: '11px', color: 'var(--gray-400)', fontWeight: 500 },
  topbarRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  codeChip: { display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--orange-pale)', border: '1px solid var(--orange-dim)', padding: '5px 12px', borderRadius: '99px', cursor: 'pointer' },
  codeLabel: { fontSize: '10px', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  codeValue: { fontSize: '13px', fontWeight: 700, color: 'var(--orange)', fontFamily: 'DM Mono, monospace' },
  avatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'var(--orange)', color: 'white', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  layout: { display: 'flex', flex: 1 },
  sidebar: { width: '220px', background: 'var(--white)', borderRight: '1px solid var(--gray-100)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'sticky', top: '64px', height: 'calc(100vh - 64px)', overflowY: 'auto', flexShrink: 0 },
  sideCard: { background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '14px', border: '1px solid var(--gray-100)' },
  sideIcon: { fontSize: '20px', marginBottom: '6px' },
  sideTitle: { fontSize: '16px', fontWeight: 800, color: 'var(--ink)' },
  sideSub: { fontSize: '11px', color: 'var(--gray-400)', fontWeight: 500, marginTop: '1px' },
  sideBtn: { width: '100%', padding: '10px 14px', background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', textAlign: 'left' },
  sideStats: { marginTop: '8px', padding: '14px', background: 'var(--orange-pale)', borderRadius: 'var(--radius-md)', border: '1px solid var(--orange-dim)' },
  sideStatsTitle: { fontSize: '11px', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' },
  content: { flex: 1, padding: '28px 32px', minWidth: 0 },
  activeBanner: { background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-light) 100%)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', boxShadow: 'var(--shadow-orange)', gap: '16px' },
  bannerLeft: { display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 },
  pulseWrap: { position: 'relative', width: '14px', height: '14px', flexShrink: 0 },
  pulseDot: { position: 'absolute', inset: 0, background: 'white', borderRadius: '50%' },
  pulseRing: { position: 'absolute', inset: '-4px', border: '2px solid rgba(255,255,255,0.6)', borderRadius: '50%', animation: 'pulse 1.5s ease-out infinite' },
  bannerTitle: { fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  bannerQ: { fontSize: '15px', fontWeight: 700, color: 'white', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  bannerRight: { display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 },
  viewLiveBtn: { background: 'white', color: 'var(--orange)', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, boxShadow: 'var(--shadow-md)' },
  secHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' },
  secTitle: { fontSize: '20px', fontWeight: 800, color: 'var(--ink)' },
  secSub: { fontSize: '13px', color: 'var(--gray-400)', marginTop: '2px' },
  addBtn: { background: 'var(--orange)', color: 'white', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, boxShadow: 'var(--shadow-orange)' },
  pollGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  pollCard: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '2px solid var(--gray-100)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '14px' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardQ: { fontSize: '14px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
};