"use client";
import { Rocket, BadgeCheck, Newspaper, Stethoscope, ShieldAlert } from "lucide-react";
import LegalShell from "@/components/legal/LegalShell";
import Accordion from "@/components/marketing/Accordion";
import PillButton from "@/components/marketing/PillButton";
import { FAQ_SECTIONS } from "@/lib/faq";

/** Section icon by id. Content itself lives in `src/lib/faq.ts`, which the
    FAQPage JSON-LD on /help also reads — one source, so markup and visible
    copy can never disagree. The accordion keeps closed answers in the DOM. */
const ICONS: Record<string, any> = {
  "getting-started": Rocket,
  verification: BadgeCheck,
  "posts-feed": Newspaper,
  consultations: Stethoscope,
  safety: ShieldAlert,
};

const SECTIONS = FAQ_SECTIONS.map((s, i) => ({
  id: s.id,
  icon: ICONS[s.id],
  title: s.title,
  body: <Accordion items={s.items} defaultOpen={i === 0 ? [0] : []} reveal={false} />,
}));

export default function HelpCenter() {
  return (
    <LegalShell
      eyebrow="Support"
      title="Help center"
      updated={undefined}
      intro={<p>Answers about accounts, verification, the home feed, consultations and safety. Can’t find what you need? Our team is one message away.</p>}
      sections={SECTIONS}
      contact={false}
    >
      <div className="mk-reveal flex flex-col items-start gap-6 rounded-2xl bg-ink-50 p-8">
        <p className="t-title text-ink-900">Still need help?</p>
        <p className="max-w-[480px] t-body text-ink-600">Send us a message and a real person on the Orovion team will reply within two business days.</p>
        <PillButton to="/contact">Contact us</PillButton>
      </div>
    </LegalShell>
  );
}
