import { cache } from "react";
import { apiBase } from "@/lib/backend";
import type { PublicPost, PublicProfile, PublicPulse } from "@/lib/publicPreview";

/**
 * Server-side reads for the public share-link pages in `src/app/(public)/`.
 *
 * SERVER ONLY — import it from route files, never from a "use client" module.
 * It sends `PUBLIC_SSR_KEY` (a plain server env var, so Next never inlines it
 * into browser code), which lets these fetches skip api-service's per-IP rate
 * limits: Vercel's servers share egress IPs.
 *
 * Never throws. A 404 means "not public / doesn't exist"; anything else —
 * timeout, 5xx, bad body — is an error the page turns into a thrown render, so
 * Next keeps serving the last good copy instead of caching an outage.
 */

export type PublicResult<T> = { kind: "ok"; data: T } | { kind: "notFound" } | { kind: "error" };

// Link-preview crawlers give up after a few seconds; stay well inside that.
const TIMEOUT_MS = 2500;

// In "proxy" mode apiBase() is "" (same-origin for the browser); a server-side
// fetch needs an absolute URL, which is the proxy target itself.
const apiOrigin = () =>
  (apiBase() || process.env.BACKEND_PROXY_TARGET || "http://localhost:5000").replace(/\/+$/, "");

export async function fetchPublic<T>(path: string): Promise<PublicResult<T>> {
  const key = process.env.PUBLIC_SSR_KEY;
  try {
    const res = await fetch(`${apiOrigin()}/api/public${path}`, {
      headers: key ? { "x-ssr-key": key } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 120 },
    });
    if (res.status === 404) return { kind: "notFound" };
    if (!res.ok) return { kind: "error" };
    const body = await res.json();
    return body?.data ? { kind: "ok", data: body.data as T } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

const seg = (s: string) => encodeURIComponent(s);

// cache(): generateMetadata and the page share one fetch per request.
export const getPublicProfile = cache((username: string) =>
  fetchPublic<{ profile?: PublicProfile; redirectTo?: string }>(`/profiles/${seg(username)}`));

export const resolveProfileRef = cache((ref: string) =>
  fetchPublic<{ username: string }>(`/profiles/resolve/${seg(ref)}`));

export const getPublicPost = cache((id: string) =>
  fetchPublic<{ post: PublicPost }>(`/posts/${seg(id)}`));

export const getPublicPulse = cache((id: string) =>
  fetchPublic<{ pulse: PublicPulse }>(`/pulses/${seg(id)}`));
