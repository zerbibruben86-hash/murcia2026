import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, increment, query, orderBy } from "firebase/firestore";
import { getStorage, ref, uploadString, uploadBytes, getDownloadURL } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

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

let _db  = null;
let _st  = null;
let _msg = null;
let app  = null;
if (isConfigured) {
  try {
    app  = initializeApp(firebaseConfig);
    _db  = getFirestore(app);
    _st  = getStorage(app);
    // FCM n'est disponible que dans un contexte browser avec SW supporté
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      try {
        _msg = getMessaging(app);
        console.info("[firebase] ✅ messaging initialisé");
      } catch(e) {
        console.warn("[firebase] ⚠️ getMessaging échoué:", e.message);
      }
    } else {
      console.info("[firebase] ℹ️ messaging ignoré (pas de SW ou hors browser)");
    }
  } catch(e) {
    console.warn("Firebase init failed, using localStorage fallback:", e);
  }
}

export const db              = _db;
export const firebaseStorage = _st;
export const messaging       = _msg;

/**
 * Upload une data-URL base64 vers Firebase Storage.
 * Retourne l'URL publique CDN du fichier.
 */
export const uploadPhotoToStorage = async (base64DataUrl, storagePath) => {
  if (!_st) throw new Error("Firebase Storage non disponible");
  const storageRef = ref(_st, storagePath);
  await uploadString(storageRef, base64DataUrl, "data_url");
  return getDownloadURL(storageRef);
};

/**
 * Upload un fichier binaire (File/Blob) vers Firebase Storage.
 * Retourne l'URL publique CDN du fichier.
 */
export const uploadFileToStorage = async (file, storagePath) => {
  if (!_st) throw new Error("Firebase Storage non disponible");
  const storageRef = ref(_st, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
};

// Wrapper : utilise Firebase si dispo, sinon localStorage
export const storage = {
  get: async (key) => {
    const safeKey = key.replace(/[:/]/g, "_");
    // Essaie Firebase
    if (_db) {
      try {
        const snap = await getDoc(doc(_db, "murcia2026", safeKey));
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
    // Backup localStorage (toujours, même si Firebase échoue)
    try { localStorage.setItem("colo_" + safeKey, value); } catch {}
    // Firebase — propage l'erreur pour que l'appelant sache si ça a échoué
    if (_db) {
      await setDoc(doc(_db, "murcia2026", safeKey), { value });
    }
    return { key, value };
  },
};
