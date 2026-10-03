"use client";
import { useEffect, useState } from "react";
import { Mail, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import MarketingShell from "@/components/marketing/MarketingShell";
import { Display, Eyebrow, enter } from "@/components/marketing/Type";

/**
 * Public document shell for /privacy, /terms and /help, in the marketing frame
 * (fixed nav, motion, parallax footer): eyebrow + display title that enter on
 * load, a sticky "On this page" jump nav with scroll-spy (desktop), jump chips
 * (tablet/phone), numbered icon sections that fade in on scroll, and the
 * contact card. No auth required; safe to index and share.
 */
export default function LegalShell({ eyebrow, title, updated, intro, sections, children, contact = true }) {
  const [active, setActive] = useState(sections?.[0]?.id);

  // scroll-spy for the jump nav
  useEffect(() => {
    if (!sections?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [sections]);

  const e = { eyebrow: enter(0.4, "above"), title: enter(0.4), meta: enter(0.6), body: enter(0.6, "none"), aside: enter(0.8) };

  return (
    <MarketingShell>
      <section className="mk-top">
        <div className="mk-container flex flex-col gap-14">
          {eyebrow && <Eyebrow className={e.eyebrow.className} style={e.eyebrow.style}>{eyebrow}</Eyebrow>}

          <div className="flex max-w-3xl flex-col gap-6">
            <Display as="h1" className={e.title.className} style={e.title.style}>{title}</Display>
            {(updated || intro) && (
              <div className={cn("flex flex-col gap-4", e.meta.className)} style={e.meta.style}>
                {updated && <p className="t-small text-ink-500">{updated}</p>}
                {intro && <div className="max-w-[640px] space-y-3 t-body text-ink-600">{intro}</div>}
              </div>
            )}
          </div>

          <div className="grid gap-12 desk:grid-cols-[260px_1fr] desk:gap-24">
            {/* On this page (desktop) */}
            {sections?.length > 0 && (
              <aside className={cn("sticky top-40 hidden h-fit desk:block", e.aside.className)} style={e.aside.style}>
                <p className="t-eyebrow !text-ink-500">On this page</p>
                <nav className="no-scrollbar mt-4 max-h-[calc(100vh-14rem)] space-y-1 overflow-y-auto pr-1" data-lenis-prevent>
                  {sections.map((s, i) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      data-cursor="snap"
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-300 ease-reveal",
                        active === s.id ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-500 hover:bg-ink-900/[.03] hover:text-ink-900"
                      )}
                    >
                      <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-bold transition-colors duration-300", active === s.id ? "bg-brand-600 text-white" : "bg-ink-900/[.06] text-ink-500")}>{i + 1}</span>
                      <span className="truncate">{s.title}</span>
                    </a>
                  ))}
                </nav>
              </aside>
            )}

            <div className={cn("min-w-0 max-w-3xl", e.body.className, !sections?.length && "desk:col-span-2")} style={e.body.style}>
              {/* jump chips (tablet/phone) */}
              {sections?.length > 0 && (
                <div className="no-scrollbar -mx-1 mb-10 flex gap-2 overflow-x-auto px-1 desk:hidden">
                  {sections.map((s) => (
                    <a key={s.id} href={`#${s.id}`} className="chip shrink-0 bg-ink-50 text-ink-600 ring-1 ring-ink-900/[.06]">{s.title}</a>
                  ))}
                </div>
              )}

              <div className="space-y-14">
                {sections?.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <section key={s.id} id={s.id} className="mk-reveal scroll-mt-32">
                      <h2 className="flex items-center gap-4 t-title text-ink-900">
                        {Icon && <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon size={19} /></span>}
                        <span><span className="mr-2 text-brand-600">{String(i + 1).padStart(2, "0")}</span>{s.title}</span>
                      </h2>
                      <div className="prose-dok mt-5 space-y-3 t-body text-ink-700">{s.body}</div>
                    </section>
                  );
                })}
                {children}
              </div>

              {contact && (
                <div className="mk-reveal mt-16 flex flex-col items-start gap-4 rounded-2xl border border-ink-900/[.06] bg-ink-50 p-6 tab:flex-row tab:items-center">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-600 text-white"><Mail size={20} /></span>
                  <div className="flex-1">
                    <p className="t-body font-semibold text-ink-900">Questions about these terms?</p>
                    <p className="t-small text-ink-600">Reach our team at <a href="mailto:support@orovion.com" className="link-u font-semibold text-brand-600">support@orovion.com</a> — we reply within 2 business days.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

/** Plain bullet list for enumerations without lead-in labels. */
export function Bullets({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Review required" callout for policy areas still being finalized. */
export function Note({ title = "Review required", children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-warning-500/20 bg-warning-50 p-3.5 text-sm text-ink-700">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning-500" />
      <span><strong className="font-semibold text-warning-700">{title}.</strong> {children}</span>
    </div>
  );
}

/** Checkmark bullet list matching the Figma legal screens. */
export function CheckList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map(([head, rest], i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M2.5 6.2 5 8.7l4.5-5.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span><strong className="font-semibold text-ink-900">{head}</strong>{rest ? <> — {rest}</> : null}</span>
        </li>
      ))}
    </ul>
  );
}
