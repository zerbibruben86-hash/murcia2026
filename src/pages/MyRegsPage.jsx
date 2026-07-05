import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";
import ConfirmDialog from "../components/ConfirmDialog";
import Stars from "../components/Stars";
import PullToRefresh from "../components/PullToRefresh";

function RegCard({ reg, act, onUnsub, onRate, onComment, onConfirmDlg }) {
  const [editComment, setEditComment] = useState(false);
  const [draft, setDraft] = useState(reg.comment || "");
  const isArchived = !!act?.archived;
  const typeLabel = (reg.actType || act?.type || "activité") === "veillée" ? "🌙 Veillée" : "🌞 Activité";

  return (
    <div className="my-reg-card" style={{ marginBottom:"1.25rem" }}>
      <div style={{ fontSize:".65rem", fontWeight:700, color:"var(--gold)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:".6rem" }}>
        {typeLabel}{isArchived ? " · Archivée" : " · En cours"}
      </div>
      <div className="my-reg-top">
        <div className="my-reg-ico" style={{ background:act?.color+"22" }}>
          {act?.photo ? <img src={act.photo} alt={act.name}/> : act?.emoji || "🎯"}
        </div>
        <div style={{ flex:1 }}>
          <div className="my-reg-nm">{act?.emoji} {act?.name || reg.actName || "Activité"}</div>
          <div className="my-reg-who">
            {reg.gender === "boy" ? "👦" : "👧"} {reg.fn} {reg.ln} · {new Date(reg.at).toLocaleDateString("fr-FR")}
          </div>
        </div>
        {reg.selfie && <img src={reg.selfie} className="my-selfie" alt="selfie"/>}
      </div>

      {/* Note */}
      <div className="my-reg-section">
        <div className="my-reg-section-title">Ta note</div>
        <Stars value={reg.rating || 0} onChange={r => onRate(reg.id, r)}/>
      </div>

      {/* Commentaire */}
      <div className="my-reg-section">
        <div className="my-reg-section-title">Ton avis ✍️ <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(privé)</span></div>
        {reg.comment && !editComment
          ? <div>
              <div className="comment-display">"{reg.comment}"</div>
              <button className="comment-save-btn" style={{ background:"var(--brd-lt)", color:"var(--brd)", marginTop:".5rem" }}
                onClick={() => setEditComment(true)}>Modifier l'avis</button>
            </div>
          : <div>
              <textarea className="comment-ta"
                placeholder="Comment s'est passée cette activité ? 😄"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={3}/>
              <button className="comment-save-btn" onClick={() => { onComment(reg.id, draft); setEditComment(false); }}>
                Enregistrer l'avis
              </button>
            </div>
        }
      </div>

      {/* Désinscrire — seulement si activité active */}
      {!isArchived && (
        <div className="my-reg-section">
          <button className="unsub-btn"
            onClick={() => onConfirmDlg({ msg:`Se désinscrire de "${act?.name || "cette activité"}" ?`, onConfirm: () => onUnsub(reg.id) })}>
            🚪 Se désinscrire de {act?.name || "cette activité"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MyRegsPage() {
  const {
    acts, regs, currentUser, navTo,
    mySearch, setMySearch, myFound, setMyFound, myMsg, setMyMsg,
    confirmDlg, setConfirmDlg,
    handleSearch, handleRate, handleComment, handleUnsub,
    loadData,
  } = useContext(AppContext);

  // Pour les utilisateurs connectés : toutes leurs inscriptions
  const myRegs = currentUser
    ? regs.filter(r =>
        r.fn.toLowerCase() === currentUser.fn.toLowerCase() &&
        r.ln.toLowerCase() === currentUser.ln.toLowerCase()
      )
    : [];

  return (
    <div style={{ position:"relative", minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <ConfirmDialog dlg={confirmDlg} onClose={() => setConfirmDlg(null)}/>
      <Hdr/>
      <Drawer/>
      <PullToRefresh onRefresh={loadData}>
        <div className="my-wrap" style={{ paddingBottom:"5rem" }}>
          <div className="page-title">⭐ Mes inscriptions</div>
          <div className="divider"/>

          {/* Utilisateur connecté */}
          {currentUser && myRegs.length === 0 && (
            <div className="es">
              <div className="es-ico">📝</div>
              <p>Tu n'as pas encore d'inscription, {currentUser.fn} !</p>
              <button className="sbtn" style={{ marginTop:"1.25rem", maxWidth:280 }} onClick={() => navTo("inscriptions")}>
                → Choisir une activité
              </button>
            </div>
          )}

          {currentUser && myRegs.length > 0 && (
            <div style={{ padding:"0 1rem" }}>
              {myRegs.map(reg => {
                const act = acts.find(a => a.id === reg.actId);
                return (
                  <RegCard
                    key={reg.id}
                    reg={reg}
                    act={act}
                    onUnsub={handleUnsub}
                    onRate={handleRate}
                    onComment={handleComment}
                    onConfirmDlg={setConfirmDlg}
                  />
                );
              })}
            </div>
          )}

          {/* Recherche pour non-connectés */}
          {!currentUser && (
            <div className="search-box">
              <h3>🔍 Retrouve ton inscription</h3>
              <div className="fr" style={{ marginBottom:".75rem" }}>
                <div className="fg"><label className="flbl">Prénom</label>
                  <input className="finp" type="text" placeholder="Lucas" autoCapitalize="words"
                    value={mySearch.fn} onChange={e => setMySearch(s => ({ ...s, fn:e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}/>
                </div>
                <div className="fg"><label className="flbl">Nom</label>
                  <input className="finp" type="text" placeholder="Cohen" autoCapitalize="words"
                    value={mySearch.ln} onChange={e => setMySearch(s => ({ ...s, ln:e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}/>
                </div>
              </div>
              <button className="sbtn" onClick={handleSearch}>Rechercher</button>
              {myMsg && !myFound && <div className={`msg ${myMsg.t}`}>{myMsg.text}</div>}
            </div>
          )}

          {/* Résultat recherche non-connecté */}
          {!currentUser && myFound && (() => {
            const act = acts.find(a => a.id === myFound.actId);
            return (
              <RegCard
                reg={myFound}
                act={act}
                onUnsub={id => { handleUnsub(id); setMyFound(null); }}
                onRate={(id, r) => { handleRate(id, r); setMyFound(p => ({ ...p, rating:r })); }}
                onComment={(id, c) => { handleComment(id, c); setMyFound(p => ({ ...p, comment:c })); }}
                onConfirmDlg={setConfirmDlg}
              />
            );
          })()}

          {!currentUser && myFound === false && (
            <div className="no-reg-box">
              <div style={{ fontSize:"3rem", marginBottom:".75rem" }}>🤷</div>
              <p style={{ fontWeight:700, marginBottom:".5rem" }}>Aucune inscription trouvée</p>
              <p style={{ fontSize:".88rem" }}>Vérifie l'orthographe ou inscris-toi d'abord !</p>
              <button className="sbtn" style={{ marginTop:"1.25rem", maxWidth:280 }} onClick={() => navTo("inscriptions")}>→ S'inscrire</button>
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
