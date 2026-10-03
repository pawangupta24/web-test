import { describe, it, expect, afterEach, vi } from "vitest";

// backend.ts reads NEXT_PUBLIC_* at import time, so each scenario resets the
// module registry, seeds process.env, and re-imports the module fresh.
//
// The dual-deployment (Render/AWS) probing, sessionStorage cache and failover
// were removed when the backend consolidated onto one EC2 box behind Caddy —
// so the suite below covers only origin resolution, which is all that remains.

const ENV_KEYS = [
  "NEXT_PUBLIC_API_BASE",
  "NEXT_PUBLIC_SOCKET_URL",
  "NEXT_PUBLIC_CHAT_SOCKET_URL",
];

const API = "https://api.orovion.com";
const CHAT = "https://chat.orovion.com";

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  return import("@/lib/backend");
}

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("origin resolution", () => {
  it("uses the configured api + socket origins", async () => {
    const b = await load({
      NEXT_PUBLIC_API_BASE: API,
      NEXT_PUBLIC_SOCKET_URL: CHAT,
    });
    expect(b.apiBase()).toBe(API);
    expect(b.socketUrl()).toBe(CHAT);
    // chat socket falls back to the general socket url when unset
    expect(b.chatSocketUrl()).toBe(CHAT);
  });

  it("prefers CHAT_SOCKET_URL over SOCKET_URL for the call socket", async () => {
    const b = await load({
      NEXT_PUBLIC_API_BASE: API,
      NEXT_PUBLIC_SOCKET_URL: CHAT,
      NEXT_PUBLIC_CHAT_SOCKET_URL: "https://calls.orovion.com",
    });
    expect(b.chatSocketUrl()).toBe("https://calls.orovion.com");
    expect(b.socketUrl()).toBe(CHAT);
  });

  it('treats "proxy" as same-origin', async () => {
    // Same-origin mode: the browser calls this app's own origin and
    // next.config.mjs rewrites /api and /socket.io server-side. An empty
    // apiBase and an undefined socketUrl are what signal that downstream.
    const b = await load({
      NEXT_PUBLIC_API_BASE: "proxy",
      NEXT_PUBLIC_SOCKET_URL: "proxy",
    });
    expect(b.apiBase()).toBe("");
    expect(b.socketUrl()).toBeUndefined();
    expect(b.chatSocketUrl()).toBeUndefined();
  });

  it("defaults to same-origin when nothing is configured", async () => {
    const b = await load({});
    expect(b.apiBase()).toBe("");
    expect(b.socketUrl()).toBeUndefined();
    expect(b.getBackend().name).toBe("default");
  });
});
