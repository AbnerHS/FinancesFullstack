import { useCallback, useEffect, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { usePlans } from "./usePlans";
import { usePeriods } from "./usePeriods";
import { useCreditCards } from "./useCreditCards";
import { useTransactionCategories } from "./useTransactionCategories";
import { periodService } from "../services/periodService";
import { reportService } from "../services/reportService";
import { userService } from "../services/userService";
import { useAuthStore } from "../store/authStore";
import { useDashboardStore } from "../store/dashboardStore";
import { formatMonthYear } from "../utils/dashboard";

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

  const peopleQueries = useQueries({
    queries: [
      {
        queryKey: ["user", activePlan?.ownerId],
        queryFn: () => userService.getById(activePlan?.ownerId),
        enabled: Boolean(activePlan?.ownerId),
        staleTime: 1000 * 60 * 10,
      },
      {
        queryKey: ["user", activePlan?.partnerId],
        queryFn: () => userService.getById(activePlan?.partnerId),
        enabled: Boolean(activePlan?.partnerId),
        staleTime: 1000 * 60 * 10,
      },
    ],
  });

  const ownerUser = peopleQueries[0]?.data ?? null;
  const partnerUser = peopleQueries[1]?.data ?? null;

  const responsibleOptions = useMemo(() => {
    if (!activePlan) return [];

    const ownerId = activePlan.ownerId;
    const partnerId = activePlan.partnerId;

    const options = [];

    if (ownerId) {
      options.push({
        id: ownerId,
        label: ownerUser?.name ? `${ownerUser.name}` : "Dono",
      });
    }

    if (partnerId) {
      options.push({
        id: partnerId,
        label: partnerUser?.name ? `${partnerUser.name}` : "Parceiro",
      });
    }

    return options;
  }, [activePlan, ownerUser, partnerUser]);

  const invoiceQueries = useQueries({
    queries: selectedPeriods.map((period) => ({
      queryKey: ["period-invoices", period.id],
      queryFn: () => periodService.getInvoicesByPeriod(period),
      enabled: Boolean(period?.id),
      staleTime: 1000 * 60 * 2,
      placeholderData: [],
    })),
  });

  const categorySpendingQueries = useQueries({
    queries: selectedPeriods.map((period) => ({
      queryKey: ["report-spending-by-category", period.id],
      queryFn: () => reportService.getSpendingByCategory(period.id),
      enabled: Boolean(period?.id),
      staleTime: 1000 * 60 * 5,
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
            description: "Fatura cartão",
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
          label: formatMonthYear(period),
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

  const categorySpending = useMemo(() => {
    const totals = new Map();

    categorySpendingQueries.forEach((query) => {
      const items = query.data ?? [];
      items.forEach((item) => {
        const label = item.category || "Sem categoria";
        totals.set(label, (totals.get(label) ?? 0) + Number(item.totalAmount || 0));
      });
    });

    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [categorySpendingQueries]);

  const periodComparison = useMemo(
    () =>
      periodPanels.map((panel) => ({
        id: panel.period.id,
        label: panel.label,
        incomes: panel.stats.incomes,
        expenses: panel.stats.expenses,
        balance: panel.stats.balance,
        transactionCount: panel.transactions.length,
        invoiceCount: panel.invoices.length,
      })),
    [periodPanels]
  );

  const allEntries = useMemo(
    () =>
      periodPanels.flatMap((panel) =>
        panel.entries.map((entry) => ({
          ...entry,
          period: panel.period,
          periodLabel: panel.label,
        }))
      ),
    [periodPanels]
  );

  const { data: creditCards = [] } = useCreditCards();
  const { data: transactionCategories = [] } = useTransactionCategories();

  return {
    plans,
    plansLoading,
    periods,
    periodsLoading,
    selectedPlanId,
    activePlan,
    selectedPeriodIds,
    setSelectedPlanId,
    selectedPeriods,
    periodPanels,
    periodComparison,
    combinedStats,
    allEntries,
    categorySpending,
    creditCards,
    transactionCategories,
    responsibleOptions,
    userId: user?.id ?? null,
    togglePeriodId,
  };
};
