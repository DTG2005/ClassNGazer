'use client'
import { useState } from 'react'
import { Poll } from './data'

type Props = {
  onClose: () => void
  onAdd: (poll: Poll) => void
}

export default function AddPollModal({ onClose, onAdd }: Props) {
  const [question, setQuestion] = useState('')
  const [topic, setTopic] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIdx, setCorrectIdx] = useState<number | null>(null)
  const LABELS = ['A', 'B', 'C', 'D']

  const handleSubmit = () => {
    if (!question.trim() || correctIdx === null || options.some(o => !o.trim())) return
    const newPoll: Poll = {
      id: `poll-${Date.now()}`,
      question: question.trim(),
      topic: topic || 'General',
      status: 'active',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalResponses: 0,
      options: options.map((text, i) => ({
        id: LABELS[i].toLowerCase(),
        label: LABELS[i],
        text: text.trim(),
        votes: 0,
        isCorrect: i === correctIdx,
      })),
    }
    onAdd(newPoll)
    onClose()
  }

  const isValid = question.trim() && correctIdx !== null && options.every(o => o.trim())

  return (
    <div style={ov} onClick={onClose}>
      <div style={card} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={header}>
          <div>
            <div style={headerTitle}>New Poll</div>
            <div style={headerSub}>This poll will go live immediately</div>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        {/* Form */}
        <div style={formBody}>
          <div style={field}>
            <label style={label}>Topic <span style={optional}>(optional)</span></label>
            <input
              style={input}
              placeholder="e.g. Algorithms, Data Structures..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>

          <div style={field}>
            <label style={label}>Question</label>
            <textarea
              style={textarea}
              placeholder="Enter your poll question..."
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={3}
            />
          </div>

          <div style={field}>
            <label style={label}>Answer Options <span style={optional}>— click ✓ to mark correct</span></label>
            <div style={optionsGrid}>
              {options.map((opt, i) => (
                <div key={i} style={{ ...optRow, ...(correctIdx === i ? optRowCorrect : {}) }}>
                  <span style={{ ...optLabelPill, ...(correctIdx === i ? optLabelCorrect : {}) }}>{LABELS[i]}</span>
                  <input
                    style={optInput}
                    placeholder={`Option ${LABELS[i]}`}
                    value={opt}
                    onChange={e => {
                      const next = [...options]; next[i] = e.target.value; setOptions(next)
                    }}
                  />
                  <button
                    style={{ ...checkBtn, ...(correctIdx === i ? checkBtnActive : {}) }}
                    onClick={() => setCorrectIdx(correctIdx === i ? null : i)}
                    title="Mark as correct"
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={footer}>
          <button style={cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...launchBtn, ...(isValid ? launchBtnActive : {}) }}
            disabled={!isValid}
            onClick={handleSubmit}
          >
            🚀 Launch Poll
          </button>
        </div>
      </div>
    </div>
  )
}

const ov: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)',
  backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', zIndex: 1000, padding: '20px',
}
const card: React.CSSProperties = {
  background: 'var(--white)', borderRadius: 'var(--radius-xl)',
  width: '100%', maxWidth: '540px',
  boxShadow: 'var(--shadow-lg), 0 0 0 1px rgba(26,25,23,0.04)', overflow: 'hidden',
}
const header: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  padding: '24px 24px 0', borderBottom: '1px solid var(--gray-100)', paddingBottom: '16px',
}
const headerTitle: React.CSSProperties = { fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }
const headerSub: React.CSSProperties = { fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' }
const closeBtnStyle: React.CSSProperties = {
  width: '32px', height: '32px', borderRadius: '50%',
  background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const formBody: React.CSSProperties = { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' }
const label: React.CSSProperties = { fontSize: '12px', fontWeight: 700, color: 'var(--gray-800)', textTransform: 'uppercase', letterSpacing: '0.06em' }
const optional: React.CSSProperties = { fontWeight: 400, color: 'var(--gray-400)', textTransform: 'none' }
const input: React.CSSProperties = {
  padding: '11px 14px', border: '2px solid var(--gray-100)', borderRadius: 'var(--radius-md)',
  fontSize: '14px', color: 'var(--ink)', background: 'var(--gray-50)', transition: 'border 0.15s',
}
const textarea: React.CSSProperties = {
  ...input, resize: 'none' as const, lineHeight: 1.5,
}
const optionsGrid: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' }
const optRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '10px',
  padding: '10px 12px', border: '2px solid var(--gray-100)',
  borderRadius: 'var(--radius-md)', background: 'var(--gray-50)', transition: 'all 0.15s',
}
const optRowCorrect: React.CSSProperties = { borderColor: '#86EFAC', background: '#F0FDF4' }
const optLabelPill: React.CSSProperties = {
  width: '26px', height: '26px', borderRadius: '7px',
  background: 'var(--white)', border: '2px solid var(--gray-200)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '11px', fontWeight: 700, color: 'var(--gray-600)', flexShrink: 0,
}
const optLabelCorrect: React.CSSProperties = { borderColor: '#4ADE80', background: '#DCFCE7', color: '#15803D' }
const optInput: React.CSSProperties = {
  flex: 1, fontSize: '13px', color: 'var(--ink)', background: 'transparent',
  fontFamily: 'Sora, sans-serif',
}
const checkBtn: React.CSSProperties = {
  width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
  background: 'var(--gray-100)', color: 'var(--gray-400)', fontSize: '13px', fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
}
const checkBtnActive: React.CSSProperties = { background: '#4ADE80', color: 'white' }
const footer: React.CSSProperties = {
  display: 'flex', gap: '10px', padding: '0 24px 24px', justifyContent: 'flex-end',
}
const cancelBtn: React.CSSProperties = {
  padding: '11px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
  background: 'var(--gray-100)', color: 'var(--gray-600)',
}
const launchBtn: React.CSSProperties = {
  padding: '11px 24px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700,
  background: 'var(--gray-200)', color: 'var(--gray-400)', transition: 'all 0.2s',
}
const launchBtnActive: React.CSSProperties = {
  background: 'var(--orange)', color: 'white', boxShadow: 'var(--shadow-orange)',
}
