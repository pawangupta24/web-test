"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { NAV_LINKS } from "@/lib/marketing";
import { WipeLink } from "./Links";
import PillButton from "./PillButton";

/**
 * Full-screen menu for tablet and phone (reference timings):
 *  open  — the sheet drops from the top (0.6s spring), the content fades in
 *          after 0.2s, then the links rise 20px one by one (0.4s → 0.8s);
 *  close — the content fades (0.6s), then the sheet lifts away after 0.2s.
 * Esc closes it, page scroll is locked while open, focus moves into the menu
 * and returns to the toggle on close. The nav bar stays above the sheet.
 */
export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // close on route change
  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Closed menu is unreachable by keyboard / AT. (`inert` isn't a React 18 prop.)
  useEffect(() => {
    if (ref.current) ref.current.inert = !open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => ref.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true }), 250);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
      document.querySelector<HTMLElement>("[data-menu-toggle]")?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  return (
    <div id="mk-mobile-menu" className="mk-menu desk:hidden" data-open={open} aria-hidden={!open} ref={ref}>
      <div className="mk-menu__sheet" />
      <nav aria-label="Menu" className="mk-menu__content relative grid h-full place-items-center px-4 pt-[69px] tab:pt-[79px]">
        <ul className="flex flex-col items-center gap-12 text-center">
          {NAV_LINKS.map((l, i) => (
            <li key={l.href} className="mk-menu__item" style={{ ["--mk-d" as string]: `${0.4 + i * 0.1}s` }}>
              <WipeLink href={l.href} onClick={onClose} className="font-sans text-xl font-semibold uppercase leading-[1.4] tracking-[.11em] text-ink-900">
                {l.label}
              </WipeLink>
            </li>
          ))}
          <li className="mk-menu__item" style={{ ["--mk-d" as string]: `${0.4 + NAV_LINKS.length * 0.1}s` }}>
            <PillButton to="/login" onClick={onClose}>Join Orovion</PillButton>
          </li>
        </ul>
      </nav>
    </div>
  );
}
