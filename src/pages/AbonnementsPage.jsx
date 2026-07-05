import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";

export default function AbonnementsPage() {
  const { currentUser, allPins, myFollowing, toggleFollow, navTo } = useContext(AppContext);

  const myKey = currentUser
    ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`
    : null;

  const usersWithAccount = Object.entries(allPins || {})
    .filter(([k]) => k !== myKey)
    .map(([k, data]) => ({ key: k, ...data }));

  return (
    <div style={{ position:"relative", minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <Hdr/>
      <Drawer/>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"1.5rem 1rem calc(6rem + env(safe-area-inset-bottom))" }}>
        <div style={{ textAlign:"center", marginBottom:"1.75rem" }}>
          <div style={{ fontSize:"2rem", marginBottom:".4rem" }}>🔔</div>
          <div style={{ fontFamily:"'Dancing Script',cursive", fontSize:"1.9rem", fontWeight:700, color:"var(--txt)", lineHeight:1 }}>
            Mes abonnements
          </div>
          <div style={{ fontSize:".72rem", color:"rgba(245,240,235,.45)", marginTop:".4rem", letterSpacing:".08em", textTransform:"uppercase" }}>
            Reçois une notif quand ils postent une photo
          </div>
        </div>

        {!currentUser ? (
          <div style={{ textAlign:"center", padding:"2rem 1rem", color:"rgba(245,240,235,.5)", fontSize:".9rem" }}>
            <div style={{ fontSize:"2rem", marginBottom:".75rem" }}>🔒</div>
            Connecte-toi pour gérer tes abonnements
          </div>
        ) : usersWithAccount.length === 0 ? (
          <div style={{ textAlign:"center", padding:"2rem 1rem", color:"rgba(245,240,235,.45)", fontSize:".88rem" }}>
            <div style={{ fontSize:"2rem", marginBottom:".75rem" }}>👥</div>
            Aucun autre utilisateur avec un compte pour l'instant
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
            {usersWithAccount.map(({ key, pseudo, fn, ln, role, avatar, ...data }) => {
              const isFollowing = (myFollowing || []).includes(key);
              const [fk, lk] = key.split("_");
              const displayName = pseudo ? `@${pseudo}` : `${fn || fk} ${ln || lk || ""}`.trim();
              const initiale = (pseudo || fn || fk || "?")[0]?.toUpperCase();
              const isStaff = role === "staff";
              return (
                <div key={key} style={{
                  display:"flex", alignItems:"center", gap:".85rem",
                  background:"rgba(18,12,8,.72)", border:`1px solid ${isFollowing ? "rgba(232,160,32,.4)" : "rgba(245,240,235,.1)"}`,
                  borderRadius:16, padding:".85rem 1rem",
                  backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
                  transition:"border-color .2s",
                }}>
                  {avatar
                    ? <img src={avatar} alt={displayName} style={{ width:42,height:42,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:`1.5px solid ${isStaff ? "rgba(99,102,241,.4)" : "rgba(232,160,32,.3)"}` }}/>
                    : <div style={{
                        width:42, height:42, borderRadius:"50%",
                        background: isStaff ? "rgba(99,102,241,.25)" : "rgba(232,160,32,.2)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"1.1rem", fontWeight:700,
                        color: isStaff ? "#a5b4fc" : "var(--gold)",
                        flexShrink:0, border: `1.5px solid ${isStaff ? "rgba(99,102,241,.4)" : "rgba(232,160,32,.3)"}`,
                      }}>{initiale}</div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:".9rem", color:"var(--txt)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize:".72rem", color:"rgba(245,240,235,.38)", marginTop:".1rem" }}>
                      {isStaff ? "🎓 Équipe" : "👦 Colon·ne"}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFollow(key)}
                    style={{
                      background: isFollowing ? "transparent" : "var(--gold)",
                      border: `1.5px solid ${isFollowing ? "rgba(232,160,32,.5)" : "var(--gold)"}`,
                      borderRadius: 20, padding:".42rem 1rem",
                      color: isFollowing ? "rgba(232,160,32,.85)" : "#0A0705",
                      fontSize:".78rem", fontWeight:700, cursor:"pointer", flexShrink:0,
                      transition:"all .2s",
                    }}>
                    {isFollowing ? "Suivi ✓" : "Suivre"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {myFollowing?.length > 0 && (
          <div style={{ marginTop:"1.5rem", padding:".75rem 1rem", background:"rgba(14,10,7,.72)", border:"1px solid rgba(232,160,32,.3)", borderRadius:14, backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", textAlign:"center" }}>
            <div style={{ fontSize:".88rem", fontWeight:700, color:"var(--gold)", marginBottom:".2rem" }}>
              🔔 Tu suis {myFollowing.length} personne{myFollowing.length > 1 ? "s" : ""}
            </div>
            <div style={{ fontSize:".75rem", color:"rgba(245,240,235,.65)" }}>
              Tu recevras une notif à chaque nouvelle photo
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
