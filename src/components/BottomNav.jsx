import { useContext } from "react";
import { AppContext } from "../context/AppContext";

const TABS = [
  {
    id: "weather", label: "Météo",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="10" r="4" strokeWidth="1.7"/>
      <path d="M9 4V2.5M9 17.5V16M3 10H1.5M16.5 10H15M5.1 6.1L4 5M13 5l-1.1 1.1" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M17.5 20H8a5 5 0 01-.4-10 5.5 5.5 0 0110.4 1.5A4 4 0 1117.5 20z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
  },
  {
    id: "song", label: "Chanson",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 18V6l12-2v12" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="18" r="3" strokeWidth="1.7"/>
      <circle cx="18" cy="16" r="3" strokeWidth="1.7"/>
    </svg>,
  },
  {
    id: "inscriptions", label: "Activités",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="3" width="14" height="18" rx="2.5" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M9 8h6M9 12h6M9 16h4" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>,
  },
  {
    id: "feed", label: "Feed",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="7" width="20" height="14" rx="3" strokeWidth="1.7"/>
      <path d="M8 7V5.5A2.5 2.5 0 0110.5 3h3A2.5 2.5 0 0116 5.5V7" strokeWidth="1.7" strokeLinecap="round"/>
      <circle cx="12" cy="14" r="3" strokeWidth="1.7"/>
    </svg>,
  },
  {
    id: "challenge", label: "Challenge",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M8 21h8M12 17v4M5 3h14l-1.5 7H6.5L5 3z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.5 10c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>,
  },
  {
    id: "ideas", label: "Idées",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 21h6M12 17v4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 3a6 6 0 015.2 9C16.4 13.4 15 15 15 17H9c0-2-1.4-3.6-2.2-5A6 6 0 0112 3z" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
  },
];

const SHOW_ON = new Set(["hub","inscriptions","myregs","feed","ideas","weather","song","challenge"]);

export default function BottomNav() {
  const { page, navTo, currentUser, unreadNotifs } = useContext(AppContext);
  if (!SHOW_ON.has(page)) return null;

  const activeTab = page === "myregs" ? "inscriptions" : page;

  return (
    <nav className="bottom-nav">
      {TABS.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} className={`bnav-tab${active ? " active" : ""}`} onClick={() => navTo(tab.id)}>
            <span className="bnav-icon-wrap" style={{ position:"relative" }}>
              <span className="bnav-icon" style={{ stroke: active ? "var(--gold)" : "rgba(245,240,235,.58)" }}>
                {tab.icon}
              </span>
              {tab.id === "feed" && unreadNotifs > 0 && (
                <span className="notif-badge">{unreadNotifs > 9 ? "9+" : unreadNotifs}</span>
              )}
            </span>
            <span className="bnav-label" style={{ color: active ? "var(--gold)" : "rgba(245,240,235,.5)" }}>
              {tab.label}
            </span>
            {active && <span className="bnav-dot"/>}
          </button>
        );
      })}
    </nav>
  );
}
