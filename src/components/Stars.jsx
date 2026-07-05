import { useState } from "react";

const LABELS = ["","Pas super 😕","Ça va 😐","Bien 🙂","Super 😄","Excellent 🤩"];

export default function Stars({ value, onChange }) {
  const [hov, setHov] = useState(0);
  return (
    <div>
      <div className="stars-row">
        {[1,2,3,4,5].map(n => (
          <span key={n} className="star"
            onMouseEnter={() => setHov(n)} onMouseLeave={() => setHov(0)}
            onClick={() => onChange(n)}>
            {n <= (hov || value) ? "⭐" : "☆"}
          </span>
        ))}
      </div>
      <div className="rating-lbl">{LABELS[hov || value] || "Touche une étoile pour noter"}</div>
    </div>
  );
}
