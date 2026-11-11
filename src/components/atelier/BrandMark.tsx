import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Sewsiness emblem (mannequin and tape measure). */
export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/brand/sewsiness-mark.png"
      alt=""
      width={Math.round(size * 0.45)}
      height={size}
      className={cn("h-auto w-auto object-contain", className)}
      style={{ height: size, width: "auto" }}
    />
  );
}

/** The full Sewsiness logo with the name. */
export function BrandLogo({ className, width = 220 }: { className?: string; width?: number }) {
  return (
    <Image
      src="/brand/sewsiness-wordmark.png"
      alt="Sewsiness"
      width={width}
      height={Math.round(width * 0.557)}
      priority
      className={cn("h-auto", className)}
      style={{ width, height: "auto" }}
    />
  );
}
