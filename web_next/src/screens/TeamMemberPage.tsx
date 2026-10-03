"use client";
import { Link } from "@/lib/router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import TeamAvatar from "@/components/landing/TeamAvatar";
import MarketingShell from "@/components/marketing/MarketingShell";
import { Display, Eyebrow, enter } from "@/components/marketing/Type";
import TeamProfileCard from "@/components/landing/TeamProfileCard";
import { TEAM, TeamMember } from "@/lib/team";
import { cn } from "@/lib/utils";

/**
 * /team/[slug] — one founder's own page.
 *
 * Split out of the combined /team list so each founder has a canonical URL that
 * can rank for their name and carry a `Person` JSON-LD entity. The list page
 * still shows everyone; this is the destination its cards link to.
 */
export default function TeamMemberPage({ member: m }: { member: TeamMember }) {
  const others = TEAM.filter((x) => x.slug !== m.slug);
  const e = { back: enter(0.4, "above"), card: enter(0.6, "none"), title: enter(0.4), intro: enter(0.6), body: enter(0.8) };

  return (
    <MarketingShell>
      <article className="mk-top">
        <div className="mk-container flex flex-col gap-14">
          <Link to="/team" data-cursor="snap" className={cn("group inline-flex w-max items-center gap-2 t-eyebrow", e.back.className)} style={e.back.style}>
            <ArrowLeft size={14} className="transition-transform duration-500 ease-spring group-hover:-translate-x-1" />
            <span className="ul-wipe">All of the team</span>
          </Link>
          <div className="grid items-start gap-10 tab:grid-cols-[300px_1fr] tab:gap-14 desk:grid-cols-[360px_1fr] desk:gap-24">
            <div className={cn("tab:sticky tab:top-40", e.card.className)} style={e.card.style}>
              <TeamProfileCard member={m} headingAs="p" />
            </div>
            {/* story — the only <h1> on the page */}
            <div className="flex min-w-0 flex-col gap-6">
              <Display as="h1" className={e.title.className} style={e.title.style}>{m.name}</Display>
              {m.role && <p className="t-eyebrow">{m.role}</p>}
              <p className={cn("max-w-2xl t-body-lg text-ink-600", e.intro.className)} style={e.intro.style}>{m.tagline}</p>
              <div className={cn("flex max-w-2xl flex-col gap-5 t-body text-ink-600", e.body.className)} style={e.body.style}>
                {m.story.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              <Eyebrow as="h2" className="mk-reveal mt-6 !text-ink-500">Focus</Eyebrow>
              <div className="mk-reveal flex flex-wrap gap-2">
                {m.focus.map((f) => <span key={f} className="chip bg-brand-50 text-brand-700">{f}</span>)}
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* the rest of the team — internal links so no member page is an orphan */}
      <section className="mk-section bg-ink-50">
        <div className="mk-container flex flex-col gap-12">
          <Display size="sm" className="mk-reveal">The rest of the team</Display>
          <div className="grid gap-6 tab:grid-cols-2">
            {others.map((o) => (
              <Link
                key={o.slug}
                to={`/team/${o.slug}`}
                data-cursor="View"
                className="mk-reveal group flex items-center gap-4 rounded-2xl border border-ink-900/[.06] bg-surface p-6 transition-colors duration-500 ease-reveal hover:border-brand-300"
              >
                <TeamAvatar member={o} className="h-14 w-14 shrink-0 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="truncate t-title !text-lg text-ink-900">{o.name}</p>
                  {o.role && <p className="truncate text-sm font-semibold text-brand-600">{o.role}</p>}
                </div>
                <ArrowRight size={18} className="shrink-0 text-ink-400 transition-transform duration-500 ease-spring group-hover:translate-x-1 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
