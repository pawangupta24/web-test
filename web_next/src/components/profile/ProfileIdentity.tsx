"use client";
import { compact } from "@/lib/utils";

/**
 * The two rows that sit under a profile's name, shared by `screens/Profile`
 * (your own) and `screens/UserProfile` (everyone else's).
 *
 * They live here because Design Principle 3 requires both surfaces to render
 * identically; when each screen owned its own copy they had already drifted —
 * one used bordered pills for credentials, the other inline text, and the two
 * count rows listed the same numbers in a different order.
 *
 * Both are presentational: no data fetching, no relationship state. The Follow /
 * Connect state machine stays in `useFollowAction` and its three layouts.
 */

type MetaEntry = { key: string; icon: any; text: React.ReactNode };
/** Callers build the list with `cond && {...}`, so every falsy result is valid input. */
type MetaItem = MetaEntry | false | null | undefined | "" | 0;

/**
 * Credentials and provenance as one quiet, wrapping line.
 *
 * Deliberately NOT pills. Bordered chips gave every secondary fact a box, which
 * is the "cards are the lazy answer" trap: four outlined shapes competed with
 * the name for attention. Muted inline text with a small icon reads as metadata,
 * which is what it is.
 */
export function MetaRow({ items, className = "" }: { items: MetaItem[]; className?: string }) {
  const shown = items.filter(Boolean) as MetaEntry[];
  if (!shown.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-500 ${className}`}>
      {shown.map(({ key, icon: Icon, text }) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <Icon size={14} className="shrink-0 text-ink-400" />
          {text}
        </span>
      ))}
    </div>
  );
}

type Count = { label: string; n: number | undefined; onClick?: () => void };

/**
 * Follower / following counts as an inline row.
 *
 * Previously four equal-width stacked buttons that ate a full band of vertical
 * space and gave "Connections" the same visual weight as "Followers". Inline
 * counts put the number first, the label second, and let the row wrap — the
 * pattern every social profile uses, and the reason X fits identity, bio, meta
 * and counts above the fold.
 *
 * A count with `onClick` is a button (it opens the people sheet); one without is
 * plain text, because a control that looks pressable and does nothing is worse
 * than a number.
 */
export function CountRow({ counts, className = "" }: { counts: Count[]; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm ${className}`}>
      {counts.map(({ label, n, onClick }) => {
        const body = (
          <>
            <b className="font-semibold tabular-nums text-ink-900">{compact(n || 0)}</b>{" "}
            <span className="text-ink-500">{label}</span>
          </>
        );
        return onClick ? (
          <button
            key={label}
            onClick={onClick}
            className="press rounded underline-offset-4 transition hover:underline focus-visible:underline"
          >
            {body}
          </button>
        ) : (
          <span key={label}>{body}</span>
        );
      })}
    </div>
  );
}
