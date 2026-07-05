export default function ConfirmDialog({ dlg, onClose }) {
  if (!dlg) return null;
  const doConfirm = async () => { await dlg.onConfirm(); onClose(); };
  return (
    <div className="dlg-overlay" onClick={onClose}>
      <div className="dlg" onClick={e => e.stopPropagation()}>
        <p>{dlg.msg}</p>
        <div className="dlg-btns">
          <button className="dlg-cancel" onClick={onClose}>Annuler</button>
          <button className="dlg-confirm" onClick={doConfirm}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}
