import type { ReactNode } from "react"
import {
  ArrowRight,
  CreditCard,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import { useMemo, useState } from "react"

import { Card } from "@/components/ui/card.tsx"
import { Select } from "@/components/ui/select.tsx"
import { DashboardCharts } from "@/features/finance/charts.tsx"
import { useDashboard } from "@/features/finance/hooks.ts"
import {
  CategoryManager,
  CreditCardsManager,
  DashboardPlanQuickCreate,
  InvoiceManager,
  PlanPartnerManager,
} from "@/features/finance/managers.tsx"
import { TransactionsWorkspace } from "@/features/finance/transactions-workspace.tsx"
import { formatCurrency, formatMonthYear, toneForBalance } from "@/features/finance/utils.ts"

export function DashboardPage() {
  const {
    plans,
    plansLoading,
    periods,
    periodsLoading,
    selectedPlanId,
    activePlan,
    selectedPeriodIds,
    setSelectedPlanId,
    togglePeriodId,
    periodPanels,
    combinedStats,
    categorySpending,
    creditCards,
    transactionCategories,
    responsibleOptions,
    userId,
    allTransactions,
    variation,
    comparisonData,
    buildCategoryChartData,
  } = useDashboard()
  const [responsibleFilter, setResponsibleFilter] = useState("")

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
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0)
      const expenses = transactions
        .filter((transaction) => transaction.type === "EXPENSE" && !transaction.isClearedByInvoice)
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0)

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

  if (plansLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center">Carregando dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <section className="app-panel">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem_22rem]">
          <div>
            <label className="app-label">Plano financeiro</label>
            <Select
              className="mt-2"
              value={selectedPlanId || ""}
              onChange={(event) => setSelectedPlanId(event.target.value)}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="app-label">Responsavel</label>
            <Select
              className="mt-2"
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
            onSelectPlanId={setSelectedPlanId}
            userId={userId}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {periodsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando periodos...</p>
          ) : (
            periods.map((period) => {
              const selected = selectedPeriodIds.includes(period.id)
              return (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => togglePeriodId(period.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selected
                      ? "border-primary/20 bg-primary text-primary-foreground shadow-[0_12px_30px_rgba(37,99,235,0.24)]"
                      : "border-border bg-secondary/70 text-foreground hover:border-primary/40 hover:bg-accent/70"
                  }`}
                >
                  {formatMonthYear(period)}
                </button>
              )
            })
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Receitas"
          value={formatCurrency(responsibleFilter ? filteredMetrics.incomes : combinedStats.incomes)}
          tone="positive"
          icon={<TrendingUp size={18} />}
        />
        <MetricCard
          title="Despesas"
          value={formatCurrency(responsibleFilter ? filteredMetrics.expenses : combinedStats.expenses)}
          tone="negative"
          icon={<TrendingDown size={18} />}
        />
        <MetricCard
          title="Saldo"
          value={formatCurrency(responsibleFilter ? filteredMetrics.balance : combinedStats.balance)}
          tone={toneForBalance(responsibleFilter ? filteredMetrics.balance : combinedStats.balance)}
          icon={<ArrowRight size={18} />}
        />
        <MetricCard
          title="Variacao"
          value={variation === null ? "--" : `${variation.toFixed(1)}%`}
          tone={variation !== null && variation < 0 ? "negative" : "positive"}
          icon={<Sparkles size={18} />}
        />
      </section>

      <section className="space-y-5">
        <div>
          <h3 className="font-serif text-3xl font-semibold text-foreground">Transacoes</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Paineis de transacoes, faturas e manutencao estrutural do dashboard.
          </p>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-5">
            {filteredPanels.map((panel) => (
              <div key={panel.period.id} className="min-w-[50rem] flex-1">
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

            {periods.length > 0 && filteredPanels.length === 0 ? (
              <div className="flex min-w-[22rem] items-center rounded-[1.75rem] border border-dashed border-border bg-secondary/60 px-6 py-10 text-sm text-muted-foreground">
                Selecione ao menos um periodo para ativar o workspace.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <CategoryManager categories={transactionCategories} />

        <section className="app-panel">
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="app-eyebrow">Cartoes</p>
                  <h3 className="font-serif text-2xl font-semibold text-foreground">
                    Cartoes e faturas
                  </h3>
                </div>
                <div className="rounded-full bg-primary/12 p-3 text-primary">
                  <CreditCard size={18} />
                </div>
              </div>
              <CreditCardsManager creditCards={creditCards} userId={userId} />
            </div>

            <div>
              <div className="mb-4">
                <p className="app-eyebrow">Faturas</p>
                <h3 className="font-serif text-2xl font-semibold text-foreground">
                  Registro integrado
                </h3>
              </div>
              <InvoiceManager
                creditCards={creditCards}
                periods={periods}
                selectedPeriodIds={selectedPeriodIds}
              />
            </div>
          </div>
        </section>
      </div>

      <DashboardCharts comparisonData={comparisonData} categoryData={categoryData} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <section className="app-panel">
          <PlanPartnerManager activePlan={activePlan} />
        </section>

        <section className="app-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-eyebrow">Contexto do plano</p>
              <h3 className="font-serif text-2xl font-semibold text-foreground">
                Leitura rapida
              </h3>
            </div>
            <div className="rounded-full bg-primary/12 p-3 text-primary">
              <Users size={18} />
            </div>
          </div>
          <dl className="mt-6 space-y-4">
            <InfoRow label="Plano ativo" value={activePlan?.name || "Sem plano"} />
            <InfoRow label="Periodos disponiveis" value={String(periods.length)} />
            <InfoRow label="Cartoes cadastrados" value={String(creditCards.length)} />
            <InfoRow label="Lancamentos visiveis" value={String(allTransactions.length)} />
          </dl>
        </section>
      </section>
    </div>
  )
}

function MetricCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string
  value: string
  tone: "positive" | "negative" | "REVENUE" | "EXPENSE" | "NEUTRAL"
  icon: ReactNode
}) {
  const normalizedTone =
    tone === "negative" || tone === "EXPENSE"
      ? "negative"
      : tone === "positive" || tone === "REVENUE"
        ? "positive"
        : "neutral"

  const classes =
    normalizedTone === "positive"
      ? { value: "text-emerald-500 dark:text-emerald-400", icon: "bg-emerald-500/12 text-emerald-500 dark:text-emerald-400" }
      : normalizedTone === "negative"
        ? { value: "text-rose-500 dark:text-rose-400", icon: "bg-rose-500/12 text-rose-500 dark:text-rose-400" }
        : { value: "text-foreground", icon: "bg-primary/12 text-primary" }

  return (
    <Card className="app-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="app-eyebrow">{title}</p>
          <p className={`mt-2 text-2xl font-semibold ${classes.value}`}>{value}</p>
        </div>
        <div className={`rounded-full p-3 ${classes.icon}`}>{icon}</div>
      </div>
    </Card>
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
