"use client";
import { Link } from "@/lib/router";
import { HOME } from "@/lib/marketing";
import ParallaxImage from "./ParallaxImage";

/**
 * Four tall image cards right after the trust toggle (reference "Our
 * services"): moody photo drifting inside the card (200px parallax + grain),
 * title top-left, description low, and a dot whose "Read more" label fades in
 * on hover (0.6s spring). 4-up on desktop, 2×2 on tablet, stacked on phones.
 */
export default function Services() {
  return (
    <section id="features" aria-label="What you can do on Orovion" className="relative scroll-mt-24 pb-20 tab:pb-[120px] desk:pb-40">
      <div className="mk-container grid gap-4 tab:grid-cols-2 desk:grid-cols-4">
        {HOME.services.map((s) => (
          <Link key={s.title} to={s.href} data-cursor="Explore" className="mk-reveal group relative block h-[360px] overflow-hidden rounded-2xl bg-brand-900 tab:h-[440px] desk:h-[560px]">
            <ParallaxImage
              src={s.image}
              alt=""
              intensity={200}
              sizes="(min-width: 1200px) 25vw, (min-width: 810px) 50vw, 100vw"
              className="absolute inset-0"
              imgClassName="saturate-[.8]"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-brand-950/55 via-brand-950/10 to-brand-950/75" />
            <h3 className="absolute left-6 right-6 top-6 font-display text-[32px] font-medium leading-[1.02] tracking-[-.03em] text-white desk:text-[34px] wide:text-[38px]">
              {s.title}
            </h3>
            <p className="absolute bottom-20 left-6 right-6 max-w-[300px] t-small text-white/90">{s.text}</p>
            <span className="absolute bottom-6 left-6 flex items-center gap-4">
              <span aria-hidden className="h-1 w-1 rounded-full bg-white" />
              <span className="t-eyebrow !text-white opacity-0 transition-opacity duration-[600ms] ease-spring group-hover:opacity-100 group-focus-visible:opacity-100">Read more</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
