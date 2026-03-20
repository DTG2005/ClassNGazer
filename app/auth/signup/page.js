'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '../../services/authService';

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isGoogleFlow = searchParams.get('google') === 'true';

  const [form, setForm] = useState({
    name: searchParams.get('name') || '',
    email: searchParams.get('email') || '',
    password: '', confirmPassword: '', role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    if (!isGoogleFlow && form.password !== form.confirmPassword) { setError('Passwords do not match.'); setLoading(false); return; }

    try {
      if (isGoogleFlow) {
        // State: Awaiting Registration → registerUser() → Registered
        await authService.registerUser({
          uid: searchParams.get('uid'), name: form.name,
          email: form.email, role: form.role, profilePic: null,
        });
      } else {
        await authService.signUp({ name: form.name, email: form.email, password: form.password, role: form.role });
      }
      setSuccess(true);
      setTimeout(() => router.push(form.role === 'professor' ? '/professor/create-poll' : '/student/join'), 2000);
    } catch (err) {
      setError(err.message?.includes('email-already-in-use') ? 'Account already exists.' : err.message);
    } finally { setLoading(false); }
  };

  if (success) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="text-center"><div className="text-5xl mb-4">✅</div><h2 className="text-2xl font-bold mb-2">Account Created!</h2>
        {isGoogleFlow ? <p className="text-gray-600">Redirecting...</p> : <p className="text-gray-600">Verification email sent to <strong>{form.email}</strong></p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold"><span className="text-blue-600">Class</span>NGazer</h1>
          <p className="text-gray-600 mt-2">{isGoogleFlow ? 'Complete your profile' : 'Create your account'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSignUp} className="space-y-5">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading} autoFocus /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="yourname@iiti.ac.in" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required disabled={loading || isGoogleFlow} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                {['student', 'professor'].map(role => (
                  <button key={role} type="button" onClick={() => setForm({ ...form, role })}
                    className={`py-3 rounded-lg font-medium text-sm capitalize border-2 transition-all ${form.role === role ? (role === 'student' ? 'border-green-500 bg-green-50 text-green-800' : 'border-blue-500 bg-blue-50 text-blue-800') : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {role === 'student' ? '🎓 Student' : '👨‍🏫 Professor'}
                  </button>
                ))}
              </div>
            </div>
            {!isGoogleFlow && (<>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters" className="w-full px-4 py-3 border border-gray-300 rounded-lg" required minLength={6} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Re-enter password" className="w-full px-4 py-3 border border-gray-300 rounded-lg" required minLength={6} /></div>
            </>)}
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">{error}</p></div>}
            <button type="submit" disabled={loading} className={`w-full py-3 rounded-lg font-semibold text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? 'Creating...' : isGoogleFlow ? 'Complete Setup' : 'Sign Up'}
            </button>
          </form>
          {!isGoogleFlow && <div className="mt-6 text-center"><p className="text-sm text-gray-600">Already have an account? <Link href="/auth/signin" className="text-blue-600 font-medium">Sign In</Link></p></div>}
        </div>
      </div>
    </div>
  );
}