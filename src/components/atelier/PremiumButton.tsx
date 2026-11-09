"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[#2563EB] shadow-sm hover:bg-[#1D4ED8] active:bg-[#1E40AF]",
  secondary:
    "bg-[#0F172A] text-white hover:bg-[#1E293B]",
  ghost:
    "bg-transparent text-stone-600 hover:bg-[#F1F5F9] hover:text-[#0F172A]",
  outline:
    "bg-white border border-[#CBD5E1] text-[#0F172A] shadow-[0_1px_1px_rgba(15,23,42,0.04)] hover:border-[#2563EB]/40 hover:bg-[#EFF6FF] active:bg-[#F1F5F9]",
  danger:
    "bg-[#8E3232] text-white hover:bg-[#6B2626]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-11 md:h-10 px-4 text-sm gap-2",
  lg: "h-12 md:h-11 px-6 text-sm gap-2",
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
        "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-45 disabled:pointer-events-none disabled:grayscale-[0.3] whitespace-nowrap select-none",
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
