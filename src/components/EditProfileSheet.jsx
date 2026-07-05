import { useState, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { doc, setDoc } from "firebase/firestore";
import { db, firebaseStorage, uploadPhotoToStorage } from "../firebase";
import { AppContext } from "../context/AppContext";
import { compressImage } from "../utils/helpers";

export default function EditProfileSheet({ onClose }) {
  const { currentUser, setCurrentUser, allPins, setAllPins } = useContext(AppContext);

  const isStaff = currentUser?.role === "staff";
  const myKey   = currentUser ? `${currentUser.fn.toLowerCase()}_${currentUser.ln.toLowerCase()}` : null;
  const myPin   = (myKey && allPins?.[myKey]) || {};

  const [pseudo,    setPseudo]    = useState(myPin.pseudo || "");
  const [avatar,    setAvatar]    = useState(myPin.avatar || null);
  const [preview,   setPreview]   = useState(myPin.avatar || null); // data URL local avant upload
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");
  const fileRef = useRef();

  /* ── Choisir une photo ─────────────────────────────────────────────── */
  const handlePickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const compressed = await compressImage(file, 400, 0.82, true);
    setPreview(compressed);
    setAvatar(compressed); // data URL, sera uploadé à la sauvegarde
  };

  /* ── Sauvegarder ───────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!myKey || !currentUser) return;
    if (isStaff && pseudo.trim().length > 0 && pseudo.trim().length < 2) {
      setErr("Le pseudo doit faire au moins 2 caractères."); return;
    }
    setSaving(true); setErr("");
    try {
      const existing = allPins[myKey] || {};
      let avatarUrl  = existing.avatar || null;

      // Upload photo si changée
      if (avatar && avatar.startsWith("data:") && firebaseStorage) {
        try { avatarUrl = await uploadPhotoToStorage(avatar, `avatars/${myKey}.jpg`); } catch {}
      } else if (avatar && !avatar.startsWith("data:")) {
        avatarUrl = avatar; // URL déjà uploadée (inchangée)
      }

      const updates = { ...existing, avatar: avatarUrl };
      if (isStaff) updates.pseudo = pseudo.trim() || (existing.pseudo || "");

      await setDoc(doc(db, "pins", myKey), updates);
      setAllPins(p => ({ ...p, [myKey]: updates }));
      setCurrentUser(u => ({
        ...u,
        avatar: avatarUrl,
        ...(isStaff ? { pseudo: updates.pseudo } : {}),
      }));
      onClose();
    } catch (e) {
      console.warn(e);
      setErr("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  return createPortal(
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(6,3,1,.82)", backdropFilter:"blur(10px)",
      display:"flex", alignItems:"flex-end", justifyContent:"center",
      fontFamily:"'Inter',sans-serif",
    }}>
      {/* Overlay fermeture */}
      <div style={{ position:"absolute", inset:0 }} onClick={onClose}/>

      <div style={{
        position:"relative", width:"100%", maxWidth:480,
        background:"rgba(18,12,8,.97)", borderRadius:"24px 24px 0 0",
        border:"1px solid rgba(232,160,32,.2)", borderBottom:"none",
        padding:"1.25rem 1.25rem calc(1.5rem + env(safe-area-inset-bottom))",
        maxHeight:"88vh", overflowY:"auto",
      }}>
        {/* Poignée */}
        <div style={{ width:38, height:4, borderRadius:2, background:"rgba(245,240,235,.2)", margin:"0 auto .9rem" }}/>

        {/* Titre + fermer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem" }}>
          <div style={{ fontWeight:800, fontSize:"1.05rem", color:"var(--txt)" }}>✏️ Modifier le profil</div>
          <button onClick={onClose} style={{
            background:"rgba(245,240,235,.1)", border:"none", borderRadius:"50%",
            width:32, height:32, cursor:"pointer", color:"var(--txt)",
            fontSize:".9rem", display:"flex", alignItems:"center", justifyContent:"center",
          }}>✕</button>
        </div>

        {/* ── Photo de profil ── */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:"1.5rem" }}>
          <div style={{ position:"relative", marginBottom:".75rem" }}>
            {preview
              ? <img src={preview} alt="avatar" style={{ width:90, height:90, borderRadius:"50%", objectFit:"cover", border:"3px solid var(--gold)" }}/>
              : <div style={{ width:90, height:90, borderRadius:"50%", background:"rgba(232,160,32,.18)", border:"3px solid rgba(232,160,32,.45)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.2rem", fontWeight:700, color:"var(--gold)" }}>
                  {(myPin.pseudo || currentUser.fn || "?")[0]?.toUpperCase()}
                </div>
            }
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position:"absolute", bottom:0, right:0,
                width:30, height:30, borderRadius:"50%",
                background:"var(--gold)", border:"2px solid rgba(18,12,8,1)",
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:".85rem",
              }}
            >📷</button>
          </div>
          <div style={{ fontSize:".78rem", color:"rgba(245,240,235,.4)", textAlign:"center" }}>
            Appuie sur l'appareil photo pour changer
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePickPhoto}/>
        </div>

        {/* ── Pseudo (staff uniquement) ── */}
        {isStaff && (
          <div style={{ marginBottom:"1.25rem" }}>
            <div style={{ fontSize:".75rem", fontWeight:700, color:"rgba(245,240,235,.5)", letterSpacing:".06em", textTransform:"uppercase", marginBottom:".5rem" }}>
              Pseudo
            </div>
            <input
              value={pseudo}
              onChange={e => { setPseudo(e.target.value.slice(0,20)); setErr(""); }}
              placeholder="Ton pseudo (ex: coach_ruben)"
              style={{
                width:"100%", boxSizing:"border-box",
                background:"rgba(245,240,235,.07)", border:"1px solid rgba(245,240,235,.14)",
                borderRadius:12, color:"var(--txt)", fontFamily:"'Inter',sans-serif",
                fontSize:".95rem", padding:".7rem .9rem", outline:"none",
              }}
            />
            <div style={{ fontSize:".7rem", color:"rgba(245,240,235,.3)", marginTop:".4rem" }}>
              Affiché à la place de ton prénom dans le feed
            </div>
          </div>
        )}

        {err && (
          <div style={{ fontSize:".82rem", color:"#f87171", marginBottom:"1rem", padding:".5rem .75rem", background:"rgba(248,113,113,.1)", borderRadius:10, border:"1px solid rgba(248,113,113,.25)" }}>
            {err}
          </div>
        )}

        {/* ── Bouton sauvegarder ── */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width:"100%", padding:".8rem", borderRadius:14, border:"none",
            background: saving ? "rgba(232,160,32,.4)" : "var(--gold)",
            color:"#0A0705", fontFamily:"'Inter',sans-serif",
            fontWeight:800, fontSize:"1rem", cursor: saving ? "default" : "pointer",
            transition:"opacity .15s",
          }}
        >
          {saving ? "Sauvegarde…" : "Enregistrer"}
        </button>
      </div>
    </div>,
    document.body
  );
}
