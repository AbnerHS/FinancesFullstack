import { useCallback, useEffect, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { usePlans } from "./usePlans";
import { usePeriods } from "./usePeriods";
import { useCreditCards } from "./useCreditCards";
import { periodService } from "../services/periodService";
import { useAuthStore } from "../store/authStore";
import { useDashboardStore } from "../store/dashboardStore";

const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const orderByPeriods = (ids, periods) => {
  const orderMap = new Map(periods.map((period, index) => [period.id, index]));
  return [...ids].sort(
    (a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0)
  );
};

export const useDashboard = () => {
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { user } = useAuthStore();

  const selectedPlanId = useDashboardStore((state) => state.selectedPlanId);
  const selectedPeriodIds = useDashboardStore((state) => state.selectedPeriodIds);
  const setSelectedPlanId = useDashboardStore((state) => state.setSelectedPlanId);
  const setSelectedPeriodIds = useDashboardStore(
    (state) => state.setSelectedPeriodIds
  );

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  );

  useEffect(() => {
    if (plansLoading) return;
    if (!activePlan) return;
    if (activePlan.id !== selectedPlanId) {
      setSelectedPlanId(activePlan.id);
    }
  }, [activePlan, plansLoading, selectedPlanId, setSelectedPlanId]);

  const {
    data: periods = [],
    isLoading: periodsLoading,
    isFetched: periodsFetched,
  } = usePeriods(activePlan);

  useEffect(() => {
    if (!activePlan) return;
    if (!periodsFetched || periodsLoading) return;
    if (periods.length === 0) {
      if (selectedPeriodIds.length > 0) {
        setSelectedPeriodIds([]);
      }
      return;
    }

    const validIds = new Set(periods.map((period) => period.id));
    const filtered = selectedPeriodIds.filter((id) => validIds.has(id));
    const fallback = filtered.length > 0 ? filtered : [periods[0].id];
    const ordered = orderByPeriods(fallback, periods);

    if (!arraysEqual(ordered, selectedPeriodIds)) {
      setSelectedPeriodIds(ordered);
    }
  }, [
    activePlan,
    periods,
    periodsFetched,
    periodsLoading,
    selectedPeriodIds,
    setSelectedPeriodIds,
  ]);

  const togglePeriodId = useCallback(
    (periodId) => {
      setSelectedPeriodIds((current) => {
        const exists = current.includes(periodId);
        const next = exists
          ? current.filter((id) => id !== periodId)
          : [...current, periodId];

        if (next.length === 0 && periods.length > 0) {
          return [periods[0].id];
        }

        return orderByPeriods(next, periods);
      });
    },
    [periods, setSelectedPeriodIds]
  );

  const selectedPeriods = useMemo(
    () =>
      selectedPeriodIds
        .map((id) => periods.find((period) => period.id === id))
        .filter(Boolean),
    [periods, selectedPeriodIds]
  );

  const transactionQueries = useQueries({
    queries: selectedPeriods.map((period) => ({
      queryKey: ["period-transactions", period.id],
      queryFn: () => periodService.getTransactionsByPeriod(period),
      enabled: Boolean(period?.id),
      staleTime: 1000 * 60 * 2,
      placeholderData: [],
    })),
  });

  const invoiceQueries = useQueries({
    queries: selectedPeriods.map((period) => ({
      queryKey: ["period-invoices", period.id],
      queryFn: () => periodService.getInvoicesByPeriod(period),
      enabled: Boolean(period?.id),
      staleTime: 1000 * 60 * 2,
      placeholderData: [],
    })),
  });

  const periodPanels = useMemo(
    () =>
      selectedPeriods.map((period, index) => {
        const transactions = transactionQueries[index]?.data ?? [];
        const invoices = invoiceQueries[index]?.data ?? [];

        const entries = [
          ...transactions.map((t) => ({ ...t, kind: "TRANSACTION" })),
          ...invoices.map((invoice) => ({
            id: `invoice-${invoice.id}`,
            kind: "INVOICE",
            description: "Fatura cartao",
            amount: invoice.amount,
            type: "EXPENSE",
            dateTime: "-",
            invoiceId: invoice.id,
            creditCardId: invoice.creditCardId,
            periodId: invoice.periodId,
          })),
        ];

        const incomes = transactions
          .filter((t) => t.type === "REVENUE")
          .reduce((acc, t) => acc + parseFloat(t.amount), 0);

        const expensesFromTransactions = transactions
          .filter((t) => t.type === "EXPENSE" && !t.isClearedByInvoice)
          .reduce((acc, t) => acc + parseFloat(t.amount), 0);

        const expensesFromInvoices = invoices.reduce(
          (acc, invoice) => acc + parseFloat(invoice.amount),
          0
        );

        const expenses = expensesFromTransactions + expensesFromInvoices;

        return {
          period,
          entries,
          invoices,
          transactions,
          transactionsLoading: Boolean(transactionQueries[index]?.isLoading),
          invoicesLoading: Boolean(invoiceQueries[index]?.isLoading),
          stats: {
            incomes,
            expenses,
            balance: incomes - expenses,
          },
        };
      }),
    [invoiceQueries, selectedPeriods, transactionQueries]
  );

  const combinedStats = useMemo(
    () =>
      periodPanels.reduce(
        (acc, panel) => {
          acc.incomes += panel.stats.incomes;
          acc.expenses += panel.stats.expenses;
          acc.balance += panel.stats.balance;
          return acc;
        },
        { incomes: 0, expenses: 0, balance: 0 }
      ),
    [periodPanels]
  );

  const { data: creditCards = [] } = useCreditCards();

  return {
    plans,
    plansLoading,
    periods,
    periodsLoading,
    selectedPlanId,
    selectedPeriodIds,
    setSelectedPlanId,
    selectedPeriods,
    periodPanels,
    combinedStats,
    creditCards,
    userId: user?.id ?? null,
    togglePeriodId,
  };
};
