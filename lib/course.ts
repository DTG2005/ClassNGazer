import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db, auth } from "./firebase";

// Fetch courses created by current teacher
export async function getTeacherCourses() {
  const user = auth.currentUser;
  if (!user) return [];

  const q = query(collection(db, "courses"), where("teacherId", "==", user.uid));
  const snapshot = await getDocs(q);

  const courses: { id: string; title: string }[] = [];
  snapshot.forEach((doc) => {
    courses.push({ id: doc.id, ...(doc.data() as any) });
  });

  return courses;
}

// Create new course
export async function createCourse(title: string) {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(collection(db, "courses"), {
    title,
    teacherId: user.uid,
    students: [],
    tas: [],
    createdAt: new Date()
  });
}

// Add/remove student
export async function addStudent(courseId: string, studentId: string) {
  const courseRef = doc(db, "courses", courseId);
  await updateDoc(courseRef, {
    students: arrayUnion(studentId)
  });
}
export async function removeStudent(courseId: string, studentId: string) {
  const courseRef = doc(db, "courses", courseId);
  await updateDoc(courseRef, {
    students: arrayRemove(studentId)
  });
}

// Add/remove TA
export async function addTA(courseId: string, taId: string) {
  const courseRef = doc(db, "courses", courseId);
  await updateDoc(courseRef, {
    tas: arrayUnion(taId)
  });
}
export async function removeTA(courseId: string, taId: string) {
  const courseRef = doc(db, "courses", courseId);
  await updateDoc(courseRef, {
    tas: arrayRemove(taId)
  });
}
