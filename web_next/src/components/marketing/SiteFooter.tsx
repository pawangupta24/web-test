import { Link } from "@/lib/router";
import { Logo } from "@/components/ui/Primitives";
import StoreBadge from "@/components/ui/StoreBadge";
import { SITEMAP } from "@/lib/marketing";
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF } from "@/lib/contact";
import FooterBackdrop from "./FooterBackdrop";
import { SocialLinks, WipeLink } from "./Links";
import PillButton from "./PillButton";
import { DARK_SECTION_ID } from "@/lib/motion";

/**
 * Full-viewport footer on the parallax brand scene. The nav turns white when
 * this reaches it (see SiteNav). Every block fades in on scroll and replays.
 */
export default function SiteFooter() {
  return (
    <footer id={DARK_SECTION_ID} data-nav-dark="true" className="relative flex min-h-screen flex-col justify-end overflow-hidden bg-brand-900 pb-10 pt-20 text-white tab:pb-16 tab:pt-[120px] desk:pt-[200px]">
      <FooterBackdrop />

      <div className="relative mk-container flex flex-col gap-20 tab:gap-[120px] desk:gap-40">
        {/* Row A — CTA + sitemap */}
        <div className="grid gap-20 tab:gap-[120px] desk:grid-cols-[6fr_2fr_4fr] desk:gap-0">
          <div className="flex flex-col gap-12 desk:gap-14">
            <div className="flex flex-col gap-6">
              <h2 className="mk-reveal t-display text-white">Join the network<br />built on trust.</h2>
              <p className="mk-reveal max-w-[480px] t-body text-white/65">
                Create your profile and connect with verified healthcare professionals,
                medical students and people looking for trusted guidance.
              </p>
            </div>
            <div className="mk-reveal flex flex-wrap items-center gap-x-8 gap-y-5">
              <PillButton to="/login" variant="light">Join Orovion</PillButton>
              <Link to="/app" className="link-u text-sm font-semibold text-white">Explore as guest</Link>
            </div>
            <div className="mk-reveal flex flex-wrap gap-3">
              <Link to="/mobile-app" data-cursor="snap" className="rounded-xl" aria-label="Orovion on the App Store — learn more"><StoreBadge store="apple" size="sm" /></Link>
              <Link to="/mobile-app" data-cursor="snap" className="rounded-xl" aria-label="Orovion on Google Play — learn more"><StoreBadge store="google" size="sm" /></Link>
            </div>
          </div>

          <nav aria-label="Sitemap" className="flex flex-col gap-12 desk:col-start-3">
            <p className="mk-reveal t-eyebrow !text-white/65">Sitemap</p>
            <div className="grid grid-cols-1 gap-10 tab:grid-cols-2 tab:gap-5">
              {SITEMAP.map((col, ci) => (
                <ul key={ci} className="flex flex-col gap-6">
                  {col.map((l) => (
                    <li key={l.href} className="mk-reveal">
                      <WipeLink href={l.href} className="text-lg font-semibold text-white">{l.label}</WipeLink>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </nav>
        </div>

        {/* Row B — contact + socials | brand + legal */}
        <div className="grid gap-16 border-t border-white/10 pt-10 desk:grid-cols-[6fr_2fr_4fr] desk:gap-0">
          <div className="mk-reveal flex flex-col gap-8">
            <div className="flex flex-col gap-2 text-lg text-white/65">
              <p>Contact us: <a href={`mailto:${CONTACT_EMAIL}`} className="link-u font-semibold text-white">{CONTACT_EMAIL}</a></p>
              <p className="t-small">
                <a href={CONTACT_PHONE_HREF} className="link-u text-white/80">{CONTACT_PHONE}</a>
                <span className="mx-2 text-white/30">·</span>
                {CONTACT_ADDRESS}
              </p>
            </div>
            <SocialLinks className="text-white" />
          </div>
          <div className="mk-reveal flex flex-col items-start gap-4 desk:col-start-3">
            <Logo light size={26} />
            <p className="t-small text-white/65">Built for the healthcare community.<br />© {new Date().getFullYear()} Orovion. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
