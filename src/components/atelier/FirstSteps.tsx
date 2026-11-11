"use client";

import { Check, ChevronRight, UserPlus, ShoppingBag, Wallet, ArrowRightCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewKey } from "@/stores/nav";

type Go = (view: ViewKey, opts?: { id?: string | null; params?: Record<string, string> }) => void;

/**
 * The four things a new studio does first: add a customer, add an order,
 * record a payment, move the order along. Everything else in the app stays
 * available but out of the way until these are done.
 */
export function FirstSteps({
  customersCount,
  ordersCount,
  hasPayment,
  hasMovedOrder,
  firstOrderId,
  go,
  className,
}: {
  customersCount: number;
  ordersCount: number;
  hasPayment: boolean;
  hasMovedOrder: boolean;
  firstOrderId?: string | null;
  go: Go;
  className?: string;
}) {
  const steps = [
    {
      title: "Add a customer",
      note: "Save their name and phone number.",
      icon: UserPlus,
      done: customersCount > 0,
      cta: "Add customer",
      run: () => go("customers", { params: { add: "1" } }),
    },
    {
      title: "Add an order",
      note: "Choose the customer and describe the garment. The price comes from the cost.",
      icon: ShoppingBag,
      done: ordersCount > 0,
      cta: "Add order",
      run: () => go("new-order"),
    },
    {
      title: "Record a payment",
      note: "Open the order and record the deposit or any payment received.",
      icon: Wallet,
      done: hasPayment,
      cta: "Open order",
      run: () => (firstOrderId ? go("order", { id: firstOrderId }) : go("orders")),
    },
    {
      title: "Move the order along",
      note: "Change its status as the work goes from cutting to sewing to ready.",
      icon: ArrowRightCircle,
      done: hasMovedOrder,
      cta: "Open board",
      run: () => go("board"),
    },
  ];
  const current = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section
      aria-label="First steps"
      className={cn("rounded-xl border border-[#E6D4D8] bg-white p-5 shadow-xs sm:p-6", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-stone-500">Getting started</p>
          <h2 className="font-display text-xl font-semibold text-[#391019]">Four steps to your first finished order</h2>
        </div>
        <p className="text-xs tabular-nums text-stone-500">{doneCount} of 4 done</p>
      </div>

      <ol className="mt-4 grid gap-2.5">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isCurrent = i === current;
          return (
            <li
              key={s.title}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors",
                s.done
                  ? "border-emerald-200 bg-emerald-50/50"
                  : isCurrent
                  ? "border-[#832138]/40 bg-[#FAF0F2]"
                  : "border-[#EEDFE3] bg-white"
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  s.done ? "bg-emerald-100 text-emerald-700" : isCurrent ? "bg-[#832138] text-white" : "bg-stone-100 text-stone-500"
                )}
              >
                {s.done ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-medium", s.done ? "text-stone-500 line-through decoration-stone-300" : "text-[#391019]")}>
                  {s.title}
                </span>
                {!s.done && <span className="block text-xs leading-relaxed text-stone-500">{s.note}</span>}
              </span>
              {!s.done && (
                <button
                  type="button"
                  onClick={s.run}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                    isCurrent ? "bg-[#832138] text-white hover:bg-[#6C1C2F]" : "border border-[#E6D4D8] text-[#391019] hover:bg-[#FCF8F9]"
                  )}
                >
                  {s.cta}
                  <ChevronRight className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-stone-500">
        Everything else, such as fittings, quotes, True Costing and messages, is under <strong>More tools</strong> in the menu whenever you want it.
      </p>
    </section>
  );
}
