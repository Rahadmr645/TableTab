import React from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function TableModal() {
  const { showTableModal, setShowTableModal, selectedTable, setSelectedTable, t } = useCashier();

  if (!showTableModal) return null;
  const onClose = () => setShowTableModal(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: "450px" }}>
        <div className="modal-header">
          <h3>{t.tableSelection}</h3>
          <button 
            style={{ border: "none", background: "none", fontSize: "16px", cursor: "pointer" }} 
            onClick={onClose}
          >✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: "300px", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
              <button 
                key={num}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: selectedTable === num ? "var(--accent)" : "white",
                  color: selectedTable === num ? "white" : "var(--text-primary)",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setSelectedTable(num);
                  onClose();
                }}
              >
                {t.table} {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
