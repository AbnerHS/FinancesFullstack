import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils.ts"

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-border/70 bg-card shadow-[0_18px_42px_rgba(15,40,51,0.08)]",
        className
      )}
      {...props}
    />
  )
}
