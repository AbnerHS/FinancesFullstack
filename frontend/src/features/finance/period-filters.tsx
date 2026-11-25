import { useMemo, useState, type ReactNode } from "react"
import { CalendarDays, ChevronDown, SlidersHorizontal } from "lucide-react"

import { ResponsiblePills } from "@/features/finance/responsible-pills.tsx"
import type { Period, ResponsibleOption } from "@/features/finance/types.ts"
import { MonthPickerDialog } from "@/features/finance/month-picker.tsx"
import { formatMonthYear } from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils"

/**
 * Painel de filtros das telas do plano. No mobile fica recolhido num resumo clicável
 * ("Casa · outubro/2026"); no desktop, sempre aberto.
 */
export function FiltersPanel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className="app-panel p-4 sm:p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left lg:hidden"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="page-filters"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="rounded-full bg-primary/12 p-2.5 text-primary">
            <SlidersHorizontal size={16} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {title}
            </span>
            <span className="block truncate text-xs text-muted-foreground capitalize">
              {subtitle}
            </span>
          </span>
        </span>
        <ChevronDown
          size={18}
          className={cn("shrink-0 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>

      <div id="page-filters" className={cn("mt-4 lg:mt-0 lg:block", !open && "hidden")}>
        {children}
      </div>
    </section>
  )
}

/** Filtro de responsável em pílulas: "Todos" e cada participante (o plano se escolhe no cabeçalho). */
export function ResponsibleFilter({
  responsibleOptions,
  responsibleFilter,
  onResponsibleChange,
}: {
  responsibleOptions: ResponsibleOption[]
  responsibleFilter: string
  onResponsibleChange: (responsibleId: string) => void
}) {
  return (
    <ResponsiblePills
      id="filter-responsible"
      options={responsibleOptions}
      value={responsibleFilter}
      onChange={onResponsibleChange}
      everyoneLabel="Todos"
      everyoneTitle="Todos os participantes"
    />
  )
}

/**
 * Mês de início ou fim do intervalo: um botão ("nov/2026") que abre o seletor de mês em grade. O
 * intervalo só usa meses com dados; um mês vazio escolhido vira o mais próximo dentro do intervalo
 * (o primeiro a partir dele para "De", o último até ele para "Até").
 */
export function MonthRangeButton({
  label,
  edge,
  periods,
  value,
  disabled,
  onChange,
}: {
  label: string
  edge: "start" | "end"
  periods: Period[]
  value: Period | null
  disabled: boolean
  onChange: (periodId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const id = `range-${label.toLowerCase()}`
  const monthIds = useMemo(() => periods.map((period) => period.id), [periods])

  const select = (monthId: string) => {
    const target =
      edge === "start"
        ? (periods.find((period) => period.id >= monthId) ?? periods.at(-1))
        : ([...periods].reverse().find((period) => period.id <= monthId) ?? periods[0])
    if (target) onChange(target.id)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={`${id}-label`} className="app-label">
        {label}
      </span>
      <button
        type="button"
        aria-labelledby={`${id}-label`}
        disabled={disabled || periods.length === 0}
        onClick={() => setOpen(true)}
        className="flex h-11 items-center justify-between gap-2 rounded-xl border border-border bg-card/90 px-3 text-left text-sm font-medium text-foreground transition hover:border-primary/40 disabled:opacity-50"
      >
        <span className="flex items-center gap-2 capitalize">
          <CalendarDays size={16} className="shrink-0 text-primary" aria-hidden="true" />
          {value ? formatMonthYear(value) : "Escolher mês"}
        </span>
        <ChevronDown size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {value ? (
        <MonthPickerDialog
          open={open}
          value={value.id}
          monthsWithData={monthIds}
          onSelect={select}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  )
}

/** Botões de atalho em pílula (intervalos da evolução, "Mês atual" do dashboard). */
export function ShortcutButtons({
  items,
  disabled,
}: {
  items: Array<{ label: string; onClick: () => void; active?: boolean }>
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Atalhos de período">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          disabled={disabled}
          onClick={item.onClick}
          aria-pressed={item.active}
          className={cn(
            "h-10 rounded-full border px-4 text-sm font-medium transition disabled:opacity-50",
            item.active
              ? "border-primary/40 bg-primary/12 text-primary"
              : "border-border bg-card/85 text-foreground hover:border-primary/40 hover:text-primary"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
