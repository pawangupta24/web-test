"use client";
import { useCallback, useRef, type ReactNode } from "react";
import Image from "next/image";
import { imageParallaxY } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useScrollFrame } from "../useScrollFrame";

/**
 * Photo that drifts inside its frame: the image is `intensity` px taller than
 * the frame and slides −intensity → 0 while the frame crosses the viewport
 * (reference "image parallax with noise"), with an optional grain overlay.
 * Static under reduced motion.
 */
export default function ParallaxImage({
  src, alt, intensity = 200, sizes, className, imgClassName, noise = 0.15, priority, children,
}: {
  src: string; alt: string; intensity?: number; sizes: string; className?: string; imgClassName?: string;
  noise?: number; priority?: boolean; children?: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);

  useScrollFrame(useCallback(() => {
    const f = frame.current, l = layer.current;
    if (!f || !l) return;
    const r = f.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom < -vh || r.top > 2 * vh) return; // far off-screen: skip
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    l.style.transform = reduced ? "" : `translate3d(0, ${imageParallaxY(r.top, r.height, vh, intensity)}px, 0)`;
  }, [intensity]));

  return (
    <div ref={frame} className={cn("overflow-hidden", !/\b(absolute|fixed|sticky)\b/.test(className ?? "") && "relative", className)}>
      <div ref={layer} className="absolute inset-x-0 top-0 will-change-transform" style={{ height: `calc(100% + ${intensity}px)` }}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", imgClassName)} />
      </div>
      {noise > 0 && <div className="mk-noise pointer-events-none absolute inset-0" style={{ opacity: noise }} />}
      {children}
    </div>
  );
}
