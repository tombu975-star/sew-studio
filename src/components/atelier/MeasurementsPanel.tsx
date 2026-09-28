"use client";

/**
 * Customer Measurements — the studio's single, fixed measurements layout.
 * Deliberately not configurable: every customer's measurements are shown
 * the same way (silhouette + values, unit toggle, history, update button)
 * so staff always know where to look.
 *
 * Values are always stored in centimetres; the cm/in toggle only changes
 * how they are displayed.
 */

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MeasurementSet } from "@/lib/types";

type Unit = "cm" | "in";

const FIELDS = [
  { key: "bust", label: "Bust" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "shoulder", label: "Shoulder" },
  { key: "sleeve", label: "Sleeve" },
  { key: "length", label: "Length" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

/** Measurements are stored in cm regardless of the unit recorded. */
function toCm(value: number | null | undefined, storedUnit: string): number | null {
  if (value == null) return null;
  return storedUnit === "in" ? value * 2.54 : value;
}

function display(cm: number | null, unit: Unit): string {
  if (cm == null) return "—";
  const v = unit === "in" ? cm / 2.54 : cm;
  const rounded = Math.round(v * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}`;
}

export function MeasurementsPanel({
  measurements,
  onUpdate,
  canUpdate = true,
}: {
  measurements: MeasurementSet[];
  onUpdate: () => void;
  canUpdate?: boolean;
}) {
  const [unit, setUnit] = useState<Unit>("cm");

  const sorted = useMemo(
    () =>
      [...measurements].sort(
        (a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime()
      ),
    [measurements]
  );
  const latest = sorted[0];

  const value = (m: MeasurementSet, key: FieldKey) => toCm(m[key], m.unit);

  return (
    <div className="max-w-[560px] rounded-2xl border border-[#E7E5E4] bg-[#FBF9F7] p-5 sm:p-6">
      {/* Header */}
      <h2 className="font-display text-xl font-semibold text-[#1C1917]">Customer Measurements</h2>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          Last measured:{" "}
          <span className="font-semibold text-[#1C1917]">
            {latest ? formatDate(latest.dateTaken) : "Not yet measured"}
          </span>
        </p>
        <div
          role="group"
          aria-label="Measurement unit"
          className="inline-flex rounded-lg border border-[#E7E5E4] bg-white p-0.5 text-xs"
        >
          {(["cm", "in"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              aria-pressed={unit === u}
              className={cn(
                "px-3 py-1 rounded-md font-medium transition",
                unit === u ? "bg-[#F1ECE6] text-[#1C1917]" : "text-stone-400 hover:text-stone-600"
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Silhouette + values */}
      <div className="mt-4 grid grid-cols-[132px_minmax(0,1fr)] gap-4 items-center">
        <Silhouette />
        <dl className="divide-y divide-[#E7E5E4]">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-stone-500">{f.label}</dt>
              <dd className="text-sm font-semibold text-[#1C1917] tabular-nums">
                {latest ? display(value(latest, f.key), unit) : "—"}
                {latest && value(latest, f.key) != null ? ` ${unit}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* History */}
      <h3 className="mt-6 font-display text-base font-semibold text-[#1C1917]">
        Measurement History
      </h3>
      <div className="mt-2 overflow-hidden rounded-xl border border-[#E7E5E4] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-stone-500 bg-[#FBF9F7]">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Bust</th>
              <th className="px-3 py-2 font-medium">Waist</th>
              <th className="px-3 py-2 font-medium">Hip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1ECE6]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-stone-400">
                  No measurements recorded yet.
                </td>
              </tr>
            ) : (
              sorted.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2.5 text-stone-600 whitespace-nowrap">
                    {formatDate(m.dateTaken)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{display(value(m, "bust"), unit)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{display(value(m, "waist"), unit)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{display(value(m, "hip"), unit)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canUpdate && (
        <button
          type="button"
          onClick={onUpdate}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-b from-[#B8893B] to-[#9A6F2B] px-5 text-sm font-medium text-white shadow-sm hover:brightness-105 transition"
        >
          Update Measurements
        </button>
      )}
    </div>
  );
}

/** Front-view body outline with the measurement guide lines. */
function Silhouette() {
  return (
    <svg
      viewBox="0 0 132 250"
      role="img"
      aria-label="Body outline showing bust, waist, hip, shoulder and length measurement lines"
      className="w-full h-auto"
    >
      {/* body */}
      <g fill="#EADFD3" stroke="#D9C9B8" strokeWidth="1">
        <ellipse cx="66" cy="20" rx="13" ry="16" />
        <rect x="60" y="34" width="12" height="12" rx="4" />
        {/* torso */}
        <path d="M34 54 C44 46 88 46 98 54 L96 96 C94 112 90 120 92 136 C94 152 100 168 98 186 L92 232 L76 232 L70 170 L66 150 L62 170 L56 232 L40 232 L34 186 C32 168 38 152 40 136 C42 120 38 112 36 96 Z" />
        {/* arms */}
        <path d="M34 54 C24 62 18 96 14 130 L20 132 C26 104 32 84 38 70 Z" />
        <path d="M98 54 C108 62 114 96 118 130 L112 132 C106 104 100 84 94 70 Z" />
      </g>
      {/* guide lines */}
      <g stroke="#B8893B" strokeWidth="1.4" strokeLinecap="round">
        <line x1="36" y1="56" x2="96" y2="56" />
        <line x1="38" y1="78" x2="94" y2="78" />
        <line x1="40" y1="112" x2="92" y2="112" />
        <line x1="34" y1="140" x2="98" y2="140" />
      </g>
      <g stroke="#C2415E" strokeWidth="1.4" strokeLinecap="round">
        {/* length */}
        <line x1="66" y1="48" x2="66" y2="150" />
        {/* sleeve */}
        <line x1="112" y1="60" x2="116" y2="128" />
      </g>
      <g fill="#B8893B">
        <circle cx="36" cy="56" r="2.2" />
        <circle cx="96" cy="56" r="2.2" />
        <circle cx="38" cy="78" r="2.2" />
        <circle cx="94" cy="78" r="2.2" />
        <circle cx="40" cy="112" r="2.2" />
        <circle cx="92" cy="112" r="2.2" />
      </g>
    </svg>
  );
}
