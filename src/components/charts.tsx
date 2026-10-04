"use client";

import { useState } from "react";

/** Single-series trend line with crosshair + tooltip. One hue; text stays in ink tokens. */
export function TrendLine({ points, height = 140, unit = "%" }:
  { points: { label: string; value: number; sub?: string }[]; height?: number; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return null;
  const W = 600, H = height, P = 24;
  const max = Math.max(100, ...points.map((p) => p.value));
  const min = Math.min(0, ...points.map((p) => p.value));
  const x = (i: number) => (points.length === 1 ? W / 2 : P + (i * (W - 2 * P)) / (points.length - 1));
  const y = (v: number) => H - P - ((v - min) * (H - 2 * P)) / (max - min || 1);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const h = hover == null ? null : points[hover];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score trend"
           onMouseLeave={() => setHover(null)}
           onMouseMove={(e) => {
             const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
             const px = ((e.clientX - r.left) / r.width) * W;
             let best = 0;
             points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
             setHover(best);
           }}>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={P} x2={W - P} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeDasharray="3 5" />
            <text x={2} y={y(g) + 4} fontSize="11" fill="var(--muted)">{g}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={P / 2} y2={H - P} stroke="var(--muted)" strokeWidth={1} />}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4} fill="var(--primary)" stroke="var(--surface)" strokeWidth={2} />
        ))}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-0 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg"
             style={{ left: `clamp(0px, calc(${(x(hover!) / W) * 100}% - 70px), calc(100% - 150px))` }}>
          <div className="font-mono text-sm font-bold text-ink">{h.value.toFixed(1)}{unit}</div>
          <div className="text-ink-2">{h.label}</div>
          {h.sub && <div className="text-muted">{h.sub}</div>}
        </div>
      )}
    </div>
  );
}

/** Sequential single-hue heat grid (rows × columns) with per-cell tooltips via title. */
export function HeatGrid({ rows, cols, value, rowLabel }:
  { rows: string[]; cols: string[]; value: (r: string, c: string) => number; rowLabel: (r: string) => string }) {
  const max = Math.max(1, ...rows.flatMap((r) => cols.map((c) => value(r, c))));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-surface text-left font-semibold text-muted">Topic</th>
            {cols.map((c) => <th key={c} className="px-1 font-mono font-semibold text-muted">{c.slice(2)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <td className="sticky left-0 max-w-[180px] truncate bg-surface pr-2 text-ink-2">{rowLabel(r)}</td>
              {cols.map((c) => {
                const v = value(r, c);
                return (
                  <td key={c} title={`${rowLabel(r)} · ${c}: ${v} question${v === 1 ? "" : "s"}`}
                      className="h-7 min-w-7 rounded-md text-center font-mono text-[11px]"
                      style={{ background: v ? `color-mix(in srgb, var(--primary) ${20 + (80 * v) / max}%, var(--surface-2))` : "var(--surface-2)",
                               color: v / max > 0.5 ? "var(--primary-ink)" : "var(--ink-2)" }}>
                    {v || ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
