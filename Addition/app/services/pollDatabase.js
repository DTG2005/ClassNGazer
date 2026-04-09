import { db, realtimeDb } from '../../lib/firebase/init';
import { 
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, increment
} from 'firebase/firestore';
import { ref, set, remove, onValue, get } from 'firebase/database';

export const pollDatabase = {
  // ========== CRUD OPERATIONS ==========
  
  async getAllPolls() {
    try {
      const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) { console.error("Error getting polls:", error); return []; }
  },

  async getPollById(pollId) {
    try {
      const snap = await getDoc(doc(db, "polls", pollId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (error) { console.error("Error:", error); return null; }
  },

  async getPollsByCourse(courseId) {
    try {
      const q = query(collection(db, "polls"), where("courseId", "==", courseId), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) { console.error("Error:", error); return []; }
  },

  async getPollsByProfessor(professorId) {
    try {
      const q = query(collection(db, "polls"), where("professorId", "==", professorId), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) { console.error("Error:", error); return []; }
  },

  async getActivePollByCourse(courseId) {
    try {
      const q = query(collection(db, "polls"), where("courseId", "==", courseId), where("status", "==", "active"));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() };
    } catch (error) { console.error("Error:", error); return null; }
  },

  async getPollHistory(courseId) {
    try {
      const q = query(collection(db, "polls"), where("courseId", "==", courseId), where("status", "==", "closed"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) { console.error("Error:", error); return []; }
  },

  // Create poll
  async createPoll(pollData) {
    try {
      const pollDoc = {
        question: pollData.question?.trim() || '',
        options: pollData.options || [],
        correctOption: pollData.correctOption ?? 0,
        correctOptions: pollData.correctOptions || [pollData.correctOption ?? 0],
        timer: pollData.timer || 60,
        status: 'draft',
        courseId: pollData.courseId || '',
        courseName: pollData.courseName || '',
        professorId: pollData.professorId || '',
        professorName: pollData.professorName || '',
        totalResponses: 0,
        count: {},
        solution: pollData.solution || '',
        imageUrls: pollData.imageUrls || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startedAt: null,
        endedAt: null,
      };
      const docRef = await addDoc(collection(db, "polls"), pollDoc);
      return docRef.id;
    } catch (error) { console.error("Error creating poll:", error); throw error; }
  },

  // Update poll
  async updatePoll(pollId, updates) {
    try {
      const safeUpdates = { ...updates, updatedAt: serverTimestamp() };
      delete safeUpdates.createdAt;
      delete safeUpdates.professorId;
      await updateDoc(doc(db, "polls", pollId), safeUpdates);
      return true;
    } catch (error) { console.error("Error updating poll:", error); throw error; }
  },

  // Update poll status (draft → active → closed)
  async updatePollStatus(pollId, newStatus) {
    try {
      const poll = await this.getPollById(pollId);
      if (!poll) throw new Error('Poll not found');

      if (newStatus === 'active' && poll.status !== 'draft') throw new Error(`Cannot start — status is "${poll.status}"`);
      if (newStatus === 'closed' && poll.status !== 'active') throw new Error(`Cannot close — status is "${poll.status}"`);

      const update = { status: newStatus, updatedAt: serverTimestamp() };
      if (newStatus === 'active') update.startedAt = serverTimestamp();
      if (newStatus === 'closed') update.endedAt = serverTimestamp();

      await updateDoc(doc(db, "polls", pollId), update);

      // Sync with Realtime DB
      if (newStatus === 'active') {
        await set(ref(realtimeDb, `livePolls/${pollId}`), {
          question: poll.question, options: poll.options,
          correctOption: poll.correctOption, correctOptions: poll.correctOptions || [poll.correctOption],
          timer: poll.timer, courseId: poll.courseId, courseName: poll.courseName,
          professorId: poll.professorId, professorName: poll.professorName,
          liveStatus: 'active', liveStartedAt: Date.now(),
          responses: {}, responseCount: 0,
        });
      }
      if (newStatus === 'closed') {
        // Before deleting live data, sync final counts to Firestore
        try {
          const liveSnap = await get(ref(realtimeDb, `livePolls/${pollId}`));
          const liveData = liveSnap.val();
          if (liveData?.responses) {
            const responses = liveData.responses;
            const total = Object.keys(responses).length;
            const countMap = {};
            Object.values(responses).forEach(r => {
              const idx = String(r.response);
              countMap[idx] = (countMap[idx] || 0) + 1;
            });
            await updateDoc(doc(db, "polls", pollId), { totalResponses: total, count: countMap });
          }
        } catch (e) { console.error('Error syncing final counts:', e); }
        await remove(ref(realtimeDb, `livePolls/${pollId}`)).catch(() => {});
      }

      return true;
    } catch (error) { console.error("Error updating status:", error); throw error; }
  },

  // Delete poll
  async deletePoll(pollId) {
    try {
      const poll = await this.getPollById(pollId);
      if (poll?.status === 'active') throw new Error('Cannot delete active poll');
      await deleteDoc(doc(db, "polls", pollId));
      await remove(ref(realtimeDb, `livePolls/${pollId}`)).catch(() => {});
      return true;
    } catch (error) { console.error("Error deleting:", error); throw error; }
  },

  // ========== STUDENT RESPONSES ==========

  // ✅ FIXED: Now updates BOTH Realtime DB (live) AND Firestore (permanent)
  async submitResponse(pollId, studentId, studentName, responseIndex) {
    try {
      // 1. Check for duplicate in Realtime DB
      const existingRef = ref(realtimeDb, `livePolls/${pollId}/responses/${studentId}`);
      const existingSnap = await get(existingRef);
      if (existingSnap.exists()) throw new Error('You have already submitted a response for this poll.');

      const responseData = {
        studentId, studentName,
        response: responseIndex,
        timestamp: Date.now(),
        isCorrect: null,
      };

      // 2. Write to Realtime DB (for live dashboard)
      await set(existingRef, responseData);

      // 3. Write to Firestore responses collection (permanent record)
      await addDoc(collection(db, "responses"), {
        pollId, ...responseData, submittedAt: serverTimestamp(),
      });

      // 4. ✅ FIX: Update Firestore polls/{pollId}.totalResponses (atomic increment)
      await updateDoc(doc(db, "polls", pollId), {
        totalResponses: increment(1),
        [`count.${String(responseIndex)}`]: increment(1),
        updatedAt: serverTimestamp(),
      });

      // 5. Update Realtime DB response count
      const countRef = ref(realtimeDb, `livePolls/${pollId}/responseCount`);
      const countSnap = await get(countRef);
      await set(countRef, (countSnap.val() || 0) + 1);

      console.log("📝 Response submitted by:", studentName);
      return true;
    } catch (error) {
      console.error("❌ Error submitting response:", error);
      throw error;
    }
  },

  // Get live poll results (from Realtime DB)
  async getLivePollResults(pollId) {
    try {
      const snap = await get(ref(realtimeDb, `livePolls/${pollId}`));
      const lp = snap.val();
      if (!lp) return null;
      const responses = lp.responses || {};
      const total = Object.keys(responses).length;
      const n = lp.options?.length || 4;
      const counts = {}; for (let i = 0; i < n; i++) counts[i] = 0;
      Object.values(responses).forEach(r => { if (counts[r.response] !== undefined) counts[r.response]++; });
      const pcts = {}; for (let i = 0; i < n; i++) pcts[i] = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
      return { pollId, question: lp.question, options: lp.options, totalResponses: total, optionCounts: counts, percentages: pcts, responses: Object.values(responses) };
    } catch (error) { console.error("Error:", error); return null; }
  },

  // Listen to live poll
  listenToLivePoll(pollId, callback) {
    return onValue(ref(realtimeDb, `livePolls/${pollId}`), (snap) => callback(snap.val()));
  },

  // Listen to ALL active polls (whole livePolls node) — fires when any poll starts or ends
  listenToLivePolls(callback) {
    return onValue(ref(realtimeDb, 'livePolls'), (snap) => callback(snap.val() || {}));
  },

  // Listen to live responses
  listenToLiveResponses(pollId, callback) {
    return onValue(ref(realtimeDb, `livePolls/${pollId}/responses`), (snap) => callback(snap.val() || {}));
  },

  // ========== ANALYTICS ==========
  
  async getPollStats(pollId) {
    try {
      const poll = await this.getPollById(pollId);
      if (!poll) return null;

      const q = query(collection(db, "responses"), where("pollId", "==", pollId));
      const snap = await getDocs(q);
      const responses = snap.docs.map(d => d.data());

      const total = responses.length;
      const n = poll.options?.length || 4;
      const counts = {}; for (let i = 0; i < n; i++) counts[i] = 0;
      let correctCount = 0;
      const correctSet = new Set((poll.correctOptions || [poll.correctOption]).map(Number));
      
      responses.forEach(r => {
        if (counts[r.response] !== undefined) counts[r.response]++;
        if (correctSet.has(Number(r.response))) correctCount++;
      });

      const pcts = {}; for (let i = 0; i < n; i++) pcts[i] = total > 0 ? Math.round((counts[i] / total) * 100) : 0;

      return {
        pollId, question: poll.question, options: poll.options,
        correctOption: poll.correctOption, correctOptions: poll.correctOptions,
        totalResponses: total, correctCount,
        correctPercentage: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        optionCounts: counts, percentages: pcts, count: counts,
        responses: responses.slice(0, 100),
      };
    } catch (error) { console.error("Error getting stats:", error); return null; }
  },

  async calculateResults(pollId) {
    const s = await this.getPollStats(pollId);
    if (!s) return null;
    return {
      pollId, questionText: s.question, correctOption: s.correctOption, correctOptions: s.correctOptions,
      totalResponses: s.totalResponses,
      distribution: (s.options || []).map((t, i) => ({
        optionIndex: i, optionText: t, count: s.optionCounts[i] || 0, percentage: s.percentages[i] || 0,
        isCorrect: (s.correctOptions || [s.correctOption]).map(Number).includes(i),
      })),
    };
  },

  // Student performance across course
  async getStudentPerformance(studentId, courseId) {
    const polls = await this.getPollHistory(courseId);
    const results = [];
    for (const poll of polls) {
      const q = query(collection(db, "responses"), where("pollId", "==", poll.id), where("studentId", "==", studentId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const resp = snap.docs[0].data();
        const correctSet = new Set((poll.correctOptions || [poll.correctOption]).map(Number));
        results.push({ pollId: poll.id, question: poll.question, selected: resp.response, isCorrect: correctSet.has(Number(resp.response)) });
      } else {
        results.push({ pollId: poll.id, question: poll.question, selected: null, isCorrect: false, missed: true });
      }
    }
    const total = results.length;
    const correct = results.filter(r => r.isCorrect).length;
    return { studentId, courseId, total, correct, percentage: total > 0 ? Math.round((correct / total) * 100) : 0, polls: results };
  },

  // Batch create
  async createMultiplePolls(arr) {
    const results = [];
    for (const p of arr) {
      try { const id = await this.createPoll(p); results.push({ success: true, pollId: id }); }
      catch (e) { results.push({ success: false, error: e.message }); }
    }
    return results;
  },
};

// ========== EXPORT SERVICE ==========

export const exportService = {
  async exportAsCSV(pollId) {
    const stats = await pollDatabase.getPollStats(pollId);
    if (!stats) throw new Error('Poll not found');
    const rows = [['Student ID', 'Student Name', 'Response', 'Is Correct', 'Timestamp']];
    const correctSet = new Set((stats.correctOptions || [stats.correctOption]).map(Number));
    stats.responses.forEach(r => {
      rows.push([r.studentId, r.studentName || 'Anonymous', r.response, correctSet.has(Number(r.response)) ? 'Yes' : 'No', r.timestamp || '']);
    });
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Responses', stats.totalResponses]);
    rows.push(['Correct', stats.correctCount]);
    rows.push(['Correct %', stats.correctPercentage + '%']);
    (stats.options || []).forEach((opt, i) => {
      rows.push([`Option ${String.fromCharCode(65 + i)}: ${opt}`, stats.optionCounts[i], stats.percentages[i] + '%']);
    });
    return rows.map(r => r.join(',')).join('\n');
  },

  async exportAsJSON(pollId) {
    const stats = await pollDatabase.getPollStats(pollId);
    if (!stats) throw new Error('Poll not found');
    return JSON.stringify(stats, null, 2);
  },

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async downloadCSV(pollId) {
    const csv = await this.exportAsCSV(pollId);
    this.downloadFile(csv, `poll-results-${pollId}.csv`, 'text/csv');
  },

  async downloadJSON(pollId) {
    const json = await this.exportAsJSON(pollId);
    this.downloadFile(json, `poll-results-${pollId}.json`, 'application/json');
  },
};

// ========== HELPERS ==========

export function validatePollData(d) {
  const errors = [];
  if (!d.question?.trim()) errors.push('Question required');
  if (!d.options || d.options.length < 2) errors.push('At least 2 options');
  else if (d.options.some(o => !o.trim())) errors.push('All options need text');
  if (d.correctOption === undefined || d.correctOption < 0 || d.correctOption >= (d.options?.length || 0)) errors.push('Valid correct option required');
  if (!d.courseId?.trim()) errors.push('Course ID required');
  if (d.timer && (d.timer < 10 || d.timer > 300)) errors.push('Timer 10-300s');
  return { isValid: errors.length === 0, errors };
}

export function formatPollForDisplay(poll) {
  const fmt = ts => { if (!ts) return 'N/A'; if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString(); return new Date(ts).toLocaleString(); };
  return { ...poll, createdAtFormatted: fmt(poll.createdAt), startedAtFormatted: fmt(poll.startedAt), endedAtFormatted: fmt(poll.endedAt) };
}

export async function createTestPolls(count = 3) {
  const polls = [];
  for (let i = 1; i <= count; i++) {
    polls.push({ question: `Sample Q${i}: What is ${i}+${i}?`, options: [`${i*2}`, `${i*3}`, `${i*4}`, `${i+1}`], correctOption: 0, correctOptions: [0], courseId: 'CS310', courseName: 'Software Engineering', professorId: 'prof1', professorName: 'Dr. Smith', timer: 60 });
  }
  return pollDatabase.createMultiplePolls(polls);
}

export async function initializeDatabase() {
  const existing = await pollDatabase.getAllPolls();
  if (existing.length === 0) await createTestPolls(3);
  return true;
}