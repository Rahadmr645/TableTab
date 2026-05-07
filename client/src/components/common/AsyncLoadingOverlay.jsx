import { createPortal } from "react-dom";
import "./AsyncLoadingOverlay.css";

/**
 * Full-viewport loading layer (portaled to document.body).
 * Use while async work runs so the UI cannot be interacted with underneath.
 */
export default function AsyncLoadingOverlay({ open, message }) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="async-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message || "Loading"}
    >
      <div className="async-loading-card">
        <div className="async-loading-spinner" aria-hidden />
        {message ? <p className="async-loading-msg">{message}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
