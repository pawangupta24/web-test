import type { ReactNode } from "react";
import type { FaqItem } from "@/lib/faq";
import { Display } from "./Type";
import Accordion from "./Accordion";
import PillButton from "./PillButton";

/**
 * Reference FAQ block on the soft ink-50 band: heading + subtitle pinned top-left,
 * a "didn't find your answer?" prompt pinned bottom-left, cards on the right.
 * On phones it stacks heading → cards → prompt, centred like the reference.
 */
export default function FaqSection({
  id = "faq",
  title,
  subtitle,
  items,
  cta = { label: "Contact our team", to: "/contact" },
  prompt = "Didn’t find your answer? Send us a message — we’ll respond with care and clarity.",
}: {
  id?: string;
  title: ReactNode;
  subtitle: string;
  items: readonly FaqItem[];
  cta?: { label: string; to: string };
  prompt?: string;
}) {
  const bottom = (
    <div className="flex flex-col items-center gap-8 text-center tab:items-start tab:text-left">
      <p className="mk-reveal max-w-[480px] t-small text-ink-600">{prompt}</p>
      <div className="mk-reveal"><PillButton to={cta.to}>{cta.label}</PillButton></div>
    </div>
  );

  return (
    <section id={id} className="mk-section scroll-mt-24 bg-ink-50">
      <div className="mk-container">
        <div className="mk-split mk-split--rev" style={{ ["--mk-gap" as string]: "48px" }}>
          <div className="flex flex-col justify-between gap-12 text-center tab:text-left">
            <div className="flex flex-col gap-6">
              <Display size="sm" className="mk-reveal">{title}</Display>
              <p className="mk-reveal mx-auto max-w-[640px] t-body text-ink-600 tab:mx-0">{subtitle}</p>
            </div>
            <div className="hidden tab:block">{bottom}</div>
          </div>
          <div className="flex flex-col gap-12">
            <Accordion items={items} />
            <div className="tab:hidden">{bottom}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
