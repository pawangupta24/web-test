"use client";
import { CONTACT_FAQ } from "@/lib/marketing";
import MarketingShell from "@/components/marketing/MarketingShell";
import { Accent } from "@/components/marketing/Type";
import ContactSection from "@/components/marketing/ContactSection";
import FaqSection from "@/components/marketing/FaqSection";

/**
 * /contact — the reference "Book a session" page, rebuilt for Orovion: the
 * contact block (intro + sticky trust on the left, enquiry form on the right)
 * with page-load entrances, then the FAQ.
 */
export default function Contact() {
  return (
    <MarketingShell>
      <ContactSection page />
      <FaqSection
        title={<>Your questions.<br /><Accent>Answered.</Accent></>}
        subtitle="Not sure what to expect? These answers might help before you write in."
        items={CONTACT_FAQ}
        prompt="Didn’t find your answer? Our help center covers accounts, verification, consultations and safety in detail."
        cta={{ label: "Visit the help center", to: "/help" }}
      />
    </MarketingShell>
  );
}
