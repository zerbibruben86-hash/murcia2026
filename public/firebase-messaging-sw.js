// Service Worker FCM — doit être à la racine pour que Firebase Messaging fonctionne
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyAVyyCQofC0SEdFYD_qDi6V_X9HewpYbBM",
  authDomain:        "murcia2026-72651.firebaseapp.com",
  projectId:         "murcia2026-72651",
  storageBucket:     "murcia2026-72651.firebasestorage.app",
  messagingSenderId: "264970258962",
  appId:             "1:264970258962:web:415059ce2632f15ccbe6cb",
});

const messaging = firebase.messaging();

// Clic sur la notification → deep-link vers l'action dans l'app
self.addEventListener("notificationclick", e => {
  e.notification.close();

  // Récupère le lien depuis les data (plusieurs structures possibles selon FCM)
  const data = e.notification.data || {};
  const link = data.link
    || data.FCM_MSG?.data?.link
    || "/";

  e.waitUntil((async () => {
    // 1. Écrit l'action dans le Cache API → lisible par l'app quand elle reprend
    try {
      const cache = await caches.open("murcia-notif-action");
      await cache.put("/pending-action", new Response(
        JSON.stringify({ link, ts: Date.now() }),
        { headers: { "Content-Type": "application/json" } }
      ));
    } catch {}

    // 2. BroadcastChannel → app ouverte en arrière-plan l'entend immédiatement
    try {
      const bc = new BroadcastChannel("murcia-notif");
      bc.postMessage({ type: "notif-click", link });
      bc.close();
    } catch {}

    // 3. clients.matchAll → postMessage direct si la fenêtre est accessible
    const list = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = list.find(c => c.url.includes(self.location.origin));
    if (existing) {
      await existing.focus();
      try { existing.postMessage({ type: "notif-click", link }); } catch {}
      return;
    }

    // 4. App complètement fermée → ouvre directement sur le bon lien
    return clients.openWindow(link);
  })());
});
