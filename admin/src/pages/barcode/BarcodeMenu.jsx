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
  
  // Separate states for main menu QR and generated table QRs
  const [mainPayload, setMainPayload] = useState(null);
  const [tablePayloads, setTablePayloads] = useState([]);

  const generate = async (overrideId, isMain = false) => {
    const id = typeof overrideId === "string" ? overrideId.trim() : tableId.trim();
    
    // For non-main generations, do not trigger loading if input is empty
    if (!isMain && !id) {
      setError("Please enter a table number or label.");
      return;
    }

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
      
      const newPayload = {
        tableId: id,
        link: qrRes.data?.link,
        qrImage: qrRes.data?.qrImage,
      };

      if (isMain) {
        setMainPayload(newPayload);
      } else {
        setTablePayloads((prev) => {
          // If table QR code is already in the list, update it, otherwise prepend it
          const existsIdx = prev.findIndex((item) => String(item.tableId).toLowerCase() === String(id).toLowerCase());
          if (existsIdx > -1) {
            const updated = [...prev];
            updated[existsIdx] = newPayload;
            return updated;
          }
          return [newPayload, ...prev];
        });
        setTableId(""); // Reset input field for convenience
      }
    } catch (e) {
      console.error(e);
      setError(
        e.response?.data?.message ||
          e.response?.data?.error ||
          e.message ||
          "Could not generate codes. Check server and CLEINT_URL.",
      );
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Generate restaurant main QR code on mount
    generate("", true);
  }, []);

  const copyLink = async (payload) => {
    if (!payload?.link) return;
    try {
      await navigator.clipboard.writeText(payload.link);
      alert("Link copied.");
    } catch {
      alert(payload.link);
    }
  };

  const downloadQrPng = (payload) => {
    if (!payload?.qrImage) return;
    const link = document.createElement("a");
    link.href = payload.qrImage;
    link.download = `qr-${payload.tableId || "restaurant"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPdf = (payload) => {
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

        {/* Restaurant Main QR Code: Permanently displayed */}
        {mainPayload && (
          <section className="barcode-results" style={{ marginBottom: "28px" }} aria-live="polite">
            <p className="barcode-table-tag">Restaurant Main Menu Link (Always Available)</p>
            <div className="barcode-grid">
              <figure className="barcode-card">
                <figcaption>Restaurant Main QR Code</figcaption>
                {mainPayload.qrImage ? (
                  <img
                    src={mainPayload.qrImage}
                    alt="Restaurant Main QR"
                    className="barcode-img barcode-img--qr"
                  />
                ) : null}
              </figure>
            </div>
            <div className="barcode-link-row">
              <code className="barcode-link">{mainPayload.link}</code>
              <button type="button" className="barcode-btn barcode-btn--ghost" onClick={() => copyLink(mainPayload)}>
                Copy link
              </button>
              <button
                type="button"
                className="barcode-btn barcode-btn--ghost"
                onClick={() => downloadQrPng(mainPayload)}
              >
                Download PNG
              </button>
              <button
                type="button"
                className="barcode-btn barcode-btn--ghost"
                onClick={() => downloadPdf(mainPayload)}
              >
                Download PDF
              </button>
            </div>
          </section>
        )}

        {/* Input area to generate additional table QR codes */}
        <div className="barcode-controls" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
          <label className="barcode-label" htmlFor="barcode-table">
            Generate Table QR code (adds additionally below)
          </label>
          <div className="barcode-row">
            <input
              id="barcode-table"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="barcode-input"
              placeholder="e.g. 1, 2, 3"
              value={tableId}
              onChange={(e) => setTableId(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") generate();
              }}
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

        {/* List of dynamically generated table QRs */}
        {tablePayloads.length > 0 && (
          <div className="barcode-table-results-section">
            <div className="barcode-table-results-header">
              <h2 className="barcode-subtitle">Generated Table QR Codes</h2>
              <button
                type="button"
                className="barcode-btn barcode-btn--clear"
                onClick={() => setTablePayloads([])}
              >
                Clear List
              </button>
            </div>
            <div className="barcode-tables-grid">
              {tablePayloads.map((payload) => (
                <article className="barcode-table-item-card" key={payload.tableId}>
                  <div className="barcode-table-item-header">
                    <h3>Table · {payload.tableId}</h3>
                  </div>
                  <div className="barcode-table-item-body">
                    {payload.qrImage && (
                      <img
                        src={payload.qrImage}
                        alt={`QR for table ${payload.tableId}`}
                        className="barcode-table-item-img"
                      />
                    )}
                    <code className="barcode-table-item-link">{payload.link}</code>
                  </div>
                  <div className="barcode-table-item-actions">
                    <button
                      type="button"
                      className="barcode-btn barcode-btn--ghost btn-sm"
                      onClick={() => copyLink(payload)}
                      title="Copy QR Code Link"
                    >
                      Copy Link
                    </button>
                    <button
                      type="button"
                      className="barcode-btn barcode-btn--ghost btn-sm"
                      onClick={() => downloadQrPng(payload)}
                      title="Download as PNG"
                    >
                      PNG
                    </button>
                    <button
                      type="button"
                      className="barcode-btn barcode-btn--ghost btn-sm"
                      onClick={() => downloadPdf(payload)}
                      title="Download as PDF"
                    >
                      PDF
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: "24px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
          <p className="barcode-footnote">
            Scanning table QR codes opens the guest menu with the table reference automatically attached to client checkouts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeMenu;
