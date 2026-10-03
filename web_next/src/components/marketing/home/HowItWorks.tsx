"use client";
import { useCallback, useRef, useState } from "react";
import { HOME } from "@/lib/marketing";
import { useScrollFrame } from "../useScrollFrame";

/**
 * "How it works" (reference): an oversized two-tone title, an indented intro,
 * then the steps scrolling past a pinned odometer number that rolls 01 → 02 →
 * 03 (0.8s, cubic-bezier(.6,0,.4,1)) as each step crosses 60% of the screen.
 * The page's fixed thread waves (ThreadWaves) fade in behind this section.
 * Tablet/phone show the number inline with each step instead.
 */
export default function HowItWorks() {
  const { title, text, steps } = HOME.how;
  const list = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  useScrollFrame(useCallback(() => {
    const items = list.current?.querySelectorAll<HTMLElement>("[data-step]");
    if (!items) return;
    const line = window.innerHeight * 0.6;
    let a = 0;
    items.forEach((el, i) => { if (el.getBoundingClientRect().top <= line) a = i; });
    setActive((prev) => (prev === a ? prev : a));
  }, []));

  return (
    <section id="how-it-works" className="relative scroll-mt-24 pt-20 tab:pt-[120px] desk:pt-40">
      <div className="mk-container">
        <h2 className="mk-reveal font-display text-[64px] font-medium leading-[.92] tracking-[-.045em] text-ink-900 tab:text-[96px] desk:text-[128px]">
          {title.lead} <span className="text-brand-600">{title.accent}</span>
        </h2>
        <p className="mk-reveal mk-indent mt-10 max-w-[960px] text-lg leading-[1.6] text-ink-700 tab:ml-[22%] tab:mt-14 desk:text-[22px]">{text}</p>
      </div>

      <div className="mk-container relative mt-16 grid tab:mt-24 tab:grid-cols-[5fr_1fr_6fr]">
        <ol ref={list} className="flex flex-col">
          {steps.map((s, i) => (
            <li key={s.title} data-step={i} className="mk-reveal flex flex-col justify-center gap-6 py-12 tab:min-h-[72vh] tab:py-16">
              <span aria-hidden className="font-display text-[88px] font-medium leading-none tracking-[-.06em] text-brand-600 tab:hidden">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-[34px] font-medium leading-[1.05] tracking-[-.035em] text-brand-600 tab:text-[44px] desk:text-[56px]">
                <span className="sr-only">Step {i + 1}: </span>{s.title}
              </h3>
              <p className="max-w-[480px] t-body text-ink-600">{s.text}</p>
            </li>
          ))}
        </ol>
        <div aria-hidden className="col-start-3 hidden tab:block">
          {/* pinned so the number sits just above the bottom of the screen */}
          <div className="sticky flex justify-end" style={{ top: "calc(100vh - clamp(220px, 24vw, 400px) - 48px)" }}>
            <div className="mk-bignum">
              <span>0</span>
              <span className="mk-bignum__roll">
                <span className="mk-bignum__col" style={{ transform: `translateY(${-active}em)` }}>
                  {steps.map((_, i) => <span key={i}>{i + 1}</span>)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
