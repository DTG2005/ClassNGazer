'use client';
import { useEffect, useState } from 'react';
import { authService } from './services/authService';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = authService.onAuthChange((user) => {
      if (user && !user.isNewUser) router.replace('/dashboard');
      else router.replace('/auth');
      setChecking(false);
    });
    return () => unsub();
  }, []);

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--ink)' }}><span style={{ color: 'var(--orange)' }}>●</span> ClassNGazer</div>
        <p style={{ color: 'var(--gray-400)', marginTop: '8px', fontSize: '13px' }}>Loading...</p>
      </div>
    </div>
  );
  return null;
}