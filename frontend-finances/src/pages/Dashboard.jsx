import { useMemo, useState } from "react";
import {
  ArrowRight,
  CreditCard,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { CategoryManager } from "../components/dashboard/CategoryManager";
import { CreditCardsManager } from "../components/dashboard/CreditCardsManager";
import { InvoiceManager } from "../components/dashboard/InvoiceManager";
import { PlanPartnerManager } from "../components/dashboard/PlanPartnerManager";
import { TransactionsPanel } from "../components/dashboard/TransactionsPanel";
import DashboardChartsSection from "../components/dashboard/charts/DashboardChartsSection";
import { useDashboard } from "../hooks/useDashboard";
import { formatCurrency, formatMonthYear } from "../utils/dashboard";
import {
  buildCategoryChartData,
  buildComparisonChartData,
  computeVariation,
} from "../utils/dashboardChartData";

const Dashboard = () => {
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
    allEntries,
    categorySpending,
    creditCards,
    transactionCategories,
    responsibleOptions,
    userId,
  } = useDashboard();
  const [responsibleFilter, setResponsibleFilter] = useState("");

  const filteredPanels = useMemo(() => {
    if (!responsibleFilter) {
      return periodPanels;
    }

    return periodPanels.map((panel) => {
      const transactions = panel.transactions.filter(
        (transaction) => transaction.responsibleUserId === responsibleFilter
      );

      const entries = panel.entries.filter(
        (entry) =>
          entry.kind === "TRANSACTION" && entry.responsibleUserId === responsibleFilter
      );

      const incomes = transactions
        .filter((transaction) => transaction.type === "REVENUE")
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
      const expenses = transactions
        .filter((transaction) => transaction.type === "EXPENSE" && !transaction.isClearedByInvoice)
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);

      return {
        ...panel,
        entries,
        transactions,
        stats: {
          incomes,
          expenses,
          balance: incomes - expenses,
        },
      };
    });
  }, [periodPanels, responsibleFilter]);

  const metrics = useMemo(
    () =>
      filteredPanels.reduce(
        (acc, panel) => {
          acc.incomes += panel.stats.incomes;
          acc.expenses += panel.stats.expenses;
          acc.balance += panel.stats.balance;
          acc.transactionCount += panel.transactions.length;
          acc.invoiceCount += panel.invoices.length;
          return acc;
        },
        {
          incomes: 0,
          expenses: 0,
          balance: 0,
          transactionCount: 0,
          invoiceCount: 0,
        }
      ),
    [filteredPanels]
  );

  const comparisonData = useMemo(
    () => buildComparisonChartData(filteredPanels),
    [filteredPanels]
  );

  const categoryData = useMemo(
    () =>
      buildCategoryChartData({
        categorySpending,
        filteredPanels,
        responsibleFilter,
      }),
    [categorySpending, filteredPanels, responsibleFilter]
  );

  const variation = useMemo(() => computeVariation(comparisonData), [comparisonData]);
  const selectedPeriodsLabel = useMemo(() => {
    if (selectedPeriodIds.length === 0) {
      return "Nenhum periodo selecionado";
    }
    if (selectedPeriodIds.length === 1) {
      return "1 periodo em foco";
    }
    return `${selectedPeriodIds.length} periodos comparados`;
  }, [selectedPeriodIds.length]);

  if (plansLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--color-muted)]">
        Carregando dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="app-panel">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem_18rem]">
          <div>
            <label className="app-label">Plano financeiro</label>
            <select
              className="mt-2 app-input"
              value={selectedPlanId || ""}
              onChange={(event) => setSelectedPlanId(event.target.value)}
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="app-label">Responsavel</label>
            <select
              className="mt-2 app-input"
              value={responsibleFilter}
              onChange={(event) => setResponsibleFilter(event.target.value)}
            >
              <option value="">Todos os participantes</option>
              {responsibleOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] px-4 py-4">
            <p className="app-label">Comparacao ativa</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-ink-strong)]">
              {selectedPeriodsLabel}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Selecione e compare quantos periodos precisar.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {periodsLoading && (
            <p className="text-sm text-[var(--color-muted)]">Carregando periodos...</p>
          )}
          {!periodsLoading &&
            periods.map((period) => {
              const selected = selectedPeriodIds.includes(period.id);
              return (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => togglePeriodId(period.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selected
                      ? "border-[var(--color-accent-strong)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]"
                      : "border-[var(--color-line)] bg-[var(--color-panel-soft)] text-[var(--color-ink)]"
                  }`}
                >
                  {formatMonthYear(period)}
                </button>
              );
            })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Receitas"
          value={formatCurrency(responsibleFilter ? metrics.incomes : combinedStats.incomes)}
          tone="positive"
          icon={<TrendingUp size={18} />}
        />
        <MetricCard
          title="Despesas"
          value={formatCurrency(responsibleFilter ? metrics.expenses : combinedStats.expenses)}
          tone="negative"
          icon={<TrendingDown size={18} />}
        />
        <MetricCard
          title="Saldo"
          value={formatCurrency(responsibleFilter ? metrics.balance : combinedStats.balance)}
          tone={
            (responsibleFilter ? metrics.balance : combinedStats.balance) >= 0
              ? "positive"
              : "negative"
          }
          icon={<ArrowRight size={18} />}
        />
        <MetricCard
          title="Variacao"
          value={variation === null ? "--" : `${variation.toFixed(1)}%`}
          tone={variation >= 0 ? "positive" : "negative"}
          icon={<Sparkles size={18} />}
        />
      </section>

      <section id="workspace-transactions" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-serif text-3xl font-semibold text-[var(--color-ink-strong)]">
              Transacoes
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Aqui ficam os paineis de transacoes, faturas e manutencao estrutural do dashboard.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-5">
            {periodPanels.map((panel) => (
              <div
                key={panel.period.id}
                className="min-w-[45rem] flex-1 rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[0_18px_42px_rgba(22,61,77,0.08)]"
              >
                <TransactionsPanel
                  panel={{
                    period: panel.period,
                    entries: panel.entries,
                    transactionsLoading: panel.transactionsLoading,
                    invoicesLoading: panel.invoicesLoading,
                  }}
                  shared={{
                    userId,
                    periods,
                    creditCards,
                    transactionCategories,
                    responsibleOptions,
                  }}
                />
              </div>
            ))}

            {periods.length > 0 && periodPanels.length === 0 && (
              <div className="flex min-w-[22rem] items-center rounded-[1.75rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel-soft)] px-6 py-10 text-sm text-[var(--color-muted)]">
                Selecione ao menos um periodo para ativar o workspace.
              </div>
            )}

            {periods.length === 0 && !periodsLoading && (
              <div className="flex min-w-[22rem] items-center rounded-[1.75rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel-soft)] px-6 py-10 text-sm text-[var(--color-muted)]">
                Nenhum periodo encontrado para o plano atual.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <CategoryManager categories={transactionCategories} />

        <section id="workspace-billing" className="app-panel">
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="app-eyebrow">Cartoes</p>
                  <h3 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                    Cartoes e faturas
                  </h3>
                </div>
                <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent-strong)]">
                  <CreditCard size={18} />
                </div>
              </div>
              <CreditCardsManager creditCards={creditCards} userId={userId} />
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="app-eyebrow">Faturas</p>
                  <h3 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                    Registro integrado
                  </h3>
                </div>
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

      <DashboardChartsSection
        comparisonData={comparisonData}
        categoryData={categoryData}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <section className="app-panel">
          <PlanPartnerManager activePlan={activePlan} />
        </section>

        <section className="app-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-eyebrow">Contexto do plano</p>
              <h3 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                Leitura rapida
              </h3>
            </div>
            <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent-strong)]">
              <Users size={18} />
            </div>
          </div>
          <dl className="mt-6 space-y-4">
            <InfoRow label="Plano ativo" value={activePlan?.name || "Sem plano"} />
            <InfoRow label="Periodos disponiveis" value={String(periods.length)} />
            <InfoRow label="Cartoes cadastrados" value={String(creditCards.length)} />
            <InfoRow
              label="Lancamentos visiveis"
              value={String(responsibleFilter ? metrics.transactionCount : allEntries.length)}
            />
          </dl>
        </section>
      </section>
    </div>
  );
};

const metricToneClasses = {
  positive: {
    value: "text-emerald-700",
    icon: "bg-emerald-100 text-emerald-700",
  },
  negative: {
    value: "text-rose-700",
    icon: "bg-rose-100 text-rose-700",
  },
  neutral: {
    value: "text-[var(--color-ink-strong)]",
    icon: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
  },
};

const MetricCard = ({ title, value, tone, icon }) => {
  const classes = metricToneClasses[tone] ?? metricToneClasses.neutral;

  return (
    <div className="app-panel">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="app-eyebrow">{title}</p>
          <p className={`mt-2 text-2xl font-semibold ${classes.value}`}>{value}</p>
        </div>
        <div className={`rounded-full p-3 ${classes.icon}`}>{icon}</div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] px-4 py-3">
    <dt className="text-sm text-[var(--color-muted)]">{label}</dt>
    <dd className="text-sm font-semibold text-[var(--color-ink-strong)]">{value}</dd>
  </div>
);

export default Dashboard;
