export const getTransactionsSummary = (entries) => {
  let incomes = 0;
  let expenses = 0;

  for (const entry of entries) {
    const amount = Number.parseFloat(entry.amount || 0);

    if (entry.type === "REVENUE") {
      incomes += amount;
      continue;
    }

    if (entry.type === "EXPENSE" && !entry.isClearedByInvoice) {
      expenses += amount;
    }
  }

  return {
    incomes,
    expenses,
    balance: incomes - expenses,
  };
};
