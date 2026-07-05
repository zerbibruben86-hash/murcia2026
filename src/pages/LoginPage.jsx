import { useContext, useState, useCallback } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL, compressImage } from "../utils/helpers";

export default function LoginPage() {
  const {
    loginStep, setLoginStep, loginForm, setLoginForm, loginErr, setLoginErr,
    loginPin, setLoginPin, loginPinConf, setLoginPinConf,
    loginPseudo, setLoginPseudo, handleSetPseudo, handleSkipPseudo,
    loginRole, setLoginRole, handleStaffLogin, handleStaffGender,
    loginFuzzySuggestion, setLoginFuzzySuggestion,
    handleLoginIdentify, handleCreatePin, handleVerifyPin, setPage,
    loginAvatar, setLoginAvatar, handleSaveAvatar, handleSkipAvatar,
  } = useContext(AppContext);

  const [popped, setPopped] = useState(false);
  const handleTap = useCallback(() => {
    if (popped) return;
    setPopped(true);
    setTimeout(() => setPopped(false), 600);
  }, [popped]);

  return (
    <div className="login-wrap">
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(10,7,5,.35) 0%,rgba(10,7,5,0) 30%,rgba(10,7,5,0) 50%,rgba(10,7,5,.82) 78%,rgba(10,7,5,.97) 100%)",pointerEvents:"none" }}/>
      <div className="login-content">
        <div className="splash-eyebrow">✦ Moadon Espagne 2026</div>
        <h1 className="welcome-title" style={{ marginBottom:".3rem" }}>
          <span
            className={`murciapp-word${popped ? " pop" : ""}`}
            onClick={handleTap}
            style={{ WebkitTapHighlightColor:"transparent" }}
          >
            {"Murci'App".split("").map((ch, i) => (
              <span key={i} className="murciapp-letter" style={{ animationDelay:`${i * 0.06}s` }}>{ch}</span>
            ))}
          </span>
        </h1>
        <p className="login-sub">Murcia · Été 2026</p>

        {/* ── CHOIX DU RÔLE ── */}
        {loginStep === "choose_role" && (
          <div className="login-card">
            <div style={{ fontSize:".82rem",fontWeight:600,color:"var(--gold)",marginBottom:"1.1rem",textAlign:"center",letterSpacing:".05em" }}>👤 Je suis…</div>
            <div className="role-grid">
              <button className="role-btn" onClick={() => { setLoginRole("enfant"); setLoginStep("identify"); setLoginErr(""); setLoginFuzzySuggestion(null); }}>
                <span className="role-ico">👦</span>
                <span className="role-lbl">Colon·ne</span>
              </button>
              <button className="role-btn" onClick={() => { setLoginRole("staff"); setLoginStep("identify"); setLoginErr(""); setLoginFuzzySuggestion(null); }}>
                <span className="role-ico">🎓</span>
                <span className="role-lbl">Équipe Pédagogique</span>
              </button>
            </div>
          </div>
        )}
        {loginStep === "choose_role" && (
          <button
            onClick={() => setPage("admin_login")}
            style={{ background:"none",border:"none",color:"rgba(245,240,235,.3)",fontSize:".72rem",cursor:"pointer",textDecoration:"underline",marginTop:".85rem",padding:".5rem 1rem",display:"block",width:"100%",textAlign:"center",position:"relative",zIndex:3 }}
          >
            Accès administrateur
          </button>
        )}

        {/* ── STAFF : mot de passe ── */}
        {loginStep === "staff_pwd" && (
          <div className="login-card">
            <div style={{ fontSize:"1.4rem",textAlign:"center",marginBottom:".25rem" }}>🎓</div>
            <div style={{ fontSize:".88rem",fontWeight:700,color:"var(--gold)",marginBottom:".4rem",textAlign:"center" }}>Équipe Pédagogique</div>
            <div style={{ fontSize:".78rem",color:"var(--mu)",textAlign:"center",marginBottom:"1.1rem",lineHeight:1.5 }}>
              Bonjour <strong style={{color:"var(--txt)"}}>{loginForm.fn}</strong> ! Entre le mot de passe de l'équipe.
            </div>
            <label className="login-lbl">Mot de passe</label>
            <input className="login-inp" type="password" placeholder="••••••" value={loginPin}
              onChange={e => setLoginPin(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleStaffLogin(loginPin)}
              autoFocus style={{ textAlign:"center",fontSize:"1.4rem",letterSpacing:".2em" }}/>
            {loginErr && <div className="msg err" style={{ marginBottom:".85rem" }}>{loginErr}</div>}
            <button className="splash-btn-main" onClick={() => handleStaffLogin(loginPin)}>
              <span>Accéder</span><span className="arrow">→</span>
            </button>
            <button style={{ marginTop:".6rem",background:"none",border:"none",color:"rgba(245,240,235,.35)",fontSize:".78rem",cursor:"pointer",width:"100%" }}
              onClick={() => { setLoginStep("identify"); setLoginErr(""); setLoginPin(""); }}>← Retour</button>
          </div>
        )}

        {/* ── IDENTIFIER (enfant ou staff) ── */}
        {loginStep === "identify" && (
          <div className="login-card">
            <div style={{ fontSize:".7rem",color:"var(--mu)",textAlign:"center",marginBottom:".5rem" }}>
              {loginRole === "staff" ? "🎓 Équipe Pédagogique" : "👦 Colon"}
            </div>
            <div style={{ fontSize:".82rem",fontWeight:600,color:"var(--gold)",marginBottom:"1rem",textAlign:"center",letterSpacing:".05em" }}>👤 Qui es-tu ?</div>
            <label className="login-lbl">Prénom</label>
            <input className="login-inp" placeholder="Lucas" autoCapitalize="words" value={loginForm.fn}
              onChange={e => { setLoginForm(f => ({ ...f, fn: e.target.value })); setLoginFuzzySuggestion(null); setLoginErr(""); }}
              onKeyDown={e => e.key === "Enter" && handleLoginIdentify()}/>
            <label className="login-lbl">Nom</label>
            <input className="login-inp" placeholder="Cohen" autoCapitalize="words" value={loginForm.ln}
              onChange={e => { setLoginForm(f => ({ ...f, ln: e.target.value })); setLoginFuzzySuggestion(null); setLoginErr(""); }}
              onKeyDown={e => e.key === "Enter" && handleLoginIdentify()}/>

            {loginFuzzySuggestion && (
              <button className="fuzzy-suggest" onClick={() => {
                setLoginForm(f => ({ ...f, fn:loginFuzzySuggestion.fn, ln:loginFuzzySuggestion.ln }));
                setLoginFuzzySuggestion(null); setLoginErr("");
              }}>
                <span>Voulez-vous dire :</span>
                <b>{loginFuzzySuggestion.fn} {loginFuzzySuggestion.ln}</b>
                <span className="fuzzy-apply">Appliquer →</span>
              </button>
            )}

            {loginErr && <div className="msg err" style={{ marginBottom:".85rem" }}>{loginErr}</div>}
            <button className="splash-btn-main" onClick={handleLoginIdentify}>
              <span>Continuer</span><span className="arrow">→</span>
            </button>
            <button style={{ marginTop:".6rem",background:"none",border:"none",color:"rgba(245,240,235,.35)",fontSize:".78rem",cursor:"pointer",width:"100%" }}
              onClick={() => { setLoginStep("choose_role"); setLoginErr(""); setLoginFuzzySuggestion(null); }}>← Changer de rôle</button>
          </div>
        )}

        {loginStep === "create_pin" && (
          <div className="login-card">
            <div style={{ fontSize:".82rem",fontWeight:600,color:"var(--gold)",marginBottom:".5rem",textAlign:"center" }}>✨ Première connexion — crée ton code</div>
            <div style={{ fontSize:".8rem",color:"var(--mu)",textAlign:"center",marginBottom:"1rem" }}>Bonjour <b style={{ color:"var(--txt)" }}>{loginForm.fn}</b> ! Choisis un code à 4 chiffres.</div>
            <label className="login-lbl">Je suis…</label>
            <div className="login-gender" style={{ marginBottom:"1rem" }}>
              <button className={`lgbtn${loginForm.gender === "boy" ? " sel" : ""}`} onClick={() => setLoginForm(f => ({ ...f, gender:"boy" }))}>👦 Garçon</button>
              <button className={`lgbtn${loginForm.gender === "girl" ? " sel" : ""}`} onClick={() => setLoginForm(f => ({ ...f, gender:"girl" }))}>👧 Fille</button>
            </div>
            <label className="login-lbl">Mon code secret (4 chiffres)</label>
            <input className="login-inp" type="tel" inputMode="numeric" maxLength={4} placeholder="••••"
              value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g,"").slice(0,4))}
              style={{ textAlign:"center",fontSize:"1.4rem",letterSpacing:".35em" }}/>
            <label className="login-lbl">Confirme le code</label>
            <input className="login-inp" type="tel" inputMode="numeric" maxLength={4} placeholder="••••"
              value={loginPinConf} onChange={e => setLoginPinConf(e.target.value.replace(/\D/g,"").slice(0,4))}
              onKeyDown={e => e.key === "Enter" && handleCreatePin()}
              style={{ textAlign:"center",fontSize:"1.4rem",letterSpacing:".35em" }}/>
            {loginErr && <div className="msg err" style={{ marginBottom:".85rem" }}>{loginErr}</div>}
            <button className="splash-btn-main" onClick={handleCreatePin}><span>Créer mon compte 🎉</span><span className="arrow">→</span></button>
            <button style={{ marginTop:".6rem",background:"none",border:"none",color:"rgba(245,240,235,.35)",fontSize:".78rem",cursor:"pointer",width:"100%" }}
              onClick={() => { setLoginStep("identify"); setLoginErr(""); }}>← Changer de nom</button>
          </div>
        )}

        {loginStep === "enter_pin" && (
          <div className="login-card">
            <div style={{ fontSize:".82rem",fontWeight:600,color:"var(--gold)",marginBottom:".5rem",textAlign:"center" }}>🔐 Content de te revoir !</div>
            <div style={{ fontSize:".8rem",color:"var(--mu)",textAlign:"center",marginBottom:"1rem" }}>Bonjour <b style={{ color:"var(--txt)" }}>{loginForm.fn}</b>, entre ton code secret.</div>
            <label className="login-lbl">Mon code secret (4 chiffres)</label>
            <input className="login-inp" type="tel" inputMode="numeric" maxLength={4} placeholder="••••"
              value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g,"").slice(0,4))}
              onKeyDown={e => e.key === "Enter" && handleVerifyPin()}
              style={{ textAlign:"center",fontSize:"1.8rem",letterSpacing:".4em" }} autoFocus/>
            {loginErr && <div className="msg err" style={{ marginBottom:".85rem" }}>{loginErr}</div>}
            <button className="splash-btn-main" onClick={handleVerifyPin}><span>Se connecter</span><span className="arrow">→</span></button>
            <button style={{ marginTop:".6rem",background:"none",border:"none",color:"rgba(245,240,235,.35)",fontSize:".78rem",cursor:"pointer",width:"100%" }}
              onClick={() => { setLoginStep("identify"); setLoginErr(""); }}>← Changer de nom</button>
          </div>
        )}

        {loginStep === "choose_gender" && (
          <div className="login-card">
            <div style={{ fontSize:"1.6rem",textAlign:"center",marginBottom:".25rem" }}>👤</div>
            <div style={{ fontSize:".88rem",fontWeight:700,color:"var(--gold)",marginBottom:".4rem",textAlign:"center" }}>
              Tu es…
            </div>
            <div style={{ fontSize:".78rem",color:"var(--mu)",textAlign:"center",marginBottom:"1.1rem" }}>
              Pour que les notifs soient au bon genre.
            </div>
            <div className="login-gender" style={{ marginBottom:"1.25rem" }}>
              <button className={`lgbtn${loginForm.gender === "boy" ? " sel" : ""}`} onClick={() => setLoginForm(f => ({ ...f, gender:"boy" }))}>👨 Homme</button>
              <button className={`lgbtn${loginForm.gender === "girl" ? " sel" : ""}`} onClick={() => setLoginForm(f => ({ ...f, gender:"girl" }))}>👩 Femme</button>
            </div>
            {loginErr && <div className="msg err" style={{ marginBottom:".85rem" }}>{loginErr}</div>}
            <button className="splash-btn-main" onClick={handleStaffGender}
              style={!loginForm.gender ? { opacity:.45,pointerEvents:"none" } : {}}>
              <span>Continuer →</span>
            </button>
          </div>
        )}

        {loginStep === "choose_pseudo" && (
          <div className="login-card">
            <div style={{ fontSize:"1.6rem",textAlign:"center",marginBottom:".25rem" }}>🎭</div>
            <div style={{ fontSize:".88rem",fontWeight:700,color:"var(--gold)",marginBottom:".4rem",textAlign:"center" }}>
              Choisis ton pseudo !
            </div>
            <div style={{ fontSize:".78rem",color:"var(--mu)",textAlign:"center",marginBottom:"1.1rem",lineHeight:1.5 }}>
              C'est le nom qui apparaîtra sur le Murciagram et les challenges.<br/>
              Laisse vide pour utiliser ton prénom.
            </div>
            <label className="login-lbl">Mon pseudo (facultatif)</label>
            <input className="login-inp" placeholder={loginForm.fn} maxLength={20} value={loginPseudo}
              onChange={e => setLoginPseudo(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSetPseudo()}
              autoFocus style={{ textAlign:"center",fontSize:"1.15rem" }}/>
            <div style={{ fontSize:".7rem",color:"rgba(245,240,235,.3)",textAlign:"center",marginBottom:"1rem",marginTop:".3rem" }}>max 20 caractères</div>
            {loginErr && <div className="msg err" style={{ marginBottom:".85rem" }}>{loginErr}</div>}
            <button className="splash-btn-main" onClick={handleSetPseudo}>
              <span>C'est parti 🎉</span><span className="arrow">→</span>
            </button>
            <button style={{ marginTop:".6rem",background:"none",border:"none",color:"rgba(245,240,235,.35)",fontSize:".78rem",cursor:"pointer",width:"100%" }}
              onClick={handleSkipPseudo}>Passer, utiliser mon prénom</button>
          </div>
        )}

        {loginStep === "choose_avatar" && (
          <div className="login-card">
            <div style={{ fontSize:"1.6rem",textAlign:"center",marginBottom:".25rem" }}>📸</div>
            <div style={{ fontSize:".88rem",fontWeight:700,color:"var(--gold)",marginBottom:".4rem",textAlign:"center" }}>
              Photo de profil
            </div>
            <div style={{ fontSize:".78rem",color:"var(--mu)",textAlign:"center",marginBottom:"1.1rem",lineHeight:1.5 }}>
              Ajoute une photo pour te reconnaître sur Murciagram.
            </div>

            <div style={{ display:"flex",justifyContent:"center",marginBottom:"1rem" }}>
              {loginAvatar
                ? <div style={{ width:96,height:96,borderRadius:"50%",overflow:"hidden",border:"2.5px solid var(--gold)",flexShrink:0 }}>
                    <img src={loginAvatar} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  </div>
                : <div style={{ width:96,height:96,borderRadius:"50%",background:"rgba(232,160,32,.12)",border:"2px dashed rgba(232,160,32,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.4rem" }}>👤</div>
              }
            </div>

            <div style={{ display:"flex",gap:".6rem",marginBottom:"1rem" }}>
              <label className="upbtn" style={{ flex:1,justifyContent:"center" }}>
                <span>📷</span>Caméra
                <input type="file" accept="image/*" capture="user"
                  onChange={async e => { const f=e.target.files?.[0]; if(!f)return; const c=await compressImage(f,300,.82,true); setLoginAvatar(c); e.target.value=""; }}/>
              </label>
              <label className="upbtn" style={{ flex:1,justifyContent:"center" }}>
                <span>🖼️</span>Galerie
                <input type="file" accept="image/*"
                  onChange={async e => { const f=e.target.files?.[0]; if(!f)return; const c=await compressImage(f,300,.82,true); setLoginAvatar(c); e.target.value=""; }}/>
              </label>
            </div>

            <button className="splash-btn-main" onClick={() => handleSaveAvatar(loginAvatar)}
              style={!loginAvatar ? { opacity:.45,pointerEvents:"none" } : {}}>
              <span>Enregistrer 🎉</span><span className="arrow">→</span>
            </button>
            <button style={{ marginTop:".6rem",background:"none",border:"none",color:"rgba(245,240,235,.35)",fontSize:".78rem",cursor:"pointer",width:"100%" }}
              onClick={handleSkipAvatar}>Passer, sans photo de profil</button>
          </div>
        )}
      </div>
    </div>
  );
}
