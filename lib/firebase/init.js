import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "./config";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const db = getFirestore(app);          // Firestore Database
export const realtimeDb = getDatabase(app);   // Realtime Database
export const auth = getAuth(app);            // Authentication

export default app;