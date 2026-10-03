"use client";
import { Link } from "@/lib/router";
import TeamAvatar from "@/components/landing/TeamAvatar";
import TeamProfileCard from "@/components/landing/TeamProfileCard";
import MarketingShell from "@/components/marketing/MarketingShell";
import PillButton from "@/components/marketing/PillButton";
import { WipeLink } from "@/components/marketing/Links";
import { Accent, Display, Eyebrow, enter } from "@/components/marketing/Type";
import { TEAM, TeamMember } from "@/lib/team";
import { cn } from "@/lib/utils";

/** /team — the team landing page. Landing cards deep-link here as /team#slug. */
export default function TeamPage() {
  return (
    <MarketingShell>
      <Hero />
      <Members />
      <JoinCTA />
    </MarketingShell>
  );
}

function Hero() {
  const e = { eyebrow: enter(0.4, "above"), title: enter(0.4), intro: enter(0.6), list: enter(0.8) };
  return (
    <section className="mk-top !pb-10 tab:!pb-16">
      <div className="mk-container flex flex-col gap-14">
        <Eyebrow className={e.eyebrow.className} style={e.eyebrow.style}>The team</Eyebrow>
        <div className="mk-split items-end">
          <div className="flex flex-col gap-6">
            <Display as="h1" className={e.title.className} style={e.title.style}>
              The people building <Accent>Orovion.</Accent>
            </Display>
            <p className={cn("max-w-[520px] t-body-lg text-ink-600", e.intro.className)} style={e.intro.style}>
              A small team bringing product, technology and healthcare perspectives together to
              build a more connected healthcare community.
            </p>
          </div>
          <ul className={cn("flex flex-col", e.list.className)} style={e.list.style}>
            {TEAM.map((m) => (
              <li key={m.slug} className="border-t border-ink-900/[.08] last:border-b">
                <a href={`#${m.slug}`} data-cursor="snap" className="group flex items-center gap-4 py-4">
                  <TeamAvatar member={m} className="h-11 w-11 shrink-0 rounded-full text-sm" />
                  <span className="ul-wipe t-body font-semibold text-ink-900">{m.name}</span>
                  {m.role && <span className="ml-auto t-small text-ink-500">{m.role}</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Members() {
  return (
    <section className="mk-container flex flex-col gap-20 pb-20 pt-10 tab:gap-28 tab:pb-[120px] desk:gap-40 desk:pb-40">
      {TEAM.map((m, i) => <MemberProfile key={m.slug} member={m} flip={i % 2 === 1} />)}
    </section>
  );
}

function MemberProfile({ member: m, flip }: { member: TeamMember; flip: boolean }) {
  return (
    <article id={m.slug} className="scroll-mt-32">
      <div className={cn("grid items-start gap-10 tab:gap-14", flip ? "tab:grid-cols-[1fr_300px] desk:grid-cols-[1fr_360px]" : "tab:grid-cols-[300px_1fr] desk:grid-cols-[360px_1fr]")}>
        <div className={cn("mk-reveal tab:sticky tab:top-40", flip && "tab:order-2")}>
          <TeamProfileCard member={m} />
        </div>
        <div className={cn("flex min-w-0 flex-col gap-6", flip && "tab:order-1")}>
          <Display size="sm" className="mk-reveal">{m.name}</Display>
          {m.role && <p className="mk-reveal t-eyebrow">{m.role}</p>}
          <div className="max-w-2xl space-y-5 t-body text-ink-600">
            {m.story.map((p, i) => <p key={i} className="mk-reveal">{p}</p>)}
          </div>
          <div className="mk-reveal flex flex-wrap gap-2">
            {m.focus.map((f) => <span key={f} className="chip bg-brand-50 text-brand-700">{f}</span>)}
          </div>
          {/* Internal link to the member's own page — keeps /team/[slug] out of
              orphan status so it is crawled, not just listed in the sitemap. */}
          <div className="mk-reveal pt-2">
            <WipeLink href={`/team/${m.slug}`} className="t-eyebrow">{m.name}&rsquo;s page</WipeLink>
          </div>
        </div>
      </div>
    </article>
  );
}

function JoinCTA() {
  return (
    <section className="mk-section bg-ink-50">
      <div className="mk-container mk-split items-end" style={{ ["--mk-gap" as string]: "32px" }}>
        <div className="flex flex-col gap-6">
          <Eyebrow className="mk-reveal">Work with us</Eyebrow>
          <Display className="mk-reveal">Want to build this <Accent>with us?</Accent></Display>
          <p className="mk-reveal max-w-[480px] t-body text-ink-600">
            We’re building thoughtfully and are always open to hearing from people who believe in
            what Orovion is becoming — clinicians, engineers and designers alike.
          </p>
        </div>
        <div className="mk-reveal flex flex-wrap items-center gap-x-8 gap-y-4">
          <PillButton to="mailto:hello@orovion.com">Email the team</PillButton>
          <Link to="/login" className="link-u text-sm font-semibold text-brand-600">Explore Orovion</Link>
        </div>
      </div>
    </section>
  );
}
