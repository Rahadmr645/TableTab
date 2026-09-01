import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  mountReceiptPreview,
  downloadOrderReceiptPdf,
  printOrderReceipt,
} from "./orderReceiptPdf.js";
import "./ReceiptPreviewModal.css";

/**
 * Modal: shows thermal-style receipt preview, then optional PDF download or direct printing.
 * @param {{ order: Record<string, unknown> | null, businessName?: string, logoUrl?: string, taxNumber?: string, onClose: () => void }} props
 */
export default function ReceiptPreviewModal({ order, businessName, logoUrl, taxNumber, onClose }) {
  const viewportRef = useRef(null);
  const printTimeRef = useRef(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);

  const resolvedTaxNumber =
    taxNumber ||
    order?.taxNumber ||
    order?.taxId ||
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem("tabletab_public_tenant_tax_number")) ||
    undefined;
  const resolvedBizName = businessName || order?.businessName || order?.cafeName || undefined;

  useLayoutEffect(() => {
    if (!order) return undefined;

    printTimeRef.current = new Date();

    /** @type {boolean} */
    let cancelled = false;

    const stamp = printTimeRef.current;
    async function fill() {
      const host = viewportRef.current;
      if (!host || cancelled) return;
      setPreviewBusy(true);
      try {
        await mountReceiptPreview(host, order, stamp, { businessName: resolvedBizName, logoUrl, taxNumber: resolvedTaxNumber });
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    }
    fill();

    return () => {
      cancelled = true;
      const el = viewportRef.current;
      if (el) el.innerHTML = "";
    };
  }, [order, resolvedBizName, logoUrl, resolvedTaxNumber]);

  useEffect(() => {
    if (!order) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order, onClose]);

  async function handlePrint() {
    if (!order || printBusy) return;
    setPrintBusy(true);
    try {
      await printOrderReceipt(order, {
        printTime: printTimeRef.current || undefined,
        businessName: resolvedBizName,
        logoUrl,
        taxNumber: resolvedTaxNumber,
      });
    } catch (e) {
      console.error(e);
      window.print();
    } finally {
      setPrintBusy(false);
    }
  }

  async function handleDownload() {
    if (!order || downloadBusy || previewBusy) return;
    setDownloadBusy(true);
    try {
      await downloadOrderReceiptPdf(order, {
        printTime: printTimeRef.current || undefined,
        businessName: resolvedBizName,
        logoUrl,
        taxNumber: resolvedTaxNumber,
      });
    } catch (e) {
      console.error(e);
      alert("Could not save PDF. Try again or use another browser.");
    } finally {
      setDownloadBusy(false);
    }
  }

  if (!order) return null;

  const orderNum = order?.dailyOrderNumber != null ? `#${order.dailyOrderNumber}` : "";

  return (
    <div
      className="rcp-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rcp-title-el"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="rcp-panel">
        <div className="rcp-header">
          <div className="rcp-header-title-group">
            <span className="rcp-pdf-badge">PDF</span>
            <h2 id="rcp-title-el" className="rcp-title">
              Order Slip Preview {orderNum}
            </h2>
          </div>
          <button type="button" className="rcp-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="rcp-scroll-wrap">
          {previewBusy ? (
            <div className="rcp-loading">
              <span className="rcp-spinner" />
              Generating Slip Preview…
            </div>
          ) : null}
          <div
            ref={viewportRef}
            className="rcp-receipt-mount"
            aria-busy={previewBusy || undefined}
          />
        </div>
        <div className="rcp-actions">
          <div className="rcp-actions-top-row">
            <button type="button" className="rcp-btn-cancel" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="rcp-btn-print"
              disabled={previewBusy || printBusy}
              onClick={handlePrint}
            >
              {printBusy ? "Printing…" : "🖨️ Print Slip"}
            </button>
          </div>
          <button
            type="button"
            className="rcp-btn-primary rcp-btn-download"
            disabled={previewBusy || downloadBusy}
            onClick={handleDownload}
          >
            {downloadBusy ? "Downloading PDF…" : "📥 Download PDF Slip"}
          </button>
        </div>
      </div>
    </div>
  );
}
