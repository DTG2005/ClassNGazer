'use client'
import { useState } from 'react'
import { Poll } from './data'

type Props = {
  poll: Poll
  onClose: () => void
  role: 'professor' | 'student'
  onClosePoll?: (id: string) => void
}

export default function PollDetailModal({ poll, onClose, role, onClosePoll }: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const maxVotes = Math.max(...poll.options.map(o => o.votes))
  const correctOption = poll.options.find(o => o.isCorrect)
  const isActive = poll.status === 'active'
  const showResults = role === 'professor' || !isActive || submitted

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.topicBadge}>{poll.topic}</span>
            <span style={{ ...styles.statusBadge, ...(isActive ? styles.statusActive : styles.statusClosed) }}>
              {isActive ? '● Live' : '✓ Closed'}
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Question */}
        <div style={styles.questionSection}>
          <h2 style={styles.question}>{poll.question}</h2>
          <div style={styles.pollMeta}>
            <span>{poll.totalResponses} responses</span>
            <span style={{ color: 'var(--gray-200)' }}>·</span>
            <span>{poll.createdAt}</span>
          </div>
        </div>

        {/* Options */}
        <div style={styles.optionsList}>
          {poll.options.map(opt => {
            const pct = poll.totalResponses > 0 ? Math.round((opt.votes / poll.totalResponses) * 100) : 0
            const isSelected = selectedOption === opt.id
            const isCorrect = opt.isCorrect
            const isMostWrong = !isCorrect && opt.votes === maxVotes && showResults

            let optStyle = { ...styles.option }
            if (showResults && isCorrect) optStyle = { ...optStyle, ...styles.optionCorrect }
            else if (isSelected && !showResults) optStyle = { ...optStyle, ...styles.optionSelected }
            else if (role === 'student' && isActive && !submitted) optStyle = { ...optStyle, cursor: 'pointer' }

            let labelStyle = { ...styles.optLabel }
            if (showResults && isCorrect) labelStyle = { ...labelStyle, ...styles.labelCorrect }
            else if (isSelected) labelStyle = { ...labelStyle, ...styles.labelSelected }

            return (
              <div key={opt.id} style={optStyle}
                onClick={() => { if (role === 'student' && isActive && !submitted) setSelectedOption(opt.id) }}
                onMouseEnter={e => {
                  if (role === 'student' && isActive && !submitted) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--orange-dim)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--orange-pale)'
                  }
                }}
                onMouseLeave={e => {
                  if (role === 'student' && isActive && !submitted && selectedOption !== opt.id) {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-100)'
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'
                  }
                }}
              >
                <div style={styles.optLeft}>
                  <span style={labelStyle}>{opt.label}</span>
                  <span style={styles.optText}>{opt.text}</span>
                  {showResults && isCorrect && (
                    <span style={styles.correctTag}>✓ Correct</span>
                  )}
                </div>
                {showResults && (
                  <div style={styles.optRight}>
                    <span style={{ ...styles.optPct, ...(isCorrect ? { color: '#15803D' } : {}) }}>{pct}%</span>
                    <div style={styles.barWrap}>
                      <div style={{
                        ...styles.bar,
                        width: `${pct}%`,
                        background: isCorrect ? '#4ADE80' : isMostWrong ? '#FCA5A5' : 'var(--gray-300, #D1D5DB)',
                        transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)'
                      }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {role === 'student' && isActive && !submitted && (
          <div style={styles.footer}>
            <button
              style={{ ...styles.submitBtn, ...(selectedOption ? styles.submitBtnActive : {}) }}
              disabled={!selectedOption}
              onClick={() => selectedOption && setSubmitted(true)}
            >
              Submit Answer
            </button>
          </div>
        )}

        {role === 'student' && submitted && (
          <div style={styles.footer}>
            <div style={{
              ...styles.submittedBanner,
              ...(selectedOption === correctOption?.id ? styles.bannerCorrect : styles.bannerWrong)
            }}>
              {selectedOption === correctOption?.id
                ? '🎉 Correct! Well done.'
                : `✗ Incorrect. The answer was ${correctOption?.label}: ${correctOption?.text}`}
            </div>
          </div>
        )}

        {role === 'professor' && (
          <div style={styles.footerProf}>
            <div>
              <div style={styles.insightLabel}>Class accuracy</div>
              <div style={styles.insightValue}>
                {correctOption ? `${Math.round((correctOption.votes / poll.totalResponses) * 100)}%` : '—'}
              </div>
            </div>
            {isActive && onClosePoll && (
              <button style={styles.closePollBtn}
                onClick={() => { onClosePoll(poll.id); onClose() }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--red)'
                  ;(e.currentTarget as HTMLElement).style.color = 'white'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--red-pale)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--red)'
                }}
              >
                Close Poll
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: '20px',
  },
  card: {
    background: 'var(--white)', borderRadius: 'var(--radius-xl)',
    width: '100%', maxWidth: '580px',
    boxShadow: 'var(--shadow-lg), 0 0 0 1px rgba(26,25,23,0.04)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px 0',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  topicBadge: {
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    color: 'var(--gray-400)',
  },
  statusBadge: { fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px' },
  statusActive: { background: '#DCFCE7', color: '#15803D' },
  statusClosed: { background: 'var(--gray-100)', color: 'var(--gray-600)' },
  closeBtn: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'var(--gray-100)', color: 'var(--gray-600)',
    fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  questionSection: { padding: '16px 24px 20px', borderBottom: '1px solid var(--gray-100)' },
  question: { fontSize: '18px', fontWeight: 700, lineHeight: 1.4, color: 'var(--ink)' },
  pollMeta: { display: 'flex', gap: '8px', marginTop: '8px', fontSize: '12px', color: 'var(--gray-400)', fontWeight: 500 },
  optionsList: { padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' },
  option: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderRadius: 'var(--radius-md)',
    border: '2px solid var(--gray-100)', background: 'var(--gray-50)', transition: 'all 0.15s',
  },
  optionCorrect: { border: '2px solid #86EFAC', background: '#F0FDF4' },
  optionSelected: { border: '2px solid var(--orange)', background: 'var(--orange-pale)' },
  optLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
  optLabel: {
    width: '28px', height: '28px', borderRadius: '8px',
    background: 'var(--white)', border: '2px solid var(--gray-200)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', flexShrink: 0,
  },
  labelCorrect: { borderColor: '#4ADE80', background: '#DCFCE7', color: '#15803D' },
  labelSelected: { borderColor: 'var(--orange)', background: 'var(--orange-pale)', color: 'var(--orange)' },
  optText: { fontSize: '14px', fontWeight: 500, color: 'var(--ink)' },
  correctTag: {
    fontSize: '11px', fontWeight: 700, color: '#15803D',
    background: '#DCFCE7', padding: '2px 8px', borderRadius: '99px',
  },
  optRight: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px' },
  optPct: { fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)', minWidth: '34px', textAlign: 'right' },
  barWrap: { width: '70px', height: '6px', background: 'var(--gray-100)', borderRadius: '99px', overflow: 'hidden' },
  bar: { height: '100%', borderRadius: '99px' },
  footer: { padding: '0 24px 24px' },
  submitBtn: {
    width: '100%', padding: '14px', borderRadius: 'var(--radius-md)',
    fontSize: '14px', fontWeight: 700,
    background: 'var(--gray-200)', color: 'var(--gray-400)', transition: 'all 0.2s',
  },
  submitBtnActive: { background: 'var(--orange)', color: 'white', boxShadow: 'var(--shadow-orange)' },
  submittedBanner: { padding: '14px 18px', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, textAlign: 'center' },
  bannerCorrect: { background: 'var(--green-pale)', color: '#15803D' },
  bannerWrong: { background: 'var(--red-pale)', color: '#B91C1C' },
  footerProf: { padding: '16px 24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderTop: '1px solid var(--gray-100)' },
  insightLabel: { fontSize: '11px', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' },
  insightValue: { fontSize: '32px', fontWeight: 800, color: 'var(--orange)' },
  closePollBtn: {
    padding: '10px 20px', borderRadius: 'var(--radius-md)',
    background: 'var(--red-pale)', color: 'var(--red)',
    fontSize: '13px', fontWeight: 700, transition: 'all 0.15s',
  },
}
