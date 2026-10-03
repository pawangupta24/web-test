"use client";
import { HOME, STATS } from "@/lib/marketing";
import { useCountUp } from "@/lib/utils";
import { Accent, Display } from "../Type";

/** Impact numbers on the soft band (reference "Numbers"): statement + four counters. */
export default function Numbers() {
  const n = HOME.numbers;
  return (
    <section aria-label="Orovion in numbers" className="relative bg-ink-50 pt-20 tab:pt-[120px] desk:pt-40">
      <div className="mk-container mk-split items-start" style={{ ["--mk-gap" as string]: "24px" }}>
        <Display size="sm" className="mk-reveal">{n.title} <Accent>{n.accent}</Accent></Display>
        <p className="mk-reveal max-w-[440px] t-body text-ink-600">{n.text}</p>
      </div>
      <div className="mk-container mt-16 grid grid-cols-2 gap-x-6 gap-y-12 tab:mt-24 desk:grid-cols-4">
        {STATS.map((s) => <Counter key={s.label} {...s} />)}
      </div>
    </section>
  );
}

function Counter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  // useCountUp is untyped JS returning [value, ref]
  const [v, ref] = useCountUp(value, 1600) as [number, React.RefObject<HTMLDivElement>];
  return (
    <div ref={ref} className="mk-reveal flex flex-col gap-4">
      <span className="font-display text-[56px] font-medium leading-none tracking-[-.05em] text-brand-600 tabular-nums tab:text-[72px] desk:text-[80px]">
        {Number(v).toLocaleString("en-US")}{suffix}
      </span>
      <span className="max-w-[180px] t-small text-ink-600">{label}</span>
    </div>
  );
}
