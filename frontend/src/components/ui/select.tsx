import type { SelectHTMLAttributes } from "react"

import { cn } from "@/lib/utils.ts"

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-11 w-full rounded-xl border border-border bg-card/90 px-4 py-2 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
