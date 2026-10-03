import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import JsonLd from "@/components/seo/JsonLd";
import ClarityAnalytics from "@/components/analytics/ClarityAnalytics";
import { organizationSchema, webSiteSchema } from "@/lib/schema";
import { TEAM } from "@/lib/team";
import { SITE_NAME, SITE_URL, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from "@/lib/seo";

export const metadata: Metadata = {
  // Every relative URL in any page's metadata (OG images, canonicals) resolves
  // against this. Without it Next emits relative OG URLs, which no crawler or
  // social scraper can fetch.
  metadataBase: new URL(SITE_URL),
  // Inherited by any page that doesn't set its own; pages built with
  // `pageMetadata()` supply a complete title, so no template is used here.
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  // NOTE: no `alternates.canonical` at the layout level — a canonical set here
  // is inherited, and would point every uncanonicalised route at "/".
  // Public pages set their own via `pageMetadata()`.
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@orovion",
    creator: "@orovion",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Lets Google show full-size image thumbnails and longer snippets rather
      // than truncating to its conservative defaults.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Google Search Console's HTML-tag verification method. Leave unset and the
  // tag is simply omitted — use DNS or file verification instead.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1E7B74" },
    { media: "(prefers-color-scheme: dark)", color: "#101617" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applies the stored theme before first paint so a dark-mode reload never flashes
// white. Key ("dl_theme") and fallback-to-system logic mirror src/lib/theme.ts.
// Also restores the Appearance override stylesheet (accent/font/scale — cached as
// compiled CSS under "dl_appearance_css" by AppearanceContext) and the duo flag.
// The leading `js` class lets the marketing scroll-reveals start hidden only
// when script runs, so no-JS visitors and crawlers always see the content.
const noFlashTheme = `(function(){document.documentElement.classList.add("js");try{var t=localStorage.getItem("dl_theme");var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);var c=localStorage.getItem("dl_appearance_css");if(c){var s=document.createElement("style");s.id="dl-appearance";s.textContent=c;document.head.appendChild(s);}var a=JSON.parse(localStorage.getItem("dl_appearance")||"null");if(a&&a.duo)document.documentElement.dataset.duo="1";}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Site-wide entity graph. Emitted on every page so the Organization is
            discoverable no matter which URL Google crawls first. */}
        <JsonLd data={[organizationSchema(TEAM), webSiteSchema()]} />
      </head>
      <body>
        <Providers>{children}</Providers>
        {/* Microsoft Clarity — public marketing/auth routes only; never /app/*.
            No-op unless NEXT_PUBLIC_CLARITY_PROJECT_ID is set. */}
        <ClarityAnalytics />
      </body>
    </html>
  );
}
