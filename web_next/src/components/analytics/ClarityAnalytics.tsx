"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "@/lib/router";
import { clarityInitSnippet, isTrackablePath, isValidProjectId } from "@/lib/clarity";

const PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

/**
 * Microsoft Clarity — heatmaps + session recordings, scoped to public pages.
 *
 * Renders nothing unless `NEXT_PUBLIC_CLARITY_PROJECT_ID` is set (mirroring how
 * the root layout omits the Google verification tag), so local dev and any
 * deployment without the var are simply untracked.
 *
 * ## Why start/stop, and not just mounting the <Script>
 *
 * Clarity's tag hooks the History API and keeps recording across client-side
 * navigations. Unmounting a <Script> does NOT unload it. So gating on mount
 * alone would mean a visitor who lands on "/" and then opens /app/messages is
 * still being recorded — capturing private clinical DMs, which is exactly what
 * this integration must never do.
 *
 * The route guard is therefore an explicit `clarity("stop")` on every navigation
 * away from a public route, and `clarity("start")` on the way back. The tag is
 * loaded once, latched, and never re-injected.
 *
 * Calls made before the tag finishes downloading are safe: the inline snippet
 * installs a queueing stub, so a `stop` issued during a fast navigation is
 * replayed in order once the real tag boots.
 */
export default function ClarityAnalytics() {
  // usePathname, NOT useLocation: this is mounted in the root layout, and
  // useLocation() also reads useSearchParams(), which would bail every static
  // page out of prerendering.
  const pathname = usePathname();
  const [loaded, setLoaded] = useState(false);

  const enabled = isValidProjectId(PROJECT_ID);
  const trackable = enabled && isTrackablePath(pathname);

  // Latch: inject the tag the first time a public route is seen, then keep it.
  // A visitor who deep-links straight into /app never loads Clarity at all.
  useEffect(() => {
    if (trackable) setLoaded(true);
  }, [trackable]);

  // The actual guarantee that /app/*, /onboarding and the admin console are
  // never captured.
  useEffect(() => {
    if (!loaded) return;
    const clarity = (window as any).clarity;
    if (typeof clarity !== "function") return;
    try {
      clarity(trackable ? "start" : "stop");
    } catch { /* analytics must never break the app */ }
  }, [loaded, trackable]);

  const snippet = loaded ? clarityInitSnippet(PROJECT_ID) : null;
  if (!snippet) return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: snippet }} />
  );
}
