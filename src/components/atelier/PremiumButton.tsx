"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[#9E5A44] hover:bg-[#854B38] hover:shadow-[0_4px_12px_rgba(158,90,68,0.2)] active:bg-[#6B3A27]",
  secondary:
    "bg-[#1C1A18] text-white hover:bg-[#292524]",
  ghost:
    "bg-transparent text-stone-600 hover:bg-[#F5F4F0] hover:text-[#1C1A18]",
  outline:
    "bg-white border border-[#EAE6DF] text-[#1C1A18] hover:border-[#9E5A44]/35 hover:bg-[#FAF2EC] active:bg-[#F5F4F0]",
  danger:
    "bg-[#8E3232] text-white hover:bg-[#6B2626]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-sm gap-2",
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
        "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E5A44]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-45 disabled:pointer-events-none disabled:grayscale-[0.3] whitespace-nowrap select-none",
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
