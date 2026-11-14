"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFormMode } from "@/hooks/use-form-mode";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Width of the pop-up on tablets. Phones always use nearly the full width. */
  maxWidth?: string;
  children: ReactNode;
};

/**
 * One place that decides where a data-entry form appears.
 * Tablets and phones: a pop-up that scrolls inside itself, so the page never scrolls sideways.
 * Desktop: a panel on the page, right above the table it feeds.
 */
export function ResponsiveForm({ open, onOpenChange, title, description, maxWidth = "sm:max-w-[560px]", children }: Props) {
  const mode = useFormMode();
  if (mode === "popup") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={`${maxWidth} w-[calc(100vw-1.5rem)] max-h-[92dvh] overflow-y-auto overflow-x-hidden rounded-xl p-4 sm:p-6`}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-[#2F151B]">{title}</DialogTitle>
            <DialogDescription className={description ? "text-stone-500" : "sr-only"}>{description ?? title}</DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }
  if (!open) return null;
  return (
    <section aria-label={title} className="mb-6 rounded-xl border border-[#E6D4D8] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-[#2F151B]">{title}</h2>
          {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        </div>
        <button type="button" onClick={() => onOpenChange(false)} aria-label="Close form" className="grid size-9 place-items-center rounded-full text-stone-500 hover:bg-[#FBF1F3]"><X className="size-4" /></button>
      </div>
      {children}
    </section>
  );
}
