import * as React from "react"
import { cn } from "@/lib/utils"

type BalanceMarkProps = React.HTMLAttributes<HTMLSpanElement>;

export function BalanceMark({ className, ...props }: BalanceMarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-bold text-[var(--brass)] select-none",
        // The stamped style: slightly rotated, maybe a specific serif or hand-drawn look if possible
        // We can simulate it by rotating it slightly and using a bold sans or serif.
        "rotate-[-4deg] opacity-90 text-lg px-1",
        className
      )}
      title="Verified & Settled"
      {...props}
    >
      ✓
    </span>
  )
}
