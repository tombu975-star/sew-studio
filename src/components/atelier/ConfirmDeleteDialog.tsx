"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PremiumButton } from "@/components/atelier/PremiumButton";

/**
 * One consistent "are you sure?" step for every destructive action the
 * owner can take. The confirm button is deliberately not an AlertDialogAction
 * so the dialog stays open (with a spinner) until the request finishes.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <PremiumButton variant="danger" loading={loading} onClick={onConfirm}>
            {loading ? "Deleting…" : confirmLabel}
          </PremiumButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
