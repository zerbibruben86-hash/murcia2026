import { useMemo } from "react";

const COLORS = ["#E8A020","#7B1D2E","#27AE60","#2980B9","#8E44AD","#FF6B6B","#fff"];

export default function Confetti({ active }) {
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i, left: Math.random() * 100, size: 6 + Math.random() * 6,
    dur: .8 + Math.random() * 1.2, delay: Math.random() * .6,
    color: COLORS[i % COLORS.length], round: Math.random() > .45,
  })), []);
  if (!active) return null;
  return (
    <div className="cf-wrap">
      {pieces.map(p => (
        <div key={p.id} className="cf" style={{
          left: p.left + "%", width: p.size, height: p.size,
          background: p.color, borderRadius: p.round ? "50%" : "2px",
          animationDuration: p.dur + "s", animationDelay: p.delay + "s",
        }}/>
      ))}
    </div>
  );
}
