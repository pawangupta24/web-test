import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF } from "@/lib/contact";
import { SocialLinks } from "./Links";

/** "Prefer to talk first?" contact line + social icons (used on / and /contact). */
export default function ReachUs() {
  return (
    <div className="mk-reveal flex flex-col gap-8">
      <p className="max-w-[480px] t-small text-ink-600">
        Prefer to talk first?{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="link-u font-semibold text-brand-600">Email {CONTACT_EMAIL}</a>{" "}
        or call <a href={CONTACT_PHONE_HREF} className="link-u font-semibold text-brand-600">{CONTACT_PHONE}</a> —
        or reach us on social. Our office: {CONTACT_ADDRESS}.
      </p>
      <SocialLinks className="text-brand-600" />
    </div>
  );
}
