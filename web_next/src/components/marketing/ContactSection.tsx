"use client";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { Accent, Display, Eyebrow, enter } from "./Type";
import { TrustBlock } from "./Trust";
import ContactForm from "./ContactForm";
import ReachUs from "./ReachUs";

type Motion = { className: string; style?: CSSProperties };
const none: Motion = { className: "" };

/**
 * The reference "Book a session" block: eyebrow, then a 6/1/5 split with the
 * intro and a sticky trust block on the left and the enquiry form on the
 * right. Phones order it intro → form → trust.
 *
 * `page` mode is the top of /contact: h1, page-load entrances, top padding
 * that clears the fixed nav. Otherwise it is a closing section (h2, scroll
 * reveals) — used at the end of the home page.
 */
export default function ContactSection({ page = false, id }: { page?: boolean; id?: string }) {
  const e: Record<string, Motion> = page
    ? { eyebrow: enter(0.4, "above"), title: enter(0.4), intro: enter(0.6), form: enter(0.6, "none"), trust: enter(0.8) }
    : { eyebrow: { className: "mk-reveal" }, title: { className: "mk-reveal" }, intro: { className: "mk-reveal" }, form: none, trust: none };

  return (
    <section id={id} className={cn("relative scroll-mt-24", page ? "mk-top" : "mk-section")}>
      <div className="mk-container flex flex-col gap-14">
        <Eyebrow className={e.eyebrow.className} style={e.eyebrow.style}>Contact us</Eyebrow>

        <div className="mk-split" style={{ ["--mk-gap" as string]: "64px" }}>
          <div className="flex flex-col gap-10 tab:gap-20">
            <div className="flex flex-col gap-6">
              <Display as={page ? "h1" : "h2"} className={e.title.className} style={e.title.style}>
                Every question deserves <Accent>a&nbsp;real answer.</Accent>
              </Display>
              <p className={cn("max-w-[480px] t-body text-ink-600", e.intro.className)} style={e.intro.style}>
                Whether you’re a clinician exploring verification, a hospital planning a
                partnership, or a patient with a question about consultations — a real person
                on our team reads every message. Use the form and we’ll reply within two
                business days.
              </p>
            </div>
            <div className={cn("sticky top-40 z-[1] hidden flex-col gap-20 tab:flex", e.trust.className)} style={e.trust.style}>
              <TrustBlock />
              <ReachUs />
            </div>
          </div>

          <div className={e.form.className} style={e.form.style}>
            <ContactForm />
          </div>
        </div>

        <div className="flex flex-col gap-20 tab:hidden">
          <TrustBlock />
          <ReachUs />
        </div>
      </div>
    </section>
  );
}
