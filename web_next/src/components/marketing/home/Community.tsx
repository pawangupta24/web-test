import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Link } from "@/lib/router";
import { HOME } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import PillButton from "../PillButton";
import { Display, Eyebrow } from "../Type";

/** Organic photo shapes (8-value border-radius) and their offset outlines. */
const BLOBS = [
  { shape: "58% 42% 47% 53% / 52% 46% 54% 48%", outline: "46% 54% 61% 39% / 44% 58% 42% 56%", rotate: "-8deg" },
  { shape: "44% 56% 38% 62% / 60% 50% 50% 40%", outline: "57% 43% 52% 48% / 48% 60% 40% 52%", rotate: "10deg" },
  { shape: "63% 37% 55% 45% / 46% 56% 44% 54%", outline: "41% 59% 46% 54% / 57% 41% 59% 43%", rotate: "-4deg" },
];

/**
 * Community highlights (reference "Journal"): centered header, then three
 * posts whose photos sit in organic blob shapes with a faint offset outline;
 * the middle one is set lower. Photos ease in slightly on hover.
 */
export default function Community() {
  const c = HOME.community;
  return (
    <section id="community" className="relative scroll-mt-24 mk-section">
      <div className="mk-container flex flex-col items-center gap-6 text-center">
        <Sparkles aria-hidden size={40} strokeWidth={1.4} className="mk-reveal text-brand-600" />
        <Eyebrow className="mk-reveal">{c.eyebrow}</Eyebrow>
        <Display size="sm" className="mk-reveal max-w-[640px]">{c.title}</Display>
        <p className="mk-reveal max-w-[420px] t-body text-ink-600">{c.text}</p>
        <div className="mk-reveal pt-2"><PillButton to={c.cta.to}>{c.cta.label}</PillButton></div>
      </div>

      <div className="mk-container mt-16 grid gap-16 tab:mt-20 tab:grid-cols-3 tab:gap-8">
        {c.posts.map((p, i) => {
          const b = BLOBS[i % BLOBS.length];
          return (
            <Link key={p.title} to={p.href} data-cursor="Read" className={cn("mk-reveal group flex flex-col items-center gap-8 text-center", i === 1 && "tab:mt-28")}>
              <div className="relative aspect-[1.12] w-full max-w-[420px]">
                <span aria-hidden className="mk-blob-outline absolute inset-0" style={{ borderRadius: b.outline, transform: `rotate(${b.rotate})` }} />
                <div className="absolute inset-[7%] overflow-hidden" style={{ borderRadius: b.shape }}>
                  <Image src={p.image} alt="" fill sizes="(min-width: 810px) 30vw, 90vw" className="object-cover transition-transform duration-[1200ms] ease-spring group-hover:scale-[1.06]" />
                </div>
              </div>
              <div className="flex max-w-[340px] flex-col items-center gap-3">
                <Eyebrow>{p.tag}</Eyebrow>
                <h3 className="t-title !text-[22px] text-ink-900">{p.title}</h3>
                <p className="t-small text-ink-600">{p.text}</p>
                <span className="ul-wipe mt-2 t-eyebrow">Read more</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
