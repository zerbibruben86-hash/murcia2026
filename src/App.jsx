import { useContext, lazy, Suspense, useEffect, useState } from "react";
import { AppProvider, AppContext } from "./context/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import BottomNav from "./components/BottomNav";
import "./styles.css";

// Pages critiques — chargées immédiatement
import HomePage   from "./pages/HomePage";
import LoginPage  from "./pages/LoginPage";
import HubPage    from "./pages/HubPage";

// Pages secondaires — chargées à la demande (code splitting)
const InscriptionsPage = lazy(() => import("./pages/InscriptionsPage"));
const MyRegsPage       = lazy(() => import("./pages/MyRegsPage"));
const FeedPage         = lazy(() => import("./pages/FeedPage"));
const WeatherPage      = lazy(() => import("./pages/WeatherPage"));
const SongPage         = lazy(() => import("./pages/SongPage"));
const AdminLoginPage   = lazy(() => import("./pages/AdminLoginPage"));
const AdminPage        = lazy(() => import("./pages/AdminPage"));
const ChallengePage    = lazy(() => import("./pages/ChallengePage"));
const IdeasPage        = lazy(() => import("./pages/IdeasPage"));
const AbonnementsPage  = lazy(() => import("./pages/AbonnementsPage"));
const LivreOrPage      = lazy(() => import("./pages/LivreOrPage"));

const PAGES = {
  home:        HomePage,
  login:       LoginPage,
  hub:         HubPage,
  inscriptions:InscriptionsPage,
  myregs:      MyRegsPage,
  feed:        FeedPage,
  weather:     WeatherPage,
  song:        SongPage,
  admin_login: AdminLoginPage,
  admin:       AdminPage,
  challenge:   ChallengePage,
  ideas:       IdeasPage,
  abonnements: AbonnementsPage,
  livre_or:    LivreOrPage,
};

/* ── Bannière Murciagram (BeReal-style) ────────────────────────────────── */
const MURCI_DURATION = 180; // secondes

function MurciagramBanner() {
  const {
    murciagramAlert, murciagramLocalDismiss, setMurciagramLocalDismiss,
    navTo, setPostSheet, page,
  } = useContext(AppContext);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const isActive = murciagramAlert && murciagramAlert.ts !== murciagramLocalDismiss;

  useEffect(() => {
    if (!isActive) return;
    const update = () => {
      const elapsed = (Date.now() - murciagramAlert.ts) / 1000;
      const left = Math.max(0, Math.floor(MURCI_DURATION - elapsed));
      setSecondsLeft(left);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [isActive, murciagramAlert?.ts]);

  if (!isActive || secondsLeft <= 0) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const dismiss = () => setMurciagramLocalDismiss(murciagramAlert.ts);
  const goPost = () => {
    // 1. Naviguer vers le feed d'abord
    navTo("feed");
    // 2. Ouvrir le sheet après que le feed soit chargé (lazy load ~300ms max)
    setTimeout(() => { setPostSheet(true); }, 400);
    // 3. Dismiss la bannière un peu après pour que l'utilisateur voit la nav démarrer
    setTimeout(() => dismiss(), 150);
  };

  return (
    <div style={{
      position:"fixed", top:56, left:0, right:0, zIndex:2000,
      background:"linear-gradient(100deg,rgba(232,160,32,.97),rgba(195,110,15,.97))",
      backdropFilter:"blur(18px)", WebkitBackdropFilter:"blur(18px)",
      padding:".6rem 1rem .6rem .9rem",
      display:"flex", alignItems:"center", gap:".65rem",
      boxShadow:"0 4px 28px rgba(0,0,0,.45)",
      animation:"murci-slide-down .3s cubic-bezier(.22,.68,0,1.2) both",
    }}>
      <span style={{ fontSize:"1.45rem", flexShrink:0 }}>📸</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:800, fontSize:".88rem", color:"#0A0705", lineHeight:1.2 }}>C'est l'heure du Murciagram !</div>
        <div style={{ fontSize:".7rem", color:"rgba(10,7,5,.6)", marginTop:".05rem" }}>Clique pour poster ta plus belle photo</div>
      </div>
      <div style={{
        fontFamily:"'Space Grotesk',monospace", fontWeight:700, fontSize:".9rem",
        color:"rgba(10,7,5,.75)", minWidth:38, textAlign:"center",
        background:"rgba(10,7,5,.12)", borderRadius:8, padding:".15rem .4rem",
      }}>
        {mm}:{ss}
      </div>
      <button onClick={goPost} style={{
        background:"#0A0705", color:"var(--gold)", border:"none", borderRadius:11,
        padding:".45rem .9rem", fontWeight:700, fontSize:".83rem", cursor:"pointer",
        flexShrink:0, whiteSpace:"nowrap",
      }}>
        Poster 🚀
      </button>
      <button onClick={dismiss} style={{
        background:"rgba(10,7,5,.1)", border:"none", cursor:"pointer", flexShrink:0,
        fontSize:".9rem", color:"rgba(10,7,5,.55)", width:28, height:28, borderRadius:"50%",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>✕</button>
    </div>
  );
}

// Fallback pendant le chargement d'une page lazy
function PageSkeleton() {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ display:"flex", gap:".5rem" }}>
        {[0,1,2].map(i => (
          <div key={i} className="skeleton" style={{ width:9, height:9, borderRadius:"50%", animationDelay:`${i*0.15}s` }}/>
        ))}
      </div>
    </div>
  );
}

function Router() {
  const { page } = useContext(AppContext);
  const Page = PAGES[page] || HomePage;
  return (
    <ErrorBoundary>
      <MurciagramBanner/>
      <Suspense fallback={<PageSkeleton/>}>
        <div key={page} className="page-enter">
          <Page/>
        </div>
      </Suspense>
      <BottomNav/>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router/>
    </AppProvider>
  );
}
