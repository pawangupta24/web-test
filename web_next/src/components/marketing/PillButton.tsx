"use client";
import type { ReactNode } from "react";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";

export type PillState = "idle" | "loading" | "success";

type Common = {
  children: ReactNode;
  /** `light` = white pill for dark backdrops (footer, nav over the footer). */
  variant?: "brand" | "light";
  size?: "md" | "sm";
  state?: PillState;
  className?: string;
};
type AsLink = Common & { to: string; external?: boolean; onClick?: () => void };
type AsButton = Common & { to?: undefined; type?: "button" | "submit"; disabled?: boolean; onClick?: () => void };

/**
 * The signature pill: uppercase label with a dot on the right. On hover the
 * label slides 28px right while that dot slides out and a second dot slides in
 * from the left (0.6s spring). `state="loading"` swells the dot into a spinner
 * disc. Hover effects are pointer-only, so touch devices get the static pill.
 */
export default function PillButton(props: AsLink | AsButton) {
  const { children, variant = "brand", size = "md", state = "idle", className } = props;
  const cls = cn("pill", variant === "light" && "pill--light", size === "sm" && "pill--sm", className);
  const inner = (
    <>
      <span className="pill__label">{children}</span>
      <span className="pill__dot pill__dot--a" aria-hidden />
      <span className="pill__dot pill__dot--b" aria-hidden />
      <span className="pill__loader" aria-hidden><span className="pill__spinner" /></span>
    </>
  );

  if (props.to !== undefined) {
    if (props.external || /^(mailto:|tel:|https?:)/.test(props.to)) {
      return <a href={props.to} onClick={props.onClick} className={cls} data-state={state}>{inner}</a>;
    }
    return <Link to={props.to} onClick={props.onClick} className={cls} data-state={state}>{inner}</Link>;
  }
  const { type = "button", disabled, onClick } = props as AsButton;
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls} data-state={state} aria-busy={state === "loading" || undefined}>
      {inner}
    </button>
  );
}
