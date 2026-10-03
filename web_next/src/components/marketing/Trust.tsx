import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRUST, TRUST_AVATARS } from "@/lib/marketing";

/**
 * Overlapping 48px faces with a crescent cut where the next one sits, ending in
 * a dark count disc. Placeholder people — see src/lib/marketing.ts.
 */
export function AvatarStack({ badge = TRUST.badge, className }: { badge?: string; className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      {TRUST_AVATARS.map((a, i) => (
        <span key={a.src} className="mk-avatar mk-avatar--cut" style={{ zIndex: i }}>
          <img src={a.src} alt={a.alt} width={44} height={44} loading="lazy" className="absolute inset-[2px] h-11 w-11 rounded-full object-cover" />
        </span>
      ))}
      <span className="mk-avatar" style={{ zIndex: TRUST_AVATARS.length }}>
        <span className="absolute inset-[3px] grid place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">{badge}</span>
      </span>
    </div>
  );
}

/** "Trusted by …" label, avatar stack and rating line (the reference's sticky trust block). */
export function TrustBlock({ className, labelClassName }: { className?: string; labelClassName?: string }) {
  return (
    <div className={cn("flex max-w-full flex-col gap-8", className)}>
      <p className={cn("mk-reveal t-small text-ink-500", labelClassName)}>{TRUST.label}</p>
      <div className="mk-reveal flex flex-col gap-4">
        <AvatarStack />
        <p className="flex flex-wrap items-center gap-2 t-body text-ink-900">
          <strong className="font-semibold">Rated {TRUST.rating}</strong>
          <span className="flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} className="fill-accent-ochre text-accent-ochre" />)}
          </span>
          <span className="text-ink-500">{TRUST.ratingLabel}</span>
        </p>
      </div>
    </div>
  );
}
