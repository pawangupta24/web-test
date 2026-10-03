"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { connectCallSocket } from "@/lib/callClient";
import { WebRTCService } from "@/lib/webrtcService";
import { refreshTurnCredentials, clearTurnCredentials } from "@/lib/turnCredentials";
import { useNavigate } from "@/lib/router";

export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "connected" | "ended";
export type CallType = "audio" | "video";

/** Consultation context attached to a call so the surface shows the consult
 *  flow (in-call Rx/reports) and routes to the summary/detail when it ends. */
export interface CallConsult {
  requestId: string;
  viewerIsDoctor: boolean;
}

export interface ActiveCall {
  callId: string;
  peerId: string;
  peerName: string;
  peerPhoto?: string | null;
  type: CallType;
  isCaller: boolean;
  consult?: CallConsult | null;
  /** True when this call flows over the app's consultation signaling channel
   *  (consultation_call_invite/_accepted/_end, WebRTC keyed by consultationId)
   *  so the Flutter doctor opens its real VideoConsultScreen. Patient→doctor only
   *  (the backend routes consult invites to the doctor). */
  useConsultProtocol?: boolean;
}

export interface CallDebug {
  lastInvite?: any;
  lastOffer?: any;
  lastAnswer?: any;
  lastIce?: any;
}

interface CallCtx {
  phase: CallPhase;
  call: ActiveCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  logs: string[];
  socketConnected: boolean;
  connectionState: string;
  callStatus: string;
  debug: CallDebug;
  myId: string | undefined;
  /** WhatsApp-style floating call: the call surface collapses to a draggable
   *  tile so the rest of the app is usable mid-call. */
  minimized: boolean;
  setMinimized: (v: boolean) => void;
  startCall: (peerId: string, peerName: string, peerPhoto: string | null, type: CallType, consult?: CallConsult | null) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
  switchCamera: () => void;
}

const Ctx = createContext<CallCtx | null>(null);
export const useCall = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCall must be used within CallProvider");
  return c;
};

const newCallId = () => `call_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const auth: any = useAuth() || {};
  const user = auth.user;
  const myId = user?._id || user?.id;

  const [phase, setPhase] = useState<CallPhase>("idle");
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [minimized, setMinimized] = useState(false);
  // A new/ended call always opens full-screen — never inherit a stale tile.
  useEffect(() => {
    if (phase !== "connected" && phase !== "connecting") setMinimized(false);
  }, [phase]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>("");
  const [debug, setDebug] = useState<CallDebug>({});
  // WhatsApp-style caller status: "" / "Calling…" / "Ringing…" / "Connecting…" /
  // "User is unavailable" / "User is offline" / "No answer".
  const [callStatus, setCallStatus] = useState<string>("");

  const svcRef = useRef<WebRTCService | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const ringTimeout = useRef<any>(null);
  const reachTimeout = useRef<any>(null); // bound how long we wait before "unavailable"
  const peerRang = useRef<boolean>(false);
  const connectedRef = useRef<boolean>(false); // did media actually connect this call?
  // useNavigate() returns a fresh fn each render — keep it in a ref so cleanup's
  // identity stays stable (else the socket effect would re-subscribe every render).
  const nav = useNavigate();
  const navRef = useRef(nav);
  navRef.current = nav;
  callRef.current = call;

  const log = useCallback((line: string) => {
    const ts = new Date().toISOString().substring(11, 23);
    setLogs((p) => [`[${ts}] ${line}`, ...p].slice(0, 200));
    // eslint-disable-next-line no-console
    console.log(`[Call] ${line}`);
  }, []);

  const socket = useRef<any>(null);

  // Build the WebRTCService for the current call and wire its callbacks.
  const buildService = useCallback((c: ActiveCall) => {
    const svc = new WebRTCService(c.callId, c.peerId, c.type === "video", {
      send: (event, payload) => socket.current?.emit(event, payload),
      onRemoteStream: (s) => setRemoteStream(s),
      onConnected: () => { connectedRef.current = true; setPhase((p) => (p === "connected" ? p : (log("CONNECTED"), "connected"))); },
      onIceType: (dir, t) => log(`ICE ${dir === "sent" ? "ICE_SENT" : "ICE_RECEIVED"} ${t}`),
      onState: (s) => setConnectionState(s),
      onFailed: () => log("⚠️ connection FAILED"),
      log,
    });
    svcRef.current = svc;
    return svc;
  }, [log]);

  const cleanup = useCallback((reason: string) => {
    if (ringTimeout.current) clearTimeout(ringTimeout.current);
    if (reachTimeout.current) clearTimeout(reachTimeout.current);
    peerRang.current = false;
    // Capture consult context BEFORE we clear the call, so we can route to the
    // right consult surface once the call overlay is gone.
    const consult = callRef.current?.consult;
    const didConnect = connectedRef.current;
    connectedRef.current = false;
    svcRef.current?.close();
    svcRef.current = null;
    clearTurnCredentials(); // drop ephemeral relay creds so the next call re-fetches
    setLocalStream(null);
    setRemoteStream(null);
    setMicOn(true);
    setCamOn(true);
    setConnectionState("");
    setCallStatus("");
    log(`CALL_ENDED (${reason})`);
    setPhase("idle");
    setCall(null);

    // Post-call routing (parity with the app): a consultation that actually
    // took place sends the doctor to write the summary (which generates the
    // prescription) and the patient to the completed view (rating + Rx download).
    // Skipped for missed/rejected calls (never connected).
    if (consult?.requestId && didConnect) {
      const to = consult.viewerIsDoctor
        ? `/app/consults/${consult.requestId}/summary`
        : `/app/consults/${consult.requestId}`;
      try { navRef.current(to); } catch { /* navigation is best-effort */ }
    }
  }, [log]);

  // ── Socket wiring ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const s = connectCallSocket();
    socket.current = s;

    const onConnect = () => { setSocketConnected(true); log("socket connected"); s.emit("user_join", { userId: myId }); };
    const onDisconnect = () => { setSocketConnected(false); log("socket disconnected"); };

    const onInvite = (d: any) => {
      log(`INVITE_RECEIVED ${d.callId} from ${d.fromUserId} (${d.callType})`);
      setDebug((x) => ({ ...x, lastInvite: d }));
      if (callRef.current) { s.emit("user_call_busy", { callId: d.callId, toUserId: d.fromUserId }); return; }
      connectedRef.current = false;
      setCall({
        callId: d.callId, peerId: d.fromUserId, peerName: d.callerName || "Unknown",
        peerPhoto: d.callerPhoto, type: d.callType === "audio" ? "audio" : "video", isCaller: false,
        consult: d.consultRequestId
          ? { requestId: String(d.consultRequestId), viewerIsDoctor: !d.consultCallerIsDoctor }
          : null,
      });
      setPhase("incoming");
      // Delivery ACK → caller can show "Ringing…" instead of spinning "Calling…".
      s.emit("user_call_ringing", { callId: d.callId, toUserId: d.fromUserId });
    };

    // Caller: server presence ACK (was the invite delivered to a live socket?).
    const onStatus = (d: any) => {
      const c = callRef.current;
      if (!c || !c.isCaller || d.callId !== c.callId) return;
      if (!d.online && !peerRang.current) {
        if (reachTimeout.current) clearTimeout(reachTimeout.current);
        reachTimeout.current = setTimeout(() => {
          if (!peerRang.current && callRef.current?.callId === d.callId) {
            setCallStatus("User is unavailable");
            log("peer unavailable (no ring ack)");
            s.emit("user_call_timeout", { callId: d.callId, toUserId: c.peerId });
            cleanup("unavailable");
          }
        }, 12000);
      }
    };
    // Caller: callee's device is now displaying the incoming call.
    const onRinging = (d: any) => {
      const c = callRef.current;
      if (!c || !c.isCaller || d.callId !== c.callId) return;
      peerRang.current = true;
      if (reachTimeout.current) clearTimeout(reachTimeout.current);
      setCallStatus("Ringing…");
      log("peer ringing");
    };

    const onAccepted = async (d: any) => {
      const c = callRef.current;
      if (!c || d.callId !== c.callId) return;
      if (ringTimeout.current) clearTimeout(ringTimeout.current);
      if (reachTimeout.current) clearTimeout(reachTimeout.current);
      setCallStatus("Connecting…");
      log("CALL_ACCEPTED (callee) → starting media/offer");
      setPhase("connecting");
      const svc = buildService(c);
      // Per-call TURN relay creds (ephemeral, minted server-side) BEFORE start()
      // builds the pc, so relay candidates gather from the first offer.
      await refreshTurnCredentials();
      await svc.start();
      setLocalStream(svc.localStream);
      log("OFFER_CREATED");
      await svc.createOffer();
    };

    const onRejected = (d: any) => { if (callRef.current && d.callId === callRef.current.callId) { setCallStatus("Call declined"); cleanup("rejected/timeout"); } };
    const onBusy = (d: any) => { if (callRef.current && d.callId === callRef.current.callId) { setCallStatus("User is busy"); cleanup("busy"); } };
    const onRemoteEnd = (d: any) => { if (callRef.current && d.callId === callRef.current.callId) cleanup("remote ended"); };
    const onUnavailable = (d: any) => { if (callRef.current && d.callId === callRef.current.callId) { setCallStatus("User is unavailable"); cleanup("unavailable"); } };

    const onOffer = async (d: any) => {
      const c = callRef.current;
      if (!c || d.callSessionId !== c.callId || c.isCaller) return;
      setDebug((x) => ({ ...x, lastOffer: d.offer }));
      log("OFFER received → ANSWER_CREATED");
      await svcRef.current?.handleOffer(d.offer);
    };
    const onAnswer = async (d: any) => {
      const c = callRef.current;
      if (!c || d.callSessionId !== c.callId || !c.isCaller) return;
      setDebug((x) => ({ ...x, lastAnswer: d.answer }));
      log("ANSWER received");
      await svcRef.current?.handleAnswer(d.answer);
    };
    const onIce = async (d: any) => {
      const c = callRef.current;
      if (!c || d.callSessionId !== c.callId) return;
      setDebug((x) => ({ ...x, lastIce: d.candidate }));
      await svcRef.current?.addIce(d.candidate);
    };

    // ── Consultation signaling channel (parity with the Flutter consult call) ──
    // Incoming consult call — this web user is the doctor. Ring with consult context.
    const onConsultInvite = (d: any) => {
      const requestId = String(d.consultationId || d.callSessionId || "");
      const callerId = String(d.callerId || "");
      if (!requestId || !callerId) return;
      log(`CONSULT_INVITE ${requestId} from ${callerId}`);
      if (callRef.current) { s.emit("consultation_call_rejected", { callerId, callSessionId: d.callSessionId || requestId, consultationId: requestId, reason: "busy" }); return; }
      connectedRef.current = false;
      setCall({
        callId: d.callSessionId || requestId,
        peerId: callerId, peerName: d.callerName || "Patient", peerPhoto: d.callerPhoto,
        type: d.hasVideo === false ? "audio" : "video", isCaller: false,
        consult: { requestId, viewerIsDoctor: true }, useConsultProtocol: true,
      });
      setPhase("incoming");
    };
    // Caller (patient): doctor accepted → build the pc and send the offer.
    const onConsultAccepted = async (d: any) => {
      const c = callRef.current;
      if (!c || !c.isCaller || !c.useConsultProtocol || d.callSessionId !== c.callId) return;
      if (ringTimeout.current) clearTimeout(ringTimeout.current);
      if (reachTimeout.current) clearTimeout(reachTimeout.current);
      setCallStatus("Connecting…");
      log("CONSULT_ACCEPTED → starting media/offer");
      setPhase("connecting");
      const svc = buildService(c);
      await refreshTurnCredentials();
      await svc.start();
      setLocalStream(svc.localStream);
      await svc.createOffer();
    };
    const onConsultRejected = (d: any) => {
      const c = callRef.current;
      if (c && c.useConsultProtocol && (d.callSessionId === c.callId || d.consultationId === c.consult?.requestId)) {
        setCallStatus(d.reason === "busy" ? "User is busy" : "Call declined");
        cleanup("consult rejected/timeout");
      }
    };
    const onConsultEnded = (d: any) => {
      const c = callRef.current;
      if (c && c.useConsultProtocol && (d.callSessionId === c.callId || d.consultationId === c.consult?.requestId)) cleanup("consult remote ended");
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("user_call_invite", onInvite);
    s.on("user_call_accept", onAccepted);
    s.on("user_call_reject", onRejected);
    s.on("user_call_timeout", onRejected);
    s.on("user_call_busy", onBusy);
    s.on("user_call_end", onRemoteEnd);
    s.on("user_call_unavailable", onUnavailable);
    s.on("user_call_status", onStatus);
    s.on("user_call_ringing", onRinging);
    s.on("webrtc_offer", onOffer);
    s.on("webrtc_answer", onAnswer);
    s.on("webrtc_ice_candidate", onIce);
    // Consultation channel
    s.on("consultation_call_invite", onConsultInvite);
    s.on("consultation_call_accepted", onConsultAccepted);
    s.on("consultation_call_rejected", onConsultRejected);
    s.on("consultation_call_timeout", onConsultRejected);
    s.on("consultation_call_end", onConsultEnded);
    if (s.connected) onConnect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("user_call_invite", onInvite);
      s.off("user_call_accept", onAccepted);
      s.off("user_call_reject", onRejected);
      s.off("user_call_timeout", onRejected);
      s.off("user_call_busy", onBusy);
      s.off("user_call_end", onRemoteEnd);
      s.off("user_call_unavailable", onUnavailable);
      s.off("user_call_status", onStatus);
      s.off("user_call_ringing", onRinging);
      s.off("webrtc_offer", onOffer);
      s.off("webrtc_answer", onAnswer);
      s.off("webrtc_ice_candidate", onIce);
      s.off("consultation_call_invite", onConsultInvite);
      s.off("consultation_call_accepted", onConsultAccepted);
      s.off("consultation_call_rejected", onConsultRejected);
      s.off("consultation_call_timeout", onConsultRejected);
      s.off("consultation_call_end", onConsultEnded);
    };
  }, [myId, buildService, cleanup, log]);

  // ── Public actions ──────────────────────────────────────────────────────────
  const startCall = useCallback((peerId: string, peerName: string, peerPhoto: string | null, type: CallType, consult?: CallConsult | null) => {
    if (!peerId || callRef.current) return;
    // A patient calling the doctor uses the consultation signaling channel so the
    // Flutter doctor opens its real VideoConsultScreen. The WebRTC session is keyed
    // by the consultationId (requestId) — so callId = requestId here — matching what
    // VideoConsultScreen listens on. (Doctor→patient stays on the generic path: the
    // backend only routes consult invites to the doctor.)
    const useConsultProtocol = !!consult && !consult.viewerIsDoctor;
    const callId = useConsultProtocol ? consult!.requestId : newCallId();
    const c: ActiveCall = { callId, peerId, peerName, peerPhoto, type, isCaller: true, consult: consult || null, useConsultProtocol };
    peerRang.current = false;
    connectedRef.current = false;
    setCall(c);
    setPhase("outgoing");
    setCallStatus("Calling…");
    if (useConsultProtocol) {
      socket.current?.emit("consultation_call_invite", {
        callSessionId: callId, consultationId: consult!.requestId, doctorId: peerId,
        callerName: user?.fullName, callerPhoto: user?.profilePhoto || null,
        hasVideo: type === "video", sessionLength: 30,
      });
    } else {
      socket.current?.emit("user_call_invite", {
        callId, toUserId: peerId, callType: type,
        callerName: user?.fullName, callerPhoto: user?.profilePhoto || null,
        ...(consult ? { consultRequestId: consult.requestId, consultCallerIsDoctor: consult.viewerIsDoctor } : {}),
      });
    }
    log(`INVITE_SENT ${callId} → ${peerId} (${type}${useConsultProtocol ? ", consult" : ""})`);
    // Step 12: 30s ring timeout → missed call.
    ringTimeout.current = setTimeout(() => {
      if (useConsultProtocol) socket.current?.emit("consultation_call_timeout", { recipientId: peerId, callSessionId: callId, consultationId: callId });
      else socket.current?.emit("user_call_timeout", { callId, toUserId: peerId });
      cleanup("no answer (missed)");
    }, 30000);
  }, [user, log, cleanup]);

  const acceptCall = useCallback(async () => {
    const c = callRef.current;
    if (!c) return;
    setPhase("connecting");
    // Build the peer connection + acquire media BEFORE telling the caller to send
    // the offer. On localhost the caller's offer arrives in ~ms while getUserMedia
    // can take hundreds of ms — accepting first would drop the offer onto a null pc.
    const svc = buildService(c);
    await refreshTurnCredentials(); // per-call TURN before the pc is built
    await svc.start();
    setLocalStream(svc.localStream);
    if (c.useConsultProtocol) {
      socket.current?.emit("consultation_call_accepted", { callerId: c.peerId, callSessionId: c.callId, consultationId: c.consult?.requestId });
    } else {
      socket.current?.emit("user_call_accept", { callId: c.callId, toUserId: c.peerId });
    }
    log("CALL_ACCEPTED → ACCEPT sent, waiting for offer");
  }, [buildService, log]);

  const rejectCall = useCallback(() => {
    const c = callRef.current;
    if (c) {
      if (c.useConsultProtocol) socket.current?.emit("consultation_call_rejected", { callerId: c.peerId, callSessionId: c.callId, consultationId: c.consult?.requestId, reason: "declined" });
      else socket.current?.emit("user_call_reject", { callId: c.callId, toUserId: c.peerId });
    }
    cleanup("rejected locally");
  }, [cleanup]);

  const endCall = useCallback(() => {
    const c = callRef.current;
    if (c) {
      if (c.useConsultProtocol) socket.current?.emit("consultation_call_end", { recipientId: c.peerId, callSessionId: c.callId, consultationId: c.consult?.requestId });
      else socket.current?.emit("user_call_end", { callId: c.callId, toUserId: c.peerId });
    }
    cleanup("ended locally");
  }, [cleanup]);

  const toggleMic = useCallback(() => {
    setMicOn((on) => { svcRef.current?.toggleMic(!on); return !on; });
  }, []);
  const toggleCam = useCallback(() => {
    setCamOn((on) => { svcRef.current?.toggleCam(!on); return !on; });
  }, []);
  const switchCamera = useCallback(() => { svcRef.current?.switchCamera(); }, []);

  return (
    <Ctx.Provider value={{
      phase, call, localStream, remoteStream, micOn, camOn, logs, socketConnected,
      connectionState, callStatus, debug, myId, minimized, setMinimized,
      startCall, acceptCall, rejectCall, endCall, toggleMic, toggleCam, switchCamera,
    }}>
      {children}
    </Ctx.Provider>
  );
}
