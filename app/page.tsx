'use client';

import React, { useState } from 'react';
import { BarChart3, Users, TrendingUp, Clock, ChevronRight, Plus, Settings } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const userName = 'Vinay Kumar Gupta';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
      {/* Header with Ashoka Chakra inspired pattern */}
      <header className="relative border-b-4 border-orange-400 bg-white shadow-lg">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-white to-green-400"></div>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="text-lg font-bold text-gray-900">{userName}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg text-white font-bold text-lg">
                VKG
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

      {/* Stats Cards */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="relative group bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden border-l-4"
                style={{ borderLeftColor: stat.color }}
              >
                {/* Decorative pattern */}
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

        {/* Scheduled Polls Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Scheduled Polls</h2>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300">
              <Plus size={20} />
              Create Poll
            </button>
          </div>

          <div className="grid gap-6">
            {scheduledPolls.map((poll) => (
              <div key={poll.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-6 border-t-4 border-blue-400 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">{poll.title}</h3>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 whitespace-nowrap">
                        Scheduled
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-blue-500" />
                        <span className="text-gray-600">{poll.scheduledDate} at {poll.scheduledTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">{poll.courseCode}</span>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 group-hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed Polls Section */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Completed Polls</h2>
          <div className="grid gap-6">
            {completedPolls.map((poll) => (
              <div key={poll.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-6 border-t-4 border-green-400 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition">{poll.title}</h3>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 whitespace-nowrap">
                        Completed
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-green-500" />
                        <span className="text-gray-600">{poll.participants} participants</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-green-600" />
                        <span className="text-gray-600">{poll.responses} responses</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-2">Response Rate</p>
                    <p className="text-2xl font-bold text-green-600">{poll.progress}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with decorative pattern */}
      <footer className="mt-20 border-t-4 border-orange-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">
              © 2026 ClassPoll | Empowering Academic Feedback
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
