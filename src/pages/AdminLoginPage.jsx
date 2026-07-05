import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { IMG_POOL } from "../utils/helpers";
import { Hdr, Drawer } from "../components/Header";

export default function AdminLoginPage() {
  const { pwd, setPwd, pwdErr, handleLogin, navTo } = useContext(AppContext);
  return (
    <div style={{ position:"relative",minHeight:"100vh" }}>
      <img src={IMG_POOL} alt="" className="bg-img"/>
      <Hdr right={<button className="hdr-btn" onClick={() => navTo("home")}>← Retour</button>}/>
      <Drawer/>
      <main className="main">
        <div className="lw">
          <div style={{ fontSize:"3rem",marginBottom:".55rem" }}>🔐</div>
          <h2>Espace Admin</h2><p>Mot de passe requis</p>
          <input className="linp" type="password" placeholder="Mot de passe" value={pwd}
            onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}/>
          <button className="sbtn" onClick={handleLogin}>Connexion</button>
          {pwdErr && <div className="msg err" style={{ marginTop:".85rem" }}>{pwdErr}</div>}
        </div>
      </main>
    </div>
  );
}
