import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// ⚠️  REMPLACE CES VALEURS par celles de ta console Firebase
//     (Firebase Console → ton projet → ⚙️ Project settings → Your apps)
const firebaseConfig = {
  apiKey: "AIzaSyAVyyCQofC0SEdFYD_qDi6V_X9HewpYbBM",
  authDomain: "murcia2026-72651.firebaseapp.com",
  projectId: "murcia2026-72651",
  storageBucket: "murcia2026-72651.firebasestorage.app",
  messagingSenderId: "264970258962",
  appId: "1:264970258962:web:415059ce2632f15ccbe6cb"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// Wrapper qui imite l'API window.storage de Claude
export const storage = {
  get: async (key) => {
    try {
      const safeKey = key.replace(/[:/]/g, "_");
      const snap = await getDoc(doc(db, "murcia2026", safeKey));
      return snap.exists() ? { value: snap.data().value } : null;
    } catch (e) {
      console.error("Firebase get error:", e);
      return null;
    }
  },
  set: async (key, value) => {
    try {
      const safeKey = key.replace(/[:/]/g, "_");
      await setDoc(doc(db, "murcia2026", safeKey), { value });
      return { key, value };
    } catch (e) {
      console.error("Firebase set error:", e);
      return null;
    }
  },
};
