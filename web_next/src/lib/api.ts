import axios from "axios";
import { apiBase } from "./backend";

// --- Web client token transport (see backend docs: "Clients: mobile vs web") ---
// access token: kept in memory only (re-minted on load via the refresh cookie)
// refresh token: httpOnly cookie set by the backend (JS can't read it)
// csrfToken: readable value echoed in the X-CSRF-Token header on refresh/logout
let accessToken = null;

// The `csrfToken` cookie is deliberately NOT httpOnly so it can be read here, and
// it is the authoritative half of the double-submit pair: the server compares our
// header against that very cookie. It is also scoped to COOKIE_DOMAIN and rotates
// together with the refresh cookie, whereas localStorage is scoped to one exact
// origin and can be wiped on its own. Reading the cookie first therefore removes
// three real causes of being logged out: localStorage cleared by the browser, the
// visitor arriving on the apex while `dl_csrf` was written on `www`, and a stale
// `dl_csrf` after another tab rotated the pair. Security is unchanged — the
// protection comes from a cross-origin attacker being unable to READ the cookie,
// not from where we keep our copy.
const csrfFromCookie = () => {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
  if (!m) return null;
  // A malformed value makes decodeURIComponent THROW, and this runs inside the
  // request interceptor — so fall back to the raw value, which is also what
  // cookie-parser hands the server when it cannot decode. An empty value yields
  // null so the caller falls through to localStorage rather than sending no header.
  try { return decodeURIComponent(m[1]) || null; } catch { return m[1] || null; }
};

// localStorage throws (not just returns null) in some privacy modes, and this
// getter runs inside the request interceptor — an exception here would break every
// request, so every access is guarded.
const readLocal = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };

export const TOKENS = {
  get access() {
    return accessToken;
  },
  get csrf() {
    // `||`, not `??`: an empty cookie value must fall through to localStorage, or
    // we send no header at all and the server answers 403.
    return csrfFromCookie() || readLocal("dl_csrf");
  },
  // Accepts the auth payload: { accessToken, csrfToken } (+ user, ignored here).
  set({ accessToken: a, csrfToken: c } = {}) {
    if (a !== undefined) accessToken = a || null;
    if (c) { try { localStorage.setItem("dl_csrf", c); } catch { /* cookie still carries it */ } }
  },
  clear() {
    accessToken = null;
    try { localStorage.removeItem("dl_csrf"); } catch { /* ignore */ }
  },
};

// --- Admin console token transport (separate from the product user session) ---
// The admin logs in with env credentials and gets its own JWT pair. Kept in
// sessionStorage so the operator's session survives a tab reload but not a new
// tab / browser restart. Attached as Authorization on /admin/* calls only.
let adminAccess: string | null = null;
export const ADMIN_TOKENS = {
  get access() {
    if (adminAccess) return adminAccess;
    if (typeof window !== "undefined") return sessionStorage.getItem("dl_admin_at");
    return null;
  },
  get refresh() {
    return typeof window !== "undefined" ? sessionStorage.getItem("dl_admin_rt") : null;
  },
  set(at, rt) {
    adminAccess = at || null;
    if (typeof window !== "undefined") {
      if (at) sessionStorage.setItem("dl_admin_at", at);
      if (rt) sessionStorage.setItem("dl_admin_rt", rt);
    }
  },
  clear() {
    adminAccess = null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("dl_admin_at");
      sessionStorage.removeItem("dl_admin_rt");
    }
  },
};

export const api = axios.create({
  baseURL: `${apiBase()}/api`,
  withCredentials: true, // send/receive the httpOnly refresh + csrf cookies
  headers: { "Content-Type": "application/json", "X-Client-Type": "web" },
});

// Attach the right bearer token. /admin/* calls use the admin JWT; everything
// else uses the product user access token (+ CSRF on cookie-auth calls).
api.interceptors.request.use((cfg) => {
  // Re-read the base each request: it is cheap, and it keeps this correct if the
  // origin is ever resolved later than module load.
  cfg.baseURL = `${apiBase()}/api`;
  const url = cfg.url || "";
  if (url.startsWith("/admin")) {
    const at = ADMIN_TOKENS.access;
    if (at) cfg.headers.Authorization = `Bearer ${at}`;
    return cfg;
  }
  const t = TOKENS.access;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  if (url.includes("/auth/refresh-token") || url.includes("/auth/logout")) {
    const csrf = TOKENS.csrf;
    if (csrf) cfg.headers["X-CSRF-Token"] = csrf;
  }
  return cfg;
});

// Cookie-based silent refresh (no body — the refresh token rides in the httpOnly cookie).
async function doRefresh() {
  // The timeout matters because of the cross-tab lock below: a half-open
  // connection would otherwise hold `dl_refresh` for minutes, stalling session
  // restore in every other tab behind it.
  const { data } = await api.post("/auth/refresh-token", undefined, { timeout: 15000 });
  const payload = data?.data ?? data;
  TOKENS.set(payload); // { accessToken, csrfToken }
  return payload.accessToken;
}

// Serialise refreshes ACROSS TABS. The server rotates the refresh token on every
// use and retires the old session row, so two tabs refreshing with the same cookie
// means the second is answered 401 "Session not found" — and logs the user out of a
// session that is perfectly healthy. A browser restart that reopens several tabs is
// exactly that scenario. Holding the lock is enough: the cookie jar is shared, so a
// tab that waits picks up the rotated cookie and succeeds. Web Locks is per-origin
// and released automatically if a tab dies; where it is unavailable we just proceed,
// which is the previous behaviour.
const withRefreshLock = <T,>(fn: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator !== "undefined" ? (navigator as any).locks : undefined;
  return locks?.request ? locks.request("dl_refresh", fn) : fn();
};

// Single-flight WITHIN this tab, shared by all three callers: the 401 interceptor
// below, `dok.auth.refresh` and AuthContext's session restore. They used to refresh
// independently, so a mount racing the `online` event rotated the token out from
// under itself.
let refreshing: Promise<string> | null = null;
export const refreshOnce = (): Promise<string> => {
  if (!refreshing) {
    refreshing = withRefreshLock(doRefresh).finally(() => { refreshing = null; });
  }
  return refreshing;
};
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const url = config?.url || "";

    // Admin calls are self-contained: never fall through to the product user
    // refresh path. Refresh the admin JWT once on 401 (except on auth endpoints,
    // so a bad login doesn't loop), otherwise reject as-is.
    if (url.startsWith("/admin")) {
      const isAdminAuthCall = url.startsWith("/admin/auth/");
      if (!isAdminAuthCall && response?.status === 401 && config && !config._retry) {
        config._retry = true;
        try {
          const rt = ADMIN_TOKENS.refresh;
          if (!rt) throw new Error("no admin refresh token");
          const { data } = await axios.post(
            `${apiBase()}/api/admin/auth/refresh`,
            { refreshToken: rt },
            { headers: { "Content-Type": "application/json" } }
          );
          const p = data?.data ?? data;
          ADMIN_TOKENS.set(p.accessToken, p.refreshToken);
          config.headers.Authorization = `Bearer ${p.accessToken}`;
          return api(config);
        } catch (e) {
          ADMIN_TOKENS.clear();
          if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent("dl:admin-expired"));
        }
      }
      return Promise.reject(error);
    }

    // QR-login endpoints run on the logged-out login page and have their own
    // handling, so a 401 there (e.g. "authorizing device no longer active") must
    // NOT trigger the refresh loop — there's no session to refresh.
    const skipRefresh = url.includes("/auth/refresh-token") || url.includes("/auth/qr/");
    if (response?.status === 401 && config && !config._retry && !skipRefresh) {
      config._retry = true;
      try {
        const fresh = await refreshOnce();
        config.headers.Authorization = `Bearer ${fresh}`;
        return api(config);
      } catch (e: any) {
        // Only the refresh's OWN verdict may end the session, matching
        // AuthContext's rule. A 500 (including a rolled-back rotation), a 429 or
        // an offline blip means "retry later" — clearing here would log out a user
        // whose refresh cookie is perfectly valid, and `dl:auth-expired` also makes
        // AuthContext drop the whole offline cache.
        const s = e?.response?.status;
        if (s === 401 || s === 403) {
          TOKENS.clear();
          if (typeof window !== "undefined")
            window.dispatchEvent(new CustomEvent("dl:auth-expired"));
        }
      }
    }
    return Promise.reject(error);
  }
);

// Unwrap the standard { statusCode, success, message, data } envelope
const unwrap = (p) => p.then((r) => r.data?.data ?? r.data);

// --- Trending hashtags: client cache + in-flight dedup ---
// Trending tags are global, slow-changing data rendered by RightRail, which
// remounts on every Feed/Explore navigation (and on background→foreground). With
// no coalescing that fans out into one identical request per mount, all charged
// to the single shared per-user /api rate-limit bucket — the source of the 429s
// on /posts/trending/hashtags. We (1) serve an in-memory copy for a few minutes,
// (2) collapse concurrent callers onto ONE in-flight request, and (3) back off
// briefly after a failure so a 429/500 can't be retried into a storm. It stays
// optional: any failure surfaces to the caller's .catch (RightRail renders empty).
let _trendingCache: { data: any; ts: number } | null = null;
let _trendingInflight: Promise<any> | null = null;
let _trendingCooldownUntil = 0;
const TRENDING_TTL_MS = 5 * 60 * 1000;      // serve cache without refetching
const TRENDING_COOLDOWN_MS = 60 * 1000;      // after a failure, don't refetch

const trendingTags = () => {
  const now = Date.now();
  if (_trendingCache && now - _trendingCache.ts < TRENDING_TTL_MS) return Promise.resolve(_trendingCache.data);
  if (_trendingInflight) return _trendingInflight;
  // Recent failure — degrade to last-known (or empty) instead of hammering.
  if (now < _trendingCooldownUntil) return Promise.resolve(_trendingCache?.data ?? { hashtags: [] });
  _trendingInflight = unwrap(api.get("/posts/trending/hashtags?limit=8"))
    .then((d) => { _trendingCache = { data: d, ts: Date.now() }; return d; })
    .catch((e) => { _trendingCooldownUntil = Date.now() + TRENDING_COOLDOWN_MS; throw e; })
    .finally(() => { _trendingInflight = null; });
  return _trendingInflight;
};

// POST multipart/form-data (file uploads). Content-Type is left undefined so the
// browser/axios set the correct multipart boundary instead of our JSON default.
const postForm = (url, formData) =>
  unwrap(api.post(url, formData, { headers: { "Content-Type": undefined } }));

// PATCH multipart/form-data (let the browser set the multipart boundary).
const patchForm = (url, formData) =>
  unwrap(api.patch(url, formData, { headers: { "Content-Type": undefined } }));

// Generic per-row list CRUD (JSON) for the role-based profile lists.
const profileList = (base) => ({
  list: () => unwrap(api.get(base)),                          // { items: [...] }
  add: (b) => unwrap(api.post(base, b)),                      // { item }
  update: (id, b) => unwrap(api.patch(`${base}/${id}`, b)),   // { item }
  remove: (id) => unwrap(api.delete(`${base}/${id}`)),        // "Entry deleted."
});

/** Thin endpoint map mirroring the Orovion backend. */
export const dok = {
  auth: {
    google: (b) => unwrap(api.post("/auth/google", b)),
    apple: (b) => unwrap(api.post("/auth/apple", b)),
    sendOtp: (b) => unwrap(api.post("/auth/send-otp", b)),
    verifyOtp: (b) => unwrap(api.post("/auth/verify-otp", b)),
    // Web: no body — refresh token comes from the httpOnly cookie; CSRF header added
    // by the interceptor. Goes through `refreshOnce` so the session restore, the
    // socket reauth, the call client and the 401 interceptor share ONE in-flight
    // refresh; each rotation invalidates the previous token, so racing them logs the
    // user out. Resolves with the access token — every caller only awaits it.
    refresh: () => refreshOnce(),
    logout: () => unwrap(api.post("/auth/logout")),
    logoutAll: () => unwrap(api.post("/auth/logout-all")),
    sessions: () => unwrap(api.get("/auth/sessions")),
    revokeSession: (id) => unwrap(api.delete(`/auth/sessions/${id}`)),
    // QR login (this device is logged in by a primary device scanning the QR).
    // challenge → poll until approved → redeem for a real (secondary) session.
    qrChallenge: () => unwrap(api.post("/auth/qr/challenge")),
    qrPoll: (id) => unwrap(api.get(`/auth/qr/challenge/${id}`)),
    qrRedeem: (b) => unwrap(api.post("/auth/qr/redeem", b)),
    meta: () => unwrap(api.get("/auth/meta/specializations")),
    metaCourses: () => unwrap(api.get("/auth/meta/courses")),
  },
  users: {
    onboard: (b) => unwrap(api.post("/users/onboard", b)),
    me: () => unwrap(api.get("/users/profile/me")),
  },
  profile: {
    me: () => unwrap(api.get("/profile/me")),
    full: () => unwrap(api.get("/profile/me/full")), // hydrate: { user, locks, memberSince, accountAge, doctor|student|general, completion, verification }
    completion: () => unwrap(api.get("/profile/me/completion")), // { completion: { sections, percent }, verification: { status } }
    status: () => unwrap(api.get("/profile/me/status")),
    counts: () => unwrap(api.get("/profile/me/counts")),
    usernameCheck: (username) => unwrap(api.get(`/profile/username/check?username=${encodeURIComponent(username)}`)), // { available, username, reason }
    updateUsername: (username) => unwrap(api.put("/profile/me/username", { username })), // { uniqueUsername } · 400 format · 409 taken
    byUsername: (handle) => unwrap(api.get(`/profile/u/${encodeURIComponent(String(handle).replace(/^@/, ""))}`)),
    byId: (id) => unwrap(api.get(`/profile/${id}`)),
    publicBySlug: (slug) => unwrap(api.get(`/profile/public/${slug}`)),
    shareLink: () => unwrap(api.get("/profile/me/share/link")),
    updateBasic: (b) => unwrap(api.put("/profile/me/basic", b)),
    verifyEmail: (b) => unwrap(api.post("/profile/me/email/verify", b)),
    uploadAvatar: (file) => { const f = new FormData(); f.append("photo", file); return postForm("/profile/me/photo", f); }, // docs/profile.md §2: POST /me/photo (field "photo") → { profilePhoto }
    uploadCover: (file) => { const f = new FormData(); f.append("cover", file); return postForm("/profile/me/cover", f); }, // POST /me/cover (field "cover") → { coverPhoto }
    // --- Role-based profile lists (docs/profile.md §3–5) ---
    education: profileList("/profile/me/doctor/education"),       // { organizationName*, departmentName?, startDate?, endDate? }
    workplace: profileList("/profile/me/doctor/workplace"),       // { role?, organizationName*, department?, startDate?, endDate? }
    academics: profileList("/profile/me/student/academics"),      // { collegeName*, program?, city?, currentYear?, expectedGraduationDate? }
    experiences: profileList("/profile/me/student/experiences"),  // { institution*, program?, city?, startDate?, endDate?, interests?[] }
    certificates: {
      list: () => unwrap(api.get("/profile/me/doctor/certificates")),
      add: ({ name, validationDate, file }) => {
        const f = new FormData();
        f.append("name", name);
        if (validationDate) f.append("validationDate", validationDate);
        if (file instanceof Blob) f.append("file", file); // only a freshly-picked file, never an existing URL
        return postForm("/profile/me/doctor/certificates", f);
      },
      update: (id, { name, validationDate, file }) => {
        const f = new FormData();
        if (name != null) f.append("name", name);
        if (validationDate != null) f.append("validationDate", validationDate);
        if (file instanceof Blob) f.append("file", file); // skip when file is an unchanged URL string
        return patchForm(`/profile/me/doctor/certificates/${id}`, f);
      },
      remove: (id) => unwrap(api.delete(`/profile/me/doctor/certificates/${id}`)),
    },
    interests: {
      list: () => unwrap(api.get("/profile/me/general/interests")),
      add: (topic) => unwrap(api.post("/profile/me/general/interests", { topic })), // 409 on duplicate
      remove: (id) => unwrap(api.delete(`/profile/me/general/interests/${id}`)),
    },
    doctorSpecialties: (specialties) => unwrap(api.put("/profile/me/doctor/specialties", { specialties })), // { specialties }
    // --- Doctor verification (combined Path A + Path B, multipart, docs/profile.md §8) ---
    verificationGet: () => unwrap(api.get("/profile/me/doctor/verification")),       // { status, rejectionReason?, submission? }
    verificationSubmit: (formData) => postForm("/profile/me/doctor/verification", formData), // one POST: credential + aadhaarFront/aadhaarBack + liveness (no pathType)
    // Blocking
    blockList: (q = "") => unwrap(api.get(`/profile/block/list${q}`)),
    block: (userId) => unwrap(api.post(`/profile/block/${userId}`)),
    unblock: (userId) => unwrap(api.delete(`/profile/block/${userId}`)),
  },
  account: {
    personalDetails: () => unwrap(api.get("/account/personal-details")),
    privacy: () => unwrap(api.get("/account/privacy")),
    updatePrivacy: (b) => unwrap(api.put("/account/privacy", b)),
    legal: () => unwrap(api.get("/account/legal")),
    feedback: (b) => unwrap(api.post("/account/feedback", b)),
    deactivate: () => unwrap(api.post("/account/deactivate")),
    remove: () => unwrap(api.post("/account/delete")),
    restore: () => unwrap(api.post("/account/restore")),
  },
  feed: {
    home: (q = "") => unwrap(api.get(`/feed/home${q}`)),
    explore: (q = "") => unwrap(api.get(`/feed/explore${q}`)),
    guest: (tab = "all") => unwrap(api.get(`/feed/guest?tab=${tab}`)),
    saved: (q = "") => unwrap(api.get(`/feed/saved${q}`)), // ?tab=all|post|research|thesis|case_study|reel
    notInterested: (postId) => unwrap(api.post(`/feed/not-interested/${postId}`)),
    mute: (userId) => unwrap(api.post(`/feed/mute/${userId}`)), // "don't recommend" author
    unmute: (userId) => unwrap(api.delete(`/feed/mute/${userId}`)),
  },
  posts: {
    get: (id) => unwrap(api.get(`/posts/${id}`)),
    update: (id, b) => unwrap(api.put(`/posts/${id}`, b)), // own post, ≤24h (403 after)
    remove: (id) => unwrap(api.delete(`/posts/${id}`)),
    report: (id, b) => unwrap(api.post(`/posts/${id}/report`, b)), // { category, reason? }
    like: (id) => unwrap(api.post(`/posts/${id}/like`)), // toggle → { isLiked, likesCount }
    likes: (id, q = "") => unwrap(api.get(`/posts/${id}/likes${q}`)), // { users, hasMore, nextCursor }
    save: (id) => unwrap(api.post(`/posts/${id}/save`)),
    comments: (id, q = "") => unwrap(api.get(`/posts/${id}/comments${q}`)),
    comment: (id, b) => unwrap(api.post(`/posts/${id}/comments`, b)), // { content, parentId? }
    replies: (id, commentId, q = "") => unwrap(api.get(`/posts/${id}/comments/${commentId}/replies${q}`)),
    likeComment: (id, commentId) => unwrap(api.post(`/posts/${id}/comments/${commentId}/like`)),
    deleteComment: (id, commentId) => unwrap(api.delete(`/posts/${id}/comments/${commentId}`)),
    shareInApp: (id, recipientIds) => unwrap(api.post(`/posts/${id}/share/inapp`, { recipientIds })),
    byUser: (userId, q = "") => unwrap(api.get(`/posts/user/${userId}${q}`)),
    trendingTags, // cached + in-flight-deduped (see definition above)
    create: (form) => postForm("/posts", form), // multipart: media (×10) + JSON fields
  },
  pulses: {
    feed: (q = "") => unwrap(api.get(`/reels/feed${q}`)),
    byUser: (userId, q = "") => unwrap(api.get(`/reels/user/${userId}${q}`)), // a user's reels (profile content grid)
    create: (form) => postForm("/reels", form), // multipart: video + caption/visibility/specialties/hashtags/mentions
    get: (id) => unwrap(api.get(`/reels/${id}`)),
    update: (id, b) => unwrap(api.put(`/reels/${id}`, b)), // caption/tags ≤24h (403 after)
    remove: (id) => unwrap(api.delete(`/reels/${id}`)),
    like: (id) => unwrap(api.post(`/reels/${id}/like`)), // toggle → { isLiked, likesCount }
    likes: (id, q = "") => unwrap(api.get(`/reels/${id}/likes${q}`)), // { users, hasMore, nextCursor }
    save: (id) => unwrap(api.post(`/reels/${id}/save`)),
    view: (id) => unwrap(api.post(`/reels/${id}/view`)), // debounced view ping
    watched: (id) => unwrap(api.post(`/reels/${id}/watched`)), // >50% / >10s → 48h lockout
    notInterested: (id) => unwrap(api.post(`/reels/${id}/not-interested`)),
    // Comments mirror posts (same component contract)
    comments: (id, q = "") => unwrap(api.get(`/reels/${id}/comments${q}`)),
    comment: (id, b) => unwrap(api.post(`/reels/${id}/comments`, b)), // { content, parentId? }
    replies: (id, commentId, q = "") => unwrap(api.get(`/reels/${id}/comments/${commentId}/replies${q}`)),
    likeComment: (id, commentId) => unwrap(api.post(`/reels/${id}/comments/${commentId}/like`)),
    deleteComment: (id, commentId) => unwrap(api.delete(`/reels/${id}/comments/${commentId}`)),
  },
  follows: {
    // Always immediate — private accounts were removed, so there is no
    // "requested" outcome any more. → { status:"following", viewerFollowingCount, targetFollowersCount }
    follow: (id) => unwrap(api.post(`/follows/${id}`)),
    unfollow: (id) => unwrap(api.delete(`/follows/${id}`)),
    check: (id) => unwrap(api.get(`/follows/check/${id}`)), // { isFollowing, isFollowedBy }
    followers: (userId, q = "") => unwrap(api.get(`/follows/${userId}/followers${q}`)), // { followers: [...] }
    following: (userId, q = "") => unwrap(api.get(`/follows/${userId}/following${q}`)), // { following: [...] }
    // withdraw / requests / acceptRequest / rejectRequest were removed with
    // private accounts. The server keeps those routes mounted as no-ops for one
    // release so an older cached bundle degrades quietly instead of erroring.
    suggestions: () => unwrap(api.get("/follows/suggestions?limit=15")),
  },
  search: {
    all: (q) => unwrap(api.get(`/search?q=${encodeURIComponent(q)}&limit=6`)),
    // Predictive typeahead → { users:[...], hashtags:[...] } (PRD §1). Backend: 200ms-friendly, ≥3 chars.
    suggest: (q) => unwrap(api.get(`/search/suggest?q=${encodeURIComponent(q)}`)),
    // Unified search. `extra` carries the filter query string, e.g. "&role=doctor&city=Mumbai" (PRD §3).
    users: (q, extra = "") => unwrap(api.get(`/search/users?q=${encodeURIComponent(q)}${extra}`)),
    posts: (q, extra = "") => unwrap(api.get(`/search/posts?q=${encodeURIComponent(q)}${extra}`)),
    // Unified content (posts + cases + reels) with an opaque keyset cursor (docs/modules/search.md).
    content: (q, extra = "") => unwrap(api.get(`/search/content?q=${encodeURIComponent(q)}${extra}`)),
    hashtags: (q) => unwrap(api.get(`/search/hashtags?q=${encodeURIComponent(q)}`)),
    // Trending hashtags ranked by 48h engagement velocity (PRD §4).
    trending: () => unwrap(api.get("/search/trending")),
    // Hashtag workspace feed; `qs` e.g. "?type=case_study&cursor=…" (PRD §4).
    // Falls back to the posts-by-hashtag route on 404 (older backend builds lack /search/hashtag/:tag).
    hashtag: async (tag, qs = "") => {
      const t = encodeURIComponent(tag);
      try {
        return await unwrap(api.get(`/search/hashtag/${t}${qs}`));
      } catch (e) {
        if (e?.response?.status === 404) return unwrap(api.get(`/posts/hashtag/${t}`));
        throw e;
      }
    },
    // Search history (logged-in). Recorded explicitly on a committed search / result tap, not typeahead.
    history: () => unwrap(api.get("/search/history")),                                  // { items:[{id,query,queryRaw,searchType,createdAt}] }
    recordSearch: (b) => unwrap(api.post("/search/history", b)),                        // { q, type?, entityId?, entityType? }
    deleteHistory: (id) => unwrap(api.delete(`/search/history/${id}`)),
    clearHistory: () => unwrap(api.delete("/search/history")),
    popular: () => unwrap(api.get("/search/popular")),                                  // { terms:[{query,count}] } — distinct from #trending
  },
  network: {
    connections: (q = "") => unwrap(api.get(`/network/connections${q}`)),
    requests: (q = "") => unwrap(api.get(`/network/requests${q}`)),
    discover: (q = "") => unwrap(api.get(`/network/discover${q}`)),
    request: (id) => unwrap(api.post(`/network/request/${id}`)),
    accept: (id) => unwrap(api.put(`/network/request/${id}/accept`)),
    reject: (id) => unwrap(api.put(`/network/request/${id}/reject`)),
  },
  chat: {
    conversations: () => unwrap(api.get("/chat/conversations")),
    messages: (cid, q = "") => unwrap(api.get(`/chat/${cid}/messages${q}`)), // ?cursor=&limit=
    start: (b) => unwrap(api.post("/chat/start", b)),
    // { content, type, clientId?, meta?, replyTo?, forwardCount? }. `clientId`
    // (see newClientId in lib/utils) makes a replay return the stored message
    // instead of creating a duplicate.
    send: (cid, b) => unwrap(api.post(`/chat/${cid}/messages`, b)),
    unreadCount: () => unwrap(api.get("/chat/unread-count")),
    seen: (cid) => unwrap(api.post(`/chat/${cid}/seen`, {})),
    // Multipart media/document upload (field "file") → { message }. `clientId`
    // dedupes a replayed upload the same way a text send does.
    upload: (cid, file, clientId) => {
      const f = new FormData();
      f.append("file", file);
      if (clientId) f.append("clientId", clientId);
      return postForm(`/chat/${cid}/upload`, f);
    },
    // React (toggle) with an emoji → updated reactions. Empty emoji removes.
    react: (messageId, emoji) => unwrap(api.post(`/chat/messages/${messageId}/react`, { emoji })),
    // Delete a message. deleteFor: 'me' | 'for_everyone' (≤60 min, sender only).
    deleteMessage: (messageId, deleteFor = "me") => unwrap(api.delete(`/chat/messages/${messageId}?deleteFor=${deleteFor}&forEveryone=${deleteFor === "for_everyone"}`)),
    // Clear a conversation's messages for me (keeps the conversation).
    clear: (cid, deleteMedia = true) => unwrap(api.delete(`/chat/${cid}/messages?deleteMedia=${deleteMedia}`)),
    pin: (cid, pinned) => unwrap(api.post(`/chat/${cid}/pin`, {}, { params: { pinned } })),
    mute: (cid, muted) => unwrap(api.post(`/chat/${cid}/mute`, {}, { params: { muted } })),
    // Calling permission: { myAllowsCalls, peerAllowsCalls }.
    getCalling: (cid) => unwrap(api.get(`/chat/${cid}/calling`)),
    setCalling: (cid, enabled) => unwrap(api.post(`/chat/${cid}/calling`, {}, { params: { enabled } })),
  },
  // Insights — Phase 1 (Overview only; see the Insights implementation report
  // for the phased plan). Mirrors the Flutter app's features/insights/.
  insights: {
    overview: (period = "last_30_days", from?: string, to?: string) =>
      unwrap(api.get("/insights/overview", { params: { period, ...(period === "custom" ? { from, to } : {}) } })),
    refresh: () => unwrap(api.post("/insights/refresh", {})),
  },
  notifications: {
    list: (q = "") => unwrap(api.get(`/notifications${q}`)),
    unread: () => unwrap(api.get("/notifications/unread-count")),
    readAll: () => unwrap(api.put("/notifications/read-all")),
    read: (id) => unwrap(api.put(`/notifications/${id}/read`)),
    remove: (id) => unwrap(api.delete(`/notifications/${id}`)),
    preferences: () => unwrap(api.get("/notifications/preferences")),
    updatePreferences: (b) => unwrap(api.put("/notifications/preferences", b)),
  },
  // Consultation V2 — mirrors docnet/lib/features/calls/calls_repository.dart.
  // Base: /api/v2/consultations (api-service) + /api/chat/consultations (chat-service).
  // Reuses every existing endpoint; introduces NO new backend logic.
  consults: {
    // ── Discovery ──────────────────────────────────────────────────────────
    discoverDoctors: (q = "") => unwrap(api.get(`/v2/consultations/doctors${q}`)),     // { doctors, nextCursor }
    getDoctor: (doctorId) => unwrap(api.get(`/v2/consultations/doctors/${doctorId}`)),  // { doctor }

    // ── Requester request flow ─────────────────────────────────────────────
    createRequest: (b) => unwrap(api.post("/v2/consultations/requests", b)),            // { doctorId, reason?, attachments[] } → { request }
    createPaymentOrder: (requestId) => unwrap(api.post(`/v2/consultations/requests/${requestId}/payment-order`, {})),
    confirmPayment: (requestId, b) => unwrap(api.post(`/v2/consultations/requests/${requestId}/payment-callback`, b)), // razorpay_* → { request }
    cancelRequest: (requestId) => unwrap(api.post(`/v2/consultations/requests/${requestId}/cancel`, {})),
    getRequest: (requestId) => unwrap(api.get(`/v2/consultations/requests/${requestId}`)),  // { request }
    listMyRequests: (q = "") => unwrap(api.get(`/v2/consultations/requests/mine${q}`)),      // { requests }
    myHistory: (q = "") => unwrap(api.get(`/v2/consultations/history/mine${q}`)),            // { history }

    // ── Doctor request flow ────────────────────────────────────────────────
    listDoctorRequests: (q = "") => unwrap(api.get(`/v2/consultations/doctor/requests${q}`)),  // { requests }
    getDoctorRequest: (requestId) => unwrap(api.get(`/v2/consultations/doctor/requests/${requestId}`)),
    approveRequest: (requestId, scheduledAtIso) => unwrap(api.post(`/v2/consultations/doctor/requests/${requestId}/approve`, { scheduled_at: scheduledAtIso })),
    declineRequest: (requestId, reason) => unwrap(api.post(`/v2/consultations/doctor/requests/${requestId}/decline`, reason ? { reason } : {})),
    doctorHistory: (q = "") => unwrap(api.get(`/v2/consultations/doctor/history${q}`)),         // { history }
    lifetimeEarnings: () => unwrap(api.get("/v2/consultations/doctor/earnings/lifetime")),       // { earnings }

    // ── Doctor settings ────────────────────────────────────────────────────
    getSettings: () => unwrap(api.get("/v2/consultations/doctor/settings")),                     // { settings }
    updateSettings: (patch) => unwrap(api.put("/v2/consultations/doctor/settings", patch)),      // { settings }

    // ── Doctor bank accounts (RazorpayX) ───────────────────────────────────
    listBankAccounts: () => unwrap(api.get("/v2/consultations/doctor/bank-accounts")),           // { accounts }
    addBankAccount: (b) => unwrap(api.post("/v2/consultations/doctor/bank-accounts", b)),        // → { account } (400 if RazorpayX verify fails)
    updateBankAccount: (accountId, b) => unwrap(api.put(`/v2/consultations/doctor/bank-accounts/${accountId}`, b)),
    setPrimaryAccount: (accountId) => unwrap(api.put(`/v2/consultations/doctor/bank-accounts/${accountId}/set-primary`, {})),
    deleteBankAccount: (accountId) => unwrap(api.delete(`/v2/consultations/doctor/bank-accounts/${accountId}`)),

    // ── Call lifecycle ─────────────────────────────────────────────────────
    joinCall: (requestId) => unwrap(api.post(`/v2/consultations/calls/${requestId}/join`, {})),
    endCall: (requestId, endReason = "completed") => unwrap(api.post(`/v2/consultations/calls/${requestId}/end`, { end_reason: endReason })),
    saveNotes: (requestId, notes) => unwrap(api.post(`/v2/consultations/calls/${requestId}/notes`, { notes })),
    // Finish Consultation: persists clinical summary + COMPLETED + auto-connect + notify.
    completeConsultation: (requestId, summary) => unwrap(api.post(`/v2/consultations/calls/${requestId}/complete`, summary)),

    // ── Ratings ────────────────────────────────────────────────────────────
    submitRating: (b) => unwrap(api.post("/v2/consultations/ratings", b)), // { consultationRequestId, stars, comment? }

    // ── Secure payment flow (Razorpay) ─────────────────────────────────────
    createPaymentIntent: (b) => unwrap(api.post("/v2/consultations/payment/create-order", b)),   // { doctorId, reason? } → { paymentIntentId, order, fees, doctor }
    verifyPayment: (b) => unwrap(api.post("/v2/consultations/payment/verify", b)),                // razorpay* + attachments[] → { request }
    uploadAttachment: (file) => { const f = new FormData(); f.append("file", file); return postForm("/v2/consultations/attachments", f); }, // → { attachment: { url, publicId, name } }
    getInvoice: (requestId) => unwrap(api.get(`/v2/consultations/payment/invoice/${requestId}`)), // { invoice }

    // ── Prescription (generated after a consultation is COMPLETED) ─────────────
    getPrescription: (requestId) => unwrap(api.get(`/v2/consultations/prescription/${requestId}`)), // { prescription } | 404
    // PDF bytes streamed from our authenticated backend (Cloudinary blocks raw PDFs).
    prescriptionPdfBlob: (requestId) =>
      api.get(`/v2/consultations/prescription/${requestId}/pdf/file`, { responseType: "blob" }).then((r) => r.data as Blob),

    // ── WebRTC ICE servers (per-call; TURN provider key stays server-side) ─────
    turnCredentials: () => unwrap(api.get("/v2/consultations/turn-credentials")), // { iceServers, ttl }

    // ── E2EE consult chat (chat-service proxy) ─────────────────────────────
    getThread: (peerId, q = "") => unwrap(api.get(`/chat/consultations/threads/${peerId}${q}`)),  // { messages }
    sendThreadMessage: (peerId, b) => unwrap(api.post(`/chat/consultations/threads/${peerId}`, b)),
    markThreadRead: (peerId) => unwrap(api.post(`/chat/consultations/threads/${peerId}/read`, {})),
  },
  admin: {
    // ── Auth (env username/password → admin JWT stored in ADMIN_TOKENS) ──
    login: async (username, password) => {
      const { data } = await api.post("/admin/auth/login", { username, password });
      const p = data?.data ?? data;
      ADMIN_TOKENS.set(p.accessToken, p.refreshToken);
      return p; // { admin, accessToken, refreshToken }
    },
    me: () => unwrap(api.get("/admin/auth/me")),
    logout: async () => {
      try { await api.post("/admin/auth/logout", {}); } catch { /* ignore */ }
      ADMIN_TOKENS.clear();
    },

    // ── Dashboard ──
    overview: (refresh = false) => unwrap(api.get(`/admin/overview${refresh ? "?refresh=true" : ""}`)),

    // ── User administration ──
    users: (params = {}) => unwrap(api.get("/admin/users", { params })),
    user: (id) => unwrap(api.get(`/admin/users/${id}`)),
    suspendUser: (id, b) => unwrap(api.post(`/admin/users/${id}/suspend`, b || {})),
    unsuspendUser: (id) => unwrap(api.post(`/admin/users/${id}/unsuspend`, {})),
    deactivateUser: (id, b) => unwrap(api.post(`/admin/users/${id}/deactivate`, b || {})),
    deleteUser: (id, b) => unwrap(api.delete(`/admin/users/${id}`, { data: b || {} })),

    // ── Content moderation (post|research|thesis|case_study|reel|clinical_case) ──
    content: (params = {}) => unwrap(api.get("/admin/content", { params })),
    deleteContent: (type, id, b) => unwrap(api.delete(`/admin/content/${type}/${id}`, { data: b || {} })),

    // ── Doctor verifications ──
    vStats: () => unwrap(api.get("/admin/verifications/stats")),
    vList: (status = "SUBMITTED") => unwrap(api.get("/admin/verifications", { params: { status, limit: 50 } })),
    vDetail: (userId) => unwrap(api.get(`/admin/verifications/${userId}`)),
    vInReview: (userId) => unwrap(api.post(`/admin/verifications/${userId}/in-review`, {})),
    vApprove: (userId) => unwrap(api.post(`/admin/verifications/${userId}/approve`, {})),
    vReject: (userId, reason) => unwrap(api.post(`/admin/verifications/${userId}/reject`, { reason })),
    vReset: (userId) => unwrap(api.post(`/admin/verifications/${userId}/reset`, {})),

    // ── Student verifications ──
    svList: () => unwrap(api.get("/admin/student-verifications", { params: { limit: 50 } })),
    svApprove: (userId) => unwrap(api.post(`/admin/student-verifications/${userId}/approve`, {})),
    svReject: (userId, reason) => unwrap(api.post(`/admin/student-verifications/${userId}/reject`, { reason })),

    // ── Reported content ──
    reports: (status = "pending") => unwrap(api.get("/admin/reports", { params: { status, limit: 50 } })),
    dismissReport: (id) => unwrap(api.post(`/admin/reports/${id}/dismiss`, {})),
    deletePost: (id) => unwrap(api.delete(`/admin/posts/${id}`)),

    // ── Feedback / deletion queue / audit ──
    feedback: (params = {}) => unwrap(api.get("/admin/feedback", { params })),
    consultationRatings: (params = {}) => unwrap(api.get("/admin/consultations/ratings", { params })),
    deletions: (params = {}) => unwrap(api.get("/admin/deletions", { params })),
    audit: (params = {}) => unwrap(api.get("/admin/audit", { params })),

    // ── Consultation settlements (doctor payouts) ──
    settlements: (params = {}) => unwrap(api.get("/admin/consultations/settlements", { params })),
    settlementSummary: () => unwrap(api.get("/admin/consultations/settlements/summary")),
    settlementRevenue: (params = {}) => unwrap(api.get("/admin/consultations/revenue", { params })),
    settlementLiability: () => unwrap(api.get("/admin/consultations/liability")),
    generateSettlements: (b) => unwrap(api.post("/admin/consultations/settlements/generate", b)),
    approveSettlement: (id) => unwrap(api.post(`/admin/consultations/settlements/${id}/approve`, {})),
    markSettlementPaid: (id, bankReference) =>
      unwrap(api.post(`/admin/consultations/settlements/${id}/mark-paid`, { bankReference })),
    retrySettlement: (id) => unwrap(api.post(`/admin/consultations/settlements/${id}/retry`, {})),
    cancelSettlement: (id) => unwrap(api.post(`/admin/consultations/settlements/${id}/cancel`, {})),

    // ── Payments dashboard ──
    paymentsSummary: (params = {}) => unwrap(api.get("/admin/payments/summary", { params })),
    paymentsRevenue: (params = {}) => unwrap(api.get("/admin/payments/revenue", { params })),
    payments: (params = {}) => unwrap(api.get("/admin/payments", { params })),
    paymentDetail: (id) => unwrap(api.get(`/admin/payments/${id}`)),
    paymentInvoice: (id) => unwrap(api.get(`/admin/payments/${id}/invoice`)),

    // ── Consultation transactions (per-user history + invoices) ──
    txnUsers: (params = {}) => unwrap(api.get("/admin/consultations/transactions/users", { params })),
    userTransactions: (userId) => unwrap(api.get(`/admin/consultations/transactions/users/${userId}`)),
    txnInvoice: (requestId) => unwrap(api.get(`/admin/consultations/transactions/invoice/${requestId}`)),
  },
};
