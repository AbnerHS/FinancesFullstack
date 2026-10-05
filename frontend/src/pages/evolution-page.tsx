import { lazy, Suspense, useMemo } from "react"

import {
  CATEGORY_OTHER_COLOR,
  CATEGORY_SLICE_COLORS,
  EVOLUTION_COLORS,
} from "@/features/finance/chart-colors.ts"
import type { CategorySlice, EvolutionPoint } from "@/features/finance/charts.tsx"
import { useDashboardStore } from "@/features/finance/dashboard-store.ts"
import { useEvolution } from "@/features/finance/hooks.ts"
import {
  FiltersPanel,
  MonthYearPicker,
  PlanResponsibleSelects,
  ShortcutButtons,
} from "@/features/finance/period-filters.tsx"
import type { Period } from "@/features/finance/types.ts"
import {
  buildCategorySpending,
  buildResponsibleSpending,
  filterPanelsByResponsible,
  formatCurrency,
  formatMonthYear,
  formatPercent,
  toMonthId,
  type SpendingItem,
} from "@/features/finance/utils.ts"
import { cn } from "@/lib/utils"

// recharts só é baixado quando a tela de evolução abre.
const EvolutionChart = lazy(() =>
  import("@/features/finance/charts.tsx").then((module) => ({ default: module.EvolutionChart }))
)
const CategoryDonut = lazy(() =>
  import("@/features/finance/charts.tsx").then((module) => ({ default: module.CategoryDonut }))
)
// A rosca só lê bem com poucas fatias: as maiores categorias e o resto somado em "Outras".
const DONUT_SLICES = 5

const CATEGORY_LIMIT = 8

// Na tabela a moeda vai no cabeçalho: sem o "R$" em cada célula, as 4 colunas cabem no celular.
const amountFormat = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const formatAmount = (value: number) => amountFormat.format(value)

const shortMonth = (period: Period) =>
  `${formatMonthYear(period).slice(0, 3)}/${String(period.year).slice(2)}`

/** Comparação entre meses: totais do intervalo, tendência, categorias, responsáveis e mês a mês. */
export function EvolutionPage() {
  const {
    plans,
    plansLoading,
    activePlan,
    selectedPlanId,
    setSelectedPlanId,
    periods,
    periodsLoading,
    responsibleOptions,
    selectedPeriods,
    setSelectedStartPeriodId,
    setSelectedEndPeriodId,
    setSelectedRange,
    periodPanels,
  } = useEvolution()
  const responsibleFilter = useDashboardStore((state) => state.responsibleFilter)
  const setResponsibleFilter = useDashboardStore((state) => state.setResponsibleFilter)

  const panels = useMemo(
    () => filterPanelsByResponsible(periodPanels, responsibleFilter),
    [periodPanels, responsibleFilter]
  )
  const loading = periodPanels.some(
    (panel) => panel.transactionsLoading || panel.invoicesLoading
  )

  const startPeriod = selectedPeriods[0] ?? null
  const endPeriod = selectedPeriods[selectedPeriods.length - 1] ?? null
  const rangeLabel =
    startPeriod && endPeriod
      ? startPeriod.id === endPeriod.id
        ? formatMonthYear(startPeriod)
        : `${formatMonthYear(startPeriod)} – ${formatMonthYear(endPeriod)}`
      : "Sem meses"

  const summary = useMemo(() => {
    const incomes = panels.reduce((total, panel) => total + panel.stats.incomes, 0)
    const expenses = panels.reduce((total, panel) => total + panel.stats.expenses, 0)
    // Médias só sobre meses com lançamento: meses futuros ou vazios não puxam a média para baixo.
    const monthsWithData = panels.filter(
      (panel) => panel.transactions.length > 0 || panel.invoices.length > 0
    ).length
    const negative = panels.filter((panel) => panel.stats.balance < 0)
    const worst = [...panels].sort((a, b) => a.stats.balance - b.stats.balance)[0] ?? null
    return {
      incomes,
      expenses,
      balance: incomes - expenses,
      months: panels.length,
      monthsWithData,
      negativeCount: negative.length,
      worst: worst && worst.stats.balance < 0 ? worst : null,
    }
  }, [panels])

  const chartData = useMemo<EvolutionPoint[]>(
    () =>
      panels.map((panel, index) => ({
        id: panel.period.id,
        label: panel.label,
        shortLabel: shortMonth(panel.period),
        incomes: panel.stats.incomes,
        expenses: panel.stats.expenses,
        cumulativeBalance: panels
          .slice(0, index + 1)
          .reduce((total, item) => total + item.stats.balance, 0),
      })),
    [panels]
  )

  const categories = useMemo(
    () => buildCategorySpending(panels, !responsibleFilter),
    [panels, responsibleFilter]
  )
  const responsibles = useMemo(
    () =>
      buildResponsibleSpending(
        panels.flatMap((panel) => panel.transactions),
        responsibleOptions
      ),
    [panels, responsibleOptions]
  )

  const presets = useMemo(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const monthsBack = (count: number) => {
      const date = new Date(year, month - count, 1)
      return toMonthId(date.getFullYear(), date.getMonth() + 1)
    }
    const current = toMonthId(year, month)
    return [
      { label: "Últimos 6 meses", start: monthsBack(6), end: current },
      { label: "Últimos 12 meses", start: monthsBack(12), end: current },
      { label: "Este ano", start: toMonthId(year, 1), end: toMonthId(year, 12) },
      { label: "Ano passado", start: toMonthId(year - 1, 1), end: toMonthId(year - 1, 12) },
    ]
  }, [])

  if (plansLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">Carregando...</div>
    )
  }

  return (
    <div className="space-y-6">
      <FiltersPanel title={activePlan?.name || "Sem plano"} subtitle={rangeLabel}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PlanResponsibleSelects
            plans={plans}
            selectedPlanId={selectedPlanId}
            onPlanChange={setSelectedPlanId}
            responsibleOptions={responsibleOptions}
            responsibleFilter={responsibleFilter}
            onResponsibleChange={setResponsibleFilter}
          />
          <MonthYearPicker
            label="De"
            periods={periods}
            value={startPeriod}
            disabled={periodsLoading}
            onChange={setSelectedStartPeriodId}
          />
          <MonthYearPicker
            label="Até"
            periods={periods}
            value={endPeriod}
            disabled={periodsLoading}
            onChange={setSelectedEndPeriodId}
          />
        </div>
        <div className="mt-4">
          <ShortcutButtons
            disabled={periodsLoading || periods.length === 0}
            items={presets.map((preset) => ({
              label: preset.label,
              active: startPeriod?.id === preset.start && endPeriod?.id === preset.end,
              onClick: () => setSelectedRange(preset.start, preset.end),
            }))}
          />
        </div>
      </FiltersPanel>

      <section className="app-panel space-y-4 p-4 sm:space-y-5 sm:p-5" aria-label="Totais do período">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="app-eyebrow">Período</p>
            <h3 className="font-serif text-2xl font-semibold text-foreground capitalize sm:text-3xl">
              {rangeLabel}
            </h3>
          </div>
          {loading ? (
            <span className="text-xs text-muted-foreground">Atualizando...</span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatTile
            label="Receitas"
            value={formatCurrency(summary.incomes)}
            tone="positive"
            hint={`Média ${formatCurrency(summary.monthsWithData ? summary.incomes / summary.monthsWithData : 0)}/mês`}
          />
          <StatTile
            label="Despesas"
            value={formatCurrency(summary.expenses)}
            tone="negative"
            hint={`Média ${formatCurrency(summary.monthsWithData ? summary.expenses / summary.monthsWithData : 0)}/mês`}
          />
          <StatTile
            label="Saldo"
            value={formatCurrency(summary.balance)}
            tone={summary.balance < 0 ? "negative" : "positive"}
            hint={
              summary.incomes > 0
                ? `${formatPercent(summary.balance / summary.incomes)} das receitas`
                : "Sem receitas"
            }
          />
          <StatTile
            label="Meses no vermelho"
            value={`${summary.negativeCount} de ${summary.months}`}
            tone={summary.negativeCount > 0 ? "negative" : "neutral"}
            hint={
              summary.worst
                ? `Pior: ${shortMonth(summary.worst.period)} · ${formatCurrency(summary.worst.stats.balance)}`
                : "Nenhum mês negativo"
            }
          />
        </div>

        <div className="rounded-2xl border border-border p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground">Receitas × despesas por mês</h4>
            <ChartLegend />
          </div>
          <div className="mt-3 text-muted-foreground">
            {chartData.length === 0 ? (
              <p className="py-10 text-center text-sm">Nenhum mês no período.</p>
            ) : (
              <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-secondary/60 sm:h-80" />}>
                <EvolutionChart data={chartData} />
              </Suspense>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <CategoryCard items={categories} />
        <SpendingList
          title="Despesas por responsável"
          items={responsibles}
          limit={CATEGORY_LIMIT}
          empty="Nenhuma despesa no período."
          note={responsibleFilter ? undefined : "Faturas de cartão não têm responsável e ficam de fora."}
        />
      </div>

      <MonthTable panels={panels} summary={summary} />
    </div>
  )
}

function StatTile({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string
  tone: "positive" | "negative" | "neutral"
  hint: string
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-secondary/45 px-3 py-2.5 sm:rounded-[1.25rem] sm:p-4">
      <p className="truncate text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase sm:text-[11px] sm:tracking-[0.16em]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-base font-semibold tabular-nums sm:mt-1 sm:text-2xl",
          tone === "positive" && "text-emerald-600 dark:text-emerald-400",
          tone === "negative" && "text-rose-600 dark:text-rose-400",
          tone === "neutral" && "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">{hint}</p>
    </div>
  )
}

function ChartLegend() {
  const items = [
    { label: "Receitas", color: EVOLUTION_COLORS.incomes, shape: "bar" },
    { label: "Despesas", color: EVOLUTION_COLORS.expenses, shape: "bar" },
    { label: "Saldo acumulado", color: EVOLUTION_COLORS.cumulativeBalance, shape: "line" },
  ]
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className={item.shape === "bar" ? "h-2.5 w-2.5 rounded-sm" : "h-0.5 w-3.5 rounded-full"}
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/** Rosca + legenda com valores (a legenda também é a leitura acessível do gráfico). */
function CategoryCard({ items }: { items: SpendingItem[] }) {
  const total = items.reduce((sum, item) => sum + item.total, 0)
  const top = items.slice(0, items.length > DONUT_SLICES + 1 ? DONUT_SLICES : DONUT_SLICES + 1)
  const rest = items.slice(top.length)
  const slices: CategorySlice[] = [
    ...top.map((item, index) => ({
      ...item,
      color: CATEGORY_SLICE_COLORS[index] ?? CATEGORY_OTHER_COLOR,
    })),
    ...(rest.length > 0
      ? [
          {
            id: "__other__",
            label: `Outras (${rest.length})`,
            total: rest.reduce((sum, item) => sum + item.total, 0),
            share: rest.reduce((sum, item) => sum + item.share, 0),
            color: CATEGORY_OTHER_COLOR,
          },
        ]
      : []),
  ]

  return (
    <section className="app-panel p-4 sm:p-5" aria-label="Despesas por categoria">
      <h3 className="app-eyebrow">Despesas por categoria</h3>
      {slices.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma despesa no período.</p>
      ) : (
        <div className="mt-4 grid items-center gap-5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          <Suspense
            fallback={
              <div className="mx-auto aspect-square w-full max-w-[13rem] animate-pulse rounded-full bg-secondary/60" />
            }
          >
            <CategoryDonut slices={slices} total={total} />
          </Suspense>
          <ul className="space-y-2.5">
            {slices.map((slice) => (
              <li key={slice.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-foreground">
                  <span
                    className="h-2.5 w-2.5 shrink-0 self-center rounded-full"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{slice.label}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold text-foreground">{formatCurrency(slice.total)}</span>
                  <span className="ml-2 inline-block w-9 text-right text-xs text-muted-foreground">
                    {formatPercent(slice.share)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Ranking em barras horizontais; o que passa do limite vira "Outras". */
function SpendingList({
  title,
  items,
  limit,
  empty,
  note,
}: {
  title: string
  items: SpendingItem[]
  limit: number
  empty: string
  note?: string
}) {
  const visible =
    items.length > limit
      ? [
          ...items.slice(0, limit - 1),
          items.slice(limit - 1).reduce(
            (other, item) => ({
              ...other,
              total: other.total + item.total,
              share: other.share + item.share,
            }),
            { id: "__other__", label: `Outras (${items.length - limit + 1})`, total: 0, share: 0 }
          ),
        ]
      : items
  const max = Math.max(...visible.map((item) => item.total), 0)

  return (
    <section className="app-panel p-4 sm:p-5" aria-label={title}>
      <h3 className="app-eyebrow">{title}</h3>
      {visible.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((item) => (
            <li key={item.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-foreground">{item.label}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold text-foreground">{formatCurrency(item.total)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatPercent(item.share)}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${max > 0 ? (item.total / max) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {note ? <p className="mt-3 text-[11px] text-muted-foreground">{note}</p> : null}
    </section>
  )
}

function MonthTable({
  panels,
  summary,
}: {
  panels: Array<{ period: Period; stats: { incomes: number; expenses: number; balance: number } }>
  summary: { incomes: number; expenses: number; balance: number }
}) {
  const balanceClass = (value: number) =>
    value < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
  const rate = (incomes: number, balance: number) =>
    incomes > 0 ? formatPercent(balance / incomes) : "--"

  return (
    <section className="app-panel overflow-hidden p-0" aria-label="Mês a mês">
      <div className="flex items-baseline justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
        <h3 className="app-eyebrow">Mês a mês</h3>
        <span className="text-[11px] text-muted-foreground">Valores em R$</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs tabular-nums sm:text-sm">
          <thead>
            <tr className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <th scope="col" className="px-4 py-2 text-left font-semibold sm:px-5">Mês</th>
              <th scope="col" className="px-1.5 py-2 sm:px-2 text-right font-semibold">Receitas</th>
              <th scope="col" className="px-1.5 py-2 sm:px-2 text-right font-semibold">Despesas</th>
              <th scope="col" className="px-1.5 py-2 sm:px-2 text-right font-semibold">Saldo</th>
              <th scope="col" className="hidden py-2 pr-5 pl-2 text-right font-semibold sm:table-cell">
                Poupado
              </th>
            </tr>
          </thead>
          <tbody>
            {panels.map((panel) => (
              <tr key={panel.period.id} className="border-t border-border/60">
                <th scope="row" className="py-2 pr-1 pl-4 text-left font-medium text-foreground capitalize sm:px-5">
                  <span className="sm:hidden">{shortMonth(panel.period)}</span>
                  <span className="hidden sm:inline">{formatMonthYear(panel.period)}</span>
                </th>
                <td className="px-1.5 py-2 sm:px-2 text-right whitespace-nowrap text-foreground">
                  {formatAmount(panel.stats.incomes)}
                </td>
                <td className="px-1.5 py-2 sm:px-2 text-right whitespace-nowrap text-foreground">
                  {formatAmount(panel.stats.expenses)}
                </td>
                <td className={cn("px-1.5 py-2 sm:px-2 text-right font-semibold whitespace-nowrap", balanceClass(panel.stats.balance))}>
                  {formatAmount(panel.stats.balance)}
                </td>
                <td className="hidden py-2 pr-5 pl-2 text-right text-muted-foreground sm:table-cell">
                  {rate(panel.stats.incomes, panel.stats.balance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-secondary/50 font-semibold">
              <th scope="row" className="px-4 py-2 text-left text-foreground sm:px-5">Total</th>
              <td className="px-1.5 py-2 sm:px-2 text-right whitespace-nowrap text-foreground">
                {formatAmount(summary.incomes)}
              </td>
              <td className="px-1.5 py-2 sm:px-2 text-right whitespace-nowrap text-foreground">
                {formatAmount(summary.expenses)}
              </td>
              <td className={cn("px-1.5 py-2 sm:px-2 text-right whitespace-nowrap", balanceClass(summary.balance))}>
                {formatAmount(summary.balance)}
              </td>
              <td className="hidden py-2 pr-5 pl-2 text-right text-muted-foreground sm:table-cell">
                {rate(summary.incomes, summary.balance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
