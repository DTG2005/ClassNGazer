'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => pathname === path;

  const navLinks = [
    { label: 'Professor', children: [
      { href: '/professor/create-poll', label: 'Create Poll' },
      { href: '/professor/view-polls', label: 'Manage Polls' },
    ]},
    { label: 'Student', children: [
      { href: '/student/join', label: 'Join Poll' },
    ]},
    { href: '/test/db', label: 'Test DB' },
  ];

  return (
    <nav className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-blue-400">Class</span>NGazer
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((item, i) =>
              item.children ? (
                <div key={i} className="relative group">
                  <button className="px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">
                    {item.label} ▾
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-4 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          isActive(child.href)
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
          </div>

          {/* Role indicator badges */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              href="/professor/create-poll"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full transition-colors"
            >
              Professor View
            </Link>
            <Link
              href="/student/join"
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-full transition-colors"
            >
              Student View
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-2">Professor</div>
            <Link href="/professor/create-poll" onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${isActive('/professor/create-poll') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
              Create Poll
            </Link>
            <Link href="/professor/view-polls" onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${isActive('/professor/view-polls') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
              Manage Polls
            </Link>

            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 pt-3">Student</div>
            <Link href="/student/join" onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${isActive('/student/join') ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
              Join Poll
            </Link>

            <div className="border-t border-gray-700 mt-3 pt-3">
              <Link href="/test/db" onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm ${isActive('/test/db') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
                Test DB
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}