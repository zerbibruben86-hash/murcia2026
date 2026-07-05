import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";
import ConfirmDialog from "../components/ConfirmDialog";
import PullToRefresh from "../components/PullToRefresh";

export default function IdeasPage() {
  const {
    ideas, ideaLiked, ideaInput, setIdeaInput,
    handlePostIdea, handleLikeIdea, handleDeleteIdea,
    loadIdeas, currentUser, isAdmin, confirmDlg, setConfirmDlg,
  } = useContext(AppContext);

  const timeAgo = at => {
    const d = Math.floor((Date.now() - new Date(at)) / 60000);
    if (d < 1) return "à l'instant";
    if (d < 60) return `il y a ${d} min`;
    const h = Math.floor(d / 60);
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
  };

  return (
    <div style={{ position:"relative", minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <ConfirmDialog dlg={confirmDlg} onClose={() => setConfirmDlg(null)}/>
      <Hdr/>
      <Drawer/>
      <PullToRefresh onRefresh={loadIdeas}>
        <main className="main">
          <div className="page-title">💡 Boîte à idées</div>
          <p style={{ color:"var(--mu)",fontSize:".82rem",textAlign:"center",marginBottom:"1.2rem",lineHeight:1.5 }}>
            Propose ce que tu aimerais faire pendant la colo !
          </p>
          <div className="divider"/>

          {/* Zone d'écriture */}
          <div className="idea-compose">
              <textarea
                className="idea-input"
                placeholder="J'aimerais qu'on fasse… 🌟"
                maxLength={280}
                value={ideaInput}
                onChange={e => setIdeaInput(e.target.value)}
                rows={3}
              />
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:".5rem" }}>
                <span style={{ fontSize:".72rem",color:"var(--mu)" }}>{ideaInput.length}/280</span>
                <button className="idea-send-btn" onClick={handlePostIdea} disabled={!ideaInput.trim()}>
                  Envoyer 💡
                </button>
              </div>
          </div>

          {/* Liste des idées */}
          {ideas.length === 0 ? (
            <div className="es">
              <div className="es-ico">💡</div>
              <p>Pas encore d'idées — sois le premier !</p>
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:".75rem",marginTop:"1rem" }}>
              {ideas.map(idea => (
                <div key={idea.id} className="idea-card">
                  <div className="idea-text">{idea.text}</div>
                  <div className="idea-footer">
                    <div>
                      <span className="idea-author">✍️ {idea.author}</span>
                      <span className="idea-time">{timeAgo(idea.at)}</span>
                    </div>
                    <div style={{ display:"flex",gap:".5rem",alignItems:"center" }}>
                      {(isAdmin || currentUser?.role === "staff") && (
                        <button className="idea-del" onClick={() => handleDeleteIdea(idea.id)} title="Supprimer">🗑️</button>
                      )}
                      <button
                        className={`idea-like${ideaLiked.has(idea.id) ? " liked" : ""}`}
                        onClick={() => handleLikeIdea(idea.id)}
                      >
                        {ideaLiked.has(idea.id) ? "❤️" : "🤍"} {idea.likes || 0}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ height:"5rem" }}/>
        </main>
      </PullToRefresh>
    </div>
  );
}
