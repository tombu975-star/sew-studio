"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

function Switch({
  className,
  loading = false,
  disabled,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  /** Show a small spinner in the thumb while a toggle-triggered action (a
   *  mutation, usually) is still in flight — pair with `disabled={loading}`
   *  so a second toggle can't fire mid-flight. Without this, `disabled`
   *  alone just dims the switch, which reads as "broken" rather than
   *  "working on it" during a slow request. */
  loading?: boolean
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none flex size-4 items-center justify-center rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
      >
        {loading && <Loader2 className="size-2.5 animate-spin opacity-60" />}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
