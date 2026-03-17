import type { ButtonHTMLAttributes } from "react"

import { cn } from "@/lib/utils.ts"

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean
}

export function Switch({ checked, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full border border-transparent bg-slate-300 transition-colors",
        "data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-6"
        )}
      />
    </button>
  )
}
