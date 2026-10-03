"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CURSOR_SPRINGS, snapFrame, springSettled, springStep, type SpringState } from "@/lib/motion";

const FINE = "(hover: hover) and (pointer: fine)";
const REDUCED = "(prefers-reduced-motion: reduce)";
/** Interactive elements: the cursor grows over them (or snaps, see SNAP). */
const HIT = "a, button, [role=button], label, summary, select";
/** Orovion's text-link and button styles snap by default; `data-cursor` overrides. */
const SNAP = ".pill, .ul-wipe, .link-u, .soc, .chip, .mk-snap";
/** Text entry keeps the native I-beam; the custom cursor steps aside. */
const NATIVE = "input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=reset],[type=range],[type=color],[type=file]), textarea, [contenteditable=''], [contenteditable='true']";
/** Always-dark blocks (hero stage, big quote, footer) — the follower stays plain white there. */
const DARK_ZONE = '[data-nav-dark="true"]';
const RING = 36;

type Mode =
  | { kind: "idle" | "link" | "hidden" }
  | { kind: "snap"; x: number; y: number; w: number; h: number; r: number }
  | { kind: "label"; label: string };

type Channel = "x" | "y" | "ringScale" | "ringOpacity" | "w" | "h" | "r" | "frameOpacity" | "labelScale" | "labelOpacity";
const CHANNELS: Channel[] = ["x", "y", "ringScale", "ringOpacity", "w", "h", "r", "frameOpacity", "labelScale", "labelOpacity"];

// Kept across page changes, so the cursor of the next page appears in place.
let lastPointer: { x: number; y: number } | null = null;

/**
 * Custom cursor for the marketing pages (after the "b" reference):
 * - a small dot pinned to the pointer;
 * - a 36px ring that trails it on an overdamped spring and inverts whatever
 *   it passes over (`mix-blend-mode: difference`); over links it grows 1.5×;
 * - over text links and buttons it glides to the element and becomes a frame
 *   5px around it (corners concentric with the element's);
 * - over cards marked `data-cursor="Label"` a brand pill with that label
 *   trails the pointer.
 *
 * Mouse and trackpad only (`hover: hover` + `pointer: fine`); off under
 * reduced motion. `data-cursor` values: `snap`, `native` (hide it), or any
 * other text (shown as a label). Timings: docs/marketing-motion.md.
 */
export default function Cursor() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const fine = window.matchMedia(FINE), reduced = window.matchMedia(REDUCED);
    const update = () => setEnabled(fine.matches && !reduced.matches);
    update();
    fine.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);
  return enabled ? createPortal(<CursorLayer />, document.body) : null;
}

function CursorLayer() {
  const follower = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const labelText = useRef<HTMLSpanElement>(null);
  const dot = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const f = follower.current, t = tag.current, rg = ring.current, fr = frame.current, lb = label.current, lt = labelText.current, d = dot.current;
    if (!f || !t || !rg || !fr || !lb || !lt || !d) return;
    const html = document.documentElement;
    const at = (value: number): SpringState => ({ value, velocity: 0 });
    const ch: Record<Channel, SpringState> = {
      x: at(0), y: at(0), ringScale: at(0.4), ringOpacity: at(0),
      w: at(RING), h: at(RING), r: at(RING / 2), frameOpacity: at(0), labelScale: at(0.4), labelOpacity: at(0),
    };
    let mode: Mode = { kind: "idle" };
    let pointer = lastPointer;
    let visible = false, raf = 0, last = 0;

    const show = (on: boolean) => {
      visible = on;
      for (const el of [f, t, d]) el.classList.toggle("is-visible", on);
      if (on) html.classList.add("has-cursor");
    };

    const targets = (): Record<Channel, number> => {
      const snap = mode.kind === "snap" ? mode : null;
      const ringOn = mode.kind === "idle" || mode.kind === "link";
      const labelOn = mode.kind === "label";
      return {
        x: snap ? snap.x : pointer?.x ?? 0,
        y: snap ? snap.y : pointer?.y ?? 0,
        ringScale: mode.kind === "link" ? 1.5 : ringOn ? 1 : 0.4,
        ringOpacity: ringOn ? 1 : 0,
        w: snap ? snap.w : RING,
        h: snap ? snap.h : RING,
        r: snap ? snap.r : RING / 2,
        frameOpacity: snap ? 1 : 0,
        labelScale: labelOn ? 1 : 0.4,
        labelOpacity: labelOn ? 1 : 0,
      };
    };

    const paint = () => {
      const pos = `translate3d(${ch.x.value.toFixed(2)}px, ${ch.y.value.toFixed(2)}px, 0)`;
      f.style.transform = pos;
      t.style.transform = pos;
      const op = (c: SpringState) => String(Math.min(1, Math.max(0, c.value)));
      rg.style.transform = `scale(${ch.ringScale.value.toFixed(4)})`;
      rg.style.opacity = op(ch.ringOpacity);
      fr.style.width = `${Math.max(0, ch.w.value).toFixed(2)}px`;
      fr.style.height = `${Math.max(0, ch.h.value).toFixed(2)}px`;
      fr.style.borderRadius = `${Math.max(0, ch.r.value).toFixed(2)}px`;
      fr.style.opacity = op(ch.frameOpacity);
      lb.style.transform = `scale(${ch.labelScale.value.toFixed(4)})`;
      lb.style.opacity = op(ch.labelOpacity);
    };

    const tick = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      const goal = targets();
      let busy = false;
      for (const k of CHANNELS) {
        const position = k === "x" || k === "y";
        const px = position || k === "w" || k === "h" || k === "r";
        ch[k] = springStep(ch[k], goal[k], dt, position ? CURSOR_SPRINGS.follow : CURSOR_SPRINGS.shape);
        if (springSettled(ch[k], goal[k], px ? 0.05 : 0.001)) ch[k] = at(goal[k]);
        else busy = true;
      }
      paint();
      raf = busy ? requestAnimationFrame(tick) : 0;
      if (!busy) last = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    // A snapped element can change size under a still pointer (an FAQ card
    // opening) — keep the frame on it.
    let snapped: Element | null = null;
    const sizes = new ResizeObserver(() => resolve());
    const watch = (el: Element | null) => {
      if (el === snapped) return;
      sizes.disconnect();
      snapped = el;
      if (el) sizes.observe(el, { box: "border-box" });
    };

    // What is under the pointer decides the mode (re-run on scroll: the page
    // moves under a still pointer). The nearest `data-cursor` wins, as on the
    // reference — except a snap-styled control inside it keeps its own frame.
    const resolve = () => {
      if (!pointer || !visible) return;
      const el = document.elementFromPoint(pointer.x, pointer.y);
      f.classList.toggle("is-on-dark", !!el?.closest(DARK_ZONE));
      const hit = el?.closest<HTMLElement>(HIT) ?? null;
      const tagged = el?.closest<HTMLElement>("[data-cursor]") ?? null;
      const target = hit && hit.matches(SNAP) && (!tagged || tagged.contains(hit)) ? hit : tagged ?? hit;
      const want = target?.dataset.cursor;
      let snapTo: HTMLElement | null = null;
      if (el?.closest(NATIVE) || want === "native") mode = { kind: "hidden" };
      else if (!target) mode = { kind: "idle" };
      else if (want === "snap" || (!want && target.matches(SNAP))) {
        snapTo = target;
        const radius = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 0;
        mode = { kind: "snap", ...snapFrame(target.getBoundingClientRect(), radius) };
      } else if (want) {
        if (mode.kind !== "label" || mode.label !== want) lt.textContent = want;
        mode = { kind: "label", label: want };
      } else mode = { kind: "link" };
      watch(snapTo);
      d.classList.toggle("is-native", mode.kind === "hidden");
      kick();
    };
    // A click can change what is under a still pointer (menu opens, FAQ toggles).
    const onClick = () => requestAnimationFrame(resolve);

    const place = (x: number, y: number) => {
      pointer = lastPointer = { x, y };
      d.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") { if (visible) show(false); return; }
      const first = !pointer;
      place(e.clientX, e.clientY);
      if (first) { ch.x = at(e.clientX); ch.y = at(e.clientY); }
      if (!visible) show(true);
      resolve();
    };
    // Leaving the window hides the cursor; it fades back on the next move.
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget) show(false); };

    // Arriving from another page: appear where the pointer already is.
    if (pointer) {
      ch.x = at(pointer.x); ch.y = at(pointer.y);
      place(pointer.x, pointer.y);
      show(true);
      resolve();
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", resolve, { passive: true });
    window.addEventListener("resize", resolve);
    window.addEventListener("click", onClick, true);
    document.addEventListener("mouseout", onOut);
    return () => {
      cancelAnimationFrame(raf);
      sizes.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", resolve);
      window.removeEventListener("resize", resolve);
      window.removeEventListener("click", onClick, true);
      document.removeEventListener("mouseout", onOut);
      html.classList.remove("has-cursor");
    };
  }, []);

  return (
    <>
      <div ref={follower} className="mk-cursor mk-cursor--follower" aria-hidden>
        <span ref={ring} className="mk-cursor__ring" />
        <span ref={frame} className="mk-cursor__frame" />
      </div>
      <div ref={tag} className="mk-cursor" aria-hidden>
        <span ref={label} className="mk-cursor__label"><span ref={labelText} /><i /></span>
      </div>
      <span ref={dot} className="mk-cursor mk-cursor__dot" aria-hidden />
    </>
  );
}
