// In-call consult draft — carries what the doctor writes DURING a consultation
// call (medicines, diagnosis, suggestion notes) across to the post-call
// SummaryEditor, mirroring the Flutter flow where the in-call Rx is pre-loaded
// into the finish-consultation summary. Persisted in sessionStorage so it
// survives the call overlay unmounting → SummaryEditor mounting (and a refresh).
import type { Medicine } from "@/lib/consultations/types";

export interface ConsultCallDraft {
  requestId: string;
  medicines: Medicine[];
  diagnosis: string;
  notes: string; // free-text suggestion/advice
}

const key = (requestId: string) => `dl_consult_draft_${requestId}`;

export function getConsultDraft(requestId: string): ConsultCallDraft | null {
  if (!requestId || typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key(requestId));
    return raw ? (JSON.parse(raw) as ConsultCallDraft) : null;
  } catch {
    return null;
  }
}

export function saveConsultDraft(d: ConsultCallDraft): void {
  if (!d.requestId || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key(d.requestId), JSON.stringify(d));
  } catch {
    /* storage full / unavailable — draft is best-effort */
  }
}

export function clearConsultDraft(requestId: string): void {
  if (!requestId || typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(key(requestId));
  } catch {
    /* ignore */
  }
}
