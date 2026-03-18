'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pollDatabase } from '../../../services/pollDatabase';

export default function StudentPollPage() {
  const { pollId } = useParams();
  const router = useRouter();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [pollEnded, setPollEnded] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const timerRef = useRef(null);
  const unsubRef = useRef(null);

  // Generate a simple student ID (in production this comes from auth)
  const studentId = useRef(`student-${Math.random().toString(36).slice(2, 10)}`).current;
  const studentName = 'Anonymous Student';

  // ── Load poll data ──
  useEffect(() => {
    loadPoll();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, [pollId]);

  const loadPoll = async () => {
    try {
      const pollData = await pollDatabase.getPollById(pollId);
      if (!pollData) {
        setError('Poll not found.');
        setLoading(false);
        return;
      }

      setPoll(pollData);

      if (pollData.status === 'closed') {
        setPollEnded(true);
        // Load results for ended poll
        const res = await pollDatabase.calculateResults(pollId);
        setResults(res);
      } else if (pollData.status === 'active') {
        // Start countdown timer
        startTimer(pollData);
        // Listen for real-time status changes
        listenForChanges();
      } else {
        setError('This poll has not started yet.');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading poll:', err);
      setError('Failed to load poll.');
      setLoading(false);
    }
  };

  const startTimer = (pollData) => {
    if (!pollData.timer || pollData.timer <= 0) return;

    // Calculate remaining time
    let elapsed = 0;
    if (pollData.startedAt) {
      const startTime = pollData.startedAt.seconds
        ? pollData.startedAt.seconds * 1000
        : new Date(pollData.startedAt).getTime();
      elapsed = Math.floor((Date.now() - startTime) / 1000);
    }

    let remaining = Math.max(0, pollData.timer - elapsed);
    setTimeLeft(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
        setPollEnded(true);
        // Load results
        pollDatabase.calculateResults(pollId).then(setResults);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
  };

  const listenForChanges = () => {
    unsubRef.current = pollDatabase.listenToLivePoll(pollId, (data) => {
      if (!data || data.liveStatus !== 'active') {
        // Poll was closed by professor
        setPollEnded(true);
        if (timerRef.current) clearInterval(timerRef.current);
        pollDatabase.calculateResults(pollId).then(setResults);
      }
    });
  };

  // ── Submit vote ──
  const handleSubmit = async () => {
    if (selectedOption === null || submitted || submitting) return;

    setSubmitting(true);
    try {
      await pollDatabase.submitResponse(pollId, studentId, studentName, selectedOption);
      setSubmitted(true);
    } catch (err) {
      if (err.message.includes('already submitted')) {
        setSubmitted(true);
      } else {
        alert('Failed to submit: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Timer display ──
  const formatTime = (seconds) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timerColor = timeLeft !== null && timeLeft <= 10 ? 'text-red-500' : 'text-gray-700';
  const timerBg = timeLeft !== null && timeLeft <= 10 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200';

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading poll...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/student/join')}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
          >
            ← Back to Join
          </button>
        </div>
      </div>
    );
  }

  // ── Results view (after poll ends or after submitting and poll closes) ──
  if (pollEnded && results) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto pt-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">📊</div>
            <h1 className="text-2xl font-bold text-gray-900">Poll Results</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* Question */}
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{poll.question}</h2>

            {/* Results bars */}
            <div className="space-y-4">
              {results.distribution.map((opt) => {
                const isCorrect = opt.optionIndex === poll.correctOption;
                const isMyAnswer = opt.optionIndex === selectedOption;
                return (
                  <div key={opt.optionIndex}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center space-x-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {String.fromCharCode(65 + opt.optionIndex)}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{opt.optionText}</span>
                        {isCorrect && <span className="text-green-600 text-xs font-semibold">✓ Correct</span>}
                        {isMyAnswer && <span className="text-blue-600 text-xs font-semibold">← You</span>}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{opt.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isCorrect ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${opt.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                {results.totalResponses} {results.totalResponses === 1 ? 'response' : 'responses'}
              </p>
              {submitted && selectedOption !== null && (
                <p className={`mt-2 text-sm font-semibold ${
                  selectedOption === poll.correctOption ? 'text-green-600' : 'text-red-600'
                }`}>
                  {selectedOption === poll.correctOption ? '🎉 You got it right!' : '❌ Better luck next time!'}
                </p>
              )}
            </div>
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => router.push('/student/join')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
            >
              Join Another Poll
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Submitted — waiting for poll to end ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Answer Submitted!</h2>
          <p className="text-gray-600 mb-2">
            You selected <strong>Option {String.fromCharCode(65 + selectedOption)}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Waiting for the professor to close the poll...
          </p>
          {timeLeft !== null && timeLeft > 0 && (
            <div className={`inline-block px-6 py-3 rounded-xl border ${timerBg}`}>
              <span className={`text-2xl font-mono font-bold ${timerColor}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main voting interface ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Timer bar at top */}
      {timeLeft !== null && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-500">Time remaining</span>
            <span className={`text-2xl font-mono font-bold ${timerColor}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 10 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${poll.timer > 0 ? (timeLeft / poll.timer) * 100 : 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Course info */}
        <div className="text-center mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {poll.courseId} — {poll.courseName}
          </span>
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 leading-relaxed">
            {poll.question}
          </h1>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-8">
          {poll.options.map((option, index) => (
            <button
              key={index}
              onClick={() => setSelectedOption(index)}
              disabled={submitting}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedOption === index
                  ? 'border-green-500 bg-green-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center space-x-4">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    selectedOption === index
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={`text-base font-medium ${
                  selectedOption === index ? 'text-green-800' : 'text-gray-800'
                }`}>
                  {option}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={selectedOption === null || submitting}
          className={`w-full py-4 rounded-xl font-semibold text-lg text-white transition-all duration-200 ${
            selectedOption === null
              ? 'bg-gray-300 cursor-not-allowed'
              : submitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </span>
          ) : selectedOption === null ? (
            'Select an option'
          ) : (
            `Submit Answer (${String.fromCharCode(65 + selectedOption)})`
          )}
        </button>
      </div>
    </div>
  );
}