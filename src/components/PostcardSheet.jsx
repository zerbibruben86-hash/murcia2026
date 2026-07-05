import { useRef, useState, useEffect, useCallback } from "react";
import { LOGO } from "../utils/logo";

const SIZE = 1080;
const isMobile = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// ── Cache partagé : évite 3 appels proxy simultanés pour la même image ──
const IMG_CACHE = new Map();

async function loadImage(src) {
  if (!src) throw new Error("no src");
  if (IMG_CACHE.has(src)) return IMG_CACHE.get(src);

  const toImg = (url, crossOrigin) => new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error("load failed"));
    img.src = url;
  });

  // Data URL → direct, pas de CORS
  if (src.startsWith("data:")) {
    const img = await toImg(src);
    IMG_CACHE.set(src, img); return img;
  }

  // HTTP(S) → proxy Vercel (évite le taint canvas CORS)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const resp = await fetch(`/api/proxy?url=${encodeURIComponent(src)}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (resp.ok) {
      const blob   = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      try {
        const img = await toImg(blobUrl);
        IMG_CACHE.set(src, img); return img;
      } finally { URL.revokeObjectURL(blobUrl); }
    }
    console.warn("[PostcardSheet] proxy", resp.status, src.slice(0, 80));
  } catch (e) {
    console.warn("[PostcardSheet] proxy error:", e.message);
  }

  // Fallback : chargement direct avec CORS anonymous (preview ok, canvas peut être tainté)
  try {
    const img = await toImg(src, "anonymous");
    console.info("[PostcardSheet] fallback direct OK");
    IMG_CACHE.set(src, img); return img;
  } catch (e) {
    console.warn("[PostcardSheet] direct load failed:", e.message);
    throw new Error("Image indisponible");
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = []; let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxWidth && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function drawPhoto(ctx, img) {
  if (!img) { ctx.fillStyle = "#1a0d06"; ctx.fillRect(0, 0, SIZE, SIZE); return; }
  const scale = Math.max(SIZE / img.width, SIZE / img.height);
  const w = img.width * scale, h = img.height * scale;
  ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
}

/* ══════════════════════════════════════════════
   FRAMES
══════════════════════════════════════════════ */

// ── 0 · Nuit Dorée ─────────────────────────────
function drawFrameGold(ctx, { photoImg, logoImg, message, author }) {
  drawPhoto(ctx, photoImg);

  // Gradients
  const tG = ctx.createLinearGradient(0, 0, 0, SIZE * 0.38);
  tG.addColorStop(0, "rgba(10,7,5,.72)"); tG.addColorStop(1, "rgba(10,7,5,0)");
  ctx.fillStyle = tG; ctx.fillRect(0, 0, SIZE, SIZE);
  const bG = ctx.createLinearGradient(0, SIZE * 0.42, 0, SIZE);
  bG.addColorStop(0, "rgba(10,7,5,0)"); bG.addColorStop(.55, "rgba(10,7,5,.82)"); bG.addColorStop(1, "rgba(10,7,5,.97)");
  ctx.fillStyle = bG; ctx.fillRect(0, 0, SIZE, SIZE);

  // Cadre doré
  const P = 24;
  ctx.strokeStyle = "rgba(232,160,32,.75)"; ctx.lineWidth = 5;
  ctx.strokeRect(P, P, SIZE - P*2, SIZE - P*2);
  ctx.strokeStyle = "rgba(232,160,32,.25)"; ctx.lineWidth = 1.5;
  ctx.strokeRect(P+10, P+10, SIZE-(P+10)*2, SIZE-(P+10)*2);

  // Logo tampon
  const ST = 148, SX = SIZE - ST - 48, SY = 48;
  ctx.save();
  ctx.beginPath(); ctx.arc(SX+ST/2, SY+ST/2, ST/2, 0, Math.PI*2);
  ctx.fillStyle = "rgba(10,7,5,.55)"; ctx.fill();
  ctx.beginPath(); ctx.arc(SX+ST/2, SY+ST/2, ST/2-4, 0, Math.PI*2); ctx.clip();
  if (logoImg) ctx.drawImage(logoImg, SX+4, SY+4, ST-8, ST-8);
  ctx.restore();
  ctx.beginPath(); ctx.arc(SX+ST/2, SY+ST/2, ST/2, 0, Math.PI*2);
  ctx.strokeStyle = "#E8A020"; ctx.lineWidth = 4; ctx.stroke();

  // Titre haut gauche
  ctx.textAlign = "left"; ctx.fillStyle = "#E8A020";
  ctx.font = "700 38px Arial"; ctx.fillText("MURCIA · ÉTÉ 2026", P+22, P+52);

  // Message
  if (message.trim()) {
    ctx.font = "italic 54px Georgia, serif"; ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 18;
    const lines = wrapText(ctx, message.trim(), SIZE - 180);
    const LH = 72, base = SIZE - 220 - (lines.length*LH)/2;
    lines.forEach((l,i) => ctx.fillText(l, SIZE/2, base+i*LH));
    ctx.shadowBlur = 0;
  }
  ctx.textAlign = "center"; ctx.font = "700 32px Arial"; ctx.fillStyle = "rgba(232,160,32,.9)";
  ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 12;
  ctx.fillText(`— ${author}`, SIZE/2, SIZE-98); ctx.shadowBlur = 0;
  ctx.font = "24px Arial"; ctx.fillStyle = "rgba(245,240,235,.28)";
  ctx.fillText("Murci'App · Moadon Espagne 2026", SIZE/2, SIZE-50);
}

// ── 1 · Polaroid ───────────────────────────────
function drawFramePolaroid(ctx, { photoImg, logoImg, message, author }) {
  // Fond blanc cassé (tout le canvas)
  ctx.fillStyle = "#f4ede4"; ctx.fillRect(0, 0, SIZE, SIZE);

  // Dimensions du cadre polaroid
  const padSide  = 52;   // bords gauche/droite
  const padTop   = 52;   // bord haut
  const stripH   = 260;  // hauteur de la bande de texte en bas
  const photoAreaX = padSide;
  const photoAreaY = padTop;
  const photoAreaW = SIZE - padSide * 2;         // 976px
  const photoAreaH = SIZE - padTop - stripH;     // 768px

  // Fond de la zone photo (gris clair — visible si photo pas carrée)
  ctx.fillStyle = "#ddd5c8";
  ctx.fillRect(photoAreaX, photoAreaY, photoAreaW, photoAreaH);

  // Photo en mode CONTAIN : toute la photo est visible, centrée
  if (photoImg) {
    const scale = Math.min(photoAreaW / photoImg.width, photoAreaH / photoImg.height);
    const w = photoImg.width  * scale;
    const h = photoImg.height * scale;
    const x = photoAreaX + (photoAreaW - w) / 2;
    const y = photoAreaY + (photoAreaH - h) / 2;
    ctx.drawImage(photoImg, x, y, w, h);
  }

  // Logo — coin bas-droit de la zone photo, sur la photo
  if (logoImg) {
    const LS = 84;
    const lx = photoAreaX + photoAreaW - LS - 16;
    const ly = photoAreaY + photoAreaH - LS - 16;
    ctx.save();
    ctx.beginPath(); ctx.arc(lx + LS/2, ly + LS/2, LS/2, 0, Math.PI*2);
    ctx.fillStyle = "rgba(244,237,228,.82)"; ctx.fill(); ctx.clip();
    ctx.drawImage(logoImg, lx, ly, LS, LS);
    ctx.restore();
    ctx.beginPath(); ctx.arc(lx + LS/2, ly + LS/2, LS/2, 0, Math.PI*2);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
  }

  // ── Bande de texte ──────────────────────────────
  const stripY   = photoAreaY + photoAreaH;  // début de la bande
  const stripMid = stripY + stripH / 2;

  ctx.textAlign = "center";

  if (message.trim()) {
    ctx.font = "italic 46px Georgia, serif"; ctx.fillStyle = "#2c1a0e";
    const lines = wrapText(ctx, message.trim(), photoAreaW - 80).slice(0, 2);
    const LH = 58;
    const base = stripMid - (lines.length * LH) / 2 - 18;
    lines.forEach((l, i) => ctx.fillText(l, SIZE / 2, base + i * LH));
  }

  ctx.font = "700 30px Arial"; ctx.fillStyle = "#7b1d2e";
  ctx.fillText(`— ${author}`, SIZE / 2, SIZE - padSide - 54);

  ctx.font = "22px Arial"; ctx.fillStyle = "rgba(44,26,14,.3)";
  ctx.fillText("Murci'App · Moadon Espagne 2026", SIZE / 2, SIZE - padSide - 18);
}

// ── 2 · Sans cadre ─────────────────────────────
function drawFrameNone(ctx, { photoImg }) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, SIZE, SIZE);
  drawPhoto(ctx, photoImg);
}

/* ══════════════════════════════════════════════ */

const FRAMES = [
  { id:"gold",  label:"Nuit dorée", draw: drawFrameGold    },
  { id:"polar", label:"Polaroid",   draw: drawFramePolaroid },
  { id:"none",  label:"Sans cadre", draw: drawFrameNone    },
];

async function renderFrame(canvas, frameIdx, { photo, author, message }) {
  const ctx = canvas.getContext("2d");
  canvas.width = SIZE; canvas.height = SIZE;
  ctx.clearRect(0, 0, SIZE, SIZE);

  const [photoImg, logoImg] = await Promise.all([
    loadImage(photo).catch((e) => { console.error("[PostcardSheet] photo failed:", e?.message, photo?.slice?.(0, 80)); return null; }),
    loadImage(LOGO).catch(() => null),
  ]);

  // Si la photo n'a pas chargé, on échoue explicitement plutôt que d'afficher un fond noir
  if (!photoImg) throw new Error("Photo indisponible");

  FRAMES[frameIdx].draw(ctx, { photoImg, logoImg, message, author });
}

/* ── Thumbnail ─────────────────────────────────── */
function ThumbCanvas({ frameIdx, photo, author, active, onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const canvas = ref.current;
    const TSIZE = 160;
    canvas.width = TSIZE; canvas.height = TSIZE;
    (async () => {
      const ctx = canvas.getContext("2d");
      ctx.scale(TSIZE / SIZE, TSIZE / SIZE);
      const [photoImg, logoImg] = await Promise.all([
        loadImage(photo).catch(() => null),
        loadImage(LOGO).catch(() => null),
      ]);
      FRAMES[frameIdx].draw(ctx, { photoImg, logoImg, message: "", author });
    })();
  }, [frameIdx, photo, author]);

  return (
    <button
      onClick={onClick}
      style={{
        border: `2.5px solid ${active ? "#E8A020" : "rgba(245,240,235,.15)"}`,
        borderRadius: 10, overflow:"hidden", padding:0, background:"none",
        cursor:"pointer", flexShrink:0, width:72, height:72,
        transition:"border-color .2s",
      }}>
      <canvas ref={ref} style={{ width:"100%", height:"100%", display:"block" }}/>
      <div style={{ fontSize:".6rem", color: active ? "#E8A020" : "rgba(245,240,235,.4)",
        textAlign:"center", padding:"2px 0 3px", fontWeight: active ? 700 : 400,
        background:"#0A0705", lineHeight:1 }}>
        {FRAMES[frameIdx].label}
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════════
   COMPOSANT PRINCIPAL
══════════════════════════════════════════════ */
export default function PostcardSheet({ photo, author, caption, onClose }) {
  const canvasRef  = useRef(null);
  const [message,  setMessage]  = useState(caption || "");
  const [frameIdx, setFrameIdx] = useState(0);
  const [busy,     setBusy]     = useState(false);
  const [ready,    setReady]    = useState(false);
  const [drawErr,  setDrawErr]  = useState(false);
  const debounceRef = useRef(null);

  const redraw = useCallback((clearCache = false) => {
    if (clearCache) IMG_CACHE.delete(photo);
    setReady(false); setDrawErr(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!canvasRef.current) return;
      try {
        await renderFrame(canvasRef.current, frameIdx, { photo, author, message });
        setReady(true);
      } catch (e) {
        console.error("[PostcardSheet] draw error:", e.message);
        setDrawErr(true);
      }
    }, 250);
  }, [frameIdx, message, photo, author]);

  useEffect(() => { redraw(); return () => clearTimeout(debounceRef.current); }, [redraw]);

  const handleDownload = async () => {
    setBusy(true);
    try {
      await renderFrame(canvasRef.current, frameIdx, { photo, author, message });

      // Mobile Web Share API
      if (isMobile() && navigator.canShare) {
        const blob = await new Promise(res => canvasRef.current.toBlob(res, "image/jpeg", 0.93));
        const file = new File([blob], "carte-murcia-2026.jpg", { type:"image/jpeg" });
        if (navigator.canShare({ files:[file] })) {
          await navigator.share({ files:[file], title:"Carte Murcia 2026" });
          setBusy(false); return;
        }
      }

      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.93);

      if (isMobile()) {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(
            `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>Carte Murcia 2026</title>
            <style>body{margin:0;background:#0A0705;display:flex;flex-direction:column;align-items:center;
            justify-content:center;min-height:100vh}img{max-width:100%;border-radius:12px}
            p{color:rgba(245,240,235,.5);font-family:sans-serif;font-size:.85rem;margin-top:1rem;
            text-align:center;padding:0 1rem}</style></head>
            <body><img src="${dataUrl}"/>
            <p>📱 Appuie longuement sur l'image → "Enregistrer"</p></body></html>`
          );
          win.document.close();
        }
      } else {
        const a = document.createElement("a");
        a.href = dataUrl; a.download = `carte-murcia-${Date.now()}.jpg`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    } catch (e) { console.error("download:", e); }
    setBusy(false);
  };

  const shareSupported = isMobile() && !!navigator.canShare;

  return (
    <div className="feed-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex:120 }}>
      <div className="post-sheet" style={{ maxHeight:"94vh", overflowY:"auto",
        paddingBottom:"env(safe-area-inset-bottom)" }}>
        <div className="sheet-drag"/>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:".75rem 1.25rem .5rem" }}>
          <span style={{ fontWeight:700, fontSize:"1rem", color:"var(--txt)" }}>📸 Souvenir</span>
          <button onClick={onClose}
            style={{ background:"none", border:"none", color:"var(--mu)",
              fontSize:"1.35rem", cursor:"pointer", padding:".25rem .5rem" }}>✕</button>
        </div>

        {/* Canvas preview */}
        <div style={{ padding:"0 1rem .75rem", position:"relative" }}>
          <canvas ref={canvasRef}
            style={{ width:"100%", borderRadius:16, display:"block",
              boxShadow:"0 12px 40px rgba(0,0,0,.55)",
              opacity: ready ? 1 : 0.5, transition:"opacity .25s" }}/>
          {!ready && !drawErr && (
            <div style={{ position:"absolute", inset:0, display:"flex",
              alignItems:"center", justifyContent:"center",
              fontSize:"1.6rem", pointerEvents:"none" }}>✨</div>
          )}
          {drawErr && (
            <div style={{ position:"absolute", inset:0, display:"flex",
              flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:".5rem", pointerEvents:"none", padding:"1rem" }}>
              <span style={{ fontSize:"1.8rem" }}>⚠️</span>
              <span style={{ fontSize:".8rem", color:"rgba(245,240,235,.55)",
                textAlign:"center" }}>
                Photo indisponible
              </span>
              <span style={{ fontSize:".6rem", color:"rgba(245,240,235,.3)",
                textAlign:"center", wordBreak:"break-all", maxHeight:60, overflow:"hidden" }}>
                {photo?.startsWith("data:") ? "data:image (base64)" : photo?.slice(0, 120)}
              </span>
              <button onClick={() => redraw(true)} style={{ pointerEvents:"all", fontSize:".75rem",
                background:"rgba(232,160,32,.15)", border:"1px solid rgba(232,160,32,.3)",
                color:"rgba(232,160,32,.8)", borderRadius:16, padding:".3rem .8rem",
                cursor:"pointer" }}>🔄 Réessayer</button>
            </div>
          )}
        </div>

        {/* Sélecteur de cadres */}
        <div style={{ padding:"0 1rem .85rem" }}>
          <div style={{ fontSize:".72rem", fontWeight:700, color:"rgba(245,240,235,.4)",
            letterSpacing:".08em", textTransform:"uppercase", marginBottom:".5rem" }}>
            Choisir un cadre
          </div>
          <div style={{ display:"flex", gap:".6rem", overflowX:"auto", paddingBottom:".25rem",
            scrollbarWidth:"none" }}>
            {FRAMES.map((_, i) => (
              <ThumbCanvas key={i}
                frameIdx={i} photo={photo} author={author}
                active={frameIdx === i}
                onClick={() => setFrameIdx(i)}/>
            ))}
          </div>
        </div>

        {/* Message */}
        <div style={{ padding:"0 1.25rem .75rem" }}>
          <label style={{ fontSize:".75rem", fontWeight:700, color:"var(--gold)",
            letterSpacing:".06em", textTransform:"uppercase", display:"block", marginBottom:".4rem" }}>
            Message (facultatif)
          </label>
          <textarea
            style={{ width:"100%", boxSizing:"border-box",
              background:"rgba(245,240,235,.06)", border:"1.5px solid rgba(245,240,235,.12)",
              borderRadius:12, color:"var(--txt)", padding:".7rem .9rem",
              fontSize:".95rem", resize:"none", fontFamily:"Georgia, serif",
              fontStyle:"italic", lineHeight:1.5, outline:"none" }}
            placeholder="Un souvenir inoubliable… ✨"
            rows={2} maxLength={120}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          <div style={{ fontSize:".68rem", color:"rgba(245,240,235,.3)",
            textAlign:"right", marginTop:".2rem" }}>{message.length}/120</div>
        </div>

        {/* Bouton */}
        <div style={{ padding:"0 1.25rem 1.5rem" }}>
          <button className="splash-btn-main"
            onClick={handleDownload} disabled={busy || !ready}
            style={{ width:"100%", opacity:(busy || !ready) ? .6 : 1 }}>
            <span>
              {busy ? "Génération…"
                : shareSupported ? "📤 Partager / Enregistrer"
                : isMobile() ? "🖼️ Voir & enregistrer"
                : "💾 Télécharger la carte"}
            </span>
          </button>
          <div style={{ fontSize:".72rem", color:"rgba(245,240,235,.3)",
            textAlign:"center", marginTop:".6rem" }}>
            {shareSupported ? "Partage natif · 1080×1080px"
              : isMobile() ? "S'ouvre dans le nav · appuie longuement pour sauvegarder"
              : "Format JPEG · 1080×1080px"}
          </div>
        </div>
      </div>
    </div>
  );
}
