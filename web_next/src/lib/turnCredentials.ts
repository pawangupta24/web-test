// Fetches per-call TURN/STUN credentials from the backend and installs them into
// the WebRTC layer before the RTCPeerConnection is built. Mirrors the Flutter
// TurnCredentialsService.
//
// Why: reliable calling on symmetric-NAT / CGNAT / public wifi needs a TURN relay,
// and good relays issue ephemeral creds (short TTL) that can't be baked into the
// build. The backend (GET /api/v2/consultations/turn-credentials) mints them so
// the provider key never ships to the browser; this just applies the result.
//
// Best-effort: on any failure the compile-time NEXT_PUBLIC_TURN_* / STUN config
// stays in force, so a call still tries rather than erroring.
import { dok } from "@/lib/api";
import { setRuntimeIceServers, hasTurn } from "@/lib/webrtcService";

/** Fetch + install the current call's ICE servers. Returns true if TURN is available. Never throws. */
export async function refreshTurnCredentials(): Promise<boolean> {
  try {
    const data: any = await dok.consults.turnCredentials();
    const raw = data?.iceServers;
    const servers: RTCIceServer[] = Array.isArray(raw)
      ? raw.filter((s: any) => s && s.urls).map((s: any) => ({ ...s }))
      : [];
    if (servers.length) {
      setRuntimeIceServers(servers);
      console.log(`[WebRTC] TURN creds installed (${servers.length} ice servers, hasTurn=${hasTurn()})`);
    }
  } catch (e) {
    console.warn("[WebRTC] TURN creds fetch failed → using compile-time config", e);
  }
  return hasTurn();
}

/** Drop runtime creds at end of call so the next call re-fetches fresh ones. */
export function clearTurnCredentials(): void {
  setRuntimeIceServers(null);
}
