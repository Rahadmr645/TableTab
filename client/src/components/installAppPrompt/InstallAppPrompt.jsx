import React, { useEffect, useRef, useState } from "react";
import "./InstallAppPrompt.css";

function isIos() {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function alreadyInstalled() {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if (window.navigator.standalone === true) return true;
  return false;
}

const InstallAppPrompt = () => {
  const deferredRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [installReady, setInstallReady] = useState(false);
  const [installed, setInstalled] = useState(alreadyInstalled());

  useEffect(() => {
    if (alreadyInstalled()) {
      setInstalled(true);
      return;
    }

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredRef.current = e;
      setInstallReady(true);
      setVisible(true);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setInstallReady(false);
      deferredRef.current = null;
    };

    // Show prompt-like card on open for users who have not installed yet.
    // This behaves similar to a permission request style UX.
    const startTimer = window.setTimeout(() => {
      if (!alreadyInstalled()) setVisible(true);
    }, 1200);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.clearTimeout(startTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const ev = deferredRef.current;
    if (!ev) {
      window.alert(
        "Direct install prompt is not available yet. Please open this site from HTTPS (or localhost preview) and then use browser menu: Install app / Add to Home Screen.",
      );
      return;
    }
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice?.outcome === "accepted") {
        setVisible(false);
      }
    } catch {
      // User cancelled or prompt failed silently
    }
    deferredRef.current = null;
    setInstallReady(false);
  };

  if (installed || !visible) return null;

  if (isIos()) {
    return (
      <div className="install-pwa" role="dialog" aria-labelledby="install-pwa-title">
        <div className="install-pwa__card install-pwa__card--compact">
          <p id="install-pwa-title" className="install-pwa__subtitle">
            Install this app: tap <span className="install-pwa__share">Share</span> or{" "}
            <span className="install-pwa__share">⋯</span> then{" "}
            <span className="install-pwa__share">Add to Home Screen</span>. It opens as
            a real full-screen app.
          </p>
          <button
            type="button"
            className="install-pwa__close"
            onClick={() => setVisible(false)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="install-pwa" role="dialog" aria-labelledby="install-pwa-title">
      <div className="install-pwa__card">
        <div className="install-pwa__text">
          <p id="install-pwa-title" className="install-pwa__title">
            Install TableTab App
          </p>
          <p className="install-pwa__subtitle">
            {installReady
              ? "Open TableTab as a full app (no browser bar)."
              : "To install, open browser menu and choose Install app / Add to Home screen."}
          </p>
        </div>
        <div className="install-pwa__actions">
          <button
            type="button"
            className="install-pwa__btn install-pwa__btn--ghost"
            onClick={() => setVisible(false)}
          >
            Later
          </button>
          <button
            type="button"
            className="install-pwa__btn install-pwa__btn--primary"
            onClick={handleInstallClick}
          >
            {installReady ? "Install now" : "Install now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppPrompt;
