"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#1E3A8A]",
  secondary:
    "bg-[#344054] text-white hover:bg-[#1D2939]",
  ghost:
    "bg-transparent text-stone-600 hover:bg-[#F1F5F9] hover:text-[#0F172A]",
  outline:
    "bg-white border border-[#B8C2CF] text-[#243247] hover:border-[#1D4ED8] hover:bg-[#F8FAFC] active:bg-[#EEF2F6]",
  danger:
    "bg-[#B42318] text-white hover:bg-[#912018]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-9 w-9",
};

interface PremiumButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const PremiumButton = forwardRef<
  HTMLButtonElement,
  PremiumButtonProps
>(function PremiumButton(
  {
    children,
    className,
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
});
