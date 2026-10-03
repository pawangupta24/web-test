import type { Metadata } from "next";
import Onboarding from "@/screens/Onboarding";

// Reached only mid-signup; nothing here is useful as a search result.
export const metadata: Metadata = {
  title: "Complete your profile — Orovion",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Onboarding />;
}
