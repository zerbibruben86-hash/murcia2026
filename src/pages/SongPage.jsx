import { useContext, useState, useRef, useEffect } from "react"; // useEffect utilisé dans Mp3Player
import { AppContext } from "../context/AppContext";
import { IMG_POOL } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";

const IcoSpotify = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 3.96-1.2 8.88-.6 12.24 1.56.36.18.54.78.24 1.2l.06.06zm.12-3.42C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3l-.06.06z"/>
  </svg>
);
const IcoDeezer = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.81 13.83h3.38v2.04h-3.38zM18.81 10.55h3.38v2.04h-3.38zM18.81 7.27h3.38v2.05h-3.38zM1.81 20.39h3.38v2.04H1.81zM6.81 17.11h3.38v2.04H6.81zM6.81 20.39h3.38v2.04H6.81zM11.81 13.83h3.38v2.04h-3.38zM11.81 17.11h3.38v2.04h-3.38zM11.81 20.39h3.38v2.04h-3.38zM16.81 10.55h-3.38v2.04h3.38zM16.81 13.83h-3.38v2.04h3.38zM16.81 17.11h-3.38v2.04h3.38zM16.81 20.39h-3.38v2.04h3.38zM1.81 17.11h3.38v2.04H1.81z"/>
  </svg>
);
const IcoYT = () => (
  <svg viewBox="0 0 24 24" fill="white">
    <path d="M23.5 6.2a3 3 0 00-2.2-2.2C19.4 3.5 12 3.5 12 3.5S4.6 3.5 2.7 4a3 3 0 00-2.2 2.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.2 2.2C4.6 20.5 12 20.5 12 20.5s7.4 0 9.3-.5a3 3 0 002.2-2.2C24 15.9 24 12 24 12s0-3.9-.5-5.8z"/>
    <path d="M9.8 15.5V8.5l6.1 3.5z" fill="#FF0000"/>
  </svg>
);
const IcoApple = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
  </svg>
);

const IcoWave = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
    <rect x="1"  y="11" width="3.5" height="8"  rx="1.75" fill="white" opacity=".7"/>
    <rect x="6"  y="7"  width="3.5" height="16" rx="1.75" fill="white"/>
    <rect x="11" y="3"  width="3.5" height="24" rx="1.75" fill="white"/>
    <rect x="16" y="7"  width="3.5" height="16" rx="1.75" fill="white"/>
    <rect x="21" y="10" width="3.5" height="10" rx="1.75" fill="white" opacity=".7"/>
    <rect x="26" y="13" width="3.5" height="4"  rx="1.75" fill="white" opacity=".45"/>
  </svg>
);

const LYRICS_1 = `Le 6 juillet, c'est parfait, on y est, c'est chanmé (on y est c'est chanmé)
Et dans l'taxi, vers Orly on ressent la folie (on ressent la folie)
L'Espagne c'est bien c'est magique, Murcia c'est encore mieux
Soleil piscine plongée, Léana sous perrier

N'oubliez pas la boutargue Koskas de Akoun (la boutargue de Akoun)
Mais aussi le Lilimot, Ruben va vous le dire (on va jamais l'finir)
Perpi c'est très bien aussi mais ils ont pas compris
Ce qu'était la folie avec ses vrais amis

Moi je pars à Murcia, ne vous en faites pas, on va kiffer
Il n'y a que ici qu'on crie toute la nuit // sans faire de bruit
Moi je chante et je veux me casser la voix
Tant qu'on pourra tous être là

Je rêve des maccas oui mais je ne sais pas // comment gagner
Je ne fais qu'hésiter entre une histoire fairplay // ou bien tricher
Et je suis qu'un colon arrivé dernier
Natation j'métais pas échauffé

Moi je pars à Murcia, ne vous en faites pas, on va kiffer
Il n'y a que ici qu'on crie toute la nuit // sans faire de bruit
Moi je chante et je veux me casser la voix
Tant qu'on pourra tous être là`;

/* ── Player MP3 custom ─────────────────────────────────────────────────── */
function Mp3Player({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const hasSrc = !!src?.trim();

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => { setPlaying(false); a.currentTime = 0; };
    a.addEventListener("ended", onEnd);
    return () => a.removeEventListener("ended", onEnd);
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || !hasSrc) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  return (
    <div className="plat-btn plat-mp3" onClick={toggle}
      style={{ cursor: hasSrc ? "pointer" : "default", opacity: hasSrc ? 1 : .45, userSelect:"none" }}>
      {hasSrc && <audio ref={audioRef} src={src} preload="metadata"/>}
      <IcoWave/>
      <div className="plat-mp3-info">
        <div className="plat-mp3-label">MP3 Officiel</div>
        <div className="plat-mp3-sub">{hasSrc ? (playing ? "En cours…" : "Appuie pour écouter") : "Bientôt disponible"}</div>
      </div>
    </div>
  );
}

const PLATFORMS = [
  { key:"youtube", label:"YouTube",     Ico:IcoYT,      cls:"plat-yt", fallback:"https://youtube.com" },
  { key:"spotify", label:"Spotify",     Ico:IcoSpotify, cls:"plat-sp", fallback:"https://spotify.com" },
  { key:"deezer",  label:"Deezer",      Ico:IcoDeezer,  cls:"plat-dz", fallback:"https://deezer.com" },
  { key:"apple",   label:"Apple Music", Ico:IcoApple,   cls:"plat-am", fallback:"https://music.apple.com" },
];

const FALLBACK_LYRICS = [LYRICS_1, null];

function SongCard({ song, index }) {
  const hasLinks = PLATFORMS.some(p => song[p.key]);
  const lyricsText = song.lyrics?.trim() || FALLBACK_LYRICS[index] || "";
  const hasLyrics = !!lyricsText;
  const hasCover  = !!song.cover?.trim();
  const hasTitle  = !!song.title?.trim();
  const hasMp3    = !!song.mp3?.trim();

  // Plateformes grisées pour chanson 1 (index 0)
  const GRAYED = [];

  return (
    <div className="song2-card">
      {/* Cover */}
      <div className="song2-cover-wrap">
        {hasCover
          ? <img src={song.cover} alt={song.title} className="song2-cover-img"/>
          : (
            <div className="song2-cover-placeholder">
              <div style={{ fontSize:"4rem", marginBottom:".5rem" }}>🎵</div>
              <div style={{ fontSize:".85rem", color:"rgba(245,240,235,.4)", fontWeight:600 }}>Cover bientôt</div>
            </div>
          )
        }
        {/* Gradient overlay titre */}
        <div className="song2-cover-overlay">
          <div className="song2-cover-num">CHANSON {index + 1}</div>
          <div className="song2-cover-title">{hasTitle ? song.title : "Titre à venir…"}</div>
        </div>
      </div>

      {/* Plateformes */}
      <div className="song2-platforms-section">
        <div className="song2-platforms-lbl">🎧 Écouter sur</div>
        <div className="song-platforms">
          {/* ── Bouton MP3 pleine largeur ── */}
          <Mp3Player src={song.mp3}/>
          {PLATFORMS.map(({ key, label, Ico, cls, fallback }) => {
            const grayed = GRAYED.includes(key);
            return grayed ? (
              <div key={key} className={`plat-btn ${cls}`}
                style={{ opacity:.4, cursor:"default", pointerEvents:"none" }}>
                <Ico/>{label}
              </div>
            ) : (
              <a key={key} href={song[key] || fallback} target="_blank" rel="noopener noreferrer" className={`plat-btn ${cls}`}>
                <Ico/>{label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Paroles — toujours visible */}
      <div className="song2-lyrics-wrap">
        <div className="song2-lyrics-toggle" style={{ cursor:"default" }}>
          <span>🎤 Paroles</span>
        </div>
        <div className="song2-lyrics-body">
          {hasLyrics
            ? lyricsText.split("\n").map((line, i) => <span key={i}>{line}<br/></span>)
            : <span style={{ color:"rgba(245,240,235,.3)", fontStyle:"italic" }}>Paroles bientôt disponibles…</span>
          }
        </div>
      </div>
    </div>
  );
}

export default function SongPage() {
  const { cfg } = useContext(AppContext);
  const [active, setActive] = useState(0);

  const songs = cfg.songs?.length === 2 ? cfg.songs : [
    { title:"", cover:"", spotify:"", deezer:"", youtube:"", apple:"", lyrics:"" },
    { title:"", cover:"", spotify:"", deezer:"", youtube:"", apple:"", lyrics:"" },
  ];

  const tabLabel = (s, i) => (s.title?.trim() || `Chanson ${i + 1}`).replace(/\s*\([^)]*\)/g, "");

  return (
    <div style={{ position:"relative", minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <Hdr/>
      <Drawer/>
      <main className="main" style={{ paddingBottom:"6rem" }}>

        {/* Header */}
        <div style={{ textAlign:"center", padding:"1.75rem 1rem 1.25rem" }}>
          <div style={{ fontSize:"2rem", marginBottom:".3rem" }}>🎵</div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:"1.55rem", fontWeight:700, color:"var(--txt)", lineHeight:1.15 }}>
            Les chansons de la colo
          </div>
          <div style={{ fontSize:".72rem", color:"rgba(245,240,235,.45)", marginTop:".4rem", letterSpacing:".12em", textTransform:"uppercase", fontWeight:600 }}>
            Moadon Espagne 2026
          </div>
        </div>

        {/* Tab switcher */}
        <div className="song2-tabs">
          {songs.map((s, i) => (
            <button key={i} className={`song2-tab${active === i ? " active" : ""}`} onClick={() => setActive(i)}>
              {tabLabel(s, i)}
            </button>
          ))}
        </div>

        {/* Song card */}
        <SongCard key={active} song={songs[active]} index={active}/>
      </main>
    </div>
  );
}
