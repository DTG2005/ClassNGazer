'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold">
            ClassNGazer
          </Link>
          
          {/* Navigation Links */}
          <div className="flex space-x-6">
            <Link 
              href="/test/db" 
              className={`hover:text-blue-300 ${pathname === '/test/db' ? 'text-blue-400' : ''}`}
            >
              Test DB
            </Link>
            <Link 
              href="/professor/create-poll" 
              className={`hover:text-blue-300 ${pathname === '/professor/create-poll' ? 'text-blue-400' : ''}`}
            >
              Create Poll
            </Link>
            <Link 
              href="/professor/view-polls" 
              className={`hover:text-blue-300 ${pathname === '/professor/view-polls' ? 'text-blue-400' : ''}`}
            >
              View Polls
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}