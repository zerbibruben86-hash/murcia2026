import { compressImage } from "../utils/helpers";
import { firebaseStorage, uploadPhotoToStorage } from "../firebase";

export default function PhotoUpload({ value, onChange, storagePath = "activities" }) {
  const onFile = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      // Upload Firebase Storage → URL CDN (qualité maximale, pas de limite Firestore)
      if (firebaseStorage) {
        const compressed = await compressImage(f, 1600, 0.92, false);
        const path = `${storagePath}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const url = await uploadPhotoToStorage(compressed, path);
        onChange(url);
        e.target.value = "";
        return;
      }
      // Fallback sans Storage : base64 compressé
      const compressed = await compressImage(f, 900, 0.82, false);
      onChange(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result);
      reader.readAsDataURL(f);
    }
    e.target.value = "";
  };
  return (
    <div className="photo-zone">
      {value ? (
        <div className="photo-has">
          <img src={value} className="photo-thumb" alt="preview"/>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:".8rem",fontWeight:600,color:"rgba(245,240,235,.7)" }}>Photo ajoutée</div>
            <div style={{ fontSize:".68rem",color:"var(--mu)",marginTop:".1rem" }}>Appuie pour changer</div>
          </div>
          <div style={{ display:"flex",gap:".4rem",flexShrink:0 }}>
            <label className="upbtn"><span>🔄</span>Changer<input type="file" accept="image/*" onChange={onFile}/></label>
            <button className="upbtn upbtn-del" onClick={() => onChange("")}>✕</button>
          </div>
        </div>
      ) : (
        <label className="photo-empty">
          <div className="photo-empty-ico">🖼️</div>
          <div>
            <div className="photo-empty-lbl">Ajouter une photo</div>
            <div className="photo-empty-sub">Appuie pour choisir dans la galerie</div>
          </div>
          <input type="file" accept="image/*" onChange={onFile} style={{ display:"none" }}/>
        </label>
      )}
    </div>
  );
}
