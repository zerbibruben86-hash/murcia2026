import { useState, useEffect, useContext, useRef } from "react";
import { AppContext } from "../context/AppContext";
import { db } from "../firebase";
import {
  collection, doc, setDoc, onSnapshot, deleteDoc,
} from "firebase/firestore";
import { Hdr, Drawer } from "../components/Header";

/* ── helpers ───────────────────────────────────────────────────────────── */
function initials(fn, ln) {
  return ((fn?.[0] || "") + (ln?.[0] || "")).toUpperCase() || "?";
}
function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/* ── Carte message ─────────────────────────────────────────────────────── */
function MessageCard({ entry, isMe, isAdmin, onDelete }) {
  const bg = isMe
    ? "linear-gradient(135deg,rgba(232,160,32,.18),rgba(195,110,15,.10))"
    : "rgba(255,255,255,.06)";
  const border = isMe ? "1.5px solid rgba(232,160,32,.35)" : "1px solid rgba(255,255,255,.1)";

  return (
    <div style={{
      background: bg, border, borderRadius: 16, padding: "1rem 1.1rem",
      position: "relative", animation: "fadeIn .3s ease both",
    }}>
      {/* Auteur */}
      <div style={{ display:"flex", alignItems:"center", gap:".65rem", marginBottom:".6rem" }}>
        {entry.avatar
          ? <img src={entry.avatar} alt="" style={{ width:38,height:38,borderRadius:"50%",objectFit:"cover",border:"1.5px solid rgba(232,160,32,.4)",flexShrink:0 }}/>
          : <div style={{ width:38,height:38,borderRadius:"50%",background:"rgba(232,160,32,.2)",border:"1.5px solid rgba(232,160,32,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:".9rem",color:"var(--gold)",flexShrink:0 }}>
              {initials(entry.fn, entry.ln)}
            </div>
        }
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:".9rem", color:"var(--txt)", display:"flex", alignItems:"center", gap:".4rem" }}>
            {entry.pseudo ? `@${entry.pseudo}` : `${entry.fn} ${entry.ln}`}
            {isMe && <span style={{ fontSize:".65rem", color:"rgba(232,160,32,.7)", fontWeight:600, background:"rgba(232,160,32,.12)", borderRadius:6, padding:".1rem .35rem" }}>Toi</span>}
            {entry.role === "staff" && <span style={{ fontSize:".65rem", color:"rgba(99,102,241,.9)", fontWeight:600 }}>🎓</span>}
          </div>
          <div style={{ fontSize:".72rem", color:"rgba(245,240,235,.35)", marginTop:".05rem" }}>
            {formatDate(entry.at)}
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => onDelete(entry.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(245,240,235,.3)",fontSize:".85rem",padding:".2rem" }}>✕</button>
        )}
      </div>
      {/* Message */}
      <p style={{ margin:0, fontSize:".92rem", color:"rgba(245,240,235,.88)", lineHeight:1.55, whiteSpace:"pre-wrap", fontStyle:"italic" }}>
        "{entry.message}"
      </p>
    </div>
  );
}

/* ── Page principale ───────────────────────────────────────────────────── */
export default function LivreOrPage() {
  const { currentUser, isAdmin, livreDorVisible, setLivreDorVisible, navTo } = useContext(AppContext);

  const [entries, setEntries]     = useState([]);
  const [myMessage, setMyMessage] = useState("");
  const [draft, setDraft]         = useState("");
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [togglingVisible, setTogglingVisible] = useState(false);

  const userKey = currentUser
    ? `${currentUser.fn?.trim().toLowerCase()}_${currentUser.ln?.trim().toLowerCase()}`
    : null;

  /* ── Listener Firestore ── */
  useEffect(() => {
    if (!db || !currentUser) return;
    const unsub = onSnapshot(
      collection(db, "livre_or"),
      snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.at || "").localeCompare(b.at || ""));
        setEntries(all);
        const mine = all.find(e => e.id === userKey);
        if (mine) { setMyMessage(mine.message || ""); setDraft(mine.message || ""); }
        setLoadingEntries(false);
      },
      () => setLoadingEntries(false)
    );
    return () => unsub();
  }, [userKey]);

  const hasSaved = entries.some(e => e.id === userKey);

  /* ── Sauvegarder ── */
  const handleSave = async () => {
    if (!draft.trim() || !userKey) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "livre_or", userKey), {
        fn:     currentUser.fn,
        ln:     currentUser.ln,
        pseudo: currentUser.pseudo || null,
        avatar: currentUser.avatar || null,
        role:   currentUser.role,
        message: draft.trim(),
        at:     new Date().toISOString(),
      });
      setMyMessage(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  /* ── Supprimer un message (soi-même ou admin) ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce message ?")) return;
    await deleteDoc(doc(db, "livre_or", id));
    if (id === userKey) { setMyMessage(""); setDraft(""); setEditing(false); }
  };

  /* ── Toggle visibilité ── */
  const handleToggle = async () => {
    setTogglingVisible(true);
    try { await setLivreDorVisible(!livreDorVisible); }
    finally { setTogglingVisible(false); }
  };

  /* ── Export PDF (impression) ── */
  const handlePrint = () => {
    const sorted = [...entries].sort((a, b) => (a.at || "").localeCompare(b.at || ""));
    const rows = sorted.map(e => `
      <div class="card">
        <div class="author">
          <div class="avatar">${(e.fn?.[0] || "") + (e.ln?.[0] || "")}</div>
          <div>
            <div class="name">${e.pseudo ? "@" + e.pseudo : e.fn + " " + e.ln}</div>
            <div class="date">${formatDate(e.at)}</div>
          </div>
        </div>
        <p class="msg">"${e.message}"</p>
      </div>
    `).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Livre d'or — Murcia 2026</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Georgia, serif; background: #fff; color: #1a1a1a; padding: 2cm; }
      h1 { text-align:center; font-size: 2rem; margin-bottom:.4rem; color:#8B5E0A; }
      .sub { text-align:center; color:#888; font-size:.9rem; margin-bottom:2rem; }
      .grid { display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; }
      .card { border:1px solid #e0d0b0; border-radius:10px; padding:1rem; break-inside:avoid; }
      .author { display:flex; align-items:center; gap:.6rem; margin-bottom:.5rem; }
      .avatar { width:36px; height:36px; border-radius:50%; background:#f5e8c0; border:1.5px solid #c8a050; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:.85rem; color:#8B5E0A; flex-shrink:0; }
      .name { font-weight:700; font-size:.88rem; }
      .date { font-size:.72rem; color:#999; margin-top:.05rem; }
      .msg { font-style:italic; font-size:.9rem; color:#333; line-height:1.55; }
      @media print { body { padding: 1cm; } }
    </style></head><body>
    <h1>📖 Livre d'or</h1>
    <p class="sub">Murcia 2026 — ${entries.length} message${entries.length > 1 ? "s" : ""}</p>
    <div class="grid">${rows}</div>
    </body></html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const canSeeAll  = isAdmin || livreDorVisible;
  const othersEntries = entries.filter(e => e.id !== userKey);
  const myEntry       = entries.find(e => e.id === userKey);

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", paddingBottom:"6rem" }}>
      <Hdr/>
      <Drawer/>

      <div style={{ maxWidth:640, margin:"0 auto", padding:"1rem 1rem 0" }}>

        {/* ── Header page ── */}
        <div style={{ textAlign:"center", marginBottom:"1.5rem", paddingTop:".5rem" }}>
          <div style={{ fontSize:"2.5rem", marginBottom:".4rem" }}>📖</div>
          <h2 style={{ color:"var(--gold)", fontWeight:800, fontSize:"1.4rem", margin:0 }}>Livre d'or</h2>
          <p style={{ color:"rgba(245,240,235,.45)", fontSize:".85rem", marginTop:".3rem" }}>
            {canSeeAll
              ? `${entries.length} message${entries.length > 1 ? "s" : ""} du séjour`
              : "Laisse un mot pour te souvenir de ce séjour 🌟"}
          </p>
        </div>

        {/* ── Panneau admin ── */}
        {isAdmin && (
          <div style={{ background:"rgba(232,160,32,.08)", border:"1.5px solid rgba(232,160,32,.25)", borderRadius:16, padding:"1rem 1.1rem", marginBottom:"1.2rem" }}>
            <div style={{ fontWeight:700, color:"var(--gold)", fontSize:".85rem", marginBottom:".75rem", letterSpacing:".05em", textTransform:"uppercase" }}>
              ⚙️ Admin — Livre d'or
            </div>
            {/* Toggle visibilité */}
            <button
              onClick={handleToggle}
              disabled={togglingVisible}
              style={{
                width:"100%", padding:".75rem 1rem", borderRadius:12, border:"1.5px solid",
                borderColor: livreDorVisible ? "rgba(74,222,128,.4)" : "rgba(245,240,235,.2)",
                background:  livreDorVisible ? "rgba(74,222,128,.1)" : "rgba(255,255,255,.04)",
                color: livreDorVisible ? "#4ade80" : "rgba(245,240,235,.65)",
                fontWeight:700, fontSize:".9rem", cursor:"pointer", display:"flex",
                alignItems:"center", justifyContent:"space-between", marginBottom:".75rem",
              }}>
              <span>{livreDorVisible ? "✅ Visible par tous" : "🔒 Caché (enfants & staff)"}</span>
              <span style={{ fontSize:".8rem", opacity:.7 }}>{livreDorVisible ? "Cliquer pour masquer" : "Cliquer pour révéler"}</span>
            </button>
            {/* Export PDF */}
            {entries.length > 0 && (
              <button
                onClick={handlePrint}
                style={{ width:"100%", padding:".65rem 1rem", borderRadius:12, border:"1.5px solid rgba(99,102,241,.35)", background:"rgba(99,102,241,.1)", color:"#a5b4fc", fontWeight:700, fontSize:".88rem", cursor:"pointer" }}>
                📄 Exporter en PDF ({entries.length} messages)
              </button>
            )}
          </div>
        )}

        {/* ── Mon message ── */}
        <div style={{ background:"rgba(232,160,32,.07)", border:"1.5px solid rgba(232,160,32,.2)", borderRadius:16, padding:"1rem 1.1rem", marginBottom:"1.2rem" }}>
          <div style={{ fontWeight:700, color:"var(--gold)", fontSize:".88rem", marginBottom:".6rem" }}>
            ✍️ Mon message
          </div>

          {hasSaved && !editing ? (
            <div>
              <p style={{ margin:"0 0 .75rem", fontSize:".9rem", color:"rgba(245,240,235,.85)", lineHeight:1.55, fontStyle:"italic", whiteSpace:"pre-wrap" }}>
                "{myMessage}"
              </p>
              <div style={{ display:"flex", gap:".5rem" }}>
                <button
                  onClick={() => setEditing(true)}
                  style={{ background:"none", border:"1px solid rgba(232,160,32,.3)", borderRadius:8, padding:".4rem .9rem", color:"rgba(232,160,32,.7)", fontSize:".82rem", cursor:"pointer", fontWeight:600 }}>
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => handleDelete(userKey)}
                  style={{ background:"none", border:"1px solid rgba(245,80,60,.25)", borderRadius:8, padding:".4rem .9rem", color:"rgba(245,80,60,.6)", fontSize:".82rem", cursor:"pointer", fontWeight:600 }}>
                  🗑 Supprimer
                </button>
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Écris un mot pour te souvenir de ce séjour… un moment fort, un souvenir, un message pour l'équipe ❤️"
                maxLength={500}
                rows={5}
                style={{
                  width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid rgba(245,240,235,.15)",
                  borderRadius:10, color:"var(--txt)", fontSize:".9rem", padding:".75rem",
                  resize:"vertical", outline:"none", fontFamily:"inherit", lineHeight:1.5,
                  boxSizing:"border-box",
                }}
              />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:".5rem" }}>
                <span style={{ fontSize:".75rem", color:"rgba(245,240,235,.3)" }}>{draft.length}/500</span>
                <div style={{ display:"flex", gap:".5rem" }}>
                  {editing && (
                    <button onClick={() => { setEditing(false); setDraft(myMessage); }}
                      style={{ background:"none",border:"1px solid rgba(245,240,235,.2)",borderRadius:8,padding:".45rem .9rem",color:"rgba(245,240,235,.5)",fontSize:".85rem",cursor:"pointer" }}>
                      Annuler
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !draft.trim()}
                    style={{ background:"var(--gold)", border:"none", borderRadius:8, padding:".45rem 1.1rem", color:"#0A0705", fontWeight:700, fontSize:".85rem", cursor:"pointer", opacity: (!draft.trim() || saving) ? .5 : 1 }}>
                    {saving ? "…" : hasSaved ? "Modifier" : "Enregistrer ✓"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Messages des autres ── */}
        {canSeeAll && (
          <div>
            {loadingEntries ? (
              <div style={{ textAlign:"center", padding:"2rem", color:"rgba(245,240,235,.3)", fontSize:".9rem" }}>Chargement…</div>
            ) : othersEntries.length === 0 && !myEntry ? (
              <div style={{ textAlign:"center", padding:"2rem", color:"rgba(245,240,235,.3)", fontSize:".9rem" }}>
                Aucun message pour l'instant. Sois le premier ! 🌟
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:".75rem" }}>
                {/* Mon message en premier si existe */}
                {myEntry && (
                  <MessageCard
                    key={myEntry.id}
                    entry={myEntry}
                    isMe={true}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                  />
                )}
                {othersEntries.map(e => (
                  <MessageCard
                    key={e.id}
                    entry={e}
                    isMe={false}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Message si pas encore visible pour les non-admin ── */}
        {!canSeeAll && hasSaved && (
          <div style={{ textAlign:"center", padding:"1.5rem 1rem", color:"rgba(245,240,235,.35)", fontSize:".85rem", lineHeight:1.6 }}>
            Ton message est enregistré 🎉<br/>
            Les messages de tout le monde seront révélés<br/>
            à la fin du séjour par l'équipe.
          </div>
        )}

        {!canSeeAll && !hasSaved && (
          <div style={{ textAlign:"center", padding:"1rem", color:"rgba(245,240,235,.25)", fontSize:".8rem" }}>
            Ton message restera secret jusqu'à la fin du séjour 🔒
          </div>
        )}

      </div>
    </div>
  );
}
