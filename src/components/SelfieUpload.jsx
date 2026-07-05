import { readFile } from "../utils/helpers";

export default function SelfieUpload({ value, onChange }) {
  const onFile = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    onChange(await readFile(f)); e.target.value = "";
  };
  return (
    <div className="selfie-zone">
      {value ? (
        <div className="selfie-has">
          <img src={value} className="selfie-thumb" alt="selfie"/>
          <div className="selfie-has-info">
            <div className="selfie-has-lbl">Selfie ajouté 📸</div>
            <div className="selfie-has-sub">Visible sur ta fiche</div>
          </div>
          <div className="selfie-has-btns">
            <label className="upbtn"><span>🤳</span>Caméra<input type="file" accept="image/*" capture="user" onChange={onFile}/></label>
            <label className="upbtn"><span>🖼️</span>Galerie<input type="file" accept="image/*" onChange={onFile}/></label>
            <button className="upbtn upbtn-del" onClick={() => onChange("")}>✕</button>
          </div>
        </div>
      ) : (
        <div className="selfie-empty-row">
          <label className="selfie-empty">
            <div className="selfie-empty-ico">🤳</div>
            <div className="selfie-empty-lbl">Caméra</div>
            <input type="file" accept="image/*" capture="user" onChange={onFile} style={{ display:"none" }}/>
          </label>
          <label className="selfie-empty">
            <div className="selfie-empty-ico">🖼️</div>
            <div className="selfie-empty-lbl">Galerie</div>
            <input type="file" accept="image/*" onChange={onFile} style={{ display:"none" }}/>
          </label>
        </div>
      )}
    </div>
  );
}
