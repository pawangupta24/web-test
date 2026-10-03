"use client";

// Dependency-free responsive SVG area/line chart (the app ships no chart lib).
// Uses the brand color via `text-brand-600` + currentColor so it themes itself.

export function LineChart({ points, height = 180 }: {
  points: { label: string; value: number }[];
  height?: number;
}) {
  if (!points.length) {
    return <div className="py-10 text-center text-sm text-ink-500">No events in range.</div>;
  }
  const W = 600;
  const H = height;
  const pad = { top: 10, right: 8, bottom: 22, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const x = (i: number) => pad.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L${x(n - 1)},${pad.top + innerH} L${x(0)},${pad.top + innerH} Z`;

  return (
    <div className="w-full overflow-x-auto text-brand-600">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 320 }} role="img" aria-label="Events over time">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={pad.left}
            x2={W - pad.right}
            y1={pad.top + innerH * (1 - g)}
            y2={pad.top + innerH * (1 - g)}
            className="stroke-ink-900/[.06]"
            strokeWidth={1}
          />
        ))}
        <path d={area} fill="currentColor" opacity={0.12} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={2.5} fill="currentColor">
            <title>{`${p.label}: ${p.value}`}</title>
          </circle>
        ))}
        {points.map((p, i) =>
          i % Math.ceil(n / 6) === 0 || i === n - 1 ? (
            <text key={`t${i}`} x={x(i)} y={H - 6} textAnchor="middle" className="fill-ink-500" fontSize={9}>
              {shortDate(p.label)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
