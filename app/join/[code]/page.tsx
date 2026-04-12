// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { joinCourseByJoinCode } from '../../../lib/firestore';

export default function JoinCoursePage() {
  const { code } = useParams();
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | joining | success | error | needsAuth
  const [error, setError] = useState('');
  const [courseName, setCourseName] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Prevents React `setState in effect` synchronous cascade warning
      setTimeout(() => setStatus('needsAuth'), 0);
      return;
    }

    // Auto-join the course
    (async () => {
      setStatus('joining');
      try {
        const course = await joinCourseByJoinCode(code, user.uid);
        setCourseName(course.title || course.courseName || 'the course');
        setStatus('success');
        // Redirect to dashboard after 2 seconds
        setTimeout(() => router.push('/dashboard'), 2500);
      } catch (e) {
        if (e.message?.includes('already enrolled')) {
          setCourseName('');
          setStatus('success');
          setTimeout(() => router.push('/dashboard'), 1500);
        } else {
          setError(e.message || 'Failed to join course.');
          setStatus('error');
        }
      }
    })();
  }, [authLoading, user, code]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--off-white)', fontFamily: 'Sora, sans-serif', padding: '20px' }}>
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-xl)', padding: '40px', maxWidth: '420px', width: '100%', boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          <span style={{ color: 'var(--orange)' }}>●</span> ClassNGazer
        </div>

        {status === 'loading' && (
          <>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--gray-200)', borderTopColor: 'var(--orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '24px auto' }} />
            <p style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Loading...</p>
          </>
        )}

        {status === 'needsAuth' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔑</div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>Sign in to Join</h1>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '8px' }}>
              You need to be signed in to join a course with code:
            </p>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--orange)', fontFamily: 'DM Mono, monospace', letterSpacing: '0.1em', marginBottom: '24px' }}>
              {code}
            </div>
            <button onClick={() => router.push('/auth')}
              style={{ width: '100%', padding: '14px', background: 'var(--orange)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '15px', fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-orange)' }}>
              Sign In →
            </button>
          </>
        )}

        {status === 'joining' && (
          <>
            <div style={{ width: '40px', height: '40px', border: '3px solid var(--gray-200)', borderTopColor: 'var(--orange)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '24px auto' }} />
            <p style={{ color: 'var(--gray-600)', fontSize: '15px', fontWeight: 600 }}>Joining course...</p>
            <p style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '4px' }}>Code: {code}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#15803D', marginBottom: '8px' }}>
              {courseName ? `Joined ${courseName}!` : 'Already enrolled!'}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--red)', marginBottom: '8px' }}>Couldn&apos;t Join</h1>
            <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '20px' }}>{error}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => router.push('/dashboard')}
                style={{ flex: 1, padding: '12px', background: 'var(--gray-100)', color: 'var(--gray-700)', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, border: 'none' }}>
                Dashboard
              </button>
              <button onClick={() => window.location.reload()}
                style={{ flex: 1, padding: '12px', background: 'var(--orange)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-orange)' }}>
                Retry
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
