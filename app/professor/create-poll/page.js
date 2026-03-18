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
    courseId: 'CS310',
    courseName: 'Software Engineering',
  });

  const [loading, setLoading] = useState(false);

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    if (formData.options.length >= 6) return;
    setFormData({ ...formData, options: [...formData.options, ''] });
  };

  const removeOption = (index) => {
    if (formData.options.length <= 2) return;
    const newOptions = formData.options.filter((_, i) => i !== index);
    let newCorrect = formData.correctOption;
    if (index === formData.correctOption) newCorrect = 0;
    else if (index < formData.correctOption) newCorrect--;
    setFormData({ ...formData, options: newOptions, correctOption: newCorrect });
  };

  // ── PRIMARY: Create poll and immediately go live ──
  const handleCreateAndStart = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.question.trim()) {
      alert('Please enter a question');
      setLoading(false);
      return;
    }
    if (formData.options.some((opt) => !opt.trim())) {
      alert('Please fill all options');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create the poll (saved as draft first)
      const pollData = {
        question: formData.question.trim(),
        options: formData.options.map((opt) => opt.trim()),
        correctOption: formData.correctOption,
        timer: formData.timer,
        courseId: formData.courseId,
        courseName: formData.courseName,
        professorId: 'demo-professor-123',
        professorName: 'Demo Professor',
      };

      const pollId = await pollDatabase.createPoll(pollData);

      // Step 2: Immediately start it (draft → active)
      await pollDatabase.updatePollStatus(pollId, 'active');

      alert(`✅ Poll is LIVE! Students can now answer.`);

      // Go to view polls to monitor responses
      router.push(`/professor/view-polls`);
    } catch (error) {
      console.error('Error creating poll:', error);
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── SECONDARY: Save as draft for later ──
  const handleSaveDraft = async () => {
    setLoading(true);

    if (!formData.question.trim()) {
      alert('Please enter a question');
      setLoading(false);
      return;
    }
    if (formData.options.some((opt) => !opt.trim())) {
      alert('Please fill all options');
      setLoading(false);
      return;
    }

    try {
      const pollData = {
        question: formData.question.trim(),
        options: formData.options.map((opt) => opt.trim()),
        correctOption: formData.correctOption,
        timer: formData.timer,
        courseId: formData.courseId,
        courseName: formData.courseName,
        professorId: 'demo-professor-123',
        professorName: 'Demo Professor',
      };

      await pollDatabase.createPoll(pollData);
      alert(`📝 Poll saved as draft. You can start it later from "Manage Polls".`);

      // Reset form for next question
      setFormData({
        question: '',
        options: ['', '', '', ''],
        correctOption: 0,
        timer: 60,
        courseId: formData.courseId,
        courseName: formData.courseName,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      alert(`❌ Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Poll</h1>
          <p className="text-gray-600 mt-2">
            Type your question, add options, and launch it to the class
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <form onSubmit={handleCreateAndStart} className="space-y-6">

            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question *
              </label>
              <textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Type your question here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-28 text-lg"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Options * <span className="text-gray-400 font-normal">(tap the letter to mark correct answer)</span>
              </label>
              <div className="space-y-3">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    {/* Correct answer selector */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, correctOption: index })}
                      disabled={loading}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all shrink-0 ${
                        formData.correctOption === index
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-gray-300 text-gray-500 hover:border-green-400'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </button>

                    {/* Option text */}
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className={`flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base ${
                        formData.correctOption === index
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300'
                      }`}
                      required
                      disabled={loading}
                    />

                    {/* Remove */}
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-gray-400 hover:text-red-500 text-xl leading-none shrink-0"
                        disabled={loading}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {formData.options.length < 6 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  disabled={loading}
                >
                  + Add Option
                </button>
              )}

              <p className="mt-2 text-xs text-green-600">
                ✓ Correct answer: Option {String.fromCharCode(65 + formData.correctOption)}
              </p>
            </div>

            {/* Timer */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Time Limit
                </label>
                <div className="flex items-center space-x-2">
                  {[30, 60, 90, 120].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, timer: t })}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        formData.timer === t
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                value={formData.timer}
                onChange={(e) => setFormData({ ...formData, timer: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>10s</span>
                <span className="text-base font-semibold text-blue-600">{formData.timer}s</span>
                <span>300s</span>
              </div>
            </div>

            {/* Course Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course ID</label>
                <input
                  type="text"
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
                <input
                  type="text"
                  value={formData.courseName}
                  onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled={loading}
                />
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="pt-4 space-y-3">
              {/* Main button: Create & Launch */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-4 rounded-lg font-semibold text-white text-lg transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Launching...
                  </span>
                ) : (
                  '🚀 Create & Go Live'
                )}
              </button>

              {/* Secondary: Save as draft */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                📝 Save as Draft (start later)
              </button>
            </div>
          </form>
        </div>

        {/* How it works */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-medium text-blue-800 mb-2">How it works</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>🚀 Create &amp; Go Live</strong> — Poll is created and immediately shown to students. They can answer on their phones.</p>
            <p><strong>📝 Save as Draft</strong> — Poll is saved but not shown to students yet. You can start it later from &quot;Manage Polls&quot;.</p>
          </div>
        </div>
      </div>
    </div>
  );
}