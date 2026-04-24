'use client';
import { useState } from 'react';
import { exportService } from '../services/pollDatabase';

export default function ExportModal({ poll, onClose }) {
  const [exporting, setExporting] = useState(false);
  const [msg, setMsg] = useState('');

  const handleExport = async (type) => {
    setExporting(true); setMsg('');
    try {
      if (type === 'csv') await exportService.downloadCSV(poll.id);
      else await exportService.downloadJSON(poll.id);
      setMsg(`✅ ${type.toUpperCase()} downloaded!`);
    } catch (e) { setMsg('❌ ' + e.message); }
    setExporting(false);
  };

  return (
    <div style={ov} onClick={onClose}><div style={card} onClick={e => e.stopPropagation()}>
      <div style={hdr}>
        <div><div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>Export Results</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' }}>{poll.question}</div></div>
        <button style={closeB} onClick={onClose}>✕</button>
      </div>
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--gray-600)' }}>
          <span>{poll.totalResponses} responses</span><span>·</span><span>{poll.topic}</span>
        </div>
        {msg && <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '13px', background: msg.startsWith('✅') ? 'var(--green-pale)' : 'var(--red-pale)', color: msg.startsWith('✅') ? '#15803D' : '#B91C1C' }}>{msg}</div>}
        <button onClick={() => handleExport('csv')} disabled={exporting}
          style={{ width: '100%', padding: '14px', background: 'var(--green)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          📊 Download CSV
        </button>
        <button onClick={() => handleExport('json')} disabled={exporting}
          style={{ width: '100%', padding: '14px', background: 'var(--blue)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          📋 Download JSON
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: '12px', background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600, border: 'none' }}>Close</button>
      </div>
    </div></div>
  );
}

const ov = { position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const card = { background: 'var(--white)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '440px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' };
const hdr = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px', borderBottom: '1px solid var(--gray-100)' };
const closeB = { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' };
