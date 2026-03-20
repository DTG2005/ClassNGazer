'use client';
import Link from 'next/link';
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-5xl font-extrabold"><span className="text-blue-600">Class</span>NGazer</h1>
        <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">Real-time classroom polling for IIT Indore</p>
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-shadow">
          <div className="bg-blue-600 px-6 py-5"><div className="flex items-center space-x-3"><span className="text-3xl">👨‍🏫</span><div><h2 className="text-xl font-bold text-white">Professor</h2><p className="text-blue-200 text-sm">Create and manage polls</p></div></div></div>
          <div className="p-6 space-y-4"><Link href="/professor/create-poll" className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-xl font-semibold">Create a Poll</Link><Link href="/professor/view-polls" className="block w-full py-2.5 border border-gray-300 text-gray-700 text-center rounded-xl font-medium hover:bg-gray-50">Manage Polls</Link></div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-shadow">
          <div className="bg-green-600 px-6 py-5"><div className="flex items-center space-x-3"><span className="text-3xl">🎓</span><div><h2 className="text-xl font-bold text-white">Student</h2><p className="text-green-200 text-sm">Join and answer polls</p></div></div></div>
          <div className="p-6"><Link href="/student/join" className="block w-full py-3 bg-green-600 hover:bg-green-700 text-white text-center rounded-xl font-semibold">Join a Poll</Link></div>
        </div>
      </div>
      <div className="text-center pb-8"><Link href="/auth/signin" className="text-blue-600 font-medium text-sm">Sign In →</Link><span className="mx-3 text-gray-300">|</span><Link href="/auth/signup" className="text-blue-600 font-medium text-sm">Create Account →</Link></div>
    </div>
  );
}