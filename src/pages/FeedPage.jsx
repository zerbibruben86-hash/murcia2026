import { useContext, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AppContext } from "../context/AppContext";
import { IMG_POOL, compressImage } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";
import Confetti from "../components/Confetti";
import ConfirmDialog from "../components/ConfirmDialog";
import PullToRefresh from "../components/PullToRefresh";
import PostcardSheet from "../components/PostcardSheet";
import EditProfileSheet from "../components/EditProfileSheet";
import { db } from "../firebase";
import { getDoc, doc, setDoc, onSnapshot, collection, getDocs, query, where } from "firebase/firestore";

export default function FeedPage() {
  const {
    posts, feedLoading, postSheet, setPostSheet, postForm, setPostForm,
    postMsg, setPostMsg, commentInputs, setCommentInputs, likedIds,
    currentUser, isAdmin, confetti, confirmDlg, setConfirmDlg,
    handlePostSubmit, handleLike, handleAddComment, handleDeletePost, handleDeleteComment,
    loadPosts, loadMorePosts, loadingMore, hasMorePosts,
    myReactions, REACTIONS, handleReact,
    children, staff, allPins, unreadNotifs, markNotifsRead,
    myFollowing, toggleFollow,
    pendingFeedTab, setPendingFeedTab,
    totalPostsCount, totalDays, userPostCounts,
  } = useContext(AppContext);

  const [activeTab,    setActiveTab]    = useState("feed");
  const [showMentions, setShowMentions] = useState(false);
  const [scrollToPostId, setScrollToPostId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [openReactId,  setOpenReactId]  = useState(null);
  const [lightbox,     setLightbox]     = useState(null);
  const [postcardPost, setPostcardPost] = useState(null);
  const [viewedProfile, setViewedProfile] = useState(null); // userKey → ouvre le profil d'un autre utilisateur
  const [profileAllPosts, setProfileAllPosts] = useState([]); // tous les posts de viewedProfile
  const [profilePostsLoading, setProfilePostsLoading] = useState(false);
  const [myAllPosts, setMyAllPosts] = useState([]); // tous mes posts (onglet Mon profil)
  const [myAllPostsLoaded, setMyAllPostsLoaded] = useState(false);
  const [myProfileTab,     setMyProfileTab]     = useState("photos"); // "photos" | "comments"
  const [viewedProfileTab, setViewedProfileTab] = useState("photos"); // "photos" | "comments"
  const [showSubsSheet,   setShowSubsSheet]   = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [reports,         setReports]         = useState({}); // { [postId]: { reporters:[{key,name,at}] } }
  const [reportConfirm,   setReportConfirm]   = useState(null); // postId en attente de confirmation
  const [likeFlash,    setLikeFlash]    = useState(null);  // postId qui affiche le 🔥 flash
  const lastTapRef  = useRef({});   // postId → timestamp du dernier tap
  const tapTimerRef = useRef({});   // postId → timer id (attente single-tap)

  // Double-tap → like Insta-style
  const handlePostTap = useCallback((post) => {
    const now = Date.now();
    const last = lastTapRef.current[post.id] || 0;
    lastTapRef.current[post.id] = now;

    if (now - last < 300) {
      // Double-tap
      clearTimeout(tapTimerRef.current[post.id]);
      delete tapTimerRef.current[post.id];
      if (!likedIds.has(post.id)) handleLike(post.id);
      setLikeFlash(post.id);
      setTimeout(() => setLikeFlash(f => f === post.id ? null : f), 900);
    } else {
      // Simple tap — attend pour voir si double
      clearTimeout(tapTimerRef.current[post.id]);
      tapTimerRef.current[post.id] = setTimeout(() => {
        delete tapTimerRef.current[post.id];
        setLightbox(post);
      }, 310);
    }
  }, [likedIds, handleLike]);

  // ── Signaler un post ──────────────────────────────────────────────────────
  const handleReport = async (postId) => {
    if (!currentUser || !db) return;
    const myKey2 = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
    const ref = doc(db, "reports", postId);
    const existing = reports[postId] || { reporters: [] };
    if (existing.reporters?.some(r => r.key === myKey2)) return; // déjà signalé
    const updated = {
      postId,
      reporters: [...(existing.reporters || []), {
        key: myKey2,
        name: currentUser.pseudo || currentUser.fn,
        at: new Date().toISOString(),
      }],
    };
    setReports(r => ({ ...r, [postId]: updated }));
    try { await setDoc(ref, updated); } catch (e) { console.warn(e); }
    setReportConfirm(null);
  };

  // ── Supprimer un signalement ───────────────────────────────────────────────
  const handleClearReport = async (postId) => {
    if (!db) return;
    try {
      await setDoc(doc(db, "reports", postId), { postId, reporters: [] });
      setReports(r => ({ ...r, [postId]: { postId, reporters: [] } }));
    } catch (e) { console.warn(e); }
  };

  // ── Système @mention ──────────────────────────────────────────────────────
  // postId actif + texte tapé après le @
  const [mentionState, setMentionState] = useState({ postId: null, query: "" });
  // Référence vers l'<input> commentaire actuellement actif (pour calculer la position du portal)
  const mentionInputRef = useRef(null);

  const closeMention = useCallback(() => {
    setMentionState({ postId: null, query: "" });
    mentionInputRef.current = null;
  }, []);

  // Ferme le dropdown si l'utilisateur clique ailleurs que sur le dropdown ou l'input
  useEffect(() => {
    if (!mentionState.postId) return;
    const handler = e => {
      if (!e.target.closest("[data-mention-portal]") &&
          !e.target.closest("[data-mention-input]")) {
        closeMention();
      }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [mentionState.postId, closeMention]);

  // Données mentionnables : localStorage synchrone → contexte → Firestore
  const [fallbackPeople, setFallbackPeople] = useState(() => {
    try {
      const ch = JSON.parse(localStorage.getItem("colo_colo_children") || "[]");
      const st = JSON.parse(localStorage.getItem("colo_colo_staff") || "[]");
      return [
        ...(Array.isArray(ch) ? ch : []),
        ...(Array.isArray(st) ? st : []),
      ];
    } catch { return []; }
  });

  // Marque les notifs lues quand l'utilisateur ouvre le feed
  useEffect(() => { if (unreadNotifs > 0) markNotifsRead(); }, []);

  // Applique un onglet en attente (depuis le menu burger)
  useEffect(() => {
    if (!pendingFeedTab) return;
    setActiveTab(pendingFeedTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setPendingFeedTab(null);
  }, [pendingFeedTab]);

  // Reset l'onglet contenu quand on change de profil consulté
  // Charge tous mes posts quand j'ouvre l'onglet "profil"
  useEffect(() => {
    if (activeTab !== "profil" || !myKey || !db || myAllPostsLoaded) return;
    getDocs(query(collection(db, "posts"), where("authorKey", "==", myKey)))
      .then(snap => {
        const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
        setMyAllPosts(sorted);
        setMyAllPostsLoaded(true);
      })
      .catch(() => {});
  }, [activeTab, myKey, myAllPostsLoaded]);

  useEffect(() => {
    setViewedProfileTab("photos");
    setProfileAllPosts([]);
    if (!viewedProfile || !db) return;
    setProfilePostsLoading(true);
    getDocs(query(collection(db, "posts"), where("authorKey", "==", viewedProfile)))
      .then(snap => {
        const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
        setProfileAllPosts(sorted);
      })
      .catch(() => {})
      .finally(() => setProfilePostsLoading(false));
  }, [viewedProfile]);

  // Charge directement depuis Firestore si le contexte n'a pas encore les données
  useEffect(() => {
    const total = (children?.length || 0) + (staff?.length || 0);
    if (total > 0 || !db) return;
    Promise.all([
      getDoc(doc(db, "murcia2026", "colo_children")),
      getDoc(doc(db, "murcia2026", "colo_staff")),
    ]).then(([chSnap, stSnap]) => {
      const ch = chSnap.exists() ? JSON.parse(chSnap.data().value || "[]") : [];
      const st = stSnap.exists() ? JSON.parse(stSnap.data().value || "[]") : [];
      setFallbackPeople([...ch, ...st]);
    }).catch(() => {});
  }, [children?.length, staff?.length]);

  // Source unifiée : contexte (temps réel) > fallback localStorage/Firestore
  const baseList = ((children?.length || 0) + (staff?.length || 0)) > 0
    ? [...(children || []), ...(staff || [])]
    : fallbackPeople;

  const allPeople = baseList
    .filter(u => u?.fn && u?.ln)
    .map(u => {
      const key = `${u.fn.toLowerCase()}_${u.ln.toLowerCase()}`;
      return { ...u, pseudo: allPins?.[key]?.pseudo || null };
    });

  const mentionSuggestions = mentionState.postId
    ? allPeople
        .filter(u => {
          const q = mentionState.query.toLowerCase();
          return u.fn.toLowerCase().startsWith(q) ||
                 (u.pseudo && u.pseudo.toLowerCase().startsWith(q));
        })
        .slice(0, 6)
    : [];

  // Onglet "Mon profil" — données
  const myKey = currentUser ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}` : null;
  const myPosts = myKey ? posts.filter(p => p.authorKey === myKey) : [];

  // Helper : données de profil pour n'importe quel userKey
  const getProfileData = (userKey) => {
    if (!userKey) return null;
    const pin = allPins?.[userKey] || {};
    const [fk, lk] = userKey.split("_");
    const displayName = pin.pseudo ? `@${pin.pseudo}` : `${pin.fn || fk} ${pin.ln || lk || ""}`.trim();
    const initiale = (pin.pseudo || pin.fn || fk || "?")[0]?.toUpperCase();
    const avatar = pin.avatar || null;
    const isStaff = pin.role === "staff";
    const userPosts = posts.filter(p => p.authorKey === userKey);
    const totalLikes = userPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
    return { userKey, pin, displayName, initiale, avatar, isStaff, userPosts, totalLikes };
  };

  // Barre de dates
  const activePosts = activeTab === "feed" ? posts : myPosts;
  // Dates réelles depuis totalDays (tous les posts) + fallback sur posts chargés
  const availableDates = Object.keys(totalDays).length > 0
    ? Object.keys(totalDays).sort().reverse()
    : [...new Set(activePosts.map(p => p.at?.slice(0, 10)).filter(Boolean))].sort().reverse();

  const formatDateChip = dateStr => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"short" });
  };

  // Collecte tous les commentaires des posts d'un utilisateur, triés du + récent
  const getCommentsForUser = (userPosts) =>
    userPosts.flatMap(post =>
      (post.comments || []).map(c => ({ ...c, post }))
    ).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

  // Composant inline : liste de commentaires sur les posts d'un user
  const CommentsTab = ({ userPosts, onGoToPost }) => {
    const allComments = getCommentsForUser(userPosts);
    if (allComments.length === 0) return (
      <div style={{ textAlign:"center",padding:"3rem 1rem",color:"rgba(245,240,235,.4)" }}>
        <div style={{ fontSize:"2.5rem",marginBottom:".75rem" }}>💬</div>
        <div style={{ fontSize:".95rem",fontWeight:600 }}>Aucun commentaire pour l'instant</div>
      </div>
    );
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:".5rem",padding:".5rem .75rem 2rem" }}>
        {allComments.map((c, i) => (
          <button key={i}
            onClick={() => onGoToPost(c.post)}
            style={{ display:"flex",alignItems:"flex-start",gap:".75rem",padding:".75rem",background:"rgba(255,255,255,.13)",border:"1px solid rgba(255,255,255,.22)",borderRadius:14,cursor:"pointer",textAlign:"left",width:"100%",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)" }}>
            {/* Miniature du post */}
            <img src={c.post.photo} alt="" style={{ width:48,height:48,borderRadius:10,objectFit:"cover",flexShrink:0,border:"1.5px solid rgba(232,160,32,.3)" }}/>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:".4rem",marginBottom:".2rem" }}>
                <span style={{ fontWeight:800,fontSize:".88rem",color:"#fff" }}>{c.author}</span>
                <span style={{ fontSize:".65rem",color:"rgba(245,240,235,.45)",flexShrink:0 }}>
                  {new Date(c.at).toLocaleDateString("fr-FR",{ day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" })}
                </span>
              </div>
              <div style={{ fontSize:".83rem",color:"rgba(245,240,235,.9)",lineHeight:1.45 }}>
                {c.text.length > 120 ? c.text.slice(0,120)+"…" : c.text}
              </div>
              <div style={{ fontSize:".67rem",color:"rgba(232,160,32,.65)",marginTop:".3rem",fontWeight:600 }}>
                Voir le post →
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const displayedPosts = selectedDate
    ? activePosts.filter(p => p.at?.startsWith(selectedDate))
    : activePosts;

  const myMentions = myKey ? posts.flatMap(post =>
    (post.comments || [])
      .filter(c => {
        const names = [...(c.text || "").matchAll(/@([A-Za-zÀ-ɏ]+)/g)].map(m => m[1].toLowerCase());
        const fn = currentUser?.fn?.toLowerCase();
        const pseudo = currentUser?.pseudo?.toLowerCase();
        return names.some(n => n === fn || (pseudo && n === pseudo));
      })
      .map(c => ({ post, comment: c }))
  ) : [];

  // Scroll vers un post (après changement d'onglet ou après rendu)
  useEffect(() => {
    if (!scrollToPostId) return;
    const el = document.getElementById(`post-${scrollToPostId}`);
    if (el) { el.scrollIntoView({ behavior:"smooth", block:"center" }); setScrollToPostId(null); }
  }, [scrollToPostId, activeTab]);

  // Rend le texte d'un commentaire avec @mentions colorées et cliquables
  const renderMentions = txt => {
    if (!txt || !txt.includes("@")) return txt;
    return txt.split(/(@[A-Za-zÀ-ɏ0-9_]+)/g).map((part, i) => {
      if (part.startsWith("@") && part.length > 1) {
        const name = part.slice(1).toLowerCase();
        // 1. Cherche dans allPins (pseudo, prénom, ou clé)
        let matchKey = Object.keys(allPins || {}).find(k => {
          const p = allPins[k];
          return (p.pseudo && p.pseudo.toLowerCase() === name) ||
                 k.split("_")[0] === name ||
                 (p.fn && p.fn.toLowerCase() === name);
        });
        // 2. Fallback : cherche dans les posts par nom d'auteur (authorKey)
        if (!matchKey) {
          const postMatch = posts.find(p => p.authorKey && p.author?.toLowerCase() === name);
          if (postMatch) matchKey = postMatch.authorKey;
        }
        // 3. Fallback : cherche dans la liste children/staff par prénom
        if (!matchKey) {
          const person = [...(children || []), ...(staff || [])].find(c => c.fn?.toLowerCase() === name);
          if (person) matchKey = `${person.fn.toLowerCase()}_${person.ln.toLowerCase()}`;
        }
        return (
          <span key={i} className="mention"
            style={{ cursor: matchKey ? "pointer" : "default" }}
            onClick={matchKey ? e => {
              e.stopPropagation();
              if (matchKey === myKey) { setActiveTab("profil"); window.scrollTo({top:0,behavior:"smooth"}); }
              else setViewedProfile(matchKey);
            } : undefined}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Détecte le @ dans la saisie et ouvre/ferme le dropdown
  const handleCmtChange = (postId, val, ci, inputEl) => {
    setCommentInputs(p => ({ ...p, [postId]: { ...ci, text: val } }));
    const atIdx = val.lastIndexOf("@");
    if (atIdx !== -1) {
      const after = val.slice(atIdx + 1);
      if (!after.includes(" ")) {           // tant qu'aucun espace après @
        mentionInputRef.current = inputEl;  // mémorise l'élément DOM pour positionner le portal
        setMentionState({ postId, query: after });
        return;
      }
    }
    closeMention();
  };

  // Insère la mention choisie dans l'input (pseudo > prénom)
  const selectMention = useCallback((postId, u, ciText) => {
    const insertName = u.pseudo || u.fn;
    const atIdx = ciText.lastIndexOf("@");
    const newText = ciText.slice(0, atIdx) + "@" + insertName + " ";
    setCommentInputs(p => ({ ...p, [postId]: { ...(p[postId] || {}), text: newText } }));
    closeMention();
    // Re-focus l'input
    if (mentionInputRef.current) {
      try { mentionInputRef.current.focus(); } catch {}
    }
  }, [closeMention]);

  const sentinelRef = useRef(null);
  const loadMoreRef = useRef(loadMorePosts);
  useEffect(() => { loadMoreRef.current = loadMorePosts; });

  /* ── Listener signalements (staff uniquement) ─────────────────────── */
  useEffect(() => {
    if (!db || !currentUser || (currentUser.role !== "staff" && !isAdmin)) return;
    const unsub = onSnapshot(collection(db, "reports"), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setReports(map);
    });
    return unsub;
  }, [currentUser?.role, isAdmin]);

  useEffect(() => {
    let timer = null;
    const onScroll = () => {
      if (timer) return; // debounce 200ms
      timer = setTimeout(() => {
        timer = null;
        // window.scrollY fonctionne sur iOS Safari (documentElement.scrollTop retourne 0)
        const scrollTop = window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? 0;
        const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        const clientHeight = window.innerHeight || document.documentElement.clientHeight;
        if (scrollHeight - scrollTop - clientHeight < 600) loadMoreRef.current();
      }, 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (timer) clearTimeout(timer); };
  }, []);

  return (
    <div style={{ position:"relative",minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <Confetti active={confetti}/>
      <ConfirmDialog dlg={confirmDlg} onClose={() => setConfirmDlg(null)}/>
      <Hdr/>
      <Drawer/>

      <PullToRefresh onRefresh={loadPosts}>
        <div style={{ minHeight:"100vh" }}>
          <div style={{ maxWidth:560,margin:"0 auto",paddingBottom:"calc(6.5rem + env(safe-area-inset-bottom))" }}>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"1.75rem 1rem 1.25rem",gap:".7rem" }}>
              <svg viewBox="0 0 100 100" width="82" height="82" onClick={loadPosts} style={{ display:"block",filter:"drop-shadow(0 4px 18px rgba(188,24,136,.45))",cursor:"pointer",WebkitTapHighlightColor:"transparent" }}>
                <defs>
                  <radialGradient id="mg-bg" cx="30%" cy="107%" r="150%">
                    <stop offset="0%" stopColor="#feda77"/>
                    <stop offset="20%" stopColor="#f8a133"/>
                    <stop offset="40%" stopColor="#f56040"/>
                    <stop offset="60%" stopColor="#e1306c"/>
                    <stop offset="80%" stopColor="#c13584"/>
                    <stop offset="100%" stopColor="#833ab4"/>
                  </radialGradient>
                  <clipPath id="mg-clip">
                    <rect width="100" height="100" rx="23"/>
                  </clipPath>
                </defs>
                <g clipPath="url(#mg-clip)">
                  <rect width="100" height="100" fill="url(#mg-bg)"/>
                  <rect width="100" height="48" fill="rgba(255,255,255,.1)"/>
                </g>
                <rect x="18" y="29" width="64" height="46" rx="9" stroke="white" strokeWidth="5.5" fill="none"/>
                <path d="M37 29 L40 21 L60 21 L63 29" stroke="white" strokeWidth="5.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
                <circle cx="50" cy="52" r="14.5" stroke="white" strokeWidth="5.5" fill="none"/>
                <circle cx="50" cy="52" r="5.5" fill="white" opacity=".5"/>
                <circle cx="69.5" cy="37.5" r="4.5" fill="white"/>
              </svg>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Dancing Script',cursive",fontSize:"2.1rem",fontWeight:700,lineHeight:1,color:"var(--txt)",letterSpacing:".01em" }}>Murciagram</div>
                <div style={{ fontSize:".68rem",color:"rgba(245,240,235,.48)",marginTop:".3rem",letterSpacing:".1em",textTransform:"uppercase",fontWeight:500 }}>
                  Murcia 2026 · {totalPostsCount ?? posts.length} photo{(totalPostsCount ?? posts.length) !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* ── Onglets Feed / Mon profil / Signalements ── */}
            <div style={{ display:"flex",gap:".5rem",padding:"0 1rem .85rem",justifyContent:"center" }}>
              {[
                { id:"feed",   label:"Feed" },
                { id:"profil", label:"Mon profil" },
                ...((currentUser?.role === "staff" || isAdmin) ? [{ id:"signalements", label:"🚨", badge: Object.values(reports).filter(r => r.reporters?.length > 0).length }] : []),
              ].map(({ id, label, badge }) => (
                <button key={id} onClick={() => { setActiveTab(id); setShowMentions(false); setSelectedDate(null); }}
                  style={{
                    flex: id === "signalements" ? "0 0 auto" : 1, maxWidth:180,
                    background: activeTab === id ? (id === "signalements" ? "rgba(248,113,113,.85)" : "var(--gold)") : "rgba(30,18,10,.55)",
                    color:      activeTab === id ? "#fff" : "rgba(245,240,235,.88)",
                    border:     `1.5px solid ${activeTab === id ? (id === "signalements" ? "rgba(248,113,113,.85)" : "var(--gold)") : (id === "signalements" && badge > 0 ? "rgba(248,113,113,.5)" : "rgba(245,240,235,.32)")}`,
                    borderRadius: 25, padding:".52rem .9rem",
                    fontWeight:700, fontSize:".84rem", cursor:"pointer",
                    transition:"all .2s", position:"relative",
                    backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                  }}>
                  {label}
                  {badge > 0 && id === "signalements" && activeTab !== "signalements" && (
                    <span style={{ position:"absolute",top:-5,right:-5,minWidth:18,height:18,borderRadius:99,background:"#ef4444",color:"#fff",fontSize:".6rem",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",border:"1.5px solid rgba(10,7,5,1)" }}>{badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Barre de dates ── */}
            {availableDates.length > 1 && (
              <div style={{ display:"flex", gap:".4rem", overflowX:"auto", padding:"0 1rem .8rem", scrollbarWidth:"none", msOverflowStyle:"none", WebkitOverflowScrolling:"touch" }}>
                <button onClick={() => setSelectedDate(null)} style={{
                  flexShrink:0, whiteSpace:"nowrap",
                  background: !selectedDate ? "var(--gold)" : "rgba(30,18,10,.55)",
                  color:      !selectedDate ? "#0A0705"     : "rgba(245,240,235,.85)",
                  border:    `1.5px solid ${!selectedDate ? "var(--gold)" : "rgba(245,240,235,.22)"}`,
                  borderRadius:20, padding:".36rem .85rem", fontSize:".76rem", fontWeight:700, cursor:"pointer",
                  backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                }}>Tout ({totalPostsCount ?? activePosts.length})</button>
                {availableDates.map(date => {
                  const count = totalDays[date] ?? activePosts.filter(p => p.at?.startsWith(date)).length;
                  const active = selectedDate === date;
                  return (
                    <button key={date} onClick={() => setSelectedDate(active ? null : date)} style={{
                      flexShrink:0, whiteSpace:"nowrap",
                      background: active ? "var(--gold)" : "rgba(30,18,10,.55)",
                      color:      active ? "#0A0705"     : "rgba(245,240,235,.85)",
                      border:    `1.5px solid ${active ? "var(--gold)" : "rgba(245,240,235,.22)"}`,
                      borderRadius:20, padding:".36rem .85rem", fontSize:".76rem", fontWeight:700, cursor:"pointer",
                      backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
                    }}>
                      {formatDateChip(date)}<span style={{ opacity:.6, fontWeight:500, marginLeft:".3rem" }}>·{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {feedLoading && activeTab === "feed" && [1,2,3].map(i => (
              <div key={i} className="post-card" style={{ margin:"0 1rem 1.25rem" }}>
                <div className="skeleton" style={{ width:"100%",aspectRatio:"1/1" }}/>
                <div style={{ padding:".85rem 1rem .65rem" }}>
                  <div className="skeleton" style={{ height:11,width:"38%",borderRadius:6,marginBottom:10 }}/>
                  <div className="skeleton" style={{ height:9,width:"65%",borderRadius:6 }}/>
                </div>
              </div>
            ))}

            {!feedLoading && activeTab === "feed" && posts.length === 0 && (
              <div className="feed-empty">
                <div className="ico">📷</div>
                <div style={{ fontWeight:600,fontSize:"1rem" }}>Aucune photo pour l'instant</div>
                <div style={{ fontSize:".85rem" }}>Sois le premier à partager un souvenir !</div>
              </div>
            )}

            {/* ── Section Mon profil ── */}
            {activeTab === "profil" && (
              <>
                {!currentUser ? (
                  <div className="feed-empty">
                    <div className="ico">🔒</div>
                    <div style={{ fontWeight:600,fontSize:"1rem" }}>Connecte-toi</div>
                    <div style={{ fontSize:".85rem" }}>Crée un compte pour voir ton profil</div>
                  </div>
                ) : (() => {
                  const myPin = allPins?.[myKey] || {};
                  const myAvatar = myPin.avatar || null;
                  const myPseudo = myPin.pseudo || null;
                  const myDisplayName = myPseudo ? `@${myPseudo}` : currentUser.fn;
                  const myInitiale = (myPseudo || currentUser.fn || "?")[0]?.toUpperCase();
                  return (
                    <>
                      {/* ── Carte de profil ── */}
                      <div style={{ margin:"0 1rem 1rem",background:"rgba(18,12,8,.78)",border:"1px solid rgba(232,160,32,.25)",borderRadius:20,padding:"1.25rem 1rem 1rem",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1rem" }}>
                          {/* Avatar — cliquable pour éditer */}
                          <div style={{ position:"relative", flexShrink:0, cursor:"pointer" }} onClick={() => setShowEditProfile(true)}>
                            {myAvatar
                              ? <img src={myAvatar} alt={myDisplayName} style={{ width:68,height:68,borderRadius:"50%",objectFit:"cover",border:"2.5px solid var(--gold)" }}/>
                              : <div style={{ width:68,height:68,borderRadius:"50%",background:"rgba(232,160,32,.2)",border:"2.5px solid rgba(232,160,32,.55)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",fontWeight:700,color:"var(--gold)" }}>{myInitiale}</div>
                            }
                            <div style={{ position:"absolute",bottom:0,right:0,width:22,height:22,borderRadius:"50%",background:"var(--gold)",border:"2px solid rgba(18,12,8,1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".65rem" }}>✏️</div>
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ display:"flex",alignItems:"center",gap:".5rem" }}>
                              <div style={{ fontWeight:800,fontSize:"1.1rem",color:"var(--txt)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{myDisplayName}</div>
                              <button onClick={() => setShowEditProfile(true)} style={{ background:"none",border:"none",cursor:"pointer",padding:".1rem .3rem",borderRadius:6,color:"rgba(245,240,235,.35)",fontSize:".8rem",flexShrink:0 }}>✏️</button>
                            </div>
                            {myPseudo && (
                              <div style={{ fontSize:".78rem",color:"rgba(245,240,235,.45)",marginTop:".1rem" }}>{currentUser.fn} {currentUser.ln}</div>
                            )}
                            <div style={{ fontSize:".72rem",color:"rgba(245,240,235,.38)",marginTop:".15rem" }}>
                              {currentUser.role === "staff" ? "🎓 Équipe" : "👦 Colon·ne"}
                            </div>
                          </div>
                        </div>
                        {/* Stats — 2 cases cliquables */}
                        <div style={{ display:"flex",gap:0,borderTop:"1px solid rgba(255,255,255,.07)",paddingTop:".85rem" }}>
                          {/* Posts */}
                          <div style={{ flex:1,textAlign:"center",borderRight:"1px solid rgba(255,255,255,.07)" }}>
                            <div style={{ fontWeight:800,fontSize:"1.15rem",color:"var(--gold)" }}>{userPostCounts[myKey] ?? myPosts.length}</div>
                            <div style={{ fontSize:".65rem",color:"rgba(245,240,235,.42)",marginTop:".1rem",textTransform:"uppercase",letterSpacing:".06em" }}>{(userPostCounts[myKey] ?? myPosts.length) !== 1 ? "posts" : "post"}</div>
                          </div>
                          {/* Mentions — cliquable */}
                          <button onClick={() => setShowMentions(v => !v)}
                            style={{ flex:1,textAlign:"center",background:"none",border:"none",cursor:"pointer",padding:0 }}>
                            <div style={{ fontWeight:800,fontSize:"1.15rem",color: myMentions.length > 0 ? "var(--gold)" : "rgba(245,240,235,.55)" }}>
                              {myMentions.length}
                              {myMentions.length > 0 && <span style={{ fontSize:".7rem",marginLeft:3 }}>📣</span>}
                            </div>
                            <div style={{ fontSize:".65rem",color:"rgba(245,240,235,.42)",marginTop:".1rem",textTransform:"uppercase",letterSpacing:".06em" }}>{myMentions.length !== 1 ? "mentions" : "mention"}</div>
                          </button>
                        </div>

                        {/* ── Liste mentions inline (dans la carte) ── */}
                        {showMentions && myMentions.length > 0 && (
                          <div style={{ marginTop:".75rem",borderTop:"1px solid rgba(255,255,255,.07)" }}>
                            {myMentions.map(({ post, comment }, idx) => (
                              <button key={idx}
                                onClick={() => { setActiveTab("feed"); setScrollToPostId(post.id); }}
                                style={{ width:"100%",display:"flex",flexDirection:"column",gap:".2rem",padding:".55rem 0",background:"none",border:"none",borderBottom:"1px solid rgba(255,255,255,.05)",cursor:"pointer",textAlign:"left",color:"var(--txt)" }}>
                                <div style={{ fontSize:".7rem",color:"rgba(245,240,235,.38)" }}>
                                  Post de {post.author} · {new Date(post.at).toLocaleDateString("fr-FR",{ day:"numeric",month:"short" })}
                                </div>
                                <div style={{ fontSize:".82rem" }}>
                                  <span style={{ color:"var(--gold)",fontWeight:600 }}>{comment.author}</span>
                                  {" : "}{comment.text.length > 70 ? comment.text.slice(0,70)+"…" : comment.text}
                                </div>
                                <div style={{ fontSize:".68rem",color:"rgba(232,160,32,.55)",marginTop:".05rem" }}>Voir le post →</div>
                              </button>
                            ))}
                          </div>
                        )}
                        {showMentions && myMentions.length === 0 && (
                          <div style={{ marginTop:".65rem",paddingTop:".65rem",borderTop:"1px solid rgba(255,255,255,.07)",fontSize:".82rem",color:"rgba(245,240,235,.35)",fontStyle:"italic",textAlign:"center" }}>
                            Aucune mention pour l'instant
                          </div>
                        )}

                        {/* Abonnements row */}
                        <button onClick={() => setShowSubsSheet(true)}
                          style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:".85rem",paddingTop:".75rem",borderTop:"1px solid rgba(255,255,255,.07)",background:"none",border:"none",borderTop:"1px solid rgba(255,255,255,.07)",cursor:"pointer",color:"var(--txt)",textAlign:"left" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:".55rem" }}>
                            <span style={{ fontSize:"1rem" }}>🔔</span>
                            <div>
                              <div style={{ fontWeight:700,fontSize:".88rem" }}>Abonnements</div>
                              <div style={{ fontSize:".72rem",color:"rgba(245,240,235,.38)",marginTop:".05rem" }}>
                                {myFollowing.length > 0 ? `${myFollowing.length} suivi${myFollowing.length>1?"s":""}` : "Suis des personnes"}
                              </div>
                            </div>
                          </div>
                          <span style={{ color:"rgba(245,240,235,.3)",fontSize:".85rem" }}>›</span>
                        </button>
                      </div>

                      {/* ── Onglets Photos / Commentaires ── */}
                      <div style={{ display:"flex",gap:".5rem",padding:"0 1rem .75rem" }}>
                        {[["photos","📷 Photos"],["comments","💬 Commentaires"]].map(([id,label]) => (
                          <button key={id} onClick={() => setMyProfileTab(id)}
                            style={{ flex:1,padding:".5rem",borderRadius:10,fontWeight:700,fontSize:".8rem",cursor:"pointer",border:`1.5px solid ${myProfileTab===id?"var(--gold)":"rgba(245,240,235,.15)"}`,background:myProfileTab===id?"rgba(232,160,32,.12)":"rgba(14,10,7,.4)",color:myProfileTab===id?"var(--gold)":"rgba(245,240,235,.6)" }}>
                            {label}
                          </button>
                        ))}
                      </div>

                      {myProfileTab === "photos" && (myAllPosts.length === 0 ? (
                        <div className="feed-empty">
                          <div className="ico">📷</div>
                          <div style={{ fontWeight:600,fontSize:"1rem" }}>Aucune publication</div>
                          <div style={{ fontSize:".85rem" }}>Partage ta première photo !</div>
                        </div>
                      ) : (
                        <div style={{ margin:"0 1rem",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3 }}>
                          {myAllPosts.map(post => {
                            const likes = post.likes || 0;
                            return (
                              <div key={post.id} onClick={() => setLightbox(post)}
                                style={{ position:"relative",aspectRatio:"1/1",overflow:"hidden",borderRadius:6,cursor:"pointer",background:"rgba(30,18,10,.5)" }}>
                                <img src={post.photo} alt={post.caption || "photo"} loading="lazy"
                                  style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
                                {likes > 0 && (
                                  <div style={{ position:"absolute",bottom:4,right:5,background:"rgba(0,0,0,.55)",borderRadius:8,padding:".1rem .35rem",fontSize:".65rem",fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:2 }}>
                                    <span>🔥</span>{likes}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}

                      {myProfileTab === "comments" && (
                        <div style={{ margin:"0 0 2rem" }}>
                          <CommentsTab
                            userPosts={myAllPosts}
                            onGoToPost={post => { setActiveTab("feed"); setScrollToPostId(post.id); }}
                          />
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {selectedDate && displayedPosts.length === 0 && (
              <div className="feed-empty">
                <div className="ico">📅</div>
                <div style={{ fontWeight:600,fontSize:"1rem" }}>Aucune photo ce jour-là</div>
              </div>
            )}

            {activeTab === "feed" && displayedPosts.map(post => {
              const ci = commentInputs[post.id] || { author:"",text:"" };
              const doComment = () => {
                const author = currentUser ? (allPins?.[myKey]?.pseudo || currentUser.pseudo || currentUser.fn) : ci.author;
                const authorKey = currentUser ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}` : null;
                if (!ci.text.trim() || !author.trim()) return;
                handleAddComment(post.id, ci.text, author, authorKey);
                setCommentInputs(p => ({ ...p, [post.id]: { author:ci.author, text:"" } }));
              };
              return (
                <div key={post.id} id={`post-${post.id}`} className="post-card">
                  <div className="post-img-wrap" onClick={() => handlePostTap(post)} style={{ cursor:"pointer",position:"relative" }}>
                    <img src={post.photo} alt={post.caption || "photo de la colo"} loading="lazy"/>
                    {likeFlash === post.id && (
                      <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none" }}>
                        <span style={{ fontSize:"4.5rem",animation:"like-flash .75s ease-out both" }}>🔥</span>
                      </div>
                    )}
                  </div>
                  <div className="post-body">
                    <div style={{ display:"flex",alignItems:"center",gap:".55rem",marginBottom:".2rem" }}>
                      {(() => {
                        const avatar = post.authorKey ? allPins?.[post.authorKey]?.avatar : null;
                        const initiale = (post.author || "?")[0]?.toUpperCase();
                        return avatar
                          ? <img src={avatar} alt={post.author} style={{ width:30,height:30,borderRadius:"50%",objectFit:"cover",border:"1.5px solid rgba(232,160,32,.4)",flexShrink:0 }}/>
                          : <div style={{ width:30,height:30,borderRadius:"50%",background:"rgba(232,160,32,.18)",border:"1.5px solid rgba(232,160,32,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".78rem",fontWeight:700,color:"var(--gold)",flexShrink:0 }}>{initiale}</div>;
                      })()}
                      <span className="post-author" style={{ margin:0,cursor:post.authorKey ? "pointer" : "default" }}
                        onClick={post.authorKey ? () => {
                          if (post.authorKey === myKey) { setActiveTab("profil"); window.scrollTo({top:0,behavior:"smooth"}); }
                          else setViewedProfile(post.authorKey);
                        } : undefined}>
                        {(post.authorKey && allPins?.[post.authorKey]?.pseudo) || post.author}
                      </span>
                      {(() => {
                        const uk = currentUser ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}` : null;
                        const canDel = isAdmin || currentUser?.role === "staff" || (currentUser && post.author && (post.authorKey ? post.authorKey === uk : post.author.toLowerCase() === currentUser.fn.toLowerCase()));
                        return canDel && <button className="del-post" onClick={() => handleDeletePost(post.id)}>🗑</button>;
                      })()}
                    </div>
                    {post.caption && <div className="post-caption">{post.caption}</div>}
                    <div className="post-actions">
                      {/* 🔥 Like (double-tap ou bouton direct) */}
                      <button onClick={() => handleLike(post.id)}
                        style={{ display:"flex",alignItems:"center",gap:".3rem",background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0,transition:"opacity .15s" }}>
                        <span style={{ fontSize:"1.1rem",lineHeight:1, opacity: likedIds.has(post.id) ? 1 : 0.3 }}>🔥</span>
                        {(post.likes || 0) > 0 && <span style={{ fontSize:".82rem",fontWeight:600,color: likedIds.has(post.id) ? "var(--gold)" : "rgba(245,240,235,.4)" }}>{post.likes}</span>}
                      </button>

                      <span className="post-time" style={{ marginLeft:"auto" }}>{new Date(post.at).toLocaleString("fr-FR",{ day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" })}</span>
                      {/* Souvenir + Signaler empilés à droite */}
                      <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".3rem",marginLeft:".4rem",flexShrink:0 }}>
                        {post.photo && (
                          <button onClick={() => setPostcardPost(post)} style={{ background:"rgba(232,160,32,.1)",border:"1px solid rgba(232,160,32,.28)",color:"rgba(232,160,32,.85)",fontSize:".7rem",fontWeight:700,cursor:"pointer",padding:".22rem .6rem",borderRadius:20,whiteSpace:"nowrap",lineHeight:1 }}>
                            📸 Souvenir
                          </button>
                        )}
                        {(currentUser?.role === "staff" || isAdmin) && (() => {
                          const myKey2 = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
                          const alreadyReported = reports[post.id]?.reporters?.some(r => r.key === myKey2);
                          if (post.authorKey === myKey2) return null;
                          return (
                            <button
                              onClick={() => alreadyReported ? null : setReportConfirm(post.id)}
                              style={{ background:"rgba(245,240,235,.05)",border:"1px solid rgba(245,240,235,.18)",color: alreadyReported ? "rgba(245,240,235,.3)" : "rgba(245,240,235,.55)",fontSize:".7rem",fontWeight:700,cursor: alreadyReported ? "default" : "pointer",padding:".22rem .6rem",borderRadius:20,whiteSpace:"nowrap",lineHeight:1,transition:"opacity .15s" }}
                            >
                              {alreadyReported ? "Signalé 🚩" : "Signaler 🚩"}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="post-comments">
                    {(post.comments || []).map((c, i) => {
                      const userKey = currentUser ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}` : null;
                      const canDelCmt = isAdmin || currentUser?.role === "staff" || (currentUser && (c.authorKey ? c.authorKey === userKey : c.author.toLowerCase() === currentUser.fn.toLowerCase()));
                      return (
                        <div key={i} className="cmt">
                          <span className="cmt-author">{c.author}</span>
                          <span className="cmt-text">{renderMentions(c.text)}</span>
                          {canDelCmt && <button className="del-cmt" onClick={() => handleDeleteComment(post.id, i)}>✕</button>}
                        </div>
                      );
                    })}
                    <div className="cmt-form">
                      {!currentUser && (
                        <input className="cmt-inp" placeholder="Prénom" value={ci.author}
                          style={{ width:80,flexShrink:0 }}
                          onChange={e => setCommentInputs(p => ({ ...p, [post.id]: { ...ci, author:e.target.value } }))}/>
                      )}
                      {currentUser && (
                        <span style={{ fontSize:".78rem",color:"var(--gold)",fontWeight:600,flexShrink:0,padding:"0 .25rem" }}>
                          {currentUser.pseudo || currentUser.fn}
                        </span>
                      )}
                      <input
                        data-mention-input={post.id}
                        className="cmt-inp"
                        placeholder="Commentaire… ou @prénom"
                        value={ci.text}
                        style={{ flex:1 }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        onChange={e => handleCmtChange(post.id, e.target.value, ci, e.target)}
                        onKeyDown={e => {
                          if (e.key === "Enter")  { closeMention(); doComment(); }
                          if (e.key === "Escape") { closeMention(); }
                        }}
                      />
                      <button className="cmt-btn" onClick={doComment}>→</button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Sentinel + Charger plus (feed uniquement) */}
            {/* ── Onglet Signalements (staff) ── */}
            {activeTab === "signalements" && (
              <div style={{ padding:"0 1rem 2rem" }}>
                {(() => {
                  const flagged = Object.entries(reports)
                    .filter(([, r]) => r.reporters?.length > 0)
                    .map(([postId, r]) => ({ postId, reporters: r.reporters, post: posts.find(p => p.id === postId) }))
                    .filter(({ post }) => !!post)
                    .sort((a,b) => b.reporters.length - a.reporters.length);

                  if (flagged.length === 0) return (
                    <div style={{ textAlign:"center",padding:"3rem 1rem",color:"rgba(245,240,235,.3)" }}>
                      <div style={{ fontSize:"2.5rem",marginBottom:".75rem" }}>✅</div>
                      <div style={{ fontWeight:600 }}>Aucun signalement</div>
                    </div>
                  );

                  return flagged.map(({ postId, reporters, post }) => (
                    <div key={postId} style={{ background:"rgba(18,12,8,.92)",border:"1px solid rgba(248,113,113,.35)",borderRadius:18,padding:"1rem",marginBottom:".85rem",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)" }}>
                      {/* Info signalement */}
                      <div style={{ display:"flex",alignItems:"center",gap:".6rem",marginBottom:".75rem" }}>
                        <span style={{ background:"rgba(248,113,113,.2)",color:"#f87171",borderRadius:20,padding:".2rem .65rem",fontWeight:700,fontSize:".78rem" }}>
                          🚩 {reporters.length} signalement{reporters.length>1?"s":""}
                        </span>
                        <span style={{ fontSize:".72rem",color:"rgba(245,240,235,.35)" }}>
                          par {reporters.map(r => r.name).join(", ")}
                        </span>
                      </div>

                      {/* Miniature + infos post */}
                      <div style={{ display:"flex",gap:".75rem",alignItems:"flex-start",marginBottom:".85rem" }}>
                        {post.photo && (
                          <img src={post.photo} alt="" style={{ width:80,height:80,borderRadius:12,objectFit:"cover",flexShrink:0,border:"1px solid rgba(248,113,113,.3)",cursor:"pointer" }}
                            onClick={() => setLightbox(post)}/>
                        )}
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontWeight:700,fontSize:".9rem",color:"var(--gold)" }}>{post.author}</div>
                          <div style={{ fontSize:".78rem",color:"rgba(245,240,235,.5)",marginTop:".15rem" }}>
                            {new Date(post.at).toLocaleString("fr-FR",{ day:"numeric",month:"short",hour:"2-digit",minute:"2-digit" })}
                          </div>
                          {post.caption && (
                            <div style={{ fontSize:".82rem",color:"rgba(245,240,235,.7)",marginTop:".3rem",wordBreak:"break-word" }}>{post.caption}</div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display:"flex",gap:".5rem" }}>
                        <button
                          onClick={() => { handleDeletePost(postId); handleClearReport(postId); }}
                          style={{ flex:1,padding:".6rem",borderRadius:12,border:"none",background:"rgba(248,113,113,.85)",color:"#fff",fontFamily:"'Inter',sans-serif",fontWeight:700,fontSize:".82rem",cursor:"pointer" }}>
                          🗑 Supprimer le post
                        </button>
                        <button
                          onClick={() => handleClearReport(postId)}
                          style={{ flex:1,padding:".6rem",borderRadius:12,border:"1px solid rgba(100,220,120,.45)",background:"rgba(74,222,128,.12)",color:"#4ade80",fontFamily:"'Inter',sans-serif",fontWeight:700,fontSize:".82rem",cursor:"pointer" }}>
                          ✓ Ignorer
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {activeTab === "feed" && !selectedDate && (
              <>
                <div ref={sentinelRef} style={{ height:1 }}/>
                {loadingMore && (
                  <div style={{ display:"flex",justifyContent:"center",padding:"1.5rem",gap:".5rem" }}>
                    {[0,1,2].map(i => <div key={i} className="skeleton" style={{ width:8,height:8,borderRadius:"50%",animationDelay:`${i*0.15}s` }}/>)}
                  </div>
                )}
                {hasMorePosts && !loadingMore && posts.length > 0 && !feedLoading && (
                  <div style={{ display:"flex",justifyContent:"center",padding:".75rem 1rem 1.25rem" }}>
                    <button onClick={loadMorePosts} style={{ background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",borderRadius:20,padding:".55rem 1.5rem",color:"rgba(245,240,235,.7)",fontSize:".82rem",fontWeight:600,cursor:"pointer",backdropFilter:"blur(8px)" }}>
                      Charger plus ↓
                    </button>
                  </div>
                )}
                {!hasMorePosts && posts.length > 0 && !feedLoading && (
                  <div style={{ textAlign:"center",padding:"1.5rem 1rem 2rem",fontSize:".72rem",color:"rgba(245,240,235,.25)",letterSpacing:".1em",textTransform:"uppercase" }}>— Fin du feed —</div>
                )}
              </>
            )}
          </div>
        </div>
      </PullToRefresh>

      {!postSheet && !postcardPost && (
        <button className="feed-fab" onClick={() => { setPostSheet(true); setPostMsg(null); if (currentUser) setPostForm(p => ({ ...p, author:currentUser.pseudo || currentUser.fn })); }}>+</button>
      )}

      {postSheet && (
        <div className="feed-overlay" onClick={e => { if (e.target === e.currentTarget) { setPostSheet(false); setPostMsg(null); } }}>
          <div className="post-sheet">
            <div className="sheet-title">✨ Partager un souvenir</div>
            {postForm.photo
              ? <div className="post-photo-zone" style={{ marginBottom:".85rem" }}><img src={postForm.photo} alt="preview" style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:12 }}/></div>
              : <div className="post-photo-zone" style={{ display:"flex",alignItems:"center",justifyContent:"center",marginBottom:".85rem" }}><div className="photo-placeholder"><div className="ico">📷</div><div>Choisis une photo</div></div></div>
            }
            <div style={{ display:"flex",gap:".6rem",marginBottom:".85rem" }}>
              <label className="upbtn" style={{ flex:1,justifyContent:"center" }}><span>📷</span>Caméra
                <input type="file" accept="image/*" capture="environment"
                  onChange={async e => { const f=e.target.files?.[0]; if(!f)return; const c=await compressImage(f,720,.72,true); setPostForm(p=>({...p,photo:c})); e.target.value=""; }}/>
              </label>
              <label className="upbtn" style={{ flex:1,justifyContent:"center" }}><span>🖼️</span>Galerie
                <input type="file" accept="image/*"
                  onChange={async e => { const f=e.target.files?.[0]; if(!f)return; const c=await compressImage(f,720,.72,true); setPostForm(p=>({...p,photo:c})); e.target.value=""; }}/>
              </label>
            </div>
            <input className="sheet-inp" placeholder="Ton prénom *" maxLength={30} value={postForm.author || currentUser?.pseudo || currentUser?.fn || ""}
              onChange={e => !currentUser && setPostForm(p => ({ ...p, author:e.target.value }))} readOnly={!!currentUser} style={currentUser ? { opacity:.65,cursor:"default" } : {}}/>
            <textarea className="sheet-inp" placeholder="Un commentaire… (facultatif)" rows={3} value={postForm.caption}
              onChange={e => setPostForm(p => ({ ...p, caption:e.target.value }))} style={{ resize:"none" }}/>
            {postMsg && <div className={`msg ${postMsg.t}`} style={{ marginBottom:".75rem" }}>{postMsg.text}</div>}
            <button className="sheet-submit" disabled={!postForm.photo || !(postForm.author.trim() || currentUser?.fn) || (postMsg?.t === "ok")} onClick={handlePostSubmit}>
              {postMsg?.t === "ok" ? "Publication…" : "Publier 📸"}
            </button>
            <button className="sheet-cancel" onClick={() => { setPostSheet(false); setPostMsg(null); }}>Annuler</button>
          </div>
        </div>
      )}

      {/* ── Lightbox plein écran ── */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img
            src={lightbox.photo}
            className="lightbox-img"
            alt={lightbox.author}
            onClick={e => e.stopPropagation()}
          />
          <div className="lightbox-footer" onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex",flexDirection:"column",gap:".2rem",flex:1,minWidth:0 }}>
              <span style={{ fontWeight:700,color:"var(--gold)",fontSize:".9rem" }}>📍 {lightbox.author}</span>
              {lightbox.caption && <span style={{ color:"rgba(245,240,235,.75)",fontSize:".85rem" }}>{lightbox.caption}</span>}
            </div>
            <div style={{ display:"flex",gap:".5rem",alignItems:"center",flexShrink:0 }}>
              {/* Like */}
              <button
                onClick={() => handleLike(lightbox.id)}
                style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:".35rem",fontSize:"1rem",color: likedIds.has(lightbox.id)?"var(--gold)":"rgba(245,240,235,.7)",fontWeight:600,transition:"opacity .15s" }}
              >
                <span style={{ fontSize:"1.3rem", opacity: likedIds.has(lightbox.id) ? 1 : 0.3 }}>🔥</span>
                {(posts.find(p => p.id === lightbox.id)?.likes || lightbox.likes) || 0}
              </button>
            </div>
          </div>
        </div>
      )}

      {postcardPost && (
        <PostcardSheet
          photo={postcardPost.photo}
          author={postcardPost.author}
          caption={postcardPost.caption}
          onClose={() => setPostcardPost(null)}
        />
      )}

      {/* ── Sheet Édition profil ── */}
      {showEditProfile && <EditProfileSheet onClose={() => setShowEditProfile(false)} />}

      {/* ── Modale confirmation signalement ── */}
      {reportConfirm && createPortal(
        <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(6,3,1,.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem" }}>
          <div style={{ background:"rgba(20,12,8,.97)",border:"1px solid rgba(248,113,113,.3)",borderRadius:22,padding:"1.75rem 1.5rem",maxWidth:300,width:"100%",textAlign:"center",fontFamily:"'Inter',sans-serif" }}>
            <div style={{ fontSize:"2rem",marginBottom:".65rem" }}>🚩</div>
            <div style={{ fontWeight:800,fontSize:"1rem",color:"var(--txt)",marginBottom:".4rem" }}>Signaler ce post ?</div>
            <div style={{ fontSize:".82rem",color:"rgba(245,240,235,.45)",marginBottom:"1.4rem",lineHeight:1.5 }}>
              L'équipe sera notifiée et pourra le supprimer si nécessaire.
            </div>
            <div style={{ display:"flex",gap:".65rem" }}>
              <button onClick={() => setReportConfirm(null)} style={{ flex:1,padding:".65rem",borderRadius:12,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.06)",color:"var(--txt)",fontFamily:"'Inter',sans-serif",fontWeight:700,fontSize:".85rem",cursor:"pointer" }}>Annuler</button>
              <button onClick={() => handleReport(reportConfirm)} style={{ flex:1,padding:".65rem",borderRadius:12,border:"none",background:"rgba(248,113,113,.85)",color:"#fff",fontFamily:"'Inter',sans-serif",fontWeight:700,fontSize:".85rem",cursor:"pointer" }}>Signaler</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Sheet Abonnements (dans Mon profil) ── */}
      {showSubsSheet && currentUser && createPortal(
        <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
          <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.68)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)" }}
            onClick={() => setShowSubsSheet(false)}/>
          <div style={{
            position:"relative",zIndex:1,
            background:"linear-gradient(180deg,rgba(20,13,8,.98) 0%,rgba(10,7,5,.99) 100%)",
            borderTop:"1.5px solid rgba(232,160,32,.35)",
            borderRadius:"22px 22px 0 0",
            height:"80vh",
            display:"flex",flexDirection:"column",
            animation:"murci-slide-up .28s cubic-bezier(.22,.68,0,1.1) both",
          }}>
            {/* Handle + titre */}
            <div style={{ flexShrink:0,padding:".7rem 1.1rem .5rem",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,.07)" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",position:"absolute",left:"50%",top:".7rem",transform:"translateX(-50%)" }}>
                <div style={{ width:38,height:4,borderRadius:2,background:"rgba(245,240,235,.2)" }}/>
              </div>
              <div style={{ fontWeight:800,fontSize:"1rem",color:"var(--txt)",marginTop:".6rem" }}>🔔 Abonnements</div>
              <button onClick={() => setShowSubsSheet(false)} style={{ background:"rgba(245,240,235,.08)",border:"none",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(245,240,235,.7)",fontSize:".82rem",marginTop:".6rem" }}>✕</button>
            </div>
            <div style={{ overflowY:"auto",flex:1,WebkitOverflowScrolling:"touch",padding:"0 1rem calc(1.5rem + env(safe-area-inset-bottom))" }}>
              {/* Mes abonnements */}
              {myFollowing.length > 0 && (
                <>
                  <div style={{ fontSize:".7rem",fontWeight:700,color:"rgba(245,240,235,.35)",textTransform:"uppercase",letterSpacing:".1em",padding:".9rem 0 .5rem" }}>Mes abonnements</div>
                  {myFollowing.map(key => {
                    const pd = getProfileData(key);
                    if (!pd) return null;
                    return (
                      <div key={key} style={{ display:"flex",alignItems:"center",gap:".8rem",padding:".65rem 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                        <div onClick={() => { setShowSubsSheet(false); setTimeout(()=>setViewedProfile(key),150); }} style={{ display:"flex",alignItems:"center",gap:".8rem",flex:1,minWidth:0,cursor:"pointer" }}>
                          {pd.avatar
                            ? <img src={pd.avatar} alt={pd.displayName} style={{ width:42,height:42,borderRadius:"50%",objectFit:"cover",border:"1.5px solid rgba(232,160,32,.4)",flexShrink:0 }}/>
                            : <div style={{ width:42,height:42,borderRadius:"50%",background: pd.isStaff?"rgba(99,102,241,.22)":"rgba(232,160,32,.18)",border:`1.5px solid ${pd.isStaff?"rgba(99,102,241,.4)":"rgba(232,160,32,.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",fontWeight:700,color:pd.isStaff?"#a5b4fc":"var(--gold)",flexShrink:0 }}>{pd.initiale}</div>
                          }
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontWeight:700,fontSize:".88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{pd.displayName}</div>
                            <div style={{ fontSize:".7rem",color:"rgba(245,240,235,.35)" }}>{userPostCounts[pd.userKey] ?? pd.userPosts.length} post{(userPostCounts[pd.userKey] ?? pd.userPosts.length)!==1?"s":""}</div>
                          </div>
                        </div>
                        <button onClick={() => toggleFollow(key)} style={{ background:"transparent",border:"1.5px solid rgba(232,160,32,.5)",borderRadius:20,padding:".35rem .8rem",color:"rgba(232,160,32,.85)",fontSize:".75rem",fontWeight:700,cursor:"pointer",flexShrink:0 }}>
                          Suivi ✓
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
              {/* Suggestions */}
              {(() => {
                const suggestions = Object.keys(allPins || {}).filter(k => k !== myKey && !(myFollowing||[]).includes(k));
                if (suggestions.length === 0) return null;
                return (
                  <>
                    <div style={{ fontSize:".7rem",fontWeight:700,color:"rgba(245,240,235,.35)",textTransform:"uppercase",letterSpacing:".1em",padding:".9rem 0 .5rem" }}>Suggestions</div>
                    {suggestions.map(key => {
                      const pd = getProfileData(key);
                      if (!pd) return null;
                      return (
                        <div key={key} style={{ display:"flex",alignItems:"center",gap:".8rem",padding:".65rem 0",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                          <div onClick={() => { setShowSubsSheet(false); setTimeout(()=>setViewedProfile(key),150); }} style={{ display:"flex",alignItems:"center",gap:".8rem",flex:1,minWidth:0,cursor:"pointer" }}>
                            {pd.avatar
                              ? <img src={pd.avatar} alt={pd.displayName} style={{ width:42,height:42,borderRadius:"50%",objectFit:"cover",border:"1.5px solid rgba(232,160,32,.4)",flexShrink:0 }}/>
                              : <div style={{ width:42,height:42,borderRadius:"50%",background: pd.isStaff?"rgba(99,102,241,.22)":"rgba(232,160,32,.18)",border:`1.5px solid ${pd.isStaff?"rgba(99,102,241,.4)":"rgba(232,160,32,.3)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",fontWeight:700,color:pd.isStaff?"#a5b4fc":"var(--gold)",flexShrink:0 }}>{pd.initiale}</div>
                            }
                            <div style={{ flex:1,minWidth:0 }}>
                              <div style={{ fontWeight:700,fontSize:".88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{pd.displayName}</div>
                              <div style={{ fontSize:".7rem",color:"rgba(245,240,235,.35)" }}>{userPostCounts[pd.userKey] ?? pd.userPosts.length} post{(userPostCounts[pd.userKey] ?? pd.userPosts.length)!==1?"s":""}</div>
                            </div>
                          </div>
                          <button onClick={() => toggleFollow(key)} style={{ background:"var(--gold)",border:"none",borderRadius:20,padding:".35rem .9rem",color:"#0A0705",fontSize:".75rem",fontWeight:700,cursor:"pointer",flexShrink:0 }}>
                            Suivre
                          </button>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
              {myFollowing.length === 0 && Object.keys(allPins||{}).filter(k=>k!==myKey).length === 0 && (
                <div style={{ textAlign:"center",padding:"3rem 1rem",color:"rgba(245,240,235,.3)" }}>
                  <div style={{ fontSize:"2rem",marginBottom:".6rem" }}>👥</div>
                  <div style={{ fontSize:".88rem" }}>Aucun autre utilisateur pour l'instant</div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Profil utilisateur (sheet) ── */}
      {viewedProfile && (() => {
        const pd = getProfileData(viewedProfile);
        if (!pd) return null;
        const isMe = viewedProfile === myKey;
        const isFollowingThem = (myFollowing || []).includes(viewedProfile);
        return createPortal(
          <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",flexDirection:"column",justifyContent:"flex-end" }}>
            {/* Backdrop */}
            <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.68)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)" }}
              onClick={() => setViewedProfile(null)}/>
            {/* Sheet */}
            <div style={{
              position:"relative",zIndex:1,
              background:"linear-gradient(180deg,rgba(20,13,8,.98) 0%,rgba(10,7,5,.99) 100%)",
              borderTop:"1.5px solid rgba(232,160,32,.35)",
              borderRadius:"22px 22px 0 0",
              height:"78vh",
              display:"flex",flexDirection:"column",
              animation:"murci-slide-up .28s cubic-bezier(.22,.68,0,1.1) both",
            }}>
              {/* Handle */}
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:".7rem 1rem .3rem",flexShrink:0 }}>
                <div style={{ width:38,height:4,borderRadius:2,background:"rgba(245,240,235,.2)" }}/>
              </div>
              {/* Header profil */}
              <div style={{ padding:".4rem 1.1rem .9rem",display:"flex",alignItems:"center",gap:".9rem",borderBottom:"1px solid rgba(255,255,255,.08)",flexShrink:0 }}>
                {pd.avatar
                  ? <img src={pd.avatar} alt={pd.displayName} style={{ width:58,height:58,borderRadius:"50%",objectFit:"cover",border:"2.5px solid var(--gold)",flexShrink:0 }}/>
                  : <div style={{ width:58,height:58,borderRadius:"50%",background: pd.isStaff ? "rgba(99,102,241,.22)" : "rgba(232,160,32,.2)",border:`2.5px solid ${pd.isStaff ? "rgba(99,102,241,.5)" : "rgba(232,160,32,.55)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",fontWeight:700,color: pd.isStaff ? "#a5b4fc" : "var(--gold)",flexShrink:0 }}>{pd.initiale}</div>
                }
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:800,fontSize:"1rem",color:"var(--txt)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{pd.displayName}</div>
                  {pd.pin?.fn && pd.pin.pseudo && (
                    <div style={{ fontSize:".73rem",color:"rgba(245,240,235,.42)",marginTop:".1rem" }}>{pd.pin.fn} {pd.pin.ln || ""}</div>
                  )}
                  <div style={{ fontSize:".7rem",color:"rgba(245,240,235,.32)",marginTop:".12rem" }}>{pd.isStaff ? "🎓 Équipe" : "👦 Colon·ne"} · {userPostCounts[pd.userKey] ?? pd.userPosts.length} post{(userPostCounts[pd.userKey] ?? pd.userPosts.length) !== 1 ? "s" : ""}</div>
                </div>
                {!isMe && currentUser && (
                  <button onClick={() => toggleFollow(viewedProfile)} style={{
                    background: isFollowingThem ? "transparent" : "var(--gold)",
                    border:`1.5px solid ${isFollowingThem ? "rgba(232,160,32,.5)" : "var(--gold)"}`,
                    borderRadius:20,padding:".4rem .9rem",
                    color: isFollowingThem ? "rgba(232,160,32,.85)" : "#0A0705",
                    fontSize:".78rem",fontWeight:700,cursor:"pointer",flexShrink:0,
                    transition:"all .2s",
                  }}>
                    {isFollowingThem ? "Suivi ✓" : "Suivre"}
                  </button>
                )}
                <button onClick={() => setViewedProfile(null)} style={{ background:"rgba(245,240,235,.08)",border:"none",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"rgba(245,240,235,.7)",fontSize:".85rem",flexShrink:0 }}>✕</button>
              </div>
              {/* Onglets Photos / Commentaires */}
              <div style={{ display:"flex",gap:".5rem",padding:".6rem 1rem .4rem",flexShrink:0 }}>
                {[["photos","📷 Photos"],["comments","💬 Commentaires"]].map(([id,label]) => (
                  <button key={id} onClick={() => setViewedProfileTab(id)}
                    style={{ flex:1,padding:".45rem",borderRadius:10,fontWeight:700,fontSize:".78rem",cursor:"pointer",border:`1.5px solid ${viewedProfileTab===id?"var(--gold)":"rgba(245,240,235,.15)"}`,background:viewedProfileTab===id?"rgba(232,160,32,.12)":"rgba(14,10,7,.4)",color:viewedProfileTab===id?"var(--gold)":"rgba(245,240,235,.6)" }}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Contenu scrollable */}
              <div style={{ overflowY:"auto",flex:1,WebkitOverflowScrolling:"touch",paddingBottom:"calc(1rem + env(safe-area-inset-bottom))" }}>
                {viewedProfileTab === "photos" && (profilePostsLoading ? (
                  <div style={{ textAlign:"center",padding:"3rem 1rem",color:"rgba(245,240,235,.35)" }}>
                    <div style={{ fontSize:".85rem" }}>Chargement…</div>
                  </div>
                ) : profileAllPosts.length === 0 ? (
                  <div style={{ textAlign:"center",padding:"3rem 1rem",color:"rgba(245,240,235,.35)" }}>
                    <div style={{ fontSize:"2rem",marginBottom:".75rem" }}>📷</div>
                    <div style={{ fontSize:".88rem" }}>Aucune photo pour l'instant</div>
                  </div>
                ) : (
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,padding:3 }}>
                    {profileAllPosts.map(post => {
                      const likes = post.likes || 0;
                      return (
                        <div key={post.id} onClick={() => { setViewedProfile(null); setTimeout(() => setLightbox(post), 160); }}
                          style={{ position:"relative",aspectRatio:"1/1",overflow:"hidden",borderRadius:6,cursor:"pointer",background:"rgba(30,18,10,.5)" }}>
                          <img src={post.photo} alt={post.caption || "photo"} loading="lazy"
                            style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
                          {likes > 0 && (
                            <div style={{ position:"absolute",bottom:4,right:5,background:"rgba(0,0,0,.55)",borderRadius:8,padding:".1rem .35rem",fontSize:".65rem",fontWeight:700,color:"#fff",display:"flex",alignItems:"center",gap:2 }}>
                              <span>🔥</span>{likes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {viewedProfileTab === "comments" && (
                  <CommentsTab
                    userPosts={profileAllPosts}
                    onGoToPost={post => { setViewedProfile(null); setTimeout(() => { setActiveTab("feed"); setScrollToPostId(post.id); }, 200); }}
                  />
                )}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ── Dropdown @mention — portal position:fixed juste au-dessus de l'input ── */}
      {mentionState.postId && mentionInputRef.current && createPortal(
        (() => {
          const rect   = mentionInputRef.current.getBoundingClientRect();
          // Sur iOS avec clavier ouvert, visualViewport donne le vrai décalage
          const vvTop  = window.visualViewport?.offsetTop ?? 0;
          const top    = rect.top + vvTop - 6; // 6px de gap au-dessus de l'input
          return (
            <div
              data-mention-portal="1"
              style={{
                position:     "fixed",
                top,
                transform:   "translateY(-100%)",      // remonte de sa propre hauteur
                left:          Math.max(8, rect.left),
                right:         Math.max(8, window.innerWidth - rect.right),
                background:   "rgba(18,12,8,.97)",
                border:       "1px solid rgba(232,160,32,.35)",
                borderRadius:  12,
                overflow:     "hidden",
                zIndex:        99999,
                boxShadow:    "0 -6px 24px rgba(0,0,0,.6)",
                maxHeight:     220,
                overflowY:    "auto",
              }}
            >
              {mentionSuggestions.length > 0
                ? mentionSuggestions.map((u, i) => (
                    <button
                      key={i}
                      className="mention-opt"
                      onMouseDown={e => {
                        e.preventDefault();
                        selectMention(mentionState.postId, u, commentInputs[mentionState.postId]?.text ?? "");
                      }}
                      onTouchEnd={e => {
                        e.preventDefault();
                        selectMention(mentionState.postId, u, commentInputs[mentionState.postId]?.text ?? "");
                      }}
                    >
                      {u.pseudo
                        ? <><span style={{color:"var(--gold)"}}>@{u.pseudo}</span><span style={{opacity:.45,fontSize:".75rem",marginLeft:".4rem"}}>{u.fn} {u.ln}</span></>
                        : <><span>@{u.fn}</span><span style={{opacity:.45,fontSize:".75rem",marginLeft:".4rem"}}>{u.ln}</span></>
                      }
                    </button>
                  ))
                : (
                  <div style={{padding:".65rem .9rem",color:"rgba(245,240,235,.4)",fontSize:".83rem",fontStyle:"italic"}}>
                    Aucun résultat pour « {mentionState.query} »
                  </div>
                )
              }
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
