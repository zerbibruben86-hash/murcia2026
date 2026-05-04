import { useState, useEffect, useRef, useMemo } from "react";
import { storage } from "./firebase";

const LOGO = "data:image/webp;base64,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";
const PALETTE = ["#7B1D2E","#E8A020","#2980B9","#27AE60","#8E44AD","#C0392B","#E67E22","#16A085","#2C3E50","#D35400"];
const EMOJIS  = ["🏊","⚽","🎨","🏕️","🎵","🏹","🧗","🚵","🏓","🎯","🌿","🦋","🔥","🎭","🎸","🏄","🤸","🧶","🎪","🦅"];
const STAR_LABELS = ["","Pas super 😕","Ça va 😐","Bien 🙂","Super 😄","Excellent 🤩"];
const DEFAULT_PWD = "colo2024";
const DEFAULTS = [
  {id:"a1",name:"Natation",  desc:"Plongeons et jeux aquatiques dans la grande piscine !",   limitTotal:true,maxTotal:20,maxBoys:10,maxGirls:10,useQuotas:true, emoji:"🏊",color:"#2980B9",photo:"",openDate:"",openTime:"",closeDate:"",closeTime:""},
  {id:"a2",name:"Créativité",desc:"Peinture, dessin, sculpture et mille bricolages colorés",limitTotal:true,maxTotal:15,maxBoys:8, maxGirls:8, useQuotas:false,emoji:"🎨",color:"#8E44AD",photo:"",openDate:"",openTime:"",closeDate:"",closeTime:""},
  {id:"a3",name:"Football",  desc:"Matchs et tournois sur le grand terrain",                 limitTotal:true,maxTotal:22,maxBoys:14,maxGirls:8, useQuotas:true, emoji:"⚽",color:"#27AE60",photo:"",openDate:"",openTime:"",closeDate:"",closeTime:""},
];
const DEF_CFG = {campName:"Ça Murce ?",subtitle:"Moadon Espagne 2026",message:"",adminPwd:DEFAULT_PWD,useWhitelist:false};

/* ═══════════════════════════════ CSS ══════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@400;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--brd:#7B1D2E;--brd-dk:#5A1220;--brd-lt:#F9EEF1;--gold:#E8A020;--gold-lt:#FFF8EC;--bg:#FDF5F7;--card:#fff;--txt:#2A0A12;--mu:#8A5060;--bor:#EDD8DE;--r:16px;--touch:52px}
html{font-size:16px}
body{background:var(--bg);font-family:'Nunito',sans-serif;color:var(--txt);-webkit-tap-highlight-color:transparent;overscroll-behavior-y:none}

/* header */
.hdr{background:var(--brd);padding:.55rem 1rem;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:300;box-shadow:0 3px 14px rgba(90,18,32,.4)}
.logo-img{height:72px;width:auto;display:block}
.hdr-spacer{min-width:80px;display:flex;align-items:center}
.hdr-spacer.right{justify-content:flex-end}
.hdr-btn{background:none;border:1.5px solid rgba(255,255,255,.35);color:rgba(255,255,255,.85);font-family:'Nunito';font-size:.8rem;font-weight:700;padding:.42rem .9rem;border-radius:20px;cursor:pointer;transition:all .18s;white-space:nowrap;min-height:44px}
.hdr-btn:active{border-color:var(--gold);color:var(--gold)}
.burger{background:none;border:none;cursor:pointer;padding:.5rem;display:flex;flex-direction:column;gap:5px;min-height:44px;min-width:44px;align-items:center;justify-content:center}
.burger span{display:block;width:22px;height:2.5px;background:rgba(255,255,255,.85);border-radius:2px;transition:all .25s}
.burger.open span:nth-child(1){transform:translateY(7.5px) rotate(45deg)}
.burger.open span:nth-child(2){opacity:0;transform:scaleX(0)}
.burger.open span:nth-child(3){transform:translateY(-7.5px) rotate(-45deg)}

/* menu drawer */
.menu-overlay{position:fixed;inset:0;background:rgba(42,10,18,.5);z-index:400;animation:fi .2s}
@keyframes fi{from{opacity:0}to{opacity:1}}
.menu-drawer{position:fixed;top:0;left:0;bottom:0;width:min(300px,85vw);background:var(--card);z-index:500;box-shadow:6px 0 30px rgba(90,18,32,.25);display:flex;flex-direction:column;animation:sl .25s cubic-bezier(.32,1,.3,1)}
@keyframes sl{from{transform:translateX(-100%)}to{transform:translateX(0)}}
.menu-head{background:var(--brd);padding:1rem 1.25rem 1.25rem;display:flex;flex-direction:column;align-items:center;gap:.5rem}
.menu-logo{height:64px}
.menu-sub{font-size:.72rem;color:rgba(255,255,255,.65);font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.menu-items{padding:.75rem .6rem;display:flex;flex-direction:column;gap:.25rem;flex:1;overflow-y:auto}
.menu-item{display:flex;align-items:center;gap:.85rem;padding:.85rem 1rem;border-radius:14px;cursor:pointer;font-size:.95rem;font-weight:700;color:var(--txt);transition:all .18s;border:none;background:none;width:100%;text-align:left;min-height:var(--touch)}
.menu-item:active,.menu-item.active{background:var(--brd-lt);color:var(--brd)}
.menu-item-ico{font-size:1.3rem;width:32px;text-align:center;flex-shrink:0}
.menu-item-txt{line-height:1.2}
.menu-item-sub{font-size:.75rem;color:var(--mu);font-weight:600}
.menu-sep{height:1px;background:var(--bor);margin:.3rem .6rem}
.menu-admin{margin:.5rem .6rem .75rem;display:flex;align-items:center;gap:.85rem;padding:.75rem 1rem;border-radius:14px;cursor:pointer;font-size:.88rem;font-weight:700;color:var(--mu);transition:all .18s;border:1.5px solid var(--bor);background:none;width:calc(100% - 1.2rem);text-align:left;min-height:44px}
.menu-admin:active{border-color:var(--brd);color:var(--brd)}

/* home */
.home{min-height:calc(100vh - 90px);display:flex;flex-direction:column}
.home-hero{background:var(--brd);padding:2.25rem 1.5rem 2.75rem;text-align:center;position:relative;overflow:hidden}
.home-hero::before{content:'';position:absolute;inset:-40%;background:radial-gradient(ellipse at 60% 40%,rgba(232,160,32,.18) 0%,transparent 60%);pointer-events:none}
.home-hero-logo{height:130px;width:auto;margin:0 auto 1.4rem;display:block;filter:drop-shadow(0 4px 16px rgba(0,0,0,.3))}
.home-hero-tagline{font-family:'Baloo 2',sans-serif;font-size:clamp(.9rem,3.5vw,1.1rem);font-weight:700;color:rgba(255,255,255,.8);letter-spacing:.04em;margin-bottom:1.75rem}
.home-cta-row{display:flex;gap:.85rem;justify-content:center;flex-wrap:wrap}
.cta-btn{display:inline-flex;align-items:center;gap:.5rem;padding:.9rem 1.6rem;border-radius:50px;font-family:'Baloo 2',sans-serif;font-size:1rem;font-weight:700;cursor:pointer;border:none;transition:all .2s;min-height:var(--touch)}
.cta-btn.primary{background:var(--gold);color:var(--brd-dk)}
.cta-btn.primary:active{background:#F5B030}
.cta-btn.secondary{background:rgba(255,255,255,.12);color:#fff;border:1.5px solid rgba(255,255,255,.3)}
.cta-btn.secondary:active{background:rgba(255,255,255,.2)}
.home-wave svg{display:block;width:100%;background:var(--brd)}
.home-body{flex:1;max-width:680px;margin:0 auto;padding:1.5rem 1rem 4rem;width:100%}
.home-section{margin-bottom:2rem}
.home-section-title{font-family:'Baloo 2',sans-serif;font-size:1.1rem;font-weight:800;color:var(--brd);margin-bottom:.85rem;display:flex;align-items:center;gap:.5rem}
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.65rem}
.stat-card{background:var(--card);border-radius:16px;padding:.85rem .65rem;text-align:center;border:1.5px solid var(--bor);box-shadow:0 2px 8px rgba(123,29,46,.05)}
.stat-val{font-family:'Baloo 2',sans-serif;font-size:1.7rem;font-weight:800;color:var(--brd);line-height:1}
.stat-lbl{font-size:.68rem;color:var(--mu);font-weight:700;margin-top:.18rem;text-transform:uppercase;letter-spacing:.04em}
.msg-banner{background:var(--gold-lt);border:1.5px solid var(--gold);border-radius:14px;padding:.85rem 1.1rem;font-size:.9rem;font-weight:600;color:#7A3800;display:flex;gap:.6rem;align-items:flex-start}
.closed-banner{background:#F9EEF1;border:1.5px solid var(--bor);border-radius:14px;padding:1.25rem;text-align:center}
.closed-banner .ico{font-size:2.2rem;margin-bottom:.5rem}
.closed-banner h3{font-family:'Baloo 2',sans-serif;font-size:1.1rem;font-weight:800;color:var(--brd);margin-bottom:.25rem}
.closed-banner p{font-size:.85rem;color:var(--mu)}
.act-preview-grid{display:flex;flex-direction:column;gap:.75rem}
.act-preview{background:var(--card);border-radius:var(--r);border:1.5px solid var(--bor);overflow:hidden;display:flex;align-items:stretch;cursor:pointer;transition:all .18s;box-shadow:0 2px 8px rgba(123,29,46,.05)}
.act-preview:active{transform:scale(.985)}
.act-preview-img{width:80px;min-height:80px;object-fit:cover;flex-shrink:0}
.act-preview-banner{width:80px;min-height:80px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:2rem}
.act-preview-body{padding:.7rem .9rem;flex:1;display:flex;flex-direction:column;justify-content:center;gap:.25rem;min-width:0}
.act-preview-name{font-family:'Baloo 2',sans-serif;font-size:.95rem;font-weight:800}
.act-preview-meta{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.act-preview-bar{height:5px;background:#F0E5E8;border-radius:3px;overflow:hidden;margin:.15rem 0}
.act-preview-fill{height:100%;border-radius:3px}
.act-preview-spots{font-size:.75rem;font-weight:700}
.act-preview-rating{font-size:.75rem;color:var(--gold);font-weight:700}
.act-preview-arrow{padding:0 .85rem;display:flex;align-items:center;color:#D0B8BD;font-size:1.1rem;flex-shrink:0}
.rank-badge{font-size:.7rem;font-weight:800;padding:.15rem .5rem;border-radius:8px;background:var(--gold-lt);color:#92400E;border:1px solid rgba(232,160,32,.3)}

/* inscriptions */
.main{max-width:680px;margin:0 auto;padding:1.5rem 1rem 5rem}
.page-title{font-family:'Baloo 2',sans-serif;font-size:1.5rem;font-weight:800;color:var(--brd);margin-bottom:1.1rem}
.divider{height:2px;background:linear-gradient(90deg,transparent,var(--gold) 30%,var(--gold) 70%,transparent);margin:0 0 1.4rem;opacity:.4;border-radius:2px}
.grid{display:flex;flex-direction:column;gap:1rem}
@media(min-width:600px){.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(275px,1fr))}}
.card{background:var(--card);border-radius:var(--r);overflow:hidden;cursor:pointer;border:2.5px solid transparent;box-shadow:0 2px 8px rgba(123,29,46,.07);transition:all .18s;display:flex;flex-direction:column}
.card:active:not(.unavail){transform:scale(.985)}
.card.sel{border-color:var(--brd);box-shadow:0 0 0 4px rgba(123,29,46,.1)}
.card.unavail{opacity:.6;cursor:not-allowed}
.card-photo{width:100%;height:170px;object-fit:cover;display:block}
.card-banner{width:100%;height:110px;display:flex;align-items:center;justify-content:center;font-size:3rem}
.card-body{padding:1rem 1.1rem 1.1rem;flex:1;display:flex;flex-direction:column}
.card-name{font-family:'Baloo 2',sans-serif;font-size:1.1rem;font-weight:800;margin-bottom:.25rem}
.card-desc{font-size:.875rem;color:var(--mu);line-height:1.5;margin-bottom:.85rem;flex:1}
.cap-bar-bg{height:7px;background:#F0E5E8;border-radius:4px;overflow:hidden;margin:.3rem 0 .6rem}
.cap-bar{height:100%;border-radius:4px;transition:width .35s}
.cap-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.25rem}
.cap-txt{font-size:.8rem;font-weight:700}
.tag{font-size:.7rem;font-weight:800;padding:.22rem .55rem;border-radius:8px;white-space:nowrap}
.tag-full{background:#FFE5E5;color:#C53030}
.tag-sel{background:var(--brd-lt);color:var(--brd)}
.tag-few{background:var(--gold-lt);color:#92400E}

/* bottom sheet */
.sheet-overlay{position:fixed;inset:0;background:rgba(42,10,18,.45);z-index:400;animation:fi .2s}
.sheet{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-radius:22px 22px 0 0;z-index:500;max-height:92vh;overflow-y:auto;padding-bottom:env(safe-area-inset-bottom);box-shadow:0 -8px 40px rgba(90,18,32,.25);animation:su .25s cubic-bezier(.32,1,.3,1)}
@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
.sheet-drag{width:42px;height:4px;background:#E0CED2;border-radius:2px;margin:10px auto 0}
.sheet-hdr{padding:.85rem 1.25rem .7rem;display:flex;align-items:center;gap:.75rem;border-bottom:1px solid var(--bor)}
.sheet-ico{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.35rem;flex-shrink:0}
.sheet-nm{font-family:'Baloo 2',sans-serif;font-size:1.05rem;font-weight:800;color:var(--brd)}
.sheet-sub{font-size:.75rem;color:var(--mu)}
.sheet-close{margin-left:auto;background:var(--brd-lt);border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;color:var(--brd);flex-shrink:0}
.sheet-body{padding:1.1rem 1.25rem 1.5rem}
.fr{display:flex;gap:.75rem;margin-bottom:.85rem}
.fg{flex:1;min-width:0}
.flbl{display:block;font-size:.82rem;font-weight:700;color:#666;margin-bottom:.35rem}
.finp{width:100%;padding:.82rem 1rem;border:1.5px solid #E8D8DC;border-radius:12px;font-family:'Nunito';font-size:1rem;outline:none;background:#fff;color:var(--txt);-webkit-appearance:none;min-height:var(--touch);transition:border-color .2s}
.finp:focus{border-color:var(--brd)}
.gender-row{display:flex;gap:.65rem;margin-bottom:1rem}
.gbtn{flex:1;padding:.85rem .5rem;border:2.5px solid #E8D8DC;border-radius:14px;background:none;cursor:pointer;font-family:'Nunito';font-size:.95rem;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:.3rem;transition:all .18s;color:var(--mu);min-height:var(--touch)}
.gbtn.boy.sel{border-color:#2980B9;background:#EAF4FD;color:#1A5C8A}
.gbtn.girl.sel{border-color:#C0392B;background:#FDECEA;color:#922B21}
.gbtn-ico{font-size:2rem}
.selfie-zone{border:2px dashed var(--bor);border-radius:12px;overflow:hidden;background:#FDFAFA;margin-bottom:1rem}
.selfie-preview{width:100%;height:100px;object-fit:cover;display:block}
.selfie-btns{display:flex;gap:.45rem;padding:.6rem}
.pbtn{flex:1;display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.6rem .5rem;border-radius:10px;font-family:'Nunito';font-size:.78rem;font-weight:700;cursor:pointer;border:1.5px solid var(--bor);background:#fff;color:var(--mu);position:relative;overflow:hidden;min-height:44px;transition:all .18s}
.pbtn:active{border-color:var(--brd);color:var(--brd);background:var(--brd-lt)}
.pbtn input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;font-size:0}
.sbtn{background:var(--brd);color:#fff;border:none;font-family:'Baloo 2';font-size:1.1rem;font-weight:700;padding:1rem;border-radius:14px;cursor:pointer;width:100%;min-height:var(--touch);transition:background .18s}
.sbtn:active{background:var(--brd-dk)}
.msg{padding:.9rem 1rem;border-radius:12px;font-size:.88rem;font-weight:600;margin-top:.85rem;line-height:1.5}
.msg.ok{background:#F0FDF4;color:#166534;border:1.5px solid #BBF7D0}
.msg.err{background:#FFF0F0;color:#9B1C1C;border:1.5px solid #FCA5A5}
.msg.warn{background:var(--gold-lt);color:#92400E;border:1.5px solid var(--gold)}

/* confetti */
@keyframes cffall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
.cf-wrap{position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden}
.cf{position:absolute;top:-20px;animation:cffall linear forwards}

/* my registrations */
.my-wrap{max-width:500px;margin:0 auto;padding:1.5rem 1rem 5rem}
.search-box{background:var(--card);border-radius:var(--r);border:1.5px solid var(--bor);padding:1.25rem;margin-bottom:1.5rem;box-shadow:0 2px 8px rgba(123,29,46,.06)}
.search-box h3{font-family:'Baloo 2',sans-serif;font-size:1rem;font-weight:800;color:var(--brd);margin-bottom:.85rem}
.my-reg-card{background:var(--card);border-radius:20px;border:2px solid var(--bor);overflow:hidden;box-shadow:0 4px 16px rgba(123,29,46,.09)}
.my-reg-top{padding:1.1rem 1.25rem;display:flex;align-items:center;gap:.85rem}
.my-reg-ico{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;overflow:hidden}
.my-reg-ico img{width:52px;height:52px;object-fit:cover;border-radius:14px}
.my-selfie{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid var(--bor);flex-shrink:0}
.my-reg-nm{font-family:'Baloo 2',sans-serif;font-size:1.1rem;font-weight:800}
.my-reg-who{font-size:.8rem;color:var(--mu);margin-top:.15rem}
.my-reg-section{padding:.85rem 1.25rem;border-top:1px solid var(--bor)}
.my-reg-section-title{font-size:.75rem;font-weight:800;color:var(--mu);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.65rem}
.stars-row{display:flex;gap:.4rem;justify-content:center;padding:.25rem 0}
.star{font-size:2.2rem;cursor:pointer;transition:transform .15s;line-height:1;-webkit-tap-highlight-color:transparent}
.star:active{transform:scale(1.25)}
.rating-lbl{text-align:center;font-size:.82rem;font-weight:700;color:var(--mu);margin-top:.35rem}
.unsub-btn{width:100%;padding:.9rem;border-radius:12px;background:none;border:1.5px solid #FCA5A5;color:#C0392B;font-family:'Baloo 2';font-size:.95rem;font-weight:700;cursor:pointer;min-height:var(--touch);transition:all .18s}
.unsub-btn:active{background:#FFF0F0}
.no-reg-box{text-align:center;padding:2.5rem 1rem;color:var(--mu)}

/* login / admin */
.lw{max-width:380px;margin:2.5rem auto;background:#fff;border-radius:20px;border:1.5px solid var(--bor);padding:2.25rem 1.5rem;text-align:center;box-shadow:0 8px 30px rgba(123,29,46,.08)}
.lw h2{font-family:'Baloo 2';font-size:1.7rem;font-weight:800;margin-bottom:.2rem;color:var(--brd)}
.lw p{color:var(--mu);font-size:.88rem;margin-bottom:1.25rem}
.linp{width:100%;padding:.9rem 1rem;border:1.5px solid #E8D8DC;border-radius:12px;font-family:'Nunito';font-size:1rem;text-align:center;outline:none;margin-bottom:.85rem;-webkit-appearance:none;min-height:var(--touch);transition:border-color .2s}
.linp:focus{border-color:var(--brd)}
.aw{max-width:800px;margin:0 auto;padding:1.25rem .9rem 5rem}
.a-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.6rem}
.a-title{font-family:'Baloo 2';font-size:1.4rem;font-weight:800;color:var(--brd)}
.chips{display:flex;gap:.45rem;flex-wrap:wrap}
.chip{background:var(--brd-lt);border-radius:20px;padding:.22rem .75rem;font-size:.75rem;font-weight:700;color:var(--brd)}
.chip.b{background:#EAF4FD;color:#1A5C8A}.chip.g{background:#FDECEA;color:#922B21}.chip.gold{background:var(--gold-lt);color:#92400E}
.sbar{background:#fff;border:1.5px solid var(--bor);border-radius:14px;padding:.9rem 1rem;margin-bottom:1rem;display:flex;flex-direction:column;gap:.65rem}
.sbar-row{display:flex;flex-wrap:wrap;gap:.75rem;align-items:flex-end}
.sbar-g{display:flex;flex-direction:column;gap:.25rem;flex:1;min-width:140px}
.sbar-lbl{font-size:.72rem;font-weight:700;color:#666}
.sinp{padding:.62rem .85rem;border:1.5px solid #E8D8DC;border-radius:10px;font-family:'Nunito';font-size:.9rem;outline:none;width:100%;background:#fff;min-height:44px;transition:border-color .2s}
.sinp:focus{border-color:var(--brd)}
.sinp-ta{padding:.62rem .85rem;border:1.5px solid #E8D8DC;border-radius:10px;font-family:'Nunito';font-size:.88rem;outline:none;width:100%;background:#fff;resize:vertical;min-height:70px;transition:border-color .2s}
.sinp-ta:focus{border-color:var(--brd)}
.save-btn{background:var(--brd);color:#fff;border:none;font-family:'Nunito';font-size:.85rem;font-weight:700;padding:.6rem 1.2rem;border-radius:10px;cursor:pointer;white-space:nowrap;min-height:44px}
.save-btn:active{background:var(--brd-dk)}
.tabs{display:flex;background:var(--brd-lt);border-radius:14px;padding:4px;margin-bottom:1.25rem;width:fit-content;flex-wrap:wrap;gap:2px}
.tab{padding:.5rem 1rem;border-radius:11px;font-family:'Nunito';font-size:.82rem;font-weight:700;cursor:pointer;border:none;background:transparent;color:var(--mu);transition:all .2s;min-height:44px;white-space:nowrap}
.tab.on{background:#fff;color:var(--brd);box-shadow:0 1px 5px rgba(123,29,46,.12)}
.af{background:#fff;border:2px dashed var(--bor);border-radius:18px;padding:1.25rem 1rem;margin-bottom:1.25rem}
.af h3{font-family:'Baloo 2';font-size:1rem;font-weight:700;color:var(--brd);margin-bottom:.9rem}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
@media(max-width:480px){.fg2{grid-template-columns:1fr}}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.65rem}
@media(max-width:480px){.fg3{grid-template-columns:1fr 1fr}}
.fl label{font-size:.75rem;font-weight:700;color:#666;display:block;margin-bottom:.28rem}
.fl input,.fl select{padding:.6rem .85rem;border:1.5px solid #E8D8DC;border-radius:10px;font-family:'Nunito';font-size:.9rem;outline:none;width:100%;background:#fff;min-height:44px;transition:border-color .2s}
.fl input:focus{border-color:var(--brd)}
.photo-zone{border:2px dashed var(--bor);border-radius:12px;overflow:hidden;background:#FDFAFA}
.photo-preview-img{width:100%;height:120px;object-fit:cover;display:block}
.photo-btns{display:flex;flex-direction:column;gap:.45rem;padding:.65rem}
@media(min-width:480px){.photo-btns{flex-direction:row}}
.toggle-row{display:flex;align-items:center;gap:.7rem;padding:.55rem 0}
.toggle{position:relative;width:44px;height:24px;flex-shrink:0}
.toggle input{opacity:0;width:0;height:0;position:absolute}
.tslider{position:absolute;inset:0;background:#E0CED2;border-radius:24px;cursor:pointer;transition:.25s}
.tslider:before{content:'';position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.25s;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.toggle input:checked + .tslider{background:var(--brd)}
.toggle input:checked + .tslider:before{transform:translateX(20px)}
.toggle-lbl{font-size:.85rem;font-weight:700;color:#555}
.ar{background:#fff;border:1.5px solid var(--bor);border-radius:14px;padding:.85rem 1rem;margin-bottom:.65rem;display:flex;align-items:center;gap:.85rem}
.ar-ico{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;overflow:hidden}
.ar-ico img{width:44px;height:44px;object-fit:cover}
.ar-inf{flex:1;min-width:0}
.ar-nm{font-family:'Baloo 2';font-size:.95rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ar-dc{font-size:.73rem;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ar-counts{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.3rem}
.gc{font-size:.72rem;font-weight:700;padding:.15rem .45rem;border-radius:7px}
.gc.b{background:#EAF4FD;color:#1A5C8A}.gc.g{background:#FDECEA;color:#922B21}.gc.t{background:var(--brd-lt);color:var(--brd)}.gc.nq{background:#F5F5F5;color:#888}
.del-btn{background:none;border:1.5px solid #FCA5A5;color:#EF4444;font-family:'Nunito';font-size:.75rem;font-weight:700;padding:.3rem .6rem;border-radius:8px;cursor:pointer;flex-shrink:0;min-height:40px}

/* summary / print */
.sum-act{background:#fff;border-radius:14px;border:1.5px solid var(--bor);margin-bottom:1.1rem;overflow:hidden}
.sum-act-hdr{padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem;background:var(--brd-lt)}
.sum-act-ico{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;overflow:hidden;flex-shrink:0}
.sum-act-ico img{width:38px;height:38px;object-fit:cover}
.sum-act-nm{font-family:'Baloo 2';font-size:1rem;font-weight:800;flex:1}
.sum-act-counts{font-size:.78rem;font-weight:700;color:var(--mu)}
.sum-row{display:flex;align-items:center;gap:.65rem;padding:.6rem 1rem;border-top:1px solid var(--bor)}
.sum-selfie{width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0}
.sum-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
.sum-name{font-size:.88rem;font-weight:700;flex:1}
.sum-meta{display:flex;gap:.4rem;align-items:center}
.print-btn{background:#2C3E50;color:#fff;border:none;font-family:'Nunito';font-size:.85rem;font-weight:700;padding:.55rem 1.1rem;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:.4rem;min-height:44px;transition:background .18s}
.print-btn:active{background:#1a252f}

/* regs table */
.tbar{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap;margin-bottom:.9rem}
.tbar select{padding:.55rem .85rem;border:1.5px solid #E8D8DC;border-radius:10px;font-family:'Nunito';font-size:.85rem;outline:none;background:#fff;min-height:44px;flex:1}
.exp-btn{background:var(--brd);color:#fff;border:none;font-family:'Nunito';font-size:.85rem;font-weight:700;padding:.55rem 1.1rem;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:.4rem;white-space:nowrap;min-height:44px}
.tw{background:#fff;border-radius:14px;border:1.5px solid var(--bor);overflow:hidden;overflow-x:auto;-webkit-overflow-scrolling:touch}
.rt{width:100%;border-collapse:collapse;font-size:.85rem}
.rt th{text-align:left;padding:.55rem .85rem;font-size:.68rem;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.05em;border-bottom:1.5px solid var(--bor);white-space:nowrap;background:var(--brd-lt)}
.rt td{padding:.6rem .85rem;border-bottom:1px solid #F8F0F2;white-space:nowrap}
.rt tr:last-child td{border-bottom:none}
.apill{display:inline-flex;align-items:center;gap:.25rem;padding:.14rem .48rem;border-radius:7px;font-size:.75rem;font-weight:700}
.reg-selfie{width:28px;height:28px;border-radius:50%;object-fit:cover}
.emj-grid{display:flex;flex-wrap:wrap;gap:.35rem;padding:.5rem;background:var(--brd-lt);border-radius:10px;border:1.5px solid var(--bor)}
.emj-opt{font-size:1.3rem;cursor:pointer;padding:.2rem .3rem;border-radius:6px;min-height:40px;display:flex;align-items:center}
.emj-opt.on,.emj-opt:active{background:rgba(123,29,46,.15)}
.col-grid{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.4rem}
.cdot{width:26px;height:26px;border-radius:50%;cursor:pointer;border:2.5px solid transparent;transition:border-color .15s}
.cdot.on{border-color:#111}
.add-btn{background:var(--brd);color:#fff;border:none;font-family:'Baloo 2';font-size:.95rem;font-weight:700;padding:.75rem 1.4rem;border-radius:12px;cursor:pointer;margin-top:.9rem;width:100%;min-height:var(--touch)}
.add-btn:disabled{background:#ccc;cursor:not-allowed}
.es{text-align:center;padding:2.5rem 1rem;color:#C8A0A8}
.es-ico{font-size:2.5rem;margin-bottom:.5rem}
.loader{text-align:center;padding:4rem 1rem;font-family:'Baloo 2',sans-serif;font-size:1.1rem;color:var(--mu)}

/* children list */
.child-row{display:flex;align-items:center;gap:.75rem;padding:.62rem .9rem;border-bottom:1px solid var(--bor);background:#fff}
.child-row:last-child{border-bottom:none}
.child-avatar{width:34px;height:34px;border-radius:50%;background:var(--brd-lt);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;font-weight:700;color:var(--brd)}
.child-name{flex:1;font-size:.9rem;font-weight:700}
.child-meta{font-size:.75rem;color:var(--mu)}
.child-del{background:none;border:1.5px solid #FCA5A5;color:#EF4444;font-size:.72rem;font-weight:700;padding:.22rem .55rem;border-radius:7px;cursor:pointer;min-height:36px;flex-shrink:0}
.child-del:active{background:#FFF0F0}
.bulk-ta{width:100%;padding:.75rem .9rem;border:1.5px solid #E8D8DC;border-radius:12px;font-family:'Nunito';font-size:.88rem;outline:none;resize:vertical;min-height:100px;transition:border-color .2s;background:#fff;color:var(--txt)}
.bulk-ta:focus{border-color:var(--brd)}
.wl-toggle-row{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:var(--brd-lt);border-radius:12px;margin-bottom:1rem}
.wl-toggle-lbl{font-size:.9rem;font-weight:700;color:var(--brd);flex:1}
.wl-toggle-sub{font-size:.75rem;color:var(--mu);font-weight:600;margin-top:.1rem}
.children-count{background:var(--brd);color:#fff;font-size:.75rem;font-weight:800;padding:.15rem .55rem;border-radius:20px;margin-left:.4rem}

/* confirm modal */
.dlg-overlay{position:fixed;inset:0;background:rgba(42,10,18,.55);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fi .15s}
.dlg{background:#fff;border-radius:20px;padding:1.75rem 1.5rem 1.5rem;max-width:340px;width:100%;box-shadow:0 12px 40px rgba(90,18,32,.25);text-align:center}
.dlg p{font-size:.95rem;font-weight:600;color:var(--txt);margin-bottom:1.35rem;line-height:1.5}
.dlg-btns{display:flex;gap:.65rem}
.dlg-cancel{flex:1;padding:.78rem;border-radius:12px;border:1.5px solid var(--bor);background:#fff;font-family:'Nunito';font-size:.9rem;font-weight:700;cursor:pointer;color:var(--mu);min-height:var(--touch)}
.dlg-cancel:active{background:#F5F0F0}
.dlg-confirm{flex:1;padding:.78rem;border-radius:12px;border:none;background:var(--brd);color:#fff;font-family:'Baloo 2';font-size:.95rem;font-weight:700;cursor:pointer;min-height:var(--touch)}
.dlg-confirm:active{background:var(--brd-dk)}
/* comment */
.comment-ta{width:100%;padding:.75rem .9rem;border:1.5px solid #E8D8DC;border-radius:12px;font-family:'Nunito';font-size:.88rem;outline:none;resize:none;min-height:80px;transition:border-color .2s;background:#fff;color:var(--txt)}
.comment-ta:focus{border-color:var(--brd)}
.comment-save-btn{background:var(--brd);color:#fff;border:none;font-family:'Nunito';font-size:.85rem;font-weight:700;padding:.58rem 1.1rem;border-radius:10px;cursor:pointer;min-height:44px;margin-top:.5rem;transition:background .18s}
.comment-save-btn:active{background:var(--brd-dk)}
.comment-display{font-size:.85rem;color:var(--txt);background:var(--brd-lt);border-radius:10px;padding:.65rem .85rem;border-left:3px solid var(--brd);line-height:1.5;font-style:italic}

/* QR code */
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:1.25rem;background:var(--brd-lt);border-radius:14px;margin-bottom:1rem}
.qr-wrap img{border-radius:10px;border:4px solid #fff;box-shadow:0 2px 12px rgba(123,29,46,.12)}
.qr-url{font-size:.72rem;color:var(--mu);word-break:break-all;text-align:center;max-width:240px}
`;

/* ─── helpers ──────────────────────────────────────────────────────────── */
const barCol = (v,max) => v/max<.6?"#22C55E":v/max<.85?"#F59E0B":"#EF4444";
const avgRating = (actId, regs) => { const r=regs.filter(x=>x.actId===actId&&x.rating>0); return r.length?r.reduce((s,x)=>s+x.rating,0)/r.length:0; };
const fmtRating = v => v>0?("⭐".repeat(Math.round(v))+" "+v.toFixed(1)):"";
const readFile = f => new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(f);});
const CONFETTI_COLORS = ["#E8A020","#7B1D2E","#27AE60","#2980B9","#8E44AD","#FF6B6B","#fff"];

/* ─── Confetti ─────────────────────────────────────────────────────────── */
function Confetti({active}){
  const pieces = useMemo(()=>Array.from({length:40},(_,i)=>({
    id:i, left:Math.random()*100, size:6+Math.random()*6,
    dur:.8+Math.random()*1.2, delay:Math.random()*.6,
    color:CONFETTI_COLORS[i%CONFETTI_COLORS.length],
    round:Math.random()>.45,
  })),[]);
  if(!active) return null;
  return(
    <div className="cf-wrap">
      {pieces.map(p=>(
        <div key={p.id} className="cf" style={{
          left:p.left+"%", width:p.size, height:p.size,
          background:p.color, borderRadius:p.round?"50%":"2px",
          animationDuration:p.dur+"s", animationDelay:p.delay+"s",
        }}/>
      ))}
    </div>
  );
}

/* ─── Stars ─────────────────────────────────────────────────────────────── */
function Stars({value,onChange}){
  const [hov,setHov]=useState(0);
  return(
    <div>
      <div className="stars-row">
        {[1,2,3,4,5].map(n=>(
          <span key={n} className="star"
            onMouseEnter={()=>setHov(n)} onMouseLeave={()=>setHov(0)}
            onClick={()=>onChange(n)}>
            {n<=(hov||value)?"⭐":"☆"}
          </span>
        ))}
      </div>
      <div className="rating-lbl">{STAR_LABELS[hov||value]||"Touche une étoile pour noter"}</div>
    </div>
  );
}

/* ─── PhotoUpload ──────────────────────────────────────────────────────── */
function PhotoUpload({value,onChange}){
  const onFile=async e=>{const f=e.target.files?.[0];if(!f)return;onChange(await readFile(f));e.target.value="";};
  return(
    <div className="photo-zone">
      {value&&<img src={value} className="photo-preview-img" alt="preview"/>}
      <div className="photo-btns">
        <label className="pbtn"><span>📷</span>Photo<input type="file" accept="image/*" capture="environment" onChange={onFile}/></label>
        <label className="pbtn"><span>🖼️</span>Galerie<input type="file" accept="image/*" onChange={onFile}/></label>
      </div>
    </div>
  );
}

/* ─── SelfieUpload ─────────────────────────────────────────────────────── */
function SelfieUpload({value,onChange}){
  const onFile=async e=>{const f=e.target.files?.[0];if(!f)return;onChange(await readFile(f));e.target.value="";};
  return(
    <div className="selfie-zone">
      {value&&<img src={value} className="selfie-preview" alt="selfie"/>}
      <div className="selfie-btns">
        <label className="pbtn"><span>🤳</span>Selfie<input type="file" accept="image/*" capture="user" onChange={onFile}/></label>
        <label className="pbtn"><span>🖼️</span>Galerie<input type="file" accept="image/*" onChange={onFile}/></label>
        {value&&<button className="pbtn" style={{maxWidth:80}} onClick={()=>onChange("")}>✕</button>}
      </div>
    </div>
  );
}

/* ── ConfirmDialog ─────────────────────────────────────────────────────── */
function ConfirmDialog({dlg,onClose}){
  if(!dlg) return null;
  const doConfirm=async()=>{await dlg.onConfirm();onClose();};
  return(
    <div className="dlg-overlay" onClick={onClose}>
      <div className="dlg" onClick={e=>e.stopPropagation()}>
        <p>{dlg.msg}</p>
        <div className="dlg-btns">
          <button className="dlg-cancel" onClick={onClose}>Annuler</button>
          <button className="dlg-confirm" onClick={doConfirm}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ APP ═══════════════════════════════════════ */
export default function App(){
  const [page,     setPage]     = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [acts,     setActs]     = useState([]);
  const [regs,     setRegs]     = useState([]);
  const [children, setChildren] = useState([]);
  const [cfg,      setCfg]      = useState(DEF_CFG);
  const [loading,  setLoading]  = useState(true);
  const [confetti, setConfetti] = useState(false);

  // inscriptions
  const [selId,  setSelId]  = useState(null);
  const [form,   setForm]   = useState({fn:"",ln:"",gender:"",selfie:""});
  const [msg,    setMsg]    = useState(null);

  // my regs
  const [mySearch, setMySearch] = useState({fn:"",ln:""});
  const [myFound,  setMyFound]  = useState(null);
  const [myMsg,    setMyMsg]    = useState(null);

  // admin
  const [pwd,      setPwd]      = useState("");
  const [pwdErr,   setPwdErr]   = useState("");
  const [aTab,     setATab]     = useState("acts");
  const [filt,     setFilt]     = useState("all");
  const [draftCfg, setDraftCfg] = useState(null);
  const [showEmj,  setShowEmj]  = useState(false);
  const [newAct,   setNewAct]   = useState({name:"",desc:"",limitTotal:true,maxTotal:15,maxBoys:8,maxGirls:8,useQuotas:true,emoji:"⭐",color:PALETTE[0],photo:"",openDate:"",openTime:"",closeDate:"",closeTime:""});
  const [newPwd,   setNewPwd]   = useState("");
  const [pwdOk,    setPwdOk]    = useState("");
  const [newChild, setNewChild] = useState({fn:"",ln:""});
  const [bulkText, setBulkText] = useState("");
  const [bulkMsg,  setBulkMsg]  = useState("");
  const [confirmDlg, setConfirmDlg] = useState(null); // {msg, onConfirm}

  /* ── storage ─────────────────────────────────────────────────────────── */
  const loadData = async (silent=false)=>{
    let a=null,r=null,c=null,ch=null;
    try{const x=await storage.get("colo:acts");if(x)a=JSON.parse(x.value);}catch{}
    try{const x=await storage.get("colo:regs");if(x)r=JSON.parse(x.value);}catch{}
    try{const x=await storage.get("colo:cfg4");if(x)c=JSON.parse(x.value);}catch{}
    try{const x=await storage.get("colo:children");if(x)ch=JSON.parse(x.value);}catch{}
    if(!Array.isArray(a)){a=DEFAULTS;try{await storage.set("colo:acts",JSON.stringify(a),true);}catch{}}
    if(!Array.isArray(r)){r=[];try{await storage.set("colo:regs",JSON.stringify(r),true);}catch{}}
    if(!Array.isArray(ch)){ch=[];try{await storage.set("colo:children",JSON.stringify(ch),true);}catch{}}
    const cv={...DEF_CFG,...(c||{})};
    setCfg(cv); if(!silent)setDraftCfg(cv);
    setActs(a); setRegs(r); setChildren(ch); if(!silent)setLoading(false);
  };
  useEffect(()=>{loadData();const t=setInterval(()=>loadData(true),10000);return()=>clearInterval(t);},[]);

  const saveActs    = async a =>{setActs(a);    try{await storage.set("colo:acts",JSON.stringify(a),true);}catch{}};
  const saveRegs    = async r =>{setRegs(r);    try{await storage.set("colo:regs",JSON.stringify(r),true);}catch{}};
  const saveCfg     = async c =>{setCfg(c);     try{await storage.set("colo:cfg4",JSON.stringify(c),true);}catch{}};
  const saveChildren= async ch=>{setChildren(ch);try{await storage.set("colo:children",JSON.stringify(ch),true);}catch{}};

  /* ── per-activity period check ─────────────────────────────────────── */
  const actIsOpen = (act)=>{
    const now=new Date();
    if(act.openDate){
      const t=act.openTime||"00:00";
      if(now<new Date(act.openDate+"T"+t)) return false;
    }
    if(act.closeDate){
      const t=act.closeTime||"23:59";
      if(now>new Date(act.closeDate+"T"+t)) return false;
    }
    return true;
  };
  const actPeriodMsg = (act)=>{
    const now=new Date();
    if(act.openDate){
      const t=act.openTime||"00:00";
      const d=new Date(act.openDate+"T"+t);
      if(now<d) return "Inscriptions dès le "+d.toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})+" ⏳";
    }
    if(act.closeDate){
      const t=act.closeTime||"23:59";
      const d=new Date(act.closeDate+"T"+t);
      if(now>d) return "Inscriptions fermées le "+d.toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})+" 🔒";
    }
    return "";
  };
  const anyActOpen = ()=>acts.some(a=>actIsOpen(a));

  /* ── computed ────────────────────────────────────────────────────────── */
  const totalFor = id=>regs.filter(r=>r.actId===id).length;
  const boysFor  = id=>regs.filter(r=>r.actId===id&&r.gender==="boy").length;
  const girlsFor = id=>regs.filter(r=>r.actId===id&&r.gender==="girl").length;
  const status   = act=>{const tot=totalFor(act.id),b=boysFor(act.id),g=girlsFor(act.id);return{tot,b,g,totalFull:act.limitTotal&&tot>=act.maxTotal,boysFull:act.useQuotas&&b>=act.maxBoys,girlsFull:act.useQuotas&&g>=act.maxGirls};};
  const sortedActs = useMemo(()=>[...acts].sort((a,b)=>avgRating(b.id,regs)-avgRating(a.id,regs)),[acts,regs]);

  /* ── signup ──────────────────────────────────────────────────────────── */
  const handleSignup=async()=>{
    const {fn,ln,gender,selfie}=form;
    if(!fn.trim()||!ln.trim()||!gender){setMsg({t:"err",text:"Merci de remplir tous les champs."});return;}
    if(!actIsOpen(act)){setMsg({t:"warn",text:actPeriodMsg(act)||"Inscriptions fermées pour cette activité."});return;}
    const act=acts.find(a=>a.id===selId);if(!act)return;
    const nFn=fn.trim().toLowerCase(),nLn=ln.trim().toLowerCase();
    if(cfg.useWhitelist&&children.length>0){
      const allowed=children.find(c=>c.fn.toLowerCase()===nFn&&c.ln.toLowerCase()===nLn);
      if(!allowed){setMsg({t:"err",text:"❌ Ton nom n'est pas sur la liste des participants. Contacte un animateur !"});return;}
    }
    const dup=regs.find(r=>r.fn.toLowerCase()===nFn&&r.ln.toLowerCase()===nLn);
    if(dup){const ex=acts.find(a=>a.id===dup.actId);setMsg({t:"warn",text:`Tu es déjà inscrit(e) à "${ex?.name||"une activité"}". Une seule inscription !`});return;}
    const st=status(act);
    if(st.totalFull){setMsg({t:"warn",text:"Cette activité est complète !"});return;}
    if(gender==="boy"&&st.boysFull){setMsg({t:"warn",text:"Quota garçons atteint !"});return;}
    if(gender==="girl"&&st.girlsFull){setMsg({t:"warn",text:"Quota filles atteint !"});return;}
    const newRegs=[...regs,{id:`r${Date.now()}`,actId:act.id,fn:fn.trim(),ln:ln.trim(),gender,selfie,rating:0,at:new Date().toISOString()}];
    await saveRegs(newRegs);
    const nowFull=newRegs.filter(r=>r.actId===act.id).length>=act.maxTotal;
    setMsg({t:"ok",text:`🎉 Inscription confirmée dans ${act.emoji} ${act.name} !`});
    setForm({fn:"",ln:"",gender:"",selfie:""});
    if(nowFull){setConfetti(true);setTimeout(()=>setConfetti(false),3000);}
  };

  /* ── my regs ────────────────────────────────────────────────────────── */
  const handleSearch=()=>{
    const nFn=mySearch.fn.trim().toLowerCase(),nLn=mySearch.ln.trim().toLowerCase();
    if(!nFn||!nLn){setMyFound(null);setMyMsg({t:"err",text:"Entre ton prénom et ton nom."});return;}
    const found=regs.find(r=>r.fn.toLowerCase()===nFn&&r.ln.toLowerCase()===nLn);
    setMyFound(found||false);setMyMsg(found?null:{t:"warn",text:"Aucune inscription trouvée."});
  };
  const handleRate=async(id,rating)=>{
    const u=regs.map(r=>r.id===id?{...r,rating}:r);await saveRegs(u);
    setMyFound(p=>({...p,rating}));
  };
  const handleComment=async(id,comment)=>{
    const u=regs.map(r=>r.id===id?{...r,comment}:r);await saveRegs(u);
    setMyFound(p=>({...p,comment}));
    setMyMsg({t:"ok",text:"Avis enregistré ✍️"});setTimeout(()=>setMyMsg(null),2500);
  };
  const handleUnsub=async id=>{
    setConfirmDlg({msg:"Se désinscrire de cette activité ?",onConfirm:async()=>{
      await saveRegs(regs.filter(r=>r.id!==id));
      setMyFound(null);setMyMsg({t:"ok",text:"Désinscription effectuée."});setMySearch({fn:"",ln:""});
    }});
    return;
    setMyFound(null);setMyMsg({t:"ok",text:"Désinscription effectuée."});setMySearch({fn:"",ln:""});
  };

  /* ── admin ──────────────────────────────────────────────────────────── */
  const handleLogin=()=>{if(pwd===(cfg.adminPwd||DEFAULT_PWD)){setPage("admin");setPwdErr("");}else setPwdErr("Mot de passe incorrect ❌");};
  const handleAddAct=async()=>{
    if(!newAct.name.trim())return;
    const a={id:`a${Date.now()}`,name:newAct.name.trim(),desc:newAct.desc.trim(),limitTotal:newAct.limitTotal,maxTotal:+newAct.maxTotal||15,maxBoys:+newAct.maxBoys||8,maxGirls:+newAct.maxGirls||8,useQuotas:newAct.useQuotas,emoji:newAct.emoji,color:newAct.color,photo:newAct.photo,openDate:newAct.openDate,openTime:newAct.openTime,closeDate:newAct.closeDate,closeTime:newAct.closeTime};
    await saveActs([...acts,a]);setNewAct({name:"",desc:"",maxTotal:15,maxBoys:8,maxGirls:8,useQuotas:true,emoji:"⭐",color:PALETTE[0],photo:""});setShowEmj(false);
  };
  const handleDelAct=id=>{
    setConfirmDlg({msg:"Supprimer cette activité et toutes ses inscriptions ?",onConfirm:async()=>{
      await saveActs(acts.filter(a=>a.id!==id));
      await saveRegs(regs.filter(r=>r.actId!==id));
    }});
  };
  const handleDelReg=id=>{
    setConfirmDlg({msg:"Supprimer cette inscription ?",onConfirm:async()=>{
      await saveRegs(regs.filter(r=>r.id!==id));
    }});
  };
  const handleChangePwd=async()=>{
    if(newPwd.length<4){setPwdOk("❌ Minimum 4 caractères");return;}
    const nc={...cfg,adminPwd:newPwd};await saveCfg(nc);setDraftCfg(nc);setNewPwd("");setPwdOk("✅ Mot de passe changé !");setTimeout(()=>setPwdOk(""),3000);
  };
  const handleAddChild=async()=>{
    if(!newChild.fn.trim()||!newChild.ln.trim()) return;
    const c={id:`c${Date.now()}`,fn:newChild.fn.trim(),ln:newChild.ln.trim()};
    await saveChildren([...children,c]);
    setNewChild({fn:"",ln:""});
  };
  const handleDelChild=id=>{
    setConfirmDlg({msg:"Retirer cet enfant de la liste ?",onConfirm:async()=>{
      await saveChildren(children.filter(c=>c.id!==id));
    }});
  };
  const handleBulkImport=async()=>{
    const lines=bulkText.split("\n").map(l=>l.trim()).filter(Boolean);
    const added=[]; const skipped=[];
    lines.forEach(line=>{
      const parts=line.trim().split(/\s+/);
      if(parts.length<2){skipped.push(line);return;}
      const fn=parts[0],ln=parts.slice(1).join(" ");
      const exists=children.find(c=>c.fn.toLowerCase()===fn.toLowerCase()&&c.ln.toLowerCase()===ln.toLowerCase());
      if(!exists) added.push({id:`c${Date.now()}_${added.length}`,fn,ln});
      else skipped.push(line);
    });
    if(added.length>0) await saveChildren([...children,...added]);
    setBulkMsg(`✅ ${added.length} enfant${added.length>1?"s":""} ajouté${added.length>1?"s":""}${skipped.length>0?` · ${skipped.length} ignoré${skipped.length>1?"s":""} (déjà présent ou invalide)`:""}`);
    setBulkText("");
    setTimeout(()=>setBulkMsg(""),4000);
  };
  const exportCSV=()=>{
    const hdr=["Prénom","Nom","Genre","Activité","Note","Avis","Date"];
    const list=filt==="all"?regs:regs.filter(r=>r.actId===filt);
    const rows=list.map(r=>{const a=acts.find(x=>x.id===r.actId);return[r.fn,r.ln,r.gender==="boy"?"Garçon":"Fille",a?.name||"?",r.rating||"",r.comment||"",new Date(r.at).toLocaleString("fr-FR")];});
    const csv=[hdr,...rows].map(row=>row.map(c=>'"'+String(c).split('"').join('""')+'"').join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    Object.assign(document.createElement("a"),{href:URL.createObjectURL(blob),download:"inscriptions_camurce.csv"}).click();
  };

  const filtRegs=filt==="all"?regs:regs.filter(r=>r.actId===filt);
  const tBoys=regs.filter(r=>r.gender==="boy").length;
  const tGirls=regs.filter(r=>r.gender==="girl").length;
  const selAct=acts.find(a=>a.id===selId);
  const navTo=p=>{setPage(p);setMenuOpen(false);setMsg(null);setMyMsg(null);setMyFound(null);setMySearch({fn:"",ln:""});};
  const qrUrl=typeof window!=="undefined"?window.location.href:"";

  /* ── header & drawer ────────────────────────────────────────────────── */
  const Hdr=({right})=>(
    <header className="hdr">
      <div className="hdr-spacer">
        <button className={`burger${menuOpen?" open":""}`} onClick={()=>setMenuOpen(v=>!v)} aria-label="Menu">
          <span/><span/><span/>
        </button>
      </div>
      <img src={LOGO} alt="Ça Murce" className="logo-img"/>
      <div className="hdr-spacer right">{right}</div>
    </header>
  );
  const Drawer=()=>(
    <>
      <div className="menu-overlay" onClick={()=>setMenuOpen(false)}/>
      <nav className="menu-drawer">
        <div className="menu-head">
          <img src={LOGO} alt="logo" className="menu-logo"/>
          <div className="menu-sub">Moadon Espagne 2026</div>
        </div>
        <div className="menu-items">
          {[["home","🏠","Accueil","Page principale"],["inscriptions","📝","Inscriptions","Choisir une activité"],["myregs","⭐","Mes inscriptions","Voir, noter, se désinscrire"]].map(([p,ico,lbl,sub])=>(
            <button key={p} className={`menu-item${page===p?" active":""}`} onClick={()=>navTo(p)}>
              <span className="menu-item-ico">{ico}</span>
              <div className="menu-item-txt">{lbl}<div className="menu-item-sub">{sub}</div></div>
            </button>
          ))}
          <div className="menu-sep"/>
          <button className="menu-admin" onClick={()=>navTo(page==="admin"?"admin":"adminLogin")}>
            <span style={{fontSize:"1.1rem"}}>⚙️</span> Espace admin
          </button>
        </div>
      </nav>
    </>
  );

  if(loading) return <div className="loader"><style>{CSS}</style><div style={{fontSize:"2.5rem",marginBottom:".75rem"}}>👑</div>Chargement…</div>;

  /* ════════════════════════ HOME ══════════════════════════════════════ */
  if(page==="home") return(
    <div>
      <style>{CSS}</style>
      <Confetti active={confetti}/>
      <ConfirmDialog dlg={confirmDlg} onClose={()=>setConfirmDlg(null)}/>
      <Hdr/>
      {menuOpen&&<Drawer/>}
      <div className="home">
        <div className="home-hero">
          <img src={LOGO} alt="Ça Murce" className="home-hero-logo"/>
          <div className="home-hero-tagline">Moadon Espagne 2026</div>
          <div className="home-cta-row">
            <button className="cta-btn primary" onClick={()=>navTo("inscriptions")}>📝 S'inscrire</button>
            <button className="cta-btn secondary" onClick={()=>navTo("myregs")}>⭐ Mes inscriptions</button>
          </div>
        </div>
        <div className="home-wave">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{height:48}}>
            <path d="M0,48 L0,20 Q360,0 720,24 Q1080,48 1440,16 L1440,48 Z" fill="#FDF5F7"/>
          </svg>
        </div>
        <div className="home-body">
          {cfg.message&&(
            <div className="home-section">
              <div className="msg-banner">📣 <span>{cfg.message}</span></div>
            </div>
          )}
          {acts.length>0&&!anyActOpen()&&(
            <div className="home-section">
              <div className="closed-banner">
                <div className="ico">🔒</div>
                <h3>Inscriptions fermées</h3>
                <p>Toutes les activités sont actuellement fermées aux inscriptions.</p>
              </div>
            </div>
          )}
          <div className="home-section">
            <div className="stat-grid">
              <div className="stat-card"><div className="stat-val">{acts.length}</div><div className="stat-lbl">Activités</div></div>
              <div className="stat-card"><div className="stat-val">{regs.length}</div><div className="stat-lbl">Inscrits</div></div>
              <div className="stat-card"><div className="stat-val">{acts.reduce((s,a)=>s+Math.max(0,a.maxTotal-totalFor(a.id)),0)}</div><div className="stat-lbl">Places libres</div></div>
            </div>
          </div>
          {acts.length>0&&(
            <div className="home-section">
              <div className="home-section-title">🎯 Les activités {sortedActs.some(a=>avgRating(a.id,regs)>0)&&<span style={{fontSize:".75rem",color:"var(--mu)",fontWeight:600}}>· classées par note</span>}</div>
              <div className="act-preview-grid">
                {sortedActs.map((act,idx)=>{
                  const st=status(act);const pct=Math.min(st.tot/act.maxTotal*100,100);const avg=avgRating(act.id,regs);
                  return(
                    <div key={act.id} className="act-preview" onClick={()=>{navTo("inscriptions");setTimeout(()=>{setSelId(act.id);},80);}}>
                      {act.photo?<img src={act.photo} alt={act.name} className="act-preview-img" onError={e=>e.target.style.display="none"}/>
                        :<div className="act-preview-banner" style={{background:act.color+"22"}}>{act.emoji}</div>}
                      <div className="act-preview-body">
                        <div className="act-preview-name">{act.emoji} {act.name}</div>
                        <div className="act-preview-bar"><div className="act-preview-fill" style={{width:pct+"%",background:barCol(st.tot,act.maxTotal)}}/></div>
                        <div className="act-preview-meta">
                          <span className="act-preview-spots" style={{color:barCol(st.tot,act.maxTotal)}}>
                            {st.totalFull?"Complet 🔴":`${act.maxTotal-st.tot} place${act.maxTotal-st.tot>1?"s":""} dispo`}
                          </span>
                          {avg>0&&<span className="act-preview-rating">{"⭐".repeat(Math.round(avg))} {avg.toFixed(1)}</span>}
                          {idx===0&&avg>0&&<span className="rank-badge">🏆 Top</span>}
                        </div>
                      </div>
                      <div className="act-preview-arrow">›</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ════════════════════════ INSCRIPTIONS ══════════════════════════════ */
  if(page==="inscriptions") return(
    <div>
      <style>{CSS}</style>
      <Confetti active={confetti}/>
      <ConfirmDialog dlg={confirmDlg} onClose={()=>setConfirmDlg(null)}/>
      <Hdr/>
      {menuOpen&&<Drawer/>}
      <main className="main">
        <div className="page-title">📝 Inscriptions</div>

        <div className="divider"/>
        {acts.length===0?<div className="es"><div className="es-ico">🏕️</div><p>Aucune activité disponible.</p></div>
          :<div className="grid">
            {acts.map(act=>{
              const st=status(act);const pct=Math.min(st.tot/act.maxTotal*100,100);const isSel=selId===act.id;const places=act.maxTotal-st.tot;
              return(
                <div key={act.id} className={`card${isSel?" sel":""}${st.totalFull?" unavail":""}`}
                  onClick={()=>{if(st.totalFull||!actIsOpen(act))return;setSelId(isSel?null:act.id);setMsg(null);setForm({fn:"",ln:"",gender:"",selfie:""});}}>
                  {act.photo?<img src={act.photo} alt={act.name} className="card-photo" onError={e=>e.target.style.display="none"}/>
                    :<div className="card-banner" style={{background:act.color+"22"}}>{act.emoji}</div>}
                  <div className="card-body">
                    <div className="card-name">{act.emoji} {act.name}</div>
                    <div className="card-desc">{act.desc}</div>
                    <div className="cap-bar-bg"><div className="cap-bar" style={{width:pct+"%",background:barCol(st.tot,act.maxTotal)}}/></div>
                    <div className="cap-row">
                      <span className="cap-txt" style={{color:barCol(st.tot,act.maxTotal)}}>{st.tot} / {act.maxTotal}</span>
                      {st.totalFull&&<span className="tag tag-full">Complet</span>}
                      {!st.totalFull&&places<=5&&<span className="tag tag-few">⚡ {places} place{places>1?"s":""}</span>}
                      {isSel&&!st.totalFull&&actIsOpen(act)&&<span className="tag tag-sel">✓ Choisi</span>}
                      {!actIsOpen(act)&&actPeriodMsg(act)&&<span className="tag" style={{background:"#F0F0F0",color:"#888",fontSize:".65rem"}}>{actPeriodMsg(act)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>}
      </main>
      {selAct&&actIsOpen(selAct)&&(
        <>
          <div className="sheet-overlay" onClick={()=>{setSelId(null);setMsg(null);}}/>
          <div className="sheet">
            <div className="sheet-drag"/>
            <div className="sheet-hdr">
              <div className="sheet-ico" style={{background:selAct.color+"22"}}>{selAct.emoji}</div>
              <div><div className="sheet-nm">S'inscrire — {selAct.name}</div><div className="sheet-sub">{selAct.maxTotal-totalFor(selAct.id)} place{selAct.maxTotal-totalFor(selAct.id)>1?"s":""} dispo</div></div>
              <button className="sheet-close" onClick={()=>{setSelId(null);setMsg(null);}}>✕</button>
            </div>
            <div className="sheet-body">
              <div className="fr">
                <div className="fg"><label className="flbl">Prénom *</label><input className="finp" type="text" placeholder="Lucas" autoCapitalize="words" value={form.fn} onChange={e=>setForm(f=>({...f,fn:e.target.value}))}/></div>
                <div className="fg"><label className="flbl">Nom *</label><input className="finp" type="text" placeholder="Cohen" autoCapitalize="words" value={form.ln} onChange={e=>setForm(f=>({...f,ln:e.target.value}))}/></div>
              </div>
              <label className="flbl" style={{marginBottom:".5rem"}}>Je suis… *</label>
              <div className="gender-row">
                <button className={`gbtn boy${form.gender==="boy"?" sel":""}`} onClick={()=>setForm(f=>({...f,gender:"boy"}))}><span className="gbtn-ico">👦</span>Garçon</button>
                <button className={`gbtn girl${form.gender==="girl"?" sel":""}`} onClick={()=>setForm(f=>({...f,gender:"girl"}))}><span className="gbtn-ico">👧</span>Fille</button>
              </div>
              <label className="flbl" style={{marginBottom:".4rem"}}>📸 Selfie <span style={{color:"var(--mu)",fontWeight:600}}>(optionnel)</span></label>
              <SelfieUpload value={form.selfie} onChange={v=>setForm(f=>({...f,selfie:v}))}/>
              <button className="sbtn" onClick={handleSignup}>Je m'inscris ! 🚀</button>
              {msg&&<div className={`msg ${msg.t}`}>{msg.text}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );

  /* ════════════════════════ MES INSCRIPTIONS ══════════════════════════ */
  if(page==="myregs") return(
    <div>
      <style>{CSS}</style>
      <ConfirmDialog dlg={confirmDlg} onClose={()=>setConfirmDlg(null)}/>
      <Hdr/>
      {menuOpen&&<Drawer/>}
      <div className="my-wrap">
        <div className="page-title">⭐ Mes inscriptions</div>
        <div className="divider"/>
        <div className="search-box">
          <h3>🔍 Retrouve ton inscription</h3>
          <div className="fr" style={{marginBottom:".75rem"}}>
            <div className="fg"><label className="flbl">Prénom</label><input className="finp" type="text" placeholder="Lucas" autoCapitalize="words" value={mySearch.fn} onChange={e=>setMySearch(s=>({...s,fn:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/></div>
            <div className="fg"><label className="flbl">Nom</label><input className="finp" type="text" placeholder="Cohen" autoCapitalize="words" value={mySearch.ln} onChange={e=>setMySearch(s=>({...s,ln:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleSearch()}/></div>
          </div>
          <button className="sbtn" onClick={handleSearch}>Rechercher</button>
          {myMsg&&!myFound&&<div className={`msg ${myMsg.t}`}>{myMsg.text}</div>}
        </div>
        {myFound&&(()=>{
          const act=acts.find(a=>a.id===myFound.actId);
          return(
            <div className="my-reg-card">
              <div className="my-reg-top">
                <div className="my-reg-ico" style={{background:act?.color+"22"}}>
                  {act?.photo?<img src={act.photo} alt={act.name}/>:act?.emoji||"🎯"}
                </div>
                <div style={{flex:1}}>
                  <div className="my-reg-nm">{act?.emoji} {act?.name||"Activité"}</div>
                  <div className="my-reg-who">{myFound.gender==="boy"?"👦":"👧"} {myFound.fn} {myFound.ln} · {new Date(myFound.at).toLocaleDateString("fr-FR")}</div>
                </div>
                {myFound.selfie&&<img src={myFound.selfie} className="my-selfie" alt="selfie"/>}
              </div>
              <div className="my-reg-section">
                <div className="my-reg-section-title">Ta note pour cette activité</div>
                <Stars value={myFound.rating||0} onChange={r=>handleRate(myFound.id,r)}/>
              </div>
              <div className="my-reg-section">
                <div className="my-reg-section-title">Ton avis ✍️ <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(optionnel)</span></div>
                {myFound.comment&&!myFound._editComment
                  ?<div>
                      <div className="comment-display">"{myFound.comment}"</div>
                      <button className="comment-save-btn" style={{background:"var(--brd-lt)",color:"var(--brd)",marginTop:".5rem"}}
                        onClick={()=>setMyFound(p=>({...p,_editComment:true}))}>Modifier l'avis</button>
                    </div>
                  :<div>
                      <textarea className="comment-ta" placeholder="Comment s'est passée cette activité ? Dis-nous tout 😄"
                        value={myFound._draftComment!==undefined?myFound._draftComment:(myFound.comment||"")}
                        onChange={e=>setMyFound(p=>({...p,_draftComment:e.target.value}))}
                        rows={3}/>
                      <button className="comment-save-btn"
                        onClick={()=>handleComment(myFound.id, myFound._draftComment!==undefined?myFound._draftComment:(myFound.comment||""))}>
                        Enregistrer l'avis
                      </button>
                    </div>}
                {myMsg?.t==="ok"&&<div className="msg ok" style={{marginTop:".65rem"}}>{myMsg.text}</div>}
              </div>
              <div className="my-reg-section">
                <button className="unsub-btn" onClick={()=>handleUnsub(myFound.id)}>🚪 Se désinscrire de {act?.name||"cette activité"}</button>
              </div>
            </div>
          );
        })()}
        {myFound===false&&(
          <div className="no-reg-box">
            <div style={{fontSize:"3rem",marginBottom:".75rem"}}>🤷</div>
            <p style={{fontWeight:700,marginBottom:".5rem"}}>Aucune inscription trouvée</p>
            <p style={{fontSize:".88rem"}}>Vérifie l'orthographe ou inscris-toi d'abord !</p>
            <button className="sbtn" style={{marginTop:"1.25rem",maxWidth:280}} onClick={()=>navTo("inscriptions")}>→ S'inscrire</button>
          </div>
        )}
      </div>
    </div>
  );

  /* ════════════════════════ ADMIN LOGIN ════════════════════════════════ */
  if(page==="adminLogin") return(
    <div>
      <style>{CSS}</style>
      <Hdr right={<button className="hdr-btn" onClick={()=>navTo("home")}>← Retour</button>}/>
      {menuOpen&&<Drawer/>}
      <main className="main">
        <div className="lw">
          <div style={{fontSize:"3rem",marginBottom:".55rem"}}>🔐</div>
          <h2>Espace Admin</h2><p>Mot de passe requis</p>
          <input className="linp" type="password" placeholder="Mot de passe" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()}/>
          <button className="sbtn" onClick={handleLogin}>Connexion</button>
          {pwdErr&&<div className="msg err" style={{marginTop:".85rem"}}>{pwdErr}</div>}
        </div>
      </main>
    </div>
  );

  /* ════════════════════════ ADMIN ════════════════════════════════════ */
  return(
    <div>
      <style>{CSS}</style>
      <Confetti active={confetti}/>
      <ConfirmDialog dlg={confirmDlg} onClose={()=>setConfirmDlg(null)}/>
      <Hdr right={<button className="hdr-btn" onClick={()=>navTo("home")}>← Retour</button>}/>
      {menuOpen&&<Drawer/>}
      <div className="aw">
        <div className="a-hdr">
          <div className="a-title">Tableau de bord</div>
          <div className="chips">
            <span className="chip">🎯 {acts.length}</span>
            <span className="chip gold">📋 {regs.length}</span>
            <span className="chip b">♂ {tBoys}</span>
            <span className="chip g">♀ {tGirls}</span>
          </div>
        </div>

        {/* Settings */}
        <div className="sbar">
          <div className="sbar-row">
            <div className="sbar-g"><span className="sbar-lbl">🏕️ Nom affiché</span><input className="sinp" value={draftCfg?.campName||""} onChange={e=>setDraftCfg(d=>({...d,campName:e.target.value}))}/></div>
            <div className="sbar-g"><span className="sbar-lbl">💬 Sous-titre</span><input className="sinp" value={draftCfg?.subtitle||""} onChange={e=>setDraftCfg(d=>({...d,subtitle:e.target.value}))}/></div>
          </div>
          <div className="sbar-g"><span className="sbar-lbl">📣 Message d'annonce (affiché sur l'accueil)</span><textarea className="sinp-ta" placeholder="Ex : Ce soir c'est soirée pizza ! 🍕" value={draftCfg?.message||""} onChange={e=>setDraftCfg(d=>({...d,message:e.target.value}))}/></div>

          <div className="sbar-row">
            <div className="sbar-g"><span className="sbar-lbl">🔑 Changer le mot de passe admin</span>
              <div style={{display:"flex",gap:".5rem"}}>
                <input className="sinp" type="password" placeholder="Nouveau mot de passe" value={newPwd} onChange={e=>setNewPwd(e.target.value)} style={{flex:1}}/>
                <button className="save-btn" onClick={handleChangePwd}>Changer</button>
              </div>
              {pwdOk&&<div style={{fontSize:".8rem",marginTop:".3rem",fontWeight:700,color:pwdOk.includes("✅")?"#166534":"#9B1C1C"}}>{pwdOk}</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:".65rem",flexWrap:"wrap",alignItems:"center"}}>
            <button className="save-btn" onClick={()=>saveCfg(draftCfg)}>💾 Sauvegarder les paramètres</button>
            {draftCfg?.message!==cfg.message||draftCfg?.campName!==cfg.campName?<span style={{fontSize:".78rem",color:"var(--mu)"}}>⚠️ Modifications non sauvegardées</span>:null}
          </div>
        </div>

        <div className="tabs">
          <button className={`tab${aTab==="acts"?" on":""}`} onClick={()=>setATab("acts")}>🎯 Activités</button>
          <button className={`tab${aTab==="regs"?" on":""}`} onClick={()=>setATab("regs")}>📋 Inscriptions</button>
          <button className={`tab${aTab==="summary"?" on":""}`} onClick={()=>setATab("summary")}>📄 Listes</button>
          <button className={`tab${aTab==="children"?" on":""}`} onClick={()=>setATab("children")}>👥 Participants</button>
          <button className={`tab${aTab==="qr"?" on":""}`} onClick={()=>setATab("qr")}>📲 QR Code</button>
        </div>

        {/* ── ACTIVITÉS ── */}
        {aTab==="acts"&&(
          <div>
            <div className="af">
              <h3>+ Nouvelle activité</h3>
              <div className="fg2">
                <div className="fl"><label>Nom *</label><input type="text" placeholder="ex : Escalade" value={newAct.name} onChange={e=>setNewAct(a=>({...a,name:e.target.value}))}/></div>
                <div className="fl"><label>Photo</label><PhotoUpload value={newAct.photo} onChange={v=>setNewAct(a=>({...a,photo:v}))}/></div>
              </div>
              <div style={{marginTop:".75rem"}}><div className="fl"><label>Description</label><input type="text" placeholder="Décris l'activité" value={newAct.desc} onChange={e=>setNewAct(a=>({...a,desc:e.target.value}))}/></div></div>
              <div className="toggle-row" style={{marginTop:".7rem"}}>
                <label className="toggle"><input type="checkbox" checked={!!newAct.limitTotal} onChange={e=>setNewAct(a=>({...a,limitTotal:e.target.checked}))}/><span className="tslider"/></label>
                <span className="toggle-lbl">Limiter le nombre total d'inscrits</span>
              </div>
              <div className="toggle-row">
                <label className="toggle"><input type="checkbox" checked={newAct.useQuotas} onChange={e=>setNewAct(a=>({...a,useQuotas:e.target.checked}))}/><span className="tslider"/></label>
                <span className="toggle-lbl">Quotas garçons / filles séparés</span>
              </div>
              {(newAct.limitTotal||newAct.useQuotas)&&(
                <div className="fg3" style={{marginBottom:".75rem"}}>
                  {newAct.limitTotal&&<div className="fl"><label>Max inscrits (total)</label><input type="number" min="1" max="200" value={newAct.maxTotal} onChange={e=>setNewAct(a=>({...a,maxTotal:e.target.value}))}/></div>}
                  {newAct.useQuotas&&<div className="fl"><label>Max garçons ♂</label><input type="number" min="0" max="200" value={newAct.maxBoys} onChange={e=>setNewAct(a=>({...a,maxBoys:e.target.value}))}/></div>}
                  {newAct.useQuotas&&<div className="fl"><label>Max filles ♀</label><input type="number" min="0" max="200" value={newAct.maxGirls} onChange={e=>setNewAct(a=>({...a,maxGirls:e.target.value}))}/></div>}
                </div>
              )}
              <div className="fg2" style={{marginTop:".75rem"}}>
                <div className="fl"><label>📅 Ouverture des inscriptions <span style={{color:"var(--mu)",fontWeight:400}}>(optionnel)</span></label>
                  <div style={{display:"flex",gap:".4rem"}}>
                    <input type="date" style={{flex:2}} value={newAct.openDate} onChange={e=>setNewAct(a=>({...a,openDate:e.target.value}))}/>
                    <input type="time" style={{flex:1}} value={newAct.openTime} onChange={e=>setNewAct(a=>({...a,openTime:e.target.value}))}/>
                  </div>
                </div>
                <div className="fl"><label>🔒 Fermeture des inscriptions <span style={{color:"var(--mu)",fontWeight:400}}>(optionnel)</span></label>
                  <div style={{display:"flex",gap:".4rem"}}>
                    <input type="date" style={{flex:2}} value={newAct.closeDate} onChange={e=>setNewAct(a=>({...a,closeDate:e.target.value}))}/>
                    <input type="time" style={{flex:1}} value={newAct.closeTime} onChange={e=>setNewAct(a=>({...a,closeTime:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <div className="fg2" style={{marginTop:".75rem"}}>
                <div className="fl"><label>Emoji</label>
                  <div style={{display:"flex",alignItems:"center",gap:".6rem",marginTop:".3rem"}}>
                    <span style={{fontSize:"1.8rem",cursor:"pointer",background:"var(--brd-lt)",borderRadius:10,padding:".3rem .5rem",border:"1.5px solid var(--bor)"}} onClick={()=>setShowEmj(v=>!v)}>{newAct.emoji}</span>
                    {showEmj&&<div className="emj-grid">{EMOJIS.map(e=><span key={e} className={`emj-opt${newAct.emoji===e?" on":""}`} onClick={()=>{setNewAct(a=>({...a,emoji:e}));setShowEmj(false);}}>{e}</span>)}</div>}
                  </div>
                </div>
                <div className="fl"><label>Couleur</label><div className="col-grid">{PALETTE.map(c=><div key={c} className={`cdot${newAct.color===c?" on":""}`} style={{background:c}} onClick={()=>setNewAct(a=>({...a,color:c}))}/>)}</div></div>
              </div>
              <button className="add-btn" onClick={handleAddAct} disabled={!newAct.name.trim()}>Créer l'activité</button>
            </div>
            <div style={{fontFamily:"'Baloo 2'",fontWeight:700,fontSize:".95rem",color:"var(--brd)",marginBottom:".75rem"}}>Activités ({acts.length})</div>
            {acts.length===0?<div className="es"><div className="es-ico">🎯</div><p>Aucune activité</p></div>
              :acts.map(act=>{const st=status(act);const avg=avgRating(act.id,regs);return(
                <div key={act.id} className="ar">
                  <div className="ar-ico" style={{background:act.color+"22"}}>{act.photo?<img src={act.photo} alt={act.name}/>:act.emoji}</div>
                  <div className="ar-inf">
                    <div className="ar-nm">{act.name} {avg>0&&<span style={{fontSize:".75rem",color:"var(--gold)"}}> ⭐{avg.toFixed(1)}</span>}</div>
                    <div className="ar-dc">{act.desc||"—"}</div>
                    <div className="ar-counts">
                      {act.limitTotal&&act.useQuotas&&<><span className="gc b">♂ {st.b}/{act.maxBoys}</span><span className="gc g">♀ {st.g}/{act.maxGirls}</span><span className="gc t">{st.tot}/{act.maxTotal}</span></>}
                      {act.limitTotal&&!act.useQuotas&&<><span className="gc t">{st.tot}/{act.maxTotal}</span></>}
                      {!act.limitTotal&&act.useQuotas&&<><span className="gc b">♂ {st.b}/{act.maxBoys}</span><span className="gc g">♀ {st.g}/{act.maxGirls}</span><span className="gc nq">∞ total</span></>}
                      {!act.limitTotal&&!act.useQuotas&&<span className="gc nq">∞ sans quota</span>}
                      {actPeriodMsg(act)&&<span className="gc" style={{background:"#FFF8EC",color:"#92400E",fontSize:".68rem"}}>{actPeriodMsg(act)}</span>}
                    </div>
                  </div>
                  <button className="del-btn" onClick={()=>handleDelAct(act.id)}>✕</button>
                </div>
              );})}
          </div>
        )}

        {/* ── INSCRIPTIONS ── */}
        {aTab==="regs"&&(
          <div>
            <div className="tbar">
              <select value={filt} onChange={e=>setFilt(e.target.value)}>
                <option value="all">Toutes ({regs.length})</option>
                {acts.map(a=><option key={a.id} value={a.id}>{a.emoji} {a.name} ({totalFor(a.id)})</option>)}
              </select>
              <button className="exp-btn" onClick={exportCSV}>⬇ CSV</button>
            </div>
            {filtRegs.length===0?<div className="es"><div className="es-ico">📋</div><p>Aucune inscription</p></div>
              :<div className="tw"><table className="rt">
                <thead><tr><th></th><th>#</th><th>Prénom</th><th>Nom</th><th>Genre</th><th>Activité</th><th>Note</th><th>Avis</th><th>Date</th><th/></tr></thead>
                <tbody>
                  {filtRegs.map((r,i)=>{const act=acts.find(a=>a.id===r.actId);return(
                    <tr key={r.id}>
                      <td>{r.selfie&&<img src={r.selfie} className="reg-selfie" alt="selfie"/>}</td>
                      <td style={{color:"#C8A0A8",fontSize:".72rem"}}>{i+1}</td>
                      <td style={{fontWeight:700}}>{r.fn}</td><td>{r.ln}</td>
                      <td>{r.gender==="boy"?<span className="gc b">♂</span>:<span className="gc g">♀</span>}</td>
                      <td>{act?<span className="apill" style={{background:act.color+"18",color:act.color}}>{act.emoji} {act.name}</span>:"—"}</td>
                      <td>{r.rating?("⭐".repeat(r.rating)):"-"}</td>
                      <td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",color:r.comment?"var(--txt)":"#ccc",fontSize:".78rem",fontStyle:r.comment?"italic":"normal"}}>{r.comment||"—"}</td>
                      <td style={{color:"var(--mu)",fontSize:".72rem"}}>{new Date(r.at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</td>
                      <td><button className="del-btn" style={{minHeight:36,padding:".18rem .5rem"}} onClick={()=>handleDelReg(r.id)}>✕</button></td>
                    </tr>
                  );})}
                </tbody>
              </table></div>}
          </div>
        )}

        {/* ── LISTES NOMINATIVES ── */}
        {aTab==="summary"&&(
          <div>
            <div className="tbar">
              <button className="print-btn" onClick={()=>window.print()}>🖨️ Imprimer</button>
              <span style={{fontSize:".78rem",color:"var(--mu)"}}>Liste nominative par activité</span>
            </div>
            {acts.length===0?<div className="es"><div className="es-ico">📄</div><p>Aucune activité</p></div>
              :acts.map(act=>{
                const actRegs=regs.filter(r=>r.actId===act.id);
                const st=status(act);
                return(
                  <div key={act.id} className="sum-act">
                    <div className="sum-act-hdr">
                      <div className="sum-act-ico" style={{background:act.color+"22"}}>{act.photo?<img src={act.photo} alt={act.name}/>:act.emoji}</div>
                      <div className="sum-act-nm">{act.emoji} {act.name}</div>
                      <div className="sum-act-counts">♂{st.b} ♀{st.g} · {st.tot}/{act.maxTotal}</div>
                    </div>
                    {actRegs.length===0?<div style={{padding:".75rem 1rem",fontSize:".85rem",color:"var(--mu)"}}>Aucun inscrit</div>
                      :actRegs.map((r,i)=>(
                        <div key={r.id} className="sum-row">
                          {r.selfie?<img src={r.selfie} className="sum-selfie" alt="selfie"/>
                            :<div className="sum-avatar" style={{background:r.gender==="boy"?"#EAF4FD":"#FDECEA",fontSize:"1.1rem"}}>{r.gender==="boy"?"👦":"👧"}</div>}
                          <div className="sum-name">{i+1}. {r.fn} {r.ln}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div className="sum-meta">
                              <span className={`gc ${r.gender==="boy"?"b":"g"}`}>{r.gender==="boy"?"♂":"♀"}</span>
                              {r.rating>0&&<span style={{fontSize:".75rem",color:"var(--gold)"}}>{"⭐".repeat(r.rating)}</span>}
                            </div>
                            {r.comment&&<div style={{fontSize:".72rem",color:"var(--mu)",fontStyle:"italic",marginTop:".15rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{r.comment}"</div>}
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
          </div>
        )}

        {/* ── PARTICIPANTS ── */}
        {aTab==="children"&&(
          <div>
            {/* Whitelist toggle */}
            <div className="wl-toggle-row">
              <div style={{flex:1}}>
                <div className="wl-toggle-lbl">
                  🔒 Restreindre aux inscrits officiels
                  {cfg.useWhitelist&&children.length>0&&<span className="children-count">{children.length}</span>}
                </div>
                <div className="wl-toggle-sub">
                  {cfg.useWhitelist
                    ?children.length===0?"⚠️ Liste vide — tout le monde peut s'inscrire pour l'instant":`Seuls les ${children.length} enfant${children.length>1?"s":""} de la liste peuvent s'inscrire`
                    :"Désactivé — tout le monde peut s'inscrire"}
                </div>
              </div>
              <label className="toggle" style={{flexShrink:0}}>
                <input type="checkbox" checked={!!cfg.useWhitelist} onChange={async e=>{const nc={...cfg,useWhitelist:e.target.checked};await saveCfg(nc);setDraftCfg(nc);}}/>
                <span className="tslider"/>
              </label>
            </div>

            {/* Add one child */}
            <div className="af" style={{marginBottom:".85rem"}}>
              <h3>+ Ajouter un enfant</h3>
              <div className="fr" style={{marginBottom:".75rem"}}>
                <div className="fg"><label className="flbl">Prénom *</label>
                  <input className="finp" type="text" placeholder="Lucas" autoCapitalize="words" value={newChild.fn}
                    onChange={e=>setNewChild(c=>({...c,fn:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&handleAddChild()}/></div>
                <div className="fg"><label className="flbl">Nom *</label>
                  <input className="finp" type="text" placeholder="Cohen" autoCapitalize="words" value={newChild.ln}
                    onChange={e=>setNewChild(c=>({...c,ln:e.target.value}))}
                    onKeyDown={e=>e.key==="Enter"&&handleAddChild()}/></div>
              </div>
              <button className="add-btn" style={{marginTop:0}} onClick={handleAddChild} disabled={!newChild.fn.trim()||!newChild.ln.trim()}>
                Ajouter à la liste
              </button>
            </div>

            {/* Bulk import */}
            <div className="af" style={{marginBottom:"1.25rem"}}>
              <h3>📋 Import en masse</h3>
              <p style={{fontSize:".8rem",color:"var(--mu)",marginBottom:".6rem"}}>
                Colle une liste : un enfant par ligne, prénom puis nom séparés par un espace.<br/>
                <span style={{fontFamily:"monospace",background:"#F5F0EB",padding:".1rem .3rem",borderRadius:4}}>Lucas Cohen</span>
              </p>
              <textarea className="bulk-ta" placeholder={"Lucas Cohen\nEmma Lévy\nNoam Berger\n..."} value={bulkText}
                onChange={e=>setBulkText(e.target.value)}/>
              {bulkMsg&&<div className="msg ok" style={{marginTop:".5rem",marginBottom:".25rem"}}>{bulkMsg}</div>}
              <button className="add-btn" style={{marginTop:".65rem"}} onClick={handleBulkImport} disabled={!bulkText.trim()}>
                Importer {bulkText.trim().split("\n").filter(Boolean).length} enfant{bulkText.trim().split("\n").filter(Boolean).length>1?"s":""}
              </button>
            </div>

            {/* List */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".75rem",flexWrap:"wrap",gap:".5rem"}}>
              <span style={{fontFamily:"'Baloo 2'",fontWeight:700,fontSize:".95rem",color:"var(--brd)"}}>
                Liste des participants ({children.length})
              </span>
              {children.length>0&&(
                <button className="del-btn" style={{fontSize:".75rem"}}
                  onClick={()=>setConfirmDlg({msg:`Vider toute la liste (${children.length} enfants) ?`,onConfirm:async()=>saveChildren([])})}>
                  🗑️ Tout vider
                </button>
              )}
            </div>
            {children.length===0
              ?<div className="es"><div className="es-ico">👥</div><p>Aucun enfant dans la liste</p></div>
              :<div className="tw">
                {[...children].sort((a,b)=>a.ln.localeCompare(b.ln)).map((c,i)=>{
                  const reg=regs.find(r=>r.fn.toLowerCase()===c.fn.toLowerCase()&&r.ln.toLowerCase()===c.ln.toLowerCase());
                  const act=reg?acts.find(a=>a.id===reg.actId):null;
                  return(
                    <div key={c.id} className="child-row">
                      <div className="child-avatar">{c.fn[0]}{c.ln[0]}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="child-name">{c.fn} {c.ln}</div>
                        {act
                          ?<div className="child-meta"><span className="apill" style={{background:act.color+"18",color:act.color}}>{act.emoji} {act.name}</span></div>
                          :<div className="child-meta" style={{color:"#CCC"}}>Pas encore inscrit</div>}
                      </div>
                      <button className="child-del" onClick={()=>handleDelChild(c.id)}>✕</button>
                    </div>
                  );
                })}
              </div>}
          </div>
        )}

        {/* ── QR CODE ── */}
        {aTab==="qr"&&(
          <div>
            <div className="qr-wrap">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=7B1D2E&bgcolor=FFF8EC&data=${encodeURIComponent(qrUrl)}`} alt="QR Code" width="220" height="220"/>
              <div className="qr-url">{qrUrl}</div>
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&color=7B1D2E&bgcolor=FFF8EC&data=${encodeURIComponent(qrUrl)}`} download="qrcode_camurce.png" style={{background:"var(--brd)",color:"#fff",border:"none",fontFamily:"'Nunito'",fontSize:".85rem",fontWeight:700,padding:".55rem 1.1rem",borderRadius:10,cursor:"pointer",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:".4rem",minHeight:44}}>
                ⬇ Télécharger le QR Code
              </a>
            </div>
            <p style={{fontSize:".82rem",color:"var(--mu)",textAlign:"center",padding:"0 1rem"}}>Imprime ce QR Code et affiche-le au moadon — les enfants le scannent et arrivent directement sur le site.</p>
          </div>
        )}
      </div>
    </div>
  );
}
