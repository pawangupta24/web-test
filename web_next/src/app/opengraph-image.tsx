import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

/**
 * The site-wide social card, generated at build rather than shipped as a binary.
 *
 * Next serves it at /opengraph-image and wires the OG + Twitter image tags
 * automatically for every route that doesn't set its own — which is what stops
 * shared links rendering as a bare grey URL in WhatsApp, LinkedIn and X.
 *
 * Satori (the renderer behind ImageResponse) supports flexbox only: every
 * container needs an explicit `display: "flex"`, and there is no grid.
 */
// Edge runtime: @vercel/og's Node build resolves its bundled font via
// fileURLToPath, which throws "Invalid URL" on a Windows `file:///C:/...` path
// during `next build`. The edge build has no such dependency and is the
// runtime Next documents for OG image routes.
export const runtime = "edge";

export const alt = "Orovion — a professional healthcare network for doctors, medical students and patients";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand colors are CSS variables at runtime (see globals.css + the Appearance
// studio), but this image is rendered outside the DOM, so the default teal ramp
// is inlined here.
const TEAL_900 = "#0b3f3b";
const TEAL_700 = "#166d67";
const TEAL_500 = "#2aa79c";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: TEAL_900,
          backgroundImage: `linear-gradient(135deg, ${TEAL_900} 0%, ${TEAL_700} 55%, ${TEAL_500} 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              backgroundColor: "#ffffff",
              color: TEAL_700,
              fontSize: "38px",
              fontWeight: 800,
            }}
          >
            O
          </div>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "76px",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Where healthcare comes together.
          </div>
          <div style={{ display: "flex", marginTop: "28px", fontSize: "30px", color: "rgba(255,255,255,0.82)", lineHeight: 1.35 }}>
            Doctors, medical students and patients — one trusted network for
            clinical knowledge, cases and consultations.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.35)",
              fontSize: "24px",
              color: "#ffffff",
            }}
          >
            Verified professionals
          </div>
          <div style={{ display: "flex", fontSize: "24px", color: "rgba(255,255,255,0.7)" }}>orovion.com</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
