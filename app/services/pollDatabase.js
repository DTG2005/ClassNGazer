import { db, realtimeDb } from '../../lib/firebase/init';
import { 
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, increment, onSnapshot
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

  subscribeToPolls(courseId, callback) {
    const q = query(collection(db, "polls"), where("courseId", "==", courseId), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Error subscribing to polls:", error));
  },

  subscribeToAllPolls(callback) {
    const q = query(collection(db, "polls"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Error subscribing to polls:", error));
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

  // Helper to strip undefined values before sending to Firebase
  _cleanUndefined(obj) {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(v => this._cleanUndefined(v));
    const cleaned = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = this._cleanUndefined(obj[key]);
      }
    }
    return cleaned;
  },

  // Create poll
  async createPoll(pollData) {
    try {
      const options = pollData.options || [];
      const correctOptions = pollData.correctOptions || [pollData.correctOption ?? 0];

      correctOptions.forEach(idx => {
        if (idx < 0 || idx >= options.length) {
          throw new Error('Option index out of range');
        }
      });

      const pollDoc = {
        question: pollData.question?.trim() || '',
        questionImage: pollData.questionImage || null,
        options: options,
        correctOption: pollData.correctOption ?? 0,
        correctOptions: correctOptions,
        timer: pollData.timer || 60,
        status: 'draft',
        courseId: pollData.courseId || '',
        courseName: pollData.courseName || '',
        professorId: pollData.professorId || '',
        professorName: pollData.professorName || '',
        totalResponses: 0,
        count: {},
        solution: pollData.solution || '',
        solutionImage: pollData.solutionImage || null,
        createdAt: serverTimestamp(),
        createdAtMs: Date.now(), // client-readable fallback for immediate display
        updatedAt: serverTimestamp(),
        startedAt: null,
        endedAt: null,
      };
      const cleanedDoc = this._cleanUndefined(pollDoc);
      const docRef = await addDoc(collection(db, "polls"), cleanedDoc);
      return docRef.id;
    } catch (error) { console.error("Error creating poll:", error); throw error; }
  },

  // Update poll
  async updatePoll(pollId, updates) {
    try {
      if (updates.options && updates.correctOptions) {
        updates.correctOptions.forEach(idx => {
          if (idx < 0 || idx >= updates.options.length) {
            throw new Error('Option index out of range');
          }
        });
      }

      const safeUpdates = { ...updates, updatedAt: serverTimestamp() };
      delete safeUpdates.createdAt;
      delete safeUpdates.professorId;
      const cleanedUpdates = this._cleanUndefined(safeUpdates);
      await updateDoc(doc(db, "polls", pollId), cleanedUpdates);
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

      // If starting a poll, auto-close any existing active poll in the same course
      if (newStatus === 'active') {
        const activePoll = await this.getActivePollByCourse(poll.courseId);
        if (activePoll && activePoll.id !== pollId) {
          await this.updatePollStatus(activePoll.id, 'closed');
        }
      }

      const update = { status: newStatus, updatedAt: serverTimestamp() };
      if (newStatus === 'active') update.startedAt = serverTimestamp();
      if (newStatus === 'closed') update.endedAt = serverTimestamp();

      await updateDoc(doc(db, "polls", pollId), update);

      // Sync with Realtime DB
      if (newStatus === 'active') {
        await set(ref(realtimeDb, `livePolls/${pollId}`), {
          question: poll.question, questionImage: poll.questionImage || null,
          options: poll.options,
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
              if (Array.isArray(r.response)) {
                r.response.forEach(idx => {
                  const str = String(idx);
                  countMap[str] = (countMap[str] || 0) + 1;
                });
              } else {
                const idx = String(r.response);
                countMap[idx] = (countMap[idx] || 0) + 1;
              }
            });
            await updateDoc(doc(db, "polls", pollId), { totalResponses: total, count: countMap });
          }
        } catch (e) { console.error('Error syncing final counts:', e); }
        await remove(ref(realtimeDb, `livePolls/${pollId}`)).catch(() => {});
      }

      return true;
    } catch (error) { console.error("Error updating status:", error); throw error; }
  },

  // Add time to active poll
  async addTime(pollId, extraSeconds) {
    try {
      // Update Firestore
      await updateDoc(doc(db, "polls", pollId), {
        timer: increment(extraSeconds),
        updatedAt: serverTimestamp(),
      });
      // Update Realtime DB timer field so all clients recompute remaining time
      const livePollRef = ref(realtimeDb, `livePolls/${pollId}`);
      const snap = await get(livePollRef);
      if (snap.exists()) {
        const curr = snap.val();
        await set(ref(realtimeDb, `livePolls/${pollId}/timer`), (curr.timer || 0) + extraSeconds);
      }
      return true;
    } catch (error) { console.error("Error adding time:", error); throw error; }
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

  // FIXED: Now updates BOTH Realtime DB (live) AND Firestore (permanent)
  async submitResponse(pollId, studentId, studentName, responseIndex) {
    try {
      // 1. Check for duplicate in Realtime DB
      const existingRef = ref(realtimeDb, `livePolls/${pollId}/responses/${studentId}`);
      const existingSnap = await get(existingRef);
      const exists = existingSnap.exists();
      const oldData = exists ? existingSnap.val() : null;

      const responseData = {
        studentId, studentName,
        response: responseIndex,
        timestamp: Date.now(),
        isCorrect: null,
      };

      // 2. Write to Realtime DB (for live dashboard)
      await set(existingRef, responseData);

      // 3. Write to Firestore responses collection (permanent record)
      // Since student can change answer, query their previous response doc
      const responsesCol = collection(db, "responses");
      const userRespQuery = query(responsesCol, where("pollId", "==", pollId), where("studentId", "==", studentId));
      const userRespSnap = await getDocs(userRespQuery);
      
      if (!userRespSnap.empty) {
        // Update existing document
        const respDocId = userRespSnap.docs[0].id;
        await updateDoc(doc(db, "responses", respDocId), {
          ...responseData,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new document
        await addDoc(responsesCol, {
          pollId, ...responseData, submittedAt: serverTimestamp(),
        });
      }

      // 4. Update Firestore polls/{pollId} with correct count delta
      const finalUpdates = { updatedAt: serverTimestamp() };
      if (!exists) finalUpdates.totalResponses = increment(1);

      const countChanges = {};

      if (exists) {
        // Subtract previous response
        const oldR = Array.isArray(oldData.response) ? oldData.response : [oldData.response];
        oldR.forEach(idx => { countChanges[idx] = (countChanges[idx] || 0) - 1; });
      }

      // Add new response
      const newR = Array.isArray(responseIndex) ? responseIndex : [responseIndex];
      newR.forEach(idx => { countChanges[idx] = (countChanges[idx] || 0) + 1; });

      Object.entries(countChanges).forEach(([idx, val]) => {
        if (val !== 0) finalUpdates[`count.${idx}`] = increment(val);
      });

      await updateDoc(doc(db, "polls", pollId), finalUpdates);

      // 5. Update Realtime DB response count
      if (!exists) {
        const countRef = ref(realtimeDb, `livePolls/${pollId}/responseCount`);
        const countSnap = await get(countRef);
        await set(countRef, (countSnap.val() || 0) + 1);
      }

      console.log("Response submitted/updated by:", studentName);
      return true;
    } catch (error) {
      console.error("Error submitting response:", error);
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
      Object.values(responses).forEach(r => { 
        if (Array.isArray(r.response)) {
          r.response.forEach(idx => { if (counts[idx] !== undefined) counts[idx]++; });
        } else {
          if (counts[r.response] !== undefined) counts[r.response]++; 
        }
      });
      const pcts = {}; for (let i = 0; i < n; i++) pcts[i] = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
      return { pollId, question: lp.question, questionImage: lp.questionImage || null, options: lp.options, totalResponses: total, optionCounts: counts, percentages: pcts, responses: Object.values(responses) };
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
        let isCorrect = false;
        if (Array.isArray(r.response)) {
          r.response.forEach(idx => { if (counts[idx] !== undefined) counts[idx]++; });
          const userSet = new Set(r.response.map(Number));
          if (userSet.size === correctSet.size && [...userSet].every(x => correctSet.has(x))) isCorrect = true;
        } else {
          if (counts[r.response] !== undefined) counts[r.response]++;
          if (correctSet.has(Number(r.response))) isCorrect = true;
        }
        if (isCorrect) correctCount++;
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
        optionIndex: i, optionText: typeof t === 'string' ? t : t.text, optionImage: typeof t === 'string' ? null : t.image, count: s.optionCounts[i] || 0, percentage: s.percentages[i] || 0,
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
        let isCorrect = false;
        if (Array.isArray(resp.response)) {
          const userSet = new Set(resp.response.map(Number));
          if (userSet.size === correctSet.size && [...userSet].every(x => correctSet.has(x))) isCorrect = true;
        } else {
          if (correctSet.has(Number(resp.response))) isCorrect = true;
        }
        results.push({ pollId: poll.id, question: poll.question, selected: resp.response, isCorrect });
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
    const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const correctSet = new Set((stats.correctOptions || [stats.correctOption]).map(Number));

    const rows = [['Student ID', 'Student Name', 'Response', 'Is Correct', 'Timestamp'].map(esc).join(',')];
    stats.responses.forEach(r => {
      // Serialize response: array → "A, B" labels; number → "A"
      const toLabel = idx => String.fromCharCode(65 + Number(idx));
      let responseStr;
      if (Array.isArray(r.response)) {
        responseStr = r.response.map(toLabel).join('; ');
      } else {
        responseStr = r.response != null ? toLabel(r.response) : '—';
      }

      // Correct check — must fully match correctSet for multi-select
      let isCorrect = false;
      if (Array.isArray(r.response)) {
        const userSet = new Set(r.response.map(Number));
        isCorrect = userSet.size === correctSet.size && [...userSet].every(x => correctSet.has(x));
      } else {
        isCorrect = correctSet.has(Number(r.response));
      }

      rows.push([esc(r.studentId), esc(r.studentName || 'Anonymous'), esc(responseStr), esc(isCorrect ? 'Yes' : 'No'), esc(r.timestamp || '')].join(','));
    });

    rows.push('');
    rows.push(['Summary'].map(esc).join(','));
    rows.push([esc('Total Responses'), esc(stats.totalResponses)].join(','));
    rows.push([esc('Correct (fully)'), esc(stats.correctCount)].join(','));
    rows.push([esc('Correct %'), esc(stats.correctPercentage + '%')].join(','));
    (stats.options || []).forEach((opt, i) => {
      const label = typeof opt === 'string' ? opt : (opt?.text || `Option ${String.fromCharCode(65 + i)}`);
      rows.push([esc(`Option ${String.fromCharCode(65 + i)}: ${label}`), esc(stats.optionCounts[i]), esc(stats.percentages[i] + '%')].join(','));
    });
    return '\uFEFF' + rows.join('\n');
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
  if (!d.question?.trim() && !d.questionImage) errors.push('Question required');
  if (!d.options || d.options.length < 2) errors.push('At least 2 options required');
  else if (d.options.some(o => typeof o === 'string' ? !o.trim() : (!o.text?.trim() && !o.image))) errors.push('Options missing content');
  if (!d.correctOptions || d.correctOptions.length === 0) errors.push('Valid correct option required');
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