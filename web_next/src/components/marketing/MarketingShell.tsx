import type { ReactNode } from "react";
import NavArrows from "@/components/ui/NavArrows";
import MotionRoot from "./MotionRoot";
import Cursor from "./Cursor";
import BlurGradient from "./BlurGradient";
import SiteNav from "./SiteNav";
import SiteFooter from "./SiteFooter";

/**
 * Page frame for every public marketing page: motion runtime (Lenis + scroll
 * reveals), the custom cursor, the progressive blur strip, the fixed nav, the
 * page content and the parallax footer. Pages start their first section with `mk-top`, whose
 * 160px top padding clears the fixed nav.
 */
export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    // `isolate` makes this the stacking context, so fixed background layers
    // with a negative z-index (the home page's thread waves) paint above the
    // page background but below every section.
    <div className="isolate min-h-screen overflow-x-clip bg-surface selection:bg-brand-600 selection:text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-700 focus:shadow-card">
        Skip to content
      </a>
      <MotionRoot />
      <Cursor />
      <BlurGradient />
      <NavArrows variant="floating" />
      <SiteNav />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
