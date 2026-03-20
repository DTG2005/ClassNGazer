'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (p) => pathname === p;
  const isSection = (prefix) => pathname.startsWith(prefix);

  if (pathname.startsWith('/auth/') || pathname.startsWith('/professor/blackboard')) return null;

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold tracking-tight"><span className="text-blue-400">Class</span>NGazer</Link>
          <div className="hidden md:flex items-center space-x-1">
            <div className="relative group">
              <button className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSection('/professor') ? 'text-white bg-gray-800' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>Professor ▾</button>
              <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link href="/professor/create-poll" className={`block px-4 py-2.5 text-sm first:rounded-t-lg ${isActive('/professor/create-poll') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Create Poll</Link>
                <Link href="/professor/view-polls" className={`block px-4 py-2.5 text-sm last:rounded-b-lg ${isActive('/professor/view-polls') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Manage Polls</Link>
              </div>
            </div>
            <div className="relative group">
              <button className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isSection('/student') ? 'text-white bg-gray-800' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>Student ▾</button>
              <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link href="/student/join" className={`block px-4 py-2.5 text-sm rounded-lg ${isActive('/student/join') ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Join Poll</Link>
              </div>
            </div>
            <Link href="/test/db" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive('/test/db') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}>Test DB</Link>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/auth/signin" className="px-3 py-1.5 text-gray-400 hover:text-white text-xs font-medium">Sign In</Link>
            <Link href="/professor/create-poll" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full">Professor</Link>
            <Link href="/student/join" className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-full">Student</Link>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-800">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}</svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase px-3 pt-2">Professor</div>
            <Link href="/professor/create-poll" onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg text-sm ${isActive('/professor/create-poll') ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>Create Poll</Link>
            <Link href="/professor/view-polls" onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg text-sm ${isActive('/professor/view-polls') ? 'bg-blue-600 text-white' : 'text-gray-300'}`}>Manage Polls</Link>
            <div className="text-xs font-semibold text-gray-500 uppercase px-3 pt-3">Student</div>
            <Link href="/student/join" onClick={() => setMobileOpen(false)} className={`block px-3 py-2 rounded-lg text-sm ${isActive('/student/join') ? 'bg-green-600 text-white' : 'text-gray-300'}`}>Join Poll</Link>
            <div className="border-t border-gray-700 mt-3 pt-3">
              <Link href="/test/db" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gray-300">Test DB</Link>
              <Link href="/auth/signin" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gray-300">Sign In</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}