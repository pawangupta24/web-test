import type { ReactNode } from "react";
import { Medicine, medicineFrequency } from "@/lib/consultations/types";

/**
 * Read-only prescription table used on the completed-consultation view — parity
 * with the mobile app's PrescriptionTable. Columns: # · Medicine · Dose ·
 * Frequency · Duration · Test. Keeps a clean grid on desktop; on narrow screens
 * it scrolls horizontally inside its own container rather than squashing (the
 * scrollbar only appears when the columns exceed the width). Medicine names are
 * emphasised; empty cells show "—".
 */
export function PrescriptionTable({ medicines }: { medicines: Medicine[] }) {
  if (!medicines.length) return null;
  const dash = (v: string) => (v.trim() ? v.trim() : "—");
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-900/[.08]">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="bg-brand-600 text-white">
            <Th className="w-9 text-center">#</Th>
            <Th>Medicine</Th>
            <Th>Dose</Th>
            <Th>Frequency</Th>
            <Th>Duration</Th>
            <Th>Test</Th>
          </tr>
        </thead>
        <tbody>
          {medicines.map((m, i) => (
            <tr key={i} className="border-t border-ink-900/[.06] bg-surface">
              <Td className="text-center text-ink-400">{i + 1}</Td>
              <Td className="font-semibold text-ink-900">{dash(m.name)}</Td>
              <Td>{dash(m.strength)}</Td>
              <Td>{dash(medicineFrequency(m))}</Td>
              <Td className="whitespace-nowrap">{dash(m.duration)}</Td>
              <Td>{dash(m.test)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 text-[10.5px] font-bold uppercase tracking-wide ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-top text-xs text-ink-600 ${className}`}>{children}</td>;
}
