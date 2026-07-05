import { useState, useRef, useCallback } from "react";

const THRESHOLD = 68;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY]       = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY  = useRef(null);
  const pulling = useRef(false);

  const onTouchStart = useCallback(e => {
    // Only activate when scrolled to top
    if (window.scrollY > 4) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const onTouchMove = useCallback(e => {
    if (!pulling.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) { pulling.current = false; return; }
    // resist: drag feels heavier as it extends
    const clamped = Math.min(delta * 0.45, THRESHOLD * 1.2);
    setPullY(clamped);
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    startY.current = null;
    if (pullY >= THRESHOLD * 0.85 && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      try { await onRefresh(); } catch {}
      setRefreshing(false);
    }
    setPullY(0);
  }, [pullY, refreshing, onRefresh]);

  const progress = Math.min(pullY / THRESHOLD, 1);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ position: "relative" }}>
      {/* Indicator */}
      <div className="ptr-indicator" style={{
        height: pullY,
        opacity: progress,
        transform: `scale(${0.5 + progress * 0.5})`,
      }}>
        <div className={`ptr-spinner${refreshing ? " spin" : ""}`}
          style={{ transform: refreshing ? "none" : `rotate(${progress * 240}deg)` }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="9" stroke="rgba(232,160,32,.35)" strokeWidth="2"/>
            <path d="M11 2a9 9 0 019 9" stroke="var(--gold)" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </div>
        {refreshing && <span className="ptr-label">Mise à jour…</span>}
      </div>
      <div style={{ transform: `translateY(${pullY}px)`, transition: pulling.current ? "none" : "transform .3s ease" }}>
        {children}
      </div>
    </div>
  );
}
