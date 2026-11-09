"use client";

import { Check, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PremiumButton } from "@/components/atelier/PremiumButton";

/**
 * First-steps guide shown as a pop-up to studios on the trial plan.
 * The dashboard decides when to open it; this only draws it.
 */
export function GettingStartedDialog({
  open,
  onOpenChange,
  hasCustomers,
  onStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasCustomers: boolean;
  onStart: () => void;
}) {
  const steps = [
    { title: "Add a customer", note: "Save their name and contact details.", done: hasCustomers, active: !hasCustomers },
    { title: "Create an order", note: "Choose the customer and describe the garment.", done: false, active: hasCustomers },
    { title: "Track the order", note: "Update sewing, fittings and payments.", done: false, active: false },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-5 rounded-xl p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="text-left">
          <p className="text-xs font-medium text-slate-500">Getting started</p>
          <DialogTitle className="text-lg font-semibold tracking-tight text-[#17263C]">
            Recommended first steps
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-stone-600">
            Add a customer, then create an order for the garment they want. You can add
            measurements, prices and a delivery date as you go.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3.5">
          {steps.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  s.done
                    ? "bg-emerald-100 text-emerald-700"
                    : s.active
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {s.done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span>
                <span className="block text-sm font-medium text-[#17263C]">{s.title}</span>
                <span className="block text-xs leading-relaxed text-stone-500">{s.note}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg px-4 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            Maybe later
          </button>
          <PremiumButton variant="primary" size="md" onClick={onStart}>
            <Plus className="size-4" />
            {hasCustomers ? "Create your first order" : "Add your first customer"}
          </PremiumButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
