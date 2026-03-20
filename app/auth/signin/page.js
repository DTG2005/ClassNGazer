'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../services/authService';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirect = (role) => router.push(role === 'professor' ? '/professor/create-poll' : '/student/join');

  const handleEmailSignIn = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { const user = await authService.signIn(email, password); redirect(user.role); }
    catch (err) { setError(err.message?.includes('invalid-credential') ? 'Incorrect email or password.' : err.message?.includes('@iiti') ? err.message : 'Sign in failed.'); }
    finally { setLoading(false); }
  };

  // Class Diagram: Users.googleSignin()
  const handleGoogleSignIn = async () => {
    setLoading(true); setError('');
    try {
      const user = await authService.googleSignIn();
      if (user.isNewUser) {
        // State: Awaiting Registration — need to pick role
        router.push('/auth/signup?google=true&uid=' + user.uid + '&name=' + encodeURIComponent(user.name) + '&email=' + encodeURIComponent(user.email));
      } else {
        redirect(user.role);
      }
    } catch (err) { setError(err.message?.includes('@iiti') ? err.message : 'Google sign-in failed. Make sure you use your @iiti.ac.in account.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900"><span className="text-blue-600">Class</span>NGazer</h1>
          <p className="text-gray-600 mt-2">Sign in with your IITI account</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Google Sign-in — Primary (from class diagram) */}
          <button onClick={handleGoogleSignIn} disabled={loading}
            className="w-full flex items-center justify-center space-x-3 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-gray-700 transition-colors mb-6">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <span>Sign in with Google</span>
          </button>

          <div className="flex items-center mb-6"><div className="flex-1 border-t border-gray-200"></div><span className="px-4 text-sm text-gray-400">or email</span><div className="flex-1 border-t border-gray-200"></div></div>

          {/* Email/Password Sign-in */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="yourname@iiti.ac.in" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} minLength={6} />
            </div>
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">{error}</p></div>}
            <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-6 text-center"><p className="text-sm text-gray-600">No account? <Link href="/auth/signup" className="text-blue-600 hover:text-blue-800 font-medium">Sign Up</Link></p></div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">Only @iiti.ac.in emails supported</p>
      </div>
    </div>
  );
}