import { useMemo, useState, type ReactNode } from "react"
import { ChevronDown, SlidersHorizontal } from "lucide-react"

import { Select } from "@/components/ui/select.tsx"
import type { Period, Plan, ResponsibleOption } from "@/features/finance/types.ts"
import { formatMonthLabel } from "@/features/finance/utils.ts"
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

/** Plano e responsável lado a lado. */
export function PlanResponsibleSelects({
  plans,
  selectedPlanId,
  onPlanChange,
  responsibleOptions,
  responsibleFilter,
  onResponsibleChange,
}: {
  plans: Plan[]
  selectedPlanId: string | null
  onPlanChange: (planId: string) => void
  responsibleOptions: ResponsibleOption[]
  responsibleFilter: string
  onResponsibleChange: (responsibleId: string) => void
}) {
  return (
    <>
      <div className="min-w-0">
        <label className="app-label" htmlFor="filter-plan">
          Plano financeiro
        </label>
        <Select
          id="filter-plan"
          className="mt-2"
          disabled={plans.length === 0}
          value={selectedPlanId || ""}
          onChange={(event) => onPlanChange(event.target.value)}
        >
          {plans.length === 0 ? <option value="">Nenhum plano ainda</option> : null}
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-0">
        <label className="app-label" htmlFor="filter-responsible">
          Responsável
        </label>
        <Select
          id="filter-responsible"
          className="mt-2"
          disabled={responsibleOptions.length === 0}
          value={responsibleFilter}
          onChange={(event) => onResponsibleChange(event.target.value)}
        >
          <option value="">Todos os participantes</option>
          {responsibleOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </>
  )
}

/** Mês + ano lado a lado; trocar o ano mantém o mês escolhido quando ele existe. */
export function MonthYearPicker({
  label,
  periods,
  value,
  disabled,
  onChange,
}: {
  label: string
  periods: Period[]
  value: Period | null
  disabled: boolean
  onChange: (periodId: string) => void
}) {
  const years = useMemo(
    () => [...new Set(periods.map((period) => period.year))].sort((a, b) => a - b),
    [periods]
  )
  const id = `range-${label.toLowerCase()}`
  const select = (year: number, month: number) => {
    const target =
      periods.find((period) => period.year === year && period.month === month) ??
      periods.find((period) => period.year === year)
    if (target) onChange(target.id)
  }

  return (
    <fieldset disabled={disabled || periods.length === 0} className="min-w-0">
      <legend className="app-label">{label}</legend>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
        <Select
          id={`${id}-month`}
          aria-label={`${label}: mês`}
          value={value ? String(value.month) : ""}
          onChange={(event) => value && select(value.year, Number(event.target.value))}
        >
          {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
            <option key={month} value={month}>
              {formatMonthLabel(month)}
            </option>
          ))}
        </Select>
        <Select
          id={`${id}-year`}
          aria-label={`${label}: ano`}
          value={value ? String(value.year) : ""}
          onChange={(event) => select(Number(event.target.value), value?.month ?? 1)}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
      </div>
    </fieldset>
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
