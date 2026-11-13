import type { ReactNode } from "react";
import { Check } from "lucide-react";

/** A strip of tape-measure ticks. Colour follows the text colour. */
export function RulerRule({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`ruler-rule ${className}`} />;
}

const COSTS = [
  { label: "Fabric", amount: 420, dot: "#800020" },
  { label: "Trims", amount: 60, dot: "#A4505F" },
  { label: "Labour", amount: 300, dot: "#C98C96" },
  { label: "Overhead", amount: 120, dot: "#D9C2A0" },
  { label: "Profit you keep", amount: 200, dot: "#C79A45" },
];
const TOTAL = COSTS.reduce((s, c) => s + c.amount, 0);
const ghs = (n: number) => `GHS ${n.toLocaleString("en-GB")}`;

/** The hero's garment swing tag: one job, priced from its real costs. */
export function SwingTag({ className = "" }: { className?: string }) {
  return (
    <div className={`tag-settle ${className}`} role="img" aria-label="Example costing for an aso-ebi set: fabric 420, trims 60, labour 300, overhead 120 and profit 200 cedis, priced at 1,100 cedis.">
      {/* thread looping up through the punched hole */}
      <svg aria-hidden="true" viewBox="0 0 120 90" className="absolute -top-[74px] left-1/2 h-[90px] w-[120px] -translate-x-1/2 overflow-visible" fill="none">
        <path d="M60 86C60 40 18 52 26 22S96 -4 94 26 64 50 60 86" stroke="#E6C58D" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <div
        className="relative bg-[#FCF8F5] px-5 pb-6 pt-12 text-[#2F151B] shadow-[0_30px_60px_rgba(10,0,4,.45)] [clip-path:polygon(13%_0,87%_0,100%_7%,100%_100%,0_100%,0_7%)]"
      >
        <span aria-hidden="true" className="absolute left-1/2 top-3.5 size-4 -translate-x-1/2 rounded-full bg-[#2b0813] ring-2 ring-[#E6C58D]" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-2 border border-dashed border-[#C79A45]/70 [clip-path:polygon(13%_0,87%_0,100%_7%,100%_100%,0_100%,0_7%)]" />
        <p className="font-[family-name:var(--font-serif)] text-[1.7rem] font-semibold leading-none">Aso-ebi set</p>
        <p className="mt-1 text-xs text-[#6F565D]">Example job · two pieces</p>

        <ul className="mt-5 space-y-2.5 whitespace-nowrap text-[13px]">
          {COSTS.map((c) => (
            <li key={c.label} className="flex items-baseline gap-2">
              <span aria-hidden="true" className="size-2 shrink-0 translate-y-[1px] rounded-full" style={{ background: c.dot }} />
              <span className={c.label === "Profit you keep" ? "font-semibold" : ""}>{c.label}</span>
              <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-3px] border-b border-dotted border-[#CDB8BC]" />
              <span className="tabular-nums">{ghs(c.amount)}</span>
            </li>
          ))}
        </ul>

        <div aria-hidden="true" className="mt-4 flex h-2.5 overflow-hidden rounded-full">
          {COSTS.map((c) => <span key={c.label} style={{ width: `${(c.amount / TOTAL) * 100}%`, background: c.dot }} />)}
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-[#EADDE0] pt-4">
          <span className="text-xs leading-4 text-[#6F565D]">The price<br />you quote</span>
          <span className="whitespace-nowrap font-[family-name:var(--font-serif)] text-[2rem] font-semibold leading-none text-[#800020] [font-variant-numeric:lining-nums_tabular-nums]">{ghs(TOTAL)}</span>
        </div>
      </div>
    </div>
  );
}

/** Small drawings used inside the app tiles. Figures are examples, labelled as such. */
export function CostBars() {
  return (
    <div aria-hidden="true" className="mt-6">
      <div className="flex h-12 overflow-hidden rounded-xl">
        {COSTS.map((c) => (
          <span key={c.label} className="grid place-items-center text-[11px] font-semibold text-white/90" style={{ width: `${(c.amount / TOTAL) * 100}%`, background: c.dot, color: c.dot === "#D9C2A0" || c.dot === "#C79A45" || c.dot === "#C98C96" ? "#2b0813" : "#fff" }}>
            {c.amount / TOTAL > 0.14 ? c.label : ""}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6F565D]">
        {COSTS.map((c) => (
          <span key={c.label} className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: c.dot }} />{c.label}</span>
        ))}
      </div>
    </div>
  );
}

export function StagePills() {
  const stages = [["Cutting", 2], ["Sewing", 3], ["Fitting", 1], ["Ready", 1]] as const;
  return (
    <div aria-hidden="true" className="mt-6">
      <div className="flex items-end gap-2">
        {stages.map(([name, n]) => (
          <div key={name} className="flex-1">
            <div className="flex flex-col-reverse gap-1">
              {Array.from({ length: n }).map((_, i) => <span key={i} className="h-5 rounded-md bg-[#800020]/85" style={{ opacity: 1 - i * 0.18 }} />)}
            </div>
            <p className="mt-2 text-[11px] text-[#6F565D]">{name}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 inline-flex rounded-full bg-[#F5ECE8] px-3 py-1.5 text-xs text-[#5b3e46]">Bust 92 · Waist 74 · Hip 100 cm</p>
    </div>
  );
}

export function ShoppingTicks() {
  const items: [string, boolean][] = [["Wax print, 6 yards", true], ["Lace trim, 3 yards", true], ["Zips, 4", false]];
  return (
    <ul aria-hidden="true" className="mt-6 space-y-2.5 text-sm">
      {items.map(([name, done]) => (
        <li key={name} className="flex items-center gap-3">
          <span className={`grid size-5 place-items-center rounded-md border ${done ? "border-[#800020] bg-[#800020] text-white" : "border-[#CDB8BC] bg-white"}`}>{done && <Check className="size-3.5" strokeWidth={3} />}</span>
          <span className={done ? "text-[#6F565D] line-through decoration-[#C98C96]" : ""}>{name}</span>
        </li>
      ))}
    </ul>
  );
}

export function Sparkline() {
  return (
    <div aria-hidden="true" className="mt-6">
      <svg viewBox="0 0 240 70" className="h-16 w-full" fill="none" preserveAspectRatio="none">
        <path d="M0 58 C30 52 40 40 70 42 S110 56 140 34 S200 14 240 8 V70 H0Z" fill="#800020" fillOpacity=".1" />
        <path d="M0 58 C30 52 40 40 70 42 S110 56 140 34 S200 14 240 8" stroke="#800020" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 6" />
        <circle cx="240" cy="8" r="4" fill="#C79A45" />
      </svg>
      <p className="mt-2 font-[family-name:var(--font-serif)] text-3xl font-semibold text-[#800020] [font-variant-numeric:lining-nums_tabular-nums]">GHS 2,400</p>
      <p className="text-xs text-[#6F565D]">safe to pay yourself from 6 jobs in progress</p>
    </div>
  );
}

export function StockGauges() {
  const rows: [string, number, boolean][] = [["Thread", 82, false], ["Interfacing", 56, false], ["Zips", 22, true]];
  return (
    <ul aria-hidden="true" className="mt-6 space-y-3.5">
      {rows.map(([name, pct, low]) => (
        <li key={name}>
          <div className="mb-1.5 flex justify-between text-xs"><span>{name}</span><span className={low ? "font-semibold text-[#B1471F]" : "text-[#6F565D]"}>{low ? "Running low" : `${pct}%`}</span></div>
          <div className="h-2 rounded-full bg-[#EFE3E3]"><div className="h-2 rounded-full" style={{ width: `${pct}%`, background: low ? "#C8643B" : "#800020" }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function ExampleNote({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border border-dashed border-[#C79A45] px-2.5 py-0.5 text-[11px] text-[#7a5a1d]">{children}</span>;
}
