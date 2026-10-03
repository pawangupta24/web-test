import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Page-load entrance props (desktop only). `delay` in seconds; `from="above"`
 * drops in from -20px (used for eyebrows), `from="none"` only fades.
 */
export function enter(delay: number, from: "below" | "above" | "none" = "below"): { className: string; style: CSSProperties } {
  const style: Record<string, string> = { "--mk-d": `${delay}s` };
  if (from === "above") style["--mk-y"] = "-20px";
  if (from === "none") style["--mk-y"] = "0px";
  return { className: "mk-enter", style: style as CSSProperties };
}

/** 12px uppercase tracked label in the brand color. */
export function Eyebrow({ children, className, style, as: As = "p" }: { children: ReactNode; className?: string; style?: CSSProperties; as?: ElementType }) {
  return <As className={cn("t-eyebrow", className)} style={style}>{children}</As>;
}

/** Large display heading (Plus Jakarta). `size="sm"` for secondary sections. */
export function Display({ children, as: As = "h2", size = "lg", className, style }: { children: ReactNode; as?: ElementType; size?: "lg" | "sm"; className?: string; style?: CSSProperties }) {
  return (
    <As className={cn(size === "lg" ? "t-display" : "t-display-sm", "text-ink-900 text-balance", className)} style={style}>
      {children}
    </As>
  );
}

/** The highlighted words of a heading, in the brand color. */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="text-brand-600">{children}</span>;
}
