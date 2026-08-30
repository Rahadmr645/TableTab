/**
 * TableTab Professional PWA Auto-Updater
 * Automatically detects, downloads, activates, and applies updates across all installed PWA devices.
 */

import { registerSW } from "virtual:pwa-register";

let swRegistration = null;
let isRefreshing = false;

export function initPwaAutoUpdater(options = {}) {
  const appName = options.appName || "TableTab";
  const checkIntervalMs = options.checkIntervalMs || 60 * 1000; // Check every 60 seconds

  if (!("serviceWorker" in navigator)) {
    console.info(`[PWA - ${appName}] Service Workers not supported on this platform.`);
    return null;
  }

  // Handle immediate refresh when new Service Worker takes control
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (isRefreshing) return;
    isRefreshing = true;

    const lastReload = Number(sessionStorage.getItem("tabletab_sw_last_reload") || 0);
    const now = Date.now();

    // Prevent reload loop within 5 seconds
    if (now - lastReload > 5000) {
      sessionStorage.setItem("tabletab_sw_last_reload", now.toString());
      console.info(`[PWA - ${appName}] New version activated. Reloading app automatically...`);
      window.location.reload();
    }
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.info(`[PWA - ${appName}] New update found! Activating immediately...`);
      updateSW(true);
    },
    onOfflineReady() {
      console.info(`[PWA - ${appName}] App ready for offline use.`);
    },
    onRegisteredSW(swScriptUrl, registration) {
      swRegistration = registration;
      console.info(`[PWA - ${appName}] Service Worker registered: ${swScriptUrl}`);

      if (!registration) return;

      // 1. Periodic background check for updates
      const intervalId = setInterval(async () => {
        try {
          if (navigator.onLine) {
            await registration.update();
          }
        } catch (err) {
          console.debug(`[PWA - ${appName}] Periodic update check skipped:`, err?.message);
        }
      }, checkIntervalMs);

      // 2. Check for updates whenever user returns to the app / turns screen on
      document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState === "visible" && navigator.onLine) {
          try {
            await registration.update();
          } catch (err) {
            console.debug(`[PWA - ${appName}] Visibility update check skipped:`, err?.message);
          }
        }
      });

      // 3. Check for updates immediately when device regains Wi-Fi / internet
      window.addEventListener("online", async () => {
        try {
          console.info(`[PWA - ${appName}] Network restored. Checking for updates...`);
          await registration.update();
        } catch (err) {
          console.debug(`[PWA - ${appName}] Online update check skipped:`, err?.message);
        }
      });
    },
    onRegisterError(error) {
      console.warn(`[PWA - ${appName}] Service Worker registration failed:`, error);
    },
  });

  // Global trigger for manual or socket-driven instant remote update
  window.__tabletab_force_pwa_update = async () => {
    if (swRegistration && navigator.onLine) {
      console.info(`[PWA - ${appName}] Triggering remote PWA update check...`);
      try {
        await swRegistration.update();
      } catch (e) {
        console.warn("Manual PWA update check error:", e);
      }
    }
    updateSW(true);
  };

  return updateSW;
}
