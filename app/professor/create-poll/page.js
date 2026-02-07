'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pollDatabase } from '../../services/pollDatabase';

export default function CreatePollPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correctOption: 0,
    timer: 60,
    courseId: 'CS310', // Default for testing
    courseName: 'Software Engineering'
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    // Validate
    if (!formData.question.trim()) {
      alert('Please enter a question');
      setLoading(false);
      return;
    }
    
    if (formData.options.some(opt => !opt.trim())) {
      alert('Please fill all options');
      setLoading(false);
      return;
    }

    try {
      // Create poll object
      const pollData = {
        question: formData.question.trim(),
        options: formData.options.map(opt => opt.trim()),
        correctOption: formData.correctOption,
        timer: formData.timer,
        courseId: formData.courseId,
        courseName: formData.courseName,
        professorId: 'demo-professor-123', // Hardcoded for now
        professorName: 'Demo Professor',
        status: 'draft'
      };

      // Save to database
      const pollId = await pollDatabase.createPoll(pollData);
      
      setSuccess(true);
      alert(`✅ Poll created successfully! ID: ${pollId}`);
      
      // Reset form
      setFormData({
        question: '',
        options: ['', '', '', ''],
        correctOption: 0,
        timer: 60,
        courseId: 'CS310',
        courseName: 'Software Engineering'
      });
      
      // Optional: Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/professor/view-polls`);
      }, 2000);

    } catch (error) {
      console.error('Error creating poll:', error);
      alert(`❌ Failed to create poll: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Poll</h1>
          <p className="text-gray-600 mt-2">Create interactive polls for your classroom</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">✅ Poll created successfully!</p>
            <p className="text-green-700 text-sm mt-1">Redirecting to polls list...</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poll Question *
              </label>
              <textarea
                value={formData.question}
                onChange={(e) => setFormData({...formData, question: e.target.value})}
                placeholder="Enter your question here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-32"
                required
                disabled={loading}
              />
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Options (Select correct answer with radio button) *
              </label>
              <div className="space-y-3">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={formData.correctOption === index}
                      onChange={() => setFormData({...formData, correctOption: index})}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={loading}
                    />
                    <span className="text-sm text-gray-500 w-8 text-center">
                      {String.fromCharCode(65 + index)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Time Limit
                </label>
                <span className="text-lg font-semibold text-blue-600">
                  {formData.timer} seconds
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                value={formData.timer}
                onChange={(e) => setFormData({...formData, timer: parseInt(e.target.value)})}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={loading}
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>10s (Quick)</span>
                <span>150s (Standard)</span>
                <span>300s (Extended)</span>
              </div>
            </div>

            {/* Course Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course ID
                </label>
                <input
                  type="text"
                  value={formData.courseId}
                  onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name
                </label>
                <input
                  type="text"
                  value={formData.courseName}
                  onChange={(e) => setFormData({...formData, courseName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating Poll...
                  </span>
                ) : (
                  'Create Poll'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Demo Note */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-2">📝 Demo Mode</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Polls are saved to Firebase Firestore</li>
            <li>• Professor ID is hardcoded as "demo-professor-123"</li>
            <li>• Check Firebase Console to see your created polls</li>
            <li>• After creation, you'll be redirected to view all polls</li>
          </ul>
        </div>
      </div>
    </div>
  );
}