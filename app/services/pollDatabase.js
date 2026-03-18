// app/services/pollDatabase.js
// ============================================================
// Database Init and Creation — Polls
// Poll States: "draft" | "active" | "closed"
//   draft  → Poll created, not visible to students
//   active → Students can view and respond
//   closed → No new responses accepted
// ============================================================

import { db, realtimeDb } from '../../lib/firebase/init';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { ref, set, remove, onValue, get } from 'firebase/database';

// ── Constants ──
const POLLS_COLLECTION = 'polls';
const RESPONSES_COLLECTION = 'responses';

export const PollStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
};

// ── Main Database Service ──
export const pollDatabase = {

  // ==================== CRUD ====================

  async getAllPolls() {
    try {
      const q = query(
        collection(db, POLLS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting polls:', error);
      return [];
    }
  },

  async getPollById(pollId) {
    try {
      const snap = await getDoc(doc(db, POLLS_COLLECTION, pollId));
      if (!snap.exists()) return null;
      return { id: snap.id, ...snap.data() };
    } catch (error) {
      console.error('Error getting poll:', error);
      throw error;
    }
  },

  async createPoll(pollData) {
    const validation = validatePollData(pollData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const pollDoc = {
        question: pollData.question.trim(),
        options: pollData.options.map((o) => o.trim()),
        correctOption: pollData.correctOption,
        timer: pollData.timer || 60,
        status: PollStatus.DRAFT,
        courseId: pollData.courseId,
        courseName: pollData.courseName || '',
        professorId: pollData.professorId,
        professorName: pollData.professorName || 'Professor',
        totalResponses: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startedAt: null,
        endedAt: null,
      };

      const docRef = await addDoc(collection(db, POLLS_COLLECTION), pollDoc);
      console.log('✅ Poll created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating poll:', error);
      throw error;
    }
  },

  async updatePoll(pollId, updateData) {
    try {
      const poll = await this.getPollById(pollId);
      if (!poll) throw new Error('Poll not found.');
      if (poll.status === PollStatus.CLOSED) {
        throw new Error('Cannot update a closed poll.');
      }

      const immutable = ['createdAt', 'professorId', 'courseId'];
      for (const key of immutable) {
        if (key in updateData) delete updateData[key];
      }

      const pollRef = doc(db, POLLS_COLLECTION, pollId);
      await updateDoc(pollRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Poll updated:', pollId);
      return true;
    } catch (error) {
      console.error('❌ Error updating poll:', error);
      throw error;
    }
  },

  async updatePollStatus(pollId, newStatus) {
    try {
      const poll = await this.getPollById(pollId);
      if (!poll) throw new Error('Poll not found.');

      if (newStatus === PollStatus.ACTIVE && poll.status !== PollStatus.DRAFT) {
        throw new Error(`Cannot start poll — current status is "${poll.status}". Must be "draft".`);
      }
      if (newStatus === PollStatus.CLOSED && poll.status !== PollStatus.ACTIVE) {
        throw new Error(`Cannot close poll — current status is "${poll.status}". Must be "active".`);
      }

      const pollRef = doc(db, POLLS_COLLECTION, pollId);
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      if (newStatus === PollStatus.ACTIVE) {
        updateData.startedAt = serverTimestamp();
      } else if (newStatus === PollStatus.CLOSED) {
        updateData.endedAt = serverTimestamp();
      }

      await updateDoc(pollRef, updateData);

      if (newStatus === PollStatus.ACTIVE) {
        await this.startLivePoll(pollId, { ...poll, ...updateData });
      }
      if (newStatus === PollStatus.CLOSED) {
        await this.stopLivePoll(pollId);
      }

      console.log(`✅ Poll ${pollId} status → ${newStatus}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating poll status:', error);
      throw error;
    }
  },

  async deletePoll(pollId) {
    try {
      const poll = await this.getPollById(pollId);
      if (!poll) throw new Error('Poll not found.');
      if (poll.status === PollStatus.ACTIVE) {
        throw new Error('Cannot delete an active poll. Close it first.');
      }

      await deleteDoc(doc(db, POLLS_COLLECTION, pollId));
      await remove(ref(realtimeDb, `livePolls/${pollId}`)).catch(() => {});

      console.log('🗑️ Poll deleted:', pollId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting poll:', error);
      throw error;
    }
  },

  // ==================== FILTERING & SEARCH ====================

  async getPollsByCourse(courseId) {
    try {
      const q = query(
        collection(db, POLLS_COLLECTION),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting course polls:', error);
      return [];
    }
  },

  async getPollsByStatus(status) {
    try {
      const q = query(
        collection(db, POLLS_COLLECTION),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting polls by status:', error);
      return [];
    }
  },

  async getPollsByProfessor(professorId) {
    try {
      const q = query(
        collection(db, POLLS_COLLECTION),
        where('professorId', '==', professorId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting professor polls:', error);
      return [];
    }
  },

  async getActivePollByCourse(courseId) {
    try {
      const q = query(
        collection(db, POLLS_COLLECTION),
        where('courseId', '==', courseId),
        where('status', '==', PollStatus.ACTIVE)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return { id: d.id, ...d.data() };
    } catch (error) {
      console.error('Error getting active poll:', error);
      return null;
    }
  },

  async searchPolls(searchTerm) {
    try {
      const allPolls = await this.getAllPolls();
      const term = searchTerm.toLowerCase();
      return allPolls.filter(
        (p) =>
          p.question.toLowerCase().includes(term) ||
          p.courseId.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching polls:', error);
      return [];
    }
  },

  async getPollHistory(courseId) {
    try {
      const q = query(
        collection(db, POLLS_COLLECTION),
        where('courseId', '==', courseId),
        where('status', '==', PollStatus.CLOSED),
        orderBy('endedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error getting poll history:', error);
      return [];
    }
  },

  // ==================== REALTIME FEATURES ====================

  async startLivePoll(pollId, pollData) {
    try {
      await set(ref(realtimeDb, `livePolls/${pollId}`), {
        question: pollData.question,
        options: pollData.options,
        correctOption: pollData.correctOption,
        timer: pollData.timer,
        courseId: pollData.courseId,
        courseName: pollData.courseName,
        professorId: pollData.professorId,
        professorName: pollData.professorName,
        liveStatus: 'active',
        liveStartedAt: Date.now(),
        responses: {},
        responseCount: 0,
      });
      console.log('🎯 Live poll started:', pollId);
      return true;
    } catch (error) {
      console.error('❌ Error starting live poll:', error);
      throw error;
    }
  },

  async stopLivePoll(pollId) {
    try {
      await remove(ref(realtimeDb, `livePolls/${pollId}`));
      console.log('🛑 Live poll stopped:', pollId);
      return true;
    } catch (error) {
      console.error('❌ Error stopping live poll:', error);
      throw error;
    }
  },

  async submitResponse(pollId, studentId, studentName, responseIndex) {
    try {
      const existingRef = ref(realtimeDb, `livePolls/${pollId}/responses/${studentId}`);
      const existingSnap = await get(existingRef);
      if (existingSnap.exists()) {
        throw new Error('You have already submitted a response for this poll.');
      }

      const responseData = {
        studentId,
        studentName,
        response: responseIndex,
        timestamp: Date.now(),
        isCorrect: null,
      };

      await set(existingRef, responseData);

      await addDoc(collection(db, RESPONSES_COLLECTION), {
        pollId,
        ...responseData,
        submittedAt: serverTimestamp(),
      });

      const countRef = ref(realtimeDb, `livePolls/${pollId}/responseCount`);
      const countSnap = await get(countRef);
      await set(countRef, (countSnap.val() || 0) + 1);

      const pollDocRef = doc(db, POLLS_COLLECTION, pollId);
      await updateDoc(pollDocRef, {
        totalResponses: increment(1),
      });

      console.log('📝 Response submitted by:', studentName);
      return true;
    } catch (error) {
      console.error('❌ Error submitting response:', error);
      throw error;
    }
  },

  async getLivePollResults(pollId) {
    try {
      const pollRef = ref(realtimeDb, `livePolls/${pollId}`);
      const snapshot = await get(pollRef);
      const livePoll = snapshot.val();
      if (!livePoll) return null;

      const responses = livePoll.responses || {};
      const total = Object.keys(responses).length;
      const optionCount = livePoll.options ? livePoll.options.length : 4;
      const counts = {};
      for (let i = 0; i < optionCount; i++) counts[i] = 0;

      Object.values(responses).forEach((r) => {
        if (counts[r.response] !== undefined) counts[r.response]++;
      });

      const percentages = {};
      for (let i = 0; i < optionCount; i++) {
        percentages[i] = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
      }

      return {
        pollId,
        question: livePoll.question,
        options: livePoll.options,
        correctOption: livePoll.correctOption,
        totalResponses: total,
        optionCounts: counts,
        percentages,
        responses: Object.values(responses),
      };
    } catch (error) {
      console.error('Error getting live results:', error);
      return null;
    }
  },

  listenToLivePoll(pollId, callback) {
    const pollRef = ref(realtimeDb, `livePolls/${pollId}`);
    return onValue(pollRef, (snapshot) => callback(snapshot.val()));
  },

  listenToLiveResponses(pollId, callback) {
    const responsesRef = ref(realtimeDb, `livePolls/${pollId}/responses`);
    return onValue(responsesRef, (snapshot) => callback(snapshot.val() || {}));
  },

  // ==================== ANALYTICS ====================

  async getPollStats(pollId) {
    try {
      const poll = await this.getPollById(pollId);
      if (!poll) return null;

      const q = query(
        collection(db, RESPONSES_COLLECTION),
        where('pollId', '==', pollId)
      );
      const snapshot = await getDocs(q);
      const responses = snapshot.docs.map((d) => d.data());

      const total = responses.length;
      const optionCount = poll.options ? poll.options.length : 4;
      const counts = {};
      for (let i = 0; i < optionCount; i++) counts[i] = 0;

      let correctCount = 0;
      responses.forEach((r) => {
        if (counts[r.response] !== undefined) counts[r.response]++;
        if (r.response === poll.correctOption) correctCount++;
      });

      const percentages = {};
      for (let i = 0; i < optionCount; i++) {
        percentages[i] = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
      }

      const avgResponseTime =
        responses.length > 0
          ? Math.round(
              responses.reduce((sum, r) => sum + (r.responseTime || 0), 0) /
                responses.length
            )
          : 0;

      return {
        pollId,
        question: poll.question,
        options: poll.options,
        correctOption: poll.correctOption,
        totalResponses: total,
        correctCount,
        correctPercentage: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        optionCounts: counts,
        percentages,
        avgResponseTime,
        responses: responses.slice(0, 50),
      };
    } catch (error) {
      console.error('Error getting poll stats:', error);
      return null;
    }
  },

  async calculateResults(pollId) {
    const stats = await this.getPollStats(pollId);
    if (!stats) return null;

    return {
      pollId,
      questionText: stats.question,
      correctOption: stats.correctOption,
      totalResponses: stats.totalResponses,
      distribution: stats.options.map((optText, idx) => ({
        optionIndex: idx,
        optionText: optText,
        count: stats.optionCounts[idx] || 0,
        percentage: stats.percentages[idx] || 0,
      })),
    };
  },

  // ==================== BATCH OPERATIONS ====================

  async createMultiplePolls(pollsArray) {
    const results = [];
    for (const pollData of pollsArray) {
      try {
        const pollId = await this.createPoll(pollData);
        results.push({ success: true, pollId, data: pollData });
      } catch (error) {
        results.push({ success: false, error: error.message, data: pollData });
      }
    }
    return results;
  },

  async archiveOldPolls(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const allPolls = await this.getAllPolls();
      const oldPolls = allPolls.filter(
        (p) =>
          p.createdAt &&
          new Date(p.createdAt.seconds * 1000) < cutoffDate &&
          p.status === PollStatus.CLOSED
      );

      await Promise.all(
        oldPolls.map((p) => this.updatePoll(p.id, { archived: true }))
      );
      console.log(`📦 Archived ${oldPolls.length} old polls`);
      return oldPolls.length;
    } catch (error) {
      console.error('Error archiving polls:', error);
      throw error;
    }
  },
};

// ── Helper Functions ──

export function validatePollData(pollData) {
  const errors = [];
  if (!pollData.question?.trim()) errors.push('Question is required');
  if (!pollData.options || pollData.options.length < 2) errors.push('At least 2 options are required');
  else if (pollData.options.some((opt) => !opt.trim())) errors.push('All options must have text');
  if (pollData.correctOption === undefined || pollData.correctOption < 0 || pollData.correctOption >= (pollData.options?.length || 0))
    errors.push('Valid correct option index is required');
  if (!pollData.courseId?.trim()) errors.push('Course ID is required');
  if (pollData.timer && (pollData.timer < 10 || pollData.timer > 300)) errors.push('Timer must be between 10 and 300 seconds');
  return { isValid: errors.length === 0, errors };
}

export function formatPollForDisplay(poll) {
  const toDateStr = (ts) => {
    if (!ts) return 'N/A';
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return new Date(ts).toLocaleString();
  };
  return {
    ...poll,
    createdAtFormatted: toDateStr(poll.createdAt),
    startedAtFormatted: poll.startedAt ? toDateStr(poll.startedAt) : 'Not started',
    endedAtFormatted: poll.endedAt ? toDateStr(poll.endedAt) : 'Not ended',
    duration: poll.timer ? `${poll.timer} seconds` : 'No timer',
    optionLetters: poll.options
      ? poll.options.map((opt, idx) => ({
          letter: String.fromCharCode(65 + idx),
          text: opt,
          isCorrect: idx === poll.correctOption,
        }))
      : [],
  };
}

export async function createTestPolls(count = 5) {
  const courses = ['CS310', 'CS101', 'MATH201', 'PHYS101'];
  const professors = [
    { id: 'prof1', name: 'Dr. Smith' },
    { id: 'prof2', name: 'Dr. Johnson' },
    { id: 'prof3', name: 'Prof. Williams' },
  ];
  const testPolls = [];
  for (let i = 1; i <= count; i++) {
    const course = courses[Math.floor(Math.random() * courses.length)];
    const professor = professors[Math.floor(Math.random() * professors.length)];
    testPolls.push({
      question: `Sample Poll Question ${i}: What is ${i} + ${i}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOption: Math.floor(Math.random() * 4),
      courseId: course,
      courseName: `Course ${course}`,
      professorId: professor.id,
      professorName: professor.name,
      timer: [30, 45, 60, 90][Math.floor(Math.random() * 4)],
    });
  }
  const results = await pollDatabase.createMultiplePolls(testPolls);
  console.log(`✅ Created ${results.filter((r) => r.success).length} test polls`);
  return results;
}

export async function initializeDatabase() {
  console.log('🔄 Initializing database...');
  const existingPolls = await pollDatabase.getAllPolls();
  if (existingPolls.length === 0) {
    console.log('📝 No polls found, creating sample data...');
    await createTestPolls(3);
  }
  return true;
}