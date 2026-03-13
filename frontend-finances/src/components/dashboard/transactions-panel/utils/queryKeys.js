export const transactionsQueryKeys = {
  categoriesRoot: () => ["transaction-categories"],
  periodTransactionsRoot: () => ["period-transactions"],
  periodTransactions: (periodId) => ["period-transactions", periodId],
  periodInvoices: (periodId) => ["period-invoices", periodId],
};
