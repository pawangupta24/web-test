// Backend origin resolution. ONE deployment: the EC2 box behind Caddy, reached
// at its own subdomains (api.orovion.com / chat.orovion.com).
//
// Env (NEXT_PUBLIC_* — inlined at BUILD time, so set them before `next build`):
//   NEXT_PUBLIC_API_BASE          api-service origin   e.g. https://api.orovion.com
//   NEXT_PUBLIC_SOCKET_URL        chat-service origin  e.g. https://chat.orovion.com
//   NEXT_PUBLIC_CHAT_SOCKET_URL   optional; defaults to NEXT_PUBLIC_SOCKET_URL
//
// The literal value "proxy" marks the backend as SAME-ORIGIN: the browser calls
// this app's own origin and next.config.mjs rewrites /api, /health and
// /socket.io to BACKEND_PROXY_TARGET / CHAT_PROXY_TARGET server-side.
//
// Proxy mode exists for an http-only backend on a bare IP — it kept the Secure
// refresh cookie first-party on an https site. Now that Caddy terminates TLS on
// real subdomains, you can point straight at them and skip it. It stays
// supported for local dev, where next.config.mjs proxies to localhost:5000.

export type Deployment = {
  name: "default";
  apiBase: string; // "" => same-origin (rewrites in next.config.mjs)
  socketUrl?: string;
  chatSocketUrl?: string;
};

// "proxy" => same-origin. axios wants an EMPTY base (so it builds relative URLs
// the rewrites can catch)...
const apiOrigin = (v?: string) => (v === "proxy" ? "" : v || undefined);

// ...but socket.io wants UNDEFINED. It only falls back to window.location when
// the URI is null/undefined (`if (null == uri)`); an empty string fails that
// check and gets parsed as a URL instead. Mapping "proxy" to "" here would
// silently break same-origin sockets.
const socketOrigin = (v?: string) => (v === "proxy" ? undefined : v || undefined);

const active: Deployment = {
  name: "default",
  apiBase: apiOrigin(process.env.NEXT_PUBLIC_API_BASE) ?? "",
  socketUrl: socketOrigin(process.env.NEXT_PUBLIC_SOCKET_URL),
  chatSocketUrl:
    socketOrigin(process.env.NEXT_PUBLIC_CHAT_SOCKET_URL) ||
    socketOrigin(process.env.NEXT_PUBLIC_SOCKET_URL),
};

export const getBackend = () => active;
export const apiBase = () => active.apiBase;
export const socketUrl = () => active.socketUrl;
export const chatSocketUrl = () => active.chatSocketUrl || active.socketUrl;
