import { useContext, useState } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL, avgRating, PALETTE, EMOJIS } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";
import Confetti from "../components/Confetti";
import ConfirmDialog from "../components/ConfirmDialog";
import PhotoUpload from "../components/PhotoUpload";
import { db, uploadFileToStorage } from "../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

export default function AdminPage() {
  const [showPrevWinner, setShowPrevWinner] = useState(true);
  const [showWinnersHistory, setShowWinnersHistory] = useState(false);
  const [mp3Uploading, setMp3Uploading] = useState(false);
  const [mp3Msg, setMp3Msg] = useState("");

  const {
    acts, regs, children, cfg, confetti, confirmDlg, setConfirmDlg,
    aTab, setATab, filt, setFilt, draftCfg, setDraftCfg,
    showEmj, setShowEmj, newAct, setNewAct, newPwd, setNewPwd, pwdOk,
    addActMsg,
    newChild, setNewChild, bulkText, setBulkText, bulkMsg,
    staff, saveStaff, newStaff, setNewStaff, staffBulkText, setStaffBulkText, staffBulkMsg,
    handleAddStaff, handleDelStaff, handleBulkImportStaff, onlineUsers,
    allPins, setAllPins, navTo,
    tBoys, tGirls, filtRegs, qrUrl, status, totalFor,
    actPeriodMsg, avgRating: avgRatingCtx,
    saveCfg, saveChildren,
    handleBanUser, handleAddAct, handleArchiveAct, handleDelAct, handleDelReg, handleChangePwd,
    handleAddChild, handleDelChild, handleBulkImport, exportCSV,
    handleToggleActClosed, loadPins,
    challenges, challSubs, newChall, setNewChall,
    handleAddChallenge, handleDeleteChallenge, handleToggleChallengeActive, handleSetWinner,
  } = useContext(AppContext);

  return (
    <div style={{ position:"relative",minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <Confetti active={confetti}/>
      <ConfirmDialog dlg={confirmDlg} onClose={() => setConfirmDlg(null)}/>
      <Hdr right={<button className="hdr-btn" onClick={() => navTo("home")}>← Retour</button>}/>
      <Drawer/>
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
          <div className="sbar-g"><span className="sbar-lbl">📣 Message d'annonce</span><textarea className="sinp-ta" placeholder="Ex : Ce soir c'est soirée pizza ! 🍕" value={draftCfg?.message||""} onChange={e=>setDraftCfg(d=>({...d,message:e.target.value}))}/></div>
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
            {(draftCfg?.message!==cfg.message||draftCfg?.campName!==cfg.campName)&&<span style={{fontSize:".78rem",color:"var(--mu)"}}>⚠️ Modifications non sauvegardées</span>}
          </div>
        </div>

        <div className="tabs">
          {[["acts","🎯 Activités"],["regs","📋 Inscriptions"],["summary","📄 Listes"],["children","👥 Enfants"],["team","🎓 Équipe"],["online","🟢 En ligne"],["songs","🎵 Chansons"],["qr","📲 QR Code"],["pins","🔑 Codes"],["challenge","🏆 Challenge"],["push","🔔 Notifications"]].map(([id,lbl])=>(
            <button key={id} className={`tab${aTab===id?" on":""}`} onClick={()=>{setATab(id);if(id==="pins")loadPins();}}>
              {lbl}{id==="online"&&onlineUsers.length>0&&<span style={{ marginLeft:".35rem", background:"#4ade80", color:"#052e16", borderRadius:99, fontSize:".65rem", fontWeight:800, padding:"0 .38rem", verticalAlign:"middle" }}>{onlineUsers.length}</span>}
            </button>
          ))}
        </div>

        {/* ── ACTIVITÉS ── */}
        {aTab==="acts"&&(
          <div>
            {/* Formulaire de création */}
            <div className="af">
              <h3>+ Nouvelle activité / veillée</h3>
              {/* Type toggle */}
              <div style={{display:"flex",gap:".5rem",marginBottom:".9rem"}}>
                <button onClick={()=>setNewAct(a=>({...a,type:"activité"}))} style={{flex:1,padding:".5rem",borderRadius:10,border:`1.5px solid ${(newAct.type||"activité")==="activité"?"var(--gold)":"rgba(245,240,235,.15)"}`,background:(newAct.type||"activité")==="activité"?"rgba(232,160,32,.12)":"rgba(14,10,7,.4)",color:(newAct.type||"activité")==="activité"?"var(--gold)":"var(--mu)",fontWeight:700,fontSize:".82rem",cursor:"pointer"}}>🌞 Activité</button>
                <button onClick={()=>setNewAct(a=>({...a,type:"veillée"}))} style={{flex:1,padding:".5rem",borderRadius:10,border:`1.5px solid ${newAct.type==="veillée"?"var(--gold)":"rgba(245,240,235,.15)"}`,background:newAct.type==="veillée"?"rgba(232,160,32,.12)":"rgba(14,10,7,.4)",color:newAct.type==="veillée"?"var(--gold)":"var(--mu)",fontWeight:700,fontSize:".82rem",cursor:"pointer"}}>🌙 Veillée</button>
              </div>
              <div className="fg2">
                <div className="fl"><label>Nom *</label><input type="text" placeholder={newAct.type==="veillée"?"ex : Soirée karaoké":"ex : Escalade"} value={newAct.name} onChange={e=>setNewAct(a=>({...a,name:e.target.value}))}/></div>
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
                <div className="fl"><label>📅 Ouverture <span style={{color:"var(--mu)",fontWeight:400}}>(optionnel)</span></label>
                  <div style={{display:"flex",gap:".4rem"}}><input type="date" style={{flex:2}} value={newAct.openDate} onChange={e=>setNewAct(a=>({...a,openDate:e.target.value}))}/><input type="time" style={{flex:1}} value={newAct.openTime} onChange={e=>setNewAct(a=>({...a,openTime:e.target.value}))}/></div>
                </div>
                <div className="fl"><label>🔒 Fermeture <span style={{color:"var(--mu)",fontWeight:400}}>(optionnel)</span></label>
                  <div style={{display:"flex",gap:".4rem"}}><input type="date" style={{flex:2}} value={newAct.closeDate} onChange={e=>setNewAct(a=>({...a,closeDate:e.target.value}))}/><input type="time" style={{flex:1}} value={newAct.closeTime} onChange={e=>setNewAct(a=>({...a,closeTime:e.target.value}))}/></div>
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
              <button className="add-btn" onClick={handleAddAct} disabled={!newAct.name.trim()}>Créer {newAct.type==="veillée"?"la veillée":"l'activité"}</button>
              {addActMsg && <div style={{ marginTop:".65rem",fontSize:".82rem",fontWeight:600,color:addActMsg.startsWith("✅")?"#166534":addActMsg.startsWith("⏳")?"#92400E":"#9B1C1C" }}>{addActMsg}</div>}
            </div>

            {/* Activités actives */}
            {["activité","veillée"].map(type=>{
              const typeActs=acts.filter(a=>!a.archived&&(a.type||"activité")===type);
              if(typeActs.length===0)return null;
              return(
                <div key={type} style={{marginBottom:"1.25rem"}}>
                  <div style={{fontWeight:700,fontSize:".9rem",color:"var(--gold)",marginBottom:".6rem",letterSpacing:".06em",textTransform:"uppercase",fontSize:".75rem"}}>
                    {type==="veillée"?"🌙 Veillées en cours":"🌞 Activités en cours"}
                  </div>
                  {typeActs.map(act=>{
                    const st=status(act); const avg=avgRating(act.id,regs);
                    return(
                      <div key={act.id} className="ar">
                        <div className="ar-ico" style={{background:act.color+"22"}}>{act.photo?<img src={act.photo} alt={act.name}/>:act.emoji}</div>
                        <div className="ar-inf">
                          <div className="ar-nm">{act.name}{avg>0&&<span style={{fontSize:".75rem",color:"var(--gold)"}}> ⭐{avg.toFixed(1)}</span>}</div>
                          <div className="ar-dc">{act.desc||"—"}</div>
                          <div className="ar-counts">
                            {act.limitTotal&&act.useQuotas&&<><span className="gc b">♂ {st.b}/{act.maxBoys}</span><span className="gc g">♀ {st.g}/{act.maxGirls}</span><span className="gc t">{st.tot}/{act.maxTotal}</span></>}
                            {act.limitTotal&&!act.useQuotas&&<span className="gc t">{st.tot}/{act.maxTotal}</span>}
                            {!act.limitTotal&&!act.useQuotas&&<span className="gc nq">∞ sans quota</span>}
                            {actPeriodMsg(act)&&<span className="gc" style={{background:"#FFF8EC",color:"#92400E",fontSize:".68rem"}}>{actPeriodMsg(act)}</span>}
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:".35rem",flexShrink:0,alignItems:"flex-end"}}>
                          <button className={`act-toggle-btn ${act.closed?"closed":"open"}`} onClick={()=>handleToggleActClosed(act.id)}>{act.closed?"🔒 Fermé":"🟢 Ouvert"}</button>
                          <button className="del-btn" style={{background:"rgba(147,51,234,.15)",borderColor:"rgba(147,51,234,.4)",color:"#c084fc",fontSize:".72rem",padding:".3rem .6rem"}} onClick={()=>handleArchiveAct(act.id)}>📦 Archiver</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Non-inscrits — toujours affiché pour activité ET veillée */}
            {["activité","veillée"].map(type=>{
              const activeIds=acts.filter(a=>!a.archived&&(a.type||"activité")===type).map(a=>a.id);
              const registeredKeys=new Set(regs.filter(r=>activeIds.includes(r.actId)).map(r=>`${r.fn.toLowerCase()}_${r.ln.toLowerCase()}`));
              const unregistered=children.filter(c=>{
                const k=`${c.fn.toLowerCase()}_${c.ln.toLowerCase()}`;
                return !registeredKeys.has(k);
              });
              return(
                <div key={`unreg-${type}`} style={{marginBottom:"1.25rem",background:"rgba(14,10,7,.72)",border:"1px solid rgba(245,240,235,.1)",borderRadius:16,padding:"1rem",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"}}>
                  <div style={{fontWeight:700,fontSize:".8rem",color:"rgba(245,240,235,.6)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:".75rem"}}>
                    {type==="veillée"?"🌙":"🌞"} Sans {type} ({activeIds.length===0?"—":unregistered.length})
                  </div>
                  {activeIds.length===0
                    ?<div style={{fontSize:".82rem",color:"rgba(245,240,235,.3)"}}>Pas de {type} en ligne actuellement.</div>
                    :unregistered.length===0
                      ?<div style={{fontSize:".82rem",color:"#4ade80",fontWeight:600}}>✅ Tout le monde est inscrit !</div>
                      :<div style={{display:"flex",flexWrap:"wrap",gap:".35rem"}}>
                        {unregistered.map(c=>(
                          <span key={c.id} style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.25)",borderRadius:8,padding:".25rem .6rem",fontSize:".78rem",color:"rgba(245,240,235,.8)"}}>
                            {c.fn} {c.ln}
                          </span>
                        ))}
                      </div>
                  }
                </div>
              );
            })}

            {/* Activités archivées */}
            {acts.filter(a=>a.archived).length>0&&(
              <div style={{marginTop:".75rem"}}>
                <div style={{fontWeight:700,fontSize:".75rem",color:"var(--mu)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:".6rem"}}>
                  📦 Déjà faites ({acts.filter(a=>a.archived).length})
                </div>
                {acts.filter(a=>a.archived).map(act=>{
                  const actRegs=regs.filter(r=>r.actId===act.id);
                  const avg=avgRating(act.id,regs);
                  return(
                    <div key={act.id} style={{background:"rgba(14,10,7,.55)",border:"1px solid rgba(245,240,235,.07)",borderRadius:14,padding:".82rem 1rem",marginBottom:".5rem",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:".75rem"}}>
                        <div className="ar-ico" style={{background:act.color+"22",opacity:.7}}>{act.photo?<img src={act.photo} alt={act.name} style={{opacity:.7}}/>:act.emoji}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:".85rem",color:"rgba(245,240,235,.6)"}}>{act.name} <span style={{fontSize:".72rem",color:"var(--mu)",fontWeight:400}}>· {(act.type||"activité")}</span></div>
                          <div style={{fontSize:".72rem",color:"var(--mu)",marginTop:".15rem"}}>
                            {actRegs.length} inscrit{actRegs.length>1?"s":""}
                            {avg>0&&<span style={{color:"var(--gold)",marginLeft:".5rem"}}>⭐{avg.toFixed(1)}</span>}
                            {act.archivedAt&&<span style={{marginLeft:".5rem"}}>· archivée le {new Date(act.archivedAt).toLocaleDateString("fr-FR")}</span>}
                          </div>
                        </div>
                        <button className="del-btn" onClick={()=>handleDelAct(act.id)}>✕</button>
                      </div>
                      {/* Inscriptions avec notes/comments */}
                      {actRegs.length>0&&(
                        <div style={{marginTop:".75rem",borderTop:"1px solid rgba(245,240,235,.07)",paddingTop:".75rem",display:"flex",flexDirection:"column",gap:".5rem"}}>
                          {actRegs.map(r=>(
                            <div key={r.id} style={{display:"flex",gap:".6rem",alignItems:"flex-start"}}>
                              <div style={{fontSize:".8rem",color:"rgba(245,240,235,.75)",minWidth:0,flex:1}}>
                                <span style={{fontWeight:600}}>{r.fn} {r.ln}</span>
                                {r.gender==="boy"?<span style={{color:"#60a5fa",marginLeft:".3rem",fontSize:".7rem"}}>♂</span>:<span style={{color:"#f9a8d4",marginLeft:".3rem",fontSize:".7rem"}}>♀</span>}
                                {r.rating>0&&<span style={{color:"var(--gold)",marginLeft:".4rem",fontSize:".75rem"}}>{"⭐".repeat(r.rating)}</span>}
                                {r.comment&&<div style={{fontSize:".72rem",color:"rgba(245,240,235,.4)",marginTop:".15rem",fontStyle:"italic"}}>"{r.comment}"</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

        {/* ── LISTES ── */}
        {aTab==="summary"&&(
          <div>
            <div className="tbar"><button className="print-btn" onClick={()=>window.print()}>🖨️ Imprimer</button><span style={{fontSize:".78rem",color:"var(--mu)"}}>Liste nominative par activité</span></div>
            {acts.length===0?<div className="es"><div className="es-ico">📄</div><p>Aucune activité</p></div>
              :acts.map(act=>{
                const actRegs=regs.filter(r=>r.actId===act.id),st=status(act);
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
            <div className="wl-toggle-row">
              <div style={{flex:1}}>
                <div className="wl-toggle-lbl">🔒 Restreindre aux inscrits officiels{cfg.useWhitelist&&children.length>0&&<span className="children-count">{children.length}</span>}</div>
                <div className="wl-toggle-sub">{cfg.useWhitelist?(children.length===0?"⚠️ Liste vide — tout le monde peut s'inscrire pour l'instant":`Seuls les ${children.length} enfant${children.length>1?"s":""} de la liste peuvent s'inscrire`):"Désactivé — tout le monde peut s'inscrire"}</div>
              </div>
              <label className="toggle" style={{flexShrink:0}}>
                <input type="checkbox" checked={!!cfg.useWhitelist} onChange={async e=>{const nc={...cfg,useWhitelist:e.target.checked};await saveCfg(nc);setDraftCfg(nc);}}/>
                <span className="tslider"/>
              </label>
            </div>
            <div className="af" style={{marginBottom:".85rem"}}>
              <h3>+ Ajouter un enfant</h3>
              <div className="fr" style={{marginBottom:".75rem"}}>
                <div className="fg"><label className="flbl">Prénom *</label><input className="finp" type="text" placeholder="Lucas" autoCapitalize="words" value={newChild.fn} onChange={e=>setNewChild(c=>({...c,fn:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAddChild()}/></div>
                <div className="fg"><label className="flbl">Nom *</label><input className="finp" type="text" placeholder="Cohen" autoCapitalize="words" value={newChild.ln} onChange={e=>setNewChild(c=>({...c,ln:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAddChild()}/></div>
              </div>
              <button className="add-btn" style={{marginTop:0}} onClick={handleAddChild} disabled={!newChild.fn.trim()||!newChild.ln.trim()}>Ajouter à la liste</button>
            </div>
            <div className="af" style={{marginBottom:"1.25rem"}}>
              <h3>📋 Import en masse</h3>
              <p style={{fontSize:".8rem",color:"var(--mu)",marginBottom:".6rem"}}>Colle une liste : un enfant par ligne, prénom puis nom séparés par un espace.<br/><span style={{fontFamily:"monospace",background:"#F5F0EB",padding:".1rem .3rem",borderRadius:4}}>Lucas Cohen</span></p>
              <textarea className="bulk-ta" placeholder={"Lucas Cohen\nEmma Lévy\nNoam Berger\n..."} value={bulkText} onChange={e=>setBulkText(e.target.value)}/>
              {bulkMsg&&<div className="msg ok" style={{marginTop:".5rem",marginBottom:".25rem"}}>{bulkMsg}</div>}
              <button className="add-btn" style={{marginTop:".65rem"}} onClick={handleBulkImport} disabled={!bulkText.trim()}>Importer {bulkText.trim().split("\n").filter(Boolean).length} enfant{bulkText.trim().split("\n").filter(Boolean).length>1?"s":""}</button>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".75rem",flexWrap:"wrap",gap:".5rem"}}>
              <span style={{fontWeight:700,fontSize:".95rem",color:"var(--brd)"}}>Liste des participants ({children.length})</span>
              {children.length>0&&<button className="del-btn" style={{fontSize:".75rem"}} onClick={()=>setConfirmDlg({msg:`Vider toute la liste (${children.length} enfants) ?`,onConfirm:async()=>saveChildren([])})}>🗑️ Tout vider</button>}
            </div>
            {children.length===0?<div className="es"><div className="es-ico">👥</div><p>Aucun enfant dans la liste</p></div>
              :<div className="tw">
                {[...children].sort((a,b)=>a.ln.localeCompare(b.ln)).map((c,i)=>{
                  const key=`${c.fn.toLowerCase()}_${c.ln.toLowerCase()}`;
                  const reg=regs.find(r=>r.fn.toLowerCase()===c.fn.toLowerCase()&&r.ln.toLowerCase()===c.ln.toLowerCase());
                  const act=reg?acts.find(a=>a.id===reg.actId):null;
                  const hasPin=!!allPins[key];
                  const isOnline=onlineUsers.some(u=>u.fn.toLowerCase()===c.fn.toLowerCase()&&u.ln.toLowerCase()===c.ln.toLowerCase());
                  return(
                    <div key={c.id} className="child-row">
                      <div className="child-avatar" style={{position:"relative"}}>
                        {c.fn[0]}{c.ln[0]}
                        {isOnline&&<span className="online-dot" style={{position:"absolute",bottom:1,right:1}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="child-name">
                          {c.fn} {c.ln}
                          {allPins[key]?.pseudo&&<span style={{color:"var(--gold)",fontSize:".78rem",fontWeight:600,marginLeft:".4rem",opacity:.85}}>"{allPins[key].pseudo}"</span>}
                        </div>
                        {act
                          ? <div className="child-meta"><span className="apill" style={{background:act.color+"18",color:act.color}}>{act.emoji} {act.name}</span></div>
                          : hasPin
                            ? <div className="child-meta" style={{color:"#6ee7b7"}}>✅ Compte créé</div>
                            : <div className="child-meta" style={{color:"rgba(245,240,235,.35)"}}>Pas encore connecté</div>
                        }
                      </div>
                      <button className="child-del" onClick={()=>handleDelChild(c.id)}>✕</button>
                    </div>
                  );
                })}
              </div>}
          </div>
        )}

        {/* ── ÉQUIPE PÉDAGOGIQUE & ACCÈS FAMILLES ── */}
        {aTab==="team"&&(
          <div>
            {/* Mot de passe staff */}
            <div className="af" style={{marginBottom:"1.25rem"}}>
              <h3>🔑 Mot de passe Équipe Pédagogique</h3>
              <p style={{fontSize:".8rem",color:"var(--mu)",marginBottom:".75rem",lineHeight:1.5}}>
                Génère un mot de passe que tu communiques aux animateurs. Ils l'utilisent après avoir entré leur nom.
              </p>
              <div style={{display:"flex",gap:".5rem",alignItems:"stretch",flexWrap:"wrap"}}>
                <input className="sinp" type="text" placeholder="Mot de passe équipe"
                  value={draftCfg?.staffPwd||""}
                  onChange={e=>setDraftCfg(d=>({...d,staffPwd:e.target.value}))}
                  style={{flex:1,fontFamily:"monospace",letterSpacing:".08em",minWidth:120}}/>
                <button className="save-btn" onClick={()=>{
                  const pwd=Math.random().toString(36).slice(2,8).toUpperCase();
                  setDraftCfg(d=>({...d,staffPwd:pwd}));
                }}>🎲 Générer</button>
                <button className="save-btn" onClick={()=>saveCfg(draftCfg)}>💾 Sauvegarder</button>
              </div>
              {cfg.staffPwd&&(
                <div style={{marginTop:".75rem",background:"rgba(232,160,32,.1)",border:"1px solid rgba(232,160,32,.25)",borderRadius:10,padding:".6rem .9rem",display:"flex",alignItems:"center",gap:".75rem",flexWrap:"wrap"}}>
                  <span style={{fontSize:".78rem",color:"var(--mu)"}}>Mot de passe actuel :</span>
                  <strong style={{fontFamily:"monospace",fontSize:"1.2rem",color:"var(--gold)",letterSpacing:".15em"}}>{cfg.staffPwd}</strong>
                  <button className="save-btn" style={{fontSize:".72rem",padding:".3rem .7rem"}} onClick={()=>{try{navigator.clipboard.writeText(cfg.staffPwd);}catch{}}}>📋 Copier</button>
                </div>
              )}
            </div>

            {/* Liste équipe pédagogique */}
            <div className="af" style={{marginBottom:".85rem"}}>
              <h3>+ Ajouter un membre</h3>
              <div className="fr" style={{marginBottom:".75rem"}}>
                <div className="fg"><label className="flbl">Prénom *</label><input className="finp" type="text" placeholder="Sarah" autoCapitalize="words" value={newStaff.fn} onChange={e=>setNewStaff(s=>({...s,fn:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAddStaff()}/></div>
                <div className="fg"><label className="flbl">Nom *</label><input className="finp" type="text" placeholder="Lévy" autoCapitalize="words" value={newStaff.ln} onChange={e=>setNewStaff(s=>({...s,ln:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleAddStaff()}/></div>
              </div>
              <button className="add-btn" style={{marginTop:0}} onClick={handleAddStaff} disabled={!newStaff.fn.trim()||!newStaff.ln.trim()}>Ajouter à l'équipe</button>
            </div>
            <div className="af" style={{marginBottom:"1.25rem"}}>
              <h3>📋 Import en masse</h3>
              <p style={{fontSize:".8rem",color:"var(--mu)",marginBottom:".6rem"}}>Un membre par ligne : prénom puis nom séparés par un espace.</p>
              <textarea className="bulk-ta" placeholder={"Sarah Lévy\nDavid Cohen\nNoam Bensimon\n..."} value={staffBulkText} onChange={e=>setStaffBulkText(e.target.value)}/>
              {staffBulkMsg&&<div className="msg ok" style={{marginTop:".5rem",marginBottom:".25rem"}}>{staffBulkMsg}</div>}
              <button className="add-btn" style={{marginTop:".65rem"}} onClick={handleBulkImportStaff} disabled={!staffBulkText.trim()}>Importer</button>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".75rem",flexWrap:"wrap",gap:".5rem"}}>
              <span style={{fontWeight:700,fontSize:".95rem",color:"var(--brd)"}}>Équipe pédagogique ({staff.length})</span>
              {staff.length>0&&<button className="del-btn" style={{fontSize:".75rem"}} onClick={()=>setConfirmDlg({msg:`Vider toute la liste (${staff.length} membres) ?`,onConfirm:async()=>saveStaff([])})}>🗑️ Tout vider</button>}
            </div>
            {staff.length===0?<div className="es"><div className="es-ico">🎓</div><p>Aucun membre dans la liste</p></div>
              :<div className="tw">
                {[...staff].sort((a,b)=>a.ln.localeCompare(b.ln)).map(s=>{
                  const sKey=`${s.fn.toLowerCase()}_${s.ln.toLowerCase()}`;
                  const hasPin=!!allPins[sKey];
                  const isOnline=onlineUsers.some(u=>u.fn.toLowerCase()===s.fn.toLowerCase()&&u.ln.toLowerCase()===s.ln.toLowerCase());
                  return(
                    <div key={s.id} className="child-row">
                      <div className="child-avatar" style={{background:"var(--brd)22",color:"var(--brd)",position:"relative"}}>
                        {s.fn[0]}{s.ln[0]}
                        {isOnline&&<span className="online-dot" style={{position:"absolute",bottom:1,right:1}}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div className="child-name">
                          {s.fn} {s.ln}
                          {allPins[sKey]?.pseudo&&<span style={{color:"var(--gold)",fontSize:".78rem",fontWeight:600,marginLeft:".4rem",opacity:.85}}>"{allPins[sKey].pseudo}"</span>}
                        </div>
                        {hasPin
                          ? <div className="child-meta" style={{color:"#6ee7b7"}}>✅ Compte créé</div>
                          : <div className="child-meta" style={{color:"rgba(245,240,235,.35)"}}>Pas encore connecté</div>
                        }
                      </div>
                      <button className="child-del" onClick={()=>handleDelStaff(s.id)}>✕</button>
                    </div>
                  );
                })}
              </div>}

          </div>
        )}

        {/* ── EN LIGNE ── */}
        {aTab==="online"&&(
          <div>
            <div style={{marginBottom:".75rem",display:"flex",alignItems:"center",gap:".6rem"}}>
              <span className="online-dot-big"/>
              <span style={{fontWeight:700,fontSize:".95rem",color:"var(--brd)"}}>Connecté·es maintenant ({onlineUsers.length})</span>
            </div>
            <p style={{fontSize:".8rem",color:"var(--mu)",marginBottom:"1rem",lineHeight:1.5}}>
              Mis à jour en temps réel · présence détectée si active il y a moins de 2 minutes.
            </p>
            {onlineUsers.length===0
              ? <div className="es"><div className="es-ico">🌙</div><p>Personne de connecté pour l'instant</p></div>
              : (() => {
                  const byRole = { enfant: [], staff: [] };
                  onlineUsers.forEach(u => { if (byRole[u.role]) byRole[u.role].push(u); else byRole.enfant.push(u); });
                  const roleLabel = { enfant:"👧 Colon·nes", staff:"🎓 Équipe péda" };
                  const roleBg   = { enfant:"rgba(232,160,32,.12)", staff:"rgba(99,102,241,.15)" };
                  const roleClr  = { enfant:"var(--gold)", staff:"#a5b4fc" };
                  return Object.entries(byRole).filter(([,list])=>list.length>0).map(([role, list]) => (
                    <div key={role} style={{marginBottom:"1.25rem"}}>
                      <div style={{fontSize:".78rem",fontWeight:700,color:"var(--mu)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:".5rem"}}>{roleLabel[role]} · {list.length}</div>
                      <div className="tw">
                        {list.map((u,i) => {
                          const secsAgo = Math.floor((Date.now() - new Date(u.lastSeen).getTime()) / 1000);
                          const ago = secsAgo < 10 ? "maintenant" : secsAgo < 60 ? `${secsAgo}s` : `${Math.floor(secsAgo/60)}min`;
                          return (
                            <div key={i} className="child-row">
                              <div className="child-avatar" style={{background:roleBg[role],color:roleClr[role],position:"relative"}}>
                                {u.fn?.[0]}{u.ln?.[0]}
                                <span className="online-dot" style={{position:"absolute",bottom:1,right:1}}/>
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div className="child-name">{u.fn} {u.ln}</div>
                                <div className="child-meta">🕐 il y a {ago}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()
            }
          </div>
        )}

        {/* ── CHANSONS ── */}
        {aTab==="songs"&&(
          <div>
            {[0,1].map(idx=>{
              const s = draftCfg?.songs?.[idx] || {title:"",cover:"",spotify:"",deezer:"",youtube:"",apple:"",lyrics:""};
              const upd = (field,val) => setDraftCfg(d=>{
                const songs=[...(d.songs||[{},{} ])];
                songs[idx]={...songs[idx],[field]:val};
                return {...d,songs};
              });
              return(
                <div key={idx} className="af" style={{marginBottom:"1.25rem"}}>
                  <h3>🎵 Chanson {idx+1}</h3>
                  <div className="sbar-g" style={{marginBottom:".65rem"}}>
                    <span className="sbar-lbl">Titre</span>
                    <input className="sinp" placeholder="Ex : Ça Murce !" value={s.title||""} onChange={e=>upd("title",e.target.value)}/>
                  </div>
                  <div className="sbar-g" style={{marginBottom:".65rem"}}>
                    <span className="sbar-lbl">🖼️ URL de la cover (image)</span>
                    <input className="sinp" placeholder="https://…jpg" value={s.cover||""} onChange={e=>upd("cover",e.target.value)}/>
                  </div>
                  {/* ── MP3 upload ── */}
                  <div className="sbar-g" style={{marginBottom:".65rem"}}>
                    <span className="sbar-lbl">🎵 Fichier MP3</span>
                    {s.mp3&&(
                      <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".4rem"}}>
                        <audio controls src={s.mp3} style={{flex:1,height:36,minWidth:0,accentColor:"var(--gold)"}}/>
                        <button onClick={()=>upd("mp3","")} style={{background:"none",border:"1px solid rgba(245,80,60,.3)",borderRadius:8,padding:".3rem .6rem",color:"rgba(245,80,60,.7)",fontSize:".78rem",cursor:"pointer",flexShrink:0}}>✕</button>
                      </div>
                    )}
                    <label style={{display:"flex",alignItems:"center",gap:".6rem",padding:".55rem .9rem",background:"rgba(232,160,32,.08)",border:"1.5px dashed rgba(232,160,32,.3)",borderRadius:10,cursor:mp3Uploading?"not-allowed":"pointer",opacity:mp3Uploading?.6:1}}>
                      <span style={{fontSize:"1.1rem"}}>📂</span>
                      <span style={{color:"rgba(232,160,32,.8)",fontWeight:600,fontSize:".85rem"}}>
                        {mp3Uploading?"Upload en cours…":s.mp3?"Remplacer le MP3":"Choisir un fichier MP3"}
                      </span>
                      <input type="file" accept="audio/mpeg,audio/mp3,audio/*" style={{display:"none"}} disabled={mp3Uploading}
                        onChange={async e=>{
                          const file=e.target.files?.[0]; if(!file)return;
                          setMp3Uploading(true); setMp3Msg("");
                          try {
                            const url=await uploadFileToStorage(file,`songs/chanson${idx+1}_${Date.now()}.mp3`);
                            upd("mp3",url);
                            setMp3Msg("✅ MP3 uploadé !");
                          } catch(err) { setMp3Msg("❌ Erreur : "+err.message); }
                          finally { setMp3Uploading(false); e.target.value=""; }
                        }}
                      />
                    </label>
                    {mp3Msg&&<div style={{fontSize:".8rem",marginTop:".35rem",color:mp3Msg.startsWith("✅")?"#4ade80":"#f87171"}}>{mp3Msg}</div>}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem",marginBottom:".65rem"}}>
                    {[["spotify","🎵 Spotify"],["deezer","🎵 Deezer"],["youtube","▶️ YouTube"],["apple","🍎 Apple Music"]].map(([k,lbl])=>(
                      <div key={k} className="sbar-g">
                        <span className="sbar-lbl">{lbl}</span>
                        <input className="sinp" placeholder="https://…" value={s[k]||""} onChange={e=>upd(k,e.target.value)}/>
                      </div>
                    ))}
                  </div>
                  <div className="sbar-g">
                    <span className="sbar-lbl">🎤 Paroles</span>
                    <textarea className="sinp-ta" placeholder="Colle les paroles ici…" rows={6} value={s.lyrics||""} onChange={e=>upd("lyrics",e.target.value)}/>
                  </div>
                </div>
              );
            })}
            <button className="save-btn" onClick={()=>saveCfg(draftCfg)}>💾 Sauvegarder les chansons</button>
          </div>
        )}

        {/* ── QR CODE ── */}
        {aTab==="qr"&&(
          <div>
            <div className="qr-wrap">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=7B1D2E&bgcolor=FFF8EC&data=${encodeURIComponent(qrUrl)}`} alt="QR Code" width="220" height="220"/>
              <div className="qr-url">{qrUrl}</div>
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&color=7B1D2E&bgcolor=FFF8EC&data=${encodeURIComponent(qrUrl)}`} download="qrcode_camurce.png" style={{background:"var(--brd)",color:"#fff",border:"none",fontFamily:"'Nunito'",fontSize:".85rem",fontWeight:700,padding:".55rem 1.1rem",borderRadius:10,cursor:"pointer",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:".4rem",minHeight:44}}>⬇ Télécharger le QR Code</a>
            </div>
            <p style={{fontSize:".82rem",color:"var(--mu)",textAlign:"center",padding:"0 1rem"}}>Imprime ce QR Code et affiche-le au moadon — les enfants le scannent et arrivent directement sur le site.</p>
          </div>
        )}

        {/* ── CHALLENGE ── */}
        {aTab==="challenge"&&(
          <div>
            {/* Gagnant J-1 (toggle) */}
            {(()=>{
              const sortedWinners=challenges.filter(c=>!c.active&&c.winner).sort((a,b)=>new Date(b.at)-new Date(a.at));
              const prev=sortedWinners[0];
              if(!prev)return null;
              return(
                <div style={{marginBottom:"1.25rem",border:"1.5px solid rgba(232,160,32,.3)",borderRadius:16,overflow:"hidden"}}>
                  <button
                    onClick={()=>setShowPrevWinner(v=>!v)}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:".85rem 1rem",background:"rgba(232,160,32,.1)",border:"none",cursor:"pointer",gap:".75rem"}}>
                    <span style={{fontWeight:700,fontSize:".88rem",color:"var(--gold)"}}>🥇 Gagnant du jour précédent</span>
                    <span style={{color:"var(--gold)",fontSize:".8rem"}}>{showPrevWinner?"▲":"▼"}</span>
                  </button>
                  {showPrevWinner&&(
                    <div style={{padding:"1rem",background:"rgba(14,10,7,.6)",display:"flex",gap:".85rem",alignItems:"flex-start"}}>
                      <img src={prev.winner.photo} alt={prev.winner.name} style={{width:72,height:72,objectFit:"cover",borderRadius:12,flexShrink:0,border:"2px solid rgba(232,160,32,.4)"}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:".95rem",color:"var(--gold)",marginBottom:".2rem"}}>{prev.emoji} {prev.title}</div>
                        <div style={{fontWeight:700,fontSize:".85rem",color:"var(--txt)"}}>🥇 {prev.winner.name}</div>
                        {prev.winner.caption&&<div style={{fontSize:".75rem",color:"rgba(245,240,235,.5)",fontStyle:"italic",marginTop:".2rem"}}>"{prev.winner.caption}"</div>}
                        <div style={{fontSize:".7rem",color:"var(--mu)",marginTop:".3rem"}}>{new Date(prev.at).toLocaleDateString("fr-FR")}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Historique des gagnants (toggle) */}
            {(()=>{
              const allWinners=challenges.filter(c=>!c.active&&c.winner).sort((a,b)=>new Date(b.at)-new Date(a.at));
              if(allWinners.length<=1)return null;
              const older=allWinners.slice(1);
              return(
                <div style={{marginBottom:"1.25rem",border:"1px solid rgba(245,240,235,.1)",borderRadius:16,overflow:"hidden"}}>
                  <button
                    onClick={()=>setShowWinnersHistory(v=>!v)}
                    style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:".75rem 1rem",background:"rgba(14,10,7,.65)",border:"none",cursor:"pointer"}}>
                    <span style={{fontWeight:700,fontSize:".82rem",color:"rgba(245,240,235,.6)"}}>📚 Anciens gagnants ({older.length})</span>
                    <span style={{color:"rgba(245,240,235,.4)",fontSize:".8rem"}}>{showWinnersHistory?"▲":"▼"}</span>
                  </button>
                  {showWinnersHistory&&(
                    <div style={{background:"rgba(14,10,7,.5)",padding:".75rem",display:"flex",flexDirection:"column",gap:".5rem"}}>
                      {older.map(ch=>(
                        <div key={ch.id} style={{display:"flex",gap:".75rem",alignItems:"center",padding:".6rem .75rem",background:"rgba(14,10,7,.45)",borderRadius:12,border:"1px solid rgba(245,240,235,.07)"}}>
                          <img src={ch.winner.photo} alt={ch.winner.name} style={{width:48,height:48,objectFit:"cover",borderRadius:9,flexShrink:0,opacity:.9}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:".72rem",color:"var(--mu)",marginBottom:".15rem"}}>{ch.emoji} {ch.title} · {new Date(ch.at).toLocaleDateString("fr-FR")}</div>
                            <div style={{fontWeight:700,fontSize:".85rem",color:"rgba(245,240,235,.75)"}}>🥇 {ch.winner.name}</div>
                            {ch.winner.caption&&<div style={{fontSize:".7rem",color:"rgba(245,240,235,.4)",fontStyle:"italic"}}>"{ch.winner.caption}"</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Formulaire créer challenge */}
            <div className="af" style={{marginBottom:"1.25rem"}}>
              <h3>+ Nouveau challenge</h3>
              <div className="fg2" style={{marginBottom:".75rem"}}>
                <div className="fl">
                  <label>Emoji</label>
                  <input type="text" maxLength={4} value={newChall.emoji} onChange={e=>setNewChall(c=>({...c,emoji:e.target.value}))} style={{width:70}}/>
                </div>
                <div className="fl">
                  <label>Titre *</label>
                  <input type="text" placeholder="ex : Coucher de soleil" value={newChall.title} onChange={e=>setNewChall(c=>({...c,title:e.target.value}))}/>
                </div>
              </div>
              <div className="fl" style={{marginBottom:".75rem"}}>
                <label>Description <span style={{color:"var(--mu)",fontWeight:400}}>(optionnel)</span></label>
                <input type="text" placeholder="Consignes du challenge…" value={newChall.desc} onChange={e=>setNewChall(c=>({...c,desc:e.target.value}))}/>
              </div>
              <div className="fl" style={{marginBottom:".75rem"}}>
                <label>Date <span style={{color:"var(--mu)",fontWeight:400}}>(YYYY-MM-DD)</span></label>
                <input type="date" value={newChall.date} onChange={e=>setNewChall(c=>({...c,date:e.target.value}))}/>
              </div>
              <button className="add-btn" onClick={handleAddChallenge} disabled={!newChall.title.trim()}>Créer le challenge</button>
            </div>

            {/* Liste des challenges */}
            <div style={{fontWeight:700,fontSize:".95rem",color:"var(--brd)",marginBottom:".75rem"}}>Challenges ({challenges.length})</div>
            {challenges.length===0
              ? <div className="es"><div className="es-ico">🏆</div><p>Aucun challenge créé</p></div>
              : challenges.map(ch => {
                  const subs = challSubs.filter(s => s.challengeId === ch.id);
                  return (
                    <div key={ch.id} style={{background:"rgba(14,10,7,.7)",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,padding:"1rem",marginBottom:".75rem"}}>
                      <div style={{display:"flex",alignItems:"center",gap:".75rem",marginBottom:".6rem"}}>
                        <span style={{fontSize:"1.6rem"}}>{ch.emoji}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:".95rem"}}>{ch.title}</div>
                          <div style={{fontSize:".75rem",color:"var(--mu)"}}>{ch.date} · {subs.length} soumission{subs.length!==1?"s":""}</div>
                          {ch.desc && <div style={{fontSize:".78rem",color:"var(--mu)",marginTop:".2rem"}}>{ch.desc}</div>}
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:".35rem",alignItems:"flex-end"}}>
                          <button
                            className={`act-toggle-btn ${ch.active?"open":"closed"}`}
                            onClick={()=>handleToggleChallengeActive(ch.id)}
                          >{ch.active?"🟢 Actif":"⚫ Inactif"}</button>
                          <button className="del-btn" onClick={()=>handleDeleteChallenge(ch.id)}>✕</button>
                        </div>
                      </div>
                      {ch.winner && (
                        <div style={{background:"rgba(232,160,32,.12)",border:"1px solid rgba(232,160,32,.2)",borderRadius:10,padding:".5rem .75rem",fontSize:".8rem",marginBottom:".5rem"}}>
                          🏆 Gagnant : <strong>{ch.winner.name}</strong>
                        </div>
                      )}
                      {/* Grille soumissions pour désigner gagnant */}
                      {!ch.active && subs.length > 0 && (
                        <div>
                          <div style={{fontSize:".78rem",color:"var(--gold)",fontWeight:600,marginBottom:".5rem"}}>Désigner un gagnant :</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
                            {subs.map(sub => (
                              <div key={sub.id} style={{background:"rgba(14,10,7,.6)",border:"1px solid rgba(255,255,255,.09)",borderRadius:12,overflow:"hidden"}}>
                                <img src={sub.photo} alt={sub.author} style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",display:"block"}}/>
                                <div style={{padding:".4rem .6rem",display:"flex",alignItems:"center",gap:".4rem"}}>
                                  <span style={{fontSize:".72rem",fontWeight:700,color:"var(--gold)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sub.author}</span>
                                  <button
                                    onClick={()=>handleSetWinner(ch.id,sub)}
                                    style={{background:"var(--gold)",color:"#0A0705",border:"none",borderRadius:8,padding:".25rem .5rem",fontSize:".7rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}
                                  >🏆 Gagnant</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
            }
          </div>
        )}

        {/* ── CODES PIN ── */}
        {aTab==="pins"&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".75rem"}}>
              <div style={{fontSize:".82rem",color:"var(--mu)"}}>🔑 {Object.keys(allPins).length} compte{Object.keys(allPins).length!==1?"s":""} enregistré{Object.keys(allPins).length!==1?"s":""}</div>
              <button className="print-btn" onClick={loadPins}>↻ Actualiser</button>
            </div>
            {Object.keys(allPins).length===0
              ?<div className="es"><div className="es-ico">🔑</div><p>Aucun compte créé pour l'instant.</p></div>
              :<div style={{display:"flex",flexDirection:"column",gap:".5rem"}}>
                {Object.entries(allPins).map(([key,u])=>(
                  <div key={key} style={{background:"rgba(14,10,7,.5)",border:"1px solid rgba(255,255,255,.08)",borderRadius:"14px",padding:".75rem 1rem",display:"flex",alignItems:"center",gap:".75rem"}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:"var(--gold)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#0A0705",fontSize:".9rem",flexShrink:0}}>{u.fn?.[0]?.toUpperCase()||"?"}</div>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:".9rem"}}>{u.fn} {u.ln}</div><div style={{fontSize:".72rem",color:"var(--mu)"}}>{u.gender==="boy"?"👦 Garçon":"👧 Fille"}</div></div>
                    <div style={{background:"rgba(232,160,32,.1)",border:"1px solid rgba(232,160,32,.25)",borderRadius:"10px",padding:".3rem .7rem",fontFamily:"monospace",fontSize:"1rem",fontWeight:700,color:"var(--gold)",letterSpacing:".15em"}}>{u.pin}</div>
                    <button className="child-del" onClick={()=>handleBanUser(key,u.fn,u.ln,u.role)}>✕</button>
                  </div>
                ))}
              </div>}
          </div>
        )}

        {aTab==="push" && <PushPanel cfg={cfg}/>}
      </div>
    </div>
  );
}

/* ── Panneau notifications push ──────────────────────────────────────────── */
function PushPanel({ cfg }) {
  const [title,   setTitle]   = useState("Notification");
  const [body,    setBody]    = useState("");
  const [target,  setTarget]  = useState("all"); // "all" | "enfant" | "staff"
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState(null);

  const sendQuick = async (quickBody, quickTitle, link = "/", { murciagramBanner = false } = {}) => {
    setSending(true); setResult(null);
    try {
      // Si c'est la notif Murciagram → déclenche aussi la bannière in-app via Firestore
      if (murciagramBanner) {
        try {
          await setDoc(doc(db, "alerts", "murciagram"), { active: true, ts: new Date().toISOString() });
        } catch {}
      }
      const snap = await getDocs(collection(db, "pushTokens"));
      let tokens = snap.docs.map(d => d.data());
      if (target !== "all") tokens = tokens.filter(t => t.role === target);
      const tokenList = tokens.map(t => t.token).filter(Boolean);
      if (tokenList.length === 0) { setResult({ ok:false, msg:"Aucun appareil enregistré." }); setSending(false); return; }
      const secret = import.meta.env.VITE_NOTIFY_SECRET || "";
      const resp = await fetch("/api/notify", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ tokens:tokenList, title:quickTitle||"📢", body:quickBody, link, data:{ tag:`quick-${Date.now()}` }, secret }),
      });
      const json = await resp.json();
      setResult({ ok:resp.ok, msg: resp.ok ? `✅ Envoyé à ${json.sent} appareil${json.sent!==1?"s":""}` : `❌ ${json.error||resp.status}` });
    } catch(e) { setResult({ ok:false, msg:`❌ ${e.message}` }); }
    setSending(false);
  };

  const send = async () => {
    if (!body.trim()) return;
    setSending(true); setResult(null);
    const finalTitle = title.trim() || "Notification";  // vide → "Notification" par défaut
    const finalBody  = body.trim();
    try {
      // Récupère tous les tokens depuis Firestore
      const snap = await getDocs(collection(db, "pushTokens"));
      let tokens = snap.docs.map(d => d.data());

      if (target !== "all") tokens = tokens.filter(t => t.role === target);
      const tokenList = tokens.map(t => t.token).filter(Boolean);

      if (tokenList.length === 0) {
        setResult({ ok: false, msg: "Aucun appareil enregistré pour cette cible." });
        setSending(false); return;
      }

      const secret = import.meta.env.VITE_NOTIFY_SECRET || "";
      const resp = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokens: tokenList,
          title: finalTitle,
          body: finalBody,
          data: { tag: `broadcast-${Date.now()}` },
          secret,
        }),
      });
      const json = await resp.json();
      setResult({
        ok: resp.ok,
        msg: resp.ok
          ? `✅ Envoyé à ${json.sent} appareil${json.sent!==1?"s":""}${json.failed>0?` (${json.failed} échoué${json.failed!==1?"s":""})`:""}`
          : `❌ Erreur : ${json.error || resp.status}`,
      });
      if (resp.ok) { setTitle("Notification"); setBody(""); }
    } catch(e) {
      setResult({ ok: false, msg: `❌ ${e.message}` });
    }
    setSending(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

      {/* Raccourcis rapides */}
      <div className="sbar">
        <span className="sbar-lbl">⚡ Raccourcis</span>
        <button
          onClick={() => sendQuick("C'est l'heure du Murciagram ! 📸 Poste ta plus belle photo", "🔔🔔🔔", "/?action=post", { murciagramBanner: true })}
          disabled={sending}
          style={{ width:"100%", padding:".75rem 1rem", background:"rgba(232,160,32,.1)", border:"1.5px solid rgba(232,160,32,.3)", borderRadius:12, color:"var(--gold)", fontWeight:700, fontSize:".9rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:".5rem" }}>
          📸 C'est l'heure du Murciagram !
        </button>
        <button
          onClick={() => sendQuick("C'est le moment de s'inscrire aux activités !", "🔔 Murci'App", "/?tab=activites")}
          disabled={sending}
          style={{ width:"100%", padding:".75rem 1rem", background:"rgba(74,222,128,.08)", border:"1.5px solid rgba(74,222,128,.25)", borderRadius:12, color:"#4ade80", fontWeight:700, fontSize:".9rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:".5rem" }}>
          🔔 Inscriptions aux activités
        </button>
        <button
          onClick={async () => {
            try { await setDoc(doc(db, "alerts", "murciagram"), { active: false, ts: new Date().toISOString() }); setResult({ ok:true, msg:"🔕 Bannière arrêtée" }); } catch(e) { setResult({ ok:false, msg:`❌ ${e.message}` }); }
          }}
          style={{ width:"100%", padding:".5rem 1rem", background:"rgba(239,68,68,.06)", border:"1px solid rgba(239,68,68,.2)", borderRadius:10, color:"rgba(248,113,113,.85)", fontWeight:600, fontSize:".78rem", cursor:"pointer" }}>
          🔕 Stopper la bannière in-app
        </button>
        <div style={{ fontSize:".68rem", color:"var(--mu)", textAlign:"center" }}>
          Push + bannière dans l'app (3 min) · clic → ouvre le sheet de post
        </div>
      </div>

      {/* Cible */}
      <div className="sbar">
        <span className="sbar-lbl">Destinataires</span>
        <div style={{ display:"flex", gap:".5rem" }}>
          {[["all","👥 Tout le monde"],["enfant","👧 Colon·nes"],["staff","🎓 Équipe"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTarget(v)}
              style={{
                flex:1, padding:".5rem", borderRadius:10, cursor:"pointer",
                border:`1.5px solid ${target===v?"var(--gold)":"rgba(245,240,235,.12)"}`,
                background: target===v?"rgba(232,160,32,.12)":"rgba(14,10,7,.4)",
                color: target===v?"var(--gold)":"var(--mu)", fontWeight:600, fontSize:".78rem",
              }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Message + Titre */}
      <div className="sbar">
        <div className="sbar-g">
          <span className="sbar-lbl">Message * <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--mu)"}}>— texte principal affiché en entier</span></span>
          <textarea className="sinp-ta" rows={3}
            placeholder="Ex : C'est l'heure du Murciagram ! 📸 Postez vos plus belles photos"
            value={body} onChange={e=>setBody(e.target.value)} maxLength={200}/>
        </div>
        <div className="sbar-g">
          <span className="sbar-lbl">Titre court <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,color:"var(--mu)"}}>— optionnel, ~40 car. max</span></span>
          <input className="sinp" placeholder="Ex : Murci'App 📢  (laisse vide = message affiché en titre)"
            value={title} onChange={e=>setTitle(e.target.value)} maxLength={50}/>
        </div>

        <button className="splash-btn-main" onClick={send}
          disabled={sending || !body.trim()}
          style={{ opacity:(sending||!body.trim())?.6:1 }}>
          {sending ? "Envoi en cours…" : "🔔 Envoyer la notification"}
        </button>

        {result && (
          <div style={{
            padding:".7rem 1rem", borderRadius:12, fontSize:".85rem",
            background: result.ok?"rgba(74,222,128,.1)":"rgba(239,68,68,.1)",
            border:`1px solid ${result.ok?"rgba(74,222,128,.3)":"rgba(239,68,68,.3)"}`,
            color: result.ok?"#4ade80":"#f87171",
          }}>{result.msg}</div>
        )}
      </div>

      <div style={{ fontSize:".7rem", color:"rgba(245,240,235,.2)", lineHeight:1.6 }}>
        ℹ️ Requiert FIREBASE_SERVICE_ACCOUNT et VITE_FCM_VAPID_KEY configurés dans Vercel.
        Les utilisateurs doivent avoir accepté les notifications au moins une fois.
      </div>
    </div>
  );
}
