import { createContext, useState, useEffect, useRef, useMemo } from "react";
import { storage, db, firebaseStorage, uploadPhotoToStorage } from "../firebase";
import { usePushNotifications } from "../hooks/usePushNotifications";
import {
  collection, addDoc, getDocs, getDoc, deleteDoc, doc as fsDoc,
  setDoc, updateDoc, increment, query, orderBy, onSnapshot, limit, startAfter, where,
} from "firebase/firestore";
import { compressImage, avgRating, DEFAULTS, DEF_CFG, DEFAULT_PWD, PALETTE, normalize, findFuzzyMatch } from "../utils/helpers";

export const AppContext = createContext(null);

export function AppProvider({ children: appChildren }) {
  /* ── navigation ─────────────────────────────────────────────────────── */
  const [page,     setPage]     = useState("home");
  const [prevPage, setPrevPage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  /* ── data ────────────────────────────────────────────────────────────── */
  const [acts,     setActs]     = useState([]);
  const [regs,     setRegs]     = useState([]);
  const [children, setChildren] = useState([]);
  const [cfg,      setCfg]      = useState(DEF_CFG);
  const [loading,  setLoading]  = useState(true);
  const [confetti, setConfetti] = useState(false);

  /* ── inscriptions ────────────────────────────────────────────────────── */
  const [selId, setSelId] = useState(null);
  const [form,  setForm]  = useState({ fn:"",ln:"",gender:"",selfie:"" });
  const [msg,   setMsg]   = useState(null);

  /* ── my regs ─────────────────────────────────────────────────────────── */
  const [mySearch, setMySearch] = useState({ fn:"",ln:"" });
  const [myFound,  setMyFound]  = useState(null);
  const [myMsg,    setMyMsg]    = useState(null);

  /* ── admin ───────────────────────────────────────────────────────────── */
  const [pwd,      setPwd]      = useState("");
  const [pwdErr,   setPwdErr]   = useState("");
  const [aTab,     setATab]     = useState("acts");
  const [filt,     setFilt]     = useState("all");
  const [draftCfg, setDraftCfg] = useState(null);
  const [showEmj,  setShowEmj]  = useState(false);
  const [newAct,   setNewAct]   = useState({ name:"",desc:"",type:"activité",limitTotal:true,maxTotal:15,maxBoys:8,maxGirls:8,useQuotas:true,emoji:"⭐",color:PALETTE[0],photo:"",openDate:"",openTime:"",closeDate:"",closeTime:"" });
  const [newPwd,   setNewPwd]   = useState("");
  const [pwdOk,    setPwdOk]    = useState("");
  const [newChild, setNewChild] = useState({ fn:"",ln:"" });
  const [bulkText, setBulkText] = useState("");
  const [bulkMsg,  setBulkMsg]  = useState("");
  const [addActMsg, setAddActMsg] = useState("");
  const [confirmDlg, setConfirmDlg] = useState(null);

  /* ── bannière Murciagram (BeReal-style) ─────────────────────────────── */
  const [murciagramAlert,       setMurciagramAlert]       = useState(null); // null | { ts: number }
  const [murciagramLocalDismiss,setMurciagramLocalDismiss] = useState(null); // ts du dernier dismiss

  /* ── navigation feed ────────────────────────────────────────────────── */
  const [pendingFeedTab, setPendingFeedTab] = useState(null); // null | "profil" | "feed" | …
  const [totalDays, setTotalDays] = useState({}); // { "2026-06-29": 11, ... }

  /* ── livre d'or ──────────────────────────────────────────────────────── */
  const [livreDorVisible, setLivreDorVisibleState] = useState(false);

  /* ── compteurs posts par utilisateur ────────────────────────────────── */
  const [userPostCounts, setUserPostCounts] = useState({}); // { "fn_ln": N }

  /* ── feed ────────────────────────────────────────────────────────────── */
  const [posts,         setPosts]         = useState([]);
  const [feedLoading,   setFeedLoading]   = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMorePosts,  setHasMorePosts]  = useState(true);
  const lastPostDocRef  = useRef(null);
  const postSubmitting  = useRef(false); // garde contre double-soumission
  const [postSheet,     setPostSheet]     = useState(false);
  const [postForm,      setPostForm]      = useState({ photo:"",caption:"",author:"" });
  const [postMsg,       setPostMsg]       = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [likedIds,      setLikedIds]      = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("feed_likes") || "[]")); } catch { return new Set(); } });

  /* ── challenge ───────────────────────────────────────────────────────── */
  const [challenges,    setChallenges]    = useState([]);
  const [challSubs,     setChallSubs]     = useState([]);
  const [challSubSheet, setChallSubSheet] = useState(false);
  const [challSubForm,  setChallSubForm]  = useState({ photo:"", caption:"", author:"" });
  const [challSubMsg,   setChallSubMsg]   = useState(null);
  const [challLiked,    setChallLiked]    = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("chall_likes")||"[]")); } catch { return new Set(); } });
  const [newChall,      setNewChall]      = useState({ title:"", emoji:"🏆", desc:"", date:"" });

  /* ── reactions ───────────────────────────────────────────────────────── */
  const [myReactions,   setMyReactions]   = useState(() => { try { return JSON.parse(localStorage.getItem("feed_reactions")||"{}"); } catch { return {}; } });

  /* ── session persistence (localStorage + cookie fallback pour Safari iOS) */
  const SESSION_LS   = "colo_user_v4";
  const SESSION_CK   = "colo_sess_v2";
  const CK_MAX_AGE   = 365 * 24 * 60 * 60; // 1 an en secondes

  const saveSession = (user) => {
    const json = JSON.stringify(user);
    try { localStorage.setItem(SESSION_LS, json); } catch {}
    try {
      document.cookie = `${SESSION_CK}=${encodeURIComponent(json)}; max-age=${CK_MAX_AGE}; path=/; SameSite=Strict`;
    } catch {}
  };

  const loadSession = () => {
    // 1. localStorage (chemin normal)
    try {
      const ls = localStorage.getItem(SESSION_LS);
      if (ls) { const u = JSON.parse(ls); if (u?.role) return u; }
    } catch {}
    // 2. Cookie (fallback si Safari a vidé localStorage)
    try {
      const m = document.cookie.match(new RegExp(`(?:^|; )${SESSION_CK}=([^;]*)`));
      if (m) {
        const u = JSON.parse(decodeURIComponent(m[1]));
        if (u?.role) {
          // Restaure localStorage depuis le cookie
          try { localStorage.setItem(SESSION_LS, JSON.stringify(u)); } catch {}
          return u;
        }
      }
    } catch {}
    return null;
  };

  const clearSession = () => {
    try { localStorage.removeItem(SESSION_LS); } catch {}
    try { document.cookie = `${SESSION_CK}=; max-age=0; path=/; SameSite=Strict`; } catch {}
  };

  /* ── auth ────────────────────────────────────────────────────────────── */
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [currentUser,  setCurrentUser]  = useState(() => {
    try {
      const u = loadSession();
      // Si l'utilisateur n'a pas de rôle (compte pré-migration), force la reconnexion
      if (u && !u.role) { clearSession(); return null; }
      return u;
    } catch { return null; }
  });
  const [loginForm,    setLoginForm]    = useState({ fn:"",ln:"",gender:"" });
  const [loginErr,     setLoginErr]     = useState("");
  const [loginStep,    setLoginStep]    = useState("choose_role");
  const [loginPin,            setLoginPin]            = useState("");
  const [loginPinConf,        setLoginPinConf]        = useState("");
  const [loginPseudo,         setLoginPseudo]         = useState("");
  const [loginAvatar,         setLoginAvatar]         = useState(null);
  const [loginRole,           setLoginRole]           = useState(""); // "enfant"|"staff"|"parent"
  const [loginFuzzySuggestion,setLoginFuzzySuggestion]= useState(null);
  const [allPins,             setAllPins]             = useState({});

  /* ── staff ───────────────────────────────────────────────────────────── */
  const [staff,         setStaff]         = useState([]);
  const [newStaff,      setNewStaff]      = useState({ fn:"",ln:"" });
  const [staffBulkText, setStaffBulkText] = useState("");
  const [staffBulkMsg,  setStaffBulkMsg]  = useState("");

  /* ── présence temps-réel ────────────────────────────────────────────── */
  const [onlineUsers,   setOnlineUsers]   = useState([]);

  /* ── notifications (@mentions) ──────────────────────────────────────── */
  const [unreadNotifs,  setUnreadNotifs]  = useState(0);
  const unsubNotifsRef = useRef(null);
  const unsubBanRef    = useRef(null);

  /* ── idées ───────────────────────────────────────────────────────────── */
  const [ideas,     setIdeas]     = useState([]);
  const [ideaLiked, setIdeaLiked] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("idea_likes")||"[]")); } catch { return new Set(); } });
  const [ideaInput, setIdeaInput] = useState("");

  /* ── slide (home CTA) ────────────────────────────────────────────────── */
  const [slideX, setSlideX] = useState(0);
  const slideTrackRef = useRef(null);
  const slideStartRef = useRef(null);

  /* ══════════════════════════ DATA LOADING ══════════════════════════════ */
  const loadData = async (silent = false) => {
    // Flag pour annuler l'écriture si le timeout a déjà gagné
    let cancelled = false;
    const timeout = new Promise(res => setTimeout(() => { cancelled = true; res(); }, 12000));
    const fetch = async () => {
      const [ra,rr,rc,rch,rst] = await Promise.all([
        storage.get("colo:acts").catch(() => null),
        storage.get("colo:regs").catch(() => null),
        storage.get("colo:cfg4").catch(() => null),
        storage.get("colo:children").catch(() => null),
        storage.get("colo:staff").catch(() => null),
      ]);
      // Si le timeout a déjà résolu, ne pas écraser Firebase avec des données vides
      if (cancelled) return;
      let a=null, r=null, c=null, ch=null, st=null;
      try { if (ra) a = JSON.parse(ra.value); } catch {}
      try { if (rr) r = JSON.parse(rr.value); } catch {}
      try { if (rc) c = JSON.parse(rc.value); } catch {}
      try { if (rch) ch = JSON.parse(rch.value); } catch {}
      try { if (rst) st = JSON.parse(rst.value); } catch {}
      // IMPORTANT : si les données sont null (echec réseau ou 1ère utilisation),
      // on utilise les valeurs par défaut EN MÉMOIRE SEULEMENT.
      // On ne réécrit JAMAIS dans Firebase si on n'a rien reçu — pour éviter d'écraser les vraies données.
      if (!Array.isArray(a)) a = DEFAULTS;
      if (!Array.isArray(r)) r = [];
      if (!Array.isArray(ch)) ch = [];
      if (!Array.isArray(st)) st = [];
      const cv = { ...DEF_CFG, ...(c || {}) };
      setCfg(cv); if (!silent) setDraftCfg(cv);
      setActs(a); setRegs(r); setChildren(ch); setStaff(st);
    };
    await Promise.race([fetch(), timeout]);
    if (!silent) setLoading(false);
  };

  const loadIdeas = async () => {
    if (!db) return;
    try {
      const q = query(collection(db, "ideas"), orderBy("at", "desc"), limit(50));
      const snap = await getDocs(q);
      setIdeas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(e) { console.warn("loadIdeas:", e); }
  };

  const FEED_PAGE_SIZE = 20;
  const loadingMoreRef = useRef(false); // ref pour éviter les appels concurrents
  const [totalPostsCount, setTotalPostsCount] = useState(null); // vrai total Firestore

  const loadPosts = async () => {
    if (!db) return;
    try {
      setFeedLoading(true);
      lastPostDocRef.current = null; // reset curseur au refresh
      const q = query(collection(db, "posts"), orderBy("at", "desc"), limit(FEED_PAGE_SIZE));
      const [snap, metaSnap] = await Promise.all([
        getDocs(q),
        getDoc(fsDoc(db, "murcia2026", "posts_meta")).catch(() => null),
      ]);
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      lastPostDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMorePosts(snap.docs.length === FEED_PAGE_SIZE);
      const stored = metaSnap?.exists() ? metaSnap.data()?.count : null;
      // Si le doc meta existe → l'utilise ; sinon on affichera posts.length
      if (stored != null) setTotalPostsCount(stored);
    } catch (e) { console.warn("loadPosts:", e); }
    finally { setFeedLoading(false); }
  };

  const loadMorePosts = async () => {
    if (!db || loadingMoreRef.current || !hasMorePosts || !lastPostDocRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const q = query(collection(db, "posts"), orderBy("at", "desc"), startAfter(lastPostDocRef.current), limit(FEED_PAGE_SIZE));
      const snap = await getDocs(q);
      if (snap.empty) { setHasMorePosts(false); return; }
      const incoming = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(p => { const seen = new Set(p.map(x => x.id)); return [...p, ...incoming.filter(x => !seen.has(x.id))]; });
      lastPostDocRef.current = snap.docs[snap.docs.length - 1];
      setHasMorePosts(snap.docs.length === FEED_PAGE_SIZE);
    } catch (e) { console.error("loadMorePosts:", e?.code, e?.message, e); }
    finally { loadingMoreRef.current = false; setLoadingMore(false); }
  };

  const loadPins = async () => {
    if (!db) return;
    try {
      const snap = await getDocs(collection(db, "pins"));
      const map = {}; snap.docs.forEach(d => { map[d.id] = d.data(); });
      setAllPins(map);
    } catch (e) { console.warn("loadPins:", e); }
  };

  // Deep-link depuis notif push → ouvre le feed + sheet de post
  useEffect(() => {
    const handleLink = (link) => {
      try {
        const url = new URL(link, window.location.origin);
        if (url.searchParams.get("action") === "post") {
          if (link.startsWith("/?")) window.history.replaceState({}, "", "/");
          setPage("feed");
          setTimeout(() => setPostSheet(true), 150);
          return true;
        }
      } catch {}
      return false;
    };

    // Cas 1 : app fermée → ouvre à /?action=post (mount check)
    handleLink(window.location.search ? window.location.pathname + window.location.search : "/");

    // Cas 2 : BroadcastChannel (le plus fiable pour app en arrière-plan iOS)
    let bc;
    try {
      bc = new BroadcastChannel("murcia-notif");
      bc.onmessage = (e) => { if (e.data?.type === "notif-click") handleLink(e.data.link); };
    } catch {}

    // Cas 3 : postMessage SW classique (fallback)
    const handleSwMsg = (e) => { if (e.data?.type === "notif-click") handleLink(e.data.link); };
    navigator.serviceWorker?.addEventListener("message", handleSwMsg);

    // Cas 4 : visibilitychange → lit le Cache API laissé par le SW
    const checkCache = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const cache = await caches.open("murcia-notif-action");
        const resp = await cache.match("/pending-action");
        if (!resp) return;
        const { link, ts } = await resp.json();
        if (Date.now() - ts < 15000) { // action fraîche (< 15s)
          await cache.delete("/pending-action");
          handleLink(link);
        } else {
          await cache.delete("/pending-action"); // nettoie si trop vieille
        }
      } catch {}
    };
    document.addEventListener("visibilitychange", checkCache);
    checkCache(); // vérifie aussi au démarrage

    return () => {
      try { bc?.close(); } catch {}
      navigator.serviceWorker?.removeEventListener("message", handleSwMsg);
      document.removeEventListener("visibilitychange", checkCache);
    };
  }, []);

  useEffect(() => {
    // Chargement initial + pins
    loadData();
    loadPins();

    if (!db) {
      // Pas de Firebase : polling localStorage toutes les 5s seulement
      const t = setInterval(() => loadData(true), 5000);
      return () => clearInterval(t);
    }

    // ── Listeners temps-réel Firestore (onSnapshot = WebSocket, 0 polling) ──
    const safeKey = k => k.replace(/[:/]/g, "_");
    const noop = () => {};

    const unsubActs = onSnapshot(
      fsDoc(db, "murcia2026", safeKey("colo:acts")),
      snap => { if (snap.exists()) try { setActs(JSON.parse(snap.data().value)); } catch {} },
      noop
    );
    const unsubRegs = onSnapshot(
      fsDoc(db, "murcia2026", safeKey("colo:regs")),
      snap => { if (snap.exists()) try { setRegs(JSON.parse(snap.data().value)); } catch {} },
      noop
    );
    const unsubCfg = onSnapshot(
      fsDoc(db, "murcia2026", safeKey("colo:cfg4")),
      snap => { if (snap.exists()) try { setCfg(c => ({ ...DEF_CFG, ...JSON.parse(snap.data().value) })); } catch {} },
      noop
    );
    const unsubChildren = onSnapshot(
      fsDoc(db, "murcia2026", safeKey("colo:children")),
      snap => {
        if (!snap.exists()) return;
        try {
          const list = JSON.parse(snap.data().value);
          setChildren(list);
        } catch {}
      },
      noop
    );
    const unsubStaff = onSnapshot(
      fsDoc(db, "murcia2026", safeKey("colo:staff")),
      snap => {
        if (!snap.exists()) return;
        try {
          const list = JSON.parse(snap.data().value);
          setStaff(list);
        } catch {}
      },
      noop
    );

    // ── Présence temps-réel ──
    const presenceQ = collection(db, "presence");
    const unsubPresence = onSnapshot(presenceQ, snap => {
      const now = Date.now();
      const online = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.lastSeen && (now - new Date(u.lastSeen).getTime()) < 2 * 60 * 1000);
      setOnlineUsers(online);
    }, noop);

    // ── Idées temps-réel ──
    const ideasQ = query(collection(db, "ideas"), orderBy("at", "desc"), limit(50));
    const unsubIdeas = onSnapshot(ideasQ, snap => {
      setIdeas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, noop);

    // ── Feed temps-réel : les 20 derniers posts ──
    const postsQ = query(collection(db, "posts"), orderBy("at", "desc"), limit(FEED_PAGE_SIZE));
    const unsubPosts = onSnapshot(
      postsQ,
      snap => {
        const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Garde les posts chargés via "load more" (au-delà des 20 live)
        setPosts(p => {
          const freshIds = new Set(fresh.map(x => x.id));
          const older = p.filter(x => !freshIds.has(x.id));
          return [...fresh, ...older];
        });
        if (!lastPostDocRef.current && snap.docs.length > 0) {
          lastPostDocRef.current = snap.docs[snap.docs.length - 1];
          setHasMorePosts(snap.docs.length === FEED_PAGE_SIZE);
        }
        setFeedLoading(false);
      },
      () => setFeedLoading(false)
    );

    // ── Compteur total de posts + par jour (live) ──
    const unsubPostsMeta = onSnapshot(
      fsDoc(db, "murcia2026", "posts_meta"),
      snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.count != null)      setTotalPostsCount(data.count);
        if (data.days)               setTotalDays(data.days);
        if (data.userCounts)         setUserPostCounts(data.userCounts);
      },
      () => {}
    );

    // ── Challenges temps-réel ──
    const challQ    = query(collection(db,"challenges"),            orderBy("at","desc"), limit(20));
    const challSubQ = query(collection(db,"challenge_submissions"), orderBy("at","desc"), limit(100));
    const unsubChall    = onSnapshot(challQ,    snap => setChallenges(snap.docs.map(d=>({id:d.id,...d.data()}))), noop);
    const unsubChallSub = onSnapshot(challSubQ, snap => setChallSubs(snap.docs.map(d=>({id:d.id,...d.data()}))),  noop);

    // ── Livre d'or visibilité ──
    const unsubLivreDor = onSnapshot(
      fsDoc(db, "murcia2026", "livre_or_meta"),
      snap => { if (snap.exists()) setLivreDorVisibleState(snap.data().visible || false); },
      noop
    );

    // ── Bannière Murciagram temps-réel ──
    const unsubMurci = onSnapshot(fsDoc(db, "alerts", "murciagram"), snap => {
      if (!snap.exists()) { setMurciagramAlert(null); return; }
      const d = snap.data();
      if (d.active) {
        const ts = d.ts?.toMillis ? d.ts.toMillis() : (d.ts ? new Date(d.ts).getTime() : Date.now());
        setMurciagramAlert(prev => {
          // Si c'est une nouvelle alerte (ts différent), reset le dismiss local
          if (!prev || prev.ts !== ts) setMurciagramLocalDismiss(null);
          return { ts };
        });
      } else {
        setMurciagramAlert(null);
      }
    }, noop);

    return () => {
      unsubActs(); unsubRegs(); unsubCfg(); unsubChildren(); unsubStaff(); unsubPresence(); unsubIdeas(); unsubPosts(); unsubPostsMeta(); unsubChall(); unsubChallSub(); unsubMurci(); unsubLivreDor();
    };
  }, []);

  /* ── vérification suppression compte (remplace checkDeleted inline) ──── */
  // Séparé du useEffect Firestore pour accéder au vrai currentUser/children/staff/cfg
  useEffect(() => {
    if (!currentUser || !db) return;
    const role = currentUser.role;

    // Enfants : vérifie si la personne est en réalité dans la liste staff → upgrade automatique
    if (role === "enfant") {
      if (staff.length > 0) {
        const isActuallyStaff = staff.some(s =>
          normalize(s.fn) === normalize(currentUser.fn) &&
          normalize(s.ln) === normalize(currentUser.ln)
        );
        if (isActuallyStaff) {
          // Corrige le rôle en base et en session
          const pinKey = `${currentUser.fn.trim().toLowerCase()}_${currentUser.ln.trim().toLowerCase()}`;
          const updated = { ...currentUser, role: "staff" };
          getDoc(fsDoc(db, "pins", pinKey)).then(snap => {
            const existing = snap.exists() ? snap.data() : {};
            return setDoc(fsDoc(db, "pins", pinKey), { ...existing, role: "staff" });
          }).catch(() => {});
          setAllPins(p => ({ ...p, [pinKey]: { ...(p[pinKey] || {}), role: "staff" } }));
          doLogin(updated);
          return;
        }
      }
      if (children.length === 0) return; // liste pas encore chargée → on attend
      const found = children.some(c =>
        normalize(c.fn) === normalize(currentUser.fn) &&
        normalize(c.ln) === normalize(currentUser.ln)
      );
      if (!found) {
        // Avant de déconnecter, vérifie que le PIN n'existe plus dans Firestore
        const pinKey = `${currentUser.fn.trim().toLowerCase()}_${currentUser.ln.trim().toLowerCase()}`;
        getDoc(fsDoc(db, "pins", pinKey)).then(snap => {
          if (!snap.exists()) {
            clearSession();
            setCurrentUser(null);
            setPage("home");
            setLoginStep("choose_role");
            setLoginRole("");
            setLoginPin("");
            setLoginForm({ fn:"",ln:"",gender:"" });
          }
        }).catch(() => {});
      }
    }

    // Staff : vérification directe (pas de PIN Firestore pour le staff)
    if (role === "staff") {
      if (staff.length === 0) return;
      const found = staff.some(s =>
        normalize(s.fn) === normalize(currentUser.fn) &&
        normalize(s.ln) === normalize(currentUser.ln)
      );
      if (!found) {
        clearSession();
        setCurrentUser(null);
        setPage("home");
        setLoginStep("choose_role");
        setLoginRole("");
        setLoginPin("");
        setLoginForm({ fn:"",ln:"",gender:"" });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, staff, currentUser?.fn, currentUser?.ln]);

  /* ── push notifications : gestion du token FCM par utilisateur ─────── */
  const { showBanner: pushBanner, setShowBanner: setPushBanner, requestPermission: pushRequestPermission } = usePushNotifications(currentUser);
  const [myFollowing, setMyFollowing] = useState([]);

  /* ── sync pseudo depuis allPins si manquant dans currentUser ────────── */
  useEffect(() => {
    if (!currentUser || currentUser.pseudo) return; // déjà à jour
    const key = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
    const pinData = allPins[key];
    if (pinData?.pseudo) {
      const updated = { ...currentUser, pseudo: pinData.pseudo };
      saveSession(updated);
      setCurrentUser(updated);
    }
  }, [allPins]);

  /* ── heartbeat de présence ──────────────────────────────────────────── */
  useEffect(() => {
    if (!db || !currentUser) return;
    const key = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
    const writePresence = async () => {
      try {
        await setDoc(fsDoc(db, "presence", key), {
          fn: currentUser.fn, ln: currentUser.ln, role: currentUser.role || "enfant",
          lastSeen: new Date().toISOString(),
        });
      } catch {}
    };
    writePresence();
    const interval = setInterval(writePresence, 30000);
    return () => {
      clearInterval(interval);
      // Supprime la présence à la déconnexion / fermeture
      try { deleteDoc(fsDoc(db, "presence", key)).catch(() => {}); } catch {}
    };
  }, [currentUser?.fn, currentUser?.ln, currentUser?.role]);

  /* ── notifications (@mentions) ──────────────────────────────────────── */
  useEffect(() => {
    if (unsubNotifsRef.current) { unsubNotifsRef.current(); unsubNotifsRef.current = null; }
    if (!db || !currentUser) { setUnreadNotifs(0); return; }
    const key = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
    const q = query(collection(db, "notifications"), where("toKey", "==", key), limit(50));
    unsubNotifsRef.current = onSnapshot(q, snap => {
      setUnreadNotifs(snap.docs.filter(d => !d.data().read).length);
    }, () => {});
    return () => { if (unsubNotifsRef.current) { unsubNotifsRef.current(); unsubNotifsRef.current = null; } };
  }, [currentUser?.fn, currentUser?.ln]);

  /* ── ban : déconnexion instantanée si compte supprimé ───────────────── */
  useEffect(() => {
    if (unsubBanRef.current) { unsubBanRef.current(); unsubBanRef.current = null; }
    if (!db || !currentUser) return;
    const key = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
    unsubBanRef.current = onSnapshot(fsDoc(db, "banned", key), snap => {
      if (snap.exists()) doLogout();
    }, () => {});
    return () => { if (unsubBanRef.current) { unsubBanRef.current(); unsubBanRef.current = null; } };
  }, [currentUser?.fn, currentUser?.ln]);

  /* ── abonnements (subscriptions) ────────────────────────────────────── */
  useEffect(() => {
    if (!db || !currentUser) { setMyFollowing([]); return; }
    const key = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
    getDoc(fsDoc(db, "subscriptions", key))
      .then(snap => { setMyFollowing(snap.exists() ? (snap.data().following || []) : []); })
      .catch(() => {});
  }, [currentUser?.fn, currentUser?.ln]);

  const toggleFollow = async (targetKey) => {
    if (!db || !currentUser) return;
    const userKey = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
    const isFollowing = myFollowing.includes(targetKey);
    const next = isFollowing ? myFollowing.filter(k => k !== targetKey) : [...myFollowing, targetKey];
    setMyFollowing(next);
    try {
      await setDoc(fsDoc(db, "subscriptions", userKey), { following: next });
      if (!isFollowing) {
        try {
          const tSnap = await getDocs(query(collection(db, "pushTokens"), where("userId", "==", targetKey)));
          const tokens = tSnap.docs.map(d => d.data().token);
          if (tokens.length > 0) {
            const senderName = currentUser.pseudo || currentUser.fn;
            fetch("/api/notify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tokens,
                title: "Notification",
                body: `🔔 ${senderName} te suit maintenant`,
                data: { type: "follow", tag: `follow-${userKey}` },
                secret: import.meta.env.VITE_NOTIFY_SECRET || "",
              }),
            }).catch(() => {});
          }
        } catch {}
      }
    } catch { setMyFollowing(myFollowing); }
  };

  /* ── persist helpers ────────────────────────────────────────────────── */
  // Ces fonctions propagent l'erreur si Firebase échoue, pour que l'UI puisse l'afficher.
  // Le state local est mis à jour immédiatement ; Firebase est la source de vérité persistante.
  const saveActs     = async a  => { setActs(a);     await storage.set("colo:acts",     JSON.stringify(a));  };
  const saveStaff    = async st => { setStaff(st);   await storage.set("colo:staff",    JSON.stringify(st)); };
  const saveRegs     = async r  => { setRegs(r);     await storage.set("colo:regs",     JSON.stringify(r));  };
  const saveCfg      = async c  => { setCfg(c);      await storage.set("colo:cfg4",     JSON.stringify(c));  };
  const saveChildren = async ch => { setChildren(ch);await storage.set("colo:children", JSON.stringify(ch)); };

  /* ── activity helpers ───────────────────────────────────────────────── */
  const actIsOpen = act => {
    if (act.closed) return false;
    const now = new Date();
    if (act.openDate) { const t = act.openTime || "00:00"; if (now < new Date(act.openDate + "T" + t)) return false; }
    if (act.closeDate) { const t = act.closeTime || "23:59"; if (now > new Date(act.closeDate + "T" + t)) return false; }
    return true;
  };
  const actPeriodMsg = act => {
    if (act.closed) return "Inscriptions fermées 🔒";
    const now = new Date();
    if (act.openDate) { const t = act.openTime || "00:00"; const d = new Date(act.openDate + "T" + t); if (now < d) return "Inscriptions dès le " + d.toLocaleString("fr-FR", { dateStyle:"short",timeStyle:"short" }) + " ⏳"; }
    if (act.closeDate) { const t = act.closeTime || "23:59"; const d = new Date(act.closeDate + "T" + t); if (now > d) return "Inscriptions fermées le " + d.toLocaleString("fr-FR", { dateStyle:"short",timeStyle:"short" }) + " 🔒"; }
    return "";
  };

  /* ── computed ───────────────────────────────────────────────────────── */
  const totalFor  = id => regs.filter(r => r.actId === id).length;
  const boysFor   = id => regs.filter(r => r.actId === id && r.gender === "boy").length;
  const girlsFor  = id => regs.filter(r => r.actId === id && r.gender === "girl").length;
  const status    = act => { const tot=totalFor(act.id),b=boysFor(act.id),g=girlsFor(act.id); return { tot,b,g,totalFull:act.limitTotal&&tot>=act.maxTotal,boysFull:act.useQuotas&&b>=act.maxBoys,girlsFull:act.useQuotas&&g>=act.maxGirls }; };
  const sortedActs       = useMemo(() => [...acts].sort((a,b) => avgRating(b.id,regs) - avgRating(a.id,regs)), [acts, regs]);
  const activeChallenge  = useMemo(() => challenges.find(c => c.active) || null, [challenges]);
  const lastWinChallenge = useMemo(() => challenges.find(c => !c.active && c.winner) || null, [challenges]);
  const filtRegs  = filt === "all" ? regs : regs.filter(r => r.actId === filt);
  const tBoys     = regs.filter(r => r.gender === "boy").length;
  const tGirls    = regs.filter(r => r.gender === "girl").length;
  const selAct    = acts.find(a => a.id === selId);
  const qrUrl     = typeof window !== "undefined" ? window.location.href : "";

  /* ── navigation ─────────────────────────────────────────────────────── */
  const navTo = p => {
    setPrevPage(page);
    setPage(p); setMenuOpen(false); setMsg(null); setMyMsg(null);
    if (p === "myregs") {
      setMyFound(null); setMySearch(currentUser ? { fn: currentUser.fn, ln: currentUser.ln } : { fn:"", ln:"" });
    } else { setMyFound(null); setMySearch({ fn:"",ln:"" }); }
  };

  /* ── signup ─────────────────────────────────────────────────────────── */
  const handleSignup = async () => {
    const { fn, ln, gender, selfie } = form;
    if (!fn.trim() || !ln.trim() || !gender) { setMsg({ t:"err", text:"Merci de remplir tous les champs." }); return; }
    const act = acts.find(a => a.id === selId); if (!act) return;
    // Équipe péda ne peut pas s'inscrire
    if (currentUser?.role === "staff") { setMsg({ t:"err", text:"L'équipe pédagogique ne s'inscrit pas aux activités." }); return; }
    if (!actIsOpen(act)) { setMsg({ t:"warn", text: actPeriodMsg(act) || "Inscriptions fermées pour cette activité." }); return; }
    const nFn = fn.trim().toLowerCase(), nLn = ln.trim().toLowerCase();
    if (cfg.useWhitelist && children.length > 0) {
      const nFnN = normalize(fn.trim()), nLnN = normalize(ln.trim());
      const allowed = children.find(c => normalize(c.fn) === nFnN && normalize(c.ln) === nLnN);
      if (!allowed) {
        const fuzzy = findFuzzyMatch(fn.trim(), ln.trim(), children);
        if (fuzzy) {
          setMsg({ t:"warn", text:`❓ Voulez-vous dire : ${fuzzy.fn} ${fuzzy.ln} ? Corrige ton prénom/nom et réessaie.` });
        } else {
          setMsg({ t:"err", text:"❌ Ton nom n'est pas sur la liste des participants. Contacte un animateur !" });
        }
        return;
      }
    }
    setMsg({ t:"ok", text:"Vérification en cours…" });
    let freshRegs = regs;
    try { const r = await storage.get("colo:regs"); if (r) freshRegs = JSON.parse(r.value); } catch {}
    setRegs(freshRegs);
    // 1 max par type (activité ou veillée) — sur activités non-archivées
    const actType = act.type || "activité";
    const activeActIds = acts.filter(a => !a.archived).map(a => a.id);
    const dup = freshRegs.find(r =>
      r.fn.toLowerCase() === nFn && r.ln.toLowerCase() === nLn &&
      (r.actType || acts.find(a => a.id === r.actId)?.type || "activité") === actType &&
      activeActIds.includes(r.actId)
    );
    if (dup) { const ex = acts.find(a => a.id === dup.actId); setMsg({ t:"warn", text:`Tu es déjà inscrit·e à "${ex?.name || "une activité"}" (${actType}). Une seule inscription par type !` }); return; }
    const freshTot = freshRegs.filter(r => r.actId === act.id).length;
    const freshBoys = freshRegs.filter(r => r.actId === act.id && r.gender === "boy").length;
    const freshGirls = freshRegs.filter(r => r.actId === act.id && r.gender === "girl").length;
    if (act.limitTotal && freshTot >= act.maxTotal) { setMsg({ t:"warn", text:"Cette activité vient de se remplir ! Choisis-en une autre." }); return; }
    if (gender === "boy" && act.useQuotas && freshBoys >= act.maxBoys) { setMsg({ t:"warn", text:"Quota garçons vient d'être atteint !" }); return; }
    if (gender === "girl" && act.useQuotas && freshGirls >= act.maxGirls) { setMsg({ t:"warn", text:"Quota filles vient d'être atteint !" }); return; }
    // Compresse le selfie à 120px/0.6 avant stockage (évite de dépasser 1MB dans Firestore)
    let storedSelfie = "";
    if (selfie) {
      try {
        const blob = await fetch(selfie).then(r => r.blob());
        storedSelfie = await compressImage(blob, 120, 0.6, true);
      } catch { storedSelfie = selfie.slice(0, 50000) || ""; } // cap de sécurité 50KB
    }
    const newRegs = [...freshRegs, { id:`r${Date.now()}`, actId:act.id, actType, actName:act.name, fn:fn.trim(), ln:ln.trim(), gender, selfie:storedSelfie, rating:0, at:new Date().toISOString() }];
    await saveRegs(newRegs);
    const nowFull = newRegs.filter(r => r.actId === act.id).length >= act.maxTotal;
    try { navigator.vibrate?.([10, 60, 20]); } catch {}
    setMsg({ t:"ok", text:`🎉 Inscription confirmée dans ${act.emoji} ${act.name} !` });
    setForm({ fn:"",ln:"",gender:"",selfie:"" });
    if (nowFull) { setConfetti(true); setTimeout(() => setConfetti(false), 3000); }
  };

  /* ── my regs ────────────────────────────────────────────────────────── */
  const handleSearch = () => {
    const nFn = mySearch.fn.trim().toLowerCase(), nLn = mySearch.ln.trim().toLowerCase();
    if (!nFn || !nLn) { setMyFound(null); setMyMsg({ t:"err", text:"Entre ton prénom et ton nom." }); return; }
    const found = regs.find(r => r.fn.toLowerCase() === nFn && r.ln.toLowerCase() === nLn);
    setMyFound(found || false); setMyMsg(found ? null : { t:"warn", text:"Aucune inscription trouvée." });
  };
  const handleRate = async (id, rating) => {
    const u = regs.map(r => r.id === id ? { ...r, rating } : r); await saveRegs(u);
    setMyFound(p => ({ ...p, rating }));
  };
  const handleComment = async (id, comment) => {
    const u = regs.map(r => r.id === id ? { ...r, comment } : r); await saveRegs(u);
    setMyFound(p => ({ ...p, comment }));
    setMyMsg({ t:"ok", text:"Avis enregistré ✍️" }); setTimeout(() => setMyMsg(null), 2500);
  };
  const handleUnsub = async id => {
    setConfirmDlg({ msg:"Se désinscrire de cette activité ?", onConfirm: async () => {
      await saveRegs(regs.filter(r => r.id !== id));
      setMyFound(null); setMyMsg({ t:"ok", text:"Désinscription effectuée." }); setMySearch({ fn:"",ln:"" });
    }});
  };

  /* ── feed ────────────────────────────────────────────────────────────── */
  const handlePostSubmit = async () => {
    if (postSubmitting.current) return; // bloque le double-clic
    const resolvedAuthor = postForm.author.trim() || (currentUser?.pseudo || currentUser?.fn || "");
    if (!postForm.photo) { setPostMsg({ t:"err", text:"Choisis une photo !" }); return; }
    if (!resolvedAuthor) { setPostMsg({ t:"err", text:"Entre ton prénom !" }); return; }
    // Limite 10 posts par utilisateur par jour
    if (currentUser) {
      const authorKey0 = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = posts.filter(p => p.authorKey === authorKey0 && p.at?.startsWith(today)).length;
      if (todayCount >= 10) { setPostMsg({ t:"err", text:"Tu as atteint la limite de 10 posts par jour 📸" }); return; }
    }
    if (!db) { setPostMsg({ t:"err", text:"Firebase non connecté." }); return; }
    postSubmitting.current = true;
    try {
      setPostMsg({ t:"ok", text:"Publication en cours…" });
      const authorKey = currentUser ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}` : null;

      let photo = postForm.photo;

      // Priorité 1 : upload Firebase Storage → URL CDN (pas de limite 1MB, chargement rapide)
      if (firebaseStorage) {
        try {
          setPostMsg({ t:"ok", text:"Upload en cours… 📤" });
          const path = `posts/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
          photo = await uploadPhotoToStorage(photo, path);
        } catch (storageErr) {
          console.warn("Storage upload failed, fallback base64:", storageErr);
          // Priorité 2 : base64 dans Firestore (limite 1MB)
          if (photo.length > 800_000) {
            try {
              const blob = await fetch(photo).then(r => r.blob());
              photo = await compressImage(blob, 600, 0.65, true);
            } catch {}
          }
        }
      } else {
        // Pas de Storage : garde base64 mais compresse si trop grand
        if (photo.length > 800_000) {
          try {
            const blob = await fetch(photo).then(r => r.blob());
            photo = await compressImage(blob, 600, 0.65, true);
          } catch {}
        }
      }

      const newPost = { photo, caption:postForm.caption.trim(), author:resolvedAuthor, ...(authorKey?{authorKey}:{}), at:new Date().toISOString(), likes:0, comments:[] };
      await addDoc(collection(db, "posts"), newPost);
      const today = new Date().toISOString().slice(0, 10);
      setTotalPostsCount(c => c !== null ? c + 1 : null);
      setTotalDays(d => {
        const next = { ...d, [today]: (d[today] || 0) + 1 };
        const newCount = Object.values(next).reduce((a, b) => a + b, 0);
        setDoc(fsDoc(db, "murcia2026", "posts_meta"), { count: newCount, days: next }, { merge: true }).catch(() => {});
        return next;
      });
      if (authorKey) {
        setUserPostCounts(c => ({ ...c, [authorKey]: (c[authorKey] || 0) + 1 }));
        updateDoc(fsDoc(db, "murcia2026", "posts_meta"), { [`userCounts.${authorKey}`]: increment(1) }).catch(() => {});
      }

      // Notifie les abonnés de l'auteur (côté serveur pour éviter les règles Firebase)
      if (authorKey) {
        fetch("/api/notify-followers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorKey,
            authorName: resolvedAuthor,
            secret: import.meta.env.VITE_NOTIFY_SECRET || "",
          }),
        }).catch(() => {});
      }

      setPostSheet(false); setPostForm({ photo:"",caption:"",author:"" }); setPostMsg(null);
      // Dismiss la bannière Murciagram si active (l'utilisateur vient de poster)
      setMurciagramAlert(prev => { if (prev?.ts) setMurciagramLocalDismiss(prev.ts); return prev; });
    } catch (e) {
      console.error("handlePostSubmit error:", e);
      // Affiche le code Firebase pour diagnostiquer (règles expirées vs taille vs réseau)
      const code = e?.code || "";
      let msg = "Erreur lors de la publication.";
      if (code === "permission-denied") msg = "Accès refusé (règles Firebase). Contacte l'admin.";
      else if (code === "resource-exhausted") msg = "Quota Firebase atteint. Réessaie plus tard.";
      else if (code === "unavailable" || code === "deadline-exceeded") msg = "Hors ligne, réessaie dans un instant.";
      setPostMsg({ t:"err", text: msg });
    } finally {
      postSubmitting.current = false;
    }
  };
  const handleLike = async postId => {
    const already = likedIds.has(postId);
    try { navigator.vibrate?.(10); } catch {}
    const newLiked = new Set(likedIds);
    if (already) { newLiked.delete(postId); } else { newLiked.add(postId); }
    setLikedIds(newLiked);
    try { localStorage.setItem("feed_likes", JSON.stringify([...newLiked])); } catch {}
    setPosts(p => p.map(x => x.id === postId ? { ...x, likes: Math.max(0, (x.likes||0) + (already ? -1 : 1)) } : x));
    if (db) try { await updateDoc(fsDoc(db,"posts",postId), { likes: increment(already ? -1 : 1) }); } catch {}
  };
  const handleAddComment = async (postId, text, author, authorKey) => {
    if (!text.trim() || !author.trim()) return;
    const c = { text:text.trim(),author:author.trim(),...(authorKey?{authorKey}:{}),at:new Date().toISOString() };
    setPosts(p => p.map(x => x.id === postId ? { ...x, comments:[...(x.comments||[]),c] } : x));
    if (db) try {
      const post = posts.find(x => x.id === postId);
      await updateDoc(fsDoc(db,"posts",postId), { comments:[...(post?.comments||[]),c] });

      // Notifie l'auteur du post (si différent du commentateur) — côté serveur
      if (post?.authorKey && post.authorKey !== authorKey) {
        fetch("/api/notify-comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postAuthorKey: post.authorKey,
            commenterName: author,
            postId,
            secret: import.meta.env.VITE_NOTIFY_SECRET || "",
          }),
        }).catch(() => {});
      }

      // Détecte les @mentions et crée des notifications (prénom ou pseudo)
      // Regex sans \p{L} pour compatibilité iOS max
      const mentionedNames = [...text.matchAll(/@([A-Za-zÀ-ɏ]+)/g)].map(m => m[1].toLowerCase());
      if (mentionedNames.length > 0 && authorKey) {
        const allPeople = [...children, ...staff];
        const toNotify = allPeople.filter(u => {
          const uKey = `${u.fn.toLowerCase()}_${u.ln.toLowerCase()}`;
          const pseudo = allPins[uKey]?.pseudo?.toLowerCase();
          return mentionedNames.includes(u.fn.toLowerCase()) || (pseudo && mentionedNames.includes(pseudo));
        });
        // Collecte les tokens push de toutes les personnes mentionnées
        const pushTokensToSend = [];

        for (const person of toNotify) {
          const toKey = `${person.fn.toLowerCase()}_${person.ln.toLowerCase()}`;
          if (toKey !== authorKey) {
            try {
              await addDoc(collection(db, "notifications"), {
                toKey, fromFn: author, postId, text: text.trim(),
                at: new Date().toISOString(), read: false,
              });
            } catch {}

            // Récupère les tokens FCM de cet utilisateur (tous ses appareils)
            try {
              const snap = await getDocs(query(collection(db, "pushTokens"), where("userId", "==", toKey)));
              snap.forEach(d => pushTokensToSend.push(d.data().token));
            } catch {}
          }
        }

        // Envoie la push notification à toutes les personnes mentionnées
        if (pushTokensToSend.length > 0) {
          const secret = import.meta.env.VITE_NOTIFY_SECRET || "";
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tokens: pushTokensToSend,
              title: "Notification",
              body: `📣 ${author} t'a mentionné`,
              data: { postId, tag: `mention-${postId}` },
              secret,
            }),
          }).catch(() => {});
        }
      }
    } catch {}
  };

  const markNotifsRead = async () => {
    if (!db || !currentUser) return;
    const key = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
    try {
      const q = query(collection(db, "notifications"), where("toKey", "==", key), limit(50));
      const snap = await getDocs(q);
      const unread = snap.docs.filter(d => !d.data().read);
      await Promise.all(unread.map(d => updateDoc(d.ref, { read: true })));
    } catch {}
  };
  const handleDeletePost = postId => {
    const post = posts.find(x => x.id === postId);
    const postDay = post?.at?.slice(0, 10) || null;
    const postAuthorKey = post?.authorKey || null;
    setConfirmDlg({ msg:"Supprimer cette photo ?", onConfirm: async () => {
      setPosts(p => p.filter(x => x.id !== postId));
      setTotalPostsCount(c => c !== null && c > 0 ? c - 1 : c);
      if (postDay) {
        setTotalDays(d => {
          const next = { ...d, [postDay]: Math.max(0, (d[postDay] || 1) - 1) };
          if (next[postDay] === 0) delete next[postDay];
          const newCount = Object.values(next).reduce((a, b) => a + b, 0);
          setDoc(fsDoc(db, "murcia2026", "posts_meta"), { count: newCount, days: next }, { merge: true }).catch(() => {});
          return next;
        });
      }
      if (postAuthorKey) {
        setUserPostCounts(c => ({ ...c, [postAuthorKey]: Math.max(0, (c[postAuthorKey] || 1) - 1) }));
        updateDoc(fsDoc(db, "murcia2026", "posts_meta"), { [`userCounts.${postAuthorKey}`]: increment(-1) }).catch(() => {});
      }
      if (db) try { await deleteDoc(fsDoc(db,"posts",postId)); } catch {}
    }});
  };
  const handleDeleteComment = (postId, cmtIdx) => {
    const post = posts.find(x => x.id === postId); if (!post) return;
    const newComments = (post.comments || []).filter((_,i) => i !== cmtIdx);
    setPosts(p => p.map(x => x.id === postId ? { ...x, comments:newComments } : x));
    if (db) try { updateDoc(fsDoc(db,"posts",postId), { comments:newComments }); } catch {}
  };
  const handleToggleActClosed = async actId => {
    const updated = acts.map(a => a.id === actId ? { ...a, closed: !a.closed } : a);
    await saveActs(updated);
  };

  /* ── staff handlers ─────────────────────────────────────────────────── */
  const handleAddStaff = async () => {
    if (!newStaff.fn.trim() || !newStaff.ln.trim()) return;
    // NE PAS appeler resetChildAccount pour le staff — ça supprimerait leur compte existant
    try {
      await saveStaff([...staff, { id:`s${Date.now()}`,fn:newStaff.fn.trim(),ln:newStaff.ln.trim() }]);
      setNewStaff({ fn:"",ln:"" });
    } catch(e) {
      console.error("saveStaff failed:", e);
      setStaffBulkMsg("❌ Erreur de sauvegarde Firebase — réessaie"); setTimeout(() => setStaffBulkMsg(""), 5000);
    }
  };
  const handleDelStaff = id => {
    setConfirmDlg({ msg:"Retirer ce membre de l'équipe pédagogique ?", onConfirm: async () => {
      // NE PAS supprimer le compte (pins) du staff — juste le retirer de la liste
      try {
        await saveStaff(staff.filter(s => s.id !== id));
      } catch(e) {
        console.error("saveStaff failed:", e);
        setStaffBulkMsg("❌ Erreur de sauvegarde Firebase — réessaie"); setTimeout(() => setStaffBulkMsg(""), 5000);
      }
    }});
  };
  const handleBulkImportStaff = async () => {
    const lines = staffBulkText.split("\n").map(l => l.trim()).filter(Boolean);
    const added = [], skipped = [];
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/); if (parts.length < 2) { skipped.push(line); return; }
      const fn = parts[0], ln = parts.slice(1).join(" ");
      const exists = staff.find(c => c.fn.toLowerCase() === fn.toLowerCase() && c.ln.toLowerCase() === ln.toLowerCase());
      if (!exists) added.push({ id:`s${Date.now()}_${added.length}`,fn,ln }); else skipped.push(line);
    });
    if (added.length > 0) {
      // NE PAS appeler resetChildAccount — les membres du staff ont déjà des comptes à préserver
      try {
        await saveStaff([...staff, ...added]);
      } catch(e) {
        console.error("saveStaff bulk failed:", e);
        setStaffBulkMsg("❌ Erreur de sauvegarde Firebase — réessaie"); setStaffBulkText(""); setTimeout(() => setStaffBulkMsg(""), 5000); return;
      }
    }
    setStaffBulkMsg(`✅ ${added.length} membre${added.length>1?"s":""} ajouté${added.length>1?"s":""}${skipped.length>0?` · ${skipped.length} ignoré${skipped.length>1?"s":""}`:""}`);
    setStaffBulkText(""); setTimeout(() => setStaffBulkMsg(""), 4000);
  };

  /* ── idées handlers ──────────────────────────────────────────────────── */
  const handlePostIdea = async () => {
    if (!ideaInput.trim() || !db) return;
    const author = currentUser?.fn || "Anonyme";
    const authorKey = currentUser?.fn ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}` : null;
    try {
      await addDoc(collection(db, "ideas"), {
        text: ideaInput.trim(), author, ...(authorKey?{authorKey}:{}),
        at: new Date().toISOString(), likes: 0,
      });
      setIdeaInput("");
    } catch(e) { console.error("handlePostIdea:", e); }
  };
  const handleLikeIdea = async id => {
    if (ideaLiked.has(id)) return;
    try { navigator.vibrate?.(10); } catch {}
    const nl = new Set(ideaLiked); nl.add(id); setIdeaLiked(nl);
    try { localStorage.setItem("idea_likes", JSON.stringify([...nl])); } catch {}
    setIdeas(p => p.map(x => x.id===id ? {...x,likes:(x.likes||0)+1} : x));
    if (db) try { await updateDoc(fsDoc(db,"ideas",id), {likes:increment(1)}); } catch {}
  };
  const handleDeleteIdea = id => {
    setConfirmDlg({ msg:"Supprimer cette idée ?", onConfirm: async () => {
      setIdeas(p => p.filter(x => x.id!==id));
      if (db) try { await deleteDoc(fsDoc(db,"ideas",id)); } catch {}
    }});
  };

  /* ── auth ────────────────────────────────────────────────────────────── */
  const doLogin  = user => { saveSession(user); setCurrentUser(user); };
  const doLogout = () => {
    clearSession(); setCurrentUser(null); setPage("home"); setIsAdmin(false);
    setLoginStep("choose_role"); setLoginRole(""); setLoginPin(""); setLoginPinConf("");
    setLoginPseudo(""); setLoginErr(""); setLoginForm({ fn:"",ln:"",gender:"" }); setLoginFuzzySuggestion(null);
  };

  const handleLoginIdentify = async () => {
    const fn = loginForm.fn.trim(), ln = loginForm.ln.trim();
    if (!fn || !ln) { setLoginErr("Merci d'entrer ton prénom et nom !"); return; }
    // Vérifie si banni
    if (db) { try { const b = await getDoc(fsDoc(db,"banned",`${fn.toLowerCase()}_${ln.toLowerCase()}`)); if(b.exists()){setLoginErr("❌ Ce compte a été supprimé. Contacte un animateur."); return;} } catch {} }
    const isStaff = loginRole === "staff";
    const listToCheck = isStaff ? staff : children;
    const shouldCheck = isStaff ? staff.length > 0 : (cfg.useWhitelist && children.length > 0);
    if (shouldCheck) {
      const nFn = normalize(fn), nLn = normalize(ln);
      const ok = listToCheck.find(c => normalize(c.fn) === nFn && normalize(c.ln) === nLn);
      if (!ok) {
        const fuzzy = findFuzzyMatch(fn, ln, listToCheck);
        if (fuzzy) { setLoginFuzzySuggestion(fuzzy); setLoginErr(""); }
        else { setLoginFuzzySuggestion(null); setLoginErr(isStaff ? "❌ Ton nom n'est pas sur la liste de l'équipe pédagogique." : "❌ Ton nom n'est pas sur la liste. Contacte un animateur !"); }
        return;
      }
      setLoginFuzzySuggestion(null);
      // ⚠️ Utilise le fn/ln EXACT de la liste (avec accents) — pas ce que l'utilisateur a tapé.
      // Cela garantit que le PIN et la session auront la même orthographe que la liste,
      // évitant les fausses déconnexions par checkDeleted.
      setLoginForm(f => ({ ...f, fn: ok.fn, ln: ok.ln }));
    }
    setLoginErr(""); setLoginPin(""); setLoginPinConf(""); setLoginPseudo("");
    // Staff → mot de passe partagé, pas de PIN
    if (isStaff) { setLoginStep("staff_pwd"); return; }
    // Utilise fn/ln potentiellement mis à jour depuis la liste (avec accents)
    const updatedFn = loginForm.fn.trim() || fn;
    const updatedLn = loginForm.ln.trim() || ln;
    const key = `${updatedFn.toLowerCase()}_${updatedLn.toLowerCase()}`;
    if (allPins[key]) {
      setLoginStep("enter_pin");
    } else {
      // allPins peut ne pas être encore chargé → vérifie directement Firestore
      getDoc(fsDoc(db, "pins", key)).then(snap => {
        if (snap.exists()) {
          setAllPins(p => ({ ...p, [key]: snap.data() }));
          setLoginStep("enter_pin");
        } else {
          setLoginStep("create_pin");
        }
      }).catch(() => setLoginStep("create_pin"));
    }
  };

  const handleStaffLogin = (pwd) => {
    if (!pwd.trim()) { setLoginErr("Entre le mot de passe !"); return; }
    if (!cfg.staffPwd || pwd.trim() !== cfg.staffPwd.trim()) { setLoginErr("Mot de passe incorrect ❌"); return; }
    setLoginErr("");
    const fn = loginForm.fn.trim(), ln = loginForm.ln.trim();
    const key = `${fn.toLowerCase()}_${ln.toLowerCase()}`;
    const existing = allPins[key];
    if (existing?.pseudo !== undefined) {
      if (!existing.gender) {
        // Compte existant mais sans genre → on le demande
        setLoginForm(f => ({ ...f, gender: "" }));
        setLoginStep("choose_gender");
      } else {
        doLogin({ fn, ln, gender: existing.gender, ...(existing.pseudo ? { pseudo: existing.pseudo } : {}), role:"staff" });
        setPage("hub");
      }
    } else {
      // Première connexion : genre d'abord
      setLoginForm(f => ({ ...f, gender: "" }));
      setLoginPseudo(""); setLoginStep("choose_gender");
    }
  };

  const handleStaffGender = async () => {
    if (!loginForm.gender) { setLoginErr("Choisis ton genre !"); return; }
    const fn = loginForm.fn.trim(), ln = loginForm.ln.trim();
    const key = `${fn.toLowerCase()}_${ln.toLowerCase()}`;
    const existing = allPins[key] || {};
    const updated = { ...existing, fn, ln, gender: loginForm.gender, role: "staff" };
    if (db) try { await setDoc(fsDoc(db, "pins", key), updated); } catch (e) { console.warn(e); }
    setAllPins(p => ({ ...p, [key]: updated }));
    setLoginErr("");
    if (existing.pseudo !== undefined) {
      doLogin({ fn, ln, gender: loginForm.gender, ...(existing.pseudo ? { pseudo: existing.pseudo } : {}), role: "staff" });
      setPage("hub");
    } else {
      setLoginStep("choose_pseudo");
    }
  };

  const handleCreatePin = async () => {
    if (!/^\d{4}$/.test(loginPin)) { setLoginErr("Code à 4 chiffres (0-9) requis !"); return; }
    if (loginPin !== loginPinConf) { setLoginErr("Les codes ne correspondent pas !"); return; }
    if (!loginForm.gender) { setLoginErr("Indique si tu es garçon ou fille !"); return; }
    const fn = loginForm.fn.trim(), ln = loginForm.ln.trim(), { gender } = loginForm;
    const key = `${fn.toLowerCase()}_${ln.toLowerCase()}`;
    if (db) { try { const b = await getDoc(fsDoc(db,"banned",key)); if(b.exists()){setLoginErr("❌ Ce compte a été supprimé. Contacte un animateur."); return;} } catch {} }
    const userData = { fn, ln, gender, pin: loginPin, role: loginRole || "enfant" };
    if (db) try { await setDoc(fsDoc(db,"pins",key), userData); } catch (e) { console.warn(e); }
    setAllPins(p => ({ ...p, [key]: userData }));
    // Nouvelle étape : choix du pseudo
    setLoginErr(""); setLoginPseudo(""); setLoginStep("choose_pseudo");
  };

  const handleVerifyPin = () => {
    const fn = loginForm.fn.trim(), ln = loginForm.ln.trim();
    const key = `${fn.toLowerCase()}_${ln.toLowerCase()}`;
    const stored = allPins[key];
    if (!stored || stored.pin !== loginPin) { setLoginErr("Code incorrect ❌"); return; }
    setLoginErr("");
    // Vérifie si la personne est dans la liste staff → force role staff
    const isActuallyStaff = staff.some(s =>
      normalize(s.fn) === normalize(fn) && normalize(s.ln) === normalize(ln)
    );
    const correctRole = isActuallyStaff ? "staff" : (stored.role || loginRole || "enfant");
    if (isActuallyStaff && stored.role !== "staff") {
      // Corrige silencieusement en base
      setDoc(fsDoc(db, "pins", key), { ...stored, role: "staff" }).catch(() => {});
      setAllPins(p => ({ ...p, [key]: { ...stored, role: "staff" } }));
    }
    if (stored.pseudo) {
      doLogin({ fn:stored.fn, ln:stored.ln, gender:stored.gender, pseudo:stored.pseudo, role:correctRole });
      setPage("hub");
    } else {
      setLoginPseudo(""); setLoginStep("choose_pseudo");
    }
  };

  const handleSetPseudo = async () => {
    const fn = loginForm.fn.trim(), ln = loginForm.ln.trim();
    const key = `${fn.toLowerCase()}_${ln.toLowerCase()}`;
    const existing = allPins[key] || {};
    const pseudo = loginPseudo.trim().slice(0, 20);
    const updatedUser = { ...existing, ...(pseudo ? { pseudo } : {}) };
    if (pseudo && db) try { await setDoc(fsDoc(db,"pins",key), updatedUser); } catch (e) { console.warn(e); }
    if (pseudo) setAllPins(p => ({ ...p, [key]: updatedUser }));
    doLogin({ fn:existing.fn||fn, ln:existing.ln||ln, gender:existing.gender||loginForm.gender, ...(pseudo?{pseudo}:{}), role:existing.role||loginRole||"enfant" });
    setLoginAvatar(null);
    setLoginStep("choose_avatar");
  };

  const handleSkipPseudo = () => {
    const fn = loginForm.fn.trim(), ln = loginForm.ln.trim();
    const key = `${fn.toLowerCase()}_${ln.toLowerCase()}`;
    const existing = allPins[key] || {};
    doLogin({ fn:existing.fn||fn, ln:existing.ln||ln, gender:existing.gender||loginForm.gender, role:existing.role||loginRole||"enfant" });
    setLoginAvatar(null);
    setLoginStep("choose_avatar");
  };

  const handleSaveAvatar = async (avatarDataUrl) => {
    if (!currentUser) { setPage("hub"); return; }
    const key = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
    const existing = allPins[key] || {};
    let avatarUrl = avatarDataUrl;
    if (avatarDataUrl && firebaseStorage) {
      try { avatarUrl = await uploadPhotoToStorage(avatarDataUrl, `avatars/${key}.jpg`); } catch {}
    }
    if (avatarUrl) {
      const updated = { ...existing, avatar: avatarUrl };
      if (db) try { await setDoc(fsDoc(db, "pins", key), updated); } catch {}
      setAllPins(p => ({ ...p, [key]: updated }));
      setCurrentUser(u => ({ ...u, avatar: avatarUrl }));
    }
    setLoginAvatar(null);
    setPage("hub");
  };

  const handleSkipAvatar = () => { setLoginAvatar(null); setPage("hub"); };

  /* ── admin handlers ─────────────────────────────────────────────────── */
  const handleLogin = () => {
    if (pwd === (cfg.adminPwd || DEFAULT_PWD)) { setPage("admin"); setIsAdmin(true); setPwdErr(""); if (!currentUser) setCurrentUser({ fn:"Admin",ln:"",gender:"" }); }
    else setPwdErr("Mot de passe incorrect ❌");
  };
  const handleAddAct = async () => {
    if (!newAct.name.trim()) { setAddActMsg("❌ Le nom est obligatoire."); return; }
    setAddActMsg("⏳ Enregistrement en cours…");
    try {
      let photo = newAct.photo;
      // Upload photo vers Firebase Storage si disponible (évite la limite 1 MB Firestore)
      if (photo && photo.startsWith("data:") && firebaseStorage) {
        try {
          const path = `activities/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
          photo = await uploadPhotoToStorage(photo, path);
        } catch (e) {
          console.warn("Activity photo upload failed, keeping base64:", e);
          // Garde le base64 compressé à 800px (PhotoUpload s'en charge)
        }
      }
      const a = { id:`a${Date.now()}`,name:newAct.name.trim(),desc:newAct.desc.trim(),type:newAct.type||"activité",limitTotal:newAct.limitTotal,maxTotal:+newAct.maxTotal||15,maxBoys:+newAct.maxBoys||8,maxGirls:+newAct.maxGirls||8,useQuotas:newAct.useQuotas,emoji:newAct.emoji,color:newAct.color,photo,openDate:newAct.openDate||"",openTime:newAct.openTime||"",closeDate:newAct.closeDate||"",closeTime:newAct.closeTime||"",archived:false };
      const newActs = [...acts, a];
      const serialized = JSON.stringify(newActs);

      // Écriture directe Firestore avec vrai retour d'erreur
      if (db) {
        await setDoc(fsDoc(db, "murcia2026", "colo_acts"), { value: serialized });
      }
      // Mise à jour état local + localStorage
      setActs(newActs);
      try { localStorage.setItem("colo_colo_acts", serialized); } catch {}

      setNewAct({ name:"",desc:"",type:"activité",limitTotal:true,maxTotal:15,maxBoys:8,maxGirls:8,useQuotas:true,emoji:"⭐",color:PALETTE[0],photo:"",openDate:"",openTime:"",closeDate:"",closeTime:"" });
      setShowEmj(false);
      setAddActMsg("✅ Activité ajoutée !");
      setTimeout(() => setAddActMsg(""), 3000);
    } catch (e) {
      console.error("handleAddAct:", e);
      const code = e?.code || "";
      let errMsg = "❌ Erreur lors de l'enregistrement. Réessaie.";
      if (code === "permission-denied") errMsg = "❌ Accès refusé (règles Firebase). Contacte l'admin.";
      else if (code === "unavailable") errMsg = "❌ Hors ligne, vérifie ta connexion.";
      setAddActMsg(errMsg);
    }
  };
  const handleArchiveAct = (id) => {
    setConfirmDlg({ msg:"Archiver cette activité ? Elle disparaîtra de la vue courante mais restera dans l'historique avec les inscriptions.", onConfirm: async () => {
      const updated = acts.map(a => a.id === id ? { ...a, archived:true, archivedAt:new Date().toISOString() } : a);
      await saveActs(updated);
    }});
  };

  const handleBanUser = (key, fn, ln, role) => {
    setConfirmDlg({ msg:`Supprimer le compte de ${fn} ${ln} ? L'appareil sera déconnecté immédiatement.`, onConfirm: async () => {
      if (db) try { await deleteDoc(fsDoc(db, "pins", key)); } catch {}
      if (db) try { await setDoc(fsDoc(db, "banned", key), { at: new Date().toISOString(), fn, ln }); } catch {}
      if (db) try {
        const toks = await getDocs(query(collection(db, "pushTokens"), where("userId", "==", key)));
        for (const d of toks.docs) await deleteDoc(d.ref);
        await deleteDoc(fsDoc(db, "online", key));
        await deleteDoc(fsDoc(db, "subscriptions", key));
      } catch {}
      if (role === "staff") {
        await saveStaff(staff.filter(s => !(s.fn.toLowerCase() === fn.toLowerCase() && s.ln.toLowerCase() === ln.toLowerCase())));
      } else {
        await saveChildren(children.filter(c => !(c.fn.toLowerCase() === fn.toLowerCase() && c.ln.toLowerCase() === ln.toLowerCase())));
      }
      setAllPins(p => { const n = { ...p }; delete n[key]; return n; });
    }});
  };

  const handleDelAct = id => {
    setConfirmDlg({ msg:"Supprimer cette activité et toutes ses inscriptions ?", onConfirm: async () => {
      await saveActs(acts.filter(a => a.id !== id));
      await saveRegs(regs.filter(r => r.actId !== id));
    }});
  };
  const handleDelReg = id => {
    setConfirmDlg({ msg:"Supprimer cette inscription ?", onConfirm: async () => {
      await saveRegs(regs.filter(r => r.id !== id));
    }});
  };
  const handleChangePwd = async () => {
    if (newPwd.length < 4) { setPwdOk("❌ Minimum 4 caractères"); return; }
    const nc = { ...cfg, adminPwd: newPwd }; await saveCfg(nc); setDraftCfg(nc); setNewPwd(""); setPwdOk("✅ Mot de passe changé !"); setTimeout(() => setPwdOk(""), 3000);
  };
  // Réinitialise complètement le compte d'un enfant (PIN + banned) pour qu'il recrée depuis zéro
  const resetChildAccount = async (fn, ln) => {
    const key = `${fn.trim().toLowerCase()}_${ln.trim().toLowerCase()}`;
    if (db) {
      try { await deleteDoc(fsDoc(db, "banned", key)); } catch {}
      try { await deleteDoc(fsDoc(db, "pins",   key)); } catch {}
    }
    setAllPins(p => { const n = { ...p }; delete n[key]; return n; });
  };

  const handleAddChild = async () => {
    if (!newChild.fn.trim() || !newChild.ln.trim()) return;
    await resetChildAccount(newChild.fn, newChild.ln);
    const c = { id:`c${Date.now()}`,fn:newChild.fn.trim(),ln:newChild.ln.trim() };
    try {
      await saveChildren([...children, c]); setNewChild({ fn:"",ln:"" });
    } catch(e) {
      console.error("saveChildren failed:", e);
      setBulkMsg("❌ Erreur de sauvegarde Firebase — réessaie"); setTimeout(() => setBulkMsg(""), 5000);
    }
  };
  const handleDelChild = id => {
    setConfirmDlg({ msg:"Retirer cet enfant de la liste ?", onConfirm: async () => {
      const child = children.find(c => c.id === id);
      if (child) await resetChildAccount(child.fn, child.ln);
      try {
        await saveChildren(children.filter(c => c.id !== id));
      } catch(e) {
        console.error("saveChildren failed:", e);
        setBulkMsg("❌ Erreur de sauvegarde Firebase — réessaie"); setTimeout(() => setBulkMsg(""), 5000);
      }
    }});
  };
  const handleBulkImport = async () => {
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean);
    const added = [], skipped = [];
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/); if (parts.length < 2) { skipped.push(line); return; }
      const fn = parts[0], ln = parts.slice(1).join(" ");
      const exists = children.find(c => c.fn.toLowerCase() === fn.toLowerCase() && c.ln.toLowerCase() === ln.toLowerCase());
      if (!exists) added.push({ id:`c${Date.now()}_${added.length}`,fn,ln }); else skipped.push(line);
    });
    if (added.length > 0) {
      await Promise.all(added.map(m => resetChildAccount(m.fn, m.ln)));
      try {
        await saveChildren([...children, ...added]);
      } catch(e) {
        console.error("saveChildren bulk failed:", e);
        setBulkMsg("❌ Erreur de sauvegarde Firebase — réessaie"); setBulkText(""); setTimeout(() => setBulkMsg(""), 5000); return;
      }
    }
    setBulkMsg(`✅ ${added.length} enfant${added.length>1?"s":""} ajouté${added.length>1?"s":""}${skipped.length>0?` · ${skipped.length} ignoré${skipped.length>1?"s":""} (déjà présent ou invalide)`:""}`);
    setBulkText(""); setTimeout(() => setBulkMsg(""), 4000);
  };
  const exportCSV = () => {
    const list = filt === "all" ? regs : regs.filter(r => r.actId === filt);
    const filtAct = acts.find(a => a.id === filt);
    const fname = "inscriptions_" + (filt === "all" ? "toutes" : (filtAct?.name||"").toLowerCase().replace(/\s+/g,"_")) + ".csv";
    const hdr = ["Prénom","Nom","Genre","Activité","Note /5","Avis","Date inscription"];
    const rows = list.map(r => { const a=acts.find(x=>x.id===r.actId); return [r.fn,r.ln,r.gender==="boy"?"Garçon":"Fille",(a?.emoji||"")+" "+(a?.name||"?"),r.rating||"",r.comment||"",new Date(r.at).toLocaleString("fr-FR")]; });
    const boys = list.filter(r => r.gender==="boy").length, girls = list.filter(r => r.gender==="girl").length;
    const esc = v => '"' + String(v).split('"').join('""') + '"';
    const toRow = arr => arr.map(esc).join(";");
    const csv = [toRow(hdr),...rows.map(toRow),"",toRow(["Total",list.length+" inscrits","dont "+boys+" garçons","et "+girls+" filles","","",""])].join("\n");
    const blob = new Blob(["﻿" + csv], { type:"text/csv;charset=utf-8;" });
    Object.assign(document.createElement("a"), { href:URL.createObjectURL(blob), download:fname }).click();
  };

  /* ── challenge handlers ─────────────────────────────────────────────── */
  const handleChallSubmit = async () => {
    if (!challSubForm.photo) { setChallSubMsg({t:"err",text:"Choisis une photo !"}); return; }
    const resolvedAuthor = challSubForm.author.trim() || (currentUser ? currentUser.fn : "");
    if (!resolvedAuthor) { setChallSubMsg({t:"err",text:"Entre ton prénom !"}); return; }
    if (!db || !activeChallenge) return;
    try {
      setChallSubMsg({t:"ok",text:"Upload en cours… 📤"});
      const authorKey = currentUser ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}` : null;

      let photo = challSubForm.photo;
      if (firebaseStorage) {
        try {
          const path = `challenges/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
          photo = await uploadPhotoToStorage(photo, path);
        } catch (e) {
          console.warn("Challenge storage upload failed, fallback base64:", e);
          if (photo.length > 800_000) {
            try { const blob = await fetch(photo).then(r => r.blob()); photo = await compressImage(blob, 600, 0.65, true); } catch {}
          }
        }
      }

      await addDoc(collection(db,"challenge_submissions"), {
        challengeId:activeChallenge.id, photo,
        caption:challSubForm.caption.trim(), author:resolvedAuthor,
        ...(authorKey?{authorKey}:{}), at:new Date().toISOString(), likes:0,
      });
      setChallSubSheet(false); setChallSubForm({photo:"",caption:"",author:""}); setChallSubMsg(null);
    } catch(e) { console.error("handleChallSubmit:", e); setChallSubMsg({t:"err",text:"Erreur lors de l'envoi."}); }
  };
  const handleChallLike = async (subId) => {
    if (challLiked.has(subId)) return;
    try { navigator.vibrate?.(10); } catch {}
    const nl = new Set(challLiked); nl.add(subId); setChallLiked(nl);
    try { localStorage.setItem("chall_likes", JSON.stringify([...nl])); } catch {}
    setChallSubs(p => p.map(x => x.id===subId ? {...x,likes:(x.likes||0)+1} : x));
    if (db) try { await updateDoc(fsDoc(db,"challenge_submissions",subId),{likes:increment(1)}); } catch {}
  };
  const handleDeleteChallSub = (subId) => {
    setConfirmDlg({msg:"Supprimer cette photo du challenge ?", onConfirm: async () => {
      setChallSubs(p => p.filter(x => x.id!==subId));
      if (db) try { await deleteDoc(fsDoc(db,"challenge_submissions",subId)); } catch {}
    }});
  };
  const handleAddChallenge = async () => {
    if (!newChall.title.trim() || !db) return;
    await addDoc(collection(db,"challenges"),{
      title:newChall.title.trim(), emoji:newChall.emoji, desc:newChall.desc.trim(),
      date:newChall.date||new Date().toISOString().slice(0,10),
      active:false, winner:null, at:new Date().toISOString(),
    });
    setNewChall({title:"",emoji:"🏆",desc:"",date:""});
  };
  const handleDeleteChallenge = (id) => {
    setConfirmDlg({msg:"Supprimer ce challenge ?", onConfirm: async () => {
      if (db) try { await deleteDoc(fsDoc(db,"challenges",id)); } catch {}
    }});
  };
  const handleToggleChallengeActive = async (id) => {
    if (!db) return;
    const isNowActive = !challenges.find(c=>c.id===id)?.active;
    await Promise.all(challenges.map(c =>
      updateDoc(fsDoc(db,"challenges",c.id),{active: c.id===id ? isNowActive : false})
    ));
  };
  const handleSetWinner = async (challengeId, sub) => {
    if (!db) return;
    await updateDoc(fsDoc(db,"challenges",challengeId),{
      winner:{ name:sub.author, photo:sub.photo, caption:sub.caption||"", subId:sub.id, authorKey:sub.authorKey||"" },
      active:false,
    });
  };

  /* ── reaction handlers ───────────────────────────────────────────────── */
  const REACTIONS = [{emoji:"🔥",key:"fire"},{emoji:"❤️",key:"heart"},{emoji:"😂",key:"haha"},{emoji:"😍",key:"wow"},{emoji:"👏",key:"clap"}];
  const handleReact = async (postId, emoji) => {
    try { navigator.vibrate?.(8); } catch {}
    const rObj = REACTIONS.find(r=>r.emoji===emoji); if (!rObj) return;
    const current = myReactions[postId];
    const newMR = {...myReactions};
    if (current === emoji) {
      delete newMR[postId];
      setPosts(p => p.map(x => x.id!==postId ? x : {...x, reactions:{...(x.reactions||{}), [rObj.key]:Math.max(0,(x.reactions?.[rObj.key]||0)-1)}}));
      if (db) try { const cur=(posts.find(x=>x.id===postId)?.reactions?.[rObj.key]||0); await updateDoc(fsDoc(db,"posts",postId),{[`reactions.${rObj.key}`]:Math.max(0,cur-1)}); } catch {}
    } else {
      if (current) {
        const oldObj = REACTIONS.find(r=>r.emoji===current);
        if (oldObj) {
          setPosts(p => p.map(x => x.id!==postId ? x : {...x, reactions:{...(x.reactions||{}), [oldObj.key]:Math.max(0,(x.reactions?.[oldObj.key]||0)-1)}}));
          if (db) try { await updateDoc(fsDoc(db,"posts",postId),{[`reactions.${oldObj.key}`]:increment(-1)}); } catch {}
        }
      }
      newMR[postId] = emoji;
      setPosts(p => p.map(x => x.id!==postId ? x : {...x, reactions:{...(x.reactions||{}), [rObj.key]:(x.reactions?.[rObj.key]||0)+1}}));
      if (db) try { await updateDoc(fsDoc(db,"posts",postId),{[`reactions.${rObj.key}`]:increment(1)}); } catch {}
    }
    setMyReactions(newMR);
    try { localStorage.setItem("feed_reactions",JSON.stringify(newMR)); } catch {}
  };

  /* ── context value ──────────────────────────────────────────────────── */
  const value = {
    // nav
    page, prevPage, navTo, menuOpen, setMenuOpen,
    // data
    acts, regs, children, cfg, loading, confetti, setConfetti,
    saveActs, saveRegs, saveCfg, saveChildren,
    loadData, loadPosts, loadMorePosts, loadingMore, hasMorePosts, loadPins,
    // activity helpers
    actIsOpen, actPeriodMsg,
    totalFor, boysFor, girlsFor, status, sortedActs,
    filtRegs, tBoys, tGirls, selAct, qrUrl,
    // inscriptions
    selId, setSelId, form, setForm, msg, setMsg, handleSignup,
    // my regs
    mySearch, setMySearch, myFound, setMyFound, myMsg, setMyMsg,
    handleSearch, handleRate, handleComment, handleUnsub,
    // feed
    pendingFeedTab, setPendingFeedTab,
    totalPostsCount, totalDays, userPostCounts,
    livreDorVisible, setLivreDorVisible: async (val) => {
      await setDoc(fsDoc(db, "murcia2026", "livre_or_meta"), { visible: val });
    },
    posts, feedLoading, postSheet, setPostSheet,
    postForm, setPostForm, postMsg, setPostMsg,
    commentInputs, setCommentInputs, likedIds,
    handlePostSubmit, handleLike, handleAddComment, handleDeletePost, handleDeleteComment,
    myFollowing, toggleFollow,
    handleToggleActClosed,
    // auth
    isAdmin, currentUser, setCurrentUser,
    loginForm, setLoginForm, loginErr, setLoginErr,
    loginStep, setLoginStep, loginPin, setLoginPin,
    loginPinConf, setLoginPinConf, allPins, setAllPins,
    doLogin, doLogout, handleLoginIdentify, handleStaffLogin, handleStaffGender, handleCreatePin, handleVerifyPin,
    loginPseudo, setLoginPseudo, handleSetPseudo, handleSkipPseudo,
    loginAvatar, setLoginAvatar, handleSaveAvatar, handleSkipAvatar,
    loginRole, setLoginRole,
    loginFuzzySuggestion, setLoginFuzzySuggestion,
    // push notifications
    pushBanner, setPushBanner, pushRequestPermission,
    // bannière murciagram
    murciagramAlert, murciagramLocalDismiss, setMurciagramLocalDismiss,
    // admin
    pwd, setPwd, pwdErr, aTab, setATab, filt, setFilt,
    draftCfg, setDraftCfg, showEmj, setShowEmj,
    newAct, setNewAct, newPwd, setNewPwd, pwdOk,
    newChild, setNewChild, bulkText, setBulkText, bulkMsg,
    confirmDlg, setConfirmDlg,
    addActMsg, setAddActMsg,
    // staff
    staff, saveStaff, newStaff, setNewStaff, staffBulkText, setStaffBulkText, staffBulkMsg,
    handleAddStaff, handleDelStaff, handleBulkImportStaff,
    onlineUsers, unreadNotifs, markNotifsRead,
    // idées
    ideas, ideaLiked, ideaInput, setIdeaInput, loadIdeas,
    handlePostIdea, handleLikeIdea, handleDeleteIdea,
    handleLogin, handleAddAct, handleArchiveAct, handleDelAct, handleDelReg,
    handleBanUser, handleChangePwd, handleAddChild, handleDelChild, handleBulkImport, exportCSV,
    // slide
    slideX, setSlideX, slideTrackRef, slideStartRef,
    // feed actions + compress
    compressImage,
    // challenge
    challenges, challSubs, challSubSheet, setChallSubSheet, challSubForm, setChallSubForm,
    challSubMsg, setChallSubMsg, challLiked, activeChallenge, lastWinChallenge,
    handleChallSubmit, handleChallLike, handleDeleteChallSub,
    newChall, setNewChall, handleAddChallenge, handleDeleteChallenge, handleToggleChallengeActive, handleSetWinner,
    // reactions
    myReactions, REACTIONS, handleReact,
  };

  return <AppContext.Provider value={value}>{appChildren}</AppContext.Provider>;
}
