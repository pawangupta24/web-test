"use client";
import { useState, useEffect } from "react";
import { Navigate } from "@/lib/router";
import { Spinner } from "@/components/ui/Primitives";
import MarketingShell from "@/components/marketing/MarketingShell";
import FaqSection from "@/components/marketing/FaqSection";
import ContactSection from "@/components/marketing/ContactSection";
import { Accent } from "@/components/marketing/Type";
import ThreadWaves from "@/components/marketing/home/ThreadWaves";
import HeroSequence from "@/components/marketing/home/HeroSequence";
import Services from "@/components/marketing/home/Services";
import Philosophy from "@/components/marketing/home/Philosophy";
import Story from "@/components/marketing/home/Story";
import HowItWorks from "@/components/marketing/home/HowItWorks";
import Ready from "@/components/marketing/home/Ready";
import BigQuote from "@/components/marketing/home/BigQuote";
import Community from "@/components/marketing/home/Community";
import Numbers from "@/components/marketing/home/Numbers";
import { HOME, LANDING_FAQ } from "@/lib/marketing";
import { useAuth } from "@/context/AuthContext";

/**
 * / — the marketing home page, laid out and animated after the reference home
 * page (section order, scroll sequence, threads). Copy, numbers, people and
 * photos marked as placeholders live in src/lib/marketing.ts; the motion
 * system is documented in docs/marketing-motion.md.
 */
export default function Landing() {
  const { user, loading, isProfileComplete } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // A returning, already-signed-in visitor should open their account, not the
  // marketing page. Once the silent refresh resolves, redirect. Until then, if a
  // session probably exists (the readable dl_csrf hint), show a neutral splash
  // instead of flashing the landing. Gated on `mounted` so the server-rendered
  // and first client render both show the landing — no hydration mismatch.
  if (!loading && user) return <Navigate to={isProfileComplete ? "/app" : "/onboarding"} replace />;
  const sessionHint = mounted && typeof window !== "undefined" &&
    (!!localStorage.getItem("dl_csrf") || !!localStorage.getItem("dl_has_session"));
  if (loading && sessionHint) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  return (
    <MarketingShell>
      <ThreadWaves enterId="how-it-works" exitId="big-quote" />
      <HeroSequence />
      <Services />
      <Philosophy />
      <Story id="stories" story={HOME.stories[0]} />
      <HowItWorks />
      <Ready />
      <BigQuote />
      <Story story={HOME.stories[1]} flip />
      <Community />
      <Numbers />
      <FaqSection
        title={<>Your questions.<br /><Accent>Answered.</Accent></>}
        subtitle="Not sure where to start? These answers cover what most people ask before joining Orovion."
        items={LANDING_FAQ}
      />
      <ContactSection id="contact" />
    </MarketingShell>
  );
}
