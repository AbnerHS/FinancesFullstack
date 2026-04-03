import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import { useLayoutEffect, useMemo, useRef, useState } from "react"

import { Select } from "@/components/ui/select.tsx"
import { DashboardCharts } from "@/features/finance/charts.tsx"
import { useDashboard } from "@/features/finance/hooks.ts"
import { DashboardPlanQuickCreate } from "@/features/finance/managers.tsx"
import { TransactionsWorkspace } from "@/features/finance/transactions-workspace.tsx"
import {
  formatCurrency,
  formatMonthLabel,
  formatMonthYear,
  toneForBalance,
} from "@/features/finance/utils.ts"
import MetricCard from "@/features/finance/metric-card"

const isDefinedPanel = (
  panel: HTMLDivElement | null
): panel is HTMLDivElement => panel !== null

export function DashboardPage() {
  const {
    plans,
    plansLoading,
    periods,
    periodsLoading,
    selectedPlanId,
    activePlan,
    selectedPeriodIds,
    selectedStartPeriodId,
    selectedEndPeriodId,
    setSelectedPlanId,
    setSelectedStartPeriodId,
    setSelectedEndPeriodId,
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
  const transactionsScrollerRef = useRef<HTMLDivElement | null>(null)
  const transactionPanelRefs = useRef<Array<HTMLDivElement | null>>([])
  const [transactionsEdgeSpacing, setTransactionsEdgeSpacing] = useState(0)

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
          acc.transactionCount += panel.transactions.length
          return acc
        },
        { incomes: 0, expenses: 0, balance: 0, transactionCount: 0 }
      ),
    [filteredPanels]
  )

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
  const availableYears = useMemo(
    () =>
      [...new Set(periods.map((period) => period.year))].sort(
        (left, right) => left - right
      ),
    [periods]
  )
  const startMonthOptions = useMemo(
    () =>
      selectedStartPeriod
        ? periods
            .filter((period) => period.year === selectedStartPeriod.year)
            .map((period) => ({ id: period.id, month: period.month }))
        : [],
    [periods, selectedStartPeriod]
  )
  const endMonthOptions = useMemo(
    () =>
      selectedEndPeriod
        ? periods
            .filter((period) => period.year === selectedEndPeriod.year)
            .map((period) => ({ id: period.id, month: period.month }))
        : [],
    [periods, selectedEndPeriod]
  )

  const selectPeriodForYear = (
    year: number,
    currentPeriodId: string | null,
    fallbackPeriodId: string | null,
    setter: (periodId: string) => void
  ) => {
    const yearPeriods = periods.filter((period) => period.year === year)
    if (yearPeriods.length === 0) {
      return
    }

    const currentPeriod =
      periods.find((period) => period.id === currentPeriodId) ||
      periods.find((period) => period.id === fallbackPeriodId) ||
      null
    const preferredMonth = currentPeriod?.month ?? yearPeriods[0]?.month
    const nextPeriod =
      yearPeriods.find((period) => period.month === preferredMonth) ||
      yearPeriods[0]

    if (nextPeriod) {
      setter(nextPeriod.id)
    }
  }

  const selectPeriodForMonth = (
    month: number,
    currentYear: number | null,
    setter: (periodId: string) => void
  ) => {
    if (!currentYear) {
      return
    }

    const nextPeriod = periods.find(
      (period) => period.year === currentYear && period.month === month
    )

    if (nextPeriod) {
      setter(nextPeriod.id)
    }
  }

  useLayoutEffect(() => {
    transactionPanelRefs.current = transactionPanelRefs.current.slice(
      0,
      filteredPanels.length
    )

    const updateSpacing = () => {
      const container = transactionsScrollerRef.current
      const firstPanel = transactionPanelRefs.current[0]

      if (!container || !firstPanel) {
        setTransactionsEdgeSpacing(0)
        return
      }

      setTransactionsEdgeSpacing(
        Math.max((container.clientWidth - firstPanel.clientWidth) / 2, 0)
      )
    }

    updateSpacing()
    window.addEventListener("resize", updateSpacing)

    return () => {
      window.removeEventListener("resize", updateSpacing)
    }
  }, [filteredPanels.length])

  const scrollTransactions = (direction: "previous" | "next") => {
    const container = transactionsScrollerRef.current
    const panels = transactionPanelRefs.current.filter(isDefinedPanel)
    if (!container || panels.length === 0) {
      return
    }

    const currentCenter = container.scrollLeft + container.clientWidth / 2
    const currentIndex = panels.reduce((closestIndex, panel, index) => {
      const panelCenter = panel.offsetLeft + panel.clientWidth / 2
      const closestPanel = panels[closestIndex]
      const closestCenter =
        closestPanel.offsetLeft + closestPanel.clientWidth / 2

      return Math.abs(panelCenter - currentCenter) <
        Math.abs(closestCenter - currentCenter)
        ? index
        : closestIndex
    }, 0)

    const targetIndex =
      direction === "next"
        ? Math.min(currentIndex + 1, panels.length - 1)
        : Math.max(currentIndex - 1, 0)

    const targetPanel = panels[targetIndex]
    const containerRect = container.getBoundingClientRect()
    const targetPanelRect = targetPanel.getBoundingClientRect()
    const left =
      container.scrollLeft +
      (targetPanelRect.left - containerRect.left) -
      (container.clientWidth - targetPanel.clientWidth) / 2

    container.scrollTo({
      left,
      behavior: "smooth",
    })
  }

  const selectedPeriodsLabel =
    selectedPeriodIds.length === 0
      ? "Nenhum mês disponível"
      : selectedPeriodIds.length === 1
        ? "1 mês no intervalo"
        : `${selectedPeriodIds.length} meses no intervalo`

  if (plansLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        Carregando dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="app-panel">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem_22rem]">
          <div>
            <label className="app-label">Plano financeiro</label>
            <Select
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
            <label className="app-label">Responsável</label>
            <Select
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

          <DashboardPlanQuickCreate
            activePlan={activePlan}
            hasPlans={plans.length > 0}
            onSelectPlanId={setSelectedPlanId}
            userId={userId}
          />
        </div>

        {plans.length === 0 ? (
          <div className="mt-5 rounded-[1.5rem] border border-dashed border-border bg-secondary/50 px-5 py-4">
            <p className="font-semibold text-foreground">
              Seu dashboard começa por um plano financeiro.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie seu primeiro plano para liberar períodos, transações,
              categorias e cartões.
            </p>
          </div>
        ) : null}

        <div className="mt-5 rounded-[1.5rem] border border-border bg-secondary/35 p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_18rem]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="app-label">Ano inicial</label>
                  <Select
                    className="mt-2"
                    disabled={periodsLoading || availableYears.length === 0}
                    value={
                      selectedStartPeriod?.year
                        ? String(selectedStartPeriod.year)
                        : ""
                    }
                    onChange={(event) =>
                      selectPeriodForYear(
                        Number(event.target.value),
                        selectedStartPeriodId,
                        selectedEndPeriodId,
                        setSelectedStartPeriodId
                      )
                    }
                  >
                    {availableYears.length === 0 ? (
                      <option value="">Sem períodos</option>
                    ) : null}
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="app-label">Mês inicial</label>
                  <Select
                    className="mt-2"
                    disabled={periodsLoading || startMonthOptions.length === 0}
                    value={
                      selectedStartPeriod?.month
                        ? String(selectedStartPeriod.month)
                        : ""
                    }
                    onChange={(event) =>
                      selectPeriodForMonth(
                        Number(event.target.value),
                        selectedStartPeriod?.year ?? null,
                        setSelectedStartPeriodId
                      )
                    }
                  >
                    {startMonthOptions.length === 0 ? (
                      <option value="">Sem meses</option>
                    ) : null}
                    {startMonthOptions.map((option) => (
                      <option key={option.id} value={option.month}>
                        {formatMonthLabel(option.month)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="app-label">Ano final</label>
                  <Select
                    className="mt-2"
                    disabled={periodsLoading || availableYears.length === 0}
                    value={
                      selectedEndPeriod?.year
                        ? String(selectedEndPeriod.year)
                        : ""
                    }
                    onChange={(event) =>
                      selectPeriodForYear(
                        Number(event.target.value),
                        selectedEndPeriodId,
                        selectedStartPeriodId,
                        setSelectedEndPeriodId
                      )
                    }
                  >
                    {availableYears.length === 0 ? (
                      <option value="">Sem períodos</option>
                    ) : null}
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="app-label">Mês final</label>
                  <Select
                    className="mt-2"
                    disabled={periodsLoading || endMonthOptions.length === 0}
                    value={
                      selectedEndPeriod?.month
                        ? String(selectedEndPeriod.month)
                        : ""
                    }
                    onChange={(event) =>
                      selectPeriodForMonth(
                        Number(event.target.value),
                        selectedEndPeriod?.year ?? null,
                        setSelectedEndPeriodId
                      )
                    }
                  >
                    {endMonthOptions.length === 0 ? (
                      <option value="">Sem meses</option>
                    ) : null}
                    {endMonthOptions.map((option) => (
                      <option key={option.id} value={option.month}>
                        {formatMonthLabel(option.month)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-border bg-card/80 px-4 py-1">
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {periodsLoading
                    ? "Carregando períodos..."
                    : selectedPeriodsLabel}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  O workspace acompanha todos os meses entre{" "}
                  {formatMonthYear(selectedStartPeriod) || "--"} e{" "}
                  {formatMonthYear(selectedEndPeriod) || "--"}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedPeriodIds.length > 1 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Receitas"
            value={formatCurrency(
              responsibleFilter
                ? filteredMetrics.incomes
                : combinedStats.incomes
            )}
            tone="positive"
            icon={<TrendingUp size={18} />}
          />
          <MetricCard
            title="Despesas"
            value={formatCurrency(
              responsibleFilter
                ? filteredMetrics.expenses
                : combinedStats.expenses
            )}
            tone="negative"
            icon={<TrendingDown size={18} />}
          />
          <MetricCard
            title="Saldo"
            value={formatCurrency(
              responsibleFilter
                ? filteredMetrics.balance
                : combinedStats.balance
            )}
            tone={toneForBalance(
              responsibleFilter
                ? filteredMetrics.balance
                : combinedStats.balance
            )}
            icon={<ArrowRight size={18} />}
          />
          <MetricCard
            title="Variação"
            value={variation === null ? "--" : `${variation.toFixed(1)}%`}
            tone={variation !== null && variation < 0 ? "negative" : "positive"}
            icon={<Sparkles size={18} />}
          />
        </section>
      )}

      <section className="space-y-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-3xl font-semibold text-foreground">
                Transações
              </h3>
              <p className="mt-2 hidden text-sm text-muted-foreground xl:block">
                Painéis de transações, faturas e manutenção estrutural do
                dashboard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/85 text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => scrollTransactions("previous")}
                disabled={filteredPanels.length <= 1}
                aria-label="Ir para o mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/85 text-foreground transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => scrollTransactions("next")}
                disabled={filteredPanels.length <= 1}
                aria-label="Ir para o próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <div
              ref={transactionsScrollerRef}
              className="-mx-4 overflow-hidden px-4 pb-4 sm:mx-0 sm:px-0"
            >
              <div className="flex snap-x snap-mandatory gap-5">
                {filteredPanels.map((panel, index) => (
                  <div
                    key={panel.period.id}
                    ref={(element) => {
                      transactionPanelRefs.current[index] = element
                    }}
                    className="w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)] snap-center sm:w-[min(50rem,calc(100vw-3rem))] sm:min-w-[min(50rem,calc(100vw-3rem))] xl:min-w-[50rem] xl:flex-1"
                  >
                    <TransactionsWorkspace
                      panel={panel}
                      shared={{
                        creditCards,
                        periods,
                        transactionCategories,
                        responsibleOptions,
                      }}
                    />
                  </div>
                ))}
                <div
                  aria-hidden="true"
                  className="shrink-0"
                  style={{ width: `${transactionsEdgeSpacing}px` }}
                />

                {periods.length > 0 && filteredPanels.length === 0 ? (
                  <div className="flex w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)] items-center rounded-[1.75rem] border border-dashed border-border bg-secondary/60 px-6 py-10 text-sm text-muted-foreground sm:w-[min(28rem,calc(100vw-3rem))] sm:min-w-[min(28rem,calc(100vw-3rem))] xl:min-w-[22rem]">
                    Selecione ao menos um período para ativar o workspace.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <DashboardCharts
        comparisonData={comparisonData}
        categoryData={categoryData}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)]">
        <section className="app-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-eyebrow">Contexto do plano</p>
              <h3 className="font-serif text-2xl font-semibold text-foreground">
                Leitura Rápida
              </h3>
            </div>
            <div className="rounded-full bg-primary/12 p-3 text-primary">
              <Users size={18} />
            </div>
          </div>
          <dl className="mt-6 space-y-4">
            <InfoRow
              label="Plano ativo"
              value={activePlan?.name || "Sem plano"}
            />
            <InfoRow
              label="Períodos disponíveis"
              value={String(periods.length)}
            />
            <InfoRow
              label="Cartões cadastrados"
              value={String(creditCards.length)}
            />
            <InfoRow
              label="Lançamentos visíveis"
              value={String(allTransactions.length)}
            />
            <InfoRow
              label="Participantes"
              value={String(participants.length)}
            />
          </dl>
        </section>
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-border bg-secondary/60 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  )
}
