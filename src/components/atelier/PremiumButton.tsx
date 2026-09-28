"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[#800020] hover:bg-[#6b0018] active:bg-[#5c0016]",
  secondary:
    "bg-[#1C1917] text-white hover:bg-[#292524]",
  ghost:
    "bg-transparent text-stone-600 hover:bg-[#F5F1EC] hover:text-[#1C1917]",
  outline:
    "bg-white border border-[#E7E5E4] text-[#1C1917] hover:border-[#800020]/35 hover:bg-[#FBF9F7] active:bg-[#F5F1EC]",
  danger:
    "bg-[#b91c1c] text-white hover:bg-[#991b1b]",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
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
        "inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-45 disabled:pointer-events-none disabled:grayscale-[0.3] whitespace-nowrap select-none",
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
