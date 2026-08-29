import React from "react";
import { useCashier } from "../../context/CashierContext.jsx";

export default function TableModal() {
  const { showTableModal, setShowTableModal, selectedTable, setSelectedTable, tables, t } = useCashier();

  if (!showTableModal) return null;
  const onClose = () => setShowTableModal(false);

  const tableList = tables && tables.length > 0
    ? tables.map(tb => ({ id: tb._id, label: tb.label, num: Number(tb.label) || tb.label }))
    : Array.from({ length: 24 }, (_, i) => ({ id: i + 1, label: (i + 1).toString(), num: i + 1 }));

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
        <div className="modal-body" style={{ maxHeight: "320px", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {tableList.map(tbItem => {
              const num = tbItem.num;
              const isSelected = selectedTable === num || selectedTable === Number(num);
              return (
                <button 
                  key={tbItem.id || num}
                  type="button"
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: isSelected ? "var(--accent)" : "white",
                    color: isSelected ? "white" : "var(--text-primary)",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    setSelectedTable(num);
                    onClose();
                  }}
                >
                  {t.table} {tbItem.label || num}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
