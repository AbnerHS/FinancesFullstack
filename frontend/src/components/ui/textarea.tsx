import type { TextareaHTMLAttributes } from "react"

import { cn } from "@/lib/utils.ts"

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-border bg-card/90 px-4 py-3 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
