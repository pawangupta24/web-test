import type { Metadata } from "next";
import AppLayout from "@/components/layout/AppLayout";

// Auth-gated, client-driven shell — render dynamically rather than prerender at build.
export const dynamic = "force-dynamic";

// Belt and braces alongside the robots.txt Disallow: anything under /app/*
// renders an empty shell to a crawler (the guard redirects to /login), so a
// stray indexed URL would be a thin-content result under the brand name.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
