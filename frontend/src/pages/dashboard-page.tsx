import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { lazy, Suspense, useCallback, useMemo, useState } from "react"

import { Select } from "@/components/ui/select.tsx"
import { useDashboard } from "@/features/finance/hooks.ts"
import { DashboardPlanQuickCreate } from "@/features/finance/managers.tsx"
import { MonthCarousel } from "@/features/finance/month-carousel.tsx"
import { MonthSummary } from "@/features/finance/month-summary.tsx"
import { TransactionsWorkspace } from "@/features/finance/transactions-workspace.tsx"
import type { Period } from "@/features/finance/types.ts"
import {
  formatCurrency,
  formatMonthLabel,
  formatMonthYear,
  toMonthId,
  toneForBalance,
} from "@/features/finance/utils.ts"
import MetricCard from "@/features/finance/metric-card"
import { cn } from "@/lib/utils"

// Gráficos (recharts) só são baixados e montados quando o usuário pede para exibi-los.
const DashboardCharts = lazy(() =>
  import("@/features/finance/charts.tsx").then((module) => ({ default: module.DashboardCharts }))
)
const CHARTS_OPEN_KEY = "dashboard-charts-open"

function readChartsOpen() {
  try {
    return localStorage.getItem(CHARTS_OPEN_KEY) === "1"
  } catch {
    return false
  }
}

export function DashboardPage() {
  const {
    plans,
    plansLoading,
    periods,
    monthSummaries,
    periodsLoading,
    selectedPlanId,
    activePlan,
    selectedPeriodIds,
    selectedStartPeriodId,
    selectedEndPeriodId,
    setSelectedPlanId,
    setSelectedStartPeriodId,
    setSelectedEndPeriodId,
    setSelectedRange,
    periodPanels,
    combinedStats,
    categorySpending,
    creditCards,
    transactionCategories,
    responsibleOptions,
    participants,
    userId,
    allTransactions,
    variation,
    comparisonData,
    buildCategoryChartData,
  } = useDashboard()
  const [responsibleFilter, setResponsibleFilter] = useState("")
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [chartsOpen, setChartsOpen] = useState(readChartsOpen)
  const toggleCharts = () => {
    const next = !chartsOpen
    setChartsOpen(next)
    try {
      localStorage.setItem(CHARTS_OPEN_KEY, next ? "1" : "0")
    } catch {
      // Preferência só da sessão quando o armazenamento não está disponível.
    }
  }

  // Referências estáveis: com elas os painéis (memo) não re-renderizam quando só o mês ativo muda.
  const workspaceShared = useMemo(
    () => ({ creditCards, transactionCategories, responsibleOptions }),
    [creditCards, transactionCategories, responsibleOptions]
  )
  const renderPanel = useCallback(
    (panel: (typeof periodPanels)[number]) => (
      <TransactionsWorkspace panel={panel} shared={workspaceShared} />
    ),
    [workspaceShared]
  )

  const filteredPanels = useMemo(() => {
    if (!responsibleFilter) {
      return periodPanels
    }

    return periodPanels.map((panel) => {
      const transactions = panel.transactions.filter(
        (transaction) => transaction.responsibleUserId === responsibleFilter
      )
      const incomes = transactions
        .filter((transaction) => transaction.type === "REVENUE")
        .reduce(
          (total, transaction) => total + Number(transaction.amount || 0),
          0
        )
      const expenses = transactions
        .filter(
          (transaction) =>
            transaction.type === "EXPENSE" && !transaction.isClearedByInvoice
        )
        .reduce(
          (total, transaction) => total + Number(transaction.amount || 0),
          0
        )

      return {
        ...panel,
        transactions,
        stats: {
          incomes,
          expenses,
          balance: incomes - expenses,
        },
      }
    })
  }, [periodPanels, responsibleFilter])

  const filteredMetrics = useMemo(
    () =>
      filteredPanels.reduce(
        (acc, panel) => {
          acc.incomes += panel.stats.incomes
          acc.expenses += panel.stats.expenses
          acc.balance += panel.stats.balance
          return acc
        },
        { incomes: 0, expenses: 0, balance: 0 }
      ),
    [filteredPanels]
  )

  const activePanel =
    filteredPanels.find((panel) => panel.period.id === activeMonthId) ??
    filteredPanels[0] ??
    null

  const categoryData = responsibleFilter
    ? buildCategoryChartData(responsibleFilter)
    : categorySpending
  const selectedStartPeriod = useMemo(
    () => periods.find((period) => period.id === selectedStartPeriodId) || null,
    [periods, selectedStartPeriodId]
  )
  const selectedEndPeriod = useMemo(
    () => periods.find((period) => period.id === selectedEndPeriodId) || null,
    [periods, selectedEndPeriodId]
  )

  const rangeLabel =
    selectedStartPeriod && selectedEndPeriod
      ? selectedStartPeriod.id === selectedEndPeriod.id
        ? formatMonthYear(selectedStartPeriod)
        : `${formatMonthYear(selectedStartPeriod)} – ${formatMonthYear(selectedEndPeriod)}`
      : "Sem meses"

  const metrics = responsibleFilter ? filteredMetrics : combinedStats

  if (plansLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        Carregando dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <section className="app-panel">
        {/* Mobile: filtros recolhidos num resumo clicável. */}
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left lg:hidden"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="dashboard-filters"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="rounded-full bg-primary/12 p-2.5 text-primary">
              <SlidersHorizontal size={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {activePlan?.name || "Sem plano"}
              </span>
              <span className="block truncate text-xs text-muted-foreground capitalize">
                {periodsLoading ? "Carregando meses..." : rangeLabel}
              </span>
            </span>
          </span>
          <ChevronDown
            size={18}
            className={cn(
              "shrink-0 text-muted-foreground transition",
              filtersOpen && "rotate-180"
            )}
          />
        </button>

        <div
          id="dashboard-filters"
          className={cn("mt-4 space-y-4 lg:mt-0 lg:block", !filtersOpen && "hidden")}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_18rem_22rem]">
            <div>
              <label className="app-label" htmlFor="dashboard-plan">
                Plano financeiro
              </label>
              <Select
                id="dashboard-plan"
                className="mt-2"
                disabled={plans.length === 0}
                value={selectedPlanId || ""}
                onChange={(event) => setSelectedPlanId(event.target.value)}
              >
                {plans.length === 0 ? (
                  <option value="">Nenhum plano ainda</option>
                ) : null}
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="app-label" htmlFor="dashboard-responsible">
                Responsável
              </label>
              <Select
                id="dashboard-responsible"
                className="mt-2"
                disabled={responsibleOptions.length === 0}
                value={responsibleFilter}
                onChange={(event) => setResponsibleFilter(event.target.value)}
              >
                <option value="">Todos os participantes</option>
                {responsibleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2 xl:col-span-1">
              <DashboardPlanQuickCreate
                activePlan={activePlan}
                hasPlans={plans.length > 0}
                onSelectPlanId={setSelectedPlanId}
                userId={userId}
              />
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-secondary/50 px-5 py-4">
              <p className="font-semibold text-foreground">
                Seu dashboard começa por um plano financeiro.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie seu primeiro plano para liberar meses, transações,
                categorias e cartões.
              </p>
            </div>
          ) : null}

          <div className="rounded-[1.5rem] border border-border bg-secondary/35 p-3 sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="grid gap-3 sm:grid-cols-2">
                <MonthYearPicker
                  label="De"
                  periods={periods}
                  value={selectedStartPeriod}
                  disabled={periodsLoading}
                  onChange={setSelectedStartPeriodId}
                />
                <MonthYearPicker
                  label="Até"
                  periods={periods}
                  value={selectedEndPeriod}
                  disabled={periodsLoading}
                  onChange={setSelectedEndPeriodId}
                />
              </div>

              <RangePresets
                periods={periods}
                disabled={periodsLoading || periods.length === 0}
                onSelect={setSelectedRange}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {selectedPeriodIds.length === 0
                ? "Nenhum mês no intervalo."
                : `${selectedPeriodIds.length} ${selectedPeriodIds.length === 1 ? "mês" : "meses"} no intervalo: `}
              {selectedPeriodIds.length > 0 ? (
                <span className="font-medium text-foreground capitalize">
                  {rangeLabel}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <MonthSummary
        panel={activePanel}
        periods={periods}
        responsibleOptions={responsibleOptions}
        responsibleFilter={responsibleFilter}
      />

      {selectedPeriodIds.length > 1 && (
        <section aria-label="Totais do intervalo">
          <p className="app-eyebrow mb-3">Totais do intervalo</p>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard
              title="Receitas"
              value={formatCurrency(metrics.incomes)}
              tone="positive"
              icon={<TrendingUp size={18} />}
              size="sm"
            />
            <MetricCard
              title="Despesas"
              value={formatCurrency(metrics.expenses)}
              tone="negative"
              icon={<TrendingDown size={18} />}
              size="sm"
            />
            <MetricCard
              title="Saldo"
              value={formatCurrency(metrics.balance)}
              tone={toneForBalance(metrics.balance)}
              icon={<ArrowRight size={18} />}
              size="sm"
            />
            <MetricCard
              title="Saldo vs. 1º mês"
              value={variation === null ? "--" : `${variation.toFixed(1)}%`}
              tone={variation !== null && variation < 0 ? "negative" : "positive"}
              icon={<Sparkles size={18} />}
              size="sm"
            />
          </div>
        </section>
      )}

      <section className="space-y-4" aria-label="Transações por mês">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
            Transações
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deslize entre os meses ou use as setas. Arraste pela alça para
            reordenar as transações.
          </p>
        </div>

        {periods.length > 0 && filteredPanels.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-border bg-secondary/60 px-6 py-10 text-sm text-muted-foreground">
            Selecione ao menos um mês para ativar o workspace.
          </div>
        ) : (
          <MonthCarousel
            panels={filteredPanels}
            activeId={activeMonthId}
            onActiveIdChange={setActiveMonthId}
            renderPanel={renderPanel}
          />
        )}
      </section>

      <section className="space-y-4" aria-label="Gráficos">
        <button
          type="button"
          onClick={toggleCharts}
          aria-expanded={chartsOpen}
          className="flex w-full items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-card/80 px-5 py-4 text-left transition hover:border-primary/40"
        >
          <span className="flex items-center gap-3">
            <BarChart3 size={18} className="text-primary" />
            <span>
              <span className="block text-sm font-semibold text-foreground">Gráficos</span>
              <span className="block text-xs text-muted-foreground">
                Comparativo dos meses e despesas por categoria
              </span>
            </span>
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            {chartsOpen ? "Ocultar" : "Exibir"}
            <ChevronDown size={16} className={cn("transition", chartsOpen && "rotate-180")} />
          </span>
        </button>

        {chartsOpen ? (
          <Suspense
            fallback={
              <div className="h-64 animate-pulse rounded-[1.75rem] border border-border bg-secondary/60" />
            }
          >
            <DashboardCharts comparisonData={comparisonData} categoryData={categoryData} />
          </Suspense>
        ) : null}
      </section>

      <section className="app-panel" aria-label="Leitura rápida do plano">
        <p className="app-eyebrow">Contexto do plano</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <InfoTile label="Plano ativo" value={activePlan?.name || "Sem plano"} />
          <InfoTile
            label="Meses com lançamentos"
            value={String(monthSummaries.length)}
          />
          <InfoTile
            label="Cartões cadastrados"
            value={String(creditCards.length)}
          />
          <InfoTile
            label="Lançamentos visíveis"
            value={String(allTransactions.length)}
          />
          <InfoTile label="Participantes" value={String(participants.length)} />
        </dl>
      </section>
    </div>
  )
}

/** Mês + ano lado a lado; trocar o ano mantém o mês escolhido quando ele existe. */
function MonthYearPicker({
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
          onChange={(event) =>
            value && select(value.year, Number(event.target.value))
          }
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
          onChange={(event) =>
            select(Number(event.target.value), value?.month ?? 1)
          }
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

/** Atalhos de intervalo relativos ao mês atual. */
function RangePresets({
  periods,
  disabled,
  onSelect,
}: {
  periods: Period[]
  disabled: boolean
  onSelect: (startPeriodId: string, endPeriodId: string) => void
}) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const current = toMonthId(year, month)
  const threeMonthsAgo = new Date(year, month - 3, 1)
  const presets = [
    { label: "Mês atual", start: current, end: current },
    {
      label: "Últimos 3 meses",
      start: toMonthId(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth() + 1),
      end: current,
    },
    { label: "Este ano", start: toMonthId(year, 1), end: toMonthId(year, 12) },
  ].filter((preset) =>
    periods.some((period) => period.id === preset.start) &&
    periods.some((period) => period.id === preset.end)
  )

  return (
    <div className="flex flex-wrap gap-2" aria-label="Atalhos de período">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(preset.start, preset.end)}
          className="h-10 rounded-full border border-border bg-card/85 px-4 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-secondary/60 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </dd>
    </div>
  )
}
