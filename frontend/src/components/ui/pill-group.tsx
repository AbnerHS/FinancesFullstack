import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { Label } from "@/components/ui/label.tsx"
import { pillClassName, type PillTone } from "@/components/ui/pill-styles.ts"
import { cn } from "@/lib/utils.ts"

export type PillOption<T extends string> = {
  value: T
  label: string
  /** Texto completo na dica (quando o rótulo é curto). */
  title?: string
  icon?: LucideIcon
  /** Conteúdo antes do rótulo no lugar do ícone (ex.: inicial colorida). */
  leading?: ReactNode
  tone?: PillTone
  /** Classe extra da pílula (ex.: menos padding à esquerda com `leading`). */
  className?: string
}

/**
 * Escolha única em pílulas, no lugar de um select com poucas opções conhecidas (responsável,
 * cartão, status...). Para listas longas ou abertas (categorias, meses), use select/combobox.
 */
export function PillGroup<T extends string>({
  id,
  label,
  options,
  value,
  onChange,
  className,
}: {
  id: string
  label?: string
  options: Array<PillOption<T>>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? <Label id={`${id}-label`}>{label}</Label> : null}
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={label ? `${id}-label` : undefined}
        className="flex min-h-11 flex-wrap items-center gap-1.5"
      >
        {options.map((option) => {
          const selected = option.value === value
          const Icon = option.icon
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.title}
              onClick={() => onChange(option.value)}
              className={pillClassName(selected, option.tone, option.className)}
            >
              {option.leading ??
                (Icon ? <Icon size={15} className="shrink-0" aria-hidden="true" /> : null)}
              <span className="truncate">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
