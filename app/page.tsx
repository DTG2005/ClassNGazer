'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, TrendingUp, Clock, ChevronRight, Plus, Settings, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [router, setRouterObj] = React.useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const routerObj = useRouter();

  // Example data - replace with real data from your database
  const scheduledPolls = [
    {
      id: 1,
      title: 'Course Difficulty Level',
      scheduledDate: '2026-02-10',
      scheduledTime: '10:00 AM',
      status: 'scheduled',
      courseCode: 'CSE201',
    },
    {
      id: 2,
      title: 'Lecture Pace Feedback',
      scheduledDate: '2026-02-12',
      scheduledTime: '02:30 PM',
      status: 'scheduled',
      courseCode: 'CSE201',
    },
  ];

  const completedPolls = [
    {
      id: 3,
      title: 'Preferred Study Materials',
      responses: 112,
      progress: 67,
      status: 'completed',
      participants: 167,
      courseCode: 'CSE201',
    },
    {
      id: 4,
      title: 'Assignment Difficulty',
      responses: 98,
      progress: 89,
      status: 'completed',
      participants: 110,
      courseCode: 'CSE201',
    },
  ];

  const stats = [
    { label: 'Total Polls', value: '24', icon: BarChart3, color: '#FF9933' },
    { label: 'Scheduled Polls', value: '5', icon: Clock, color: '#138808' },
    { label: 'Completed Polls', value: '19', icon: TrendingUp, color: '#1F77D4' },
    { label: 'Total Responses', value: '2,340', icon: Users, color: '#FFA500' },
  ];

  useEffect(() => {
    // Check if user is logged in and get their data
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // User not logged in, redirect to login
        routerObj.push('/login');
        return;
      }

      try {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            ...userDoc.data(),
          });
        } else {
          // If no user doc, create basic user info
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            fullName: user.displayName || 'User',
            role: 'student',
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || 'User',
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [routerObj]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      routerObj.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Please log in first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Header */}
      <header className="relative border-b-4 border-orange-400 bg-white shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-white to-green-400"></div>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg">
                <div className="text-white text-xl font-bold">🗳️</div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-red-600 to-green-600">
                  ClassNGazer
                </h1>
                <p className="text-sm text-gray-600 mt-1">Academic Feedback Platform</p>
              </div>
            </div>

            {/* User Info + Logout + Avatar */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="text-lg font-bold text-gray-900">
                  {currentUser?.fullName || currentUser?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentUser?.role ? `Role: ${currentUser.role.toUpperCase()}` : ''}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <LogOut size={18} />
                Logout
              </button>

              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg text-white font-bold text-lg">
                {currentUser?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b-2 border-orange-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-8">
            {['overview', 'scheduled', 'completed', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 font-semibold capitalize text-sm transition-all duration-300 border-b-4 ${
                  activeTab === tab
                    ? 'text-orange-600 border-orange-500'
                    : 'text-gray-600 border-transparent hover:text-orange-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="relative group bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden border-l-4"
                    style={{ borderLeftColor: stat.color }}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 opacity-5" style={{ backgroundColor: stat.color }}>
                      <div className="w-full h-full transform rotate-45"></div>
                    </div>

                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium mb-2">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
                        <Icon size={24} style={{ color: stat.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Overview Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Scheduled Polls Overview */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Upcoming Polls</h2>
                  <button
                    onClick={() => setActiveTab('scheduled')}
                    className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1"
                  >
                    View All <ChevronRight size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  {scheduledPolls.slice(0, 3).map((poll) => (
                    <div key={poll.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border-l-4 border-blue-400">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{poll.title}</h4>
                          <p className="text-sm text-gray-600">{poll.scheduledDate} at {poll.scheduledTime}</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {poll.courseCode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completed Polls Overview */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Recent Results</h2>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className="text-green-600 font-semibold hover:text-green-700 flex items-center gap-1"
                  >
                    View All <ChevronRight size={16} />
                  </button>
                </div>
                <div className="space-y-4">
                  {completedPolls.slice(0, 3).map((poll) => (
                    <div key={poll.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border-l-4 border-green-400">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{poll.title}</h4>
                          <p className="text-sm text-gray-600">{poll.responses} responses • {poll.progress}% rate</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-green-600">{poll.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-12 bg-gradient-to-r from-orange-50 to-green-50 rounded-2xl p-8 border border-orange-200">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to create your next poll?</h3>
                <p className="text-gray-600 mb-6">Schedule polls in advance and get real-time feedback during your lectures.</p>
                <button className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300 mx-auto">
                  <Plus size={20} />
                  Create New Poll
                </button>
              </div>
            </div>
          </>
        )}

        {/* Scheduled Polls Tab */}
        {activeTab === 'scheduled' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Scheduled Polls</h2>
            <div className="grid gap-6">
              {scheduledPolls.map((poll) => (
                <div key={poll.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-400 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{poll.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{poll.courseCode}</p>
                    </div>
                    <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold">
                      {poll.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-8 text-sm text-gray-600">
                    <span>📅 {poll.scheduledDate}</span>
                    <span>⏰ {poll.scheduledTime}</span>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button className="px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors">
                      Edit
                    </button>
                    <button className="px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Polls Tab */}
        {activeTab === 'completed' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Completed Polls</h2>
            <div className="grid gap-6">
              {completedPolls.map((poll) => (
                <div key={poll.id} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-400 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{poll.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{poll.courseCode}</p>
                    </div>
                    <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold">
                      {poll.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-8 text-sm text-gray-600 mb-4">
                    <span>📊 {poll.responses} responses</span>
                    <span>👥 {poll.participants} participants</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${poll.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{poll.progress}% completion rate</p>
                  <button className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                    View Results
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Response Rate Over Time</h3>
                <div className="h-64 bg-gradient-to-br from-orange-50 to-pink-50 rounded-lg flex items-center justify-center text-gray-500">
                  Chart coming soon...
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Poll Categories</h3>
                <div className="h-64 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg flex items-center justify-center text-gray-500">
                  Chart coming soon...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-20 border-t-4 border-orange-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">
              © 2026 ClassNGazer | Empowering Academic Feedback
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-gray-600 hover:text-orange-600 text-sm">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-600 hover:text-orange-600 text-sm">
                Terms of Service
              </a>
              <a href="#" className="text-gray-600 hover:text-orange-600 text-sm">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
