"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, Pill, Check } from "lucide-react";
import { Medicine, emptyMedicine, dosagePattern } from "@/lib/consultations/types";
import { getConsultDraft, saveConsultDraft } from "@/lib/consultCallDraft";

/// Doctor-only in-call prescription + suggestion editor (mirrors the Flutter
/// in-call Rx popup). Everything is persisted to the consult-call draft so it
/// pre-loads into the post-call summary editor. Overlays the call surface.
export default function ConsultPrescriptionSheet({ requestId, onClose }: { requestId: string; onClose: () => void }) {
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // Load any earlier draft for this consult so reopening keeps what was entered.
  useEffect(() => {
    const d = getConsultDraft(requestId);
    if (d) { setDiagnosis(d.diagnosis); setNotes(d.notes); setMedicines(d.medicines); }
  }, [requestId]);

  // Persist on every change (best-effort) so nothing is lost if the call drops.
  useEffect(() => {
    saveConsultDraft({ requestId, diagnosis, notes, medicines });
  }, [requestId, diagnosis, notes, medicines]);

  const update = (i: number, patch: Partial<Medicine>) =>
    setMedicines((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const remove = (i: number) => setMedicines((ms) => ms.filter((_, idx) => idx !== i));
  const add = () => setMedicines((ms) => [...ms, emptyMedicine()]);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 text-ink-900 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Pill size={18} /></span>
          <div className="flex-1">
            <p className="text-base font-extrabold">Prescription</p>
            <p className="text-xs text-ink-500">{medicines.length ? `${medicines.length} medicine${medicines.length > 1 ? "s" : ""}` : "Add medicines & advice"}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-ink-900/[.06] hover:bg-ink-900/[.1]"><X size={18} /></button>
        </div>

        <Label>Provisional diagnosis</Label>
        <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="e.g. Acute pharyngitis"
          className="mb-3 w-full rounded-xl border border-ink-900/10 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-400" />

        <div className="mb-1.5 flex items-center justify-between">
          <Label>Medicines</Label>
          <button onClick={add} className="flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white"><Plus size={13} /> Add</button>
        </div>

        {medicines.length === 0 && <p className="mb-3 rounded-xl bg-ink-900/[.04] px-3 py-4 text-center text-xs text-ink-500">No medicines yet. Tap “Add”.</p>}

        <div className="space-y-3">
          {medicines.map((m, i) => (
            <div key={i} className="rounded-2xl border border-ink-900/[.08] p-3">
              <div className="mb-2 flex items-center gap-2">
                <input value={m.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Medicine name"
                  className="flex-1 rounded-lg border border-ink-900/10 bg-surface px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-brand-400" />
                <button onClick={() => remove(i)} className="grid h-8 w-8 place-items-center rounded-lg text-danger-700 hover:bg-danger-50"><Trash2 size={15} /></button>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <input value={m.strength} onChange={(e) => update(i, { strength: e.target.value })} placeholder="Strength (e.g. 500 mg)"
                  className="rounded-lg border border-ink-900/10 bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-brand-400" />
                <input value={m.duration} onChange={(e) => update(i, { duration: e.target.value })} placeholder="Duration (e.g. 5 days)"
                  className="rounded-lg border border-ink-900/10 bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-brand-400" />
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Toggle on={m.morning} onClick={() => update(i, { morning: !m.morning })}>Morning</Toggle>
                <Toggle on={m.afternoon} onClick={() => update(i, { afternoon: !m.afternoon })}>Afternoon</Toggle>
                <Toggle on={m.night} onClick={() => update(i, { night: !m.night })}>Night</Toggle>
                <span className="mx-1 text-[10px] font-bold text-ink-400">{dosagePattern(m)}</span>
                <Toggle on={m.beforeFood} onClick={() => update(i, { beforeFood: !m.beforeFood })}>{m.beforeFood ? "Before food" : "After food"}</Toggle>
              </div>
              <input value={m.instructions} onChange={(e) => update(i, { instructions: e.target.value })} placeholder="Instructions (optional)"
                className="w-full rounded-lg border border-ink-900/10 bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-brand-400" />
              <input value={m.test} onChange={(e) => update(i, { test: e.target.value })} placeholder="Recommended tests (optional)"
                className="mt-2 w-full rounded-lg border border-ink-900/10 bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-brand-400" />
            </div>
          ))}
        </div>

        <Label className="mt-4">Advice / suggestion</Label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="e.g. Complete the full course. Rest and hydration."
          className="mb-4 w-full resize-none rounded-xl border border-ink-900/10 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-400" />

        <button onClick={onClose} className="btn-primary w-full justify-center py-2.5 text-sm">
          <Check size={16} /> Done — saved to summary
        </button>
        <p className="mt-2 text-center text-[11px] text-ink-500">This carries into “Complete &amp; write summary” after the call.</p>
      </div>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-1 text-xs font-bold uppercase tracking-wide text-ink-400 ${className}`}>{children}</p>;
}
function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${on ? "bg-brand-600 text-white" : "bg-ink-900/[.06] text-ink-600"}`}>
      {children}
    </button>
  );
}
