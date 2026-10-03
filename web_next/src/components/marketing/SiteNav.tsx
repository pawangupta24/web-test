"use client";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { Logo } from "@/components/ui/Primitives";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/marketing";
import { isInsideDarkZone } from "@/lib/motion";
import { useScrollFrame } from "./useScrollFrame";
import { WipeLink } from "./Links";
import { enter } from "./Type";
import PillButton from "./PillButton";
import MobileMenu from "./MobileMenu";

/** Sections mark themselves dark with this attribute; the nav turns white over them. */
export const NAV_DARK_ATTR = "data-nav-dark";
/** Fired by sections whose darkness changes without a scroll (e.g. the hero toggle). */
export const NAV_ZONES_EVENT = "mk:nav-zones";

/**
 * Fixed marketing nav.
 *  · desktop (≥1200): transparent over the progressive blur, links in brand
 *    teal with an underline wipe, items staggered in on load (0.2 → 0.8s), and
 *    a crossfade to an all-white version while it sits over any section marked
 *    `data-nav-dark="true"` (the home hero before its toggle flips, the big
 *    quote, the footer);
 *  · tablet/phone: solid bar with the logo and a dot-swap Menu/Close pill that
 *    opens the full-screen menu.
 */
export default function SiteNav() {
  const [onDark, setOnDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const evaluate = useCallback(() => {
    let dark = false;
    if (window.innerWidth >= 1200) {
      for (const el of document.querySelectorAll(`[${NAV_DARK_ATTR}="true"]`)) {
        const r = el.getBoundingClientRect();
        if (isInsideDarkZone(r.top, r.bottom)) { dark = true; break; }
      }
    }
    setOnDark(dark);
  }, []);
  useScrollFrame(evaluate);
  useEffect(() => {
    window.addEventListener(NAV_ZONES_EVENT, evaluate);
    return () => window.removeEventListener(NAV_ZONES_EVENT, evaluate);
  }, [evaluate]);

  return (
    <>
      <header
        data-on-dark={onDark}
        className="fixed inset-x-0 top-0 z-[70] bg-ink-0 desk:bg-transparent"
      >
        <div className="mx-auto flex h-[69px] max-w-[1600px] items-center justify-between px-4 tab:h-[79px] tab:px-10 desk:h-20 desk:items-end desk:px-16">
          <Link to="/" aria-label="Orovion home" data-cursor="snap" className={enter(0.2).className} style={enter(0.2).style}>
            <span className="relative block">
              <span className={cn("block transition-opacity duration-500 ease-reveal", onDark && "opacity-0")}><Logo size={30} /></span>
              <span className={cn("absolute inset-0 transition-opacity duration-500 ease-reveal", onDark ? "opacity-100" : "opacity-0")} aria-hidden><Logo size={30} light /></span>
            </span>
          </Link>

          {/* desktop */}
          <nav aria-label="Main" className="hidden items-center gap-12 desk:flex">
            <ul className="flex items-center gap-12">
              {NAV_LINKS.map((l, i) => {
                const e = enter(0.4 + i * 0.1);
                return (
                  <li key={l.href} className={e.className} style={e.style}>
                    <WipeLink
                      href={l.href}
                      className={cn("t-eyebrow transition-colors duration-500 ease-reveal", onDark ? "!text-white" : "!text-brand-600")}
                    >
                      {l.label}
                    </WipeLink>
                  </li>
                );
              })}
            </ul>
            <div className={cn("flex items-center gap-3", enter(0.9).className)} style={enter(0.9).style}>
              <ThemeToggle className={cn("mk-snap transition-colors duration-500", onDark && "!text-white hover:!bg-white/10")} />
              <PillButton to="/login" size="sm" variant={onDark ? "light" : "brand"}>Join Orovion</PillButton>
            </div>
          </nav>

          {/* tablet + phone */}
          <div className="flex items-center gap-2 desk:hidden">
            <ThemeToggle className="mk-snap" />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mk-mobile-menu"
              className={cn("pill pill--sm w-[110px]", menuOpen && "is-open")}
              data-menu-toggle
            >
              <span className="pill__label">{menuOpen ? "Close" : "Menu"}</span>
              <span className="pill__dot pill__dot--a" aria-hidden />
              <span className="pill__dot pill__dot--b" aria-hidden />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
