"use client";

import { formatCurrency, formatDate } from "@/lib/format";
import type { Order, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Stable, human-friendly invoice number derived from the order (no schema change needed). */
export function invoiceNumber(order: Pick<Order, "id" | "orderDate">, prefix?: string) {
  const year = new Date(order.orderDate).getFullYear();
  const short = order.id.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${prefix || "INV"}-${Number.isFinite(year) ? year : "----"}-${short}`;
}

type PayState = "paid" | "part" | "unpaid";

const PAY_LABEL: Record<PayState, string> = {
  paid: "Paid in full",
  part: "Part paid",
  unpaid: "Unpaid",
};

const PAY_STYLE: Record<PayState, string> = {
  paid: "border-emerald-600 text-emerald-700",
  part: "border-amber-600 text-amber-700",
  unpaid: "border-[#800020] text-[#800020]",
};

/**
 * A customer-facing invoice: studio letterhead, bill-to, line items, totals,
 * payments received, terms and signature lines. Internal costing (fabric,
 * labour, overhead, margin) is deliberately NOT shown here.
 */
export function Invoice({
  order,
  settings,
  currency,
  paymentAction,
}: {
  order: Order;
  settings?: Settings | null;
  currency: string;
  paymentAction?: React.ReactNode;
}) {
  const total = Number(order.sellingPrice) || 0;
  const payments = [...(order.payments ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = Math.max(0, total - paid);
  const state: PayState = total > 0 && paid >= total ? "paid" : paid > 0 ? "part" : "unpaid";
  const c = order.customer;
  const studio = settings?.studioName || "Madam Studio";
  const fittings = [...(order.fittings ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const terms = [
    settings?.depositPolicyText,
    settings?.alterationsPolicyText,
    settings?.cancellationPolicyText,
  ].filter((t): t is string => !!t && t.trim().length > 0);
  const location = [c?.city, c?.country].filter(Boolean).join(", ");

  return (
    <article
      className="invoice-sheet w-full bg-white border border-[#EEDFE3] rounded-lg overflow-hidden"
      aria-label={`Invoice ${invoiceNumber(order, settings?.invoicePrefix)}`}
    >
      {/* Accent rule */}
      <div className="h-1.5 bg-[#800020]" />

      <div className="p-5 sm:p-8 md:p-10">
        {/* Letterhead */}
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
          <div className="min-w-0">
            <h2 className="font-display text-2xl sm:text-[28px] font-semibold leading-tight text-[#2F151B] break-words">
              {studio}
            </h2>
            <address className="mt-2 not-italic text-[12px] leading-relaxed text-stone-500 space-y-0.5">
              {settings?.address && <div className="whitespace-pre-line">{settings.address}</div>}
              {settings?.contactPhone && <div>Tel: {settings.contactPhone}</div>}
              {settings?.contactEmail && <div className="break-all">{settings.contactEmail}</div>}
              {settings?.taxId && <div>Tax ID: {settings.taxId}</div>}
            </address>
          </div>

          <div className="sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
              Invoice
            </div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#2F151B] break-all">
              {invoiceNumber(order, settings?.invoicePrefix)}
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] sm:inline-grid gap-x-4 gap-y-1 text-[12px] sm:text-left">
              <dt className="text-stone-400">Issued</dt>
              <dd className="text-[#2F151B] font-medium tabular-nums sm:text-right">
                {formatDate(order.orderDate)}
              </dd>
              <dt className="text-stone-400">Delivery</dt>
              <dd className="text-[#2F151B] font-medium tabular-nums sm:text-right">
                {order.deliveryDate ? formatDate(order.deliveryDate) : "To be agreed"}
              </dd>
              <dt className="text-stone-400">Status</dt>
              <dd className="text-[#2F151B] font-medium sm:text-right">{order.status}</dd>
            </dl>
          </div>
        </div>

        {/* Bill to / order */}
        <section className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-8 border-t border-[#EEDFE3] pt-6">
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
              Billed to
            </h3>
            <div className="mt-2 text-sm font-semibold text-[#2F151B] break-words">
              {c?.name || "—"}
            </div>
            <div className="mt-1 text-[12px] leading-relaxed text-stone-500 space-y-0.5">
              {c?.phone && <div>{c.phone}</div>}
              {c?.email && <div className="break-all">{c.email}</div>}
              {location && <div>{location}</div>}
            </div>
          </div>

          <div className="sm:text-right">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
              Garment
            </h3>
            <div className="mt-2 text-sm font-semibold text-[#2F151B] break-words">
              {order.garmentDesign}
            </div>
            <div className="mt-1 text-[12px] leading-relaxed text-stone-500 space-y-0.5">
              {order.assignedStaff?.fullName && <div>Tailor: {order.assignedStaff.fullName}</div>}
              {order.priority === "High" && <div>Priority order</div>}
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="mt-8">
          <div className="hidden sm:grid grid-cols-[2rem_minmax(0,1fr)_3.5rem_7rem_7.5rem] gap-3 border-y border-[#2F151B] py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2F151B]">
            <span>#</span>
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="sm:hidden border-y border-[#2F151B] py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2F151B] flex justify-between">
            <span>Description</span>
            <span>Amount</span>
          </div>

          <div className="grid sm:grid-cols-[2rem_minmax(0,1fr)_3.5rem_7rem_7.5rem] gap-x-3 gap-y-1 py-4 border-b border-[#EEDFE3] items-start">
            <span className="hidden sm:block text-[12px] text-stone-400 tabular-nums">1</span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[#2F151B] break-words">
                {order.garmentDesign}
              </div>
              <div className="mt-0.5 text-[12px] text-stone-500">
                Bespoke tailoring · made to measure
                {fittings.length > 0 && ` · ${fittings.length} fitting${fittings.length === 1 ? "" : "s"}`}
              </div>
              {order.notes && (
                <div className="mt-1 text-[12px] text-stone-400 italic whitespace-pre-line break-words">
                  {order.notes}
                </div>
              )}
            </div>
            <span className="hidden sm:block text-right text-sm tabular-nums">1</span>
            <span className="hidden sm:block text-right text-sm tabular-nums">
              {formatCurrency(total, currency)}
            </span>
            <span className="sm:text-right text-sm font-medium tabular-nums text-[#2F151B] flex justify-between sm:block">
              <span className="sm:hidden text-[12px] text-stone-400">1 ×</span>
              {formatCurrency(total, currency)}
            </span>
          </div>
        </section>

        {/* Totals */}
        <section className="mt-6 flex sm:justify-end">
          <dl className="w-full sm:w-[22rem] text-sm">
            <div className="flex justify-between py-1.5">
              <dt className="text-stone-500">Subtotal</dt>
              <dd className="tabular-nums text-[#2F151B]">{formatCurrency(total, currency)}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-t border-[#EEDFE3]">
              <dt className="font-semibold text-[#2F151B]">Total</dt>
              <dd className="tabular-nums font-semibold text-[#2F151B]">
                {formatCurrency(total, currency)}
              </dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-stone-500">Paid to date</dt>
              <dd className="tabular-nums text-emerald-700">− {formatCurrency(paid, currency)}</dd>
            </div>
            <div
              className={cn(
                "mt-1 flex items-center justify-between rounded-md px-3 py-3",
                balance > 0 ? "bg-[#800020] text-white" : "bg-emerald-700 text-white"
              )}
            >
              <dt className="text-xs font-semibold uppercase tracking-[0.18em]">
                Balance due
              </dt>
              <dd className="font-display text-xl font-semibold tabular-nums">
                {formatCurrency(balance, currency)}
              </dd>
            </div>
            <div className="mt-3 flex justify-end">
              <span
                className={cn(
                  "inline-block -rotate-2 rounded border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]",
                  PAY_STYLE[state]
                )}
              >
                {PAY_LABEL[state]}
              </span>
            </div>
          </dl>
        </section>

        {/* Payments received */}
        <section className="mt-8 border-t border-[#EEDFE3] pt-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
              Payments received
            </h3>
            {paymentAction && <div className="print:hidden">{paymentAction}</div>}
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-stone-400">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-[#EEDFE3]/80 border-y border-[#EEDFE3]">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2.5 text-[13px]"
                >
                  <div className="min-w-0">
                    <span className="tabular-nums text-[#2F151B]">{formatDate(p.date)}</span>
                    {(p.method || p.note) && (
                      <span className="text-stone-400 break-words">
                        {" "}· {[p.method, p.note].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                  <span className="tabular-nums font-medium text-[#2F151B]">
                    {formatCurrency(p.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Fittings */}
        {fittings.length > 0 && (
          <section className="mt-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
              Fitting appointments
            </h3>
            <p className="mt-2 text-[13px] text-stone-600">
              {fittings.map((f) => formatDate(f.date)).join("  ·  ")}
            </p>
          </section>
        )}

        {/* Terms */}
        {terms.length > 0 && (
          <section className="mt-8 border-t border-[#EEDFE3] pt-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
              Terms &amp; conditions
            </h3>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-stone-500 list-disc pl-4">
              {terms.map((t, i) => (
                <li key={i} className="break-words">{t}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Signatures */}
        <section className="mt-10 grid grid-cols-2 gap-8 text-xs text-stone-500">
          <div>
            <div className="h-10 border-b border-stone-400" />
            <div className="mt-1.5">Customer signature</div>
          </div>
          <div>
            <div className="h-10 border-b border-stone-400" />
            <div className="mt-1.5">Authorised by {studio}</div>
          </div>
        </section>

        <p className="mt-8 text-center text-[12px] text-stone-400">
          Thank you for choosing {studio}.
        </p>
      </div>
    </article>
  );
}
