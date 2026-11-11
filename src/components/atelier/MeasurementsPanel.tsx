"use client";

/**
 * Customer Measurements — one fixed, standards-based record sheet.
 *
 * Dimensions and landmarks follow ISO 8559-1 body-measurement practice and
 * are grouped the way a pattern-cutter reads them. Values are always stored
 * in centimetres; the cm / in switch only changes display. Every session is
 * kept, so fit changes over time are visible as a change-vs-previous column.
 */

import { useMemo, useState } from "react";
import { ChevronDown, Ruler } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MeasurementSet } from "@/lib/types";
import { BodyDiagram } from "@/components/atelier/BodyDiagram";
import {
  FIELD_GROUPS,
  MEASUREMENT_FIELDS,
  delta,
  formatValue,
  fromCm,
  matchSize,
  toCm,
  type MeasurementKey,
  type Unit,
} from "@/lib/measurements";

const cmOf = (m: MeasurementSet | undefined, key: MeasurementKey): number | null => {
  if (!m) return null;
  const raw = (m as unknown as Record<string, number | null | undefined>)[key];
  // Body mass is kg, everything else is length.
  return key === "weight" ? (raw ?? null) : toCm(raw, m.unit);
};

export function MeasurementsPanel({
  measurements,
  onUpdate,
  canUpdate = true,
  customerGender,
}: {
  measurements: MeasurementSet[];
  onUpdate: () => void;
  canUpdate?: boolean;
  /** Drives which body diagram is shown (Customer.gender). Defaults to female. */
  customerGender?: string | null;
}) {
  const diagramVariant: "female" | "male" =
    (customerGender || "").toLowerCase().startsWith("m") ? "male" : "female";
  const [unit, setUnit] = useState<Unit>("cm");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const sorted = useMemo(
    () => [...measurements].sort((a, b) => new Date(b.dateTaken).getTime() - new Date(a.dateTaken).getTime()),
    [measurements]
  );

  const index = Math.max(0, sorted.findIndex((m) => m.id === selectedId));
  const current = sorted[index];
  const previous = sorted[index + 1];
  const isLatest = index === 0;

  const size = useMemo(
    () => (current ? matchSize(cmOf(current, "bust"), cmOf(current, "waist"), cmOf(current, "hip")) : null),
    [current]
  );

  const recorded = current ? MEASUREMENT_FIELDS.filter((f) => cmOf(current, f.key) != null).length : 0;

  if (sorted.length === 0) {
    return (
      <section className="rounded-lg border border-[#EEDFE3] bg-white">
        <div className="grid gap-8 px-6 py-10 sm:grid-cols-[180px_1fr] sm:items-center sm:py-14">
          <BodyDiagram variant={diagramVariant} className="mx-auto max-w-[160px] sm:max-w-none" />
          <div className="text-center sm:text-left">
            <Ruler className="mx-auto size-6 text-stone-300 sm:mx-0" strokeWidth={1.5} />
            <h2 className="mt-4 font-display text-lg font-semibold text-[#2F151B]">No measurements on file</h2>
            <p className="mt-1.5 max-w-sm text-sm text-stone-500 mx-auto sm:mx-0">
              Record a full set once and every future order for this client starts from it.
            </p>
            {canUpdate && (
              <button
                type="button"
                onClick={onUpdate}
                className="mt-6 h-10 rounded-md bg-[#800020] px-5 text-sm font-medium text-white transition-colors hover:bg-[#650019]"
              >
                Record measurements
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[#EEDFE3] bg-white">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EEDFE3] px-5 py-4 sm:px-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">
            Body measurement record
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold leading-tight text-[#2F151B]">
            {isLatest ? "Current measurements" : `Measurements — ${formatDate(current.dateTaken)}`}
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            ISO 8559-1 body dimensions · stored in centimetres · {recorded} of {MEASUREMENT_FIELDS.length} recorded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Measurement unit" className="inline-flex rounded-md border border-[#EEDFE3] p-0.5 text-xs">
            {(["cm", "in"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={cn(
                  "h-7 min-w-9 rounded px-2.5 font-medium transition-colors",
                  unit === u ? "bg-[#2F151B] text-white" : "text-stone-500 hover:text-[#2F151B]"
                )}
              >
                {u}
              </button>
            ))}
          </div>
          {canUpdate && (
            <button
              type="button"
              onClick={onUpdate}
              className="h-9 rounded-md bg-[#800020] px-4 text-sm font-medium text-white transition-colors hover:bg-[#650019]"
            >
              New session
            </button>
          )}
        </div>
      </header>

      {/* Session strip */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-[#EEDFE3] px-5 py-2.5 sm:px-6" role="tablist" aria-label="Measurement sessions">
        {sorted.map((m, i) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={i === index}
            type="button"
            onClick={() => setSelectedId(m.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs tabular-nums transition-colors",
              i === index
                ? "border-[#800020] bg-[#800020]/5 font-medium text-[#800020]"
                : "border-[#EEDFE3] text-stone-500 hover:border-stone-300 hover:text-[#2F151B]"
            )}
          >
            {formatDate(m.dateTaken)}
            {i === 0 && <span className="ml-1.5 text-[10px] uppercase tracking-wider text-stone-400">latest</span>}
          </button>
        ))}
      </div>

      {/* Summary facts */}
      <dl className="grid grid-cols-2 divide-x divide-y divide-[#EEDFE3] border-b border-[#EEDFE3] text-sm sm:grid-cols-4 sm:divide-y-0">
        <Fact label="Measured on" value={formatDate(current.dateTaken)} />
        <Fact label="Measured by" value={current.staff?.fullName ?? "—"} />
        <Fact label="Stature" value={cmOf(current, "height") != null ? `${formatValue(cmOf(current, "height"), unit)} ${unit}` : "—"} />
        <Fact label="Posture" value={current.posture || "—"} />
      </dl>

      {/* Indicative size */}
      {size && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-[#EEDFE3] bg-[#FAF0F2] px-5 py-3 sm:px-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">Indicative size</p>
          <p className="text-sm tabular-nums text-[#2F151B]">
            <span className="font-semibold">EU {size.row.eu}</span>
            <span className="mx-2 text-stone-300">/</span>UK {size.row.uk}
            <span className="mx-2 text-stone-300">/</span>US {size.row.us}
          </p>
          <p className="text-xs text-stone-500">
            {size.mixed
              ? `Bust EU ${size.byBust?.eu ?? "—"} · Waist EU ${size.byWaist?.eu ?? "—"} · Hip EU ${size.byHip?.eu ?? "—"} — grade the pattern between sizes.`
              : "Bust, waist and hip fall in the same size."}
          </p>
        </div>
      )}

      {/* Diagram + dimensions by group */}
      <div className="grid gap-x-8 gap-y-7 px-5 py-6 sm:px-6 md:grid-cols-[190px_1fr]">
        <div className="hidden md:block">
          <div className="sticky top-4 rounded-lg border border-[#EEDFE3] bg-[#FAF0F2] p-4">
            <BodyDiagram variant={diagramVariant} />
            <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
              {diagramVariant === "female" ? "Women's" : "Men's"} reference
            </p>
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
        {FIELD_GROUPS.map((group) => {
          const fields = MEASUREMENT_FIELDS.filter((f) => f.group === group);
          return (
            <div key={group}>
              <h3 className="border-b border-[#2F151B] pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2F151B]">
                {group}
              </h3>
              <table className="w-full text-sm">
                <thead className="sr-only">
                  <tr><th>Dimension</th><th>Value</th><th>Change since previous</th></tr>
                </thead>
                <tbody className="divide-y divide-[#FAF0F2]">
                  {fields.map((f) => {
                    const cm = cmOf(current, f.key);
                    const isKg = f.unitOverride === "kg";
                    const d = isKg ? null : delta(cm, cmOf(previous, f.key));
                    const shown = isKg ? (cm != null ? String(cm) : "—") : formatValue(cm, unit);
                    const suffix = cm == null ? "" : isKg ? " kg" : ` ${unit}`;
                    return (
                      <tr key={f.key} title={f.how}>
                        <td className={cn("py-2 pr-3", f.core ? "font-medium text-[#2F151B]" : "text-stone-500")}>{f.label}</td>
                        <td className={cn("py-2 text-right tabular-nums", cm == null ? "text-stone-300" : "font-semibold text-[#2F151B]")}>
                          {shown}
                          <span className="font-normal text-stone-400">{suffix}</span>
                        </td>
                        <td className="w-16 py-2 pl-3 text-right text-[11px] tabular-nums">
                          {d != null && d !== 0 ? (
                            <span className={cn(Math.abs(d) >= 2 ? "font-medium text-[#800020]" : "text-stone-400")}>
                              {d > 0 ? "+" : "−"}
                              {formatValue(Math.abs(d), unit)}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        </div>
      </div>

      {current.notes && (
        <div className="border-t border-[#EEDFE3] px-5 py-4 sm:px-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">Fitting notes</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-600">{current.notes}</p>
        </div>
      )}

      {previous && (
        <p className="border-t border-[#EEDFE3] px-5 py-2.5 text-[11px] text-stone-400 sm:px-6">
          Change column compares with the session on {formatDate(previous.dateTaken)}. Shifts of 2 cm or more are highlighted.
        </p>
      )}

      {/* Method */}
      <div className="border-t border-[#EEDFE3]">
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          aria-expanded={showGuide}
          className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium text-[#2F151B] hover:bg-[#FAF0F2] sm:px-6"
        >
          How to take these measurements
          <ChevronDown className={cn("size-4 text-stone-400 transition-transform", showGuide && "rotate-180")} />
        </button>
        {showGuide && (
          <div className="px-5 pb-5 sm:px-6">
            <div className="mb-5 rounded-lg border border-[#EEDFE3] bg-[#FAF0F2] p-4 md:hidden">
              <BodyDiagram variant={diagramVariant} className="mx-auto max-w-[180px]" />
              <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-stone-400">
                {diagramVariant === "female" ? "Women's" : "Men's"} reference
              </p>
            </div>
            <div className="grid gap-x-10 gap-y-2 text-xs leading-relaxed text-stone-600 md:grid-cols-2">
              <p className="md:col-span-2">
                Client stands upright and relaxed, feet together, in light clothing. Use a flexible, non-stretch tape. Girths are
                taken horizontally, snug but not compressing. Lengths follow the body surface between landmarks. Record to the nearest
                0.1 cm.
              </p>
              {MEASUREMENT_FIELDS.filter((f) => f.core).map((f) => (
                <p key={f.key}>
                  <span className="font-semibold text-[#2F151B]">{f.label}. </span>
                  {f.how}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-3 sm:px-6">
      <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone-400">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-[#2F151B]">{value}</dd>
    </div>
  );
}

// Re-exported so other views can show a value in the same way.
export { fromCm };
