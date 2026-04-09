'use client';
import { useState, useEffect, useRef } from 'react';
import { pollDatabase } from '../services/pollDatabase';

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

export default function AnalyticsPanel({ onClose, courseId }) {
  const [stats, setStats] = useState(null);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    try {
      const history = await pollDatabase.getPollHistory(courseId || 'CS310');
      setPolls(history);
      let totalResponses = 0, totalCorrect = 0, totalPolls = history.length;
      for (const p of history) {
        const s = await pollDatabase.getPollStats(p.id);
        if (s) { totalResponses += s.totalResponses; totalCorrect += s.correctCount; }
      }
      setStats({ totalPolls, totalResponses, totalCorrect, avgAccuracy: totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : 0 });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={ov} onClick={onClose}><div style={card} onClick={e => e.stopPropagation()}>
      <div style={hdr}>
        <div><div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>Analytics</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' }}>Poll performance overview</div></div>
        <button style={closeB} onClick={onClose}>✕</button>
      </div>

      <div style={{ padding: '20px 24px 24px' }}>
        {loading ? <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Loading analytics...</p> : <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Total Polls', value: stats.totalPolls, icon: '📊', color: 'var(--orange)' },
              { label: 'Total Responses', value: stats.totalResponses, icon: '👥', color: 'var(--blue)' },
              { label: 'Correct Answers', value: stats.totalCorrect, icon: '✅', color: 'var(--green)' },
              { label: 'Avg Accuracy', value: stats.avgAccuracy + '%', icon: '🎯', color: stats.avgAccuracy >= 70 ? 'var(--green)' : stats.avgAccuracy >= 40 ? 'var(--orange)' : 'var(--red)' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-100)' }}>
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: 600, marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Per-poll breakdown */}
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Per-poll accuracy</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {polls.map((p, i) => {
              const total = p.totalResponses || 0;
              const count = p.count || {};
              const correctIdx = (p.correctOptions || [p.correctOption])[0];
              const correctCount = count[String(correctIdx)] || 0;
              const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
              return (
                <div key={p.id} style={{ padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>Q{i + 1}: <LatexInline text={p.question} /></span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--orange)' : 'var(--red)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: '5px', background: 'var(--gray-200)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--orange)' : 'var(--red)' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--gray-400)', marginTop: '4px' }}>{total} responses · {correctCount} correct</div>
                </div>
              );
            })}
            {polls.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>No closed polls yet.</p>}
          </div>
        </>}
      </div>
    </div></div>
  );
}

const ov = { position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const card = { background: 'var(--white)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' };
const hdr = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' };
const closeB = { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
