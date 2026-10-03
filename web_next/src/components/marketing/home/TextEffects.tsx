"use client";
import { useEffect, useRef, type ElementType } from "react";
import { revealProgress, smoothToward, wordOpacity } from "@/lib/motion";
import { fillLetters } from "../Type";

/**
 * Words that appear one by one on mount: blur 10px → 0, opacity 0 → 1, rising
 * 10px, 1.6s each, staggered 0.1s from `startDelay` (reference hero title).
 * Pure CSS (`.mk-word`), so it plays from the first paint.
 *
 * `fill`: every letter fills with color from the bottom while the pointer is
 * over it and drains when it leaves (`.mk-fill`, after the "b" reference
 * wordmark; white base, brand ink — set `--mk-fill-base` / `--mk-fill-ink` to
 * change). The letter spans are hidden from screen readers, which get the
 * plain text once.
 */
export function BlurWords({ text, startDelay = 0.2, step = 0.1, fill = false }: { text: string; startDelay?: number; step?: number; fill?: boolean }) {
  const words = text.split(" ");
  const visual = words.map((w, i) => (
    <span key={`${w}-${i}`}>
      <span className="mk-word" style={{ ["--mk-wd" as string]: `${(startDelay + i * step).toFixed(2)}s` }}>
        {fill ? fillLetters(w, `b${i}`) : w}
      </span>
      {i < words.length - 1 ? " " : null}
    </span>
  ));
  if (!fill) return <>{visual}</>;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{visual}</span>
    </>
  );
}

/**
 * Paragraph that lights up word by word while it scrolls from the bottom of the
 * viewport to 25% from the top: each word owns an equal slice of the progress
 * and goes 0.2 → 1 opacity (reference "text scroll reveal", spring-smoothed).
 * Letters also fill on hover (`.mk-fill`). The full sentence stays available
 * to screen readers.
 */
export function ScrollWords({ text, as: As = "p", className }: { text: string; as?: ElementType; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = Array.from(el.querySelectorAll<HTMLElement>("[data-mk-word]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let current = -1, target = 0, raf = 0, last = 0;

    const apply = (p: number) => spans.forEach((s, i) => { s.style.opacity = reduced ? "1" : wordOpacity(p, i, spans.length).toFixed(3); });
    const tick = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      current = current < 0 ? target : smoothToward(current, target, dt, 90);
      if (Math.abs(target - current) < 0.001) current = target;
      apply(current);
      if (current !== target) raf = requestAnimationFrame(tick);
      else { raf = 0; last = 0; }
    };
    const measure = () => {
      target = revealProgress(el.getBoundingClientRect().top, window.innerHeight);
      if (!raf) raf = requestAnimationFrame(tick);
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [text]);

  return (
    <As ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((w, i) => (
          <span key={`${w}-${i}`}>
            <span data-mk-word>{fillLetters(w, `s${i}`)}</span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </As>
  );
}
