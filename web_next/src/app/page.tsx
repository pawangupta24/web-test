import type { Metadata } from "next";
import Landing from "@/screens/Landing";
import { DEFAULT_TITLE, DEFAULT_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/seo";

// The home page carries the brand query ("orovion"), so it gets the unsuffixed
// title rather than the "<page> — Orovion" pattern the other routes use.
export const metadata: Metadata = {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
};

export default function Page() {
  return <Landing />;
}
