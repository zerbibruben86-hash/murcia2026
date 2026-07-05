import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL, barCol } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";
import Confetti from "../components/Confetti";
import ConfirmDialog from "../components/ConfirmDialog";
import SelfieUpload from "../components/SelfieUpload";
import PullToRefresh from "../components/PullToRefresh";

export default function InscriptionsPage() {
  const {
    acts, regs, selId, setSelId, form, setForm, msg, setMsg,
    selAct, status, totalFor, actIsOpen, actPeriodMsg,
    currentUser, confetti, confirmDlg, setConfirmDlg,
    handleSignup, loadData, loading, handleUnsub,
  } = useContext(AppContext);

  const [tab, setTab] = useState("activité");

  const isStaff = currentUser?.role === "staff";
  const activeActs = acts.filter(a => !a.archived);
  const tabActs = activeActs.filter(a => (a.type || "activité") === tab);

  // Inscription courante du user pour ce type
  const myRegForType = currentUser ? regs.find(r => {
    const regAct = acts.find(a => a.id === r.actId);
    const regType = r.actType || regAct?.type || "activité";
    return r.fn.toLowerCase() === currentUser.fn.toLowerCase()
      && r.ln.toLowerCase() === currentUser.ln.toLowerCase()
      && regType === tab
      && !regAct?.archived;
  }) : null;
  const myRegAct = myRegForType ? acts.find(a => a.id === myRegForType.actId) : null;

  const switchTab = t => { setTab(t); setSelId(null); setMsg(null); };

  return (
    <div style={{ position:"relative", minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <Confetti active={confetti}/>
      <ConfirmDialog dlg={confirmDlg} onClose={() => setConfirmDlg(null)}/>
      <Hdr/>
      <Drawer/>
      <PullToRefresh onRefresh={loadData}>
        <main className="main" style={{ paddingBottom:"6rem" }}>

          {/* Header */}
          <div style={{ textAlign:"center", padding:"1.5rem 1rem .75rem" }}>
            <div style={{ fontSize:"2rem", marginBottom:".3rem" }}>🎯</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:"1.5rem", fontWeight:700, color:"var(--txt)", lineHeight:1.15 }}>
              Activités & Veillées
            </div>
            <div style={{ fontSize:".72rem", color:"rgba(245,240,235,.45)", marginTop:".4rem", letterSpacing:".12em", textTransform:"uppercase", fontWeight:600 }}>
              Moadon Espagne 2026
            </div>
          </div>

          {/* Tabs */}
          <div className="song2-tabs">
            <button className={`song2-tab${tab === "activité" ? " active" : ""}`} onClick={() => switchTab("activité")}>
              🌞 Activités
            </button>
            <button className={`song2-tab${tab === "veillée" ? " active" : ""}`} onClick={() => switchTab("veillée")}>
              🌙 Veillées
            </button>
          </div>

          {/* Équipe péda — info banner */}
          {isStaff && (
            <div style={{ margin:"0 1rem 1rem", padding:".75rem 1rem", background:"rgba(232,160,32,.07)", borderRadius:12, border:"1px solid rgba(232,160,32,.18)", display:"flex", alignItems:"center", gap:".6rem", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)" }}>
              <span style={{ fontSize:"1.1rem" }}>🎓</span>
              <div style={{ color:"rgba(245,240,235,.55)", fontSize:".8rem" }}>Tu peux voir les activités, mais l'équipe pédagogique ne s'y inscrit pas.</div>
            </div>
          )}

          {/* Déjà inscrit pour ce type */}
          {!isStaff && myRegForType && myRegAct && (
            <div style={{ margin:"0 1rem 1.25rem", padding:"1rem 1.1rem", background:"rgba(232,160,32,.1)", border:"1.5px solid rgba(232,160,32,.35)", borderRadius:16, backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)" }}>
              <div style={{ fontSize:".7rem", fontWeight:700, color:"var(--gold)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:".55rem" }}>
                ✅ Tu es inscrit·e
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:".75rem" }}>
                <div style={{ width:44, height:44, borderRadius:12, background:myRegAct.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem", flexShrink:0, overflow:"hidden" }}>
                  {myRegAct.photo ? <img src={myRegAct.photo} alt={myRegAct.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : myRegAct.emoji}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:".95rem", color:"var(--txt)" }}>{myRegAct.emoji} {myRegAct.name}</div>
                  <div style={{ fontSize:".75rem", color:"rgba(245,240,235,.5)", marginTop:".15rem" }}>{myRegAct.desc}</div>
                </div>
              </div>
              <button
                onClick={() => setConfirmDlg({ msg:`Se désinscrire de "${myRegAct.name}" ?`, onConfirm: () => handleUnsub(myRegForType.id) })}
                style={{ marginTop:".85rem", background:"transparent", border:"1px solid rgba(245,240,235,.18)", color:"rgba(245,240,235,.45)", borderRadius:10, padding:".42rem .9rem", fontSize:".75rem", cursor:"pointer", display:"block", width:"100%" }}>
                🚪 Se désinscrire
              </button>
            </div>
          )}

          {/* Cartes des activités */}
          {(!myRegForType || isStaff) && (
            loading ? (
              <div className="grid">
                {[1,2].map(i => (
                  <div key={i} className="card" style={{ minHeight:180, pointerEvents:"none" }}>
                    <div className="skeleton" style={{ width:"100%", height:110 }}/>
                    <div style={{ padding:".95rem 1.1rem" }}>
                      <div className="skeleton" style={{ height:13, width:"55%", borderRadius:6, marginBottom:9 }}/>
                      <div className="skeleton" style={{ height:9, width:"78%", borderRadius:6 }}/>
                    </div>
                  </div>
                ))}
              </div>
            ) : tabActs.length === 0 ? (
              <div className="es">
                <div className="es-ico">{tab === "veillée" ? "🌙" : "🎯"}</div>
                <p>Aucune {tab} disponible pour le moment.</p>
              </div>
            ) : (
              <div className="grid">
                {tabActs.map(act => {
                  const st = status(act);
                  const pct = Math.min(st.tot / act.maxTotal * 100, 100);
                  const isSel = selId === act.id;
                  const places = act.maxTotal - st.tot;
                  return (
                    <div key={act.id}
                      className={`card${isSel ? " sel" : ""}${st.totalFull ? " unavail" : ""}`}
                      onClick={() => {
                        if (st.totalFull || !actIsOpen(act)) return;
                        setSelId(isSel ? null : act.id); setMsg(null);
                        setForm(currentUser
                          ? { fn:currentUser.fn, ln:currentUser.ln, gender:currentUser.gender, selfie:"" }
                          : { fn:"", ln:"", gender:"", selfie:"" });
                      }}>
                      {act.photo
                        ? <img src={act.photo} alt={act.name} className="card-photo" onError={e => e.target.style.display="none"}/>
                        : <div className="card-banner" style={{ background:act.color+"22" }}>{act.emoji}</div>}
                      <div className="card-body">
                        <div className="card-name">{act.emoji} {act.name}</div>
                        <div className="card-desc">{act.desc}</div>
                        <div className="cap-bar-bg"><div className="cap-bar" style={{ width:pct+"%", background:barCol(st.tot, act.maxTotal) }}/></div>
                        <div className="cap-row">
                          <span className="cap-txt" style={{ color:barCol(st.tot, act.maxTotal) }}>{st.tot} / {act.maxTotal}</span>
                          {st.totalFull && <span className="tag tag-full">Complet</span>}
                          {!st.totalFull && places <= 5 && <span className="tag tag-few">⚡ {places} place{places > 1 ? "s" : ""}</span>}
                          {isSel && !st.totalFull && actIsOpen(act) && <span className="tag tag-sel">✓ Choisi</span>}
                          {!actIsOpen(act) && actPeriodMsg(act) && <span className="tag" style={{ background:"#F0F0F0", color:"#888", fontSize:".65rem" }}>{actPeriodMsg(act)}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </main>
      </PullToRefresh>

      {/* Sheet d'inscription */}
      {selAct && actIsOpen(selAct) && !myRegForType && (
        <>
          <div className="sheet-overlay" onClick={() => { setSelId(null); setMsg(null); }}/>
          <div className="sheet">
            <div className="sheet-drag"/>
            <div className="sheet-hdr">
              <div className="sheet-ico" style={{ background:selAct.color+"22" }}>{selAct.emoji}</div>
              <div>
                <div className="sheet-nm">S'inscrire — {selAct.name}</div>
                <div className="sheet-sub">{selAct.maxTotal - totalFor(selAct.id)} place{selAct.maxTotal - totalFor(selAct.id) > 1 ? "s" : ""} dispo</div>
              </div>
              <button className="sheet-close" onClick={() => { setSelId(null); setMsg(null); }}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="fr">
                <div className="fg"><label className="flbl">Prénom *</label>
                  <input className="finp" type="text" placeholder="Lucas" autoCapitalize="words"
                    value={form.fn} onChange={e => !currentUser && setForm(f => ({ ...f, fn:e.target.value }))}
                    readOnly={!!currentUser} style={currentUser ? { opacity:.65, cursor:"default" } : {}}/>
                </div>
                <div className="fg"><label className="flbl">Nom *</label>
                  <input className="finp" type="text" placeholder="Cohen" autoCapitalize="words"
                    value={form.ln} onChange={e => !currentUser && setForm(f => ({ ...f, ln:e.target.value }))}
                    readOnly={!!currentUser} style={currentUser ? { opacity:.65, cursor:"default" } : {}}/>
                </div>
              </div>
              <label className="flbl" style={{ marginBottom:".5rem" }}>Je suis… *</label>
              <div className="gender-row">
                <button className={`gbtn boy${form.gender === "boy" ? " sel" : ""}`}
                  onClick={() => { if (!currentUser) setForm(f => ({ ...f, gender:"boy" })); }}
                  style={currentUser ? { opacity:.65, cursor:"default" } : {}}><span className="gbtn-ico">👦</span>Garçon</button>
                <button className={`gbtn girl${form.gender === "girl" ? " sel" : ""}`}
                  onClick={() => { if (!currentUser) setForm(f => ({ ...f, gender:"girl" })); }}
                  style={currentUser ? { opacity:.65, cursor:"default" } : {}}><span className="gbtn-ico">👧</span>Fille</button>
              </div>
              <label className="flbl" style={{ marginBottom:".4rem" }}>📸 Selfie <span style={{ color:"var(--mu)", fontWeight:600 }}>(optionnel)</span></label>
              <SelfieUpload value={form.selfie} onChange={v => setForm(f => ({ ...f, selfie:v }))}/>
              {msg && <div className={`msg ${msg.t}`}>{msg.text}</div>}
              {isStaff
                ? <div style={{ textAlign:"center", padding:".85rem", background:"rgba(232,160,32,.07)", border:"1px solid rgba(232,160,32,.2)", borderRadius:12, color:"rgba(245,240,235,.5)", fontSize:".85rem" }}>
                    🎓 L'équipe pédagogique ne peut pas s'inscrire
                  </div>
                : <button className="sbtn" onClick={handleSignup}>Je m'inscris ! 🚀</button>
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}
