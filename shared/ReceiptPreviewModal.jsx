import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  mountReceiptPreview,
  downloadOrderReceiptPdf,
} from "./orderReceiptPdf.js";
import "./ReceiptPreviewModal.css";

/**
 * Modal: shows thermal-style receipt preview, then optional PDF download.
 * @param {{ order: Record<string, unknown> | null, onClose: () => void }} props
 */
export default function ReceiptPreviewModal({ order, onClose }) {
  const viewportRef = useRef(null);
  const printTimeRef = useRef(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

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
        await mountReceiptPreview(host, order, stamp);
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
  }, [order]);

  useEffect(() => {
    if (!order) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order, onClose]);

  async function handleDownload() {
    if (!order || downloadBusy || previewBusy) return;
    setDownloadBusy(true);
    try {
      await downloadOrderReceiptPdf(order, {
        printTime: printTimeRef.current || undefined,
      });
    } catch (e) {
      console.error(e);
      alert("Could not save PDF. Try again or use another browser.");
    } finally {
      setDownloadBusy(false);
    }
  }

  if (!order) return null;

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
          <h2 id="rcp-title-el" className="rcp-title">
            Receipt preview
          </h2>
          <button type="button" className="rcp-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="rcp-scroll-wrap">
          {previewBusy ? (
            <div className="rcp-loading">Loading preview…</div>
          ) : null}
          <div
            ref={viewportRef}
            className="rcp-receipt-mount"
            aria-busy={previewBusy || undefined}
          />
        </div>
        <div className="rcp-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rcp-btn-primary"
            disabled={previewBusy || downloadBusy}
            onClick={handleDownload}
          >
            {downloadBusy ? "Saving PDF…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
