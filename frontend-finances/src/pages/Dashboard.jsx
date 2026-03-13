import { useMemo } from "react";

import { useDashboard } from "../hooks/useDashboard";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardStats } from "../components/dashboard/DashboardStats";
import { TransactionsPanel } from "../components/dashboard/TransactionsPanel";

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
    creditCards,
    transactionCategories,
    responsibleOptions,
    userId,
  } = useDashboard();

  const hasPeriods = periods.length > 0;

  const selectedPeriodsLabel = useMemo(() => {
    if (!hasPeriods || selectedPeriodIds.length === 0) return "Nenhum periodo";
    if (selectedPeriodIds.length === 1) return "Periodo selecionado";
    return `${selectedPeriodIds.length} periodos selecionados`;
  }, [hasPeriods, selectedPeriodIds.length]);

  if (plansLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <DashboardHeader />
      <DashboardStats
        balance={combinedStats.balance}
        incomes={combinedStats.incomes}
        expenses={combinedStats.expenses}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <DashboardSidebar
          plans={plans}
          selectedPlanId={selectedPlanId}
          onSelectPlanId={setSelectedPlanId}
          periods={periods}
          periodsLoading={periodsLoading}
          selectedPeriodIds={selectedPeriodIds}
          onTogglePeriodId={togglePeriodId}
          creditCards={creditCards}
          userId={userId}
          activePlan={activePlan}
        />

        <div className="lg:col-span-10">
          <div className="mb-4 text-xs uppercase tracking-wider text-gray-500">
            {selectedPeriodsLabel}
          </div>
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300">
            <div className="flex gap-6">
              {periodPanels.map((panel) => (
                <div
                  key={panel.period.id}
                  className="min-w-180 flex-1 max-w-220"
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
              {hasPeriods && periodPanels.length === 0 && (
                <div className="rounded-xl bg-white p-6 text-sm text-gray-400 border border-gray-100">
                  Selecione um periodo para visualizar.
                </div>
              )}
              {!hasPeriods && !periodsLoading && (
                <div className="rounded-xl bg-white p-6 text-sm text-gray-400 border border-gray-100">
                  Nenhum periodo encontrado para este plano.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
