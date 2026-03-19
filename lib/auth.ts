import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

const provider = new GoogleAuthProvider();

export type UserRole = "student" | "teacher" | "ta";

export interface UserData {
  name: string;
  email: string;
  role: UserRole;
  enrolledCourses: string[];
  createdAt: Date;
}

export async function signInWithGoogleRedirect() {
  await signInWithRedirect(auth, provider);
}

// Step 1: Check if user exists after redirect
export async function handleRedirectResult(): Promise<{
  isNewUser: boolean;
  user: any;
  userData?: UserData;
} | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;

  const user = result.user;
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    // Existing user — return their stored data
    return { isNewUser: false, user, userData: snap.data() as UserData };
  }

  // New user — role not set yet
  return { isNewUser: true, user };
}

// Step 2: Called after new user selects a role
export async function saveUserRole(
  uid: string,
  role: UserRole,
  name: string,
  email: string
) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    name,
    email,
    role,
    enrolledCourses: [],
    createdAt: new Date()
  });
}