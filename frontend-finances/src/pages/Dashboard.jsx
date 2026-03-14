import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarRange,
  CreditCard,
  Layers3,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { CategoryManager } from "../components/dashboard/CategoryManager";
import { CreditCardsManager } from "../components/dashboard/CreditCardsManager";
import { InvoiceManager } from "../components/dashboard/InvoiceManager";
import { PlanManager } from "../components/dashboard/PlanManager";
import { PlanPartnerManager } from "../components/dashboard/PlanPartnerManager";
import { PeriodsManager } from "../components/dashboard/PeriodsManager";
import { TransactionsPanel } from "../components/dashboard/TransactionsPanel";
import { useDashboard } from "../hooks/useDashboard";
import { formatCurrency, formatMonthYear } from "../utils/dashboard";

const computeVariation = (items) => {
  if (items.length < 2) {
    return null;
  }

  const previous = Number(items[items.length - 2]?.balance || 0);
  const current = Number(items[items.length - 1]?.balance || 0);

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
};

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
    () =>
      filteredPanels.map((panel) => ({
        id: panel.period.id,
        label: formatMonthYear(panel.period),
        incomes: panel.stats.incomes,
        expenses: panel.stats.expenses,
        balance: panel.stats.balance,
      })),
    [filteredPanels]
  );

  const categoryData = useMemo(() => {
    if (!responsibleFilter) {
      return categorySpending;
    }

    const totals = new Map();

    filteredPanels.forEach((panel) => {
      panel.transactions
        .filter((transaction) => transaction.type === "EXPENSE")
        .forEach((transaction) => {
          const label = transaction.category?.name || "Sem categoria";
          totals.set(label, (totals.get(label) ?? 0) + Number(transaction.amount || 0));
        });
    });

    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [categorySpending, filteredPanels, responsibleFilter]);

  const recentEntries = useMemo(() => {
    const source = responsibleFilter
      ? allEntries.filter(
          (entry) => entry.kind === "TRANSACTION" && entry.responsibleUserId === responsibleFilter
        )
      : allEntries;

    return [...source]
      .sort((a, b) => {
        const periodScoreA = (a.period?.year || 0) * 100 + (a.period?.month || 0);
        const periodScoreB = (b.period?.year || 0) * 100 + (b.period?.month || 0);
        return periodScoreB - periodScoreA;
      })
      .slice(0, 8);
  }, [allEntries, responsibleFilter]);

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
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_24rem]">
        <div className="dashboard-hero">
          <div className="space-y-4">
            <p className="app-eyebrow text-white/65">Visao executiva</p>
            <h2 className="max-w-3xl font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Um painel editorial para decidir, ajustar e editar o plano financeiro sem trocar de contexto.
            </h2>
            <p className="max-w-2xl text-sm text-white/72 sm:text-base">
              Visualize o saldo consolidado, compare periodos, revise gastos por categoria e mergulhe na edicao inline das transacoes e faturas.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <HeroStat
              label="Plano ativo"
              value={activePlan?.name || "Sem plano"}
              icon={<Layers3 size={18} />}
            />
            <HeroStat
              label="Selecao"
              value={selectedPeriodsLabel}
              icon={<CalendarRange size={18} />}
            />
            <HeroStat
              label="Responsavel"
              value={
                responsibleOptions.find((option) => option.id === responsibleFilter)?.label ||
                "Todos"
              }
              icon={<Users size={18} />}
            />
          </div>
        </div>

        <section className="app-panel space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="app-eyebrow">Acoes rapidas</p>
              <h3 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                Entrada direta no fluxo
              </h3>
            </div>
            <div className="rounded-full bg-[var(--color-accent-soft)] p-3 text-[var(--color-accent-strong)]">
              <Sparkles size={18} />
            </div>
          </div>

          <QuickAction href="#workspace-transactions" label="Nova transacao" description="Pule para o lancador e comece o registro no periodo ativo." />
          <QuickAction href="#workspace-periods" label="Novo periodo" description="Abra rapidamente um novo mes dentro do plano selecionado." />
          <QuickAction href="#workspace-billing" label="Nova fatura" description="Registre faturas sem sair do dashboard principal." />
        </section>
      </section>

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
          {periodsLoading && <p className="text-sm text-[var(--color-muted)]">Carregando periodos...</p>}
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
          tone="neutral"
          icon={<ArrowRight size={18} />}
        />
        <MetricCard
          title="Variacao"
          value={variation === null ? "--" : `${variation.toFixed(1)}%`}
          tone={variation >= 0 ? "positive" : "negative"}
          icon={<Sparkles size={18} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="app-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="app-eyebrow">Graficos</p>
              <h3 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                Evolucao por periodo
              </h3>
            </div>
            <span className="rounded-full bg-[var(--color-panel-soft)] px-3 py-2 text-sm text-[var(--color-muted)]">
              {comparisonData.length} pontos
            </span>
          </div>
          <PeriodTrendChart data={comparisonData} />
        </div>

        <div className="app-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="app-eyebrow">Categorias</p>
              <h3 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                Gasto por categoria
              </h3>
            </div>
            <span className="rounded-full bg-[var(--color-panel-soft)] px-3 py-2 text-sm text-[var(--color-muted)]">
              {categoryData.length} categorias
            </span>
          </div>
          <CategoryChart data={categoryData} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <div className="app-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="app-eyebrow">Comparativo</p>
              <h3 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                Receitas vs despesas
              </h3>
            </div>
          </div>
          <PeriodComparisonBars data={comparisonData} />
        </div>

        <div className="app-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="app-eyebrow">Lista viva</p>
              <h3 className="font-serif text-2xl font-semibold text-[var(--color-ink-strong)]">
                Atividade recente
              </h3>
            </div>
          </div>
          <RecentActivity entries={recentEntries} />
        </div>
      </section>

      <section id="workspace-transactions" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="app-eyebrow">Workspace operacional</p>
            <h3 className="font-serif text-3xl font-semibold text-[var(--color-ink-strong)]">
              Edicao inline do plano
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Aqui ficam os paines de transacoes, faturas e manutencao estrutural do dashboard.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-5">
            {periodPanels.map((panel) => (
              <div key={panel.period.id} className="min-w-[28rem] flex-1 rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[0_22px_55px_rgba(17,60,58,0.08)]">
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

      <PlanManager
        plans={plans}
        activePlan={activePlan}
        selectedPlanId={selectedPlanId}
        onSelectPlanId={setSelectedPlanId}
        userId={userId}
      />

      <div id="workspace-periods">
        <PeriodsManager
          activePlan={activePlan}
          periods={periods}
          selectedPeriodIds={selectedPeriodIds}
          onTogglePeriodId={togglePeriodId}
        />
      </div>

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

const HeroStat = ({ label, value, icon }) => (
  <div className="rounded-[1.6rem] border border-white/14 bg-white/8 px-4 py-4 backdrop-blur">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs uppercase tracking-[0.28em] text-white/58">{label}</p>
      <div className="text-white/80">{icon}</div>
    </div>
    <p className="mt-3 text-lg font-semibold text-white">{value}</p>
  </div>
);

const QuickAction = ({ href, label, description }) => (
  <a
    href={href}
    className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] px-4 py-4 transition hover:border-[var(--color-accent)]"
  >
    <div>
      <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
    </div>
    <ArrowRight size={18} className="text-[var(--color-accent-strong)]" />
  </a>
);

const MetricCard = ({ title, value, tone, icon }) => (
  <div className="app-panel">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="app-eyebrow">{title}</p>
        <p className="mt-3 font-serif text-3xl font-semibold text-[var(--color-ink-strong)]">
          {value}
        </p>
      </div>
      <div
        className={`rounded-full p-3 ${
          tone === "positive"
            ? "bg-emerald-100 text-emerald-700"
            : tone === "negative"
            ? "bg-rose-100 text-rose-700"
            : "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]"
        }`}
      >
        {icon}
      </div>
    </div>
  </div>
);

const PeriodTrendChart = ({ data }) => {
  if (data.length === 0) {
    return <EmptyChart message="Selecione periodos para ver a evolucao do saldo." />;
  }

  const values = data.map((item) => Number(item.balance || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - ((Number(item.balance || 0) - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mt-6">
      <div className="h-64 rounded-[1.75rem] border border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(221,237,232,0.85))] p-4">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <polyline
            fill="none"
            stroke="rgba(31,104,99,0.18)"
            strokeWidth="2"
            points={`0,100 ${points} 100,100`}
          />
          <polyline
            fill="none"
            stroke="var(--color-accent-strong)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {data.map((item, index) => {
            const x = (index / Math.max(data.length - 1, 1)) * 100;
            const y = 100 - ((Number(item.balance || 0) - min) / range) * 100;
            return <circle key={item.id} cx={x} cy={y} r="2.4" fill="var(--color-warm)" />;
          })}
        </svg>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {data.map((item) => (
          <div key={item.id} className="rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-ink-strong)]">
              {formatCurrency(item.balance)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const CategoryChart = ({ data }) => {
  if (data.length === 0) {
    return <EmptyChart message="As categorias aparecerao aqui quando houver despesas registradas." />;
  }

  const max = Math.max(...data.map((item) => Number(item.amount || 0)), 1);

  return (
    <div className="mt-6 space-y-4">
      {data.slice(0, 6).map((item) => (
        <div key={item.name}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.name}</p>
            <p className="text-sm text-[var(--color-muted)]">{formatCurrency(item.amount)}</p>
          </div>
          <div className="h-3 rounded-full bg-[var(--color-panel-soft)]">
            <div
              className="h-3 rounded-full bg-[linear-gradient(90deg,var(--color-accent-strong),var(--color-warm))]"
              style={{ width: `${(Number(item.amount || 0) / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const PeriodComparisonBars = ({ data }) => {
  if (data.length === 0) {
    return <EmptyChart message="Selecione periodos para comparar receitas e despesas." />;
  }

  const max = Math.max(
    ...data.flatMap((item) => [Number(item.incomes || 0), Number(item.expenses || 0)]),
    1
  );

  return (
    <div className="mt-6 grid gap-4">
      {data.map((item) => (
        <div key={item.id} className="rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{item.label}</p>
            <p className="text-sm text-[var(--color-muted)]">{formatCurrency(item.balance)}</p>
          </div>
          <div className="mt-4 grid gap-3">
            <BarRow label="Receitas" value={item.incomes} max={max} tone="positive" />
            <BarRow label="Despesas" value={item.expenses} max={max} tone="negative" />
          </div>
        </div>
      ))}
    </div>
  );
};

const BarRow = ({ label, value, max, tone }) => (
  <div className="grid gap-2">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="font-medium text-[var(--color-ink-strong)]">{formatCurrency(value)}</span>
    </div>
    <div className="h-3 rounded-full bg-white">
      <div
        className={`h-3 rounded-full ${
          tone === "positive" ? "bg-emerald-500" : "bg-rose-500"
        }`}
        style={{ width: `${(Number(value || 0) / max) * 100}%` }}
      />
    </div>
  </div>
);

const RecentActivity = ({ entries }) => {
  if (entries.length === 0) {
    return <EmptyChart message="Nenhuma atividade para mostrar no recorte atual." compact />;
  }

  return (
    <div className="mt-6 space-y-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-[1.35rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] px-4 py-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                {entry.description}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
                {entry.kind === "INVOICE" ? "Fatura" : "Transacao"} • {entry.periodLabel}
              </p>
            </div>
            <p
              className={`text-sm font-semibold ${
                entry.type === "REVENUE" ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {formatCurrency(entry.amount)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-[var(--color-line)] bg-[var(--color-panel-soft)] px-4 py-3">
    <dt className="text-sm text-[var(--color-muted)]">{label}</dt>
    <dd className="text-sm font-semibold text-[var(--color-ink-strong)]">{value}</dd>
  </div>
);

const EmptyChart = ({ message, compact = false }) => (
  <div
    className={`mt-6 rounded-[1.5rem] border border-dashed border-[var(--color-line)] bg-[var(--color-panel-soft)] text-center text-sm text-[var(--color-muted)] ${
      compact ? "px-4 py-10" : "px-6 py-14"
    }`}
  >
    {message}
  </div>
);

export default Dashboard;
