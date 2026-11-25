import { Users } from "lucide-react"

import { PillGroup, type PillOption } from "@/components/ui/pill-group.tsx"
import type { PillTone } from "@/components/ui/pill-styles.ts"
import type { ResponsibleOption } from "@/features/finance/types.ts"
import { cn } from "@/lib/utils.ts"

/**
 * Cor de cada participante, pela ordem no plano (a mesma em todas as telas: formulário, filtros).
 */
const PERSON_TONES: Array<PillTone & { dot: string }> = [
  {
    dot: "bg-indigo-500 text-white",
    selected: "border-indigo-500/45 bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
    hover: "hover:border-indigo-500/40",
  },
  {
    dot: "bg-pink-500 text-white",
    selected: "border-pink-500/45 bg-pink-500/12 text-pink-700 dark:text-pink-300",
    hover: "hover:border-pink-500/40",
  },
  {
    dot: "bg-teal-500 text-white",
    selected: "border-teal-500/45 bg-teal-500/12 text-teal-700 dark:text-teal-300",
    hover: "hover:border-teal-500/40",
  },
  {
    dot: "bg-orange-500 text-white",
    selected: "border-orange-500/45 bg-orange-500/12 text-orange-700 dark:text-orange-300",
    hover: "hover:border-orange-500/40",
  },
]

const EVERYONE_TONE: PillTone = {
  selected: "border-slate-500/45 bg-slate-500/12 text-slate-700 dark:text-slate-200",
  hover: "hover:border-slate-500/40",
}

const firstName = (label: string) => label.trim().split(/\s+/)[0] || label

const dotClassName =
  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"

/**
 * Responsável em pílulas: uma opção "todos/geral" (valor "") e cada participante do plano, pelo
 * primeiro nome com a inicial colorida (nome completo na dica).
 */
export function ResponsiblePills({
  id,
  label = "Responsável",
  options,
  value,
  onChange,
  everyoneLabel,
  everyoneTitle,
  className,
}: {
  id: string
  label?: string
  options: ResponsibleOption[]
  value: string
  onChange: (responsibleId: string) => void
  /** Rótulo da opção sem responsável: "Geral" (lançamento) ou "Todos" (filtro). */
  everyoneLabel: string
  everyoneTitle?: string
  className?: string
}) {
  const pills: Array<PillOption<string>> = [
    {
      value: "",
      label: everyoneLabel,
      title: everyoneTitle,
      tone: EVERYONE_TONE,
      className: "pl-1.5 sm:pl-1.5",
      leading: (
        <span className={cn(dotClassName, "bg-slate-500/15 text-slate-600 dark:text-slate-300")}>
          <Users size={13} aria-hidden="true" />
        </span>
      ),
    },
    ...options.map((option, index) => {
      const tone = PERSON_TONES[index % PERSON_TONES.length]!
      return {
        value: option.id,
        label: firstName(option.label),
        title: option.label,
        tone,
        className: "pl-1.5 sm:pl-1.5",
        leading: (
          <span className={cn(dotClassName, tone.dot)} aria-hidden="true">
            {option.label.trim().charAt(0).toUpperCase()}
          </span>
        ),
      }
    }),
  ]

  return (
    <PillGroup
      id={id}
      label={label}
      options={pills}
      value={value}
      onChange={onChange}
      className={className}
    />
  )
}
