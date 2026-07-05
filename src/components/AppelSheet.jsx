import { useState, useEffect, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { AppContext } from "../context/AppContext";

const DOC_APPEL   = () => doc(db, "appels", "current");
const DOC_COUNTER = () => doc(db, "appels", "counter");
const FLASH_MS    = 1200; // ms de vert visible avant de glisser en bas

function relativeTime(ts, _tick) { // _tick force le recalcul à chaque tick
  if (!ts) return null;
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10)   return "à l'instant";
  if (diff < 60)   return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  return `il y a ${Math.floor(diff / 3600)}h`;
}

export default function AppelSheet({ onClose }) {
  const { children } = useContext(AppContext);
  const [activeTab,    setActiveTab]    = useState("appel");

  /* ── état appel ──────────────────────────────────────────────────── */
  const [presences,    setPresences]    = useState({});
  const [lastReset,    setLastReset]    = useState(null);
  const [flashing,     setFlashing]     = useState(new Set());
  const [tapping,      setTapping]      = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const flashTimers  = useRef({});
  const prevPres     = useRef({});

  /* ── état compteur ───────────────────────────────────────────────── */
  const [counter,      setCounter]      = useState(0);
  const [tappingCount, setTappingCount] = useState(false);
  const [confirmResetCounter, setConfirmResetCounter] = useState(false);

  /* ── timer affichage relatif — force re-render toutes les 10s ───── */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const enfants = [...children].sort((a, b) => a.fn.localeCompare(b.fn, "fr"));

  /* ── Listener appel (avec sync animation) ────────────────────────── */
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(DOC_APPEL(), snap => {
      if (!snap.exists()) {
        setPresences({}); setLastReset(null); prevPres.current = {};
        return;
      }
      const data = snap.data();
      const { _lastReset, _presenceTimes, ...presData } = data;
      setLastReset(_lastReset || null);
      setPresences(presData);

      // Sync animation flash pour les autres appareils
      const now = Date.now();
      const times = _presenceTimes || {};
      Object.entries(presData).forEach(([id, isPresent]) => {
        if (isPresent && !prevPres.current[id] && !flashTimers.current[id]) {
          const markedAt = times[id] || now;
          const elapsed  = now - markedAt;
          const remaining = Math.max(0, FLASH_MS - elapsed);
          if (remaining > 0) {
            setFlashing(s => { const n = new Set(s); n.add(id); return n; });
            flashTimers.current[id] = setTimeout(() => {
              setFlashing(s => { const n = new Set(s); n.delete(id); return n; });
              delete flashTimers.current[id];
            }, remaining);
          }
        }
        if (!isPresent) {
          clearTimeout(flashTimers.current[id]);
          delete flashTimers.current[id];
          setFlashing(s => { const n = new Set(s); n.delete(id); return n; });
        }
      });
      prevPres.current = presData;
    });
    return () => { unsub(); Object.values(flashTimers.current).forEach(clearTimeout); };
  }, []);

  /* ── Listener compteur ───────────────────────────────────────────── */
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(DOC_COUNTER(), snap => {
      setCounter(snap.exists() ? (snap.data().value || 0) : 0);
    });
    return unsub;
  }, []);

  /* ── Toggle présence ─────────────────────────────────────────────── */
  const toggle = async (id) => {
    if (!db) return;
    const next = !presences[id];
    const now  = Date.now();
    setTapping(id); setTimeout(() => setTapping(null), 140);

    if (next) {
      setFlashing(s => { const n = new Set(s); n.add(id); return n; });
      clearTimeout(flashTimers.current[id]);
      flashTimers.current[id] = setTimeout(() => {
        setFlashing(s => { const n = new Set(s); n.delete(id); return n; });
        delete flashTimers.current[id];
      }, FLASH_MS);
    } else {
      clearTimeout(flashTimers.current[id]);
      delete flashTimers.current[id];
      setFlashing(s => { const n = new Set(s); n.delete(id); return n; });
    }

    setPresences(p => ({ ...p, [id]: next }));
    prevPres.current = { ...prevPres.current, [id]: next };
    try {
      await setDoc(DOC_APPEL(), {
        [id]: next,
        _presenceTimes: { [id]: next ? now : null },
      }, { merge: true });
    } catch {
      setPresences(p => ({ ...p, [id]: !next }));
    }
  };

  /* ── Reset appel ─────────────────────────────────────────────────── */
  const doReset = async () => {
    setConfirmReset(false);
    Object.values(flashTimers.current).forEach(clearTimeout);
    flashTimers.current = {};
    setFlashing(new Set());
    prevPres.current = {};
    const now = Date.now();
    try {
      await setDoc(DOC_APPEL(), { _lastReset: now });
      setPresences({}); setLastReset(now);
    } catch (e) { console.warn(e); }
  };

  /* ── +1 compteur ─────────────────────────────────────────────────── */
  const increment = async () => {
    if (!db) return;
    setTappingCount(true); setTimeout(() => setTappingCount(false), 120);
    const next = counter + 1;
    setCounter(next);
    try { await setDoc(DOC_COUNTER(), { value: next }); } catch { setCounter(counter); }
  };

  /* ── -1 compteur ─────────────────────────────────────────────────── */
  const decrement = async () => {
    if (!db || counter <= 0) return;
    const next = counter - 1;
    setCounter(next);
    try { await setDoc(DOC_COUNTER(), { value: next }); } catch { setCounter(counter); }
  };

  /* ── Reset compteur ──────────────────────────────────────────────── */
  const doResetCounter = async () => {
    setConfirmResetCounter(false);
    try { await setDoc(DOC_COUNTER(), { value: 0 }); setCounter(0); } catch (e) { console.warn(e); }
  };

  /* ── Listes appel ────────────────────────────────────────────────── */
  const absents  = enfants.filter(c => !presences[c.id] || flashing.has(c.id));
  const presents = enfants.filter(c =>  presences[c.id] && !flashing.has(c.id));
  const total    = enfants.length;
  const allHere  = presents.length === total && total > 0 && flashing.size === 0;

  /* ── Carte enfant ────────────────────────────────────────────────── */
  const Card = ({ child, isPresent }) => {
    const isFlashing = flashing.has(child.id);
    const showGreen  = isPresent || isFlashing;
    const tapped     = tapping === child.id;
    return (
      <button onClick={() => toggle(child.id)} style={{
        padding:".8rem .3rem .65rem", borderRadius:14,
        border:`2px solid ${showGreen ? "rgba(74,222,128,.55)" : "rgba(248,113,113,.45)"}`,
        background: showGreen ? "rgba(74,222,128,.17)" : "rgba(248,113,113,.1)",
        color: showGreen ? "#4ade80" : "#f87171",
        fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:".95rem",
        cursor:"pointer", textAlign:"center", lineHeight:1.2,
        display:"flex", flexDirection:"column", alignItems:"center", gap:".18rem",
        transform: tapped ? "scale(.88)" : "scale(1)",
        transition:"transform .1s, background .25s, border-color .25s, color .25s",
        userSelect:"none", WebkitUserSelect:"none", touchAction:"manipulation",
        position:"relative", overflow:"hidden",
      }}>
        {isFlashing && <div style={{
          position:"absolute", inset:0, borderRadius:12,
          background:"rgba(74,222,128,.2)",
          animation:"flash-pulse 1.2s ease-out forwards",
        }}/>}
        <span style={{ fontSize:"1.2rem", lineHeight:1, position:"relative" }}>{showGreen ? "✓" : "✗"}</span>
        <span style={{ position:"relative" }}>{child.fn}</span>
        <span style={{ fontSize:".66rem", fontWeight:600, opacity:.6, position:"relative" }}>{child.ln}</span>
      </button>
    );
  };

  /* ── En-tête commun ──────────────────────────────────────────────── */
  const Header = () => (
    <div style={{
      padding:"calc(1rem + env(safe-area-inset-top)) 1rem .75rem",
      borderBottom:"1px solid rgba(255,255,255,.08)", flexShrink:0,
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".6rem" }}>
        <div style={{ fontWeight:800, fontSize:"1.05rem", color:"var(--txt)" }}>📋 Appel</div>
        <button onClick={onClose} style={{
          background:"rgba(245,240,235,.1)", border:"none", borderRadius:"50%",
          width:32, height:32, cursor:"pointer", color:"var(--txt)",
          fontSize:".9rem", display:"flex", alignItems:"center", justifyContent:"center",
        }}>✕</button>
      </div>
      {/* Onglets */}
      <div style={{ display:"flex", gap:".5rem" }}>
        {[["appel","👥 Appel"], ["compteur","🔢 Compteur"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            flex:1, padding:".5rem .5rem", borderRadius:20,
            border:`1.5px solid ${activeTab === key ? "var(--gold)" : "rgba(255,255,255,.12)"}`,
            background: activeTab === key ? "var(--gold)" : "rgba(255,255,255,.05)",
            color: activeTab === key ? "#0A0705" : "rgba(245,240,235,.7)",
            fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:".82rem",
            cursor:"pointer", transition:"all .18s",
          }}>{label}</button>
        ))}
      </div>
    </div>
  );

  return createPortal(
    <>
      <style>{`@keyframes flash-pulse{0%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.05)}100%{opacity:0;transform:scale(1)}}`}</style>
      <div style={{
        position:"fixed", inset:0, zIndex:9999,
        background:"rgba(6,3,1,.9)", backdropFilter:"blur(10px)",
        display:"flex", flexDirection:"column", fontFamily:"'Inter',sans-serif",
      }}>
        <Header/>

        {/* ══════════ ONGLET APPEL ══════════ */}
        {activeTab === "appel" && <>
          {/* Sous-header appel */}
          <div style={{
            padding:".55rem 1rem", display:"flex", alignItems:"center",
            justifyContent:"space-between", flexShrink:0,
            borderBottom:"1px solid rgba(255,255,255,.05)",
          }}>
            <div style={{ fontSize:".7rem", color:"rgba(245,240,235,.35)", display:"flex", alignItems:"center", gap:".3rem" }}>
              🔄 {lastReset
                ? <>Dernier reset&nbsp;<strong style={{ color:"rgba(245,240,235,.5)" }}>{relativeTime(lastReset, tick)}</strong></>
                : <span style={{ fontStyle:"italic" }}>Pas encore réinitialisé</span>}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
              <div style={{
                padding:".22rem .6rem", borderRadius:8,
                background: allHere ? "rgba(74,222,128,.15)" : "rgba(248,113,113,.1)",
                border:`1px solid ${allHere ? "rgba(74,222,128,.3)" : "rgba(248,113,113,.22)"}`,
                fontWeight:800, fontSize:"1rem",
                color: allHere ? "#4ade80" : "#f87171",
              }}>
                {presents.length}<span style={{ fontSize:".72rem", opacity:.5 }}>/{total}</span>
              </div>
              <button onClick={() => setConfirmReset(true)} style={{
                background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)",
                color:"#f87171", borderRadius:20, padding:".25rem .65rem",
                fontSize:".7rem", fontWeight:700, cursor:"pointer", fontFamily:"'Inter',sans-serif",
              }}>↺ Reset</button>
            </div>
          </div>

          {/* Barre progression */}
          <div style={{ height:2, background:"rgba(255,255,255,.06)", flexShrink:0 }}>
            <div style={{
              height:"100%", background: allHere ? "#4ade80" : "var(--gold)",
              width:`${total > 0 ? (presents.length/total)*100 : 0}%`,
              transition:"width .3s ease",
            }}/>
          </div>

          <div style={{ flex:1, overflowY:"auto", paddingBottom:"calc(1rem + env(safe-area-inset-bottom))" }}>
            {absents.length > 0 && (
              <div style={{ padding:".75rem .85rem .35rem" }}>
                <div style={{ fontSize:".62rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(248,113,113,.6)", marginBottom:".45rem", display:"flex", alignItems:"center", gap:".35rem" }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"#f87171", display:"inline-block" }}/>
                  Manquants ({absents.filter(c => !flashing.has(c.id)).length})
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:".45rem" }}>
                  {absents.map(c => <Card key={c.id} child={c} isPresent={false}/>)}
                </div>
              </div>
            )}
            {absents.length > 0 && presents.length > 0 && <div style={{ height:1, background:"rgba(255,255,255,.06)", margin:".3rem .85rem" }}/>}
            {presents.length > 0 && (
              <div style={{ padding: absents.length > 0 ? ".35rem .85rem .85rem" : ".75rem .85rem .85rem" }}>
                <div style={{ fontSize:".62rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(74,222,128,.6)", marginBottom:".45rem", display:"flex", alignItems:"center", gap:".35rem" }}>
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"#4ade80", display:"inline-block" }}/>
                  Présents ({presents.length})
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:".45rem" }}>
                  {presents.map(c => <Card key={c.id} child={c} isPresent={true}/>)}
                </div>
              </div>
            )}
            {enfants.length === 0 && (
              <div style={{ textAlign:"center", padding:"4rem 1rem", color:"rgba(245,240,235,.3)", fontSize:".9rem" }}>Aucun enfant dans la liste</div>
            )}
            {allHere && (
              <div style={{ margin:".5rem .85rem", padding:".85rem", background:"rgba(74,222,128,.1)", border:"1px solid rgba(74,222,128,.3)", borderRadius:16, textAlign:"center", color:"#4ade80", fontWeight:700 }}>
                ✅ Tout le monde est là !
              </div>
            )}
          </div>
        </>}

        {/* ══════════ ONGLET COMPTEUR ══════════ */}
        {activeTab === "compteur" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"1.5rem", padding:"2rem 1.5rem", paddingBottom:"calc(2rem + env(safe-area-inset-bottom))" }}>

            {/* Grande zone +1 */}
            <button
              onClick={increment}
              style={{
                width:"100%", maxWidth:320, aspectRatio:"1.4/1",
                borderRadius:28, border:"2px solid rgba(74,222,128,.35)",
                background: tappingCount ? "rgba(74,222,128,.22)" : "rgba(74,222,128,.1)",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                cursor:"pointer", gap:".5rem",
                transform: tappingCount ? "scale(.95)" : "scale(1)",
                transition:"transform .1s, background .15s",
                userSelect:"none", WebkitUserSelect:"none", touchAction:"manipulation",
              }}
            >
              <span style={{ fontSize:"5rem", fontWeight:900, color:"#4ade80", lineHeight:1, fontFamily:"'Space Grotesk',sans-serif" }}>
                {counter}
              </span>
              <span style={{ fontSize:".8rem", color:"rgba(74,222,128,.6)", fontWeight:600, letterSpacing:".08em", textTransform:"uppercase", fontFamily:"'Inter',sans-serif" }}>
                Appuyer = +1
              </span>
            </button>

            {/* Bouton -1 */}
            <button
              onClick={decrement}
              disabled={counter <= 0}
              style={{
                padding:".6rem 2rem", borderRadius:20,
                border:"1.5px solid rgba(248,113,113,.4)",
                background:"rgba(248,113,113,.1)", color: counter <= 0 ? "rgba(248,113,113,.3)" : "#f87171",
                fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:"1rem",
                cursor: counter <= 0 ? "default" : "pointer", transition:"all .15s",
              }}
            >
              − 1 retirer
            </button>

            {/* Reset compteur */}
            <button onClick={() => setConfirmResetCounter(true)} style={{
              background:"rgba(248,113,113,.1)", border:"1.5px solid rgba(248,113,113,.3)",
              color:"#f87171", borderRadius:20, padding:".55rem 2rem",
              fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:".95rem", cursor:"pointer",
            }}>↺ Remettre à zéro</button>

            {/* Confirmation reset compteur */}
            {confirmResetCounter && (
              <div style={{ position:"fixed", inset:0, zIndex:10, background:"rgba(6,3,1,.75)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem" }}>
                <div style={{ background:"rgba(20,12,8,.97)", border:"1px solid rgba(248,113,113,.3)", borderRadius:22, padding:"1.75rem 1.5rem", maxWidth:280, width:"100%", textAlign:"center" }}>
                  <div style={{ fontSize:"2rem", marginBottom:".6rem" }}>🔢</div>
                  <div style={{ fontWeight:800, fontSize:"1rem", color:"var(--txt)", marginBottom:".4rem" }}>Remettre à zéro ?</div>
                  <div style={{ fontSize:".82rem", color:"rgba(245,240,235,.45)", marginBottom:"1.3rem" }}>Le compteur sera remis à 0 pour tous.</div>
                  <div style={{ display:"flex", gap:".65rem" }}>
                    <button onClick={() => setConfirmResetCounter(false)} style={{ flex:1, padding:".6rem", borderRadius:12, border:"1px solid rgba(255,255,255,.12)", background:"rgba(255,255,255,.06)", color:"var(--txt)", fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:".85rem", cursor:"pointer" }}>Annuler</button>
                    <button onClick={doResetCounter} style={{ flex:1, padding:".6rem", borderRadius:12, border:"none", background:"rgba(248,113,113,.85)", color:"#fff", fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:".85rem", cursor:"pointer" }}>Remettre à 0</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Confirmation reset appel ── */}
        {confirmReset && (
          <div style={{ position:"absolute", inset:0, zIndex:10, background:"rgba(6,3,1,.75)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem" }}>
            <div style={{ background:"rgba(20,12,8,.97)", border:"1px solid rgba(248,113,113,.3)", borderRadius:22, padding:"1.75rem 1.5rem", maxWidth:300, width:"100%", textAlign:"center" }}>
              <div style={{ fontSize:"2rem", marginBottom:".6rem" }}>⚠️</div>
              <div style={{ fontWeight:800, fontSize:"1rem", color:"var(--txt)", marginBottom:".4rem" }}>Réinitialiser l'appel ?</div>
              <div style={{ fontSize:".82rem", color:"rgba(245,240,235,.45)", marginBottom:"1.3rem", lineHeight:1.5 }}>Tous les présents remis à zéro sur tous les appareils.</div>
              <div style={{ display:"flex", gap:".65rem" }}>
                <button onClick={() => setConfirmReset(false)} style={{ flex:1, padding:".6rem", borderRadius:12, border:"1px solid rgba(255,255,255,.12)", background:"rgba(255,255,255,.06)", color:"var(--txt)", fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:".85rem", cursor:"pointer" }}>Annuler</button>
                <button onClick={doReset} style={{ flex:1, padding:".6rem", borderRadius:12, border:"none", background:"rgba(248,113,113,.85)", color:"#fff", fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:".85rem", cursor:"pointer" }}>Réinitialiser</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
