import { cn } from "@/lib/utils.ts"

/** Cores de uma pílula: escolhida e ao passar o mouse. */
export type PillTone = { selected: string; hover: string }

export const PRIMARY_PILL: PillTone = {
  selected: "border-primary/40 bg-primary/12 text-primary",
  hover: "hover:border-primary/40 hover:text-primary",
}

/** Classe de uma pílula (botão arredondado de escolha única). */
export function pillClassName(selected: boolean, tone: PillTone = PRIMARY_PILL, className?: string) {
  return cn(
    "inline-flex h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition sm:px-3.5",
    selected ? tone.selected : cn("border-border bg-card/85 text-foreground", tone.hover),
    className
  )
}
