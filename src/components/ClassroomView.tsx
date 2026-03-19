'use client'
import { useState } from 'react'
import { MOCK_POLLS, CLASS_INFO, Poll } from './data'
import PollDetailModal from './PollDetailModal'
import AddPollModal from './AddPollModal'

export default function ClassroomView() {
  const [role, setRole] = useState<'professor' | 'student'>('professor')
  const [polls, setPolls] = useState<Poll[]>(MOCK_POLLS)
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null)
  const [showAddPoll, setShowAddPoll] = useState(false)

  const activePolls = polls.filter(p => p.status === 'active')
  const pastPolls = polls.filter(p => p.status === 'closed')

  const handleClosePoll = (id: string) => {
    setPolls(prev => prev.map(p => p.id === id ? { ...p, status: 'closed' } : p))
  }

  const handleAddPoll = (poll: Poll) => {
    setPolls(prev => [...prev, poll])
  }

  return (
    <div style={page}>

      {/* Topbar */}
      <header style={topbar}>
        <div style={topbarLeft}>
          <div style={logo}>
            <span style={logoDot}>●</span>iClicker
          </div>
          <div style={divider} />
          <div>
            <div style={className}>{CLASS_INFO.name}</div>
            <div style={classMeta}>{CLASS_INFO.section}</div>
          </div>
        </div>
        <div style={topbarRight}>
          {/* Role Toggle */}
          <div style={roleToggle}>
            <button
              style={{ ...roleBtn, ...(role === 'student' ? roleBtnActive : {}) }}
              onClick={() => setRole('student')}
            >Student</button>
            <button
              style={{ ...roleBtn, ...(role === 'professor' ? roleBtnActive : {}) }}
              onClick={() => setRole('professor')}
            >Professor</button>
          </div>
          <div style={codeChip}>
            <span style={codeLabel}>Code</span>
            <span style={codeValue}>{CLASS_INFO.code}</span>
          </div>
          <div style={avatar}>{CLASS_INFO.professor.split(' ').map(n => n[0]).join('')}</div>
        </div>
      </header>

      {/* Main layout */}
      <div style={layout}>

        {/* Sidebar */}
        <aside style={sidebar}>
          <div style={sideCard}>
            <div style={sideIcon}>🎓</div>
            <div style={sideTitle}>{CLASS_INFO.professor}</div>
            <div style={sideSub}>Instructor</div>
          </div>
          <div style={sideCard}>
            <div style={sideIcon}>👥</div>
            <div style={sideTitle}>{CLASS_INFO.studentCount}</div>
            <div style={sideSub}>Students enrolled</div>
          </div>
          <div style={sideCard}>
            <div style={sideIcon}>📊</div>
            <div style={sideTitle}>{polls.length}</div>
            <div style={sideSub}>Polls total</div>
          </div>

          <div style={sideStats}>
            <div style={sideStatsTitle}>Today's Accuracy</div>
            <div style={accuracyBars}>
              {pastPolls.slice(0, 3).map(p => {
                const correct = p.options.find(o => o.isCorrect)
                const pct = correct ? Math.round((correct.votes / p.totalResponses) * 100) : 0
                return (
                  <div key={p.id} style={accBar}>
                    <div style={accBarFill}>
                      <div style={{ ...accBarInner, width: `${pct}%` }} />
                    </div>
                    <span style={accPct}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Content */}
        <main style={content}>

          {/* Active Poll Banner */}
          {activePolls.length > 0 && (
            <div style={activeBanner}>
              <div style={activeBannerLeft}>
                <div style={pulseWrap}>
                  <div style={pulseDot} />
                  <div style={pulseRing} />
                </div>
                <div>
                  <div style={activeBannerTitle}>Live Poll Active</div>
                  <div style={activeBannerQ}>{activePolls[0].question}</div>
                </div>
              </div>
              <div style={activeBannerRight}>
                <div style={activeStat}>
                  <span style={activeStatNum}>{activePolls[0].totalResponses}</span>
                  <span style={activeStatLabel}>responses</span>
                </div>
                <button style={viewLiveBtn} onClick={() => setSelectedPoll(activePolls[0])}>
                  {role === 'professor' ? 'View Results' : 'Answer Now'} →
                </button>
              </div>
            </div>
          )}

          {/* Header row */}
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>Past Polls</h2>
              <p style={sectionSub}>{pastPolls.length} completed polls this session</p>
            </div>
            {role === 'professor' && (
              <button style={addPollBtn} onClick={() => setShowAddPoll(true)}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--orange-light)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--orange)'}
              >
                + New Poll
              </button>
            )}
          </div>

          {/* Poll grid */}
          <div style={pollGrid}>
            {pastPolls.map((poll, idx) => {
              const correct = poll.options.find(o => o.isCorrect)
              const pct = correct ? Math.round((correct.votes / poll.totalResponses) * 100) : 0

              return (
                <div key={poll.id} style={pollCard}
                  onClick={() => setSelectedPoll(poll)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--orange-dim)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)'
                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-100)'
                  }}
                >
                  <div style={cardTop}>
                    <div style={cardMeta}>
                      <span style={cardNum}>#{idx + 1}</span>
                      <span style={cardTopic}>{poll.topic}</span>
                    </div>
                    <div style={cardTime}>{poll.createdAt}</div>
                  </div>

                  <p style={cardQuestion}>{poll.question}</p>

                  <div style={cardOptions}>
                    {poll.options.map(opt => (
                      <div key={opt.id} style={{ ...cardOpt, ...(opt.isCorrect ? cardOptCorrect : {}) }}>
                        <span style={{ ...cardOptLabel, ...(opt.isCorrect ? cardOptLabelCorrect : {}) }}>
                          {opt.label}
                        </span>
                        <span style={cardOptText}>{opt.text}</span>
                      </div>
                    ))}
                  </div>

                  <div style={cardFooter}>
                    <div style={cardFooterStat}>
                      <span style={cardFooterNum}>{poll.totalResponses}</span>
                      <span style={cardFooterLabel}>responses</span>
                    </div>
                    <div style={cardFooterStat}>
                      <span style={{ ...cardFooterNum, color: pct >= 70 ? '#15803D' : pct >= 50 ? 'var(--orange)' : 'var(--red)' }}>{pct}%</span>
                      <span style={cardFooterLabel}>correct</span>
                    </div>
                    {role === 'professor' && (
                      <div style={cardActions}>
                        <button style={cardActionBtn} onClick={e => { e.stopPropagation(); setSelectedPoll(poll) }}
                          title="See results">📊</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add Poll Card - professor only */}
            {role === 'professor' && (
              <div style={addCard} onClick={() => setShowAddPoll(true)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--orange)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--orange-pale)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-200)'
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'
                }}
              >
                <div style={addCardIcon}>+</div>
                <div style={addCardText}>Add New Poll</div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {selectedPoll && (
        <PollDetailModal
          poll={selectedPoll}
          role={role}
          onClose={() => setSelectedPoll(null)}
          onClosePoll={handleClosePoll}
        />
      )}
      {showAddPoll && (
        <AddPollModal
          onClose={() => setShowAddPoll(false)}
          onAdd={handleAddPoll}
        />
      )}
    </div>
  )
}

/* ── Styles ─────────────────────────────────────────── */

const page: React.CSSProperties = {
  minHeight: '100vh', background: 'var(--off-white)', display: 'flex', flexDirection: 'column',
}

const topbar: React.CSSProperties = {
  height: '64px', background: 'var(--white)', borderBottom: '1px solid var(--gray-100)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 28px', position: 'sticky', top: 0, zIndex: 100,
  boxShadow: 'var(--shadow-sm)',
}
const topbarLeft: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '16px' }
const logo: React.CSSProperties = { fontSize: '18px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }
const logoDot: React.CSSProperties = { color: 'var(--orange)', marginRight: '2px' }
const divider: React.CSSProperties = { width: '1px', height: '28px', background: 'var(--gray-100)' }
const className: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }
const classMeta: React.CSSProperties = { fontSize: '11px', color: 'var(--gray-400)', fontWeight: 500 }

const topbarRight: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px' }
const roleToggle: React.CSSProperties = {
  display: 'flex', background: 'var(--gray-100)', borderRadius: '10px', padding: '3px',
}
const roleBtn: React.CSSProperties = {
  padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
  color: 'var(--gray-600)', background: 'transparent', transition: 'all 0.15s',
}
const roleBtnActive: React.CSSProperties = { background: 'var(--white)', color: 'var(--ink)', boxShadow: 'var(--shadow-sm)' }
const codeChip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  background: 'var(--orange-pale)', border: '1px solid var(--orange-dim)',
  padding: '5px 12px', borderRadius: '99px',
}
const codeLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.06em' }
const codeValue: React.CSSProperties = { fontSize: '13px', fontWeight: 700, color: 'var(--orange)', fontFamily: 'DM Mono, monospace' }
const avatar: React.CSSProperties = {
  width: '36px', height: '36px', borderRadius: '50%',
  background: 'var(--orange)', color: 'white', fontWeight: 700, fontSize: '13px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const layout: React.CSSProperties = { display: 'flex', flex: 1, gap: '0' }

const sidebar: React.CSSProperties = {
  width: '220px', background: 'var(--white)', borderRight: '1px solid var(--gray-100)',
  padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
  position: 'sticky', top: '64px', height: 'calc(100vh - 64px)', overflowY: 'auto', flexShrink: 0,
}
const sideCard: React.CSSProperties = {
  background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '14px',
  border: '1px solid var(--gray-100)',
}
const sideIcon: React.CSSProperties = { fontSize: '20px', marginBottom: '6px' }
const sideTitle: React.CSSProperties = { fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }
const sideSub: React.CSSProperties = { fontSize: '11px', color: 'var(--gray-400)', fontWeight: 500, marginTop: '1px' }
const sideStats: React.CSSProperties = { marginTop: '8px', padding: '14px', background: 'var(--orange-pale)', borderRadius: 'var(--radius-md)', border: '1px solid var(--orange-dim)' }
const sideStatsTitle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }
const accuracyBars: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' }
const accBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px' }
const accBarFill: React.CSSProperties = { flex: 1, height: '6px', background: 'var(--orange-dim)', borderRadius: '99px', overflow: 'hidden' }
const accBarInner: React.CSSProperties = { height: '100%', background: 'var(--orange)', borderRadius: '99px' }
const accPct: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'var(--orange)', width: '30px', textAlign: 'right' }

const content: React.CSSProperties = { flex: 1, padding: '28px 32px', minWidth: 0 }

const activeBanner: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--orange) 0%, var(--orange-light) 100%)',
  borderRadius: 'var(--radius-lg)', padding: '20px 24px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: '28px', boxShadow: 'var(--shadow-orange)', gap: '16px',
}
const activeBannerLeft: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }
const pulseWrap: React.CSSProperties = { position: 'relative', width: '14px', height: '14px', flexShrink: 0 }
const pulseDot: React.CSSProperties = {
  position: 'absolute', inset: 0, background: 'white', borderRadius: '50%',
}
const pulseRing: React.CSSProperties = {
  position: 'absolute', inset: '-4px', border: '2px solid rgba(255,255,255,0.6)',
  borderRadius: '50%', animation: 'pulse 1.5s ease-out infinite',
}
const activeBannerTitle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em' }
const activeBannerQ: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: 'white', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const activeBannerRight: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }
const activeStat: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center' }
const activeStatNum: React.CSSProperties = { fontSize: '22px', fontWeight: 800, color: 'white', lineHeight: 1 }
const activeStatLabel: React.CSSProperties = { fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }
const viewLiveBtn: React.CSSProperties = {
  background: 'white', color: 'var(--orange)', padding: '10px 20px',
  borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700,
  boxShadow: 'var(--shadow-md)',
}

const sectionHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }
const sectionTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 800, color: 'var(--ink)' }
const sectionSub: React.CSSProperties = { fontSize: '13px', color: 'var(--gray-400)', marginTop: '2px' }
const addPollBtn: React.CSSProperties = {
  background: 'var(--orange)', color: 'white', padding: '10px 20px',
  borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700,
  boxShadow: 'var(--shadow-orange)', transition: 'background 0.15s',
}

const pollGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px',
}

const pollCard: React.CSSProperties = {
  background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '20px',
  border: '2px solid var(--gray-100)', cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
  boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '14px',
}
const cardTop: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const cardMeta: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px' }
const cardNum: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--orange)',
  background: 'var(--orange-pale)', padding: '2px 8px', borderRadius: '99px',
}
const cardTopic: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--gray-400)' }
const cardTime: React.CSSProperties = { fontSize: '11px', color: 'var(--gray-400)', fontFamily: 'DM Mono, monospace' }

const cardQuestion: React.CSSProperties = {
  fontSize: '14px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.45,
  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
}

const cardOptions: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' }
const cardOpt: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '6px 10px', borderRadius: '8px', background: 'var(--gray-50)',
}
const cardOptCorrect: React.CSSProperties = { background: '#F0FDF4' }
const cardOptLabel: React.CSSProperties = {
  width: '20px', height: '20px', borderRadius: '5px',
  background: 'var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '10px', fontWeight: 700, color: 'var(--gray-600)', flexShrink: 0,
}
const cardOptLabelCorrect: React.CSSProperties = { background: '#4ADE80', color: 'white' }
const cardOptText: React.CSSProperties = { fontSize: '12px', color: 'var(--gray-600)', fontWeight: 500 }

const cardFooter: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '16px',
  paddingTop: '12px', borderTop: '1px solid var(--gray-100)',
}
const cardFooterStat: React.CSSProperties = { display: 'flex', flexDirection: 'column' }
const cardFooterNum: React.CSSProperties = { fontSize: '16px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }
const cardFooterLabel: React.CSSProperties = { fontSize: '10px', color: 'var(--gray-400)', fontWeight: 600, marginTop: '1px' }
const cardActions: React.CSSProperties = { marginLeft: 'auto', display: 'flex', gap: '6px' }
const cardActionBtn: React.CSSProperties = {
  width: '30px', height: '30px', borderRadius: '8px',
  background: 'var(--gray-50)', border: '1px solid var(--gray-100)',
  fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const addCard: React.CSSProperties = {
  background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)',
  border: '2px dashed var(--gray-200)', cursor: 'pointer',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: '10px', minHeight: '200px', transition: 'all 0.2s',
}
const addCardIcon: React.CSSProperties = {
  width: '44px', height: '44px', borderRadius: '12px',
  background: 'var(--white)', border: '2px solid var(--gray-200)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '22px', color: 'var(--gray-400)',
}
const addCardText: React.CSSProperties = { fontSize: '13px', fontWeight: 700, color: 'var(--gray-400)' }
