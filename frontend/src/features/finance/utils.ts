import type {
  CategorySpending,
  Period,
  Transaction,
  TransactionType,
} from "@/features/finance/types.ts"

export function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export function formatMonthYear(period: Period | null | undefined) {
  if (!period) {
    return ""
  }

  const date = new Date(period.year, period.month - 1, 1)
  const month = date.toLocaleString("pt-BR", { month: "long" })
  return `${month}/${period.year}`
}

export function formatCurrencyInput(value: string) {
  const digits = String(value || "").replace(/\D/g, "")
  if (!digits) {
    return ""
  }

  return (Number(digits) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseCurrencyInput(value: string) {
  const normalized = String(value || "").trim().replace(/\./g, "").replace(",", ".")
  if (!normalized) {
    return Number.NaN
  }
  return Number(normalized)
}

export function buildComparisonChartData(
  panels: Array<{
    period: Period
    label: string
    stats: { incomes: number; expenses: number; balance: number }
  }>
) {
  return panels.map((panel) => ({
    id: panel.period.id,
    label: panel.label,
    incomes: panel.stats.incomes,
    expenses: panel.stats.expenses,
    balance: panel.stats.balance,
  }))
}

export function buildCategoryChartData({
  categorySpending,
  filteredTransactions,
  responsibleFilter,
}: {
  categorySpending: CategorySpending[]
  filteredTransactions: Transaction[]
  responsibleFilter: string
}) {
  if (!responsibleFilter) {
    return categorySpending
  }

  const totals = new Map<string, number>()
  filteredTransactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .forEach((transaction) => {
      const label = transaction.category?.name || "Sem categoria"
      totals.set(label, (totals.get(label) ?? 0) + Number(transaction.amount || 0))
    })

  return [...totals.entries()]
    .map(([category, totalAmount]) => ({ category, totalAmount }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
}

export function computeVariation(items: Array<{ balance: number }>) {
  if (items.length < 2) {
    return null
  }

  const previous = Number(items[0]?.balance || 0)
  const current = Number(items[items.length - 1]?.balance || 0)

  if (previous === 0) {
    return current === 0 ? 0 : 100
  }

  return ((current - previous) / Math.abs(previous)) * 100
}

export function calculateStats(transactions: Transaction[], invoicesAmount: number) {
  const incomes = transactions
    .filter((transaction) => transaction.type === "REVENUE")
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0)

  const expensesFromTransactions = transactions
    .filter((transaction) => transaction.type === "EXPENSE" && !transaction.isClearedByInvoice)
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0)

  const expenses = expensesFromTransactions + invoicesAmount

  return {
    incomes,
    expenses,
    balance: incomes - expenses,
  }
}

export function toneForBalance(value: number): TransactionType | "NEUTRAL" {
  if (value > 0) {
    return "REVENUE"
  }
  if (value < 0) {
    return "EXPENSE"
  }
  return "NEUTRAL"
}
