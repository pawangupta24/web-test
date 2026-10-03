#!/usr/bin/env node
/**
 * Checks what Android and iOS check before they open orovion.com links in the
 * app. Both fail SILENTLY — a broken file just means links open in the browser —
 * so run this after any deploy that touches the domain, public/.well-known/ or
 * next.config.mjs.
 *
 *   node scripts/verify-deeplinks.mjs                                  # https://www.orovion.com
 *   node scripts/verify-deeplinks.mjs https://www.orovion.com p/<id>   # also check a live page's card
 *
 * Pass the CANONICAL host — the one in the app's App Links filter and
 * NEXT_PUBLIC_SITE_URL. The other form (apex ↔ www) must redirect to it.
 *
 * Exit code 1 when anything fails.
 */
const origin = (process.argv[2] || "https://www.orovion.com").replace(/\/+$/, "");
const samplePath = process.argv[3];
const PACKAGE = "com.orovion.app";
const SHA256_RE = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const APP_ID_RE = new RegExp(`^[A-Z0-9]{10}\\.${PACKAGE.replace(/\./g, "\\.")}$`);

let failed = 0;
const report = (ok, label, detail = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
};

// redirect: "manual" — the OS verifiers do not follow redirects, so neither do we.
const get = (url) => fetch(url, { redirect: "manual", headers: { "User-Agent": "orovion-verify-deeplinks" } });

async function checkJsonFile(path, validate) {
  const url = `${origin}${path}`;
  try {
    const res = await get(url);
    report(res.status === 200, `${path} answers 200 without a redirect`, `got ${res.status}`);
    const type = res.headers.get("content-type") || "";
    report(type.includes("application/json"), `${path} is served as application/json`, type || "no content-type");
    let body;
    try {
      body = JSON.parse(await res.text());
    } catch {
      report(false, `${path} is valid JSON`);
      return;
    }
    validate(body);
  } catch (err) {
    report(false, `${path} is reachable`, err.message);
  }
}

await checkJsonFile("/.well-known/assetlinks.json", (body) => {
  const target = Array.isArray(body) ? body.find((s) => s?.target?.package_name === PACKAGE)?.target : null;
  report(!!target, `assetlinks.json names ${PACKAGE}`);
  const prints = target?.sha256_cert_fingerprints || [];
  report(prints.length > 0 && prints.every((p) => SHA256_RE.test(p)),
    "every SHA-256 fingerprint is well formed", prints.length ? `${prints.length} listed` : "none listed");
});

await checkJsonFile("/.well-known/apple-app-site-association", (body) => {
  const ids = body?.applinks?.details?.flatMap((d) => d.appIDs || []) || [];
  report(ids.length > 0 && ids.every((id) => APP_ID_RE.test(id)),
    "apple-app-site-association has a real Team ID", ids.join(", ") || "no appIDs");
});

// The non-canonical form (apex ↔ www) must permanently redirect to the canonical
// one, so every link ends up on the host the app verified.
const host = new URL(origin).host;
const otherHost = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
try {
  const res = await get(`https://${otherHost}/`);
  const location = res.headers.get("location") || "";
  report([301, 308].includes(res.status) && location.startsWith(origin),
    `${otherHost} permanently redirects to ${origin}`, `${res.status} → ${location || "no Location"}`);
} catch (err) {
  report(false, `${otherHost} is reachable`, err.message);
}

if (samplePath) {
  const url = `${origin}/${samplePath.replace(/^\/+/, "")}`;
  try {
    const res = await get(url);
    const html = res.status === 200 ? await res.text() : "";
    report(res.status === 200, `${url} answers 200`, `got ${res.status}`);
    report(/<meta[^>]+property="og:title"/.test(html), `${url} carries an og:title for link previews`);
  } catch (err) {
    report(false, `${url} is reachable`, err.message);
  }
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
