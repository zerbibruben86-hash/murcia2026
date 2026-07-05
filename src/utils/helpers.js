export const IMG_POOL = "/bg.jpg";
export const PALETTE = ["#7B1D2E","#E8A020","#2980B9","#27AE60","#8E44AD","#C0392B","#E67E22","#16A085","#2C3E50","#D35400"];
export const EMOJIS  = ["🏊","⚽","🎨","🏕️","🎵","🏹","🧗","🚵","🏓","🎯","🌿","🦋","🔥","🎭","🎸","🏄","🤸","🧶","🎪","🦅"];
export const STAR_LABELS = ["","Pas super 😕","Ça va 😐","Bien 🙂","Super 😄","Excellent 🤩"];
export const DEFAULT_PWD = "colo2024";
const DEF_SONG = { title:"", cover:"", spotify:"", deezer:"", youtube:"", apple:"", lyrics:"" };
export const DEF_CFG = {campName:"Ça Murce ?",subtitle:"Moadon Espagne 2026",message:"",adminPwd:DEFAULT_PWD,useWhitelist:false,staffPwd:"",songs:[{...DEF_SONG},{...DEF_SONG}]};
export const DEFAULTS = [
  {id:"a1",name:"Natation",  type:"activité", desc:"Plongeons et jeux aquatiques dans la grande piscine !",   limitTotal:true,maxTotal:20,maxBoys:10,maxGirls:10,useQuotas:true, emoji:"🏊",color:"#2980B9",photo:"",openDate:"",openTime:"",closeDate:"",closeTime:""},
  {id:"a2",name:"Créativité",type:"activité", desc:"Peinture, dessin, sculpture et mille bricolages colorés",limitTotal:true,maxTotal:15,maxBoys:8, maxGirls:8, useQuotas:false,emoji:"🎨",color:"#8E44AD",photo:"",openDate:"",openTime:"",closeDate:"",closeTime:""},
  {id:"a3",name:"Soirée jeux",type:"veillée", desc:"Jeux de société, quiz et animations du soir",            limitTotal:true,maxTotal:50,maxBoys:25,maxGirls:25,useQuotas:false,emoji:"🎲",color:"#7B1D2E",photo:"",openDate:"",openTime:"",closeDate:"",closeTime:""},
];

export const compressImage = (file, maxPx=1080, quality=0.83, square=false) => new Promise(resolve=>{
  const img=new Image(); const url=URL.createObjectURL(file);
  img.onload=()=>{
    let sx=0,sy=0,sw=img.width,sh=img.height;
    if(square){const min=Math.min(img.width,img.height);sx=(img.width-min)/2;sy=(img.height-min)/2;sw=sh=min;}
    const scale=Math.min(1,maxPx/Math.max(sw,sh));
    const c=document.createElement('canvas');
    c.width=Math.round(sw*scale); c.height=Math.round(sh*scale);
    const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
    URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg',quality));
  }; img.src=url;
});

export const barCol = (v,max) => v/max<.6?"#22C55E":v/max<.85?"#F59E0B":"#EF4444";
export const avgRating = (actId, regs) => { const r=regs.filter(x=>x.actId===actId&&x.rating>0); return r.length?r.reduce((s,x)=>s+x.rating,0)/r.length:0; };
export const fmtRating = v => v>0?("⭐".repeat(Math.round(v))+" "+v.toFixed(1)):"";
export const readFile = f => new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(f);});

/* ── Fuzzy matching ────────────────────────────────────────────────────── */
// Normalise : minuscules + supprime accents (é→e, ü→u, etc.)
export const normalize = s => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");

// Distance de Levenshtein (nombre de substitutions/insertions/suppressions)
export const levenshtein = (a, b) => {
  const m=a.length, n=b.length;
  if(!m) return n; if(!n) return m;
  let prev=Array.from({length:n+1},(_,i)=>i);
  for(let i=1;i<=m;i++){
    const cur=[i];
    for(let j=1;j<=n;j++) cur[j]=a[i-1]===b[j-1]?prev[j-1]:1+Math.min(prev[j],cur[j-1],prev[j-1]);
    prev=cur;
  }
  return prev[n];
};

/**
 * Cherche dans `list` ({fn, ln}) la personne la plus proche de (fn, ln).
 * Retourne la suggestion si la distance totale ≤ seuil (2 par défaut).
 * Retourne null si match exact (normalisé) ou aucune suggestion proche.
 */
export const findFuzzyMatch = (fn, ln, list, maxDist=2) => {
  const nFn=normalize(fn), nLn=normalize(ln);
  let best=null, bestDist=Infinity;
  for(const c of list){
    const cFn=normalize(c.fn), cLn=normalize(c.ln);
    if(cFn===nFn && cLn===nLn) return null; // match exact → pas de suggestion
    const dFn=levenshtein(nFn,cFn), dLn=levenshtein(nLn,cLn);
    const total=dFn+dLn;
    // Suggère seulement si chaque nom est proche individuellement
    if(dFn<=maxDist && dLn<=maxDist && total>0 && total<=maxDist+1 && total<bestDist){
      best=c; bestDist=total;
    }
  }
  return best;
};
