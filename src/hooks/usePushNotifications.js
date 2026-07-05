import { useEffect, useRef, useState, useCallback } from "react";
import { getToken, onMessage, getMessaging } from "firebase/messaging";
import { getApp } from "firebase/app";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { messaging as _messagingInit, db } from "../firebase";

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || "BFWvHlODbprqYTKdEWbA2CvnOCC9NdnR9hnm3SCz-I4s2rcIhNl8X_os9-lx464ksz9bTT5B2DsHFTw9Y0D9g6E";

// ID stable par appareil
function getDeviceId() {
  let id = localStorage.getItem("_murcia_device_id");
  if (!id) {
    id = (crypto.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now().toString(36)));
    localStorage.setItem("_murcia_device_id", id);
  }
  return id;
}

// Messaging peut être initialisé tardivement (après user gesture sur iOS)
function getMessagingInstance() {
  if (_messagingInit) return _messagingInit;
  try {
    const m = getMessaging(getApp());
    console.info("[push] messaging initialisé tardivement ✅");
    return m;
  } catch(e) {
    console.warn("[push] getMessaging lazy échoué:", e.message);
    return null;
  }
}

export async function registerPushToken(user) {
  const messaging = getMessagingInstance();
  console.info("[push] registerPushToken → messaging:", !!messaging, "| db:", !!db, "| VAPID:", VAPID_KEY ? VAPID_KEY.slice(0,12)+"…" : "VIDE");
  if (!messaging || !db) {
    console.warn("[push] messaging ou db indispo");
    return false;
  }
  if (!VAPID_KEY) {
    console.warn("[push] VAPID_KEY manquant (VITE_FCM_VAPID_KEY non défini)");
    return false;
  }
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) { console.warn("[push] getToken a retourné null"); return false; }

    const deviceId = getDeviceId();
    const userKey  = `${user.fn.toLowerCase()}_${user.ln.toLowerCase()}`;
    await setDoc(doc(db, "pushTokens", deviceId), {
      token, userId: userKey, role: user.role, fn: user.fn,
      updatedAt: new Date().toISOString(),
    });
    console.info("[push] ✅ token enregistré pour", userKey);
    return true;
  } catch (e) {
    console.error("[push] ❌ échec :", e.message);
    return false;
  }
}

async function unregisterToken() {
  if (!db) return;
  try { await deleteDoc(doc(db, "pushTokens", getDeviceId())); } catch {}
}

// Hook principal — retourne { showBanner, requestPermission }
export function usePushNotifications(currentUser) {
  const prevKeyRef   = useRef(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      if (prevKeyRef.current) { unregisterToken(); prevKeyRef.current = null; }
      setShowBanner(false);
      return;
    }

    const userKey = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;

    // Si déjà accordé → enregistre silencieusement, pas de bannière
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      if (prevKeyRef.current !== userKey) {
        prevKeyRef.current = userKey;
        registerPushToken(currentUser);
      }
      return;
    }

    // Navigateur sans support notif → rien
    if (typeof Notification === "undefined") return;

    // Si bloqué par le navigateur → on ne peut rien faire
    if (Notification.permission === "denied") return;

    // "default" → toujours afficher la bannière à chaque démarrage
    // Pas de ✕ = la bannière reste jusqu'à ce que l'utilisateur accepte
    prevKeyRef.current = userKey;
    const t = setTimeout(() => setShowBanner(true), 1500);
    return () => clearTimeout(t);
  }, [currentUser?.fn, currentUser?.ln]);

  // Appelée quand l'utilisateur clique "Activer" dans la bannière
  const requestPermission = useCallback(async () => {
    setShowBanner(false);
    if (!currentUser) return;
    try {
      const perm = await Notification.requestPermission();
      console.info("[push] permission:", perm, "| messaging:", !!getMessagingInstance(), "| VAPID:", VAPID_KEY ? VAPID_KEY.slice(0,12)+"…" : "VIDE");
      if (perm === "granted") {
        const ok = await registerPushToken(currentUser);
        if (!ok) alert("⚠️ Notifications : permission OK mais enregistrement échoué.\nVérifie la console.");
      }
    } catch (e) {
      console.warn("[push] requestPermission error:", e.message);
      alert("⚠️ Erreur notifications : " + e.message);
    }
  }, [currentUser]);

  // Messages au premier plan
  useEffect(() => {
    const messaging = getMessagingInstance();
    if (!messaging || !currentUser) return;
    const unsub = onMessage(messaging, payload => {
      const n = payload.notification || payload.data || {};
      if (!n.title) return;
      if (Notification.permission === "granted") {
        try { new Notification(n.title, { body: n.body || "", icon: "/icons/icon-192.png" }); } catch {}
      }
    });
    return () => unsub();
  }, [currentUser?.fn]);

  return { showBanner, setShowBanner, requestPermission };
}
