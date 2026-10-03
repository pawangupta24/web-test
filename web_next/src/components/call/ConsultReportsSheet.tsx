"use client";

import { useEffect, useState } from "react";
import { X, FileText, ExternalLink, Loader2 } from "lucide-react";
import { dok } from "@/lib/api";
import { parseRequest, ConsultationRequest } from "@/lib/consultations/types";

/// In-call viewer for the patient's booking reason + uploaded reports (mirrors
/// the Flutter patient-reports sheet). Read-only; overlays the call surface.
export default function ConsultReportsSheet({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const [req, setReq] = useState<ConsultationRequest | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    dok.consults.getRequest(requestId)
      .then((d: any) => { if (alive) setReq(parseRequest(d.request)); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [requestId]);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 text-ink-900 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><FileText size={18} /></span>
          <div className="flex-1">
            <p className="text-base font-extrabold">Patient reports</p>
            <p className="text-xs text-ink-500">Reason & uploaded documents</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-ink-900/[.06] hover:bg-ink-900/[.1]"><X size={18} /></button>
        </div>

        {error && <p className="rounded-xl bg-ink-900/[.04] px-3 py-6 text-center text-sm text-ink-500">Couldn’t load the reports.</p>}
        {!error && !req && <div className="grid place-items-center py-10 text-ink-400"><Loader2 size={22} className="animate-spin" /></div>}

        {req && (
          <>
            {req.reason && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">Reason</p>
                <p className="whitespace-pre-wrap rounded-xl bg-ink-900/[.04] px-3 py-2 text-sm text-ink-700">{req.reason}</p>
              </div>
            )}
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Documents</p>
            {req.attachments.length === 0 ? (
              <p className="rounded-xl bg-ink-900/[.04] px-3 py-4 text-center text-xs text-ink-500">No documents were attached.</p>
            ) : (
              <div className="space-y-2">
                {req.attachments.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-ink-900/[.08] p-3 text-sm transition hover:border-brand-300">
                    <FileText size={16} className="text-brand-600" />
                    <span className="flex-1 truncate font-medium text-ink-800">{a.name}</span>
                    <ExternalLink size={15} className="text-ink-400" />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
