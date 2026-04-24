'use client';

export default function QRCode({ value, size = 200, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

  return (
    <div style={ov} onClick={onClose}><div style={card} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 24px 16px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>Join Code</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '2px' }}>Students scan to join</div>
        </div>
        <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>✕</button>
      </div>
      <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '24px', border: '2px solid var(--gray-100)', display: 'inline-block' }}>
          <img src={qrUrl} alt={`QR code for ${value}`} width={size} height={size} style={{ borderRadius: '8px' }} />
        </div>
        <div style={{ marginTop: '16px', fontSize: '32px', fontWeight: 800, color: 'var(--orange)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em' }}>{value}</div>
        <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '8px' }}>Share this code or QR with students</p>
        <button onClick={() => { navigator.clipboard.writeText(value); }}
          style={{ marginTop: '12px', padding: '10px 24px', background: 'var(--orange)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-orange)' }}>
          Copy Code
        </button>
      </div>
    </div></div>
  );
}

const ov = { position: 'fixed', inset: 0, background: 'rgba(26,25,23,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const card = { background: 'var(--white)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '380px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' };