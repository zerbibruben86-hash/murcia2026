import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// ⚠️  REMPLACE CES VALEURS par celles de ta console Firebase
const firebaseConfig = {
  apiKey:            "AIzaSyAVyyCQofC0SEdFYD_qDi6V_X9HewpYbBM",
  authDomain:        "murcia2026-72651.firebaseapp.com",
  projectId:         "murcia2026-72651",
  storageBucket:     "murcia2026-72651.firebasestorage.app",
  messagingSenderId: "264970258962",
  appId:             "1:264970258962:web:415059ce2632f15ccbe6cb",
};

// Vérifie si les clés sont configurées
const isConfigured = !firebaseConfig.apiKey.includes("COLLE_TON");

let db = null;
if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch(e) {
    console.warn("Firebase init failed, using localStorage fallback:", e);
  }
}

// Wrapper : utilise Firebase si dispo, sinon localStorage
export const storage = {
  get: async (key) => {
    const safeKey = key.replace(/[:/]/g, "_");
    // Essaie Firebase
    if (db) {
      try {
        const snap = await getDoc(doc(db, "murcia2026", safeKey));
        if (snap.exists()) return { value: snap.data().value };
      } catch(e) { console.warn("Firebase get failed:", e); }
    }
    // Fallback localStorage
    try {
      const v = localStorage.getItem("colo_" + safeKey);
      return v ? { value: v } : null;
    } catch { return null; }
  },

  set: async (key, value) => {
    const safeKey = key.replace(/[:/]/g, "_");
    // Essaie Firebase
    if (db) {
      try {
        await setDoc(doc(db, "murcia2026", safeKey), { value });
      } catch(e) { console.warn("Firebase set failed:", e); }
    }
    // Fallback (et backup local)
    try { localStorage.setItem("colo_" + safeKey, value); } catch {}
    return { key, value };
  },
};
