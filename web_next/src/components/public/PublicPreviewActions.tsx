"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "@/lib/router";
import {
  androidIntentUrl, appSchemeUrl, platformFromUserAgent, storeUrl,
  type AppTarget, type Platform,
} from "@/lib/shareLinks";

/**
 * "Open in the app" / "Get the app" / "Sign up" under a public share-link card.
 *
 * Never hands off automatically: an automatic redirect to the app loops when it
 * isn't installed. "Open in the app" only shows on phones — an intent link with
 * a store fallback on Android, the custom scheme on iOS (where Universal Links
 * have usually opened the app before this page loads at all).
 *
 * A visitor who is already signed in is moved to the full view under /app
 * (`appPath`), using the session AuthProvider restores on every page — no extra
 * request. Without an `appPath` (pulses: /app/pulse can't open one reel) they
 * stay here.
 */
export default function PublicPreviewActions({ target, appPath }: { target: AppTarget; appPath?: string | null }) {
  const { user, loading } = useAuth() || {};
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<Platform>("other");

  // After mount: the server can't know the device, and guessing would mismatch hydration.
  useEffect(() => { setPlatform(platformFromUserAgent(navigator.userAgent)); }, []);

  useEffect(() => {
    if (appPath && !loading && user) navigate(appPath, { replace: true });
    // navigate is a new function every render; the inputs that matter are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appPath, loading, user]);

  const store = storeUrl(platform);
  const openHref = platform === "android" ? androidIntentUrl(target, store) : appSchemeUrl(target);

  return (
    <div className="mt-6 space-y-3">
      {platform !== "other" && (
        <a href={openHref} className="btn-primary w-full py-3 text-[15px]">Open in the app</a>
      )}
      <a href={store} className="btn-outline w-full py-3 text-[15px]">Get the Orovion app</a>
      <p className="text-center text-sm text-ink-500">
        New to Orovion?{" "}
        <a href="/login" className="font-semibold text-brand-700 hover:underline">Sign up</a>
      </p>
    </div>
  );
}
