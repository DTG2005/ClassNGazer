// app/services/userDatabase.js
// Database Init — Users & Courses — Owner: Rishik
//
// Class Diagram:
//   Users { email, password, googleSignin(), registerUser(), logout(), currentUser() }
//   Student extends Users { userName, profilePic }
//   Instructor extends Users { userName, profilePic }
//   Course { courseId, courseName, ta: Array<Student>, createCourse(), joinCourse(), addTa(), removeTa(), addInstructor() }
//
// Course State Diagram:
//   Uninitialized → createCourse() → Active { Staff Management { addTa(), removeTa(), addInstructor() }, Enrollment { joinCourse() } } → Deleted/Archived

import { db } from '../../lib/firebase/init';
import {
  collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, serverTimestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';

const USERS = 'users';
const COURSES = 'courses';

// ═══════════════════════════════════════════
// USER OPERATIONS
// Class: Users { email, password } → extended by Student { userName, profilePic } and Instructor { userName, profilePic }
// ═══════════════════════════════════════════

export const userDatabase = {

  async createUser(uid, { name, email, role, userName, profilePic }) {
    if (!['professor', 'student', 'admin'].includes(role)) throw new Error('Invalid role.');
   // if (!email.endsWith('@iiti.ac.in')) throw new Error('Only @iiti.ac.in emails allowed.');

    const userDoc = {
      name,
      email,
      role,
      userName: userName || name || '',    // Class Diagram: Student/Instructor.userName
      profilePic: profilePic || null,       // Class Diagram: Student/Instructor.profilePic
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, USERS, uid), userDoc);
    return uid;
  },

  async getUserById(uid) {
    const snap = await getDoc(doc(db, USERS, uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async getUserByEmail(email) {
    const q = query(collection(db, USERS), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  },

  async getUsersByRole(role) {
    const q = query(collection(db, USERS), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async updateUser(uid, updates) {
    ['role', 'email', 'createdAt'].forEach(k => delete updates[k]);
    await updateDoc(doc(db, USERS, uid), { ...updates, updatedAt: serverTimestamp() });
    return true;
  },

  async userExists(uid) {
    const snap = await getDoc(doc(db, USERS, uid));
    return snap.exists();
  },
};

// ═══════════════════════════════════════════
// COURSE OPERATIONS
// Class: Course { courseId, courseName, ta: Array<Student>, createCourse(), joinCourse(), addTa(), removeTa(), addInstructor() }
// State: Uninitialized → Active { Staff Management, Enrollment } → Deleted/Archived
// ═══════════════════════════════════════════

export const courseDatabase = {

  // ── createCourse() — State: Uninitialized → Active ──
  async createCourse({ courseName, courseCode, professorId }) {
    if (!courseName?.trim()) throw new Error('Course name is required.');
    if (!courseCode?.trim()) throw new Error('Course code is required.');
    if (!professorId) throw new Error('Professor ID is required.');

    const existing = await this.getCourseByCode(courseCode.trim().toUpperCase());
    if (existing) throw new Error(`Course code "${courseCode}" already exists.`);

    const courseDoc = {
      courseName: courseName.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      professorId,
      instructorIds: [professorId],       // Support multiple instructors
      ta: [],                              // Class Diagram: ta: Array<Student>
      enrolledStudentIds: [],
      status: 'active',                    // State: Active
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COURSES), courseDoc);
    return docRef.id;
  },

  async getCourseById(courseId) {
    const snap = await getDoc(doc(db, COURSES, courseId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  async getCourseByCode(courseCode) {
    const q = query(collection(db, COURSES), where('courseCode', '==', courseCode.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  },

  async getAllCourses() {
    const q = query(collection(db, COURSES), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getCoursesByProfessor(professorId) {
    const q = query(collection(db, COURSES), where('instructorIds', 'array-contains', professorId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getCoursesByStudent(studentId) {
    const q = query(collection(db, COURSES), where('enrolledStudentIds', 'array-contains', studentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async updateCourse(courseId, updates) {
    ['professorId', 'createdAt', 'enrolledStudentIds', 'ta', 'instructorIds'].forEach(k => delete updates[k]);
    await updateDoc(doc(db, COURSES, courseId), { ...updates, updatedAt: serverTimestamp() });
    return true;
  },

  // ── Enrollment substate: enrollStudent() ──
  async enrollStudent(courseId, studentId) {
    const course = await this.getCourseById(courseId);
    if (!course) throw new Error('Course not found.');
    if (course.enrolledStudentIds?.includes(studentId)) throw new Error('Student already enrolled.');
    await updateDoc(doc(db, COURSES, courseId), { enrolledStudentIds: arrayUnion(studentId), updatedAt: serverTimestamp() });
    return true;
  },

  // ── Enrollment substate: removeStudent() ──
  async removeStudent(courseId, studentId) {
    await updateDoc(doc(db, COURSES, courseId), { enrolledStudentIds: arrayRemove(studentId), updatedAt: serverTimestamp() });
    return true;
  },

  // ── Enrollment substate: joinCourse() — Student self-joins by course code ──
  // Class Diagram: Course.joinCourse()
  // Course State Diagram: Enrollment { Open → joinCourse() }
  async joinCourse(courseCode, studentId) {
    const course = await this.getCourseByCode(courseCode);
    if (!course) throw new Error(`Course "${courseCode}" not found.`);
    if (course.status !== 'active') throw new Error('Course is not active.');
    if (course.enrolledStudentIds?.includes(studentId)) throw new Error('You are already enrolled in this course.');
    await updateDoc(doc(db, COURSES, course.id), { enrolledStudentIds: arrayUnion(studentId), updatedAt: serverTimestamp() });
    return course;
  },

  // ── Staff Management substate: addTa() ──
  // Class Diagram: Course.addTa()
  // Course State Diagram: Staff Management { Staffing → addTa() }
  async addTa(courseId, studentId) {
    const course = await this.getCourseById(courseId);
    if (!course) throw new Error('Course not found.');
    if (course.ta?.includes(studentId)) throw new Error('Student is already a TA.');
    // TA must be an enrolled student
    if (!course.enrolledStudentIds?.includes(studentId)) throw new Error('Student must be enrolled in the course first.');
    await updateDoc(doc(db, COURSES, courseId), { ta: arrayUnion(studentId), updatedAt: serverTimestamp() });
    return true;
  },

  // ── Staff Management substate: removeTa() ──
  // Class Diagram: Course.removeTa()
  async removeTa(courseId, studentId) {
    await updateDoc(doc(db, COURSES, courseId), { ta: arrayRemove(studentId), updatedAt: serverTimestamp() });
    return true;
  },

  // ── Staff Management substate: addInstructor() ──
  // Class Diagram: Course.addInstructor()
  // Course State Diagram: Staff Management { Staffing → addInstructor() }
  async addInstructor(courseId, professorId) {
    const course = await this.getCourseById(courseId);
    if (!course) throw new Error('Course not found.');
    if (course.instructorIds?.includes(professorId)) throw new Error('Professor is already an instructor.');
    // Verify the user is actually a professor
    const user = await userDatabase.getUserById(professorId);
    if (!user || user.role !== 'professor') throw new Error('User is not a professor.');
    await updateDoc(doc(db, COURSES, courseId), { instructorIds: arrayUnion(professorId), updatedAt: serverTimestamp() });
    return true;
  },

  // ── Remove instructor ──
  async removeInstructor(courseId, professorId) {
    const course = await this.getCourseById(courseId);
    if (!course) throw new Error('Course not found.');
    if (course.professorId === professorId) throw new Error('Cannot remove the course creator.');
    await updateDoc(doc(db, COURSES, courseId), { instructorIds: arrayRemove(professorId), updatedAt: serverTimestamp() });
    return true;
  },

  // ── Delete course — State: Active → Deleted/Archived ──
  async deleteCourse(courseId) {
    await deleteDoc(doc(db, COURSES, courseId));
    return true;
  },

  // ── Archive course ──
  async archiveCourse(courseId) {
    await updateDoc(doc(db, COURSES, courseId), { status: 'archived', updatedAt: serverTimestamp() });
    return true;
  },
};