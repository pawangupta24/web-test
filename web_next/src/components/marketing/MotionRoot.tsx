"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DESKTOP = "(min-width: 1200px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
/** Fixed nav height + breathing room, so anchor targets don't hide under the bar. */
const ANCHOR_OFFSET = -96;

/**
 * Motion runtime for the marketing pages. Renders nothing; it
 *  1. runs Lenis smooth scrolling on desktop only (tablet/phone keep native
 *     scrolling, as in the reference), and never under reduced motion;
 *  2. drives every `.mk-reveal` element: `is-in` is added while any part of the
 *     element is in view and removed the moment it leaves, so reveals replay
 *     on every re-entry. New nodes (route changes, accordions) are picked up
 *     by a MutationObserver.
 */
export default function MotionRoot() {
  const pathname = usePathname();

  // ── Lenis ────────────────────────────────────────────────────────────
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP);
    const reduced = window.matchMedia(REDUCED);
    let lenis: { destroy(): void } | null = null;
    let cancelled = false;

    const sync = async () => {
      const want = desktop.matches && !reduced.matches;
      if (want && !lenis) {
        const { default: Lenis } = await import("lenis");
        if (cancelled || lenis) return;
        lenis = new Lenis({ duration: 2, smoothWheel: true, autoRaf: true, anchors: { offset: ANCHOR_OFFSET }, stopInertiaOnNavigate: true });
      } else if (!want && lenis) {
        lenis.destroy();
        lenis = null;
      }
    };
    sync();
    desktop.addEventListener("change", sync);
    reduced.addEventListener("change", sync);
    return () => {
      cancelled = true;
      desktop.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
      lenis?.destroy();
    };
  }, []);

  // ── scroll reveals ───────────────────────────────────────────────────
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("is-in", e.isIntersecting)),
      { threshold: 0 }
    );
    const seen = new WeakSet<Element>();
    const scan = (root: ParentNode) => {
      root.querySelectorAll(".mk-reveal").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };
    scan(document);
    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => {
        if (!(n instanceof Element)) return;
        if (n.classList.contains("mk-reveal") && !seen.has(n)) { seen.add(n); io.observe(n); }
        scan(n);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);

  return null;
}
