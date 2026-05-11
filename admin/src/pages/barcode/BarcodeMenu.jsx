import React, { useContext, useState } from "react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import { AuthContext } from "../../context/AuthContext";
import { getStaffTenantHeaders } from "../../utils/apiBaseUrl.js";
import { FaBarcode } from "react-icons/fa";
import "./BarcodeMenu.css";

const BarcodeMenu = () => {
  const { admin, URL } = useContext(AuthContext);
  const [tableId, setTableId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const generate = async (overrideId) => {
    const id = typeof overrideId === "string" ? overrideId.trim() : tableId.trim();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("token")?.trim();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...getStaffTenantHeaders(),
    };

    try {
      const query = id ? `?table=${encodeURIComponent(id)}` : "";
      const qrRes = await axios.get(`${URL}/api/qr/generate${query}`, { headers });
      setPayload({
        tableId: id,
        link: qrRes.data?.link,
        qrImage: qrRes.data?.qrImage,
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

  React.useEffect(() => {
    generate("");
  }, []);

  const copyLink = async () => {
    if (!payload?.link) return;
    try {
      await navigator.clipboard.writeText(payload.link);
      alert("Link copied.");
    } catch {
      alert(payload.link);
    }
  };

  const downloadQrPng = () => {
    if (!payload?.qrImage) return;
    const link = document.createElement("a");
    link.href = payload.qrImage;
    link.download = `qr-${payload.tableId || "restaurant"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPdf = () => {
    if (!payload) return;
    const element = document.createElement("div");
    element.innerHTML = `
      <div style="text-align: center; font-family: sans-serif; padding: 40px;">
        <h2 style="font-size: 24px; margin-bottom: 20px; color: #111;">
          ${payload.tableId ? `Table: ${payload.tableId}` : "Restaurant Menu"}
        </h2>
        ${
          payload.qrImage
            ? `<img src="${payload.qrImage}" style="width: 300px; max-width: 100%;" />`
            : ""
        }

        <p style="margin-top: 30px; font-size: 14px; color: #555; word-break: break-all;">
          ${payload.link}
        </p>
      </div>
    `;
    
    html2pdf().set({
      margin: 1,
      filename: `menu-qr-${payload.tableId || "restaurant"}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save();
  };

  if (!admin || !["admin", "owner", "manager"].includes(admin.role)) {
    return (
      <div className="barcode-page">
        <div className="barcode-container barcode-container--narrow">
          <p className="barcode-denied">Owner, manager, or admin access required.</p>
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
              <h1 className="barcode-title">Table QR code</h1>
              <p className="barcode-lead">
                Guests who scan the QR code open the{" "}
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
            Optional table id, code, or label (leave blank for restaurant QR)
          </label>
          <div className="barcode-row">
            <input
              id="barcode-table"
              type="text"
              className="barcode-input"
              placeholder="Optional: 5, A12, or table id"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
            />
            <button
              type="button"
              className="barcode-btn"
              onClick={() => generate()}
              disabled={loading}
            >
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
          {error ? <p className="barcode-error">{error}</p> : null}
        </div>

        {payload ? (
          <section className="barcode-results" aria-live="polite">
            <p className="barcode-table-tag">
              {payload.tableId ? `Table · ${payload.tableId}` : "Restaurant Menu Link"}
            </p>
            <div className="barcode-grid">

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
              <button
                type="button"
                className="barcode-btn barcode-btn--ghost"
                onClick={downloadQrPng}
              >
                Download PNG
              </button>
              <button
                type="button"
                className="barcode-btn barcode-btn--ghost"
                onClick={downloadPdf}
              >
                Download PDF
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
