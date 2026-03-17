import type { LabelHTMLAttributes } from "react"

import { cn } from "@/lib/utils.ts"

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
