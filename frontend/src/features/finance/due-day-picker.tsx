import type { ReactNode } from "react"

import { Label } from "@/components/ui/label.tsx"
import { cn } from "@/lib/utils.ts"

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

/**
 * Dia do mês (vencimento): grade de 1 a 31, sem digitar, e "Sem dia". Dias que o mês não tem (31 em
 * abril) caem no último dia. Usado no cartão (vencimento das faturas) e nas previsões (contas).
 */
export function DueDayPicker({
  id,
  label = "Dia de vencimento",
  value,
  onChange,
  hint,
}: {
  id: string
  label?: string
  value: number | null
  onChange: (day: number | null) => void
  /** Texto de ajuda conforme o dia escolhido. */
  hint?: (day: number | null) => ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label id={`${id}-label`}>{label}</Label>
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          onClick={() => onChange(null)}
          className={cn(
            "h-7 rounded-full border px-2.5 text-xs font-medium transition",
            value === null
              ? "border-primary/40 bg-primary/12 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
          )}
        >
          Sem dia
        </button>
      </div>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            role="radio"
            aria-checked={value === day}
            onClick={() => onChange(day)}
            className={cn(
              "h-9 rounded-lg text-sm font-medium tabular-nums transition",
              value === day
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-primary/10 hover:text-primary"
            )}
          >
            {day}
          </button>
        ))}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint(value)}</p> : null}
    </div>
  )
}
