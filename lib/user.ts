import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Get all users, optional filter by role
export async function getAllUsers(role?: string) {
  const q = query(collection(db, "users"));
  const snapshot = await getDocs(q);

  const users: { uid: string; name: string; email: string; role: string }[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data() as any;
    if (!role || data.role === role) {
      users.push({ uid: doc.id, ...data });
    }
  });

  return users;
}

// Get current logged-in user data
export async function getUserData() {
  const { auth } = await import("./firebase");
  const user = auth.currentUser;
  if (!user) return null;

  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}
