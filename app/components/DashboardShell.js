'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';

function NavItem({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm w-full text-left mb-0.5 transition-colors ${
        active ? 'bg-[#F5A623] text-[#1a2744] font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white/90'
      }`}>
      {label}
    </button>
  );
}

export default function DashboardShell({ 
  role, 
  user, 
  activeMenu, 
  onCreateCourse, 
  onJoinCourse, 
  headerTitle, 
  headerSubtitle, 
  headerAction, 
  children 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const firstName = user?.displayName?.split(' ')[0] || (role === 'teacher' ? 'Teacher' : 'Student');

  const sidebarContent = (
    <div className="w-56 h-full bg-[#1a2744] flex flex-col flex-shrink-0 shadow-2xl">
      <div className="px-5 py-5 border-b border-white/10 flex justify-between items-center">
        <div>
          <p className="text-white text-lg font-medium tracking-tight">
            <span className="text-[#F5A623]">●</span> ClassNGazer
          </p>
          <p className="text-white/40 text-xs mt-0.5">{role === 'teacher' ? 'Teacher Portal' : 'Student Portal'}</p>
        </div>
        {/* Mobile close button */}
        <button onClick={() => setIsOpen(false)} className="md:hidden text-white/50 hover:text-white pb-6 text-xl">✕</button>
      </div>

      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-3 mb-1.5">Menu</p>
        {role === 'teacher' ? (
          <>
            <NavItem label="Dashboard" active={activeMenu === 'Dashboard'} onClick={() => { setIsOpen(false); router.push('/dashboard'); }} />
            <NavItem label="My Courses" active={activeMenu === 'My Courses'} onClick={() => { setIsOpen(false); router.push('/dashboard/courses'); }} />
            <NavItem label="Active Polls" active={activeMenu === 'Active Polls'} onClick={() => { setIsOpen(false); router.push('/dashboard/polls'); }} />
            <p className="text-white/35 text-[10px] uppercase tracking-widest px-2.5 mt-4 mb-1.5">Manage</p>
            {onCreateCourse && <NavItem label="Create Course" onClick={() => { setIsOpen(false); onCreateCourse(); }} />}
            <NavItem label="Results" active={activeMenu === 'Results'} onClick={() => { setIsOpen(false); router.push('/dashboard/results'); }} />
          </>
        ) : (
          <>
            <NavItem label="My Courses" active={activeMenu === 'My Courses'} onClick={() => { setIsOpen(false); router.push('/dashboard'); }} />
            {onJoinCourse && <NavItem label="Join Course" onClick={() => { setIsOpen(false); onJoinCourse(); }} />}
          </>
        )}
      </nav>

      <div className="px-2.5 py-3.5 border-t border-white/10">
        {role === 'student' && user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-[#F5A623] flex items-center justify-center text-[#1a2744] text-xs font-bold">
              {firstName[0]?.toUpperCase() || 'S'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-xs font-medium truncate">{firstName}</p>
              <p className="text-white/40 text-[10px] truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white/45 text-sm hover:text-red-400 w-full text-left transition-colors">
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsOpen(true)} 
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="overflow-hidden">
              {typeof headerTitle === 'string' ? (
                <p className="text-sm font-medium text-gray-900 truncate">{headerTitle}</p>
              ) : (
                headerTitle
              )}
              {headerSubtitle && (
                <p className="text-xs text-gray-500 truncate">{headerSubtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {headerAction}
            {role === 'teacher' && user && (
              <div className="hidden md:flex items-center gap-3 ml-2 border-l border-gray-200 pl-4">
                <div className="w-8 h-8 rounded-full bg-[#1a2744] flex items-center justify-center text-[#F5A623] text-xs font-medium">
                  {firstName[0]?.toUpperCase() || 'T'}
                </div>
                <span className="text-sm font-medium text-gray-900">{firstName}</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 content-area">
          {children}
        </main>
      </div>
    </div>
  );
}
