'use client';
import { useState, useEffect, useRef } from 'react';

// ── Inline LaTeX renderer (reusable) ──
function LatexInline({ text, className = '' }) {
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
  return <span ref={ref} className={className}>{text}</span>;
}

export default function AddPollModal({ onClose, onAdd, onEdit, initialData }) {
  const isEditing = !!initialData;

  const [question, setQuestion] = useState(initialData?.question || '');
  const [topic, setTopic] = useState(initialData?.topic || '');
  const [options, setOptions] = useState(
    initialData?.options?.map(o => o.text) || ['', '', '', '']
  );
  const [correctIdx, setCorrectIdx] = useState(
    initialData?.options ? initialData.options.findIndex(o => o.isCorrect) : null
  );
  const [timer, setTimer] = useState(initialData?.timeLimit || 60);
  const [solution, setSolution] = useState(initialData?.solution || '');
  const [mode, setMode] = useState('live');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [preview, setPreview] = useState(false);
  const LABELS = ['A', 'B', 'C', 'D'];

  const handleSubmit = () => {
    if (!question.trim() || correctIdx === null || options.some(o => !o.trim())) return;
    const pollData = {
      question: question.trim(), topic: topic || 'General', timer, mode, solution: solution.trim(),
      options: options.map((text, i) => ({ id: LABELS[i].toLowerCase(), label: LABELS[i], text: text.trim(), votes: 0, isCorrect: i === correctIdx })),
    };

    if (isEditing) {
      onEdit(initialData.id, pollData);
      onClose();
      return;
    }

    if (mode === 'schedule') {
      if (!scheduleDate || !scheduleTime) { alert('Please select date and time'); return; }
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
      if (scheduledFor <= new Date()) { alert('Scheduled time must be in the future'); return; }
      pollData.scheduledFor = scheduledFor.toISOString();
    }
    onAdd(pollData);
    onClose();
  };

  const isValid = question.trim() && correctIdx !== null && options.every(o => o.trim());
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={ov} onClick={onClose}><div style={card} onClick={e => e.stopPropagation()}>
      <div style={hdr}>
        <div><div style={hdrT}>{isEditing ? 'Edit Poll' : 'New Poll'}</div><div style={hdrS}>{isEditing ? 'Update question, options, or timer' : 'Create, schedule, or save as draft'}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" onClick={() => setPreview(p => !p)}
            style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
              background: preview ? 'var(--orange)' : 'var(--gray-100)',
              color: preview ? 'white' : 'var(--gray-600)', border: 'none' }}>
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button style={closeB} onClick={onClose}>✕</button>
        </div>
      </div>
      <div style={bdy}>
        <div style={fld}><label style={lbl}>Topic <span style={opt}>optional</span></label>
          <input style={inp} placeholder="e.g. Algorithms, Data Structures..." value={topic} onChange={e => setTopic(e.target.value)} /></div>

        <div style={fld}><label style={lbl}>Question <span style={opt}>— LaTeX: $...$  $$...$$</span></label>
          {preview ? (
            <div style={{ ...inp, minHeight: '72px', background: 'var(--gray-50)' }}>
              {question ? <LatexInline text={question} /> : <span style={{ color: 'var(--gray-400)' }}>Nothing to preview</span>}
            </div>
          ) : (
            <textarea style={{ ...inp, resize: 'none', lineHeight: 1.5, fontFamily: 'DM Mono, monospace' }} placeholder="Enter your poll question..." value={question} onChange={e => setQuestion(e.target.value)} rows={3} />
          )}
        </div>

        <div style={fld}><label style={lbl}>Answer Options <span style={opt}>— click ✓ to mark correct. LaTeX ok.</span></label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{options.map((o, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: `2px solid ${correctIdx === i ? '#86EFAC' : 'var(--gray-100)'}`, borderRadius: 'var(--radius-md)', background: correctIdx === i ? '#F0FDF4' : 'var(--gray-50)' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: correctIdx === i ? '#DCFCE7' : 'var(--white)', border: `2px solid ${correctIdx === i ? '#4ADE80' : 'var(--gray-200)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: correctIdx === i ? '#15803D' : 'var(--gray-600)', flexShrink: 0 }}>{LABELS[i]}</span>
              {preview ? (
                <div style={{ flex: 1, fontSize: '13px', color: 'var(--ink)' }}>
                  {o ? <LatexInline text={o} /> : <span style={{ color: 'var(--gray-400)' }}>Option {LABELS[i]}</span>}
                </div>
              ) : (
                <input style={{ flex: 1, fontSize: '13px', color: 'var(--ink)', background: 'transparent', border: 'none', outline: 'none', fontFamily: 'DM Mono, monospace' }} placeholder={`Option ${LABELS[i]} — LaTeX ok`} value={o} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} />
              )}
              <button style={{ width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0, background: correctIdx === i ? '#4ADE80' : 'var(--gray-100)', color: correctIdx === i ? 'white' : 'var(--gray-400)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setCorrectIdx(correctIdx === i ? null : i)}>✓</button>
            </div>
          ))}</div>
        </div>

        <div style={fld}><label style={lbl}>Solution <span style={opt}>optional — shown after poll ends. LaTeX ok.</span></label>
          {preview ? (
            <div style={{ ...inp, minHeight: '60px', background: 'var(--gray-50)' }}>
              {solution ? <LatexInline text={solution} /> : <span style={{ color: 'var(--gray-400)' }}>No solution</span>}
            </div>
          ) : (
            <textarea style={{ ...inp, resize: 'none', lineHeight: 1.5, fontFamily: 'DM Mono, monospace' }} placeholder="Explain the correct answer, add context, formula, or reference..." value={solution} onChange={e => setSolution(e.target.value)} rows={3} />
          )}
        </div>

        <div style={fld}><label style={lbl}>Time Limit</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {[30, 60, 90, 120, 180].map(t => (<button key={t} onClick={() => setTimer(t)} style={{ padding: '6px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: timer === t ? 'var(--orange)' : 'var(--gray-100)', color: timer === t ? 'white' : 'var(--gray-600)', border: 'none' }}>{t}s</button>))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="range" min={10} max={300} value={timer} onChange={e => setTimer(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--orange)' }} />
            <div style={{ minWidth: '60px', textAlign: 'center', fontSize: '18px', fontWeight: 800, color: 'var(--orange)', fontFamily: 'DM Mono' }}>{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</div>
          </div>
        </div>

        {!isEditing && (
        <div style={fld}>
          <label style={lbl}>Launch Mode</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'live', icon: '🚀', label: 'Go Live Now', desc: 'Starts immediately' },
              { key: 'schedule', icon: '📅', label: 'Schedule', desc: 'Auto-starts at set time' },
              { key: 'draft', icon: '📝', label: 'Save Draft', desc: 'Start manually later' },
            ].map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
                style={{ flex: 1, padding: '12px 8px', borderRadius: 'var(--radius-md)', border: `2px solid ${mode === m.key ? 'var(--orange)' : 'var(--gray-100)'}`, background: mode === m.key ? 'var(--orange-pale)' : 'var(--gray-50)', textAlign: 'center', transition: 'all 0.15s' }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{m.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: mode === m.key ? 'var(--orange)' : 'var(--gray-600)' }}>{m.label}</div>
                <div style={{ fontSize: '9px', color: 'var(--gray-400)', marginTop: '2px' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
        )}

        {!isEditing && mode === 'schedule' && (
          <div style={{ ...fld, background: 'var(--blue-pale)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid #93C5FD' }}>
            <label style={{ ...lbl, color: '#1D4ED8' }}>Schedule For</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: '#3B82F6', display: 'block', marginBottom: '4px' }}>Date</label>
                <input type="date" value={scheduleDate} min={today} onChange={e => setScheduleDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #93C5FD', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--ink)', background: 'white', fontFamily: 'DM Mono' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '10px', fontWeight: 600, color: '#3B82F6', display: 'block', marginBottom: '4px' }}>Time</label>
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '2px solid #93C5FD', borderRadius: 'var(--radius-sm)', fontSize: '14px', color: 'var(--ink)', background: 'white', fontFamily: 'DM Mono' }} />
              </div>
            </div>
            {scheduleDate && scheduleTime && (
              <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600, color: '#1D4ED8' }}>
                Will go live: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={ftr}>
        <button style={cancelS} onClick={onClose}>Cancel</button>
        <button disabled={!isValid} onClick={handleSubmit}
          style={{ padding: '11px 24px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, border: 'none',
            background: isValid ? (isEditing ? 'var(--gray-600)' : mode === 'schedule' ? 'var(--blue)' : mode === 'draft' ? 'var(--gray-600)' : 'var(--orange)') : 'var(--gray-200)',
            color: isValid ? 'white' : 'var(--gray-400)',
            boxShadow: isValid ? (isEditing ? 'none' : mode === 'schedule' ? '0 8px 24px rgba(59,130,246,0.2)' : mode === 'draft' ? 'none' : 'var(--shadow-orange)') : 'none',
          }}>
          {isEditing ? '💾 Save Draft' : mode === 'live' ? '🚀 Launch Poll' : mode === 'schedule' ? '📅 Schedule Poll' : '📝 Save Draft'}
        </button>
      </div>
    </div></div>
  );
}

const ov = { position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const card = { background: 'var(--white)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' };
const hdr = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' };
const hdrT = { fontSize: '18px', fontWeight: 800, color: 'var(--ink)' };
const hdrS = { fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' };
const closeB = { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const bdy = { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' };
const fld = { display: 'flex', flexDirection: 'column', gap: '8px' };
const lbl = { fontSize: '12px', fontWeight: 700, color: 'var(--gray-800)', textTransform: 'uppercase', letterSpacing: '0.06em' };
const opt = { fontWeight: 400, color: 'var(--gray-400)', textTransform: 'none' };
const inp = { padding: '11px 14px', border: '2px solid var(--gray-100)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--ink)', background: 'var(--gray-50)' };
const ftr = { display: 'flex', gap: '10px', padding: '16px 24px 24px', justifyContent: 'flex-end', borderTop: '1px solid var(--gray-100)' };
const cancelS = { padding: '11px 20px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, background: 'var(--gray-100)', color: 'var(--gray-600)' };
