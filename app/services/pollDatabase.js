// app/services/pollDatabase.js
import { db, realtimeDb } from '../../lib/firebase/init';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';

export const pollDatabase = {
  // Get all polls
  async getAllPolls() {
    try {
      const querySnapshot = await getDocs(collection(db, "polls"));
      const polls = [];
      querySnapshot.forEach((doc) => {
        polls.push({ id: doc.id, ...doc.data() });
      });
      return polls;
    } catch (error) {
      console.error("Error getting polls:", error);
      return [];
    }
  },

  // Create new poll
  async createPoll(pollData) {
    try {
      const docRef = await addDoc(collection(db, "polls"), {
        ...pollData,
        status: "draft",
        createdAt: new Date(),
        totalResponses: 0
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating poll:", error);
      throw error;
    }
  }
};

// Create test polls
export async function createTestPolls() {
  const testPolls = [
    {
      question: "What is 2+2?",
      options: ["3", "4", "5", "6"],
      correctOption: 1,
      courseId: "CS310",
      professorId: "test-prof",
      timer: 60,
      status: "draft"
    },
    {
      question: "Capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctOption: 2,
      courseId: "CS310",
      professorId: "test-prof", 
      timer: 45,
      status: "active"
    }
  ];
  
  for (const poll of testPolls) {
    await pollDatabase.createPoll(poll);
  }
  console.log("Test polls created");
  return true;
}