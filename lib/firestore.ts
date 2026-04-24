// @ts-nocheck
// lib/firestore.ts
// Adapter layer: maps the Addition's function signatures to ClassNGazer's existing services.
// The Addition pages import from 'lib/firestore' — this file satisfies those imports.

import { db } from './firebase/init';
import {
  collection, query, where, getDocs, doc, getDoc, updateDoc,
  addDoc, deleteDoc, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { courseDatabase } from '../app/services/userDatabase';
import { pollDatabase } from '../app/services/pollDatabase';

// ── Helpers ──────────────────────────────────────────────────────

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Course functions ─────────────────────────────────────────────

export async function createCourse({ title, code, teacherId, teacherName }) {
  // Generate a unique 6-char join code
  let joinCode = generateJoinCode();
  // Make sure it's unique (unlikely collision but be safe)
  let existing = await getCourseByJoinCode(joinCode);
  let attempts = 0;
  while (existing && attempts < 10) {
    joinCode = generateJoinCode();
    existing = await getCourseByJoinCode(joinCode);
    attempts++;
  }

  // Use ClassNGazer's courseDatabase to create
  const courseId = await courseDatabase.createCourse({
    courseName: title,
    courseCode: code,
    professorId: teacherId,
  });

  // Add the joinCode and teacherName to the document
  await updateDoc(doc(db, 'courses', courseId), {
    joinCode,
    teacherName: teacherName || '',
  });

  return { id: courseId, joinCode };
}

export async function getTeacherCourses(teacherId) {
  const courses = await courseDatabase.getCoursesByProfessor(teacherId);
  // Normalize field names: ClassNGazer uses {courseName, courseCode}, Addition expects {title, code}
  return courses.map(c => ({
    ...c,
    title: c.courseName || c.title || '',
    code: c.courseCode || c.code || '',
    students: c.enrolledStudentIds || [],
    joinCode: c.joinCode || '—',
  }));
}

export async function getStudentCourses(studentId) {
  const courses = await courseDatabase.getCoursesByStudent(studentId);
  return courses.map(c => ({
    ...c,
    title: c.courseName || c.title || '',
    code: c.courseCode || c.code || '',
    students: c.enrolledStudentIds || [],
    joinCode: c.joinCode || '—',
  }));
}

export async function getCourse(courseId) {
  const c = await courseDatabase.getCourseById(courseId);
  if (!c) return null;
  return {
    ...c,
    title: c.courseName || c.title || '',
    code: c.courseCode || c.code || '',
    students: c.enrolledStudentIds || [],
    joinCode: c.joinCode || '—',
  };
}

export async function deleteCourse(courseId) {
  return courseDatabase.deleteCourse(courseId);
}

// ── Join Code lookup ─────────────────────────────────────────────

async function getCourseByJoinCode(joinCode) {
  const q = query(collection(db, 'courses'), where('joinCode', '==', joinCode.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function joinCourseByJoinCode(joinCode, studentId) {
  const course = await getCourseByJoinCode(joinCode);
  if (!course) throw new Error(`No course found with join code "${joinCode}".`);
  if (course.status !== 'active') throw new Error('This course is not active.');
  if (course.enrolledStudentIds?.includes(studentId)) throw new Error('You are already enrolled in this course.');
  await courseDatabase.enrollStudent(course.id, studentId);
  return {
    ...course,
    title: course.courseName || course.title || '',
    code: course.courseCode || course.code || '',
  };
}

// ── Poll functions ───────────────────────────────────────────────

export async function getCoursePolls(courseId) {
  const polls = await pollDatabase.getPollsByCourse(courseId);
  // Normalize: ClassNGazer stores count as {0: n, 1: m}, Addition expects responses as {0: n, 1: m}
  return polls.map(p => ({
    ...p,
    responses: p.count || {},
    status: p.status === 'closed' ? 'ended' : p.status,
    correctOption: p.correctOption ?? 0,
  }));
}

export async function createPoll({ courseId, teacherId, question, options, timer, correctOption }) {
  // Get course info to pass courseName
  const course = await courseDatabase.getCourseById(courseId);
  return pollDatabase.createPoll({
    question,
    options,
    correctOption: correctOption ?? 0,
    correctOptions: [correctOption ?? 0],
    timer: timer || 60,
    courseId,
    courseName: course?.courseName || '',
    professorId: teacherId,
    professorName: '',
  });
}

export async function startPoll(courseId, pollId) {
  return pollDatabase.updatePollStatus(pollId, 'active');
}

export async function endPoll(courseId, pollId) {
  return pollDatabase.updatePollStatus(pollId, 'closed');
}

export async function autoEndPoll(courseId, pollId) {
  try {
    return await pollDatabase.updatePollStatus(pollId, 'closed');
  } catch (e) {
    // Ignore if already closed (race condition with manual close)
    if (!e.message?.includes('Cannot close')) throw e;
  }
}
