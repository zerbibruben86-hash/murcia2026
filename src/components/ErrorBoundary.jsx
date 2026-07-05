import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  render() {
    if (this.state.err) return (
      <div style={{ background:"#0A0705",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#E8A020",fontFamily:"serif",padding:"2rem",textAlign:"center",gap:"1rem" }}>
        <div style={{ fontSize:"2.5rem" }}>👑</div>
        <b>Erreur :</b>
        <code style={{ fontSize:".75rem",color:"rgba(245,240,235,.5)" }}>{this.state.err?.message}</code>
        <button onClick={() => window.location.reload()} style={{ background:"#E8A020",color:"#0A0705",border:"none",padding:".75rem 1.5rem",borderRadius:"12px",fontWeight:700,cursor:"pointer" }}>
          Recharger
        </button>
      </div>
    );
    return this.props.children;
  }
}
