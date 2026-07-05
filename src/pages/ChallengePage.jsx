import { useContext, useMemo, useState } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL, compressImage } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";
import Confetti from "../components/Confetti";
import ConfirmDialog from "../components/ConfirmDialog";

export default function ChallengePage() {
  const [showWinnersHistory, setShowWinnersHistory] = useState(false);

  const {
    activeChallenge, challSubs, challenges,
    challSubSheet, setChallSubSheet,
    challSubForm, setChallSubForm,
    challSubMsg, setChallSubMsg,
    challLiked, handleChallSubmit, handleChallLike, handleDeleteChallSub,
    currentUser, isAdmin, confetti, confirmDlg, setConfirmDlg,
  } = useContext(AppContext);

  const [lightbox, setLightbox] = useState(null);

  const activeSubmissions = useMemo(() => {
    if (!activeChallenge) return [];
    return [...challSubs.filter(s => s.challengeId === activeChallenge.id)]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }, [challSubs, activeChallenge]);

  return (
    <div style={{ position:"relative", minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <Confetti active={confetti}/>
      <ConfirmDialog dlg={confirmDlg} onClose={() => setConfirmDlg(null)}/>
      <Hdr/>
      <Drawer/>

      <div style={{ maxWidth:560, margin:"0 auto", paddingBottom:"calc(6.5rem + env(safe-area-inset-bottom))" }}>

        {/* Header */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"1.75rem 1rem 1rem", gap:".5rem" }}>
          <div style={{ fontSize:"2.4rem" }}>🏆</div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:"1.6rem", fontWeight:700, color:"var(--txt)" }}>
            Photo Challenge
          </div>
          <div style={{ fontSize:".75rem", color:"rgba(245,240,235,.75)", letterSpacing:".1em", textTransform:"uppercase", fontWeight:600 }}>
            Le défi photo du jour
          </div>
        </div>

        {/* Bannière challenge actif */}
        {activeChallenge ? (
          <div className="chall-banner">
            <div className="chall-banner-emoji">{activeChallenge.emoji}</div>
            <div>
              <div className="chall-banner-title">Challenge du jour</div>
              <div className="chall-banner-name">{activeChallenge.title}</div>
              {activeChallenge.desc && <div className="chall-banner-desc">{activeChallenge.desc}</div>}
            </div>
          </div>
        ) : (
          <div className="chall-empty-banner">Pas de challenge aujourd'hui 🏕️</div>
        )}

        {/* Gagnants des jours précédents — tout en un, toggle */}
        {(() => {
          const allWinners = challenges.filter(c => !c.active && c.winner).sort((a,b) => new Date(b.at) - new Date(a.at));
          if (allWinners.length === 0) return null;
          return (
            <div style={{ margin:"0 1rem 1rem", border:"1px solid rgba(245,240,235,.1)", borderRadius:14, overflow:"hidden" }}>
              <button
                onClick={() => setShowWinnersHistory(v => !v)}
                style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:".7rem 1rem", background:"rgba(14,10,7,.6)", border:"none", cursor:"pointer", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)" }}>
                <span style={{ fontWeight:700, fontSize:".82rem", color:"rgba(245,240,235,.55)" }}>🏆 Gagnants des jours précédents</span>
                <span style={{ color:"rgba(245,240,235,.3)", fontSize:".75rem" }}>{showWinnersHistory ? "▲" : "▼"}</span>
              </button>
              {showWinnersHistory && (
                <div style={{ background:"rgba(14,10,7,.5)", padding:".75rem", display:"flex", flexDirection:"column", gap:".5rem" }}>
                  {allWinners.map((ch, i) => (
                    <div key={ch.id} style={{ display:"flex", gap:".75rem", alignItems:"center", padding:".65rem .75rem", background: i === 0 ? "rgba(232,160,32,.07)" : "rgba(14,10,7,.4)", borderRadius:10, border:`1px solid ${i === 0 ? "rgba(232,160,32,.2)" : "rgba(245,240,235,.06)"}` }}>
                      <img src={ch.winner.photo} alt={ch.winner.name} style={{ width:52, height:52, objectFit:"cover", borderRadius:10, flexShrink:0, border: i === 0 ? "1.5px solid rgba(232,160,32,.35)" : "none" }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:".68rem", color: i === 0 ? "var(--gold)" : "var(--mu)", marginBottom:".15rem", fontWeight: i === 0 ? 600 : 400 }}>{ch.emoji} {ch.title} · {new Date(ch.at).toLocaleDateString("fr-FR")}</div>
                        <div style={{ fontWeight:700, fontSize:".88rem", color: i === 0 ? "var(--txt)" : "rgba(245,240,235,.7)" }}>🥇 {ch.winner.name}</div>
                        {ch.winner.caption && <div style={{ fontSize:".68rem", color:"rgba(245,240,235,.4)", fontStyle:"italic", marginTop:".1rem" }}>"{ch.winner.caption}"</div>}
                      </div>
                      {i === 0 && <span style={{ fontSize:".65rem", fontWeight:700, color:"var(--gold)", background:"rgba(232,160,32,.12)", border:"1px solid rgba(232,160,32,.2)", borderRadius:6, padding:".15rem .45rem", flexShrink:0 }}>J-1</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Grille des soumissions */}
        {activeSubmissions.length > 0 && (
          <div className="chall-sub-grid">
            {activeSubmissions.map(sub => {
              const userKey = currentUser ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}` : null;
              const canDel = isAdmin || currentUser?.role === "staff" || (currentUser && (sub.authorKey ? sub.authorKey === userKey : sub.author.toLowerCase() === currentUser?.fn.toLowerCase()));
              return (
                <div key={sub.id} className="chall-sub-card">
                  <img src={sub.photo} className="chall-sub-img" alt={sub.author} onClick={() => setLightbox(sub)} style={{ cursor:"pointer" }}/>
                  <div className="chall-sub-footer">
                    <span className="chall-sub-author">📍 {sub.author}</span>
                    {canDel && (
                      <button className="del-post" onClick={() => handleDeleteChallSub(sub.id)}>🗑</button>
                    )}
                    <button
                      className={`post-like${challLiked.has(sub.id) ? " liked" : ""}`}
                      onClick={() => handleChallLike(sub.id)}
                      style={{ marginLeft:"auto" }}
                    >
                      {challLiked.has(sub.id) ? "❤️" : "🤍"} {sub.likes || 0}
                    </button>
                  </div>
                  {sub.caption && <div className="chall-sub-caption">{sub.caption}</div>}
                </div>
              );
            })}
          </div>
        )}

        {activeSubmissions.length === 0 && activeChallenge && (
          <div className="feed-empty">
            <div className="ico">📸</div>
            <div style={{ fontWeight:600 }}>Sois le premier à relever le défi !</div>
            <div style={{ fontSize:".85rem" }}>Prends une photo et partage-la</div>
          </div>
        )}

      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img src={lightbox.photo} className="lightbox-img" alt={lightbox.author} onClick={e => e.stopPropagation()}/>
          <div className="lightbox-footer" onClick={e => e.stopPropagation()}>
            <span style={{ fontWeight:700, color:"var(--gold)" }}>📍 {lightbox.author}</span>
            {lightbox.caption && <span style={{ color:"rgba(245,240,235,.75)", fontSize:".88rem" }}>{lightbox.caption}</span>}
            <button className={`post-like${challLiked.has(lightbox.id) ? " liked" : ""}`} onClick={() => handleChallLike(lightbox.id)} style={{ marginLeft:"auto" }}>
              {challLiked.has(lightbox.id) ? "❤️" : "🤍"} {(activeSubmissions.find(s=>s.id===lightbox.id)?.likes || lightbox.likes) || 0}
            </button>
          </div>
        </div>
      )}

      {/* FAB soumettre */}
      {activeChallenge && !challSubSheet && (
        <button className="feed-fab" onClick={() => {
          setChallSubSheet(true);
          setChallSubMsg(null);
          if (currentUser) setChallSubForm(p => ({ ...p, author:currentUser.fn }));
        }}>+</button>
      )}

      {/* Sheet de soumission */}
      {challSubSheet && (
        <div className="feed-overlay" onClick={e => { if (e.target === e.currentTarget) { setChallSubSheet(false); setChallSubMsg(null); } }}>
          <div className="post-sheet">
            <div className="sheet-title">📸 {activeChallenge?.title}</div>

            {challSubForm.photo
              ? <div className="post-photo-zone" style={{ marginBottom:".85rem" }}>
                  <img src={challSubForm.photo} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:12 }}/>
                </div>
              : <div className="post-photo-zone" style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:".85rem" }}>
                  <div className="photo-placeholder"><div className="ico">📷</div><div>Choisis une photo</div></div>
                </div>
            }

            <div style={{ display:"flex", gap:".6rem", marginBottom:".85rem" }}>
              <label className="upbtn" style={{ flex:1, justifyContent:"center" }}>
                <span>📷</span>Caméra
                <input type="file" accept="image/*" capture="environment"
                  onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const c = await compressImage(f, 720, .72, true);
                    setChallSubForm(p => ({ ...p, photo:c }));
                    e.target.value = "";
                  }}/>
              </label>
              <label className="upbtn" style={{ flex:1, justifyContent:"center" }}>
                <span>🖼️</span>Galerie
                <input type="file" accept="image/*"
                  onChange={async e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const c = await compressImage(f, 720, .72, true);
                    setChallSubForm(p => ({ ...p, photo:c }));
                    e.target.value = "";
                  }}/>
              </label>
            </div>

            <input
              className="sheet-inp"
              placeholder="Ton prénom *"
              maxLength={30}
              value={challSubForm.author || currentUser?.fn || ""}
              onChange={e => !currentUser && setChallSubForm(p => ({ ...p, author:e.target.value }))}
              readOnly={!!currentUser}
              style={currentUser ? { opacity:.65, cursor:"default" } : {}}
            />
            <textarea
              className="sheet-inp"
              placeholder="Un commentaire… (facultatif)"
              rows={3}
              value={challSubForm.caption}
              onChange={e => setChallSubForm(p => ({ ...p, caption:e.target.value }))}
              style={{ resize:"none" }}
            />

            {challSubMsg && (
              <div className={`msg ${challSubMsg.t}`} style={{ marginBottom:".75rem" }}>{challSubMsg.text}</div>
            )}

            <button
              className="sheet-submit"
              disabled={!challSubForm.photo || !(challSubForm.author || currentUser?.fn)}
              onClick={handleChallSubmit}
            >
              Envoyer 🏆
            </button>
            <button className="sheet-cancel" onClick={() => { setChallSubSheet(false); setChallSubMsg(null); }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
