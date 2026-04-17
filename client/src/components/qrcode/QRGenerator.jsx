import React, { useState, useContext } from "react";
import "./QRGenerator.css";
import { AuthContext } from "../../context/CartContext.jsx";
import axios from "axios";

const QRGenerator = () => {
  const { URL } = useContext(AuthContext);
  const [tableId, setTableId] = useState("");
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    if (!tableId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${URL}/api/qr/generate/${tableId}`);
      setQr(res.data);
    } catch (e) {
      console.error(e);
      alert("Could not generate QR. Check table ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qr-page">
      <div className="qr-panel">
        <h2>Table QR</h2>
        <p>Generate a scannable code for a table so guests land in the right flow.</p>
        <div className="qr-row">
          <input
            type="number"
            placeholder="Table number"
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            className="qr-input"
          />
          <button
            type="button"
            className="qr-generate-btn"
            onClick={generateQR}
            disabled={loading || !tableId}
          >
            {loading ? "Generating…" : "Generate QR"}
          </button>
        </div>
        {qr && (
          <div className="qr-result">
            <img src={qr.qrImage} alt={`QR for table ${tableId}`} />
            <p className="qr-link">{qr.link}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRGenerator;
