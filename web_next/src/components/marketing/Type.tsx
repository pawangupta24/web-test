import { Fragment, cloneElement, isValidElement, type CSSProperties, type ElementType, type ReactElement, type ReactNode } from "react";
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

/** Large display heading (Plus Jakarta). `size="sm"` for secondary sections. Letters fill on hover (`FillText`). */
export function Display({ children, as: As = "h2", size = "lg", className, style }: { children: ReactNode; as?: ElementType; size?: "lg" | "sm"; className?: string; style?: CSSProperties }) {
  return (
    <As className={cn(size === "lg" ? "t-display" : "t-display-sm", "text-ink-900 text-balance", className)} style={style}>
      <FillText>{children}</FillText>
    </As>
  );
}

/** The highlighted words of a heading, in the brand color (their letters fill with the ink color). */
export function Accent({ children }: { children: ReactNode }) {
  return <span className="mk-accent text-brand-600">{children}</span>;
}

/* ── Letter fill ("b" wordmark) ─────────────────────────────────────────── */

const TEXT_TAGS = new Set(["span", "br", "em", "strong", "b", "i"]);
type WithChildren = ReactElement<{ children?: ReactNode }>;

/** True when the tree holds only text and text-level elements — never links or buttons. */
function textOnly(node: ReactNode): boolean {
  if (node == null || typeof node === "boolean" || typeof node === "string" || typeof node === "number") return true;
  if (Array.isArray(node)) return node.every(textOnly);
  if (!isValidElement(node)) return false;
  const { type } = node as WithChildren;
  const ok = type === Accent || type === Fragment || (typeof type === "string" && TEXT_TAGS.has(type));
  return ok && textOnly((node as WithChildren).props.children);
}

/** What a screen reader should hear: the text, with `<br>` read as a space. */
function plainText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (!isValidElement(node)) return "";
  return node.type === "br" ? " " : plainText((node as WithChildren).props.children);
}

/** Letter spans for one string; spaces stay plain text so lines still wrap between words. */
export function fillLetters(text: string, key: string): ReactNode[] {
  return Array.from(text).map((ch, i) => (/\s/.test(ch) ? ch : <span key={`${key}-${i}`} className="mk-fill">{ch}</span>));
}

function splitLetters(node: ReactNode, key: string): ReactNode {
  if (typeof node === "string" || typeof node === "number") return fillLetters(String(node), key);
  if (Array.isArray(node)) return node.map((n, i) => splitLetters(n, `${key}.${i}`));
  if (!isValidElement(node)) return node;
  const kids = (node as WithChildren).props.children;
  return kids === undefined ? cloneElement(node, { key }) : cloneElement(node as WithChildren, { key }, splitLetters(kids, key));
}

/**
 * Big text whose letters fill with color from the bottom while the pointer is
 * over them and drain when it leaves (`.mk-fill`, mouse/trackpad only).
 * Screen readers get the plain text once; the letter spans are hidden from
 * them. Content with anything but text-level elements is left as is.
 */
export function FillText({ children }: { children: ReactNode }) {
  if (!textOnly(children)) return <>{children}</>;
  return (
    <>
      <span className="sr-only">{plainText(children).replace(/\s+/g, " ").trim()}</span>
      <span aria-hidden>{splitLetters(children, "f")}</span>
    </>
  );
}
