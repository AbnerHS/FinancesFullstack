export const computeVariation = (items) => {
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

export const buildComparisonChartData = (panels) =>
  panels.map((panel) => ({
    id: panel.period.id,
    label: panel.label,
    incomes: panel.stats.incomes,
    expenses: panel.stats.expenses,
    balance: panel.stats.balance,
  }));

export const buildCategoryChartData = ({
  categorySpending,
  filteredPanels,
  responsibleFilter,
}) => {
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
};
