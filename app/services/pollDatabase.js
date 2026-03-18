

import { db, realtimeDb } from '../../lib/firebase/init';
import {
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, increment,
} from 'firebase/firestore';
import { ref, set, remove, onValue, get } from 'firebase/database';

const POLLS = 'polls';
const RESPONSES = 'responses';

export const PollStatus = { DRAFT: 'draft', ACTIVE: 'active', CLOSED: 'closed' };

export const pollDatabase = {

  // ── createPoll() — Class Diagram + State: → Inactive ──
  async createPoll(pollData) {
    const v = validatePollData(pollData);
    if (!v.isValid) throw new Error(`Validation failed: ${v.errors.join(', ')}`);

    const pollDoc = {
      question: pollData.question.trim(),
      options: pollData.options.map(o => o.trim()),
      // Class Diagram: correctOptions: Array<String> — supports multiple correct answers
      correctOptions: Array.isArray(pollData.correctOptions)
        ? pollData.correctOptions
        : [pollData.correctOption ?? 0],
      // Backward compat: single correctOption index
      correctOption: Array.isArray(pollData.correctOptions)
        ? pollData.correctOptions[0]
        : (pollData.correctOption ?? 0),
      // Class Diagram: imageUrls: Array<String>
      imageUrls: pollData.imageUrls || [],
      timer: pollData.timer || 60,                  // Class Diagram: time: Integer
      status: PollStatus.DRAFT,                     // Class Diagram: status: enum<Status>
      courseId: pollData.courseId,
      courseName: pollData.courseName || '',
      professorId: pollData.professorId,
      professorName: pollData.professorName || 'Professor',
      totalResponses: 0,
      count: {},                                    // Class Diagram: count: map<String, Integer>
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      startedAt: null,                              // Class Diagram: startTime
      endedAt: null,                                // Class Diagram: endTime
    };

    const docRef = await addDoc(collection(db, POLLS), pollDoc);
    return docRef.id;
  },

  async getPollById(pollId) {
    const snap = await getDoc(doc(db, POLLS, pollId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async getAllPolls() {
    try {
      const q = query(collection(db, POLLS), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.error('Error getting polls:', e); return []; }
  },

  // ── updatePoll() — Class Diagram ──
  async updatePoll(pollId, updates) {
    const poll = await this.getPollById(pollId);
    if (!poll) throw new Error('Poll not found.');
    if (poll.status === PollStatus.CLOSED) throw new Error('Cannot update a closed poll.');
    ['createdAt', 'professorId', 'courseId'].forEach(k => delete updates[k]);
    await updateDoc(doc(db, POLLS, pollId), { ...updates, updatedAt: serverTimestamp() });
    return true;
  },

  // ── livePoll() / endPoll() — State transitions ──
  async updatePollStatus(pollId, newStatus) {
    const poll = await this.getPollById(pollId);
    if (!poll) throw new Error('Poll not found.');
    if (newStatus === 'active' && poll.status !== 'draft')
      throw new Error(`Cannot start — status is "${poll.status}", must be "draft".`);
    if (newStatus === 'closed' && poll.status !== 'active')
      throw new Error(`Cannot close — status is "${poll.status}", must be "active".`);

    const update = { status: newStatus, updatedAt: serverTimestamp() };
    if (newStatus === 'active') update.startedAt = serverTimestamp();
    if (newStatus === 'closed') update.endedAt = serverTimestamp();
    await updateDoc(doc(db, POLLS, pollId), update);

    if (newStatus === 'active') await this.startLivePoll(pollId, { ...poll, ...update });
    if (newStatus === 'closed') await this.stopLivePoll(pollId);
    return true;
  },

  // ── deletePoll() — Class Diagram ──
  async deletePoll(pollId) {
    const poll = await this.getPollById(pollId);
    if (!poll) throw new Error('Poll not found.');
    if (poll.status === 'active') throw new Error('Cannot delete active poll.');
    await deleteDoc(doc(db, POLLS, pollId));
    await remove(ref(realtimeDb, `livePolls/${pollId}`)).catch(() => {});
    return true;
  },

  // ── QUERIES ──
  async getPollsByCourse(courseId) {
    const q = query(collection(db, POLLS), where('courseId', '==', courseId), orderBy('createdAt', 'desc'));
    return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async getPollsByStatus(status) {
    const q = query(collection(db, POLLS), where('status', '==', status), orderBy('createdAt', 'desc'));
    return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async getPollsByProfessor(professorId) {
    const q = query(collection(db, POLLS), where('professorId', '==', professorId), orderBy('createdAt', 'desc'));
    return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async getActivePollByCourse(courseId) {
    const q = query(collection(db, POLLS), where('courseId', '==', courseId), where('status', '==', 'active'));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  },
  async getPollHistory(courseId) {
    const q = query(collection(db, POLLS), where('courseId', '==', courseId), where('status', '==', 'closed'), orderBy('endedAt', 'desc'));
    return (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async searchPolls(term) {
    const all = await this.getAllPolls();
    const t = term.toLowerCase();
    return all.filter(p => p.question.toLowerCase().includes(t) || p.courseId.toLowerCase().includes(t));
  },

  // ── REALTIME DB ──
  async startLivePoll(pollId, pollData) {
    await set(ref(realtimeDb, `livePolls/${pollId}`), {
      question: pollData.question, options: pollData.options,
      correctOption: pollData.correctOption, correctOptions: pollData.correctOptions || [pollData.correctOption],
      imageUrls: pollData.imageUrls || [],
      timer: pollData.timer, courseId: pollData.courseId, courseName: pollData.courseName,
      professorId: pollData.professorId, professorName: pollData.professorName,
      liveStatus: 'active', liveStartedAt: Date.now(),
      responses: {}, responseCount: 0,
    });
    return true;
  },

  async stopLivePoll(pollId) {
    await remove(ref(realtimeDb, `livePolls/${pollId}`));
    return true;
  },

  // ── pollResponse() — Student_Poll class diagram ──
  // Stores response as Array<String> to support multiple selections
  async submitResponse(pollId, studentId, studentName, responseIndex) {
    const existingRef = ref(realtimeDb, `livePolls/${pollId}/responses/${studentId}`);
    const existingSnap = await get(existingRef);
    if (existingSnap.exists()) throw new Error('Already submitted a response for this poll.');

    // Support both single response (number) and multiple (array)
    const responseArr = Array.isArray(responseIndex) ? responseIndex : [responseIndex];

    const data = {
      studentId, studentName,
      response: responseArr[0],       // backward compat: single number
      responses: responseArr,          // Class Diagram: Student_Poll.response: Array<String>
      timestamp: Date.now(),
      isCorrect: null,
    };

    await set(existingRef, data);
    await addDoc(collection(db, RESPONSES), { pollId, ...data, submittedAt: serverTimestamp() });

    // Update count map — Class Diagram: Polls.count: map<String, Integer>
    const poll = await this.getPollById(pollId);
    const newCount = { ...(poll.count || {}) };
    responseArr.forEach(r => { newCount[String(r)] = (newCount[String(r)] || 0) + 1; });
    await updateDoc(doc(db, POLLS, pollId), { count: newCount, totalResponses: increment(1), updatedAt: serverTimestamp() });

    const countRef = ref(realtimeDb, `livePolls/${pollId}/responseCount`);
    const countSnap = await get(countRef);
    await set(countRef, (countSnap.val() || 0) + 1);

    return true;
  },

  async getLivePollResults(pollId) {
    const snap = await get(ref(realtimeDb, `livePolls/${pollId}`));
    const lp = snap.val();
    if (!lp) return null;
    const responses = lp.responses || {};
    const total = Object.keys(responses).length;
    const n = lp.options ? lp.options.length : 4;
    const counts = {}; const pcts = {};
    for (let i = 0; i < n; i++) counts[i] = 0;
    Object.values(responses).forEach(r => { const idx = r.response ?? r.responses?.[0]; if (counts[idx] !== undefined) counts[idx]++; });
    for (let i = 0; i < n; i++) pcts[i] = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
    return { pollId, question: lp.question, options: lp.options, correctOption: lp.correctOption, correctOptions: lp.correctOptions, totalResponses: total, optionCounts: counts, percentages: pcts, responses: Object.values(responses) };
  },

  listenToLivePoll(pollId, cb) { return onValue(ref(realtimeDb, `livePolls/${pollId}`), snap => cb(snap.val())); },
  listenToLiveResponses(pollId, cb) { return onValue(ref(realtimeDb, `livePolls/${pollId}/responses`), snap => cb(snap.val() || {})); },

  // ── resultCalculation() — Class Diagram + State Diagram: Ended → resultCalculation() ──
  // Also: studentPerformance() from Student_Poll class
  async getPollStats(pollId) {
    const poll = await this.getPollById(pollId);
    if (!poll) return null;
    const q = query(collection(db, RESPONSES), where('pollId', '==', pollId));
    const snap = await getDocs(q);
    const responses = snap.docs.map(d => d.data());

    const total = responses.length;
    const n = poll.options ? poll.options.length : 4;
    const correctSet = new Set((poll.correctOptions || [poll.correctOption]).map(Number));
    const counts = {}; for (let i = 0; i < n; i++) counts[i] = 0;
    let correct = 0;

    responses.forEach(r => {
      const selected = r.responses || [r.response];
      selected.forEach(s => { if (counts[s] !== undefined) counts[s]++; });
      // Check if student's answer matches any correct option
      if (selected.some(s => correctSet.has(Number(s)))) correct++;
    });

    const pcts = {}; for (let i = 0; i < n; i++) pcts[i] = total > 0 ? Math.round((counts[i] / total) * 100) : 0;

    return {
      pollId, question: poll.question, options: poll.options,
      correctOption: poll.correctOption, correctOptions: poll.correctOptions || [poll.correctOption],
      imageUrls: poll.imageUrls || [],
      totalResponses: total, correctCount: correct,
      correctPercentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      optionCounts: counts, percentages: pcts,
      count: counts,  // Class Diagram: count: map<String, Integer>
      responses: responses.slice(0, 100),
    };
  },

  async calculateResults(pollId) {
    const s = await this.getPollStats(pollId);
    if (!s) return null;
    return {
      pollId, questionText: s.question, correctOption: s.correctOption,
      correctOptions: s.correctOptions, totalResponses: s.totalResponses,
      distribution: s.options.map((t, i) => ({
        optionIndex: i, optionText: t,
        count: s.optionCounts[i] || 0, percentage: s.percentages[i] || 0,
        isCorrect: (s.correctOptions || [s.correctOption]).map(Number).includes(i),
      })),
    };
  },

  // ── studentPerformance() — Student_Poll class diagram ──
  // Returns a student's performance across all polls in a course
  async getStudentPerformance(studentId, courseId) {
    const polls = await this.getPollHistory(courseId);
    const results = [];

    for (const poll of polls) {
      const q = query(collection(db, RESPONSES), where('pollId', '==', poll.id), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const resp = snap.docs[0].data();
        const correctSet = new Set((poll.correctOptions || [poll.correctOption]).map(Number));
        const selected = resp.responses || [resp.response];
        const isCorrect = selected.some(s => correctSet.has(Number(s)));
        results.push({ pollId: poll.id, question: poll.question, selected, isCorrect, correctOptions: poll.correctOptions });
      } else {
        results.push({ pollId: poll.id, question: poll.question, selected: [], isCorrect: false, missed: true });
      }
    }

    const total = results.length;
    const correct = results.filter(r => r.isCorrect).length;
    return { studentId, courseId, total, correct, percentage: total > 0 ? Math.round((correct / total) * 100) : 0, polls: results };
  },

  // ── BATCH ──
  async createMultiplePolls(arr) {
    const results = [];
    for (const p of arr) {
      try { const id = await this.createPoll(p); results.push({ success: true, pollId: id }); }
      catch (e) { results.push({ success: false, error: e.message }); }
    }
    return results;
  },
};

// ═══════════════════════════════════════════
// EXPORT SERVICE — Sequence Diagram (ix): Export Poll Results
// Generates CSV/JSON data for download
// ═══════════════════════════════════════════

export const exportService = {

  // Export poll results as CSV string
  async exportAsCSV(pollId) {
    const stats = await pollDatabase.getPollStats(pollId);
    if (!stats) throw new Error('Poll not found.');

    const rows = [['Student ID', 'Student Name', 'Response', 'Is Correct', 'Timestamp']];
    stats.responses.forEach(r => {
      const selected = r.responses || [r.response];
      const correctSet = new Set((stats.correctOptions || [stats.correctOption]).map(Number));
      const isCorrect = selected.some(s => correctSet.has(Number(s)));
      rows.push([r.studentId, r.studentName || 'Anonymous', selected.join(';'), isCorrect ? 'Yes' : 'No', r.timestamp || '']);
    });

    // Summary row
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Responses', stats.totalResponses]);
    rows.push(['Correct', stats.correctCount]);
    rows.push(['Correct %', stats.correctPercentage + '%']);
    stats.options.forEach((opt, i) => {
      rows.push([`Option ${String.fromCharCode(65 + i)}: ${opt}`, stats.optionCounts[i], stats.percentages[i] + '%']);
    });

    return rows.map(r => r.join(',')).join('\n');
  },

  // Export as JSON
  async exportAsJSON(pollId) {
    const stats = await pollDatabase.getPollStats(pollId);
    if (!stats) throw new Error('Poll not found.');
    return JSON.stringify(stats, null, 2);
  },

  // Trigger download in browser
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // One-click export + download
  async downloadCSV(pollId) {
    const csv = await this.exportAsCSV(pollId);
    this.downloadFile(csv, `poll-results-${pollId}.csv`, 'text/csv');
  },

  async downloadJSON(pollId) {
    const json = await this.exportAsJSON(pollId);
    this.downloadFile(json, `poll-results-${pollId}.json`, 'application/json');
  },
};

// ── HELPERS ──

export function validatePollData(d) {
  const errors = [];
  if (!d.question?.trim()) errors.push('Question is required');
  if (!d.options || d.options.length < 2) errors.push('At least 2 options required');
  else if (d.options.some(o => !o.trim())) errors.push('All options must have text');

  // Support both single correctOption and array correctOptions
  if (Array.isArray(d.correctOptions)) {
    if (d.correctOptions.length === 0) errors.push('At least one correct option required');
    if (d.correctOptions.some(c => c < 0 || c >= (d.options?.length || 0))) errors.push('Correct option index out of range');
  } else {
    if (d.correctOption === undefined || d.correctOption < 0 || d.correctOption >= (d.options?.length || 0)) errors.push('Valid correct option required');
  }
  if (!d.courseId?.trim()) errors.push('Course ID required');
  if (d.timer && (d.timer < 10 || d.timer > 300)) errors.push('Timer must be 10–300s');
  return { isValid: errors.length === 0, errors };
}

export function formatPollForDisplay(poll) {
  const fmt = ts => { if (!ts) return 'N/A'; if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString(); return new Date(ts).toLocaleString(); };
  return { ...poll, createdAtFormatted: fmt(poll.createdAt), startedAtFormatted: poll.startedAt ? fmt(poll.startedAt) : 'Not started', endedAtFormatted: poll.endedAt ? fmt(poll.endedAt) : 'Not ended' };
}

export async function createTestPolls(count = 3) {
  const courses = ['CS310', 'CS101', 'MATH201'];
  const profs = [{ id: 'prof1', name: 'Dr. Smith' }, { id: 'prof2', name: 'Dr. Johnson' }];
  const polls = [];
  for (let i = 1; i <= count; i++) {
    const c = courses[i % courses.length]; const p = profs[i % profs.length];
    polls.push({
      question: `Sample Question ${i}: What is ${i}+${i}?`,
      options: [`${i * 2}`, `${i * 3}`, `${i * 4}`, `${i + 1}`],
      correctOption: 0, correctOptions: [0],
      imageUrls: [],
      courseId: c, courseName: c, professorId: p.id, professorName: p.name, timer: 60,
    });
  }
  return pollDatabase.createMultiplePolls(polls);
}

export async function initializeDatabase() {
  const existing = await pollDatabase.getAllPolls();
  if (existing.length === 0) await createTestPolls(3);
  return true;
}