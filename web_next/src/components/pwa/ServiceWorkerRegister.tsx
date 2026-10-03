"use client";

import { useEffect } from "react";

/**
 * Registers the app-shell service worker (public/sw.js) so the site loads
 * offline after a first visit. Registered in production only — a SW in `next dev`
 * intercepts HMR/websocket traffic and makes local development confusing. Renders
 * nothing. See src/lib/offline.ts for the caching strategy it mirrors.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[sw] registration failed:", err?.message || err));
    };

    // Register after load so it never competes with the initial render/hydration.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
