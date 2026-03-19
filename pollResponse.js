import { db } from "./firebase"; // your config
import { doc, setDoc } from "firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";

export const storePollResponse = async (studentId, pollId, responses) => {
  try {
    const ref = doc(db, "pollResponses", `${pollId}_${studentId}`);

    await setDoc(ref, {
      studentId,
      pollId,
      responses, // array of selected options
      submittedAt: new Date()
    });

    console.log("Response stored");
  } catch (error) {
    console.error("Error storing response:", error);
  }
};

export const getPollResults = async (pollId) => {
  try {
    const q = query(
      collection(db, "pollResponses"),
      where("pollId", "==", pollId)
    );

    const snapshot = await getDocs(q);

    const results = snapshot.docs.map(doc => doc.data());

    return results;
  } catch (error) {
    console.error("Error fetching results:", error);
    return [];
  }
};