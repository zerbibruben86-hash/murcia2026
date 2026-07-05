import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { LOGO } from "../utils/logo";
import AppelSheet from "./AppelSheet";

const IcoHome = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
const IcoHub  = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>;
const IcoList = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;
const IcoStar = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const IcoCam  = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M8 7V5.5A2.5 2.5 0 0110.5 3h3A2.5 2.5 0 0116 5.5V7"/><circle cx="12" cy="14" r="3"/></svg>;
const IcoNote = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V6l12-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
const IcoCloud= () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="10" r="3.5"/><path d="M17.5 19H8a4.5 4.5 0 01-.35-9 5 5 0 019.4 1.4A3.5 3.5 0 1117.5 19z"/></svg>;
const IcoCog    = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const IcoTrophy = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4"/><path d="M5 3H3a2 2 0 000 4c0 2.5 1.5 4.5 4 5.5"/><path d="M19 3h2a2 2 0 010 4c0 2.5-1.5 4.5-4 5.5"/><path d="M7 3h10v7a5 5 0 01-10 0V3z"/></svg>;

const IcoBell = () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;

const NAV_ITEMS = [
  { p:"myregs",      Icon:IcoStar, label:"Mes inscriptions",  sub:"Voir, noter, se désinscrire" },
  { p:"feed",        Icon:IcoCam,  label:"Murciagram",        sub:"Le feed photo du séjour" },
];

export function Hdr({ right }) {
  const { menuOpen, setMenuOpen, page, navTo, currentUser, pushBanner, setPushBanner, pushRequestPermission } = useContext(AppContext);
  const canGoHome = !!currentUser && page !== "hub" && page !== "home" && page !== "login";
  return (
    <>
    {pushBanner && (
      <div style={{
        position:"fixed", bottom:"calc(5rem + env(safe-area-inset-bottom))", left:"1rem", right:"1rem",
        background:"#1a0f07", border:"1.5px solid rgba(232,160,32,.4)", borderRadius:16,
        padding:".9rem 1rem", zIndex:200, display:"flex", alignItems:"center", gap:".75rem",
        boxShadow:"0 8px 32px rgba(0,0,0,.55)",
      }}>
        <span style={{fontSize:"1.5rem", flexShrink:0}}>🔔</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:700, fontSize:".88rem", color:"var(--txt)"}}>Activer les notifications</div>
          <div style={{fontSize:".72rem", color:"var(--mu)", marginTop:".15rem"}}>Reçois les mentions et annonces de l'équipe</div>
        </div>
        <button onClick={pushRequestPermission} style={{
          background:"var(--gold)", border:"none", borderRadius:10,
          color:"#0A0705", fontWeight:700, fontSize:".78rem",
          padding:".45rem .75rem", cursor:"pointer", flexShrink:0,
        }}>Activer</button>
      </div>
    )}
    <header className="hdr">
      <div className="hdr-spacer">
        <button className={`burger${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
          <span/><span/><span/>
        </button>
      </div>
      <img
        src={LOGO} alt="Ça Murce" className="logo-img"
        onClick={() => canGoHome && navTo("hub")}
        style={{ cursor: canGoHome ? "pointer" : "default" }}
      />
      <div className="hdr-spacer right">{right}</div>
    </header>
    </>
  );
}

const IcoLogout = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

export function Drawer() {
  const { page, navTo, currentUser, menuOpen, setMenuOpen, doLogout, onlineUsers, setPendingFeedTab, allPins, isAdmin, livreDorVisible } = useContext(AppContext);
  const [showAppel, setShowAppel] = useState(false);
  // Ne pas retourner null si le sheet appel est ouvert (sinon il s'unmount avec le drawer)
  if (!menuOpen && !showAppel) return null;
  return (
    <>
      {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)}/>}
      {menuOpen && <nav className="menu-drawer">
        <div className="menu-head">
          <img src={LOGO} alt="logo" className="menu-logo"/>
          <div className="menu-sub">Moadon Espagne 2026</div>
        </div>
        <div className="menu-items">
          {currentUser && (() => {
            const myKey = `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}`;
            const avatar = allPins?.[myKey]?.avatar;
            const pseudo = allPins?.[myKey]?.pseudo;
            return (
              <div
                className="user-badge"
                style={{ cursor:"pointer" }}
                onClick={() => {
                  setPendingFeedTab("profil");
                  navTo("feed");
                  setMenuOpen(false);
                }}
              >
                {avatar
                  ? <img src={avatar} alt={currentUser.fn} style={{ width:36,height:36,borderRadius:"50%",objectFit:"cover",border:"1.5px solid rgba(232,160,32,.5)",flexShrink:0 }}/>
                  : <div className="user-badge-ico">{currentUser.fn?.[0]?.toUpperCase() || "?"}</div>
                }
                <div>
                  <div className="user-badge-name" style={{ display:"flex",alignItems:"center",gap:".35rem" }}>
                    {pseudo ? `@${pseudo}` : `${currentUser.fn} ${currentUser.ln}`}
                    <span style={{ fontSize:".65rem",color:"rgba(232,160,32,.6)",fontWeight:600 }}>→ profil</span>
                  </div>
                  <div className="user-badge-genre">
                    {currentUser.role === "staff" ? "🎓 Équipe pédagogique" : currentUser.gender === "boy" ? "Garçon" : "Fille"}
                  </div>
                </div>
              </div>
            );
          })()}
          {NAV_ITEMS.map(({ p, Icon, label, sub }) => {
            const active = page === p || (p === "myregs" && page === "myregs");
            return (
              <button key={p} className={`menu-item${active ? " active" : ""}`} onClick={() => navTo(p)}>
                <span className="menu-item-ico"><Icon/></span>
                <div className="menu-item-txt">
                  {label}
                  <div className="menu-item-sub">{sub}</div>
                </div>
                {active && <span className="menu-item-dot"/>}
              </button>
            );
          })}
          {currentUser && (() => {
            const nbEnfants = onlineUsers.filter(u => u.role === "enfant").length;
            const nbStaff   = onlineUsers.filter(u => u.role === "staff").length;
            const isStaff   = currentUser.role === "staff";
            const total     = onlineUsers.length;
            if (total === 0) return null;
            return (
              <div style={{ display:"flex",flexDirection:"column",gap:".35rem",margin:".5rem 0" }}>
                {nbEnfants > 0 && (
                  <div style={{ display:"flex",alignItems:"center",gap:".5rem",padding:".45rem .85rem",borderRadius:10,background:"rgba(74,222,128,.08)",border:"1px solid rgba(74,222,128,.2)",color:"#6ee7b7",fontSize:".82rem",fontWeight:600 }}>
                    <span className="online-dot"/>
                    {nbEnfants} colon·ne{nbEnfants > 1 ? "s" : ""} en ligne
                  </div>
                )}
                {nbStaff > 0 && (
                  <div style={{ display:"flex",alignItems:"center",gap:".5rem",padding:".45rem .85rem",borderRadius:10,background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.25)",color:"#a5b4fc",fontSize:".82rem",fontWeight:600 }}>
                    <span className="online-dot" style={{ background:"#818cf8",boxShadow:"0 0 6px #818cf8" }}/>
                    {nbStaff} staff en ligne
                  </div>
                )}
              </div>
            );
          })()}
          {currentUser?.role === "staff" && (
            <>
              <div className="menu-sep"/>
              <button
                className="menu-item"
                onClick={() => { setShowAppel(true); setMenuOpen(false); }}
                style={{ borderRadius:12, marginBottom:".15rem" }}
              >
                <span className="menu-item-ico" style={{ fontSize:"1.15rem" }}>📋</span>
                <div className="menu-item-txt">
                  Faire l'appel
                  <div className="menu-item-sub">Présences en temps réel</div>
                </div>
              </button>
            </>
          )}
          {/* Livre d'or — visible uniquement quand ouvert par l'admin (ou toujours pour l'admin) */}
          {(livreDorVisible || isAdmin) && (
            <>
              <div className="menu-sep"/>
              <button
                className={`menu-item${page === "livre_or" ? " active" : ""}`}
                onClick={() => { navTo("livre_or"); setMenuOpen(false); }}
                style={{ borderRadius:12 }}>
                <span className="menu-item-ico">📖</span>
                <div className="menu-item-txt">
                  Livre d'or
                  <div className="menu-item-sub">Les mots du séjour</div>
                </div>
                {page === "livre_or" && <span className="menu-item-dot"/>}
              </button>
            </>
          )}
          <div className="menu-sep"/>
          <button className="menu-admin" onClick={() => navTo(page === "admin" ? "admin" : "admin_login")}>
            <IcoCog/> Espace admin
          </button>
          {currentUser?.role === "staff" && (
            <>
              <div className="menu-sep"/>
              <button className="menu-admin" onClick={() => { setMenuOpen(false); doLogout(); }}
                style={{ color:"rgba(245,100,80,.85)",borderColor:"rgba(245,100,80,.2)",background:"rgba(245,100,80,.07)" }}>
                <IcoLogout/> Se déconnecter
              </button>
            </>
          )}
        </div>
      </nav>}
      {showAppel && <AppelSheet onClose={() => setShowAppel(false)} />}
    </>
  );
}
