import { db, realtimeDb } from '../../lib/firebase/init';
import {
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, increment,
} from 'firebase/firestore';
import { ref, set, remove, onValue, get } from 'firebase/database';

// ========== QUIZ DATABASE SERVICE ==========

export const quizDatabase = {

  // ── Utility: strip undefined from nested objects ──
  _clean(obj) {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(v => this._clean(v));
    const out = {};
    for (const k in obj) { if (obj[k] !== undefined) out[k] = this._clean(obj[k]); }
    return out;
  },

  // ── Create Quiz ──
  async createQuiz(data) {
    try {
      const totalMarks = (data.questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0);
      const quizDoc = {
        title:            data.title?.trim() || 'Untitled Quiz',
        courseId:         data.courseId || '',
        courseName:       data.courseName || '',
        professorId:      data.professorId || '',
        professorName:    data.professorName || '',
        status:           'draft',
        timer:            Number(data.timer) || 600,        // global quiz timer in seconds
        negativeMarking:  data.negativeMarking || false,
        shuffleQuestions: data.shuffleQuestions || false,
        shuffleOptions:   data.shuffleOptions || false,
        questions:        data.questions || [],             // see schema below
        totalMarks,
        totalSubmissions: 0,
        createdAt:        serverTimestamp(),
        createdAtMs:      Date.now(),
        updatedAt:        serverTimestamp(),
        startedAt:        null,
        endedAt:          null,
      };
      /* Question schema:
        {
          text: string,
          questionImage: string|null,
          options: [{text, image}],
          correctOptions: number[],   // 0-indexed option indices
          marks: number,
          negativeMarks: number,      // marks deducted per wrong answer (0 if no penalty)
          solution: string,
          solutionImage: string|null,
        }
      */
      const ref_ = await addDoc(collection(db, 'quizzes'), this._clean(quizDoc));
      return ref_.id;
    } catch (e) { console.error('createQuiz:', e); throw e; }
  },

  // ── Get single quiz ──
  async getQuizById(quizId) {
    try {
      const snap = await getDoc(doc(db, 'quizzes', quizId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (e) { console.error(e); return null; }
  },

  // ── Get all quizzes for a course ──
  async getQuizzesByCourse(courseId) {
    try {
      const q = query(
        collection(db, 'quizzes'),
        where('courseId', '==', courseId),
        orderBy('createdAt', 'desc'),
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.error(e); return []; }
  },

  // ── Update quiz fields ──
  async updateQuiz(quizId, updates) {
    try {
      const safe = this._clean({ ...updates, updatedAt: serverTimestamp() });
      delete safe.createdAt;
      delete safe.professorId;
      await updateDoc(doc(db, 'quizzes', quizId), safe);
      return true;
    } catch (e) { console.error(e); throw e; }
  },

  // ── Update quiz status (draft → active → closed) ──
  async updateQuizStatus(quizId, newStatus) {
    try {
      const quiz = await this.getQuizById(quizId);
      if (!quiz) throw new Error('Quiz not found');
      if (newStatus === 'active'  && quiz.status !== 'draft')  throw new Error('Quiz must be in draft to start');
      if (newStatus === 'closed'  && quiz.status !== 'active') throw new Error('Quiz is not active');

      const update = { status: newStatus, updatedAt: serverTimestamp() };
      if (newStatus === 'active') update.startedAt = serverTimestamp();
      if (newStatus === 'closed') update.endedAt   = serverTimestamp();
      await updateDoc(doc(db, 'quizzes', quizId), update);

      if (newStatus === 'active') {
        await set(ref(realtimeDb, `liveQuizzes/${quizId}`), {
          liveStatus:     'active',
          liveStartedAt:  Date.now(),
          timer:          quiz.timer,
          courseId:       quiz.courseId,
          submissions:    {},
          submissionCount: 0,
        });
      }

      if (newStatus === 'closed') {
        // Sync final submission count before removing live data
        try {
          const snap = await get(ref(realtimeDb, `liveQuizzes/${quizId}`));
          const live = snap.val();
          if (live?.submissionCount) {
            await updateDoc(doc(db, 'quizzes', quizId), {
              totalSubmissions: live.submissionCount,
            });
          }
        } catch (e) { console.error('Sync submissions on close:', e); }
        await remove(ref(realtimeDb, `liveQuizzes/${quizId}`)).catch(() => {});
      }

      return true;
    } catch (e) { console.error(e); throw e; }
  },

  // ── Delete quiz (and its responses) ──
  async deleteQuiz(quizId) {
    try {
      const quiz = await this.getQuizById(quizId);
      if (quiz?.status === 'active') throw new Error('Cannot delete an active quiz');
      await deleteDoc(doc(db, 'quizzes', quizId));
      await remove(ref(realtimeDb, `liveQuizzes/${quizId}`)).catch(() => {});
      // delete responses
      const resSnap = await getDocs(
        query(collection(db, 'quizResponses'), where('quizId', '==', quizId))
      );
      await Promise.all(resSnap.docs.map(d => deleteDoc(d.ref)));
      return true;
    } catch (e) { console.error(e); throw e; }
  },

  // ── Evaluate answers against quiz ──
  // answers = array of arrays: answers[questionIndex] = [selectedOptionIndex, ...]
  // If a question was skipped, pass [] (empty array)
  evaluateAnswers(quiz, answers) {
    let totalScore = 0;
    const perQuestion = [];

    for (let i = 0; i < quiz.questions.length; i++) {
      const q          = quiz.questions[i];
      const userArr    = (answers[i] || []).map(Number);
      const correctSet = new Set((q.correctOptions || []).map(Number));
      const userSet    = new Set(userArr);

      let isCorrect    = false;
      let marksAwarded = 0;

      if (userSet.size > 0) {
        // Exact-match: all correct options chosen, no wrong ones
        isCorrect = userSet.size === correctSet.size &&
                    [...userSet].every(x => correctSet.has(x));

        if (isCorrect) {
          marksAwarded = Number(q.marks) || 0;
        } else if (quiz.negativeMarking) {
          // Use per-question negativeMarks; fall back to 0 if not set
          const deduction = Number(q.negativeMarks) || 0;
          marksAwarded = -deduction;
        }
      }

      totalScore += marksAwarded;
      perQuestion.push({ answered: userArr, isCorrect, marksAwarded });
    }

    return { totalScore, perQuestion };
  },

  // ── Submit student quiz response ──
  async submitQuizResponse(quizId, studentId, studentName, answers, quiz) {
    try {
      // Guard: prevent duplicate submission
      const existing = await getDocs(
        query(collection(db, 'quizResponses'),
          where('quizId',    '==', quizId),
          where('studentId', '==', studentId))
      );
      if (!existing.empty) throw new Error('already_submitted');

      const { totalScore, perQuestion } = this.evaluateAnswers(quiz, answers);

      const responseDoc = this._clean({
        quizId,
        studentId,
        studentName,
        answers: Object.fromEntries(answers.map((a, i) => [i, a])), // avoid nested arrays for simple index query
        score: totalScore,
        perQuestion,
        submittedAt:   serverTimestamp(),
        submittedAtMs: Date.now(),
      });

      await addDoc(collection(db, 'quizResponses'), responseDoc);

      // Update Realtime DB to notify professor of new submit
      await set(ref(realtimeDb, `liveQuizzes/${quizId}/submissions/${studentId}`), true);
      const cntRef  = ref(realtimeDb, `liveQuizzes/${quizId}/submissionCount`);
      const cntSnap = await get(cntRef);
      await set(cntRef, (cntSnap.val() || 0) + 1);

      // Firestore counter (best-effort)
      await updateDoc(doc(db, 'quizzes', quizId), { totalSubmissions: increment(1) }).catch(() => {});

      // Remove locally-saved draft
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`quiz-draft-${quizId}-${studentId}`);
      }

      return { totalScore, perQuestion };
    } catch (e) { 
      if (e.message !== 'already_submitted') console.error(e); 
      throw e; 
    }
  },

  // ── Check if student already submitted ──
  async getStudentResponse(quizId, studentId) {
    try {
      const snap = await getDocs(
        query(collection(db, 'quizResponses'),
          where('quizId',    '==', quizId),
          where('studentId', '==', studentId))
      );
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) { return null; }
  },

  // ── Get all results for a quiz (sorted by score desc) ──
  async getQuizResults(quizId) {
    try {
      const snap = await getDocs(
        query(collection(db, 'quizResponses'), where('quizId', '==', quizId))
      );
      const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return results.sort((a, b) => (b.score || 0) - (a.score || 0));
    } catch (e) { console.error(e); return []; }
  },

  // ── Realtime listeners ──
  listenToLiveQuiz(quizId, callback) {
    return onValue(ref(realtimeDb, `liveQuizzes/${quizId}`), snap => callback(snap.val()));
  },
  listenToLiveQuizzes(callback) {
    return onValue(ref(realtimeDb, 'liveQuizzes'), snap => callback(snap.val() || {}));
  },
  listenToLiveQuizSubmissions(quizId, callback) {
    return onValue(ref(realtimeDb, `liveQuizzes/${quizId}/submissionCount`), snap => callback(snap.val() || 0));
  },

  // ── Export results as CSV ──
  async exportQuizCSV(quizId) {
    const quiz    = await this.getQuizById(quizId);
    if (!quiz) throw new Error('Quiz not found');
    const results = await this.getQuizResults(quizId);

    const esc      = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const qHeaders = quiz.questions.map((q, i) => esc(`Q${i + 1} (${q.marks}m)`));

    const header = [esc('Rank'), esc('Student ID'), esc('Student Name'), ...qHeaders,
                    esc(`Total Score`), esc(`Max (${quiz.totalMarks})`), esc('Percentage')].join(',');

    const rows = results.map((r, rank) => {
      const perQ = r.perQuestion || [];
      const qCols = quiz.questions.map((_, i) => {
        const pq = perQ[i];
        if (!pq || pq.answered?.length === 0) return esc('—');
        return pq.isCorrect ? esc(`+${pq.marksAwarded}`) : esc(pq.marksAwarded < 0 ? pq.marksAwarded : 0);
      });
      const pct = quiz.totalMarks > 0 ? ((r.score / quiz.totalMarks) * 100).toFixed(1) + '%' : '—';
      return [esc(rank + 1), esc(r.studentId), esc(r.studentName || 'Anonymous'),
              ...qCols, esc(r.score), esc(quiz.totalMarks), esc(pct)].join(',');
    });

    return '\uFEFF' + [header, ...rows].join('\n');
  },

  downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async downloadQuizCSV(quizId, title) {
    const csv = await this.exportQuizCSV(quizId);
    this.downloadFile(csv, `quiz-${title || quizId}-results.csv`);
  },
};
