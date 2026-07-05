import { useContext, useState, useCallback } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";
import Confetti from "../components/Confetti";
import ConfirmDialog from "../components/ConfirmDialog";

export default function HubPage() {
  const { currentUser, confetti, confirmDlg, setConfirmDlg } = useContext(AppContext);
  const [popped, setPopped] = useState(false);

  const date = new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" });

  const handleTap = useCallback(() => {
    if (popped) return;
    setPopped(true);
    setTimeout(() => setPopped(false), 600);
  }, [popped]);

  return (
    <div style={{ position:"relative", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <Confetti active={confetti}/>
      <ConfirmDialog dlg={confirmDlg} onClose={() => setConfirmDlg(null)}/>
      <Hdr/>
      <Drawer/>
      <div className="welcome-body">
        <p className="welcome-eyebrow">✦ Moadon Espagne 2026</p>
        <h1 className="welcome-title">
          Bienvenue dans<br/>la{" "}
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
        {currentUser && (
          <p className="welcome-name">
            Salut <strong>{currentUser.fn}</strong>{" "}
            {currentUser.gender === "boy" ? "👦" : "👧"}
          </p>
        )}
        <p className="welcome-date">📍 {date} · Murcia 2026</p>
      </div>
    </div>
  );
}
