import React, { useContext, useState } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { FaBarcode } from "react-icons/fa";
import "./BarcodeMenu.css";

const BarcodeMenu = () => {
  const { admin, URL } = useContext(AuthContext);
  const [tableId, setTableId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const generate = async () => {
    const id = tableId.trim();
    if (!id) {
      setError("Enter a table number or label.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const enc = encodeURIComponent(id);
      const [qrRes, bcRes] = await Promise.all([
        axios.get(`${URL}/api/qr/generate/${enc}`),
        axios.get(`${URL}/api/qr/barcode/${enc}`),
      ]);
      const link = qrRes.data?.link || bcRes.data?.link;
      setPayload({
        tableId: id,
        link,
        qrImage: qrRes.data?.qrImage,
        barcodeImage: bcRes.data?.barcodeImage,
      });
    } catch (e) {
      console.error(e);
      setError(
        e.response?.data?.error ||
          e.message ||
          "Could not generate codes. Check server and CLEINT_URL.",
      );
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!payload?.link) return;
    try {
      await navigator.clipboard.writeText(payload.link);
      alert("Link copied.");
    } catch {
      alert(payload.link);
    }
  };

  if (!admin || admin.role !== "admin") {
    return (
      <div className="barcode-page">
        <div className="barcode-container barcode-container--narrow">
          <p className="barcode-denied">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="barcode-page">
      <div className="barcode-container">
        <header className="barcode-header">
          <div className="barcode-title-row">
            <FaBarcode className="barcode-title-icon" aria-hidden />
            <div>
              <h1 className="barcode-title">Table barcode & QR</h1>
              <p className="barcode-lead">
                Guests who scan either code open the{" "}
                <strong>menu</strong> for this table. Set{" "}
                <code className="barcode-code">CLEINT_URL</code> on the server
                to your customer app URL (e.g.{" "}
                <code className="barcode-code">http://192.168.x.x:5173</code>).
              </p>
            </div>
          </div>
        </header>

        <div className="barcode-controls">
          <label className="barcode-label" htmlFor="barcode-table">
            Table number or label
          </label>
          <div className="barcode-row">
            <input
              id="barcode-table"
              type="text"
              className="barcode-input"
              placeholder="e.g. 5 or A12"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
            />
            <button
              type="button"
              className="barcode-btn"
              onClick={generate}
              disabled={loading || !tableId.trim()}
            >
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
          {error ? <p className="barcode-error">{error}</p> : null}
        </div>

        {payload ? (
          <section className="barcode-results" aria-live="polite">
            <p className="barcode-table-tag">Table · {payload.tableId}</p>
            <div className="barcode-grid">
              <figure className="barcode-card">
                <figcaption>Barcode (CODE128)</figcaption>
                {payload.barcodeImage ? (
                  <img
                    src={payload.barcodeImage}
                    alt={`Barcode linking to menu for table ${payload.tableId}`}
                    className="barcode-img barcode-img--wide"
                  />
                ) : null}
              </figure>
              <figure className="barcode-card">
                <figcaption>QR code</figcaption>
                {payload.qrImage ? (
                  <img
                    src={payload.qrImage}
                    alt={`QR for table ${payload.tableId}`}
                    className="barcode-img barcode-img--qr"
                  />
                ) : null}
              </figure>
            </div>
            <div className="barcode-link-row">
              <code className="barcode-link">{payload.link}</code>
              <button type="button" className="barcode-btn barcode-btn--ghost" onClick={copyLink}>
                Copy link
              </button>
            </div>
            <p className="barcode-footnote">
              Scanning opens the guest menu; the table field in checkout is filled from this link when possible.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default BarcodeMenu;
