'use client';
import { useState } from 'react';

export default function QRCode({ value, courseId, size = 200, onClose }) {
  const [copied, setCopied] = useState('');

  // Build a join link that students can click to join the course
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const joinLink = `${baseUrl}/join/${value}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(joinLink)}`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div style={ov} onClick={onClose}><div style={card} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>Share Course</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' }}>Students scan QR or click link to join</div>
        </div>
        <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>✕</button>
      </div>
      <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
        {/* QR Code — encodes the join link */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '2px solid var(--gray-100)', display: 'inline-block' }}>
          <img src={qrUrl} alt={`QR code to join course`} width={size} height={size} style={{ borderRadius: '8px' }} />
        </div>

        {/* Join Code display */}
        <div style={{ marginTop: '16px', fontSize: '28px', fontWeight: 800, color: 'var(--orange)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em' }}>{value}</div>
        <p style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '4px' }}>Join Code</p>

        {/* Join Link — clickable */}
        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-100)', wordBreak: 'break-all' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Join Link</p>
          <a href={joinLink} style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600, fontFamily: 'DM Mono, monospace', textDecoration: 'none', wordBreak: 'break-all' }}>
            {joinLink}
          </a>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button onClick={() => copyToClipboard(joinLink, 'link')}
            style={{ flex: 1, padding: '11px', background: copied === 'link' ? 'var(--green)' : 'var(--orange)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-orange)', transition: 'all 0.2s' }}>
            {copied === 'link' ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
          <button onClick={() => copyToClipboard(value, 'code')}
            style={{ flex: 1, padding: '11px', background: copied === 'code' ? 'var(--green)' : 'var(--gray-100)', color: copied === 'code' ? 'white' : 'var(--gray-700)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, border: 'none', transition: 'all 0.2s' }}>
            {copied === 'code' ? '✓ Copied!' : '📋 Copy Code'}
          </button>
        </div>
      </div>
    </div></div>
  );
}

const ov = { position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const card = { background: 'var(--white)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' };
