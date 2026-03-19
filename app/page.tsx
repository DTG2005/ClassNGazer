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
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
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
            <div className="mt-12 bg-gradient-to-r from-orange-50 to-green-50 rounded-2xl p-8">
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

        {activeTab === 'scheduled' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Scheduled Polls</h2>
              <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                <Plus size={20} />
                Create Poll
              </button>
            </div>

            <div className="grid gap-6">
              {scheduledPolls.map((poll) => (
                <div key={poll.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-8 border-t-4 border-blue-400 cursor-pointer group">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition">{poll.title}</h3>
                        <span className="px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-blue-700 whitespace-nowrap">
                          Scheduled
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="flex items-center gap-3">
                          <Clock size={20} className="text-blue-500" />
                          <div>
                            <p className="text-sm text-gray-600">Scheduled Time</p>
                            <p className="font-semibold text-gray-900">{poll.scheduledDate}</p>
                            <p className="font-semibold text-gray-900">{poll.scheduledTime}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-orange-700">📚</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Course</p>
                            <p className="font-semibold text-gray-900">{poll.courseCode}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Settings size={20} className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <p className="font-semibold text-gray-900">Ready to Activate</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition">
                        Edit
                      </button>
                      <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition">
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      Reminder will be sent 5 minutes before activation time
                    </div>
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                      <Settings size={16} />
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Completed Polls</h2>
              <div className="flex gap-4">
                <select className="px-4 py-2 border border-gray-300 rounded-lg">
                  <option>All Courses</option>
                  <option>CSE201</option>
                  <option>CSE301</option>
                </select>
                <select className="px-4 py-2 border border-gray-300 rounded-lg">
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                  <option>Today</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6">
              {completedPolls.map((poll) => (
                <div key={poll.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow p-8 border-t-4 border-green-400">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-2xl font-bold text-gray-900">{poll.title}</h3>
                        <span className="px-4 py-2 rounded-full text-sm font-bold bg-green-100 text-green-700 whitespace-nowrap">
                          Completed
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600">{poll.progress}%</p>
                          <p className="text-sm text-gray-600">Response Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-gray-900">{poll.responses}</p>
                          <p className="text-sm text-gray-600">Total Responses</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-gray-900">{poll.participants}</p>
                          <p className="text-sm text-gray-600">Participants</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-orange-600">{poll.courseCode}</p>
                          <p className="text-sm text-gray-600">Course</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Response Progress</span>
                          <span className="text-sm font-bold text-green-600">{poll.progress}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 rounded-full transition-all duration-500"
                            style={{ width: `${poll.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                    <div className="flex gap-4">
                      <button className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition">
                        <BarChart3 size={16} />
                        View Results
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition">
                        <Settings size={16} />
                        Export Data
                      </button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition">
                      <ChevronRight size={16} />
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h2>
              <div className="flex gap-4">
                <select className="px-4 py-2 border border-gray-300 rounded-lg">
                  <option>Last 30 days</option>
                  <option>Last 7 days</option>
                  <option>Last 90 days</option>
                </select>
                <select className="px-4 py-2 border border-gray-300 rounded-lg">
                  <option>All Courses</option>
                  <option>CSE201</option>
                  <option>CSE301</option>
                </select>
              </div>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-purple-400">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Average Response Rate</h3>
                  <TrendingUp size={24} className="text-purple-500" />
                </div>
                <p className="text-4xl font-bold text-purple-600 mb-2">78%</p>
                <p className="text-sm text-gray-600">+5% from last month</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-blue-400">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Most Active Course</h3>
                  <BarChart3 size={24} className="text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-2">CSE201</p>
                <p className="text-sm text-gray-600">156 total responses</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-md border-t-4 border-green-400">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Peak Engagement Time</h3>
                  <Clock size={24} className="text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600 mb-2">2:00 PM</p>
                <p className="text-sm text-gray-600">Highest response rate</p>
              </div>
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Response Trends</h3>
                <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 size={48} className="text-blue-400 mx-auto mb-4" />
                    <p className="text-gray-600">Response trend chart would appear here</p>
                    <p className="text-sm text-gray-500 mt-2">Showing daily response patterns</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-md">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Course Performance</h3>
                <div className="h-64 bg-gradient-to-br from-green-50 to-orange-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp size={48} className="text-green-400 mx-auto mb-4" />
                    <p className="text-gray-600">Course performance chart would appear here</p>
                    <p className="text-sm text-gray-500 mt-2">Comparing response rates across courses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white rounded-2xl p-8 shadow-md">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <BarChart3 size={20} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Poll "Assignment Difficulty" completed</p>
                    <p className="text-sm text-gray-600">98 responses collected • 89% response rate</p>
                  </div>
                  <span className="text-sm text-gray-500">2 hours ago</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Plus size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">New poll scheduled</p>
                    <p className="text-sm text-gray-600">"Lecture Pace Feedback" for CSE201</p>
                  </div>
                  <span className="text-sm text-gray-500">1 day ago</span>
                </div>
              </div>
            </div>
          </div>
        )}
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
