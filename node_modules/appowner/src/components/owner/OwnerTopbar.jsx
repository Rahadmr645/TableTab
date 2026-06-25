import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getPlatformTokenPayload } from "../../utils/decodePlatformToken.jsx";
import "./OwnerTopbar.css";

function emailInitials(email) {
  const e = String(email || "").trim();
  if (!e) return "?";
  const local = e.split("@")[0] || e;
  const parts = local.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  const one = parts[0] || local;
  if (one.length >= 2) return one.slice(0, 2).toUpperCase();
  return (one[0] + one[0]).toUpperCase();
}

function Chevron({ open }) {
  return (
    <svg
      className={`ob-chevron ${open ? "ob-chevron--open" : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OwnerTopbar({ onLogout }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();
  const payload = getPlatformTokenPayload();
  const email = payload?.email || "";
  const initials = emailInitials(email);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="ob-bar">
      <div className="ob-bar-inner" ref={rootRef}>
        <Link to="/" className="ob-brand-link">
          <div className="ob-brand">
            <span className="ob-brand-mark" aria-hidden>
              TT
            </span>
            <div>
              <div className="ob-brand-name">TableTab</div>
              <div className="ob-brand-tag">Platform owner</div>
            </div>
          </div>
        </Link>

        <div className="ob-actions">
          <div className="ob-profile-wrap">
            <button
              type="button"
              className={`ob-profile-trigger ${open ? "ob-profile-trigger--open" : ""}`}
              aria-expanded={open}
              aria-haspopup="dialog"
              aria-controls={menuId}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="ob-avatar" aria-hidden title={email || "Account"}>
                {initials}
              </span>
              <span className="ob-profile-text">
                <span className="ob-profile-label">Account</span>
                <span className="ob-profile-email">{email || "Signed in"}</span>
              </span>
              <Chevron open={open} />
            </button>

            {open ? (
              <div
                id={menuId}
                className="ob-profile-panel"
                role="dialog"
                aria-label="Profile"
              >
                <div className="ob-panel-header">
                  <span className="ob-avatar ob-avatar--lg" aria-hidden>
                    {initials}
                  </span>
                  <div className="ob-panel-titles">
                    <div className="ob-panel-name">Platform owner</div>
                    <div className="ob-panel-email">{email || "—"}</div>
                  </div>
                </div>
                <p className="ob-panel-desc">
                  You are signed in with full access to the owner console, tenant directory, and
                  per-restaurant usage.
                </p>
                <div className="ob-panel-meta">
                  <span className="ob-pill">Owner access</span>
                  <span className="ob-pill ob-pill--muted">TableTab platform</span>
                </div>
                <div className="ob-panel-footer">
                  <button type="button" className="ob-btn-logout" onClick={onLogout}>
                    Log out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
