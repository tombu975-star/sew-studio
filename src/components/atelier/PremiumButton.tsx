"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[#832138] shadow-xs hover:bg-[#6C1C2F] active:bg-[#561625]",
  secondary:
    "bg-[#512E36] text-white hover:bg-[#3F2027]",
  ghost:
    "bg-transparent text-stone-600 hover:bg-[#F7EFF1] hover:text-[#2F151B]",
  outline:
    "bg-white border border-[#D2B9BF] text-[#3E282D] hover:border-[#6C1C2F] hover:bg-[#FCF8F9] active:bg-[#F5EBED]",
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
        "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C1C2F]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none",
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
