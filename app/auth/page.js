'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../services/authService';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // signin | signup | pickrole
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleUser, setGoogleUser] = useState(null);

  const go = () => router.replace('/dashboard');

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try {
      const user = await authService.googleSignIn();
      if (user.isNewUser) { setGoogleUser(user); setName(user.name || ''); setEmail(user.email || ''); setMode('pickrole'); }
      else go();
    } catch (e) {
  setError(e.message || 'Google sign-in failed.');
}// setError(e.message?.includes('@iiti') ? e.message : 'Google sign-in failed. Use @iiti.ac.in.'); }
    setLoading(false);
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await authService.signIn(email, password); go(); }
    catch (err) { setError(err.message?.includes('invalid') ? 'Wrong email or password.' : err.message?.includes('@iiti') ? err.message : 'Sign in failed.'); }
    setLoading(false);
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { await authService.signUp({ name, email, password, role }); go(); }
    catch (err) { setError(err.message?.includes('already') ? 'Account exists. Sign in instead.' : err.message); }
    setLoading(false);
  };

  const handlePickRole = async () => {
    setLoading(true); setError('');
    try {
      await authService.registerUser({ uid: googleUser.uid, name, email: googleUser.email, role, profilePic: googleUser.profilePic });
      go();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  // ── Pick Role screen (after Google sign-in for new user) ──
  if (mode === 'pickrole') return (
    <div style={S.page}><div style={S.card}>
      <div style={S.logoWrap}><span style={S.logoDot}>●</span><span style={S.logoText}>ClassNGazer</span></div>
      <h2 style={S.title}>Welcome, {name.split(' ')[0]}!</h2>
      <p style={S.sub}>Select your role to continue</p>
      <div style={{ display: 'flex', gap: '12px', margin: '20px 0' }}>
        {['student', 'professor'].map(r => (
          <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: '16px', borderRadius: 'var(--radius-md)', border: `2px solid ${role === r ? 'var(--orange)' : 'var(--gray-100)'}`, background: role === r ? 'var(--orange-pale)' : 'var(--gray-50)', textAlign: 'center', transition: 'all 0.15s' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>{r === 'student' ? '🎓' : '👨‍🏫'}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: role === r ? 'var(--orange)' : 'var(--gray-600)', textTransform: 'capitalize' }}>{r}</div>
          </button>
        ))}
      </div>
      {error && <div style={S.err}>{error}</div>}
      <button onClick={handlePickRole} disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}>{loading ? 'Setting up...' : 'Continue'}</button>
    </div></div>
  );

  return (
    <div style={S.page}><div style={S.card}>
      <div style={S.logoWrap}><span style={S.logoDot}>●</span><span style={S.logoText}>ClassNGazer</span></div>
      <h2 style={S.title}>{mode === 'signin' ? 'Welcome back' : 'Create account'}</h2>
      <p style={S.sub}>{mode === 'signin' ? 'Sign in with your IITI account' : 'Join with your @iiti.ac.in email'}</p>

      {/* Google button */}
      <button onClick={handleGoogle} disabled={loading} style={S.googleBtn}>
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        <span>Sign in with Google</span>
      </button>

      <div style={S.divider}><span style={S.divText}>or use email</span></div>

      {/* Email form */}
      <form onSubmit={mode === 'signin' ? handleEmailSignIn : handleEmailSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mode === 'signup' && <>
          <input style={S.input} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
          <div style={{ display: 'flex', gap: '8px' }}>
            {['student', 'professor'].map(r => (
              <button key={r} type="button" onClick={() => setRole(r)} style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: `2px solid ${role === r ? 'var(--orange)' : 'var(--gray-100)'}`, background: role === r ? 'var(--orange-pale)' : 'transparent', fontSize: '12px', fontWeight: 700, color: role === r ? 'var(--orange)' : 'var(--gray-600)', textTransform: 'capitalize' }}>{r === 'student' ? '🎓 ' : '👨‍🏫 '}{r}</button>
            ))}
          </div>
        </>}
        <input style={S.input} type="email" placeholder="yourname@iiti.ac.in" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} required />
        <input style={S.input} type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} required minLength={6} />
        {error && <div style={S.err}>{error}</div>}
        <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}>{loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}</button>
      </form>

      <p style={S.toggle}>
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }} style={S.toggleBtn}>
          {mode === 'signin' ? 'Sign Up' : 'Sign In'}
        </button>
      </p>
      <p style={{ fontSize: '11px', color: 'var(--gray-400)', textAlign: 'center', marginTop: '12px' }}>Only @iiti.ac.in emails are supported</p>
    </div></div>
  );
}

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--off-white)' },
  card: { width: '100%', maxWidth: '400px', background: 'var(--white)', borderRadius: 'var(--radius-xl)', padding: '36px 32px', boxShadow: 'var(--shadow-lg)' },
  logoWrap: { textAlign: 'center', marginBottom: '24px' },
  logoDot: { color: 'var(--orange)', fontSize: '22px', marginRight: '2px' },
  logoText: { fontSize: '22px', fontWeight: 800, color: 'var(--ink)' },
  title: { fontSize: '20px', fontWeight: 800, color: 'var(--ink)', textAlign: 'center' },
  sub: { fontSize: '13px', color: 'var(--gray-400)', textAlign: 'center', marginTop: '4px', marginBottom: '24px' },
  googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', border: '2px solid var(--gray-100)', borderRadius: 'var(--radius-md)', background: 'var(--white)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', transition: 'border-color 0.15s' },
  divider: { display: 'flex', alignItems: 'center', margin: '20px 0', gap: '12px' },
  divText: { fontSize: '12px', color: 'var(--gray-400)', whiteSpace: 'nowrap' },
  input: { width: '100%', padding: '12px 14px', border: '2px solid var(--gray-100)', borderRadius: 'var(--radius-md)', fontSize: '14px', background: 'var(--gray-50)', color: 'var(--ink)' },
  btn: { width: '100%', padding: '13px', background: 'var(--orange)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-orange)', marginTop: '4px' },
  err: { padding: '10px 14px', background: 'var(--red-pale)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#B91C1C' },
  toggle: { textAlign: 'center', fontSize: '13px', color: 'var(--gray-400)', marginTop: '20px' },
  toggleBtn: { background: 'none', border: 'none', color: 'var(--orange)', fontWeight: 700, fontSize: '13px' },
};