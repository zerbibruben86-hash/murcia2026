import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL } from "../utils/helpers";
import Confetti from "../components/Confetti";
import ConfirmDialog from "../components/ConfirmDialog";

export default function HomePage() {
  const {
    confetti, confirmDlg, setConfirmDlg, currentUser, navTo,
    slideX, setSlideX, slideTrackRef, slideStartRef,
  } = useContext(AppContext);

  const THUMB = 52, PAD = 5;
  const onDown = e => { e.currentTarget.setPointerCapture(e.pointerId); slideStartRef.current = e.clientX - slideX; };
  const onMove = e => {
    if (slideStartRef.current == null) return;
    const w = slideTrackRef.current?.offsetWidth || 300;
    const maxX = w - THUMB - PAD * 2;
    const nx = Math.max(0, Math.min(e.clientX - slideStartRef.current, maxX));
    setSlideX(nx);
    if (nx >= maxX * .88) { slideStartRef.current = null; setSlideX(0); navTo(currentUser ? "hub" : "login"); }
  };
  const onUp = () => { slideStartRef.current = null; setSlideX(0); };
  const w = slideTrackRef.current?.offsetWidth || 300;
  const maxX = Math.max(1, w - THUMB - PAD * 2);
  const prog = slideX / maxX;

  return (
    <div>
      <Confetti active={confetti}/>
      <ConfirmDialog dlg={confirmDlg} onClose={() => setConfirmDlg(null)}/>
      <div className="splash">
        <img src={IMG_POOL} alt="" className="bg-img"/>
        <div className="splash-overlay"/>
        <div className="splash-body" style={{ paddingTop:"2rem" }}>
          <div className="splash-eyebrow">✦ Moadon Espagne 2026</div>
          <h1 className="splash-title"><em>Ça Murce ?</em></h1>
          <p className="splash-subtitle">Murcia · Été 2026</p>
          <div className="splash-cta">
            <div ref={slideTrackRef} className="slide-track">
              <div className="slide-fill" style={{ width:`${PAD + THUMB + slideX}px` }}/>
              <div className="slide-label" style={{ opacity: Math.max(0, 1 - prog * 2.5) }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3l4 4-4 4" stroke="rgba(245,240,235,.5)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {currentUser ? "Glisse pour continuer" : "Glisse pour découvrir"}
              </div>
              <div className="slide-thumb" style={{ transform:`translateX(${slideX}px)` }}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M8 5l6 6-6 6" stroke="#0A0705" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
