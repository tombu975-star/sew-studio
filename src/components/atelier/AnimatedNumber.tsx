"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

/**
 * Animated number that counts up to the target value on mount.
 * Renders a formatted currency / plain number.
 */
export function AnimatedNumber({
  value,
  format = "plain",
  duration = 900,
  currency,
  className,
}: {
  value: number;
  format?: "plain" | "currency";
  duration?: number;
  /** ISO 4217 code, e.g. "GHS", "NGN", "USD" — used when format is "currency". */
  currency?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const from = 0;
    const to = value;
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  const formatted =
    format === "currency"
      ? formatCurrency(Math.round(display), currency)
      : new Intl.NumberFormat("en-GB").format(Math.round(display));

  return <span className={cn("tabular-nums", className)}>{formatted}</span>;
}
