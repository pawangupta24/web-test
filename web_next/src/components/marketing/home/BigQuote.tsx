"use client";
import { useCallback, useRef } from "react";
import { Link } from "@/lib/router";
import { HOME } from "@/lib/marketing";
import { rangeProgress } from "@/lib/motion";
import { useScrollFrame } from "../useScrollFrame";
import { Accent, FillText } from "../Type";
import ParallaxImage from "./ParallaxImage";
import ScrollThread, { type ThreadLine } from "./ScrollThread";

const QUOTE_THREAD: ThreadLine[] = [
  { opacity: 0.45, d: "M 210 0 C 250 220, 150 420, 120 600 C 92 770, 160 900, 236 870 C 312 840, 290 720, 200 740 C 110 760, 80 900, 130 1000" },
  { d: "M 196 0 C 230 230, 132 430, 104 610 C 78 776, 148 916, 226 888 C 306 860, 284 734, 190 756 C 98 778, 66 920, 118 1000" },
];

/**
 * Statement + big quote (reference "Text section" + "Big quote"): a two-column
 * statement on the soft band, then a full-bleed dark photo that rises through a
 * dome — its top edge starts as a wide arc and flattens to full-bleed as the
 * section reaches the top of the screen. The photo drifts (parallax), a thread
 * draws itself beside the quote, and the nav turns white over it.
 */
export default function BigQuote() {
  const { statement: s, quote: q } = HOME;
  const dome = useRef<HTMLDivElement>(null);

  useScrollFrame(useCallback(() => {
    const el = dome.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = rangeProgress(r.top, window.innerHeight, 0);
    // ellipse anchored at the bottom: radius-x 60% → 260% (eased) flattens the arc
    el.style.clipPath = t >= 1 ? "none" : `ellipse(${(60 + 200 * t * t).toFixed(1)}% 100% at 50% 100%)`;
  }, []));

  return (
    <section className="relative bg-ink-50">
      <div className="mk-container mk-split items-start pb-20 pt-20 tab:pb-[120px] tab:pt-[120px] desk:pt-40" style={{ ["--mk-gap" as string]: "32px" }}>
        <h2 className="mk-reveal t-display-sm text-ink-900 text-balance"><FillText>{s.title} <Accent>{s.accent}</Accent></FillText></h2>
        <p className="mk-reveal max-w-[440px] t-body text-ink-600">
          {s.text} <Link to={s.link.to} className="link-u font-semibold text-brand-600">{s.link.label}</Link> {s.tail}
        </p>
      </div>

      <div id="big-quote" ref={dome} data-nav-dark="true" className="relative min-h-[640px] overflow-hidden bg-brand-950 [clip-path:ellipse(60%_100%_at_50%_100%)]" style={{ height: "100svh" }}>
        <ParallaxImage src={q.image.src} alt={q.image.alt} intensity={300} noise={0.12} sizes="100vw" className="absolute inset-0" imgClassName="saturate-[.7]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/40 to-brand-950/30" />
        <div aria-hidden className="absolute bottom-0 right-[8%] top-0 hidden w-[300px] tab:block">
          <ScrollThread viewBox="0 0 300 1000" lines={QUOTE_THREAD} stroke="#fff" preserveAspectRatio="none" className="h-full w-full" />
        </div>
        <figure className="mk-container absolute inset-x-0 bottom-0 pb-16 desk:pb-20">
          <blockquote className="mk-reveal max-w-[820px] font-display text-[36px] font-medium leading-[1.08] tracking-[-.035em] text-white tab:text-[52px] desk:text-[64px]">
            <FillText>{`“${q.text}”`}</FillText>
          </blockquote>
          <figcaption className="mk-reveal mt-8 t-eyebrow !text-white/70">{q.author}</figcaption>
        </figure>
      </div>
    </section>
  );
}
